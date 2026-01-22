from fastapi import APIRouter, Depends, HTTPException
from backend.firebase_setup import db
from backend.auth import get_current_user, UserInDB
from backend.schemas import GroupCreate, GroupResponse, GroupJoin, ChatMessageCreate

from backend.enums import GroupStatus
from firebase_admin import firestore
from datetime import datetime
import uuid

router = APIRouter()

@router.post("/", response_model=GroupResponse)
def create_group(group: GroupCreate, current_user: UserInDB = Depends(get_current_user)):
    print(f"DEBUG: Creating group for offer {group.offer_id}")
    
    # Verify Offer
    # In Firestore, references are just paths or separate calls
    # For simplicity, we just assume it exists or do a quick get
    # offer_ref = db.collection('offers').document(group.offer_id).get()
    
    new_group_ref = db.collection('groups').document()
    
    # Geocode Creator's Address if provided
    coords = (0.0, 0.0)
    if group.address_details:
        from backend.services.location_service import location_service
        lat, lon = location_service.geocode_address(group.address_details.model_dump())
        coords = (lat, lon)
    
    group_data = {
        "id": new_group_ref.id,
        "offer_id": group.offer_id,
        "target_size": group.target_size,
        "current_size": 1,
        "receiver_id": current_user.id,
        "status": GroupStatus.FORMING,
        "created_at": datetime.utcnow(),
        "members": [{
            "user_id": current_user.id,
            "full_name": current_user.full_name or "Unknown User",
            "status": "JOINED",
            "trust_score": current_user.trust_score,
            "joined_at": datetime.utcnow().isoformat(),
            "address": group.address_details.model_dump() if group.address_details else None,
            "coordinates": coords
        }]
    }

    
    new_group_ref.set(group_data)
    
    # We need to return a response that matches the Schema.
    # The Schema expects nested 'offer' object.
    # We should fetch the offer data to populate it.
    print(f"DEBUG: Fetching offer data for {group.offer_id}")
    offer_snapshot = db.collection('offers').document(group.offer_id).get()
    if not offer_snapshot.exists:
        print(f"ERROR: Offer {group.offer_id} not found!")
        raise HTTPException(status_code=404, detail="Offer not found")
        
    offer_data = offer_snapshot.to_dict()
    offer_data['id'] = group.offer_id
    
    print(f"DEBUG: Constructing response with offer data: {offer_data.keys()}")
    group_data['offer'] = offer_data
    
    return group_data

@router.get("/", response_model=list[GroupResponse])
def get_groups(limit: int = 20):
    docs = db.collection('groups').where("status", "==", GroupStatus.FORMING.value).limit(limit).stream()
    groups = []
    
    # Batch fetch offers might be better, but for now simple loop
    for doc in docs:
        g_data = doc.to_dict()
        g_data['id'] = doc.id
        
        # Fetch associated offer
        if 'offer_id' in g_data:
            o_snap = db.collection('offers').document(g_data['offer_id']).get()
            if o_snap.exists:
                o_data = o_snap.to_dict()
                o_data['id'] = g_data['offer_id']
                g_data['offer'] = o_data
                groups.append(g_data)
            else:
                print(f"WARNING: Group {doc.id} has invalid offer_id {g_data['offer_id']}")
                
    return groups

@router.get("/{group_id}", response_model=GroupResponse)
def get_group(group_id: str):
    doc = db.collection('groups').document(group_id).get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Group not found")
        
    g_data = doc.to_dict()
    g_data['id'] = group_id
    
    # Fetch nested offer
    if 'offer_id' in g_data:
        o_snap = db.collection('offers').document(g_data['offer_id']).get()
        if o_snap.exists:
            o_data = o_snap.to_dict()
            o_data['id'] = g_data['offer_id']
            g_data['offer'] = o_data
    
    return g_data

@router.get("/me/list", response_model=list[GroupResponse])
def get_my_groups(current_user: UserInDB = Depends(get_current_user)):
    # Query groups where user is a member
    # Firestore doesn't support array-contains-any easily on complex objects, 
    # but we can query by 'members.user_id' if we index it, or just client side filter for MVP
    # Ideally, we should have a top-level array "member_ids" for querying.
    
    # For now, let's fetch all (inefficient) or better, fix data model later.
    # Actually, let's iterate.
    docs = db.collection('groups').stream()
    my_groups = []
    
    for doc in docs:
        data = doc.to_dict()
        data['id'] = doc.id
        
        # Check membership
        is_member = any(m['user_id'] == current_user.id for m in data.get('members', []))
        if is_member:
            # Fetch offer
            if 'offer_id' in data:
                 o_snap = db.collection('offers').document(data['offer_id']).get()
                 if o_snap.exists:
                     o_data = o_snap.to_dict()
                     o_data['id'] = data['offer_id']
                     data['offer'] = o_data
            my_groups.append(data)
            
    return my_groups

