from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from backend.models import User, Offer, GroupBuy
import sys
import os

# Add parent directory to path to allow importing backend modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

SQLALCHEMY_DATABASE_URL = "sqlite:///./sql_app.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)
db = SessionLocal()

print("--- USERS TABLE ---")
users = db.query(User).all()
if not users:
    print("No users found.")
for u in users:
    print(f"[User] ID: {u.id} | Name: {u.full_name} | Phone: {u.phone} | Score: {u.trust_score}")

print("\n--- OFFERS TABLE ---")
offers = db.query(Offer).all()
if not offers:
    print("No offers found.")
for o in offers:
    print(f"[Offer] ID: {o.id} | Title: {o.title} | Price: {o.price} | Location: {o.location}")

print("\n--- GROUPS TABLE ---")
groups = db.query(GroupBuy).all()
if not groups:
    print("No groups found.")
for g in groups:
    print(f"[Group] ID: {g.id} | OfferID: {g.offer_id} | Target: {g.target_size}")

db.close()
