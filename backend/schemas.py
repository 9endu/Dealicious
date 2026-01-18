from pydantic import BaseModel, HttpUrl, Field
from typing import Optional, List, Dict
from datetime import datetime
from backend.models import KYCLevel, OfferStatus, GroupStatus

# --- User Schemas ---
class UserBase(BaseModel):
    phone: str
    email: Optional[str] = None
    full_name: Optional[str] = None

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: str
    trust_score: float
    kyc_level: KYCLevel
    created_at: datetime
    
    class Config:
        from_attributes = True

# --- Offer Schemas ---
class OfferBase(BaseModel):
    product_url: Optional[str] = None
    title: str
    price: float
    currency: str = "INR"

class OfferCreate(BaseModel):
    product_url: Optional[str] = None
    # For file upload, we handle it in the controller, but this model validates the parsed data confirmation
    title: Optional[str] = None 
    price: Optional[float] = None
    location: Optional[str] = None

class OfferVerificationResult(BaseModel):
    is_valid: bool
    confidence_score: float
    detected_platform: Optional[str]
    detected_price: Optional[float]
    detected_title: Optional[str]
    warnings: List[str] = []

class OfferResponse(OfferBase):
    id: str
    posted_by_id: str
    verification_score: float
    status: OfferStatus
    offer_image: Optional[str] = None
    location: Optional[str] = None
    
    class Config:
        from_attributes = True

# --- Group Schemas ---
class GroupCreate(BaseModel):
    offer_id: str
    target_size: int = Field(default=2, ge=2)

class GroupResponse(BaseModel):
    id: str
    offer: OfferResponse
    current_size: int
    target_size: int
    status: GroupStatus
    receiver_id: Optional[str]
    
    class Config:
        from_attributes = True
