from backend.firebase_setup import db
from backend.enums import TransactionType, TransactionStatus
from firebase_admin import firestore
from datetime import datetime
import uuid

class WalletService:
    def get_wallet(self, user_id: str):
        wallet_ref = db.collection('wallets').document(user_id)
        doc = wallet_ref.get()
        if not doc.exists:
            # Create default wallet
            new_wallet = {
                "user_id": user_id,
                "balance": 0.0,
                "locked_amount": 0.0,
                "currency": "INR",
                "created_at": datetime.utcnow()
            }
            wallet_ref.set(new_wallet)
            return new_wallet
        return doc.to_dict()

    def deposit(self, user_id: str, amount: float, transaction_id: str):
        """
        Adds funds to user wallet.
        """
        user_ref = db.collection('users').document(user_id)
        wallet_ref = db.collection('wallets').document(user_id)
        
        # Atomically increment balance
        wallet_ref.update({
            "balance": firestore.Increment(amount)
        })
        
        # Log Transaction
        self._log_transaction(user_id, amount, TransactionType.DEPOSIT, TransactionStatus.SUCCESS, f"Razorpay: {transaction_id}")
        
    def lock_funds_for_group(self, user_id: str, group_id: str, amount: float):
        """
        Moves funds from Balance to Locked Amount using a transaction.
        """
        transaction = db.transaction()
        wallet_ref = db.collection('wallets').document(user_id)

        @firestore.transactional
        def update_in_transaction(transaction, wallet_ref, amount):
            snapshot = wallet_ref.get(transaction=transaction)
            if not snapshot.exists:
                raise ValueError("Wallet not found")
            
            data = snapshot.to_dict()
            if data['balance'] < amount:
                raise ValueError("Insufficient Funds")
            
            transaction.update(wallet_ref, {
                "balance": firestore.Increment(-amount),
                "locked_amount": firestore.Increment(amount)
            })
            
        try:
            update_in_transaction(transaction, wallet_ref, amount)
            self._log_transaction(user_id, amount, TransactionType.ESCROW_LOCK, TransactionStatus.SUCCESS, f"Group: {group_id}")
        except Exception as e:
            raise ValueError(f"Transaction failed: {str(e)}")


    def release_escrow(self, from_user_id: str, to_user_id: str, amount: float):
        """
        Moves locked funds from Sender to Receiver's Available Balance.
        """
        # We can't do cross-document transactions easily if they are not in same group often, 
        # but Firestore supports it.
        # For Minimum Viable Product, we will do sequential updates but robustly.
        
        # 1. Deduct from Sender Locked
        sender_wallet = db.collection('wallets').document(from_user_id)
        sender_wallet.update({
            "locked_amount": firestore.Increment(-amount)
        })
        
        # 2. Add to Receiver Balance
        receiver_wallet = db.collection('wallets').document(to_user_id)
        # Ensure receiver wallet exists
        if not receiver_wallet.get().exists:
             self.get_wallet(to_user_id)
             
        receiver_wallet.update({
            "balance": firestore.Increment(amount)
        })
        
        self._log_transaction(from_user_id, amount, TransactionType.RELEASE, TransactionStatus.SUCCESS, f"To: {to_user_id}")
        self._log_transaction(to_user_id, amount, TransactionType.DEPOSIT, TransactionStatus.SUCCESS, f"From Escrow: {from_user_id}")


    def _log_transaction(self, user_id: str, amount: float, type: TransactionType, status: TransactionStatus, desc: str):
        txn_ref = db.collection('transactions').document()
        txn_ref.set({
            "id": txn_ref.id,
            "user_id": user_id,
            "amount": amount,
            "type": type,
            "status": status,
            "description": desc,
            "timestamp": datetime.utcnow()
        })

wallet_service = WalletService()
