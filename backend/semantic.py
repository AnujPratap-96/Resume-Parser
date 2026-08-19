import threading

from models import JobDescription, Resume, SemanticReport, SemanticMatchItem

_lock = threading.Lock()
_fuzz = None

SHORT_SKILL_LEN = 2

MATCH_THRESHOLD = 80.0


def _load_fuzz():
    global _fuzz
    if _fuzz is not None:
        return _fuzz
    with _lock:
        if _fuzz is None:
            try:
                from rapidfuzz import fuzz as _f
                _fuzz = _f
            except ImportError:
                _fuzz = False
    return _fuzz

SYNONYMS = {
    "ml": "machine learning",
    "ai": "artificial intelligence",
    "gcp": "google cloud platform",
    "aws": "amazon web services",
    "databases": "database",
    "k8s": "kubernetes",
    "rest apis": "rest api",
    "restful api": "rest api",
    "restful apis": "rest api",
    "apis": "api",
    "javascript": "js",
    "typescript": "ts",
    "nodejs": "node.js",
    "node": "node.js",
    "react.js": "react",
    "reactjs": "react",
    "vue.js": "vue",
    "vuejs": "vue",
    "angular.js": "angular",
    "angularjs": "angular",
    "git/github": "git",
    "golang": "go",
    "postgres": "postgresql",
    "express.js": "express",
    "expressjs": "express",
    "next.js": "next",
    "nextjs": "next",
    "tailwind css": "tailwind",
    "tailwindcss": "tailwind",
    "material ui": "material-ui",
    "html5": "html",
    "css3": "css",
}


def normalize_skill(skill: str) -> str:
    s = skill.strip().lower().replace("_", " ")
    return SYNONYMS.get(s, s)


def _similarity(a: str, b: str, fuzz) -> float:
    if a == b:
        return 100.0
    if not a or not b:
        return 0.0
    if len(a) <= SHORT_SKILL_LEN or len(b) <= SHORT_SKILL_LEN:
        return 0.0  # already known unequal, and too short to fuzzy-match safely
    if fuzz:  # fuzzy token match catches reordering + punctuation
        return max(
            fuzz.ratio(a, b),
            fuzz.token_sort_ratio(a, b),
            fuzz.token_set_ratio(a, b),
        )
    # stdlib fallback when rapidfuzz is not installed
    import difflib

    sa, sb = set(a.split()), set(b.split())
    if not sa or not sb:
        return 0.0
    jaccard = len(sa & sb) / len(sa | sb)
    return max(jaccard * 100, difflib.SequenceMatcher(None, a, b).ratio() * 100)


def semantic_match(job: JobDescription, resume: Resume) -> SemanticReport:
    """Match JD skills against resume skills using fuzzy string similarity.

    Deterministic (no LLM cost) — catches synonyms, rewordings and typos
    the strict LLM comparison may miss.
    """
    fuzz = _load_fuzz()
    jd_skills = job.required_skills + job.preferred_skills
    resume_skills = [s for s in resume.skills if s and s.strip()]

    pairs: list[SemanticMatchItem] = []
    matched_jd: set[str] = set()
    seen_pairs: set[tuple[str, str]] = set()

    for jd_skill in jd_skills:
        best: tuple[float, str] = (0.0, "")
        for res_skill in resume_skills:
            if (jd_skill.lower(), res_skill.lower()) in seen_pairs:
                continue
            score = _similarity(normalize_skill(jd_skill), normalize_skill(res_skill), fuzz)
            if score > best[0]:
                best = (score, res_skill)
        if best[0] >= MATCH_THRESHOLD and best[1]:
            seen_pairs.add((jd_skill.lower(), best[1].lower()))
            pairs.append(SemanticMatchItem(
                jd_skill=jd_skill,
                matched_skill=best[1],
                similarity=round(best[0], 1),
            ))
            matched_jd.add(jd_skill.lower())

    uncovered = [
        s for s in jd_skills
        if s.lower() not in matched_jd
    ]

    return SemanticReport(pairs=pairs, uncovered_skills=uncovered)
