# Resume Matcher

Upload a resume + job description → get a structured match analysis with score, skills gap, experience check, and verdict.

## Quick Start (Local)

```bash
# 1. Install backend deps
pip install -r backend/requirements.txt

# 2. Copy and fill in your Groq API key
copy .env.example .env

# 3. Start backend
uvicorn backend.main:app --reload --port 8000

# 4. Open another terminal → start frontend
cd frontend
npm install
npm run dev
```

Open http://localhost:5173 — paste a JD, upload a resume, click **Analyze**.

---

## Deploy to Vercel (backend — free)

[Vercel](https://vercel.com) deploys Python apps automatically. No Docker needed.

1. Push this whole `day5/` folder to a GitHub repo
2. Go to https://vercel.com → **Add New** → **Project**
3. Import your GitHub repo, set **Root Directory** to `backend`
4. Vercel auto-detects Python/FastAPI → Deploy
5. Go to **Settings** → **Environment Variables** → add:
   ```
   GROQ_API_KEY = gsk_your_key_here
   ```
6. Redeploy → Vercel gives you a `https://your-api.vercel.app` URL

---

## Deploy to Vercel (frontend — free)

1. Go to https://vercel.com → **Add New** → **Project**
2. Import your GitHub repo, set **Root Directory** to `frontend`
3. Framework = **Vite**, Build = `npm run build`, Output = `dist`
4. Add environment variable:
   ```
   VITE_API_URL = https://your-api.vercel.app
   ```
5. Deploy → Vercel gives you a `https://your-app.vercel.app` URL

That's it. Users hit your Vercel URL, upload resumes, and the backend on Vercel does the analysis.

---

## Project Structure

```
day5/
├── backend/              ← FastAPI Python API
│   ├── main.py           ← API endpoints (POST /api/analyze)
│   ├── models.py         ← Pydantic schemas
│   ├── parser.py         ← Resume parsing + matching logic
│   ├── ats.py            ← ATS keyword density analysis
│   ├── semantic.py       ← Fuzzy skill matching (rapidfuzz)
│   ├── report.py         ← PDF report generation (reportlab)
│   ├── cache.py          ← Response cache + rate limiting
│   ├── pyproject.toml    ← Vercel Python build reads this
│   └── .env.example
├── frontend/             ← React + Vite + Tailwind
│   ├── src/
│   │   ├── App.tsx
│   │   ├── api.ts
│   │   └── components/
│   │       ├── Landing.tsx
│   │       ├── JobDescriptionInput.tsx
│   │       ├── ResumeUploader.tsx
│   │       ├── ResultsDashboard.tsx
│   │       └── ScoreGauge.tsx
│   ├── package.json
│   └── vite.config.ts
├── resumes/              ← Sample resumes for testing
└── .env.example
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health check |
| POST | `/api/analyze` | Upload resume (multipart) + job description text → analysis |
