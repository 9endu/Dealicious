from fastapi import APIRouter, Depends, HTTPException
from backend.firebase_setup import db
from backend.auth import get_current_user, UserInDB
from backend.schemas import OfferCreate, OfferResponse
from backend.models import OfferStatus
from firebase_admin import firestore
from datetime import datetime
import uuid

router = APIRouter()

@router.post("/", response_model=OfferResponse)
def create_offer(
    offer: OfferCreate, 
    current_user: UserInDB = Depends(get_current_user)
):
    # Create new document ref
    new_offer_ref = db.collection('offers').document()
    
    offer_data = {
        "id": new_offer_ref.id,
        "posted_by_id": current_user.id,
        "product_url": offer.product_url,
        "title": offer.title,
        "price": offer.price,
        "location": offer.location,
        "location": offer.location,
        "status": OfferStatus.APPROVED,
        "verification_score": 80.0,
        # Use datetime.utcnow() instead of SERVER_TIMESTAMP to avoid Pydantic validation errors
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