@router.post("/{group_id}/join", response_model=GroupResponse)
def join_group(group_id: str, join_data: GroupJoin, current_user: UserInDB = Depends(get_current_user)):
    transaction = db.transaction()
    group_ref = db.collection('groups').document(group_id)
    
    # Pre-calculate expensive stuff outside transaction (Geocoding)
    # Ideally we do this inside if we want to be sure, but it's an external API call which bad for txn lock time.
    # We will do it outside.
    from backend.services.location_service import location_service
    lat, lon = location_service.geocode_address(join_data.address_details.model_dump())

    @firestore.transactional
    def join_in_transaction(transaction, group_ref):
        snapshot = group_ref.get(transaction=transaction)
        if not snapshot.exists:
            raise HTTPException(status_code=404, detail="Group not found")
            
        group_data = snapshot.to_dict()
        
        # Validation checks
        if group_data['status'] != GroupStatus.FORMING:
             raise HTTPException(status_code=400, detail="Group is no longer accepting members")
        
        if group_data['current_size'] >= group_data['target_size']:
             raise HTTPException(status_code=400, detail="Group is full")
             
        # Check membership
        if any(m['user_id'] == current_user.id for m in group_data.get('members', [])):
             raise HTTPException(status_code=400, detail="Already a member")

        if current_user.trust_score < 30.0:
             raise HTTPException(status_code=403, detail="Trust score too low.")

        # Add Member
        new_member = {
            "user_id": current_user.id,
            "full_name": current_user.full_name or "Unknown User", 
            "status": "JOINED",
            "trust_score": current_user.trust_score,
            "joined_at": datetime.utcnow().isoformat(),
            "address": join_data.address_details.model_dump(),
            "coordinates": (lat, lon)
        }
        
        updated_members = group_data.get('members', []) + [new_member]
        updated_size = group_data['current_size'] + 1
        
        updates = {
            "members": updated_members,
            "current_size": updated_size
        }
        
        # AI Logic: Check if Full
        if updated_size >= group_data['target_size']:
            best_receiver_id = location_service.select_optimal_host(updated_members)
            updates['status'] = GroupStatus.LOCKED
            updates['receiver_id'] = best_receiver_id
            
        transaction.update(group_ref, updates)
        
        # Update local dict for response
        group_data.update(updates)
        return group_data

    try:
        updated_data = join_in_transaction(transaction, group_ref)
        updated_data['id'] = group_id
        
        # Re-fetch offer
        if 'offer_id' in updated_data:
            o_snap = db.collection('offers').document(updated_data['offer_id']).get()
            if o_snap.exists:
                o_data = o_snap.to_dict()
                o_data['id'] = updated_data['offer_id']
                updated_data['offer'] = o_data
                
        return updated_data
        
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Join failed: {str(e)}")


