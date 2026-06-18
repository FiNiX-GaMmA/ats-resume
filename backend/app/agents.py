import json
import re
from typing import Any, Dict, List, Optional, TypedDict

import httpx
from app.schemas import (
    ATSScoreResult,
    Certification,
    CoverLetterResponse,
    Education,
    HighlightSuggestion,
    InterviewPrepResponse,
    JobRecommendation,
    KeywordMatch,
    PersonalInfo,
    Project,
    QAPair,
    Resume,
    SectionScore,
    SkillCategory,
    WorkExperience,
)
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI
from langgraph.graph import END, StateGraph

try:
    from langchain_anthropic import ChatAnthropic
except ImportError:  # Optional dependency for Anthropic-native routing.
    ChatAnthropic = None

# --- Standard Database of Jobs for Recommendation ---
MOCK_JOBS_DB = [
    {
        "id": "job_1",
        "title": "Software Engineer (Full Stack)",
        "company": "TechInnovate Solutions",
        "location": "San Francisco, CA (Hybrid)",
        "salary": "$120,000 - $160,000",
        "raw_description": """We are seeking a talented Full Stack Software Engineer to join our growing product team. In this role, you will help design, build, and deploy robust web applications using React, TypeScript, Node.js, and Python FastAPI.
Requirements:
- 3+ years of professional software engineering experience.
- Strong proficiency in modern JavaScript/TypeScript and frameworks like React.
- Solid experience with backend services in Node.js (Express) or Python (FastAPI/Django).
- Experience with relational databases (PostgreSQL, MySQL) and Docker containerization.
- Familiarity with CI/CD pipelines (GitHub Actions, GitLab) and AWS cloud services.
- Experience with AI API integrations (OpenAI, Anthropic) is a strong plus!""",
    },
    {
        "id": "job_2",
        "title": "Data Scientist / Machine Learning Engineer",
        "company": "DataVibe Analytics",
        "location": "New York, NY (Remote)",
        "salary": "$140,000 - $180,000",
        "raw_description": """Join our AI Core team as a Data Scientist / Machine Learning Engineer. You will build and scale AI models, integrate LLMs into our pipeline, and create predictive analysis systems to optimize customer acquisition.
Requirements:
- Master's or PhD in Computer Science, Statistics, or related technical field (or equivalent practical experience).
- 2+ years of professional experience building ML models in production.
- Expertise in Python, PyTorch, TensorFlow, scikit-learn, and pandas.
- Deep understanding of NLP, transformers, and LLM fine-tuning/prompt engineering.
- Experience writing SQL queries and managing large datasets in Snowflake, BigQuery, or Redshift.
- Strong communication skills to present analytical findings to executive stakeholders.""",
    },
    {
        "id": "job_3",
        "title": "Product Manager (AI Products)",
        "company": "Cognitive Scale",
        "location": "Austin, TX (On-site)",
        "salary": "$130,000 - $170,000",
        "raw_description": """We are looking for an AI-focused Product Manager to lead the roadmap for our next-generation automated workflow tools. You will work closely with Engineering, Design, and Marketing to turn complex generative AI features into simple, delightful user experiences.
Requirements:
- 4+ years of product management experience, preferably in B2B SaaS or AI technologies.
- Proven track record of launching user-facing software products from concept to scale.
- Technical understanding of Generative AI, prompt engineering, agentic workflows, and LLMs.
- Experience with customer discovery, user research, and wireframing tools (Figma).
- Strong analytical skills; ability to define, track, and optimize success metrics (KPIs).""",
    },
    {
        "id": "job_4",
        "title": "Frontend Developer",
        "company": "PixelPerfect UI",
        "location": "Los Angeles, CA (Hybrid)",
        "salary": "$95,000 - $130,000",
        "raw_description": """PixelPerfect is on a mission to build the world's most elegant collaboration canvases. We are hiring a Senior Frontend Developer who is passionate about CSS, animation, TypeScript, React, and creating fluid interfaces.
Requirements:
- 4+ years of experience specialized in Frontend development.
- Expert-level TypeScript and React (including state management, custom hooks, and context).
- Deep experience with Tailwind CSS, Framer Motion, and CSS Grid/Flexbox layouts.
- Experience with Vite, Webpack, and modern frontend optimization techniques.
- Solid understanding of Web Accessibility (WCAG), semantic HTML, and SEO.
- Excellent eye for design and detail-oriented implementation.""",
    },
    {
        "id": "job_5",
        "title": "DevOps & Cloud Engineer",
        "company": "CloudShield Networks",
        "location": "Seattle, WA (Remote)",
        "salary": "$130,000 - $165,000",
        "raw_description": """We are looking for a Cloud Infrastructure Engineer to manage and secure our high-availability cloud platforms. You will design infrastructure as code, establish robust monitoring/alerting systems, and manage security compliance.
Requirements:
- 3+ years of experience as a DevOps, Cloud, or Site Reliability Engineer (SRE).
- Extensive hands-on experience with AWS, Azure, or GCP.
- Expert knowledge of Infrastructure as Code (IaC) using Terraform or Pulumi.
- Proficient in Docker containerization and Kubernetes orchestration.
- Solid experience setting up CI/CD pipelines (GitHub Actions, Jenkins, CircleCI).
- Deep understanding of networking protocols, firewalls, and SSL/TLS security.""",
    },
    {
        "id": "job_6",
        "title": "Business Analyst / Project Manager",
        "company": "Apex Corp",
        "location": "Chicago, IL (Hybrid)",
        "salary": "$85,000 - $110,000",
        "raw_description": """Apex Corp is looking for a versatile Business Analyst who can bridge the gap between our business stakeholders and development team. You will gather requirements, translate them into agile user stories, and track progress across sprints.
Requirements:
- Bachelor's degree in Business Administration, Information Systems, or related field.
- 2+ years of experience in business analysis, systems analysis, or project management.
- Strong proficiency in Jira, Confluence, and Agile/Scrum methodologies.
- Excellent requirements gathering, documentation, and flowcharting skills.
- Basic understanding of SQL for data extraction and Excel for reporting.
- Exceptional communication, organization, and presentation skills.""",
    },
]


