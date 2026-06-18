import json
import re
from typing import Any, List, Optional

import httpx
from app.agents import (
    analyze_ats_score_agent,
    generate_cover_letter_agent,
    parse_jobs_from_raw_text_agent,
    prepare_interview_prep_agent,
    recommend_jobs_agent,
    structurize_resume_agent,
)
from app.parser import extract_text
from app.schemas import (
    ATSScoreRequest,
    ATSScoreResult,
    CoverLetterRequest,
    CoverLetterResponse,
    CrawlRequest,
    CrawlResponse,
    InterviewPrepRequest,
    InterviewPrepResponse,
    JobRecommendation,
    Resume,
)
from fastapi import Depends, FastAPI, File, Header, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="AI ATS Resume Optimizer & Application Assistant API",
    description="Stateless, provider-agnostic AI engine to structure resumes, score ATS compatibility, and assist in job applications.",
)

# Enable CORS for frontend compatibility
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, restrict this to your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Dependency to extract LLM configuration stateless-ly from request headers
def get_llm_config(
    x_ai_provider: Optional[str] = Header(None, alias="X-AI-Provider"),
    x_ai_api_key: Optional[str] = Header(None, alias="X-AI-API-Key"),
    x_ai_model: Optional[str] = Header(None, alias="X-AI-Model"),
    x_ai_base_url: Optional[str] = Header(None, alias="X-AI-Base-URL"),
) -> dict[str, Any]:
    if not x_ai_provider:
        raise HTTPException(
            status_code=400,
            detail="Header 'X-AI-Provider' is required. Please set your AI provider in the Settings panel.",
        )
    if not x_ai_api_key and x_ai_provider.lower() != "ollama":
        raise HTTPException(
            status_code=400,
            detail="Header 'X-AI-API-Key' is required. Please set your API key in the Settings panel.",
        )

    return {
        "provider": x_ai_provider,
        "api_key": x_ai_api_key or "",
        "model": x_ai_model or "",
        "base_url": x_ai_base_url,
    }


@app.get("/")
def read_root():
    return {"status": "healthy", "service": "ATS Resume Builder & Assistant API"}


@app.get("/api/models", response_model=List[str])
async def list_available_models(
    provider: str, api_key: Optional[str] = None, base_url: Optional[str] = None
):
    """
    Fetch live available models from the selected provider's official API.
    """
    provider = provider.lower()
    headers = {}

    async with httpx.AsyncClient() as client:
        try:
            if provider == "openai":
                url = "https://api.openai.com/v1/models"
                headers = {"Authorization": f"Bearer {api_key}"}
                response = await client.get(url, headers=headers, timeout=10.0)
                response.raise_for_status()
                data = response.json()
                # filter out non-chat models to keep dropdown clean
                models = [
                    m["id"]
                    for m in data.get("data", [])
                    if "gpt" in m["id"] or "o1" in m["id"]
                ]
                return sorted(models)

            elif provider == "anthropic":
                url = "https://api.anthropic.com/v1/models"
                headers = {
                    "x-api-key": api_key or "",
                    "anthropic-version": "2023-06-01",
                }
                response = await client.get(url, headers=headers, timeout=10.0)
                response.raise_for_status()
                data = response.json()
                models = [m["id"] for m in data.get("data", [])]
                return sorted(models)

            elif provider == "gemini":
                url = f"https://generativelanguage.googleapis.com/v1beta/models?key={api_key}"
                response = await client.get(url, timeout=10.0)
                response.raise_for_status()
                data = response.json()
                models = []
                for m in data.get("models", []):
                    name = m.get("name", "")
                    if name.startswith("models/"):
                        name = name.replace("models/", "")
                    supported_methods = set(m.get("supportedGenerationMethods", []))
                    is_current_gemini = (
                        name.startswith("gemini-")
                        and "generateContent" in supported_methods
                        and "embedding" not in name
                        and "aqa" not in name
                        and not name.startswith("gemini-1.")
                    )
                    if is_current_gemini:
                        models.append(name)

                def gemini_sort_key(model_name: str) -> tuple[int, str]:
                    if "2.5" in model_name:
                        return (0, model_name)
                    if "2.0" in model_name:
                        return (1, model_name)
                    return (2, model_name)

                return sorted(set(models), key=gemini_sort_key)

            elif provider == "openrouter":
                url = "https://openrouter.ai/api/v1/models"
                response = await client.get(url, timeout=10.0)
                response.raise_for_status()
                data = response.json()
                models = [m["id"] for m in data.get("data", [])]
                # Filter down OpenRouter's 150+ models to free and popular ones
                free_models = [m for m in models if "free" in m]
                popular_models = [
                    m
                    for m in models
                    if "gpt-4" in m or "claude-3-5" in m or "llama-3" in m
                ]
                return sorted(list(set(free_models + popular_models[:15])))

            elif provider == "ollama":
                url = f"{base_url or 'http://localhost:11434'}/api/tags"
                response = await client.get(url, timeout=5.0)
                response.raise_for_status()
                data = response.json()
                models = [m["name"] for m in data.get("models", [])]
                return sorted(models)

            else:
                return []

        except Exception as e:
            # On error, log and return empty list (frontend falls back safely)
            print(f"Failed to fetch models for {provider}: {str(e)}")
            return []


