from fastapi import APIRouter, Depends, HTTPException
from backend.firebase_setup import db
from backend.auth import get_current_user, UserInDB
from backend.schemas import OfferCreate, OfferResponse, OfferStatus
from firebase_admin import firestore
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
        "status": "APPROVED",
        "verification_score": 80.0,
        "created_at": firestore.SERVER_TIMESTAMP
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
