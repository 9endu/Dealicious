from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from backend.database import get_db
from backend.models import User, Wallet, KYCLevel
from backend.schemas import UserCreate, UserResponse
from backend.services.trust import trust_service
from backend.auth import get_password_hash, create_access_token, verify_password
from fastapi.security import OAuth2PasswordRequestForm
from datetime import timedelta

router = APIRouter()

@router.post("/", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(user: UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.phone == user.phone).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Phone number already registered")
    
    # Create User
    hashed_pw = get_password_hash(user.password)
    new_user = User(
        phone=user.phone,
        email=user.email,
        full_name=user.full_name,
        hashed_password=hashed_pw,
        kyc_level=KYCLevel.BASIC if user.email else KYCLevel.NONE,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # Initialize Wallet
    wallet = Wallet(user_id=new_user.id)
    db.add(wallet)
    db.commit()
    
    # Calculate Initial Trust Score
    trust_service.update_user_score(new_user.id, db)
    
    return new_user

@router.post("/login")
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    # Note: OAuth2 form uses 'username', we map it to phone
    user = db.query(User).filter(User.phone == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect phone or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=30)
    access_token = create_access_token(
        data={"sub": user.id}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer", "user_id": user.id}

@router.get("/{user_id}", response_model=UserResponse)
def get_user(user_id: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

from pydantic import BaseModel

class VerificationRequest(BaseModel):
    user_id: str
    type: str  # "email" or "phone"
    otp: str

@router.post("/verify")
def verify_contact(req: VerificationRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == req.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    # Simulation: Hardcoded OTP "1234"
    if req.otp != "1234":
         raise HTTPException(status_code=400, detail="Invalid OTP")
         
    if req.type == "email":
        user.is_email_verified = True
    elif req.type == "phone":
        user.is_phone_verified = True
    else:
        raise HTTPException(status_code=400, detail="Invalid verification type")
        
    db.commit()
    
    # Recalculate Trust Score
    new_score = trust_service.update_user_score(user.id, db)
    
    return {"status": "verified", "new_trust_score": new_score}
