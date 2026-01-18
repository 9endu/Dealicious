from fastapi import APIRouter, Depends, HTTPException
from backend.firebase_setup import db
from backend.auth import get_current_user, UserInDB
from backend.schemas import GroupCreate, GroupResponse
from firebase_admin import firestore
import uuid

router = APIRouter()

@router.post("/", response_model=GroupResponse)
def create_group(group: GroupCreate, current_user: UserInDB = Depends(get_current_user)):
    
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
        "status": "OPEN",
        "members": [{
            "user_id": current_user.id,
            "status": "JOINED"
        }]
    }
    
    new_group_ref.set(group_data)
    
    # We need to return a response that matches the Schema.
    # The Schema expects nested 'offer' object.
    # We should fetch the offer data to populate it.
    offer_data = db.collection('offers').document(group.offer_id).get().to_dict()
    offer_data['id'] = group.offer_id
    
    group_data['offer'] = offer_data
    
    return group_data