@router.post("/{group_id}/pay", response_model=GroupResponse)
def pay_group_share(group_id: str, current_user: UserInDB = Depends(get_current_user)):
    from backend.services.wallet import wallet_service
    
    group_ref = db.collection('groups').document(group_id)
    doc = group_ref.get()
    
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Group not found")
        
    g_data = doc.to_dict()
    
    if g_data['status'] != GroupStatus.LOCKED and g_data['status'] != GroupStatus.FORMING: 
        if g_data['status'] == GroupStatus.FORMING:
             raise HTTPException(status_code=400, detail="Wait for group to fill (Lock) before paying.")
        elif g_data['status'] == GroupStatus.FUNDED:
             raise HTTPException(status_code=400, detail="Group is already funded.")
        else:
             raise HTTPException(status_code=400, detail="Payment not allowed at this stage.")

    # Find member index
    member_idx = -1
    for i, m in enumerate(g_data.get('members', [])):
        if m['user_id'] == current_user.id:
            member_idx = i
            break
            
    if member_idx == -1:
         raise HTTPException(status_code=403, detail="Not a member")
         
    if g_data['members'][member_idx].get('status') == 'PAID':
         raise HTTPException(status_code=400, detail="Already paid")

    # Calculate Share
    offer_price = 0.0
    
    if 'offer' in g_data:
        offer_price = g_data['offer'].get('price', 0.0)
    elif 'offer_id' in g_data:
         o_snap = db.collection('offers').document(g_data['offer_id']).get()
         if o_snap.exists:
             offer_price = o_snap.to_dict().get('price', 0.0)
    
    if offer_price <= 0:
         raise HTTPException(status_code=500, detail="Invalid Offer Price")
         
    share_amount = offer_price / g_data['target_size']
    
    # Try Lock Funds
    try:
        wallet_service.lock_funds_for_group(current_user.id, group_id, share_amount)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Payment Failed: {str(e)}")
        
    # Update Member Status
    g_data['members'][member_idx]['status'] = 'PAID'
    
    # Check if ALL Paid
    all_paid = all(m.get('status') == 'PAID' for m in g_data['members'])
    
    updates = {"members": g_data['members']}
    if all_paid:
        updates['status'] = GroupStatus.FUNDED
        g_data['status'] = GroupStatus.FUNDED
        
    group_ref.update(updates)
    
    # Return structure
    g_data.update(updates)
    g_data['id'] = group_id
    
    # Refetch offer for response
    if 'offer' not in g_data and 'offer_id' in g_data:
         # Simplified fetch
         pass 

    return g_data

@router.post("/{group_id}/confirm_order", response_model=GroupResponse)
def confirm_order(group_id: str, current_user: UserInDB = Depends(get_current_user)):
    group_ref = db.collection('groups').document(group_id)
    doc = group_ref.get()
    
    if not doc.exists: raise HTTPException(status_code=404, detail="Group not found")
    g_data = doc.to_dict()
    
    if g_data['receiver_id'] != current_user.id:
        raise HTTPException(status_code=403, detail="Only Receiver can confirm order")
        
    if g_data['status'] != GroupStatus.FUNDED:
        raise HTTPException(status_code=400, detail="Group not funded yet")
        
    updates = {"status": GroupStatus.ORDERED}
    group_ref.update(updates)
    g_data.update(updates)
    g_data['id'] = group_id
    return g_data

@router.post("/{group_id}/confirm_arrival", response_model=GroupResponse)
def confirm_arrival(group_id: str, current_user: UserInDB = Depends(get_current_user)):
    from backend.services.otp import otp_service
    
    group_ref = db.collection('groups').document(group_id)
    doc = group_ref.get()
    g_data = doc.to_dict()
    
    if g_data['receiver_id'] != current_user.id:
        raise HTTPException(status_code=403, detail="Only Receiver can confirm arrival")
        
    if g_data['status'] != GroupStatus.ORDERED:
        raise HTTPException(status_code=400, detail="Order not placed yet")
        
    # Generate OTPs for all members (except receiver if they are a member, though usually they are)
    members = g_data.get('members', [])
    updated_members = []
    
    for m in members:
        if m['user_id'] != current_user.id:
            raw_otp = otp_service.generate_otp()
            m['distribution_otp_hash'] = otp_service.hash_otp(raw_otp)
            # In a real app, send raw_otp via SMS/Push to m['user_id']
            # For demo, we might need a way to see it. We'll store raw text in a debug field or just log it
            print(f"DEBUG: OTP for {m['user_id']} is {raw_otp}") 
        updated_members.append(m)
        
    updates = {
        "status": GroupStatus.DELIVERED,
        "members": updated_members
    }
    group_ref.update(updates)
    g_data.update(updates)
    g_data['id'] = group_id
    return g_data

