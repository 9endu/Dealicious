from backend.firebase_setup import db
from firebase_admin import firestore

class TrustService:
    def update_user_score(self, user_id: str) -> float:
        user_ref = db.collection('users').document(user_id)
        user_doc = user_ref.get()
        
        if not user_doc.exists:
            return 50.0
            
        user_data = user_doc.to_dict()
        
        score = 50.0
        if user_data.get('is_phone_verified'):
            score += 20.0
        if user_data.get('is_email_verified'):
            score += 10.0
            
        # Cap at 100
        score = min(score, 100.0)
        
        # Update
        user_ref.update({"trust_score": score})
        return score

trust_service = TrustService()
