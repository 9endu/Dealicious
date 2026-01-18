import requests
import json
from backend.models import User
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from backend.auth import create_access_token

# 1. Get a valid user token
SQLALCHEMY_DATABASE_URL = "sqlite:///./sql_app.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)
db = SessionLocal()
user = db.query(User).first()
if not user:
    print("No user found in DB to test with.")
    exit()

token = create_access_token({"sub": user.id})
headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
db.close()

# 2. Payload mimicking frontend
payload = {
    "product_url": "https://amazon.in/test",
    "title": "Debug Deal",
    "price": 1000.0,
    "location": "Debug Location"
}

print(f"Testing POST /offers/ with user {user.id}")
try:
    resp = requests.post("http://localhost:8000/offers/", json=payload, headers=headers)
    print(f"Offer Status: {resp.status_code}")
    if resp.status_code == 200:
        offer_data = resp.json()
        offer_id = offer_data["id"]
        print(f"Offer Created: {offer_id}")
        
        # 3. Create Group
        group_payload = {"offer_id": offer_id, "target_size": 2}
        print("Testing POST /groups/")
        g_resp = requests.post("http://localhost:8000/groups/", json=group_payload, headers=headers)
        print(f"Group Status: {g_resp.status_code}")
        print(f"Group Response: {g_resp.text}")
except Exception as e:
    print(f"Request failed: {e}")