@app.post("/api/parse", response_model=Resume)
async def parse_resume(
    file: UploadFile = File(...), llm_config: dict[str, Any] = Depends(get_llm_config)
):
    """
    Upload a PDF/DOCX/TXT resume, extract text, and use AI to structure it into standard Resume JSON.
    """
    try:
        file_bytes = await file.read()
        raw_text = extract_text(file_bytes, file.filename or "")

        if not raw_text.strip():
            raise HTTPException(
                status_code=400,
                detail="The uploaded file is empty or no readable text could be extracted.",
            )

        structured_resume = await structurize_resume_agent(
            raw_text=raw_text,
            provider=llm_config["provider"],
            api_key=llm_config["api_key"],
            model=llm_config["model"],
            base_url=llm_config["base_url"],
        )
        return structured_resume

    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Internal Server Error during parsing: {str(e)}"
        )


@app.post("/api/score", response_model=ATSScoreResult)
async def score_resume(
    request: ATSScoreRequest,
    llm_config: dict[str, Any] = Depends(get_llm_config),
):
    """
    Score a structured Resume against a target Job Description.
    """
    try:
        analysis = await analyze_ats_score_agent(
            resume=request.resume,
            job_description=request.job_description or "",
            provider=llm_config["provider"],
            api_key=llm_config["api_key"],
            model=llm_config["model"],
            base_url=llm_config["base_url"],
        )
        return analysis
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error generating ATS score: {str(e)}"
        )


@app.post("/api/jobs", response_model=List[JobRecommendation])
async def recommend_jobs(
    resume: Resume, llm_config: dict[str, Any] = Depends(get_llm_config)
):
    """
    Recommend jobs from database that fit the structured Resume.
    """
    try:
        recommendations = await recommend_jobs_agent(
            resume=resume,
            provider=llm_config["provider"],
            api_key=llm_config["api_key"],
            model=llm_config["model"],
            base_url=llm_config["base_url"],
        )
        return recommendations
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error recommending jobs: {str(e)}"
        )


@app.post("/api/assistant/cover-letter", response_model=CoverLetterResponse)
async def generate_cover_letter(
    request: CoverLetterRequest, llm_config: dict[str, Any] = Depends(get_llm_config)
):
    """
    Generate a tailored cover letter based on a resume and job details.
    """
    try:
        cover_letter_res = await generate_cover_letter_agent(
            resume=request.resume,
            job_title=request.job_title,
            company_name=request.company_name,
            job_description=request.job_description,
            provider=llm_config["provider"],
            api_key=llm_config["api_key"],
            model=llm_config["model"],
            base_url=llm_config["base_url"],
        )
        return cover_letter_res
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error generating cover letter: {str(e)}"
        )


