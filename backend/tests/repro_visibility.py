
import sys
import os

from fastapi.testclient import TestClient

# Add project root to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../../')))

from backend.main import app
from backend.auth import get_current_user, UserInDB
from backend.enums import OfferStatus, GroupStatus

# Mock Users
user_a = UserInDB(
    id="user_a_id",
    full_name="User A",
    email="usera@example.com",
    trust_score=100.0,
    is_email_verified=True,
    is_phone_verified=True
)

user_b = UserInDB(
    id="user_b_id",
    full_name="User B",
    email="userb@example.com",
    trust_score=100.0,
    is_email_verified=True,
    is_phone_verified=True
)

class AuthOverride:
    def __init__(self, user):
        self.user = user
    def __call__(self):
        return self.user

def test_visibility():
    client = TestClient(app)

    # 1. Login as User A and Create Offer + Group
    app.dependency_overrides[get_current_user] = AuthOverride(user_a)
    
    print("\n[Step 1] Creating Offer as User A...")
    offer_payload = {
        "product_url": "https://amazon.in/test-product",
        "title": "Test Product Visibility",
        "price": 5000.0,
        "location": "Test City",
        "currency": "INR",
        "address_details": {
            "street": "123 Test St",
            "city": "Test City",
            "state": "Test State",
            "pincode": "123456"
        }
    }
    
    # We need to mock the background tasks or let them run. 
    # Since we are using TestClient, background tasks run after the response is sent.
    # However, our verification service might fail if it tries to hit real URLs.
    # For this repro, we just want to see if the record persists and is queryable.
    
    resp = client.post("/offers/", json=offer_payload)
    if resp.status_code != 200:
        print(f"Failed to create offer: {resp.text}")
        return
    
    offer_data = resp.json()
    offer_id = offer_data['id']
    print(f"Offer created: {offer_id}")

    print("[Step 2] Creating Group as User A...")
    group_payload = {
        "offer_id": offer_id,
        "target_size": 2,
        "address_details": {
            "street": "123 Test St",
            "city": "Test City",
            "state": "Test State",
            "pincode": "123456"
        }
    }
    
    resp = client.post("/groups/", json=group_payload)
    if resp.status_code != 200:
        print(f"Failed to create group: {resp.text}")
        return
        
    group_data = resp.json()
    group_id = group_data['id']
    print(f"Group created: {group_id}")

    # 2. Switch to User B and Try to fetch Groups
    app.dependency_overrides[get_current_user] = AuthOverride(user_b)
    
    print("\n[Step 3] Fetching Groups as User B...")
    resp = client.get("/groups/")
    if resp.status_code != 200:
        print(f"Failed to fetch groups: {resp.text}")
        return
        
    groups = resp.json()
    print(f"User B found {len(groups)} groups.")
    
    found = False
    for g in groups:
        if g['id'] == group_id:
            found = True
            print("SUCCESS: User B can see User A's group.")
            print(f"Group Data: {g}")
            break
            
    if not found:
        print("FAILURE: User B CANNOT see User A's group.")
        print("Groups found:", groups)

    # 3. Robustness Test: Create Group with Invalid Offer ID
    print("\n[Step 4] Robustness Test: Creating Orphan Group...")
    orphan_group_payload = {
        "offer_id": "non_existent_offer_id_123",
        "target_size": 2,
        "address_details": {
            "street": "123 Test St",
            "city": "Test City",
            "state": "Test State",
            "pincode": "123456"
        }
    }
    # We need to bypass the validation in create_group that checks if offer exists
    # But wait, create_group DOES check if offer exists!
    #     offer_snapshot = db.collection('offers').document(group.offer_id).get()
    #     if not offer_snapshot.exists:
    #         raise HTTPException(status_code=404, detail="Offer not found")
    
    # So we cannot create an orphan group via API easily unless we delete the offer AFTER group creation.
    
    # Let's delete the offer we created in Step 1
    from backend.firebase_setup import db
    print(f"Deleting offer {offer_id} to simulate corruption...")
    db.collection('offers').document(offer_id).delete()
    
    print("Fetching groups again (should handle missing offer gracefully)...")
    resp = client.get("/groups/")
    if resp.status_code != 200:
        print(f"FAILURE: API crashed with {resp.status_code} when offer is missing. Response: {resp.text}")
    else:
        print(f"SUCCESS: API handled missing offer. Groups count: {len(resp.json())}")


if __name__ == "__main__":
    test_visibility()
