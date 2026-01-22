import requests
import json

BASE_URL = "http://localhost:8000"

def debug_group():
    # 1. Fetch all groups to find a valid ID
    print("Fetching list of groups...")
    try:
        res = requests.get(f"{BASE_URL}/groups/")
        groups = res.json()
        if not groups:
            print("No groups found.")
            return

        group_id = groups[0]['id']
        print(f"Inspecting Group ID: {group_id}")
        
        # 2. Fetch specific group details
        res_detail = requests.get(f"{BASE_URL}/groups/{group_id}")
        data = res_detail.json()
        
        print("Group Detail Response Keys:", data.keys())
        print("Members Field:", json.dumps(data.get('members'), indent=2))
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    debug_group()
