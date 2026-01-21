from fastapi import APIRouter, Depends, HTTPException
from backend.auth import get_current_user, UserInDB
from backend.services.wallet import wallet_service
from backend.services.payment import payment_service
from pydantic import BaseModel

router = APIRouter()

class DepositRequest(BaseModel):
    amount: float

class PaymentVerification(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str
    amount: float

@router.get("/wallet")
def get_my_wallet(current_user: UserInDB = Depends(get_current_user)):
    return wallet_service.get_wallet(current_user.id)

@router.post("/create_order")
def create_deposit_order(req: DepositRequest, current_user: UserInDB = Depends(get_current_user)):
    # Create Razorpay Order
    try:
        order = payment_service.create_order(req.amount)
        return order
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/verify_deposit")
def verify_deposit(req: PaymentVerification, current_user: UserInDB = Depends(get_current_user)):
    # Verify Signature
    is_valid = payment_service.verify_signature(
        req.razorpay_order_id, 
        req.razorpay_payment_id, 
        req.razorpay_signature
    )
    
    if not is_valid:
        raise HTTPException(status_code=400, detail="Invalid Payment Signature")
        
    # Add to Wallet
    wallet_service.deposit(current_user.id, req.amount, req.razorpay_payment_id)
    
    return {"status": "success", "new_balance": wallet_service.get_wallet(current_user.id)['balance']}
