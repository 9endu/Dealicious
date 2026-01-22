import requests
import json

BASE_URL = "http://localhost:8000"

def check_health():
    try:
        print(f"Pinging {BASE_URL}...")
        response = requests.get(f"{BASE_URL}/")
        print(f"Root Status: {response.status_code}")
        print(f"Root Content: {response.text}")
        return True
    except requests.exceptions.ConnectionError:
        print("Connection Refused! The server seems to be down.")
        return False
    except Exception as e:
        print(f"Error: {e}")
        return False

if __name__ == "__main__":
    if check_health():
        print("Server is UP.")
    else:
        print("Server is DOWN.")
