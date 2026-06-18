from typing import List, Optional

from pydantic import BaseModel, Field

# --- Resume Structure ---


class PersonalInfo(BaseModel):
    name: str = Field(default="", description="Full name")
    email: str = Field(default="", description="Email address")
    phone: str = Field(default="", description="Phone number")
    location: str = Field(default="", description="City, State/Country")
    linkedin: Optional[str] = Field(default="", description="LinkedIn profile URL")
    github: Optional[str] = Field(default="", description="GitHub profile URL")
    website: Optional[str] = Field(
        default="", description="Personal website/portfolio URL"
    )


class WorkExperience(BaseModel):
    company: str = Field(default="", description="Company name")
    role: str = Field(default="", description="Job title/role")
    start_date: str = Field(
        default="", description="Start date (e.g., MM/YYYY or Month Year)"
    )
    end_date: str = Field(default="", description="End date or 'Present'")
    description: List[str] = Field(
        default_factory=list, description="Bullet points of achievements and duties"
    )


class Education(BaseModel):
    institution: str = Field(
        default="", description="School, College or University name"
    )
    degree: str = Field(default="", description="Degree type (e.g., BS, MS, PhD)")
    major: str = Field(default="", description="Field of study/Major")
    graduation_date: str = Field(
        default="", description="Graduation date or expected (e.g., MM/YYYY)"
    )
    gpa: Optional[str] = Field(default="", description="GPA (optional)")


class SkillCategory(BaseModel):
    category: str = Field(
        default="",
        description="Category name (e.g., Programming Languages, Frameworks, Tools)",
    )
    skills: List[str] = Field(
        default_factory=list, description="List of skills in this category"
    )


class Project(BaseModel):
    name: str = Field(default="", description="Project name")
    role: Optional[str] = Field(default="", description="User's role in the project")
    technologies: List[str] = Field(
        default_factory=list, description="Technologies/languages used"
    )
    description: List[str] = Field(
        default_factory=list,
        description="Bullet points describing the project and achievements",
    )
    link: Optional[str] = Field(
        default="", description="Project link (GitHub, Live URL, etc.)"
    )


class Certification(BaseModel):
    name: str = Field(default="", description="Certification name")
    issuer: str = Field(default="", description="Issuing organization")
    date: str = Field(default="", description="Date of issuance")


class Resume(BaseModel):
    personal_info: PersonalInfo = Field(default_factory=PersonalInfo)
    summary: str = Field(default="", description="Professional summary")
    experience: List[WorkExperience] = Field(default_factory=list)
    education: List[Education] = Field(default_factory=list)
    skills: List[SkillCategory] = Field(default_factory=list)
    projects: List[Project] = Field(default_factory=list)
    certifications: List[Certification] = Field(default_factory=list)


# --- ATS Analysis ---


class SectionScore(BaseModel):
    section: str
    score: int = Field(..., ge=0, le=100)
    feedback: List[str]
    critical_fixes: List[str]


class HighlightSuggestion(BaseModel):
    section: str = Field(
        ..., description="summary, experience, skills, projects, education"
    )
    item_index: int = Field(
        ...,
        description="Index of the item in the list (0-based). Set to 0 for summary.",
    )
    bullet_index: Optional[int] = Field(
        default=None,
        description="Index of the bullet point in the description list (0-based) if applicable.",
    )
    original_text: str = Field(
        ..., description="Exact segment of text in the resume that needs optimization."
    )
    suggested_text: str = Field(
        ..., description="The optimized/rephrased text suggested by the AI."
    )
    explanation: str = Field(
        ...,
        description="Why this change is recommended (e.g., 'missing hard keyword React', 'needs metric scale').",
    )


class KeywordMatch(BaseModel):
    keyword: str
    found: bool
    importance: str = Field(..., description="high, medium, low")
    context: Optional[str] = Field(
        default="", description="Where it was found or how to integrate it"
    )


class ATSScoreRequest(BaseModel):
    resume: Resume
    job_description: str = Field(default="", description="Target job posting text")


class ATSScoreResult(BaseModel):
    overall_score: int = Field(..., ge=0, le=100)
    formatting_score: int = Field(..., ge=0, le=100)
    keyword_score: int = Field(..., ge=0, le=100)
    experience_score: int = Field(..., ge=0, le=100)
    section_breakdown: List[SectionScore]
    keywords_analysis: List[KeywordMatch]
    highlights: List[HighlightSuggestion] = Field(
        default_factory=list,
        description="Targeted visual highlights on the resume canvas",
    )
    strengths: List[str]
    weaknesses: List[str]
    tailoring_suggestions: List[str] = Field(
        default_factory=list,
        description="Actionable bullet points to improve match with specific JD",
    )


# --- Jobs and Application Assistant ---


class JobDescription(BaseModel):
    title: str
    company: str
    location: str
    description: str
    url: Optional[str] = ""


class JobRecommendation(BaseModel):
    id: str
    title: str
    company: str
    location: str
    salary: Optional[str] = ""
    fit_score: int = Field(..., ge=0, le=100)
    match_reasons: List[str]
    skills_gap: List[str]
    description_summary: str
    raw_description: str


class CoverLetterRequest(BaseModel):
    resume: Resume
    job_title: str
    company_name: str
    job_description: str


class CoverLetterResponse(BaseModel):
    cover_letter: str
    customization_notes: List[str]


class InterviewPrepRequest(BaseModel):
    resume: Resume
    job_title: str
    company_name: str
    job_description: str


class QAPair(BaseModel):
    question: str
    sample_answer: str
    tips: str


class InterviewPrepResponse(BaseModel):
    common_questions: List[QAPair]
    behavioral_star_scenarios: List[str]


# --- Real Career Portal Crawler & Verification ---


class CrawlRequest(BaseModel):
    url: str
    html_content: Optional[str] = Field(
        default="", description="User-pasted text/HTML if captcha triggered"
    )


class CrawlResponse(BaseModel):
    status: str = Field(..., description="success, captcha_required, or error")
    url: str
    jobs: List[JobRecommendation] = Field(default_factory=list)
    message: Optional[str] = ""
