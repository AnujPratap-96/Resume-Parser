import re
from collections import Counter

from models import JobDescription, Resume, AtsReport, AtsKeyword

STOPWORDS = {
    "a", "an", "the", "and", "or", "but", "of", "to", "in", "on", "with",
    "for", "as", "at", "by", "from", "into", "our", "your", "their", "we",
    "you", "that", "this", "these", "those", "is", "are", "was", "were",
    "be", "been", "being", "have", "has", "had", "do", "does", "did", "will",
    "would", "can", "could", "should", "may", "might", "must", "shall",
    "not", "no", "yes", "so", "if", "then", "than", "while", "during",
    "using", "use", "used", "experience", "skills", "role", "job", "work",
    "including", "etc", "ability", "strong", "good", "great", "new", "key",
    "also", "such", "well", "team", "company", "candidate", "candidates",
    "position", "description", "preferred", "basic", "qualifications",
    "responsibilities", "what", "where", "when", "which", "who", "how",
    "need", "needs", "must", "will", "would", "like", "prefer", "preferred",
    "work", "working", "experience", "years", "knowledge", "knowledgeable",
    "ability", "able", "good", "strong", "solid", "plus", "great", "best",
    "help", "helping", "helpful", "team", "company", "role", "roles",
    "including", "etc", "also", "just", "even", "well", "across",
}


def _count_in_text(text: str, keyword: str) -> int:
    pattern = re.compile(rf"\b{re.escape(keyword)}\b", re.IGNORECASE)
    return len(pattern.findall(text))


def _extract_role_keywords(job: JobDescription, jd_text: str, max_words: int = 8) -> list[str]:
    words = [
        w.rstrip(".,;:!?'\"").lower()
        for w in re.findall(r"[A-Za-z][A-Za-z+#.]{2,}", jd_text)
    ]
    freq = Counter(w for w in words if w not in STOPWORDS and len(w) > 2)
    known = {
        k.lower() for k in
        (job.required_skills + job.preferred_skills + [job.role])
    }
    known_terms = set()
    for k in known:
        known_terms.update(k.split())
    keywords = [
        w for w, _ in freq.most_common()
        if w not in known and w not in known_terms
    ]
    return keywords[:max_words]


def analyze_ats(
    job: JobDescription,
    resume: Resume,
    jd_text: str,
    resume_text: str,
) -> AtsReport:
    """Deterministic ATS keyword-density check (no LLM cost)."""

    keywords: list[tuple[str, str]] = []
    for skill in job.required_skills:
        keywords.append((skill, "required"))
    for skill in job.preferred_skills:
        keywords.append((skill, "preferred"))
    for word in _extract_role_keywords(job, jd_text):
        keywords.append((word, "role"))

    seen: set[tuple[str, str]] = set()
    hits: list[AtsKeyword] = []
    for keyword, category in keywords:
        if (keyword.lower(), category) in seen:
            continue
        seen.add((keyword.lower(), category))
        jd_count = _count_in_text(jd_text, keyword)
        resume_count = _count_in_text(resume_text, keyword)
        hits.append(AtsKeyword(
            keyword=keyword,
            category=category,
            jd_count=jd_count,
            resume_count=resume_count,
            matched=resume_count > 0,
        ))

    required = [h for h in hits if h.category == "required"]
    preferred = [h for h in hits if h.category == "preferred"]
    role = [h for h in hits if h.category == "role"]

    def coverage(items: list[AtsKeyword]) -> float:
        if not items:
            return 1.0
        return sum(1 for h in items if h.matched) / len(items)

    ats_score = round(
        (coverage(required) * 0.6 + coverage(preferred) * 0.3 + coverage(role) * 0.1) * 100
    )

    advice: list[str] = []
    for h in hits:
        if not h.matched and h.category == "required":
            advice.append(
                f"Add '{h.keyword}' to your resume — it is a required skill for this role."
            )
        elif not h.matched and h.category == "preferred":
            advice.append(
                f"Consider adding '{h.keyword}' — it is a preferred skill for this role."
            )
        elif h.matched and h.jd_count > h.resume_count * 3:
            advice.append(
                f"'{h.keyword}' is mentioned {h.resume_count}x in your resume but "
                f"{h.jd_count}x in the JD — use it more in your bullet points."
            )

    if not advice and ats_score >= 90:
        advice.append("Excellent ATS keyword coverage — no action needed.")

    return AtsReport(ats_score=ats_score, keywords=hits, advice=advice)