# --- Helper to parse LLM JSON responses ---
def clean_json_response(text: str) -> str:
    text = text.strip()
    match = re.search(r"```(?:json)?\s*(.*?)\s*```", text, re.DOTALL)
    if match:
        text = match.group(1)
    text = re.sub(r"^\s*//.*$", "", text, flags=re.MULTILINE)
    return text.strip()


# --- Dynamic LangChain Model Instantiator ---
def normalize_model_name(provider: str, model: str) -> str:
    provider = provider.lower()
    model = (model or "").replace("models/", "").strip()

    if provider == "gemini":
        legacy_or_missing = (
            not model
            or model.startswith("gemini-1.")
            or model in {"gemini-pro", "gemini-pro-vision"}
        )
        if legacy_or_missing:
            return "gemini-2.0-flash"
    return model


def get_langchain_model(
    provider: str, api_key: str, model: str, base_url: Optional[str] = None
):
    provider = provider.lower()
    model = normalize_model_name(provider, model)

    if provider == "openai":
        return ChatOpenAI(
            openai_api_key=api_key,
            model_name=model or "gpt-4o-mini",
            temperature=0.2,
        )

    if provider == "gemini":
        # Gemini supports an OpenAI-compatible Chat Completions endpoint.
        # Without this explicit base URL, Gemini API keys are incorrectly sent to OpenAI.
        return ChatOpenAI(
            openai_api_key=api_key,
            model_name=model,
            openai_api_base=(
                base_url or "https://generativelanguage.googleapis.com/v1beta/openai/"
            ),
            temperature=0.2,
        )

    if provider == "anthropic":
        if ChatAnthropic is None:
            raise ValueError(
                "Anthropic support requires the optional 'langchain-anthropic' package. "
                "Install backend requirements again or choose Gemini/OpenAI/OpenRouter."
            )
        return ChatAnthropic(
            anthropic_api_key=api_key,
            model_name=model or "claude-3-5-haiku-20241022",
            temperature=0.2,
        )

    if provider == "openrouter":
        return ChatOpenAI(
            openai_api_key=api_key,
            model_name=model or "meta-llama/llama-3-8b-instruct:free",
            openai_api_base=base_url or "https://openrouter.ai/api/v1",
            temperature=0.2,
        )

    if provider == "ollama":
        return ChatOpenAI(
            openai_api_key="none",
            model_name=model or "llama3",
            openai_api_base=f"{base_url or 'http://localhost:11434'}/v1",
            temperature=0.2,
        )

    raise ValueError(f"Unsupported AI provider: {provider}")


