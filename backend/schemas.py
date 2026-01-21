from pydantic import BaseModel, HttpUrl, Field, field_validator
import re
from typing import Optional, List, Dict
from datetime import datetime
from backend.enums import KYCLevel, OfferStatus, GroupStatus

# --- User Schemas ---
class AddressSchema(BaseModel):
    street: str
    city: str
    state: str
    pincode: str
    
class UserBase(BaseModel):
    phone: str
    email: Optional[str] = None
    full_name: Optional[str] = None

class UserCreate(UserBase):
    password: str

    @field_validator('password')
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        if not re.search(r"[A-Z]", v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not re.search(r"[a-z]", v):
            raise ValueError('Password must contain at least one lowercase letter')
        if not re.search(r"\d", v):
            raise ValueError('Password must contain at least one digit')
        if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", v):
            raise ValueError('Password must contain at least one special character')
        return v


class UserResponse(UserBase):
    id: str
    trust_score: float
    kyc_level: KYCLevel
    created_at: datetime
    


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
    address_details: Optional[AddressSchema] = None


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
    address_details: Optional[AddressSchema] = None

    
    class Config:
        from_attributes = True

# --- Group Schemas ---
class GroupCreate(BaseModel):
    offer_id: str
    target_size: int = Field(default=2, ge=2)
    address_details: Optional[AddressSchema] = None
    
class GroupJoin(BaseModel):
    payment_id: Optional[str] = None
    address_details: AddressSchema


class GroupResponse(BaseModel):
    id: str
    offer: OfferResponse
    current_size: int
    target_size: int
    status: GroupStatus
    receiver_id: Optional[str]
    
    class Config:
        from_attributes = True
