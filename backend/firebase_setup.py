
import firebase_admin
from firebase_admin import credentials, firestore, auth
import os

# Path to service account key
SERVICE_ACCOUNT_PATH = "backend/service_account.json"

if not firebase_admin._apps:
    try:
        cred = credentials.Certificate(SERVICE_ACCOUNT_PATH)
        firebase_admin.initialize_app(cred)
        print("Firebase Admin Initialized")
    except Exception as e:
        print(f"Failed to initialize Firebase: {e}")

db = firestore.client()