# ====================================================
# LANGGRAPH ATS OPTIMIZER STATE MACHINE
# ====================================================


class ATSGraphState(TypedDict):
    resume_json: dict
    job_description: str
    overall_score: int
    formatting_score: int
    keyword_score: int
    experience_score: int
    section_breakdown: List[Dict[str, Any]]
    keywords_analysis: List[Dict[str, Any]]
    highlights: List[Dict[str, Any]]
    strengths: List[str]
    weaknesses: List[str]
    tailoring_suggestions: List[str]
    # LLM Connection
    provider: str
    api_key: str
    model: str
    base_url: Optional[str]


# Node 1: Audit node
async def audit_resume_node(state: ATSGraphState) -> Dict[str, Any]:
    llm = get_langchain_model(
        state["provider"], state["api_key"], state["model"], state["base_url"]
    )

    system_prompt = """You are Node 1 of an ATS Optimization Graph. Your task is to audit the provided Resume against a target Job Description.
Evaluate the following:
1. overall_score (0-100)
2. formatting_score (0-100)
3. keyword_score (0-100)
4. experience_score (0-100)
5. section_breakdown: List containing dicts with "section", "score", "feedback" (list of strings), and "critical_fixes" (list of strings) for Experience, Skills, summary, Projects, Education.
6. keywords_analysis: Identify 5-7 core keywords from the job description. For each keyword, return: "keyword", "found" (boolean), "importance" (high, medium, low), "context" (where it is found or where to insert it).

Your output MUST be a valid JSON matching this structure:
{
  "overall_score": 75,
  "formatting_score": 90,
  "keyword_score": 65,
  "experience_score": 70,
  "section_breakdown": [
    {
      "section": "Experience",
      "score": 70,
      "feedback": ["Strong experience, but lacks metrics."],
      "critical_fixes": ["Add business metrics to InnoTech role."]
    }
  ],
  "keywords_analysis": [
    {
      "keyword": "TypeScript",
      "found": true,
      "importance": "high",
      "context": "Found in skills."
    }
  ]
}
Respond ONLY with the raw JSON. Do not include markdown code blocks or explanations."""

    prompt = f"JOB DESCRIPTION:\n{state['job_description'] or 'General technology/business guidelines.'}\n\nRESUME:\n{json.dumps(state['resume_json'], indent=2)}"

    messages = [SystemMessage(content=system_prompt), HumanMessage(content=prompt)]
    res = await llm.ainvoke(messages)
    cleaned = clean_json_response(res.content)
    try:
        data = json.loads(cleaned)
        return {
            "overall_score": data.get("overall_score", 50),
            "formatting_score": data.get("formatting_score", 50),
            "keyword_score": data.get("keyword_score", 50),
            "experience_score": data.get("experience_score", 50),
            "section_breakdown": data.get("section_breakdown", []),
            "keywords_analysis": data.get("keywords_analysis", []),
        }
    except Exception as e:
        print(f"Error parsing Node 1: {str(e)}")
        # Return fallback values
        return {
            "overall_score": 60,
            "formatting_score": 80,
            "keyword_score": 50,
            "experience_score": 55,
            "section_breakdown": [],
            "keywords_analysis": [],
        }


