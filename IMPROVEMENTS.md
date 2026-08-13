# Resume Matcher — Improvements Roadmap

Everything you can add to make this project stronger, and how to make it resume-ready.

---

## ✅ Already Fixed (recent changes)

| Issue | Fix |
|---|---|
| Resume with emoji / special glyphs crashes | `clean_text()` strips control characters, zero-width chars, BOM; keeps meaningful Unicode |
| Scanned / image-based PDFs return nothing | Automatic `layout` extraction mode fallback + optional OCR (`pytesseract` + `pdf2image`) |
| LLM returns malformed JSON | `_llm_json` now retries 3× with backoff and cleans output before parsing |
| Blank/messy PDFs | Clear error message telling user to convert to DOCX instead of silent failure |
| DOCX headers/footers lost | `read_docx` now includes section headers + footers |
| Groq model fixed to one name | `LLM_MODEL` env var override |
| LLM contradicts parsed data (e.g. "Node.js missing" while resume has it) | `enforce_consistency()` — deterministic post-LLM cleanup removes contradictions using parsed + semantic evidence |
| False skill matches ("JSON" ↔ "JavaScript") | Removed `partial_ratio` from semantic matching; synonym map (`nodejs→node.js`, `git/github→git`, `react.js→react`, …) |
| PDF report breaks on glyphs outside Latin-1 (₹, ≈, •) | `_pdf_safe()` sanitizer in `report.py` (reportlab core fonts) |
| Junk ATS keywords from JD ("need", "apis.") | STOPWORDS + known-terms filtering in `analyze_ats` |

---

## 🎯 Phase 1 — Quick Wins (hours, not days)

### 1. Multiple resume comparison (batch mode)  `⏳ deferred (skipped)`
- Endpoint `POST /api/batch-analyze` accepting 1 JD + N resumes
- Returns a **ranked leaderboard** (best → worst)
- Built on the current script's top-2/worst-2 logic — extend to full ranking

### 2. Downloadable PDF report  ✅ done
- `report.py` → `reportlab` branded PDF (`POST /api/report`)
- Frontend "Download PDF Report" button on results
- `_pdf_safe()` handles non-Latin-1 glyphs (₹ → Rs., ≈ → ~)

### 3. Semantic skill matching  ✅ done
- `semantic.py` → `rapidfuzz` (WRatio) + curated `SYNONYMS` map
- Catches synonyms: "NodeJS" ↔ "Node.js", "GitHub" ↔ "Git"
- Results shown in UI + fed into `enforce_consistency` so the LLM can't contradict them
- Zero LLM cost (pure Python) — no `sentence-transformers` needed

### 4. ATS keyword density report  ✅ done
- `ats.py` extracts JD keywords + frequency; compares resume counts
- "JD mentions X 8×, you 2× — add more" advice + coverage score
- Stopword/known-term filtering keeps keywords clean

### 5. Caching + rate limiting  ✅ done
- `cache.py` → TTL cache (SHA-256 of JD+resume) + sliding-window rate limit (10/min/IP)
- FastAPI middleware + decorators wired in `main.py` (429 with retry info)

---

## 🔧 Phase 2 — Engineering Hardening

| Area | What to do |
|---|---|
| **Tests** | `pytest` with mocked Groq responses (no API key needed in CI). Test: PDF read, DOCX read, clean_text, schema validation, happy-path analyze |
| **Structured logging** | Add `loguru`; log request IDs, latency per LLM call, token usage |
| **Async** | `groq.AsyncClient` + `asyncio.gather` for batch mode (10 resumes in parallel) |
| **Input limits** | Max file size (2MB), max JD length (10k chars) with 413/422 responses |
| **Security** | API key auth for the analyze endpoint (simple `X-API-Key` header), rate limiting |
| **CI/CD** | GitHub Actions: run lint + tests on every push, auto-deploy to Railway on main |
| **Type safety** | `mypy`/`pyright` strict mode on backend |
| **Observability** | Start with Railway logs; add Sentry free tier later for error tracking |

---

## 🚀 Phase 3 — Feature Growth (what makes it impressive)

1. **Interview question generator** — LLM generates 5 questions based on missing skills
2. **Tailored bullet-point suggestions** — rewrite weak resume lines targeting the JD (keeps your `improvement_tips` going deeper)
3. **Resume-to-JD "culture fit" fuzzy analysis** — soft skills, communication signals
4. **Salary band comparison** — optional, uses candidate experience + role seniority
5. **History / saved analyses** — SQLite + simple history page in frontend
6. **OCR out-of-the-box** — bake `tesseract` + `poppler` into a container so scanned PDFs "just work"
7. **Mobile-friendly results + shareable link** — `/r/<id>` public snapshot of a result (great for Word of Mouth)

---

## 📝 Resume-Ready — Making This a Project Worth Showing

### The MUST-haves before adding it to your resume

- [ ] Demo video (20-30 s, Loom) showing JD → upload → results. Keep gifs/links in GitHub README
- [ ] Clean README with: problem statement, architecture diagram, screenshots, live URL, tech stack
- [ ] README badges: build passing, Python version, license
- [ ] Live deployed URL (you already have Railway + Vercel/HF — keep them up)
- [ ] At least 5 unit tests passing (shows engineering rigor)
- [ ] One sample report (PDF) in repo under `examples/`

### How to write it on your resume

```
Resume Matcher — AI Resume Analyzer  (FastAPI · React · Groq LLM · Docker, deployable on Railway)
• Built a full-stack app that parses PDF/DOCX resumes (pypdf, python-docx, OCR fallback) into
  structured Pydantic data and matches them against job descriptions
• Engineered a 3-stage LLM pipeline: JD structuring → resume extraction → weighted scoring
  (skills 60% / experience 30% / education 10%) returning score breakdowns, skill-gap analysis,
  and actionable improvement tips
• Handles edge cases: emoji/special-glyph PDFs, scanned documents via OCR fallback, malformed
  LLM JSON with retry+backoff — robust parsing in the wild
• Reduced analysis latency/cost: JSON-mode responses, retries, and caching for identical requests
• Deployed to production: backend on Railway, frontend on Vercel, CORS + env-var configuration
```

**Quantify where you can** — mention "~15s per analysis, 3 LLM calls, supports 2 file formats, handles N edge cases."

### STAR story for interviews

> "Students get generic resume advice, but every job post is different. I built a web app where you paste the JD and upload your resume; the app extracts both into structured data, scores fit by skills/experience/education, and gives specific missing-skill suggestions. I made it robust against malformed PDFs by adding layout-mode extraction, OCR fallback, and LLM retries — then shipped it live on Railway + Vercel."

---

## 💡 Ideas Beyond the App (portfolio multipliers)

- Blog post / LinkedIn article: "How I built an AI resume analyzer in a weekend" (with architecture diagram)
- Record a walkthrough demoing the `improvement_tips` feature — the personalized advice is the wow factor
- Open the repo, add CONTRIBUTING + good first issues → shows community ethics to recruiters
- A short "lessons learned" section: LLM JSON reliability, cost control, OCR pitfalls

---

## Timeline

| Week | Goal |
|---|---|
| 1 | Phase 1: batch mode + PDF report + caching |
| 2 | Phase 2: tests + CI + async batch |
| 3 | Phase 3: tailored suggestions + history + share links |
| 4 | Polish: README, video, deploy final, write resume bullet + STAR story |