@router.post("/{group_id}/verify_handoff", response_model=GroupResponse)
def verify_handoff(group_id: str, otp: str, member_id: str, current_user: UserInDB = Depends(get_current_user)):
    from backend.services.otp import otp_service
    from backend.services.wallet import wallet_service
    
    group_ref = db.collection('groups').document(group_id)
    doc = group_ref.get()
    g_data = doc.to_dict()
    
    if g_data['receiver_id'] != current_user.id:
        raise HTTPException(status_code=403, detail="Only Receiver can verify handoff")
        
    if g_data['status'] != GroupStatus.DELIVERED:
        raise HTTPException(status_code=400, detail="Items not yet arrived")
        
    member_idx = -1
    for i, m in enumerate(g_data['members']):
        if m['user_id'] == member_id:
            member_idx = i
            break
            
    if member_idx == -1: raise HTTPException(status_code=404, detail="Member not found")
    
    member = g_data['members'][member_idx]
    if member.get('status') == 'DELIVERED_CONFIRMED':
        raise HTTPException(status_code=400, detail="Already delivered")
        
    # Verify OTP
    if not otp_service.verify_otp(otp, member.get('distribution_otp_hash', '')):
        raise HTTPException(status_code=400, detail="Invalid OTP")
        
    # Update Status
    g_data['members'][member_idx]['status'] = 'DELIVERED_CONFIRMED'
    
    # Check if ALL (except receiver) are confirmed
    # Receiver is also a member usually, but they don't need OTP verification with themselves.
    others = [m for m in g_data['members'] if m['user_id'] != current_user.id]
    all_confirmed = all(m.get('status') == 'DELIVERED_CONFIRMED' for m in others)
    
    updates = {"members": g_data['members']}
    
    if all_confirmed:
        updates['status'] = GroupStatus.COMPLETED
        g_data['status'] = GroupStatus.COMPLETED
        
        # RELEASE ESCROW
        # Calculate amount per person
        offer_price = 0.0
        if 'offer' in g_data: offer_price = g_data['offer'].get('price', 0.0)
        elif 'offer_id' in g_data:
             snap = db.collection('offers').document(g_data['offer_id']).get()
             if snap.exists: offer_price = snap.to_dict().get('price', 0.0)
             
        share = offer_price / g_data['target_size']
        
        # Release for each member (including receiver's own locked funds?)
        # Usually Receiver pays themselves? Or just unlocks.
        # "Escrow release" -> Sender to Receiver. 
        # For Receiver, it's just Unlock.
        for m in g_data['members']:
            if m['user_id'] != current_user.id:
                 wallet_service.release_escrow(m['user_id'], current_user.id, share)
            else:
                 # Unlock receiver's own funds (refund/unlock)
                 # wallet_service.unlock(m['user_id'], share) -> Needed helper
                 pass 
                 
    group_ref.update(updates)
    g_data.update(updates)
    g_data['id'] = group_id
    return g_data

@router.post("/{group_id}/chat")
def send_chat_message(group_id: str, message: ChatMessageCreate, current_user: UserInDB = Depends(get_current_user)):
    
    group_ref = db.collection('groups').document(group_id)
    doc = group_ref.get()
    
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Group not found")
        
    g_data = doc.to_dict()
    
    # Check membership
    is_member = any(m['user_id'] == current_user.id for m in g_data.get('members', []))
    if not is_member:
        raise HTTPException(status_code=403, detail="Not a member of this group")

    # Add Message to Subcollection
    msg_data = {
        "text": message.text,
        "userId": current_user.id,
        "userName": current_user.full_name or "Unknown User",
        "createdAt": firestore.SERVER_TIMESTAMP
    }
    
    group_ref.collection('messages').add(msg_data)
    
    # Retroactive Fix: Update member name in group list if missing/unknown
    need_update = False
    updated_members = []
    
    for m in g_data.get('members', []):
        if m['user_id'] == current_user.id:
            # If name is missing or is explicitly "Unknown User", update it
            if (not m.get('full_name') or m.get('full_name') == "Unknown User") and current_user.full_name:
                m['full_name'] = current_user.full_name
                need_update = True
        updated_members.append(m)
        
    if need_update:
        print(f"DEBUG: Backfilling name for user {current_user.id} in group {group_id}")
        group_ref.update({"members": updated_members})

    return {"status": "sent"}

@router.get("/{group_id}/chat")
def get_chat_messages(group_id: str, limit: int = 50, current_user: UserInDB = Depends(get_current_user)):
    group_ref = db.collection('groups').document(group_id)
    doc = group_ref.get()
    
    if not doc.exists:
         raise HTTPException(status_code=404, detail="Group not found")
         
    # Check membership
    g_data = doc.to_dict()
    is_member = any(m['user_id'] == current_user.id for m in g_data.get('members', []))
    if not is_member:
         raise HTTPException(status_code=403, detail="Not a member")
         
    # Query Messages
    msgs = group_ref.collection('messages').order_by('createdAt', direction=firestore.Query.ASCENDING).limit(limit).stream()
    
    results = []
    for m in msgs:
        d = m.to_dict()
        d['id'] = m.id
        # Convert timestamp to string if needed, or let Pydantic/FastAPI handle json encoding of datetime
        results.append(d)
        
    return results