# Node 2: Highlight node
async def generate_highlights_node(state: ATSGraphState) -> Dict[str, Any]:
    llm = get_langchain_model(
        state["provider"], state["api_key"], state["model"], state["base_url"]
    )

    system_prompt = """You are Node 2 of an ATS Optimization Graph. Your goal is to identify specific parts of the resume that need visual highlights and replacement in the UI.
Identify 3-5 specific segments in the resume (such as the summary, or specific bullet points within work experiences or projects) that need direct improvement.

For each suggestion, you MUST specify:
1. "section": This must correspond to the exact key in the resume structure: "summary", "experience", "projects", "skills", "education".
2. "item_index": Index of the item (e.g. experience list index, 0-based). For summary, set to 0.
3. "bullet_index": Index of the bullet point inside the description/bullet list (0-based) if applicable (otherwise null).
4. "original_text": The exact text currently present in the resume.
5. "suggested_text": The optimized/rephrased text with the changes applied (incorporating missing keywords or metrics).
6. "explanation": Why this change is recommended.

Your output MUST be a valid JSON matching this structure:
{
  "highlights": [
    {
      "section": "experience",
      "item_index": 0,
      "bullet_index": 1,
      "original_text": "Refactored frontend application using React.",
      "suggested_text": "Refactored the core responsive frontend using React and TypeScript, increasing search page load velocity by 40%.",
      "explanation": "Lacks business metric impact and TypeScript keyword requested in job description."
    }
  ]
}
Respond ONLY with the raw JSON. Do not include markdown code blocks."""

    prompt = f"JOB DESCRIPTION:\n{state['job_description']}\n\nRESUME:\n{json.dumps(state['resume_json'], indent=2)}\n\nAUDIT DATA:\nKeywords checklist: {json.dumps(state['keywords_analysis'])}"

    messages = [SystemMessage(content=system_prompt), HumanMessage(content=prompt)]
    res = await llm.ainvoke(messages)
    cleaned = clean_json_response(res.content)
    try:
        data = json.loads(cleaned)
        return {"highlights": data.get("highlights", [])}
    except Exception as e:
        print(f"Error parsing Node 2: {str(e)}")
        return {"highlights": []}


# Node 3: Tailoring Node
async def finalize_tailoring_node(state: ATSGraphState) -> Dict[str, Any]:
    llm = get_langchain_model(
        state["provider"], state["api_key"], state["model"], state["base_url"]
    )

    system_prompt = """You are Node 3 of an ATS Optimization Graph. Compile the final strengths, weaknesses, and global bullet rephrasing suggestions for the user based on the audit and highlights.

Your output MUST be a valid JSON matching this structure:
{
  "strengths": ["Clear section headings", "Excellent skills list"],
  "weaknesses": ["Lacks cloud keywords", "Projects don't show team scale"],
  "tailoring_suggestions": [
    "Integrate 'Docker' keyword directly in AppForge projects.",
    "Rewrite Berkeley CS experience to mention 'Python data systems'."
  ]
}
Respond ONLY with the raw JSON. Do not include markdown code blocks."""

    prompt = f"RESUME:\n{json.dumps(state['resume_json'])}\n\nHIGHLIGHTS GENERATED:\n{json.dumps(state['highlights'])}"

    messages = [SystemMessage(content=system_prompt), HumanMessage(content=prompt)]
    res = await llm.ainvoke(messages)
    cleaned = clean_json_response(res.content)
    try:
        data = json.loads(cleaned)
        return {
            "strengths": data.get("strengths", []),
            "weaknesses": data.get("weaknesses", []),
            "tailoring_suggestions": data.get("tailoring_suggestions", []),
        }
    except Exception as e:
        print(f"Error parsing Node 3: {str(e)}")
        return {
            "strengths": ["Matches role requirements"],
            "weaknesses": ["Needs optimization"],
            "tailoring_suggestions": ["Re-check builder bullets"],
        }


