# 🎓 OTP Authentication System - Viva Guide

## 📌 Project Overview
This module implements a **Dual-OTP Authentication System** supporting:
1.  **Phone Number Verification**: Powered by **Firebase Auth** (handles SMS delivery securely).
2.  **Email Verification**: Powered by a **Custom Backend** (FastAPI + Gmail SMTP + Firestore).

This hybrid approach demonstrates knowledge of both **Cloud-Managed Services (Firebase)** and **Custom Backend Logic (SMTP/DB)**, making it ideal for a final year project.

---

## 🏗️ Architecture Design

### 1. High-Level Flow
```ascii
[User Interface]  <-- (1) Input Phone/Email -->  [Frontend Logic (Next.js)]
       |                                                |
       | (Phone Mode)                                   | (Email Mode)
       v                                                v
[Firebase Auth SDK]                              [Backend API (FastAPI)]
       |                                                |
       | (2) Send SMS                                   | (2) Generate OTP
       v                                                v
[User Mobile]                                    [Firestore Database] (Store OTP)
       |                                                |
       | (3) User Enters OTP                            +--- (3) Send via SMTP --> [Gmail]
       v                                                                            |
[Firebase Auth SDK]  -- (4) Verify & Get Token --> [Frontend] <---- (4) User Checks Email
```

### 2. Component Breakdown

#### A. Phone Auth (Firebase)
*   **Why use Firebase?** Sending SMS is expensive and complex (carrier regulations). Firebase provides a free tier for phone auth, handles delivery reliability, and manages security (recaptcha).
*   **Flow**:
    1.  Frontend uses `signInWithPhoneNumber`.
    2.  Firebase sends SMS.
    3.  Frontend calls `confirmationResult.confirm(otp)`.
    4.  Firebase verifies and returns a valid User Token.

#### B. Email Auth (Custom SMTP)
*   **Why Custom Implementation?** To demonstrate backend logic: OTP generation, hashing (optional but good), expiry handling, and SMTP integration.
*   **Flow**:
    1.  **Request**: Frontend POSTs email to `/auth/email/send`.
    2.  **Generation**: Backend generates `123456`.
    3.  **Storage**: Backend stores `{ otp: '123456', expires: 5mins, attempts: 0 }` in Firestore `otp_codes` collection.
    4.  **Sending**: Backend uses Python `smtplib` to send email via Gmail.
    5.  **Verification**: Frontend POSTs code to `/auth/email/verify`. Backend checks DB.
    6.  **Token Minting**: If valid, Backend uses `firebase-admin` to create a **Custom Token** manually and sends it to Frontend.

---

## 🔒 Security Measures (Important for Viva)

1.  **Expiry Time (TTL)**: Email OTPs expire in 5 minutes. This prevents old codes from being brute-forced.
2.  **Attempt Limiting**: Maximum 3 wrong attempts allowed. After that, the OTP is invalidated.
3.  **No Hardcoded Credentials**: API Keys and Email Passwords are in `.env` (Environment Variables), never in the code.
4.  **Server-Side Validation**: OTP verification happens on the secure backend, not frontend.
5.  **Firebase Security**: Phone Auth uses reCAPTCHA to prevent bot spam.

---

## ❓ Viva Questions & Answers

**Q1: Why did you use Firebase for Phone but SMTP for Email?**
*   **A:** SMS gateways (like Twilio) are paid. Firebase Phone Auth is free (limited) and reliable. For Email, I wanted to demonstrate that I can build a custom authentication flow using standard protocols like SMTP and database management.

**Q2: How do you handle OTP expiry?**
*   **A:** In the backend, when an OTP is created, I calculate `expires_at = now + 5 mins` and store it in Firestore. During verification, I compare the current time with this stored timestamp.

**Q3: What happens if I verify the OTP?**
*   **A:** For Email: The backend validates the code, deletes it from the DB (to prevent replay attacks), and mints a Firebase Custom Token so the user is signed in to the same Firebase system as phone users.

**Q4: Is the Email OTP secure?**
*   **A:** Yes. We limit attempts (Brute-force protection), use HTTPS (encryption in transit), and expire codes quickly.

---

## 🧪 Testing Instructions

### 1. Test Phone Number (Free)
Firebase allows setting "Test Numbers" that don't send real SMS but accept a fixed code.
*   **Phone**: `+1 650-555-3434`
*   **OTP**: `123456`
*   *Make sure to add this in your Firebase Console -> Authentication -> Sign-in method -> Phone -> "Phone numbers for testing".*

### 2. Test Email
*   Ensure your `.env` has `MAIL_USERNAME` and `MAIL_PASSWORD` (App Password, not login password).
*   Enter your real email.
*   Check Inbox/Spam.
*   Copy code and verify.

---

## 📁 Code Structure
*   `frontend/components/AuthProviders.tsx`: Main UI component.
*   `backend/routers/otp_auth.py`: Backend logic for Email OTP.
*   `backend/services/users.py`: Syncs user data after login.
