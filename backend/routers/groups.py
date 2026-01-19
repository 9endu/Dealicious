from fastapi import APIRouter, Depends, HTTPException
from backend.firebase_setup import db
from backend.auth import get_current_user, UserInDB
from backend.schemas import GroupCreate, GroupResponse
from backend.models import GroupStatus
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
            "status": "JOINED"
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