# Assemble State Graph
workflow = StateGraph(ATSGraphState)
workflow.add_node("audit", audit_resume_node)
workflow.add_node("generate_highlights", generate_highlights_node)
workflow.add_node("tailor", finalize_tailoring_node)

workflow.set_entry_point("audit")
workflow.add_edge("audit", "generate_highlights")
workflow.add_edge("generate_highlights", "tailor")
workflow.add_edge("tailor", END)

ats_langgraph_app = workflow.compile()


# --- Main Scorer Agent Entry using LangGraph ---
async def analyze_ats_score_agent(
    resume: Resume,
    job_description: str,
    provider: str,
    api_key: str,
    model: str,
    base_url: Optional[str] = None,
) -> ATSScoreResult:
    # Prepare initial state
    initial_state = {
        "resume_json": resume.model_dump(),
        "job_description": job_description or "General tech guidelines.",
        "provider": provider,
        "api_key": api_key,
        "model": model,
        "base_url": base_url,
        "overall_score": 0,
        "formatting_score": 0,
        "keyword_score": 0,
        "experience_score": 0,
        "section_breakdown": [],
        "keywords_analysis": [],
        "highlights": [],
        "strengths": [],
        "weaknesses": [],
        "tailoring_suggestions": [],
    }

    try:
        final_state = await ats_langgraph_app.ainvoke(initial_state)

        # Convert back into standard schemas
        section_breakdown = [
            SectionScore(**item) for item in final_state.get("section_breakdown", [])
        ]
        keywords_analysis = [
            KeywordMatch(**item) for item in final_state.get("keywords_analysis", [])
        ]
        highlights = [
            HighlightSuggestion(**item) for item in final_state.get("highlights", [])
        ]

        return ATSScoreResult(
            overall_score=final_state.get("overall_score", 60),
            formatting_score=final_state.get("formatting_score", 60),
            keyword_score=final_state.get("keyword_score", 60),
            experience_score=final_state.get("experience_score", 60),
            section_breakdown=section_breakdown,
            keywords_analysis=keywords_analysis,
            highlights=highlights,
            strengths=final_state.get("strengths", []),
            weaknesses=final_state.get("weaknesses", []),
            tailoring_suggestions=final_state.get("tailoring_suggestions", []),
        )
    except Exception as e:
        raise ValueError(f"LangGraph execution failed: {str(e)}")


