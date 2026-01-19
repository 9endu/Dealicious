import firebase_admin
from firebase_admin import credentials, firestore
import os

cred_path = "backend/service_account.json"
if not os.path.exists(cred_path):
    print(f"Service account not found at {cred_path}")
    exit(1)

if not firebase_admin._apps:
    cred = credentials.Certificate(cred_path)
    firebase_admin.initialize_app(cred)

db = firestore.client()

print("\n--- OFFERS ---")
offers = db.collection('offers').stream()
count = 0
for o in offers:
    d = o.to_dict()
    print(f"ID: {d.get('id')} | Title: {d.get('title')} | Created: {d.get('created_at')}")
    count += 1
print(f"Total Offers: {count}")

print("\n--- GROUPS ---")
groups = db.collection('groups').stream()
g_count = 0
for g in groups:
    d = g.to_dict()
    print(f"ID: {d.get('id')} | OfferID: {d.get('offer_id')} | Target: {d.get('target_size')} | Status: {d.get('status')}")
    g_count += 1
print(f"Total Groups: {g_count}")
