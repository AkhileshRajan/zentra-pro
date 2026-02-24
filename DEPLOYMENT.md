# Zentra – Deployment & Setup Guide

Production-grade setup for **Zentra** (AI financial copilot for India): Supabase, Railway, Vercel. Free app — no payments.

---

## 1. Create Supabase project

1. Go to [supabase.com](https://supabase.com) and sign in.
2. Click **New project**.
3. Choose your **organization** and set:
   - **Name**: e.g. `zentra-pro`
   - **Database password**: save it somewhere safe.
   - **Region**: pick one close to your users (e.g. Mumbai for India).
4. Click **Create new project** and wait for the project to be ready.

---

## 2. Get Supabase keys

1. In the Supabase dashboard, open your project.
2. Go to **Project Settings** (gear icon) → **API**.
3. Copy:
   - **Project URL** → use as `SUPABASE_URL` and `VITE_SUPABASE_URL`.
   - **anon public** key → use as `VITE_SUPABASE_ANON_KEY` (frontend only).
   - **service_role** key → use as `SUPABASE_KEY` in the **backend** (keep secret; never expose in frontend).
4. Under **Authentication** → **URL Configuration**, add:
   - **Site URL**: `http://localhost:5173` for dev; later add your Vercel URL (e.g. `https://zentra.vercel.app`).
   - **Redirect URLs**: add `http://localhost:5173/**` and `https://your-vercel-domain.vercel.app/**`.

---

## 3. Run Supabase schema

1. In Supabase dashboard, go to **SQL Editor**.
2. Click **New query**.
3. Paste the contents of `supabase/schema.sql` from this repo.
4. Click **Run** to create `users`, `zentra_scores`, and RLS policies.

---

## 4. Where to paste keys

**Backend (local:** `backend/.env` **; production: Railway env vars)**

- `SUPABASE_URL` = Project URL  
- `SUPABASE_KEY` = **service_role** key  
- `OPENAI_API_KEY` = your OpenAI API key  
- `FRONTEND_URL` = `http://localhost:5173` (dev) or your Vercel URL (prod)  
- `BACKEND_URL` = `http://localhost:8000` (dev) or your Railway URL (prod)

**Frontend (local:** `frontend/.env` **; production: Vercel env vars)**

- `VITE_SUPABASE_URL` = Project URL  
- `VITE_SUPABASE_ANON_KEY` = **anon public** key  
- `VITE_API_URL` = backend API URL: dev leave unset (uses Vite proxy); prod set to Railway URL (e.g. `https://your-app.railway.app`)

Copy from templates:

```bash
# Backend
cp backend/.env.example backend/.env
# Edit backend/.env and fill in all values.

# Frontend
cp frontend/.env.example frontend/.env
# Edit frontend/.env: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY; add VITE_API_URL only for production.
```

---

## 5. Install backend requirements

```bash
cd backend
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

---

## 6. Run backend

```bash
cd backend
source .venv/bin/activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

- API: [http://localhost:8000](http://localhost:8000)  
- Docs: [http://localhost:8000/docs](http://localhost:8000/docs)

---

## 7. Run frontend

```bash
cd frontend
npm install
npm run dev
```

- App: [http://localhost:5173](http://localhost:5173)  
- Magic link login uses Supabase; ensure `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set in `frontend/.env`.

---

## 8. Deploy backend to Railway

1. Go to [railway.app](https://railway.app) and sign in.
2. **New project** → **Deploy from GitHub repo** (or use Railway CLI and deploy from `backend` directory).
3. If deploying from repo, set **Root directory** to `backend` (or deploy only the `backend` folder).
4. **Settings** → **Build**:
   - Build command: `pip install -r requirements.txt` (or leave default if Railway detects Python).
   - Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. **Variables**: Add all env vars from `backend/.env` (SUPABASE_URL, SUPABASE_KEY, OPENAI_API_KEY, FRONTEND_URL, BACKEND_URL).
6. Deploy; note the public URL (e.g. `https://zentra-backend.railway.app`).
7. Set **FRONTEND_URL** to your Vercel URL and **BACKEND_URL** to this Railway URL.

---

## 9. Deploy frontend to Vercel

1. Go to [vercel.com](https://vercel.com) and sign in.
2. **Add New** → **Project** → import your Git repo.
3. **Root directory**: set to `frontend` (or leave root if frontend is the only app).
4. **Environment variables**:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_API_URL` = your Railway backend URL (e.g. `https://zentra-backend.railway.app`)
5. Deploy. Use the generated URL (e.g. `https://zentra.vercel.app`) in Supabase redirect URLs and as `FRONTEND_URL` in Railway.

---

## Summary checklist

- [ ] Supabase project created; schema run; Site URL and Redirect URLs set.  
- [ ] Backend `.env` (and Railway) has SUPABASE_URL, SUPABASE_KEY (service_role), OPENAI_API_KEY, FRONTEND_URL, BACKEND_URL.  
- [ ] Frontend `.env` (and Vercel) has VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY; VITE_API_URL in production.  
- [ ] Backend runs with `uvicorn app.main:app --reload --port 8000`; frontend with `npm run dev`.  
- [ ] Railway: backend deployed; env vars set; FRONTEND_URL points to Vercel.  
- [ ] Vercel: frontend deployed; VITE_API_URL points to Railway.

After this, magic link login, credits (50/month free), AI chat, Zentra Score, and file upload work end-to-end in production.