# ==========================================
# AGENT 1: RESUME STRUCTURER & PARSER AGENT
# ==========================================
async def structurize_resume_agent(
    raw_text: str,
    provider: str,
    api_key: str,
    model: str,
    base_url: Optional[str] = None,
) -> Resume:
    llm = get_langchain_model(provider, api_key, model, base_url)

    system_prompt = """You are an expert ATS (Applicant Tracking System) parser. Your task is to extract all information from the raw, unstructured resume text and structure it perfectly into a clean, comprehensive JSON object that represents a detailed professional resume.

CRITICAL RULES:
1. Extract ALL information accurately. Do not skip dates, bullet points, skills, or projects.
2. If certain elements (like personal links or certifications) are missing in the text, leave them as empty strings or empty lists, but preserve the JSON structure.
3. Formulate bullet points clearly in standard professional prose. Do not shorten or summarize details unless necessary for clarity.
4. Separate the technologies used in a project into a clean list of strings.
5. Categorize skills logically (e.g. "Programming Languages", "Frameworks & Libraries", "Tools & Platforms").

Your output MUST be a single, valid JSON object matching the exact structure of this example:
{
  "personal_info": {
    "name": "Jane Doe",
    "email": "jane.doe@example.com",
    "phone": "555-0199",
    "location": "Seattle, WA",
    "linkedin": "linkedin.com/in/janedoe",
    "github": "github.com/janedoe",
    "website": ""
  },
  "summary": "Experienced software developer with specialized skills in React, TypeScript, and FastAPI...",
  "experience": [
    {
      "company": "InnoTech Corp",
      "role": "Software Engineer II",
      "start_date": "06/2021",
      "end_date": "Present",
      "description": [
        "Designed and implemented microservices using Python and Docker.",
        "Refactored frontend application using React and TypeScript, increasing performance by 40%."
      ]
    }
  ],
  "education": [
    {
      "institution": "University of Washington",
      "degree": "Bachelor of Science",
      "major": "Computer Science",
      "graduation_date": "05/2021",
      "gpa": "3.8/4.0"
    }
  ],
  "skills": [
    {
      "category": "Programming Languages",
      "skills": ["Python", "TypeScript", "SQL"]
    }
  ],
  "projects": [
    {
      "name": "E-Commerce Microservice",
      "role": "Lead Developer",
      "technologies": ["FastAPI", "PostgreSQL", "Docker"],
      "description": [
        "Built a stateless checkout service resolving 10k transactions/sec.",
        "Implemented JWT authentication and Redis-based caching."
      ],
      "link": ""
    }
  ],
  "certifications": [
    {
      "name": "AWS Certified Solutions Architect",
      "issuer": "Amazon Web Services",
      "date": "11/2023"
    }
  ]
}

DO NOT include any explanation, introductory text, or markdown formatting (like ```json). Respond ONLY with the raw JSON string."""

    prompt = (
        f"Here is the raw resume text to parse and structure into JSON:\n\n{raw_text}"
    )

    messages = [SystemMessage(content=system_prompt), HumanMessage(content=prompt)]
    res = await llm.ainvoke(messages)
    cleaned_response = clean_json_response(res.content)
    try:
        data = json.loads(cleaned_response)
        return Resume(**data)
    except Exception as e:
        raise ValueError(
            f"Failed to decode the JSON parsed resume: {str(e)}. Raw LLM output: {res.content[:300]}"
        )


# ==========================================
# AGENT 3: JOB FIT & RECOMMENDATIONS AGENT
# ==========================================
async def recommend_jobs_agent(
    resume: Resume,
    provider: str,
    api_key: str,
    model: str,
    base_url: Optional[str] = None,
) -> List[JobRecommendation]:
    llm = get_langchain_model(provider, api_key, model, base_url)

    system_prompt = """You are an AI Career Coach and Job Matcher. Your task is to analyze a candidate's structured resume and match it against our database of available jobs.

We will provide a list of available jobs. For EACH job, you must:
1. Calculate a Fit Score (0 to 100) based on skills, experience level, and role alignment.
2. Provide a list of "match_reasons" explaining why they are a good fit.
3. Provide a list of "skills_gap" identifying what technologies or requirements they are missing.
4. Formulate a brief, engaging "description_summary" of the job (1-2 sentences).

Your output MUST be a JSON array of objects matching the following schema. Sort the results with the highest fit_score first:
[
  {
    "id": "job_1",
    "title": "Software Engineer (Full Stack)",
    "company": "TechInnovate Solutions",
    "location": "San Francisco, CA (Hybrid)",
    "salary": "$120,000 - $160,000",
    "fit_score": 85,
    "match_reasons": ["Candidate has 3+ years in React", "Has solid Python backend experience"],
    "skills_gap": ["Lacks AWS cloud services experience", "No direct Docker experience in resume"],
    "description_summary": "Develop client and server code for web platforms in a hybrid team.",
    "raw_description": "[This field must contain the original raw job description in its entirety]"
  }
]

Respond ONLY with the raw JSON string. Do not include markdown formatting or explanations."""

    jobs_data_str = json.dumps(MOCK_JOBS_DB, indent=2)
    resume_text = json.dumps(resume.model_dump(), indent=2)

    prompt = f"JOBS DATABASE:\n{jobs_data_str}\n\nUSER RESUME:\n{resume_text}"

    messages = [SystemMessage(content=system_prompt), HumanMessage(content=prompt)]
    res = await llm.ainvoke(messages)
    cleaned_response = clean_json_response(res.content)
    try:
        data = json.loads(cleaned_response)
        if not isinstance(data, list):
            data = [data]
        return [JobRecommendation(**item) for item in data]
    except Exception as e:
        raise ValueError(
            f"Failed to decode job recommendations: {str(e)}. Raw LLM output: {res.content[:300]}"
        )


