import logging
import os
import tempfile
import traceback
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response

from cache import TTLCache, SlidingWindowLimiter, make_cache_key
from models import AnalysisResponse
from parser import analyze_full
from report import build_report_pdf

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

analysis_cache = TTLCache(maxsize=50, ttl_seconds=3600)
rate_limiter = SlidingWindowLimiter(
    max_requests=int(os.getenv("RATE_LIMIT_MAX", "10")),
    window_seconds=60,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield


app = FastAPI(title="Resume Matcher API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {"app": "Resume Matcher API", "status": "running"}


@app.get("/api/health")
def health():
    return {"status": "ok"}


ALLOWED_EXTENSIONS = {".pdf", ".docx"}
MAX_FILE_BYTES = 5 * 1024 * 1024  # 5 MB


@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    logger.error(f"Unhandled error: {exc}\n{traceback.format_exc()}")
    return JSONResponse(
        status_code=500,
        content={"detail": f"Internal server error: {str(exc)}"},
    )


def _check_rate_limit(request: Request):
    client = request.client.host if request.client else "unknown"
    if not rate_limiter.allow(client):
        raise HTTPException(
            status_code=429,
            detail="Rate limit exceeded — max 10 requests per minute. Try again shortly.",
        )


async def _read_upload(resume: UploadFile) -> tuple[str, bytes]:
    ext = Path(resume.filename or "").suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{ext}'. Allowed: {', '.join(ALLOWED_EXTENSIONS)}",
        )
    content = await resume.read()
    if len(content) > MAX_FILE_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"File too large (max {MAX_FILE_BYTES // (1024 * 1024)} MB)",
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


@app.post("/api/analyze", response_model=AnalysisResponse)
async def analyze_endpoint(
    request: Request,
    job_description: str = Form(...),
    resume: UploadFile = File(...),
):
    _check_rate_limit(request)

    ext, content = await _read_upload(resume)
    cache_key = make_cache_key(job_description, content)

    cached = analysis_cache.get(cache_key)
    if cached is not None:
        return cached

    try:
        result = _run_analysis(job_description, ext, content)
    except Exception as e:
        logger.error(f"Analysis failed: {e}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

    analysis_cache.set(cache_key, result)
    return result


@app.post("/api/report")
async def report_endpoint(
    request: Request,
    job_description: str = Form(...),
    resume: UploadFile = File(...),
):
    _check_rate_limit(request)

    ext, content = await _read_upload(resume)
    cache_key = make_cache_key(job_description, content)

    cached = analysis_cache.get(cache_key)
    if cached is not None:
        result = cached
    else:
        try:
            result = _run_analysis(job_description, ext, content)
        except Exception as e:
            logger.error(f"Analysis failed: {e}\n{traceback.format_exc()}")
            raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")
        analysis_cache.set(cache_key, result)

    pdf_bytes = build_report_pdf(result)
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
