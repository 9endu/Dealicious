from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.config import settings
from backend.database import engine, Base
from backend.routers import users, offers, groups

# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url=f"{settings.API_V1_STR}/docs"
)

# Set all CORS enabled origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(users.router, prefix="/users", tags=["users"])
app.include_router(offers.router, prefix="/offers", tags=["offers"])
app.include_router(groups.router, prefix="/groups", tags=["groups"])

@app.get("/")
def root():
    return {"message": "Dealicious API is running", "status": "active"}

@app.get("/health")
def health_check():
    return {"status": "ok", "db": "connected"}
