# Resume Matcher — AI Resume Analyzer

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Visit%20Site-6e7bff?style=for-the-badge&logo=vercel&logoColor=white)](https://resume-parser-czvu.vercel.app/)
[![Backend](https://img.shields.io/badge/Backend%20API-Online-22c55e?style=for-the-badge&logo=fastapi&logoColor=white)](https://resume-parser-liard-beta.vercel.app/api/health)
[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=white)](https://react.dev/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)

**Paste a job description, upload your resume, and get an instant AI-powered match analysis** — score, skill gaps, ATS keyword coverage, semantic matches, and actionable improvement tips.

> 🚀 **Live demo:** https://resume-parser-czvu.vercel.app/

---

## ✨ Features

| Feature | Description |
|---|---|
| 🎯 **Match score** | Weighted score across skills, experience, and education with a full per-category breakdown |
| 🧩 **Skill gap analysis** | Exactly which required and preferred skills your resume is missing |
| 🔍 **ATS keyword coverage** | Frequency comparison — "JD mentions React 8×, you 2× — add more" |
| 🧠 **Semantic matching** | Fuzzy skill matching (RapidFuzz) catches synonyms: `Node.js` ↔ `NodeJS`, `GitHub` ↔ `Git` |
| 📄 **PDF report** | Download a clean, formatted match report to share or keep |
| 💡 **Personalized tips** | Ranked, actionable suggestions by impact (high / medium / low) |
| 📁 **2 formats** | PDF and DOCX resumes, including scanned PDFs via OCR fallback |
| 🛡️ **Robust parsing** | Emoji/special-glyph handling, malformed JSON retries, contradictory-answer cleanup |

---

## 🛠️ Tech Stack

**Frontend** — React 18, TypeScript, Vite, Tailwind CSS (deployed on Vercel)

**Backend** — Python 3.11+, FastAPI, Pydantic, Groq LLM (deployed on Vercel)

**Key libraries** — `pypdf`, `python-docx` (parsing) · `RapidFuzz` (semantic matching) · `reportlab` (PDF reports) · `groq` (LLM analysis)

---

## 🏗️ Architecture

```
┌─────────────────────┐        ┌──────────────────────┐        ┌─────────────┐
│  React Frontend     │  POST  │  FastAPI Backend     │  CALL  │  Groq LLM   │
│  (Vercel · Vite)    │ ─────▶ │  (Vercel · Python)   │ ─────▶ │  (gpt-oss)  │
└─────────────────────┘  /api  └──────────────────────┘        └─────────────┘
        │  upload resume + JD              │  parse PDF/DOCX, run 3-stage pipeline
        │  show dashboard,                │  → enforce_consistency → cached reply
        └── download PDF report           └── rate-limited (10 req/min/IP)
```

The analysis runs a **3-stage pipeline**:

1. **Structure the JD** — LLM extracts role, required/preferred skills, experience, education requirements
2. **Extract the resume** — LLM turns raw PDF/DOCX text into structured data (experiences, skills, projects…)
3. **Match & score** — LLM verdict enforced by deterministic rules: ATS keyword density, semantic matching, and consistency checks guarantee the LLM can't contradict the parsed data

---

## 🚀 Quick Start (Local)

```bash
# 1. Backend — install deps
pip install -r backend/requirements.txt

# 2. Copy and fill in your Groq API key
copy .env.example .env

# 3. Start backend (http://localhost:8000)
uvicorn backend.main:app --reload --port 8000

# 4. Frontend — in a second terminal
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173** — paste a JD, upload a resume, click **Analyze**. Results in ~15 seconds.

> Note: the Vite dev server proxies `/api` to `localhost:8000`, so no extra config is needed locally.

---

## 📦 Deploy to Vercel

### Backend (2 minutes)

1. Push this repo to GitHub
2. https://vercel.com → **Add New** → **Project** → import the repo
3. Set **Root Directory** → `backend` (Python/FastAPI auto-detected)
4. **Settings → Environment Variables** → add `GROQ_API_KEY = gsk_...`
5. Deploy → you get `https://your-api.vercel.app`

### Frontend (2 minutes)

1. Same Vercel account → **Add New** → **Project** → import the same repo
2. Set **Root Directory** → `frontend` (Framework: Vite, Build: `npm run build`, Output: `dist`)
3. **Settings → Environment Variables** → add `VITE_API_URL = https://your-api.vercel.app`
4. Deploy → you get `https://your-app.vercel.app`

---

## 📡 API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/health` | Health check |
| `POST` | `/api/analyze` | Multipart form: `job_description` (text) + `resume` (PDF/DOCX, ≤5 MB) → full analysis |
| `POST` | `/api/report` | Same inputs → downloadable PDF match report |

### Example

```bash
curl -X POST https://your-api.vercel.app/api/analyze \
  -F "job_description=I am hiring a full-stack developer with React and Node.js..." \
  -F "resume=@resumes/sample.pdf"
```

---

## 📁 Project Structure

```
resume-matcher/
├── backend/                     ← FastAPI Python API
│   ├── main.py                  ← API endpoints, CORS, rate limiting
│   ├── parser.py                ← PDF/DOCX extraction + LLM pipeline
│   ├── models.py                ← Pydantic schemas
│   ├── ats.py                   ← ATS keyword density analysis
│   ├── semantic.py              ← Fuzzy skill matching (RapidFuzz + synonyms)
│   ├── report.py                ← PDF report generation (reportlab)
│   ├── cache.py                 ← Response cache + sliding-window rate limiter
│   ├── pyproject.toml           ← Vercel Python build reads this
│   └── .env.example
├── frontend/                    ← React + Vite + Tailwind
│   ├── src/
│   │   ├── App.tsx              ← Landing → analyzer → results flow
│   │   ├── api.ts               ← API client + types
│   │   └── components/
│   │       ├── Landing.tsx            ← Hero / how-it-works / features
│   │       ├── JobDescriptionInput.tsx
│   │       ├── ResumeUploader.tsx
│   │       ├── ResultsDashboard.tsx   ← Score, ATS, semantic, tips
│   │       └── ScoreGauge.tsx         ← Animated score ring
│   ├── package.json
│   └── vite.config.ts           ← Dev proxy → localhost:8000
├── resumes/                     ← Sample resumes for testing
└── .env.example
```

---

## ⚙️ Configuration

| Variable | Where | Required | Description |
|---|---|---|---|
| `GROQ_API_KEY` | Backend env | ✅ | Groq API key for LLM calls (https://console.groq.com) |
| `LLM_MODEL` | Backend env | ❌ | Model override (default: `llama-3.3-70b-versatile`) |
| `VITE_API_URL` | Frontend env | ✅ (prod) | Backend URL, e.g. `https://your-api.vercel.app` |

---

## 🛣️ Roadmap

- [ ] Batch mode — analyze multiple resumes against one JD with a ranked leaderboard
- [ ] Unit tests (pytest) with mocked LLM responses
- [ ] Interview question generator based on missing skills
- [ ] Saved analysis history + shareable result links

---

## 📄 License

MIT
