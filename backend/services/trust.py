from typing import Dict
from backend.enums import KYCLevel

def calculate_initial_trust_score(user_data: Dict) -> float:
    score = 20.0 # Base score for signing up
    
    if user_data.get('is_phone_verified'):
        score += 30.0
        
    if user_data.get('is_email_verified'):
        score += 15.0
        
    if user_data.get('kyc_level') == KYCLevel.VERIFIED:
        score += 35.0
    elif user_data.get('kyc_level') == KYCLevel.BASIC:
        score += 10.0
        
    # Cap at 100
    return min(100.0, score)

def update_trust_score(current_score: float, action: str) -> float:
    """
    Adjusts score based on user actions.
    """
    if action == "ORDER_DELIVERED":
        current_score += 5.0
    elif action == "DISPUTE_LOST":
        current_score -= 20.0
    elif action == "LATE_PICKUP":
        current_score -= 5.0
        
    return max(0.0, min(100.0, current_score))
