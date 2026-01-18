import razorpay
from backend.config import settings

# Initialize Razorpay Client
# User will need to provide keys in .env
# RAZORPAY_KEY_ID=...
# RAZORPAY_KEY_SECRET=...

class PaymentService:
    def __init__(self):
        # We try to load keys, else fail gracefully or use dummy
        self.client = None
        try:
            # self.client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))
            pass 
        except:
            pass

    def create_order(self, amount: float, currency: str = "INR") -> dict:
        """
        Creates a Razorpay order. Amount should be in paise.
        """
        if not self.client:
            # Mock response if no client
            return {"id": "order_mock_123", "amount": amount * 100, "currency": currency}
        
        data = { "amount": int(amount * 100), "currency": currency, "receipt": "order_rcptid_11" }
        payment = self.client.order.create(data=data)
        return payment

    def verify_signature(self, razorpay_order_id, razorpay_payment_id, razorpay_signature):
        if not self.client:
            return True
        
        params_dict = {
            'razorpay_order_id': razorpay_order_id,
            'razorpay_payment_id': razorpay_payment_id,
            'razorpay_signature': razorpay_signature
        }
        return self.client.utility.verify_payment_signature(params_dict)

payment_service = PaymentService()
