from fastapi import APIRouter, Depends, HTTPException
from backend.firebase_setup import db
from backend.auth import get_current_user, UserInDB
from backend.schemas import OfferCreate, OfferResponse
from backend.enums import OfferStatus
from backend.services.ai_core import ai_service, to_matcher
from firebase_admin import firestore
from datetime import datetime
import uuid

router = APIRouter()

@router.post("/", response_model=OfferResponse)
def create_offer(
    offer: OfferCreate, 
    current_user: UserInDB = Depends(get_current_user)
):
    try:
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
        # Removed explicit rejection for < 60.0 because 'is_valid' check above already handles rejection.
        # This allows "Manual Review" items (Score 10.0) to pass as PENDING.

        # DUPLICATE & SIMILARITY CHECK (AI Feature)
        duplicate_info = {"match_id": None, "reason": None}
        similar_list = []
        
        try:
            # Fetch active offers
            active_docs = db.collection('offers').where("status", "in", [OfferStatus.APPROVED.value, OfferStatus.PENDING.value]).limit(50).stream()
            active_offers = []
            for d in active_docs:
                ad = d.to_dict()
                ad['id'] = d.id
                active_offers.append(ad)
                
            match_result = to_matcher.find_matches(offer, active_offers)
            
            # 1. Exact Duplicate
            if match_result['duplicate']:
                print(f"Duplicate found! {match_result['duplicate']}")
                duplicate_info = {"match_id": match_result['duplicate']['id'], "reason": match_result['duplicate']['reason']}
                status = OfferStatus.PENDING
                
            # 2. Potential Matches (Did you mean?)
            similar_list = match_result['similar']
            if similar_list:
                print(f"Found {len(similar_list)} similar offers.")
                
            # Enrich with Group IDs
            # Helper to find group
            def get_group_id(oid):
                gs = db.collection('groups').where('offer_id', '==', oid).limit(1).stream()
                for g in gs: return g.id
                return None

            match_group_id = None
            if duplicate_info['match_id']:
                match_group_id = get_group_id(duplicate_info['match_id'])
            
            for sim in similar_list:
                sim['group_id'] = get_group_id(sim['id'])

        except Exception as e:
            print(f"Warning: Duplicate check failed {e}") 
            match_group_id = None

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
            "duplicate_of": duplicate_info.get("match_id"),
            "matched_group_id": match_group_id,
            "matching_reason": duplicate_info.get("reason"),
            "similar_offers": similar_list,
            "created_at": datetime.utcnow()
        }
        
        new_offer_ref.set(offer_data)
        
        return offer_data

    except HTTPException as he:
        raise he
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")

@router.get("/", response_model=list[OfferResponse])
def get_offers(limit: int = 20):
    docs = db.collection('offers').limit(limit).stream()
    offers = []
    for doc in docs:
        data = doc.to_dict()
        data['id'] = doc.id
        offers.append(data)
    return offers