# ==========================================
# AGENT 4: APPLICATION ASSISTANT AGENT (COVER LETTER & QUESTIONS)
# ==========================================
async def generate_cover_letter_agent(
    resume: Resume,
    job_title: str,
    company_name: str,
    job_description: str,
    provider: str,
    api_key: str,
    model: str,
    base_url: Optional[str] = None,
) -> CoverLetterResponse:
    llm = get_langchain_model(provider, api_key, model, base_url)

    system_prompt = """You are a professional Resume Writer and Cover Letter Specialist. Your goal is to draft an exceptional, highly tailored, ATS-optimized cover letter for the candidate that perfectly links their background to the target job description.

The cover letter should be:
1. Formatted professionally (standard greeting, opening paragraph referencing the specific role, middle paragraphs highlighting concrete projects and experience that match the job qualifications, and a compelling closing paragraph).
2. Persuasive and direct, incorporating appropriate industry keywords.
3. Completely free of generic filler text. Use the actual project and company details.
4. Accompanied by a list of "customization_notes" explaining what key additions they should make or what skills are heavily emphasized.

Your output MUST be a valid JSON object matching this schema:
{
  "cover_letter": "Dear Hiring Manager... \\n\\nSincerely,\\nJane Doe",
  "customization_notes": [
    "Emphasized your React project to match their frontend requirements.",
    "Be sure to add your actual target salary if requested in the cover letter."
  ]
}

Respond ONLY with the raw JSON string. Do not include markdown formatting or commentary."""

    resume_text = json.dumps(resume.model_dump(), indent=2)
    prompt = f"JOB ROLE: {job_title} at {company_name}\nJOB DESCRIPTION:\n{job_description}\n\nUSER RESUME:\n{resume_text}"

    messages = [SystemMessage(content=system_prompt), HumanMessage(content=prompt)]
    res = await llm.ainvoke(messages)
    cleaned_response = clean_json_response(res.content)
    try:
        data = json.loads(cleaned_response)
        return CoverLetterResponse(**data)
    except Exception as e:
        raise ValueError(
            f"Failed to decode cover letter: {str(e)}. Raw LLM output: {res.content[:300]}"
        )


