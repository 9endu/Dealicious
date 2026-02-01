
import requests
import time

BASE_URL = "http://localhost:8000"

def check_health():
    try:
        # Try accessing public endpoint or docs
        res = requests.get(f"{BASE_URL}/docs")
        if res.status_code == 200:
            print("✅ Backend is responding (200 OK)")
        else:
            print(f"❌ Backend returned {res.status_code}")
    except Exception as e:
        print(f"❌ Backend connection failed: {e}")

if __name__ == "__main__":
    check_health()
