from fastapi import APIRouter, Depends, HTTPException
from backend.firebase_setup import db
from backend.auth import get_current_user
# We might want to secure this specifically for admin, but for now we'll just open it 
# or use a simple hardcoded check in frontend. 
# Ideal: Add 'role' to UserInDB and check here.
# MVP: Open endpoint but frontend hidden.

router = APIRouter()

from fastapi import Header

def verify_admin_secret(x_admin_secret: str = Header(...)):
    if x_admin_secret != "dealicious_admin_123":
        raise HTTPException(status_code=403, detail="Invalid Admin Secret")

@router.get("/users", dependencies=[Depends(verify_admin_secret)])
def get_all_users():
    docs = db.collection('users').stream()
    users = []
    for doc in docs:
        d = doc.to_dict()
        d['id'] = doc.id
        users.append(d)
    return users

@router.get("/offers", dependencies=[Depends(verify_admin_secret)])
def get_all_offers():
    docs = db.collection('offers').stream()
    offers = []
    for doc in docs:
        d = doc.to_dict()
        d['id'] = doc.id
        offers.append(d)
    return offers

@router.get("/groups", dependencies=[Depends(verify_admin_secret)])
def get_all_groups():
    docs = db.collection('groups').stream()
    groups = []
    for doc in docs:
        d = doc.to_dict()
        d['id'] = doc.id
        groups.append(d)
    return groups
