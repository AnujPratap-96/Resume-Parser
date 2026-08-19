import asyncio
import logging
import os
import tempfile
import traceback
import uuid
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Request
from fastapi.concurrency import run_in_threadpool
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response

from cache import TTLCache, SlidingWindowLimiter, make_cache_key
from models import AnalysisResponse
from parser import ConfigError, ResumeReadError, analyze_full, has_api_key
from report import build_report_pdf

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# ── Configuration ─────────────────────────────────────────────

ALLOWED_EXTENSIONS = {".pdf", ".docx"}

# Magic bytes, so a renamed file cannot pose as a resume.
FILE_SIGNATURES = {".pdf": b"%PDF", ".docx": b"PK\x03\x04"}

MAX_FILE_BYTES = int(os.getenv("MAX_FILE_MB", "5")) * 1024 * 1024
MAX_JD_CHARS = int(os.getenv("MAX_JD_CHARS", "10000"))
# Whole-request ceiling, checked before the body is parsed.
MAX_REQUEST_BYTES = MAX_FILE_BYTES + MAX_JD_CHARS * 4 + 64 * 1024

# Hard deadline for one analysis (3 LLM calls, each with its own retries).
ANALYSIS_TIMEOUT = float(os.getenv("ANALYSIS_TIMEOUT", "120"))

# Behind Railway/Vercel/any proxy, request.client.host is the PROXY's IP, so
# every user shares one rate-limit bucket. Read the forwarded header instead.
# Only safe when a proxy in front of us overwrites it — set TRUST_PROXY=false
# when the app is exposed directly, or clients can spoof their identity.
TRUST_PROXY = os.getenv("TRUST_PROXY", "true").lower() not in {"0", "false", "no"}

_origins_env = os.getenv("ALLOWED_ORIGINS", "").strip()
ALLOWED_ORIGINS = (
    [o.strip() for o in _origins_env.split(",") if o.strip()]
    or ["http://localhost:5173", "http://127.0.0.1:5173"]
)

analysis_cache = TTLCache(maxsize=50, ttl_seconds=3600)