@app.post("/api/assistant/interview-prep", response_model=InterviewPrepResponse)
async def prepare_interview(
    request: InterviewPrepRequest, llm_config: dict[str, Any] = Depends(get_llm_config)
):
    """
    Generate interview preparation questions, tips, and STAR scenarios based on a resume and job details.
    """
    try:
        interview_prep_res = await prepare_interview_prep_agent(
            resume=request.resume,
            job_title=request.job_title,
            company_name=request.company_name,
            job_description=request.job_description,
            provider=llm_config["provider"],
            api_key=llm_config["api_key"],
            model=llm_config["model"],
            base_url=llm_config["base_url"],
        )
        return interview_prep_res
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error generating interview prep guide: {str(e)}"
        )


@app.post("/api/crawl", response_model=CrawlResponse)
async def crawl_career_portal(
    request: CrawlRequest,
    resume: Resume,
    llm_config: dict[str, Any] = Depends(get_llm_config),
):
    """
    Crawl a company career portal URL. Under Cloudflare/CAPTCHA, triggers a verification bypass flow.
    """
    url = request.url.strip()
    html_content = request.html_content or ""

    # If the user has already bypassed CAPTCHA and pasted the text/source:
    if html_content.strip():
        try:
            # We strip HTML tags if any to keep text clean and reduce tokens
            clean_text = re.sub(r"<[^>]*>", " ", html_content)
            clean_text = re.sub(r"\s+", " ", clean_text).strip()

            jobs = await parse_jobs_from_raw_text_agent(
                raw_text=clean_text,
                url=url,
                resume=resume,
                provider=llm_config["provider"],
                api_key=llm_config["api_key"],
                model=llm_config["model"],
                base_url=llm_config["base_url"],
            )
            return CrawlResponse(
                status="success",
                url=url,
                jobs=jobs,
                message="Successfully parsed pasted content with AI Agent.",
            )
        except Exception as e:
            raise HTTPException(
                status_code=500, detail=f"Error parsing pasted content: {str(e)}"
            )

    # Otherwise, let's attempt to crawl the URL directly
    headers = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (Macintosh; Mac OS X) Chrome/122.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
    }

    try:
        async with httpx.AsyncClient(follow_redirects=True) as client:
            response = await client.get(url, headers=headers, timeout=20.0)

            # Check for bot block or Cloudflare protection signatures
            is_blocked = (
                response.status_code in [403, 429]
                or "cloudflare" in response.text.lower()
                or "captcha" in response.text.lower()
                or "ray id" in response.text.lower()  # standard cloudflare tracer
                or "please verify you are a human" in response.text.lower()
            )

            if is_blocked:
                return CrawlResponse(
                    status="captcha_required",
                    url=url,
                    jobs=[],
                    message="CAPTCHA or Bot block detected. Please solve the verification below.",
                )

            # Extract plain text from HTML
            clean_text = re.sub(
                r"<script.*?</script>", " ", response.text, flags=re.DOTALL
            )
            clean_text = re.sub(r"<style.*?</style>", " ", clean_text, flags=re.DOTALL)
            clean_text = re.sub(r"<[^>]*>", " ", clean_text)
            clean_text = re.sub(r"\s+", " ", clean_text).strip()

            jobs = await parse_jobs_from_raw_text_agent(
                raw_text=clean_text,
                url=url,
                resume=resume,
                provider=llm_config["provider"],
                api_key=llm_config["api_key"],
                model=llm_config["model"],
                base_url=llm_config["base_url"],
            )

            return CrawlResponse(
                status="success",
                url=url,
                jobs=jobs,
                message=f"Successfully crawled and parsed {len(jobs)} jobs.",
            )

    except httpx.RequestError as re_err:
        return CrawlResponse(
            status="error",
            url=url,
            jobs=[],
            message=f"Network error trying to contact career page: {str(re_err)}",
        )
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Scraping pipeline failed: {str(e)}"
        )
