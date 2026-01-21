import enum

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
