from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel, EmailStr
from backend.firebase_setup import db
from datetime import datetime, timedelta
import secrets
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os
from firebase_admin import auth as firebase_auth
from firebase_admin import firestore

from backend.config import settings

router = APIRouter(prefix="/auth/email", tags=["Email OTP"])

# Configuration
SMTP_SERVER = "smtp.gmail.com"
SMTP_PORT = 587
SMTP_USERNAME = settings.MAIL_USERNAME.strip() if settings.MAIL_USERNAME else None
SMTP_PASSWORD = settings.MAIL_PASSWORD.strip() if settings.MAIL_PASSWORD else None

class EmailRequest(BaseModel):
    email: EmailStr

class VerifyRequest(BaseModel):
    email: EmailStr
    otp: str

def send_email_background(email: str, otp: str):
    if not SMTP_USERNAME or not SMTP_PASSWORD:
        print(f"⚠️ SMTP Credentials missing. Login simulated. OTP for {email} is: {otp}")
        return

    try:
        msg = MIMEMultipart()
        msg['From'] = SMTP_USERNAME
        msg['To'] = email
        msg['Subject'] = "Your Verification Code - Dealicious"

        body = f"""
        <html>
            <body>
                <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                    <h2 style="color: #4F46E5;">Dealicious</h2>
                    <p>Hello,</p>
                    <p>Your verification code is:</p>
                    <h1 style="background-color: #f3f4f6; padding: 10px; border-radius: 5px; display: inline-block; letter-spacing: 5px;">{otp}</h1>
                    <p>This code expires in 5 minutes.</p>
                    <p>If you didn't request this, please ignore this email.</p>
                </div>
            </body>
        </html>
        """
        msg.attach(MIMEText(body, 'html'))

        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
        server.starttls()
        server.login(SMTP_USERNAME, SMTP_PASSWORD)
        server.send_message(msg)
        server.quit()
        print(f"✅ OTP sent to {email}")
    except Exception as e:
        print(f"⚠️ Email Send Failed ({e}). Falling back to Console.")
        print(f"🔑 SIMULATED OTP for {email}: {otp}")

@router.post("/send")
async def send_otp(req: EmailRequest, background_tasks: BackgroundTasks):
    # 1. Generate 6 digit OTP
    otp = "".join([str(secrets.randbelow(10)) for _ in range(6)])
    
    # 2. Store in Firestore with Expiry (5 mins)
    # Using 'otp_codes' collection, doc_id = email
    doc_ref = db.collection('otp_codes').document(req.email)
    
    doc_ref.set({
        'otp': otp,
        'expires_at': datetime.utcnow() + timedelta(minutes=5),
        'attempts': 0
    })

    # 3. Send Email (Background Task)
    background_tasks.add_task(send_email_background, req.email, otp)
    
    return {"message": "OTP sent successfully"}

@router.post("/verify")
async def verify_otp(req: VerifyRequest):
    # 1. Fetch OTP from Firestore
    doc_ref = db.collection('otp_codes').document(req.email)
    doc = doc_ref.get()

    if not doc.exists:
        raise HTTPException(status_code=400, detail="No OTP request found for this email.")

    data = doc.to_dict()
    
    # 2. Check Expiry
    # Note: Firestore datetime is timezone aware (UTC), we compare with utcnow
    # We might need to make 'now' aware or handle offset-naive vs aware
    stored_expiry = data['expires_at']
    # Ensure stored_expiry is comparable (convert to naive if needed or make now aware)
    if stored_expiry.replace(tzinfo=None) < datetime.utcnow():
        raise HTTPException(status_code=400, detail="OTP has expired. Please request a new one.")

    # 3. Check Attempts
    if data['attempts'] >= 3:
        doc_ref.delete() # Security protocol: invalidating after max attempts
        raise HTTPException(status_code=400, detail="Too many failed attempts. OTP invalidated.")

    # 4. Verify Code
    if data['otp'] != req.otp:
        # Increment attempts
        doc_ref.update({'attempts': data['attempts'] + 1})
        raise HTTPException(status_code=400, detail="Invalid OTP code.")

    # 5. Success! Invalidate OTP
    doc_ref.delete()
    
    # Update User Trust Score and Verification Status
    try:
        user_ref = db.collection('users').document(req.email) # Assuming email is doc ID for temp or we need to find user by email. 
        # Actually in users.py we use UID as doc ID. Here we don't have UID easily unless we fetch it.
        # But wait, the user might not even exist in Firestore 'users' collection yet if they are just validating email at start?
        # Or `sync_user` creates it. `sync_user` is called AFTER auth usually because it needs token.
        
        # Strategy:
        # If this is pre-signup verification, we can't update 'users' doc yet easily without UID.
        # But the Requirement says "creates new account -> then do phone/mail auth".
        # So they ARE signed up in Firebase Auth.
        
        user = firebase_auth.get_user_by_email(req.email)
        uid = user.uid
        user_ref = db.collection('users').document(uid)
        
        # Check if doc exists (it might not if sync hasn't run, but let's assume sync runs on client side after login)
        # If it doesn't exist, we can create a partial one or wait for sync.
        # Better: Update if exists. 
        
        if user_ref.get().exists:
            user_ref.update({
                "is_email_verified": True,
                "trust_score": firestore.Increment(10)
            })
            
    except Exception as e:
        print(f"Error updating user trust score: {e}")

    # 6. Generate Firebase Token (Custom Token) so frontend can sign in
    try:
        # Check if user exists in Firebase Auth, if not create
        try:
            user = firebase_auth.get_user_by_email(req.email)
        except firebase_auth.UserNotFoundError:
            # Create user
            user = firebase_auth.create_user(email=req.email)

        # Create Custom Token
        custom_token = firebase_auth.create_custom_token(user.uid)
        
        return {
            "token": custom_token.decode('utf-8'), # Decode bytes to string
            "uid": user.uid,
            "message": "Verification successful"
        }
    except Exception as e:
        print(f"Auth Error: {e}")
        raise HTTPException(status_code=500, detail="Authentication failed internal logic")
