from fastapi import APIRouter, Depends, HTTPException
from backend.firebase_setup import db
from backend.auth import get_current_user, UserInDB
from backend.schemas import OfferCreate, OfferResponse
from backend.enums import OfferStatus
from firebase_admin import firestore
from datetime import datetime
import uuid

router = APIRouter()

@router.post("/", response_model=OfferResponse)
def create_offer(
    offer: OfferCreate, 
    current_user: UserInDB = Depends(get_current_user)
):
    # Verify Offer
    from backend.services.verification import verification_service
    
    verification_result = verification_service.verify_offer_url(offer.product_url, offer.price)
    
    if not verification_result.is_valid:
        raise HTTPException(
            status_code=400, 
            detail=f"Offer verification failed (Score: {verification_result.confidence_score}). Warning: {verification_result.warnings}"
        )
        
    # Status Logic
    status = OfferStatus.PENDING # Default manual review
    if verification_result.confidence_score >= 80.0:
        status = OfferStatus.APPROVED
    elif verification_result.confidence_score < 60.0:
        # Check should have caught this, but double safety
         raise HTTPException(status_code=400, detail="Trust score too low.")

    # Create new document ref
    new_offer_ref = db.collection('offers').document()
    
    offer_data = {
        "id": new_offer_ref.id,
        "posted_by_id": current_user.id,
        "product_url": offer.product_url,
        "title": verification_result.detected_title or offer.title, # Prefer detected title
        "price": offer.price,
        "location": offer.location or "Unknown",
        "status": status,
        "verification_score": verification_result.confidence_score,
        "warnings": verification_result.warnings,
        "created_at": datetime.utcnow()
    }
    
    new_offer_ref.set(offer_data)
    
    return offer_data

@router.get("/", response_model=list[OfferResponse])
def get_offers(limit: int = 20):
    docs = db.collection('offers').limit(limit).stream()
    offers = []
    for doc in docs:
        data = doc.to_dict()
        data['id'] = doc.id
        offers.append(data)
    return offers
