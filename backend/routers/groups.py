from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.models import GroupBuy, GroupMember, Offer, User, GroupStatus, Transaction, TransactionType, Wallet
from backend.schemas import GroupCreate, GroupResponse

router = APIRouter()

from backend.auth import get_current_user

@router.post("/", response_model=GroupResponse)
def create_group(group: GroupCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    offer = db.query(Offer).filter(Offer.id == group.offer_id).first()
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found")
        
    new_group = GroupBuy(
        offer_id=group.offer_id,
        target_size=group.target_size,
        current_size=1, # Creator is first member
        receiver_id=current_user.id # Creator defaults to receiver initially
    )
    db.add(new_group)
    db.commit()
    db.refresh(new_group)
    
    # Add creator as member
    member = GroupMember(
        group_id=new_group.id,
        user_id=current_user.id,
        status="JOINED"
    )
    db.add(member)
    db.commit()
    
    return new_group

@router.post("/{group_id}/join", response_model=GroupResponse)
def join_group(group_id: str, user_id: str, db: Session = Depends(get_db)):
    group = db.query(GroupBuy).filter(GroupBuy.id == group_id).first()
    if not group:
         raise HTTPException(status_code=404, detail="Group not found")
         
    if group.current_size >= group.target_size:
         raise HTTPException(status_code=400, detail="Group is full")
         
    # Check if already member
    existing = db.query(GroupMember).filter(GroupMember.group_id == group_id, GroupMember.user_id == user_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Already joined")
        
    member = GroupMember(
        group_id=group.id,
        user_id=user_id
    )
    db.add(member)
    
    group.current_size += 1
    if group.current_size == group.target_size:
        group.status = GroupStatus.LOCKED
        
    db.commit()
    db.refresh(group)
    return group

@router.post("/{group_id}/pay")
def pay_share(group_id: str, user_id: str, db: Session = Depends(get_db)):
    # Mock Payment Logic
    group = db.query(GroupBuy).filter(GroupBuy.id == group_id).first()
    if not group:
         raise HTTPException(status_code=404, detail="Group not found")
    
    offer = group.offer
    share_amount = offer.price / group.target_size
    
    # Check Wallet
    wallet = db.query(Wallet).filter(Wallet.user_id == user_id).first()
    if not wallet or wallet.balance < share_amount:
        raise HTTPException(status_code=400, detail="Insufficient funds")
        
    # Deduct and Lock
    wallet.balance -= share_amount
    wallet.locked_amount += share_amount
    
    # Record Transaction
    tx = Transaction(
        from_user_id=user_id,
        to_user_id=None, # System Escrow
        amount=share_amount,
        type=TransactionType.ESCROW_LOCK,
        status="SUCCESS"
    )
    db.add(tx)
    
    # Update Member Status
    member = db.query(GroupMember).filter(GroupMember.group_id == group_id, GroupMember.user_id == user_id).first()
    member.status = "PAID"
    
    # Check if all paid
    all_members = db.query(GroupMember).filter(GroupMember.group_id == group_id).all()
    if all(m.status == "PAID" for m in all_members):
        group.status = GroupStatus.FUNDED
        
    db.commit()
    return {"status": "paid", "group_status": group.status}
