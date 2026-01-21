import random
import hashlib

class OTPService:
    def generate_otp(self) -> str:
        return str(random.randint(1000, 9999))
        
    def hash_otp(self, otp: str) -> str:
        return hashlib.sha256(otp.encode()).hexdigest()
        
    def verify_otp(self, input_otp: str, hashed_otp: str) -> bool:
        return self.hash_otp(input_otp) == hashed_otp

otp_service = OTPService()
