export interface Experience {
  company: string | null
  role: string | null
  duration: string | null
  description: string | null
  highlights: string[]
  skills_used: string[]
}

export interface AnalysisResponse {
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

export async function analyzeResume(
  jobDescription: string,
  file: File
): Promise<AnalysisResponse> {
  const form = new FormData()
  form.append('job_description', jobDescription)
  form.append('resume', file)

  const base = import.meta.env.VITE_API_URL || ''
  const res = await fetch(`${base}/api/analyze`, { method: 'POST', body: form })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(err || `HTTP ${res.status}`)
  }
  return res.json()
}

export async function downloadReport(
  jobDescription: string,
  file: File
): Promise<Blob> {
  const form = new FormData()
  form.append('job_description', jobDescription)
  form.append('resume', file)

  const base = import.meta.env.VITE_API_URL || ''
  const res = await fetch(`${base}/api/report`, { method: 'POST', body: form })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(err || `HTTP ${res.status}`)
  }
  return res.blob()
}
