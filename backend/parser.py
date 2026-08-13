import json
import os
import re
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
    AnalysisResponse,
)

load_dotenv(find_dotenv())

api_key = os.getenv("GROQ_API_KEY")
if not api_key:
    api_key = "missing"

client = Groq(api_key=api_key, timeout=15.0)
model = os.getenv("LLM_MODEL", "llama-3.3-70b-versatile")


# ── File readers ──────────────────────────────────────────────

CONTROL_CHARS = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")


def clean_text(text: str) -> str:
    """Remove control characters and normalize whitespace.

    Handles PDFs that contain emoji, special glyphs or stray bytes —
    keeps meaningful Unicode (including emoji) but strips junk.
    """
    text = CONTROL_CHARS.sub("", text or "")
    text = text.replace("\u200b", "").replace("\ufeff", "")  # zero-width + BOM
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def read_pdf(file_path: str | Path) -> str:
    reader = PdfReader(file_path)
    pages = []
    for page in reader.pages:
        text = page.extract_text()
        if not text or len(text.strip()) < 20:
            text = page.extract_text(extraction_mode="layout")
        if text and len(text.strip()) >= 20:
            pages.append(text)
    raw = "\n".join(pages)
    cleaned = clean_text(raw)
    if len(cleaned) < 50:
        try:
            from pdf2image import convert_from_path
            import pytesseract

            ocr_parts = []
            for img in convert_from_path(str(file_path), dpi=200):
                ocr_parts.append(pytesseract.image_to_string(img))
            cleaned = clean_text("\n".join(ocr_parts))
        except ImportError:
            raise ValueError(
                "Could not extract text from this PDF — it is likely a scanned "
                "(image-based) document. Resumes with photos/emoji as images need "
                "OCR. Convert it to DOCX and try again."
            )
        if len(cleaned) < 50:
            raise ValueError(
                "Text extraction produced too little content. The PDF may be "
                "scanned/image-only or corrupted."
            )
    return cleaned


def read_docx(file_path: str | Path) -> str:
    doc = Document(file_path)
    lines = []
    for paragraph in doc.paragraphs:
        if paragraph.text.strip():
            lines.append(paragraph.text)
    for table in doc.tables:
        for row in table.rows:
            for cell in row.cells:
                if cell.text.strip():
                    lines.append(cell.text)
    for section in doc.sections:
        lines.append(section.header.paragraphs[0].text if section.header.paragraphs else "")
    for section in doc.sections:
        lines.append(section.footer.paragraphs[0].text if section.footer.paragraphs else "")
    return clean_text("\n".join(lines))


def read_resume(file_path: str | Path) -> str | None:
    p = Path(file_path)
    suffix = p.suffix.lower()
    if suffix == ".pdf":
        return read_pdf(p)
    elif suffix == ".docx":
        return read_docx(p)
    return None


# ── LLM helpers ──────────────────────────────────────────────

def _llm_json(messages: list[dict], max_retries: int = 3) -> dict:
    for attempt in range(max_retries):
        try:
            resp = client.chat.completions.create(
                model=model,
                messages=messages,
                response_format={"type": "json_object"},
            )
            content = clean_text(resp.choices[0].message.content or "")
            return json.loads(content)
        except json.JSONDecodeError:
            if attempt == max_retries - 1:
                raise
            time.sleep(2 ** attempt)
        except Exception:
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

