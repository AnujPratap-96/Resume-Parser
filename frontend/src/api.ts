export interface Experience {
  company: string | null
  role: string | null
  duration: string | null
  description: string | null
  highlights: string[]
  skills_used: string[]
}

export interface AnalysisResponse {
  // Cache handle returned by /api/analyze; pass it to /api/report so the PDF
  // is rendered from the cached result instead of re-running the LLM pipeline.
  analysis_id: string | null
  job: {
    role: string
    required_skills: string[]
    preferred_skills: string[]
    minimum_experience: number | null
    education_requirements: string[]
    responsibilities: string[]
  }
  resume: {
    name: string | null
    email: string | null
    phone: string | null
    github: string | null
    linkedin: string | null
    total_experience_years: number | null
    skills: string[]
    experiences: Experience[]
    education: string[]
    projects: string[]
    certifications: string[]
  }
  match: {
    candidate_name: string | null
    overall_score: number
    skills: {
      matched: string[]
      missing: string[]
      extra: string[]
    }
    experience: {
      required_years: number | null
      candidate_years: number | null
      met: boolean
    }
    education_match: string[]
    strengths: string[]
    weaknesses: string[]
    score_breakdown: {
      skills: number
      experience: number
      education: number
    }
    improvement_tips: Array<{
      area: string
      suggestion: string
      impact: string
    }>
    verdict: string
  }
  ats: {
    ats_score: number
    keywords: Array<{
      keyword: string
      category: string
      jd_count: number
      resume_count: number
      matched: boolean
    }>
    advice: string[]
  }
  semantic: {
    pairs: Array<{
      jd_skill: string
      matched_skill: string
      similarity: number
    }>
    uncovered_skills: string[]
  }
}

// The backend can spend up to ~2 min on a cold analysis, so allow for that
// but never hang forever — an aborted fetch is better than a spinner that
// never stops.
const REQUEST_TIMEOUT_MS = 150_000

async function readError(res: Response): Promise<string> {
  const text = await res.text().catch(() => '')
  try {
    const body = JSON.parse(text)
    if (typeof body?.detail === 'string') return body.detail
  } catch {
    // not JSON — fall through to the raw text
  }
  return text || `HTTP ${res.status}`
}

async function postForm(path: string, form: FormData): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    const base = import.meta.env.VITE_API_URL || ''
    const res = await fetch(`${base}${path}`, {
      method: 'POST',
      body: form,
      signal: controller.signal,
    })
    if (!res.ok) throw new Error(await readError(res))
    return res
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') {
      throw new Error('Request timed out — the server took too long to respond.')
    }
    throw e
  } finally {
    clearTimeout(timer)
  }
}

export async function analyzeResume(
  jobDescription: string,
  file: File
): Promise<AnalysisResponse> {
  const form = new FormData()
  form.append('job_description', jobDescription)
  form.append('resume', file)

  const res = await postForm('/api/analyze', form)
  return res.json()
}

export async function downloadReport(
  analysisId: string | null,
  jobDescription: string,
  file: File | null
): Promise<Blob> {
  if (analysisId) {
    const form = new FormData()
    form.append('analysis_id', analysisId)
    try {
      const res = await postForm('/api/report', form)
      return res.blob()
    } catch (e) {
      // Cached analysis expired (404). Fall back to re-uploading if we still
      // have the file; otherwise surface the error.
      if (!file) throw e
    }
  }

  if (!file) {
    throw new Error('Run an analysis first to download a report.')
  }

  const form = new FormData()
  form.append('job_description', jobDescription)
  form.append('resume', file)
  const res = await postForm('/api/report', form)
  return res.blob()
}
