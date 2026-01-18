from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from pydantic import BaseModel
from backend.firebase_setup import db
from backend.auth import get_current_user, UserInDB, get_decoded_token
from backend.schemas import UserResponse
from firebase_admin import firestore

router = APIRouter()

class UserSync(BaseModel):
    full_name: str
    phone: str
    email: str

@router.post("/sync", response_model=UserResponse)
def sync_user(user_data: UserSync, token_data: dict = Depends(get_decoded_token)):
    """
    Called after Firebase Auth Signup to ensure User Document exists in Firestore.
    """
    uid = token_data['uid']
    
    # Check if exists
    user_ref = db.collection('users').document(uid)
    doc = user_ref.get()
    
    if not doc.exists:
        # Create new user doc
        new_data = {
            "id": uid,
            "full_name": user_data.full_name,
            "phone": user_data.phone,
            "email": user_data.email,
            "trust_score": 50.0,
            "is_email_verified": False,
            "is_phone_verified": False,
            "created_at": firestore.SERVER_TIMESTAMP,
            "kyc_level": "BASIC"
        }
        user_ref.set(new_data)
        
        # Return with ID explicitly (though it is in new_data)
        return new_data
    else:
        data = doc.to_dict()
        data['id'] = uid
        return data

@router.get("/me", response_model=UserResponse)
def read_user_me(current_user: UserInDB = Depends(get_current_user)):
    return current_user

@router.get("/{user_id}", response_model=UserResponse)
def read_user(user_id: str):
    doc = db.collection('users').document(user_id).get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="User not found")
    data = doc.to_dict()
    data['id'] = user_id
    return data

@router.post("/verify")
def verify_contact(req: dict, current_user: UserInDB = Depends(get_current_user)):
    # Simple simulated verification for Firestore
    user_ref = db.collection('users').document(current_user.id)
    
    if req.get('otp') != "1234":
         raise HTTPException(status_code=400, detail="Invalid OTP")
         
    if req.get('type') == "email":
        user_ref.update({"is_email_verified": True, "trust_score": firestore.Increment(10)})
    elif req.get('type') == "phone":
        user_ref.update({"is_phone_verified": True, "trust_score": firestore.Increment(20)})
    
    return {"status": "verified"}
