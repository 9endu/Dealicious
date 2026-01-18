import enum
import uuid
from sqlalchemy import Column, String, Float, Boolean, Integer, Enum, ForeignKey, DateTime, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from backend.database import Base

class KYCLevel(str, enum.Enum):
    NONE = "NONE"
    BASIC = "BASIC"
    VERIFIED = "VERIFIED"

class OfferStatus(str, enum.Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"

class GroupStatus(str, enum.Enum):
    FORMING = "FORMING"
    LOCKED = "LOCKED"
    FUNDED = "FUNDED"
    ORDERED = "ORDERED"
    DELIVERED = "DELIVERED"
    COMPLETED = "COMPLETED"

class TransactionType(str, enum.Enum):
    DEPOSIT = "DEPOSIT"
    ESCROW_LOCK = "ESCROW_LOCK"
    RELEASE = "RELEASE"
    REFUND = "REFUND"

class TransactionStatus(str, enum.Enum):
    PENDING = "PENDING"
    SUCCESS = "SUCCESS"
    FAILED = "FAILED"

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    phone = Column(String, unique=True, index=True)
    email = Column(String, unique=True, nullable=True)
    hashed_password = Column(String)
    full_name = Column(String, nullable=True)
    trust_score = Column(Float, default=50.0)
    is_email_verified = Column(Boolean, default=False)
    is_phone_verified = Column(Boolean, default=False)
    kyc_level = Column(Enum(KYCLevel), default=KYCLevel.NONE)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    wallet = relationship("Wallet", back_populates="user", uselist=False)
    offers = relationship("Offer", back_populates="poster")
    transactions = relationship("Transaction", foreign_keys="[Transaction.from_user_id]")

class Wallet(Base):
    __tablename__ = "wallets"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), unique=True)
    balance = Column(Float, default=0.0)
    locked_amount = Column(Float, default=0.0)
    
    user = relationship("User", back_populates="wallet")

class Offer(Base):
    __tablename__ = "offers"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    posted_by_id = Column(String, ForeignKey("users.id"))
    product_url = Column(String)
    product_image = Column(String, nullable=True)
    title = Column(String)
    price = Column(Float)
    currency = Column(String, default="INR")
    parsed_data = Column(JSON, nullable=True) # Full structured data from AI extraction
    verification_score = Column(Float, default=0.0)
    status = Column(Enum(OfferStatus), default=OfferStatus.PENDING)
    expiry = Column(DateTime(timezone=True), nullable=True)
    location = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    poster = relationship("User", back_populates="offers")
    groups = relationship("GroupBuy", back_populates="offer")

class GroupBuy(Base):
    __tablename__ = "groups"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    offer_id = Column(String, ForeignKey("offers.id"))
    target_size = Column(Integer, default=2)
    current_size = Column(Integer, default=1)
    status = Column(Enum(GroupStatus), default=GroupStatus.FORMING)
    receiver_id = Column(String, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    offer = relationship("Offer", back_populates="groups")
    members = relationship("GroupMember", back_populates="group")
    receiver = relationship("User", foreign_keys=[receiver_id])

class GroupMember(Base):
    __tablename__ = "group_members"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    group_id = Column(String, ForeignKey("groups.id"))
    user_id = Column(String, ForeignKey("users.id"))
    status = Column(String, default="JOINED") # JOINED, PAID, DELIVERED_CONFIRMED
    distribution_otp = Column(String, nullable=True) # Hashed OTP
    
    group = relationship("GroupBuy", back_populates="members")
    user = relationship("User")

class Transaction(Base):
    __tablename__ = "transactions"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    from_user_id = Column(String, ForeignKey("users.id"), nullable=True)
    to_user_id = Column(String, ForeignKey("users.id"), nullable=True) 
    amount = Column(Float)
    type = Column(Enum(TransactionType))
    status = Column(Enum(TransactionStatus), default=TransactionStatus.PENDING)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
