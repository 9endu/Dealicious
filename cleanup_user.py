import firebase_admin
from firebase_admin import auth, credentials
import sys
import os
from dotenv import load_dotenv

# Load env variables
load_dotenv("frontend/.env.local")

# Initialize Firebase Admin
if not firebase_admin._apps:
    cred = credentials.Certificate("backend/service_account.json")
    firebase_admin.initialize_app(cred)

def delete_user_by_email(email):
    try:
        user = auth.get_user_by_email(email)
        auth.delete_user(user.uid)
        print(f"✅ Successfully deleted user: {email} (UID: {user.uid}) from Firebase Authentication.")
        
        # Optional: Also delete from Firestore if it exists there (to be thorough)
        from firebase_admin import firestore
        db = firestore.client()
        db.collection('users').document(user.uid).delete()
        print(f"✅ Also ensured Firestore document for {user.uid} is deleted.")
        
    except auth.UserNotFoundError:
        print(f"⚠️ User {email} not found in Firebase Authentication.")
    except Exception as e:
        print(f"❌ Error deleting user: {e}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python cleanup_user.py <email>")
        sys.exit(1)
        
    target_email = sys.argv[1]
    delete_user_by_email(target_email)
