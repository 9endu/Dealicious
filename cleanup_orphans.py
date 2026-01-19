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

print("Fetching all groups...")
groups = db.collection('groups').stream()
offer_ids_in_groups = set()
for g in groups:
    d = g.to_dict()
    offer_ids_in_groups.add(d.get('offer_id'))

print(f"Found {len(offer_ids_in_groups)} valid offers linked to groups.")

print("Fetching all offers...")
offers = db.collection('offers').stream()
orphans = []
valid = 0

for o in offers:
    if o.id not in offer_ids_in_groups:
        orphans.append(o)
    else:
        valid += 1

print(f"Found {len(orphans)} orphan offers (duplicates/failed creations).")
print(f"Found {valid} valid offers.")

if orphans:
    print(f"Deleting {len(orphans)} orphans...")
    for o in orphans:
        print(f"Deleting offer {o.id} ({o.to_dict().get('title')})...")
        o.reference.delete()
    print("Cleanup complete.")
else:
    print("No orphans found.")
