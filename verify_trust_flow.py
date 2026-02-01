import requests
import time

BASE_URL = "http://localhost:8000"

def run_verification():
    print("--- Starting Trust Verification ---")
    
    # 1. Create Offer (High Trust User)
    print("\n1. Creating Offer (User A)...")
    offer_payload = {
        "product_url": "https://example.com/item_trust_test",
        "title": "Trust Test Item",
        "price": 500,
        "location": "City A"
    }
    # offers.py mock uses fixed user, so just post
    res_offer = requests.post(f"{BASE_URL}/offers/", json=offer_payload)
    if res_offer.status_code != 200:
        print(f"FAILED to create offer: {res_offer.text}")
        return
    
    offer_id = res_offer.json()['id']
    print(f"Offer ID: {offer_id}")
    
    # 2. Create Group (High Trust User)
    print("\n2. Creating Group (User A)...")
    group_payload = {
        "offer_id": offer_id,
        "target_size": 2,
        "address_details": {"street": "Main St", "city": "City A", "state": "State A", "pincode": "100000"}
    }
    headers_normal = {"x-test-user": "normal"}
    res_group = requests.post(f"{BASE_URL}/groups/", json=group_payload, headers=headers_normal)
    
    if res_group.status_code != 200:
        print(f"FAILED to create group: {res_group.text}")
        return
        
    group_id = res_group.json()['id']
    print(f"Group ID: {group_id}")
    
    # 3. Join Group (Low Trust User - Score 20.0)
    print("\n3. Joining Group (User B - Low Trust)...")
    join_payload = {
        "payment_id": "pending",
        "address_details": {"street": "Low St", "city": "City B", "state": "State B", "pincode": "200000"}
    }
    headers_low = {"x-test-user": "low_trust"}
    
    res_join = requests.post(f"{BASE_URL}/groups/{group_id}/join", json=join_payload, headers=headers_low)
    
    print(f"Join Status: {res_join.status_code}")
    print(f"Join Response: {res_join.text}")
    
    if res_join.status_code == 200:
        print("\nSUCCESS: Low trust user joined successfully!")
    elif res_join.status_code == 403:
        print("\nFAILURE: Low trust user was blocked (Trust Score issue).")
    else:
        print(f"\nFAILURE: Unexpected error {res_join.status_code}")

if __name__ == "__main__":
    run_verification()
