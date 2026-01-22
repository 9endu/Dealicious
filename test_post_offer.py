import requests
import json

BASE_URL = "http://localhost:8000"

def test_create_offer():
    payload = {
        "product_url": "https://example.com/item123",
        "title": "Test Item for Debugging",
        "price": 1000,
        "location": "Test City",
        "address_details": {
            "street": "123 Test St",
            "city": "Test City",
            "state": "Test State",
            "pincode": "123456"
        },
        "target_size": 2 # Frontend sends this separate call usually, but Offers endpoint just needs offer data
    }
    
    # Needs auth? 
    # The endpoint 'create_offer' uses 'current_user = Depends(get_current_user)'
    # We need a token. 
    # For now, let's assuming I can't easily get a token without logging in.
    # But I can check if it returns 401 (Unauthorized) vs 500 (Crash) vs Connection Error.
    
    try:
        print("Sending POST request...")
        # We expect 401 if headers are missing, which confirms server is reached and logic might run (or auth runs first).
        response = requests.post(f"{BASE_URL}/offers/", json=payload)
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text}")
    except Exception as e:
        print(f"Request Failed: {e}")

if __name__ == "__main__":
    test_create_offer()
