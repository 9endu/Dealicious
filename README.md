# Dealicious - AI Group Buy Platform

## Prerequisites
- Python 3.9+
- Node.js 18+
- Firebase Project with Firestore & Auth enabled.

## Setup

### Backend (FastAPI)
1. Navigate to the root directory.
2. Create virtual environment:
   ```bash
   python -m venv .venv
   .\.venv\Scripts\activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Create `.env` file in `backend/` with your Firebase/Razorpay keys.
5. Run the server:
   ```bash
   python -m uvicorn backend.main:app --reload --port 8000
   ```
   Server will be running at `http://localhost:8000`.

### Frontend (Next.js)
1. Navigate to `frontend`:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```
   Application will be running at `http://localhost:3000`.

## Admin Dashboard
1. Go to `http://localhost:3000/login`.
2. Login with credentials:
   - Email: `admin@gmail.com`
   - Password: `admin123`
3. You will be redirected to `/admin` to view Users, Offers, and Groups.

## Troubleshooting
- **Backend Connection Error**: Ensure backend is running on port 8000.
- **Auth Error**: Check `backend/auth.py` and `service_account.json` path.
