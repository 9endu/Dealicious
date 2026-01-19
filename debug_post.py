import requests
import json
import firebase_admin
from firebase_admin import auth, credentials
import os

# Setup Firebase Admin SDK to get a valid token
cred_path = "backend/service_account.json"
if not os.path.exists(cred_path):
    print(f"Service account not found at {cred_path}")
    exit(1)

if not firebase_admin._apps:
    cred = credentials.Certificate(cred_path)
    firebase_admin.initialize_app(cred)

# Create a custom token or verify an existing one?
# For script, we might need a valid ID token. 
# It's hard to get a valid ID token purely from Admin SDK without a client login exchange.
# Alternatively, we can use a mocked user ID if we temporarily disable auth in backend, OR
# We can just check the health endpoint first.

BASE_URL = "http://localhost:8000"

def check_health():
    try:
        print(f"Checking health at {BASE_URL}/health...")
        res = requests.get(f"{BASE_URL}/health")
        print(f"Status: {res.status_code}")
        print(f"Response: {res.json()}")
        return True
    except requests.exceptions.ConnectionError:
        print("CONNECTION ERROR: Could not connect to backend. Is it running?")
        return False
    except Exception as e:
        print(f"ERROR: {e}")
        return False

if __name__ == "__main__":
    if check_health():
        print("\nBackend is reachable.")
        # We won't try to post because getting a valid Firebase ID token from python script 
        # requires simulating a client login which is complex without keys.
        # But "Network Error" usually means connection refused (backend not running).
    else:
        print("\nBACKEND SEEMS DOWN.")
