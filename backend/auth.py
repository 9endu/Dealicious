from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from firebase_admin import auth, firestore

from backend.firebase_setup import db
from backend.schemas import UserResponse
from pydantic import BaseModel
from typing import Optional

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="users/login")

# Simple User Model for Auth
class UserInDB(BaseModel):
    id: str
    phone: Optional[str] = None
    email: Optional[str] = None
    full_name: Optional[str] = None
    trust_score: float = 50.0
    is_email_verified: bool = False
    is_phone_verified: bool = False
    
    class Config:
        from_attributes = True

def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        decoded_token = auth.verify_id_token(token)
        uid = decoded_token['uid']
        
        user_doc = db.collection('users').document(uid).get()
        if not user_doc.exists:
             user_data = {
                "id": uid,
                "email": decoded_token.get('email'),
                "phone": decoded_token.get('phone_number'),
                "full_name": decoded_token.get('name', 'Unknown User'),
                "trust_score": 50.0,
                "is_email_verified": decoded_token.get('email_verified', False),
                "is_phone_verified": False,
                "created_at": firestore.SERVER_TIMESTAMP,
                "kyc_level": "BASIC"
             }
             db.collection('users').document(uid).set(user_data)
        else:
            user_data = user_doc.to_dict()
            # Self-heal: If name missing in DB but in token, update it
            if not user_data.get('full_name') and decoded_token.get('name'):
                 print(f"DEBUG: Self-healing name for {uid} -> {decoded_token.get('name')}")
                 user_data['full_name'] = decoded_token.get('name')
                 db.collection('users').document(uid).update({'full_name': user_data['full_name']})
            
        user_data['id'] = uid 
        
        return UserInDB(**user_data)
    except Exception as e:
        import traceback
        print(f"AUTH ERROR DETAILED: {str(e)}")
        raise credentials_exception

def get_decoded_token(token: str = Depends(oauth2_scheme)):
    """
    Verifies the token signature only. Does NOT check DB existence.
    Used for the /sync endpoint where the user doc might not exist yet.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid authentication credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        decoded_token = auth.verify_id_token(token)
        return decoded_token
    except Exception:
        raise credentials_exception
