from pydantic import BaseModel, Field
from typing import Optional


class Experience(BaseModel):
    company: Optional[str] = None
    role: Optional[str] = None
    duration: Optional[str] = None
    description: Optional[str] = None
    skills_used: list[str] = []


class Resume(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    total_experience_years: Optional[float] = None
    skills: list[str] = []
    experiences: list[Experience] = []
    education: list[str] = []
    projects: list[str] = []
    certifications: list[str] = []


class JobDescription(BaseModel):
    role: str
    required_skills: list[str]
    preferred_skills: list[str]
    minimum_experience: Optional[float] = None
    education_requirements: list[str]
    responsibilities: list[str]


class SkillMatch(BaseModel):
    matched: list[str]
    missing: list[str]
    extra: list[str]


class ExperienceCheck(BaseModel):
    required_years: Optional[float] = None
    candidate_years: Optional[float] = None
    met: bool


class MatchResult(BaseModel):
    candidate_name: Optional[str] = None
    overall_score: float = Field(ge=0, le=100)
    skills: SkillMatch
    experience: ExperienceCheck
    education_match: list[str]
    strengths: list[str]
    weaknesses: list[str]
    verdict: str


class AnalysisResponse(BaseModel):
    job: JobDescription
    resume: Resume
    match: MatchResult
