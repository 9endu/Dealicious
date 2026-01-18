from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from backend.config import settings

# For now, we default to SQLite if Postgres fails or for easier local dev without docker
# But the architecture requests Postgres. We will use the URL from settings.
# If you want to force SQLite for dev without setup:
# SQLALCHEMY_DATABASE_URL = "sqlite:///./sql_app.db"

SQLALCHEMY_DATABASE_URL = settings.database_url

# Handle case where we might want to fallback to sqlite for immediate testing if user doesn't have postgres running
if "postgresql" not in SQLALCHEMY_DATABASE_URL:
     connect_args = {"check_same_thread": False}
else:
     connect_args = {}

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args=connect_args
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
