from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from firebase_admin import auth
from backend.firebase_setup import db
from backend.schemas import UserResponse
from pydantic import BaseModel
from typing import Optional

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="users/login")

# Simple User Model for Auth
class UserInDB(BaseModel):
    id: str
    phone: str
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
             raise credentials_exception
             
        user_data = user_doc.to_dict()
        user_data['id'] = uid 
        
        return UserInDB(**user_data)
    except Exception:
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
