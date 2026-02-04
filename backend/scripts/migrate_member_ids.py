import sys
import os

# Add root directory to path to allow imports from backend
sys.path.append(os.getcwd())

try:
    from backend.firebase_setup import db
except ImportError:
    # Fallback if running from backend directory
    sys.path.append(os.path.dirname(os.path.dirname(os.getcwd())))
    from backend.firebase_setup import db

def migrate():
    print("Starting migration of member_ids...")
    groups_ref = db.collection('groups')
    docs = groups_ref.stream()
    
    count = 0
    updated = 0
    
    for doc in docs:
        count += 1
        data = doc.to_dict()
        members = data.get('members', [])
        
        # Extract user_ids
        member_ids = []
        for m in members:
            if isinstance(m, dict) and 'user_id' in m:
                member_ids.append(m['user_id'])
        
        # Check if update is needed
        current_ids = data.get('member_ids', [])
        
        # We define update needed if member_ids field is missing or different
        if 'member_ids' not in data or set(current_ids) != set(member_ids):
            try:
                print(f"Updating group {doc.id} with {len(member_ids)} members")
                groups_ref.document(doc.id).update({'member_ids': member_ids})
                updated += 1
            except Exception as e:
                print(f"Error updating group {doc.id}: {e}")
            
    print(f"Migration complete. Scanned {count} groups, updated {updated}.")

if __name__ == "__main__":
    migrate()