def compute_match(job: JobDescription, resume: Resume, semantic_pairs: list[dict] | None = None) -> MatchResult:
    semantic_block = ""
    if semantic_pairs:
        lines = [
            f"- JD skill '{p['jd_skill']}' was matched to resume skill '{p['matched_skill']}' "
            f"({p['similarity']}% similarity) — treat these as the same skill."
            for p in semantic_pairs
        ]
        semantic_block = (
            "\nSemantic skill equivalences found (treat as already matched):\n"
            + "\n".join(lines)
            + "\n"
        )

    prompt = (
        "You are an experienced HR recruiter. Compare the candidate's "
        "resume against the job description and return a structured match report.\n\n"
        f"JOB DESCRIPTION:\n{job.model_dump_json(indent=2)}\n\n"
        f"CANDIDATE RESUME:\n{resume.model_dump_json(indent=2)}\n\n"
        f"{semantic_block}"
        f"Return ONLY valid JSON matching this schema:\n{MatchResult.model_json_schema()}\n\n"
        "CRITICAL CONSISTENCY RULES — violations are the worst kind of error:\n"
        "- Never list a skill as 'missing' if it appears in the candidate's "
        "skills list or the semantic equivalences above.\n"
        "- Never claim the resume 'does not mention' a technology that is in "
        "candidate.skills, projects, or experiences.skills_used.\n"
        "- Never mention a technology in weaknesses if it is in the resume.\n"
        "- A technology with a different name but the same meaning (e.g. "
        "Node.js vs NodeJS, REST API vs REST APIs) counts as present.\n\n"
        "Be thorough:\n"
        "1. overall_score: 0-100 based on weighted criteria\n"
        "2. skills.matched: skills from resume that match JD requirements\n"
        "3. skills.missing: skills from JD that resume truly lacks\n"
        "4. skills.extra: notable skills on resume not in JD\n"
        "5. experience: check if candidate meets minimum experience\n"
        "6. education_match: list of education items that satisfy requirements\n"
        "7. strengths/weaknesses: bullet-point insights grounded ONLY in resume data\n"
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


def analyze_full(jd_text: str, resume_path: str | Path) -> AnalysisResponse:
    """Run the full pipeline: JD parse → resume parse → match + ATS + semantic."""

    from ats import analyze_ats
    from semantic import semantic_match

    if api_key == "missing":
        raise ValueError("GROQ_API_KEY not set — add it in Railway Variables")

    resume_text = read_resume(resume_path)
    if not resume_text:
        raise ValueError(f"Unsupported or unreadable file: {resume_path}")

    job = parse_job_description(jd_text)
    resume = parse_resume(resume_text)

    semantic = semantic_match(job, resume)
    semantic_pairs = [p.model_dump() for p in semantic.pairs]
    match = compute_match(job, resume, semantic_pairs)
    match = enforce_consistency(job, resume, match, semantic_pairs)

    ats = analyze_ats(job, resume, jd_text, resume_text)

    return AnalysisResponse(
        job=job,
        resume=resume,
        match=match,
        ats=ats,
        semantic=semantic,
    )


def enforce_consistency(
    job: JobDescription,
    resume: Resume,
    match: MatchResult,
    semantic_pairs: list[dict],
) -> MatchResult:
    """Deterministically fix LLM contradictions.

    Any JD skill that semantically matches a resume skill is by definition
    present — the LLM cannot list it as missing or as a weakness.
    """

    from semantic import normalize_skill

    resume_skills = {normalize_skill(s) for s in resume.skills if s}
    for exp in resume.experiences:
        for s in exp.skills_used:
            resume_skills.add(normalize_skill(s))
    jd_skills = {normalize_skill(s) for s in job.required_skills + job.preferred_skills}
    resume_terms = {s.lower() for s in resume_skills}
    jd_terms = {s.lower() for s in jd_skills}

    for pair in semantic_pairs:
        jd_norm = normalize_skill(pair["jd_skill"])
        jd_terms.add(jd_norm.lower())
        resume_terms.add(normalize_skill(pair["matched_skill"]).lower())

    present = set()
    for jd_term in jd_terms:
        if jd_term in resume_terms or any(
            jd_term == r or jd_term in r or r in jd_term
            for r in resume_terms
        ):
            present.add(jd_term)

    matched = list(match.skills.matched)
    missing = [s for s in match.skills.missing if normalize_skill(s).lower() not in present]
    newly_matched = [
        s for s in (job.required_skills + job.preferred_skills)
        if normalize_skill(s).lower() in present
        and s not in matched
        and s not in missing
    ]
    if newly_matched:
        matched.extend(newly_matched)

    match.skills.matched = matched
    match.skills.missing = missing

    for skill in present:
        match.weaknesses = [
            w for w in match.weaknesses
            if normalize_skill(skill) not in normalize_skill(w)
        ]
        match.improvement_tips = [
            t for t in match.improvement_tips
            if normalize_skill(skill) not in normalize_skill(t.suggestion)
        ]

    if present and match.overall_score < 40:
        match.overall_score = min(40.0, match.overall_score + 10)

    return match
