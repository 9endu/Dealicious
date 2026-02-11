import firebase_admin
from firebase_admin import credentials, firestore
import os
import sys

# Setup path to find backend module if needed
sys.path.append(os.getcwd())

try:
    from backend.firebase_setup import db
except ImportError:
    # Manual setup if backend module fails
    cred_path = "backend/service_account.json"
    if not firebase_admin._apps:
        cred = credentials.Certificate(cred_path)
        firebase_admin.initialize_app(cred)
    db = firestore.client()

print("\n--- GROUPS VERIFICATION ---")
groups = db.collection('groups').stream()
verified_count = 0
failed_count = 0

for g in groups:
    d = g.to_dict()
    gid = g.id
    members = d.get('members', [])
    member_ids = d.get('member_ids', [])
    
    # Check consistency
    extracted_ids = [m.get('user_id') for m in members if isinstance(m, dict) and 'user_id' in m]
    
    is_consistent = set(extracted_ids) == set(member_ids)
    
    status = "OK" if is_consistent and member_ids else "FAIL"
    if not member_ids: status = "MISSING"
    
    print(f"Group {gid}: {status} | Members: {len(members)} | IDs: {len(member_ids)}")
    
    if status == "OK":
        verified_count += 1
    else:
        failed_count += 1
        print(f"  Expected: {extracted_ids}")
        print(f"  Found:    {member_ids}")

print(f"\nVerification Complete: {verified_count} OK, {failed_count} Failed.")
