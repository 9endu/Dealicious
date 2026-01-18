from sqlalchemy.orm import Session
from backend.models import User, Transaction, TransactionType, TransactionStatus

class TrustService:
    def calculate_trust_score(self, user: User, db: Session) -> float:
        """
        Base Score: 50
        + Verified Phone: +20
        + Verified Email: +10
        + Successful Transaction: +5 (capped at 30)
        - Failed/Disputed Transaction: -20
        """
        score = 50.0
        
        # Phone verification check
        if user.is_phone_verified:
            score += 20.0
            
        if user.is_email_verified:
            score += 10.0
            
        # Transaction History
        # We need to query transactions
        successful_tx = db.query(Transaction).filter(
            (Transaction.from_user_id == user.id) | (Transaction.to_user_id == user.id),
            Transaction.status == TransactionStatus.SUCCESS
        ).count()
        
        score += min(successful_tx * 5, 30)
        
        # Penalties could be added here based on dispute flags (to be implemented)
        
        return min(max(score, 0.0), 100.0)

    def update_user_score(self, user_id: str, db: Session):
        user = db.query(User).filter(User.id == user_id).first()
        if user:
            new_score = self.calculate_trust_score(user, db)
            user.trust_score = new_score
            db.commit()
            db.refresh(user)
            return new_score
        return 0.0

trust_service = TrustService()
