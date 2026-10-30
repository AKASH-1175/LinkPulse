# LinkPulse ⚡

> **Serverless URL Shortener with Click Analytics**  
> Cloud Computing Lab Project — 4th Year B.Tech

LinkPulse is a modern, high-performance, serverless URL shortener with real-time click analytics and user-agent breakdown. It is built to demonstrate serverless compute (Vercel Serverless Functions running FastAPI), a managed Backend-as-a-Service relational database (Supabase PostgreSQL), modern Jamstack architecture (Next.js App Router, Tailwind CSS, Recharts), automated CI/CD pipelines, and secure cloud secrets management.

---

## 🏗 Architecture Overview

```
[ Client Browser ]
    │            \
    │ (Web UI)    \ (Short Link: /{code})
    ▼              ▼
[ Next.js Frontend ] ──(API calls: /api/links)──▶ [ FastAPI Backend ]
(Vercel Edge/Serverless)                          (Vercel Python Functions)
                                                             │ (Service Role Key)
                                                             ▼
                                                    [ Supabase PostgreSQL ]
                                                    (Tables: links, clicks)
```

- **Frontend**: Next.js 15 (App Router), TypeScript, Tailwind CSS, Recharts.
- **Backend**: Python 3.12, FastAPI, Pydantic v2, `user-agents`, Supabase Python SDK.
- **Database**: Supabase PostgreSQL with cascading deletes and index-optimized time-series click logs.
- **Redirect Engine**: Synchronous HTTP 302 redirects ensuring accurate serverless telemetry logging without freeze-loss.

---

## 🚀 Local Development Setup

### Prerequisites
- Python 3.12
- Node.js 18+ and npm
- A free [Supabase](https://supabase.com) account

### 1. Database Setup
1. Create a project in [Supabase](https://supabase.com).
2. Go to the **SQL Editor** tab in your Supabase project dashboard.
3. Paste and run the contents of [`database/schema.sql`](./database/schema.sql).
4. Navigate to **Project Settings > API** to obtain:
   - **Project URL** (`SUPABASE_URL`)
   - **service_role secret key** (`SUPABASE_SERVICE_ROLE_KEY`) *(Never reveal this key to the frontend)*

### 2. Backend Setup
```bash
cd backend

# Create virtual environment with Python 3.12
python -m venv .venv

# Activate virtual environment
# Windows (PowerShell):
.venv\Scripts\Activate.ps1
# Linux / macOS:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create .env from template
cp .env.example .env
# Fill in SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env

# Run backend development server
uvicorn app.main:app --reload --port 8000
```
- API Docs: `http://localhost:8000/api/docs`
- Health check: `http://localhost:8000/api/health`

### 3. Frontend Setup
```bash
cd frontend

# Install dependencies
npm install

# Create .env.local from template
cp .env.example .env.local
# Verify NEXT_PUBLIC_API_BASE_URL=http://localhost:8000

# Run frontend development server
npm run dev
```
- Web Application: `http://localhost:3000`

---

## 🧪 Running Backend Tests

Backend tests are written with `pytest` and mock the Supabase database layer to test business logic and edge cases in isolation:

```bash
cd backend
pytest -v
```

---

## 🚢 Deployment to Vercel

LinkPulse is organized as a monorepo deployed as **two separate Vercel projects**:

### Step 1: Deploy Backend
1. In Vercel, click **Add New > Project** and import the repository.
2. Set **Root Directory** to `backend`.
3. Add Environment Variables:
   - `SUPABASE_URL`: Your Supabase project URL
   - `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role secret key
   - `SHORT_BASE_URL`: The production URL of this backend (e.g., `https://linkpulse-api.vercel.app`)
   - `FRONTEND_ORIGIN`: Placeholder for now (e.g., `https://linkpulse-app.vercel.app` or temporary `*`)
4. Deploy the project and note down the assigned backend URL (e.g. `https://linkpulse-api.vercel.app`).

### Step 2: Deploy Frontend
1. In Vercel, import the same repository again as a second project.
2. Set **Root Directory** to `frontend`.
3. Set Framework Preset to **Next.js**.
4. Add Environment Variables:
   - `NEXT_PUBLIC_API_BASE_URL`: The production backend URL from Step 1 (e.g., `https://linkpulse-api.vercel.app`).
5. Deploy the project and note down your frontend URL (e.g., `https://linkpulse-app.vercel.app`).

### Step 3: Connect Frontend & Backend CORS
1. Return to the backend project settings in Vercel.
2. Update `FRONTEND_ORIGIN` to your exact frontend domain: `https://linkpulse-app.vercel.app`.
3. Update `SHORT_BASE_URL` to your backend domain if not set earlier.
4. Redeploy the backend project.
