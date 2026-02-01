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

from fastapi import BackgroundTasks

def process_offer_verification(offer_id: str, product_url: str, price: float):
    """
    Background task to verify offer and update Firestore.
    """
    try:
        from backend.services.verification import verification_service
        print(f"DEBUG: Starting background verification for {offer_id}")
        
        verification_result = verification_service.verify_offer_url(product_url, price)
        
        # Determine Status
        status = OfferStatus.PENDING # Default
        if verification_result.confidence_score >= 80.0:
            status = OfferStatus.APPROVED
            
        updates = {
            "title": verification_result.detected_title or "Unknown Title", # We might want to keep original if detected is null
            "verification_score": verification_result.confidence_score,
            "warnings": verification_result.warnings,
            "status": status,
            "detected_platform": verification_result.detected_platform
        }
        
        # If we got a better title, use it. checking if detected_title is not None/Empty
        if verification_result.detected_title:
             updates["title"] = verification_result.detected_title

        db.collection('offers').document(offer_id).update(updates)
        print(f"DEBUG: Background verification complete for {offer_id}. Status: {status}")
        
    except Exception as e:
        print(f"ERROR: Background verification failed for {offer_id}: {e}")



@router.post("/", response_model=OfferResponse)
def create_offer(
    offer: OfferCreate, 
    background_tasks: BackgroundTasks,
    current_user: UserInDB = Depends(get_current_user)
):
    try:
        # 1. Quick Domain Check (Non-blocking)
        # We can do a fast regex check here if needed, but for now we just accept it.
        
        # 2. Initial Setup
        new_offer_ref = db.collection('offers').document()
        
        # Initial Data (Before Verification)
        offer_data = {
            "id": new_offer_ref.id,
            "posted_by_id": current_user.id,
            "product_url": offer.product_url,
            "title": offer.title, # User provided title initially
            "price": offer.price,
            "location": offer.location or "Unknown",
            "status": OfferStatus.PENDING,
            "verification_score": 0.0, # Placeholder
            "warnings": ["Verification in progress..."],
            "duplicate_of": None,
            "matched_group_id": None,
            "matching_reason": None,
            "similar_offers": [],
            "created_at": datetime.utcnow()
        }
        
        new_offer_ref.set(offer_data)
        
        # 3. Queue Background Verification
        background_tasks.add_task(process_offer_verification, new_offer_ref.id, offer.product_url, offer.price)
        
        # 4. Queue Duplicate Check (Also potentially slow, so move to background? 
        # For now, let's keep it here OR move it. The user reported 'Network Error', which is usually the scraping.
        # AI matching on text is fast-ish. Let's move AI matching to background too to be safe?
        # Actually, let's keep it simple. Only scraping was the major blocker. 
        # But wait, if we return immediately, we won't have duplicate info for the Frontend Modal.
        # The frontend *expects* duplicate info in the response to show the modal!
        # If we make it async, the frontend won't get duplicate info.
        
        # Trade-off: 
        # A) Block on AI Match (Fast-ish, local BERT) but Async on Scraping (Slow, Network).
        # B) Async everything and frontend polls for updates.
        
        # Let's try A. Local BERT is usually < 100ms. Network scraping is 5-10s.
        # We will run AI match against *existing active offers* using user-provided title.
        # Then scraping updates the title later.
        
        duplicate_info = {"match_id": None, "reason": None}
        similar_list = []
        match_group_id = None
        
        try:
             # Fetch active offers
            active_docs = db.collection('offers').where("status", "in", [OfferStatus.APPROVED.value, OfferStatus.PENDING.value]).limit(50).stream()
            active_offers = []
            for d in active_docs:
                ad = d.to_dict()
                ad['id'] = d.id
                active_offers.append(ad)
                
            match_result = to_matcher.find_matches(offer, active_offers)
            
            duplicate_info = match_result.get("duplicate") or {"match_id": None, "reason": None}
            similar_list = match_result.get("similar", [])
            
             # Enrich with Group IDs
            def get_group_id(oid):
                gs = db.collection('groups').where('offer_id', '==', oid).limit(1).stream()
                for g in gs: return g.id
                return None

            if duplicate_info['match_id']:
                match_group_id = get_group_id(duplicate_info['match_id'])
            
            for sim in similar_list:
                sim['group_id'] = get_group_id(sim['id'])
                
            # Update the record with these results immediately
            updates = {
                "duplicate_of": duplicate_info.get("match_id"),
                "matched_group_id": match_group_id,
                "matching_reason": duplicate_info.get("reason"),
                "similar_offers": similar_list,
            }
            new_offer_ref.update(updates)
            offer_data.update(updates)
            
        except Exception as e:
            print(f"Warning: Duplicate check warning: {e}")

        
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