# Charged only for work that actually calls the LLM.
analysis_limiter = SlidingWindowLimiter(
    max_requests=int(os.getenv("RATE_LIMIT_MAX", "10")),
    window_seconds=60,
)
# Cheap guard against raw flooding of every endpoint.
request_limiter = SlidingWindowLimiter(
    max_requests=int(os.getenv("RATE_LIMIT_BURST", "60")),
    window_seconds=60,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    if not has_api_key():
        logger.critical(
            "GROQ_API_KEY is not set — /api/analyze will return 503 until it is."
        )
    logger.info("CORS allowed origins: %s", ALLOWED_ORIGINS)
    logger.info("Trusting proxy headers for client IP: %s", TRUST_PROXY)
    yield


app = FastAPI(title="Resume Matcher API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


@app.middleware("http")
async def limit_request_size(request: Request, call_next):
    """Reject oversized uploads before the body is buffered."""
    length = request.headers.get("content-length")
    if length and length.isdigit() and int(length) > MAX_REQUEST_BYTES:
        return JSONResponse(
            status_code=413,
            content={
                "detail": f"Request too large (max {MAX_FILE_BYTES // (1024 * 1024)} MB resume)"
            },
        )
    return await call_next(request)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Log the detail, return a reference — never the raw exception text.

    str(exc) can carry temp paths, upstream API messages and other internals.
    """
    ref = uuid.uuid4().hex[:8]
    logger.error(
        "[%s] Unhandled error on %s: %s\n%s",
        ref, request.url.path, exc, traceback.format_exc(),
    )
    return JSONResponse(
        status_code=500,
        content={"detail": f"Internal server error (ref {ref}). Please try again."},
    )


@app.get("/")
def root():
    return {"app": "Resume Matcher API", "status": "running"}


@app.get("/api/health")
def health():
    return {"status": "ok", "llm_configured": has_api_key()}


# ── Request helpers ───────────────────────────────────────────

def _client_id(request: Request) -> str:
    if TRUST_PROXY:
        forwarded = request.headers.get("x-forwarded-for", "")
        if forwarded:
            return forwarded.split(",")[0].strip()
        real_ip = request.headers.get("x-real-ip", "").strip()
        if real_ip:
            return real_ip
    return request.client.host if request.client else "unknown"


def _enforce(limiter: SlidingWindowLimiter, request: Request, message: str) -> None:
    if not limiter.allow(_client_id(request)):
        raise HTTPException(
            status_code=429, detail=message, headers={"Retry-After": "60"}
        )


def _validate_jd(job_description: str) -> str:
    jd = (job_description or "").strip()
    if not jd:
        raise HTTPException(status_code=422, detail="Job description is empty")
    if len(jd) > MAX_JD_CHARS:
        raise HTTPException(
            status_code=422,
            detail=f"Job description too long (max {MAX_JD_CHARS} characters)",
        )
    return jd


async def _read_upload(resume: UploadFile) -> tuple[str, bytes]:
    ext = Path(resume.filename or "").suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{ext}'. Allowed: {', '.join(sorted(ALLOWED_EXTENSIONS))}",
        )

    # Read in chunks so an oversized file never gets fully buffered.
    chunks: list[bytes] = []
    total = 0
    while chunk := await resume.read(64 * 1024):
        total += len(chunk)
        if total > MAX_FILE_BYTES:
            raise HTTPException(
                status_code=413,
                detail=f"File too large (max {MAX_FILE_BYTES // (1024 * 1024)} MB)",
            )
        chunks.append(chunk)
    content = b"".join(chunks)

    if not content:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")
    if not content.startswith(FILE_SIGNATURES[ext]):
        raise HTTPException(
            status_code=400,
            detail=f"File is not a valid {ext.lstrip('.').upper()} — check the extension.",
        )
    return ext, content


def _run_analysis(jd_text: str, ext: str, content: bytes) -> AnalysisResponse:
    with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as tmp:
        tmp.write(content)
        tmp_path = tmp.name

    try:
        return analyze_full(jd_text=jd_text, resume_path=tmp_path)
    finally:
        Path(tmp_path).unlink(missing_ok=True)


async def _analyze_cached(
    request: Request, jd_text: str, ext: str, content: bytes
) -> AnalysisResponse:
    cache_key = make_cache_key(jd_text, content)
    cached = analysis_cache.get(cache_key)
    if cached is not None:
        return cached

    # Only a cache miss costs LLM calls, so only a miss spends the budget.
    _enforce(
        analysis_limiter,
        request,
        "Rate limit exceeded — too many analyses per minute. Try again shortly.",
    )

    try:
        # run_in_threadpool keeps the 3 blocking Groq calls off the event loop;
        # without it a single analysis stalls every other request.
        result = await asyncio.wait_for(
            run_in_threadpool(_run_analysis, jd_text, ext, content),
            timeout=ANALYSIS_TIMEOUT,
        )
    except asyncio.TimeoutError:
        raise HTTPException(
            status_code=504,
            detail="Analysis timed out. Try a shorter job description or a smaller resume.",
        )
    except ConfigError as exc:
        logger.error("Configuration error: %s", exc)
        raise HTTPException(
            status_code=503,
            detail="Analysis is not configured on the server yet. Try again later.",
        )
    except ResumeReadError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        ref = uuid.uuid4().hex[:8]
        logger.error("[%s] Analysis failed: %s\n%s", ref, exc, traceback.format_exc())
        raise HTTPException(
            status_code=502,
            detail=f"Analysis failed (ref {ref}). Please try again.",
        )

    result.analysis_id = cache_key
    analysis_cache.set(cache_key, result)
    return result


# ── Endpoints ─────────────────────────────────────────────────

@app.post("/api/analyze", response_model=AnalysisResponse)
async def analyze_endpoint(
    request: Request,
    job_description: str = Form(...),
    resume: UploadFile = File(...),
):
    _enforce(request_limiter, request, "Too many requests — slow down.")
    jd_text = _validate_jd(job_description)
    ext, content = await _read_upload(resume)
    return await _analyze_cached(request, jd_text, ext, content)


@app.post("/api/report")
async def report_endpoint(
    request: Request,
    analysis_id: Optional[str] = Form(None),
    job_description: Optional[str] = Form(None),
    resume: Optional[UploadFile] = File(None),
):
    """Build the PDF.

    Prefer analysis_id: it reuses the cached analysis instead of paying for a
    second 3-call LLM run just to render the same numbers.
    """
    _enforce(request_limiter, request, "Too many requests — slow down.")

    if analysis_id:
        result = analysis_cache.get(analysis_id)
        if result is None:
            raise HTTPException(
                status_code=404,
                detail="That analysis has expired — run the analysis again.",
            )
    elif job_description is not None and resume is not None:
        jd_text = _validate_jd(job_description)
        ext, content = await _read_upload(resume)
        result = await _analyze_cached(request, jd_text, ext, content)
    else:
        raise HTTPException(
            status_code=422,
            detail="Provide analysis_id, or job_description together with resume.",
        )

    pdf_bytes = await run_in_threadpool(build_report_pdf, result)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": 'attachment; filename="resume-match-report.pdf"'
        },
    )


if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)
