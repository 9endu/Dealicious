from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.models import Offer, User, OfferStatus
from backend.schemas import OfferCreate, OfferResponse, OfferVerificationResult
from backend.services.ai_core import ai_service
import json

router = APIRouter()

@router.post("/verify/url", response_model=OfferVerificationResult)
def verify_offer_url(product_url: str):
    return ai_service.verify_offer_intelligence(url=product_url)

@router.post("/verify/image", response_model=OfferVerificationResult)
async def verify_offer_image(file: UploadFile = File(...)):
    contents = await file.read()
    return ai_service.verify_offer_intelligence(image_bytes=contents)

from backend.auth import get_current_user

@router.post("/", response_model=OfferResponse)
def create_offer(
    offer: OfferCreate, 
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # User is already verified by dependency
        
    # Re-verify logic could go here to ensure backend trust
    
    new_offer = Offer(
        posted_by_id=current_user.id,
        product_url=offer.product_url,
        title=offer.title,
        price=offer.price,
        location=offer.location,
        status=OfferStatus.APPROVED if offer.price and offer.price > 0 else OfferStatus.PENDING,
        verification_score=80.0 # Placeholder, should come from previous step
    )
    db.add(new_offer)
    db.commit()
    db.refresh(new_offer)
    return new_offer

@router.get("/", response_model=list[OfferResponse])
def get_offers(skip: int = 0, limit: int = 20, db: Session = Depends(get_db)):
    return db.query(Offer).offset(skip).limit(limit).all()
