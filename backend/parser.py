import json
import os
import time
from pathlib import Path

from dotenv import load_dotenv, find_dotenv
from groq import Groq
from pypdf import PdfReader
from docx import Document

from models import (
    JobDescription,
    Resume,
    Experience,
    MatchResult,
    SkillMatch,
    ExperienceCheck,
    ScoreBreakdown,
    ImprovementTip,
)

load_dotenv(find_dotenv())

api_key = os.getenv("GROQ_API_KEY")
if not api_key:
    api_key = "missing"

client = Groq(api_key=api_key, timeout=15.0)
model = os.getenv("LLM_MODEL", "llama-3.3-70b-versatile")


# ── File readers ──────────────────────────────────────────────

def read_pdf(file_path: str | Path) -> str:
    reader = PdfReader(file_path)
    return "\n".join(
        page.extract_text() or "" for page in reader.pages
    )


def read_docx(file_path: str | Path) -> str:
    doc = Document(file_path)
    lines = [p.text for p in doc.paragraphs if p.text.strip()]
    for table in doc.tables:
        for row in table.rows:
            for cell in row.cells:
                if cell.text.strip():
                    lines.append(cell.text)
    return "\n".join(lines)


def read_resume(file_path: str | Path) -> str | None:
    p = Path(file_path)
    suffix = p.suffix.lower()
    if suffix == ".pdf":
        return read_pdf(p)
    elif suffix == ".docx":
        return read_docx(p)
    return None


# ── LLM helpers ──────────────────────────────────────────────

def _llm_json(messages: list[dict], max_retries: int = 1) -> dict:
    for attempt in range(max_retries):
        try:
            resp = client.chat.completions.create(
                model=model,
                messages=messages,
                response_format={"type": "json_object"},
            )
            return json.loads(resp.choices[0].message.content)
        except Exception as e:
            if attempt == max_retries - 1:
                raise
            time.sleep(2 ** attempt)


# ── JD parser ────────────────────────────────────────────────

def parse_job_description(text: str) -> JobDescription:
    schema = JobDescription.model_json_schema()
    messages = [
        {
            "role": "system",
            "content": (
                "You are an expert HR assistant. Extract structured "
                "information from the job description.\n\n"
                f"Return ONLY valid JSON matching this schema:\n{schema}\n\n"
                "Rules:\n"
                "- Do not return the schema itself.\n"
                "- Fill with actual data from the JD.\n"
                "- If minimum experience is missing, return null.\n"
                "- If a list is empty, return [].\n"
                "- Do not invent information."
            ),
        },
        {"role": "user", "content": f"Analyze this job description:\n\n{text}"},
    ]
    data = _llm_json(messages)
    return JobDescription(**data)


# ── Resume parser ────────────────────────────────────────────

def parse_resume(text: str) -> Resume:
    schema = Resume.model_json_schema()
    messages = [
        {
            "role": "system",
            "content": (
                "You are an expert resume parser.\n\n"
                "Extract information based on meaning, not section headings.\n"
                "Resumes may use different headings for the same content.\n"
                "Include internships under experiences.\n"
                "Extract skills mentioned anywhere in the resume.\n"
                "Extract GitHub and LinkedIn profile URLs if present.\n"
                "For each experience, extract key achievement highlights as a list.\n\n"
                f"Return ONLY valid JSON matching this schema:\n{schema}\n\n"
                "Rules:\n"
                "- Do not invent information.\n"
                "- If a value is missing, return null.\n"
                "- If a list is empty, return []."
            ),
        },
        {"role": "user", "content": f"Parse this resume:\n\n{text}"},
    ]
    data = _llm_json(messages)
    return Resume(**data)


# ── Scorer ────────────────────────────────────────────────────

def compute_match(job: JobDescription, resume: Resume) -> MatchResult:
    prompt = (
        "You are an experienced HR recruiter. Compare the candidate's "
        "resume against the job description and return a structured match report.\n\n"
        f"JOB DESCRIPTION:\n{job.model_dump_json(indent=2)}\n\n"
        f"CANDIDATE RESUME:\n{resume.model_dump_json(indent=2)}\n\n"
        f"Return ONLY valid JSON matching this schema:\n{MatchResult.model_json_schema()}\n\n"
        "Be thorough:\n"
        "1. overall_score: 0-100 based on weighted criteria\n"
        "2. skills.matched: skills from resume that match JD requirements\n"
        "3. skills.missing: skills from JD that resume lacks\n"
        "4. skills.extra: notable skills on resume not in JD\n"
        "5. experience: check if candidate meets minimum experience\n"
        "6. education_match: list of education items that satisfy requirements\n"
        "7. strengths/weaknesses: bullet-point insights\n"
        "8. verdict: short final recommendation\n"
        "9. score_breakdown: break overall_score into individual scores (0-100 each) for skills, experience, and education\n"
        "10. improvement_tips: list of actionable suggestions to improve the resume for this role, each with area, suggestion, and impact (high/medium/low)"
    )
    messages = [{"role": "user", "content": prompt}]
    data = _llm_json(messages)
    return MatchResult(**data)


# ── High-level pipeline ──────────────────────────────────────

def analyze(jd_text: str, resume_path: str | Path) -> tuple[JobDescription, Resume, MatchResult]:
    if api_key == "missing":
        raise ValueError("GROQ_API_KEY not set — add it in Railway Variables")

    resume_text = read_resume(resume_path)
    if not resume_text:
        raise ValueError(f"Unsupported or unreadable file: {resume_path}")

    job = parse_job_description(jd_text)
    resume = parse_resume(resume_text)
    match = compute_match(job, resume)
    return job, resume, match