async def prepare_interview_prep_agent(
    resume: Resume,
    job_title: str,
    company_name: str,
    job_description: str,
    provider: str,
    api_key: str,
    model: str,
    base_url: Optional[str] = None,
) -> InterviewPrepResponse:
    llm = get_langchain_model(provider, api_key, model, base_url)

    system_prompt = """You are an expert Interview Coach. Your goal is to prepare a custom interview preparation guide for a candidate applying to a specific role based on their resume and the job description.

Your output must include:
1. **Common Questions (List of 3 items)**: Formulate the top 3 interview questions they are likely to face. For each question, provide a sample answer tailored to the candidate's actual projects/experience, and strategic tips on how to frame it.
2. **Behavioral STAR Scenarios (List of 3 items)**: Formulate 3 distinct behavioral question responses (Situation, Task, Action, Result) based on the projects or work history in the candidate's resume, tailoring them to show critical qualities (e.g. leadership, problem-solving, handling failure) requested in the job description.

Your output MUST be a valid JSON object matching this schema:
{
  "common_questions": [
    {
      "question": "Can you tell me about a time you resolved a performance bottleneck?",
      "sample_answer": "In my role as Lead Developer for the E-Commerce Microservice project...",
      "tips": "Focus on the specific metrics and speedup achieved (e.g., 40% performance increase)."
    }
  ],
  "behavioral_star_scenarios": [
    "**Situation**: E-Commerce database was slowing down under heavy load.\\n**Task**: Optimize transaction queries... "
  ]
}

Respond ONLY with the raw JSON string. Do not include markdown formatting or commentary."""

    resume_text = json.dumps(resume.model_dump(), indent=2)
    prompt = f"JOB ROLE: {job_title} at {company_name}\nJOB DESCRIPTION:\n{job_description}\n\nUSER RESUME:\n{resume_text}"

    messages = [SystemMessage(content=system_prompt), HumanMessage(content=prompt)]
    res = await llm.ainvoke(messages)
    cleaned_response = clean_json_response(res.content)
    try:
        data = json.loads(cleaned_response)
        return InterviewPrepResponse(**data)
    except Exception as e:
        raise ValueError(
            f"Failed to decode interview prep: {str(e)}. Raw LLM output: {res.content[:300]}"
        )


# ==========================================
# AGENT 5: REAL CAREER PORTAL PARSER AGENT
# ==========================================
async def parse_jobs_from_raw_text_agent(
    raw_text: str,
    url: str,
    resume: Resume,
    provider: str,
    api_key: str,
    model: str,
    base_url: Optional[str] = None,
) -> List[JobRecommendation]:
    llm = get_langchain_model(provider, api_key, model, base_url)

    system_prompt = """You are an expert Job Parser and Resume Matcher. Your task is to analyze raw text extracted from a company's official career page and identify distinct, active job openings.
For each distinct job opening you find, you must:
1. Extract the Job Title, Company Name (deduced from the URL or text), and Location.
2. Formulate a concise summary of the job description (description_summary) and capture the full raw job description/requirements (raw_description).
3. Compare the job requirements against the provided candidate structured resume. Calculate a Fit Score (0-100), identify 2-3 specific "match_reasons" (why they fit), and 2-3 "skills_gap" (missing tech/experience).

Your output MUST be a valid JSON array of objects matching this exact schema:
[
  {
    "id": "crawled_1",
    "title": "Software Engineer",
    "company": "Target Company",
    "location": "San Francisco, CA (Hybrid)",
    "salary": "$130k - $160k (estimated)",
    "fit_score": 88,
    "match_reasons": ["Solid React background matches frontend requirements", "Python experience fits backend stack"],
    "skills_gap": ["No Kubernetes experience mentioned in resume"],
    "description_summary": "Responsible for core product web portals and scaling server microservices.",
    "raw_description": "We are seeking a Software Engineer..."
  }
]

CRITICAL: Extract ONLY real, distinct job openings present in the text. If no clear job openings are present in the text, return an empty array [].
Respond ONLY with the raw JSON string. Do not include markdown code blocks or intro/outro comments."""

    resume_text = json.dumps(resume.model_dump(), indent=2)
    prompt = f"CAREER PAGE URL: {url}\n\nRAW CAREER PAGE TEXT:\n{raw_text[:8000]}\n\nCANDIDATE RESUME:\n{resume_text}"

    messages = [SystemMessage(content=system_prompt), HumanMessage(content=prompt)]
    res = await llm.ainvoke(messages)
    cleaned_response = clean_json_response(res.content)
    try:
        data = json.loads(cleaned_response)
        if not isinstance(data, list):
            data = [data]
        return [JobRecommendation(**item) for item in data]
    except Exception as e:
        raise ValueError(
            f"Failed to parse jobs from crawled text: {str(e)}. Raw LLM output: {res.content[:300]}"
        )
