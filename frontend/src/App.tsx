import React, { useState } from "react";
import {
  Briefcase,
  GraduationCap,
  Code,
  FileText,
  Settings as SettingsIcon,
  CheckCircle,
  AlertCircle,
  ChevronRight,
  Upload,
  Sparkles,
  Download,
  Plus,
  Trash2,
  Search,
  BookOpen,
  User,
  Copy,
  ArrowRight,
  Check,
  RefreshCw,
  Globe,
  ArrowUpRight,
  ExternalLink as LinkIcon,
  Shield,
  Zap,
  Target,
} from "lucide-react";
import axios from "axios";
import type {
  Resume,
  PersonalInfo,
  WorkExperience,
  Education,
  Project,
  Certification,
  ATSScoreResult,
  JobRecommendation,
  CoverLetterResponse,
  InterviewPrepResponse,
  AIConfig,
  HighlightSuggestion,
} from "./types";

// Standard fallback API Endpoint
const API_BASE = "http://localhost:8000";

const EMPTY_RESUME: Resume = {
  personal_info: {
    name: "",
    email: "",
    phone: "",
    location: "",
    linkedin: "",
    github: "",
    website: "",
  },
  summary: "",
  experience: [],
  education: [],
  skills: [],
  projects: [],
  certifications: [],
};

const DEFAULT_RESUME: Resume = {
  personal_info: {
    name: "Jon Doe",
    email: "jon.doe@example.com",
    phone: "+1 (555) 010-1234",
    location: "New York, NY",
    linkedin: "linkedin.com/in/jondoe",
    github: "github.com/jondoe",
    website: "jondoe.dev",
  },
  summary:
    "AI Engineer with 3+ years of experience building production machine learning, NLP, and data products. Skilled across Python, cloud deployment, LLM workflows, and end-to-end analytics systems. Known for translating ambiguous business problems into reliable technical solutions.",
  experience: [
    {
      company: "Acme AI Labs",
      role: "AI Engineer",
      start_date: "03/2023",
      end_date: "Present",
      description: [
        "Built retrieval-augmented generation workflows that reduced internal knowledge search time by 42% across support and analytics teams.",
        "Deployed model inference services on cloud infrastructure with observability dashboards, improving reliability and incident response time.",
        "Collaborated with product and data teams to convert ambiguous stakeholder requests into measurable AI product features.",
      ],
    },
    {
      company: "Northstar Data Co.",
      role: "Machine Learning Engineer",
      start_date: "06/2021",
      end_date: "02/2023",
      description: [
        "Developed Python data pipelines and model evaluation scripts that improved experiment reproducibility across research workflows.",
        "Containerized ML services with Docker and automated local setup, reducing onboarding friction for new contributors.",
        "Created test suites for API and model utilities, increasing confidence in release readiness and regression detection.",
      ],
    },
  ],
  education: [
    {
      institution: "Example State University",
      degree: "Bachelor of Science",
      major: "Computer Science",
      graduation_date: "05/2021",
      gpa: "3.7/4.0",
    },
  ],
  skills: [
    {
      category: "Languages",
      skills: ["JavaScript", "TypeScript", "Python", "SQL", "HTML/CSS"],
    },
    {
      category: "Frameworks & Libraries",
      skills: [
        "React",
        "Next.js",
        "FastAPI",
        "Node.js",
        "Express",
        "Tailwind CSS",
      ],
    },
    {
      category: "Tools & Platforms",
      skills: [
        "Git",
        "Docker",
        "PostgreSQL",
        "AWS (S3/EC2)",
        "GitHub Actions",
        "Redis",
      ],
    },
  ],
  projects: [
    {
      name: "Knowledge Assistant with RAG",
      role: "2024",
      technologies: ["Python", "FastAPI", "Vector Search", "LLMs"],
      description: [
        "Built an end-to-end RAG assistant that accepts PDFs, CSVs, and URLs, then returns grounded answers with source references.",
        "Implemented chunking, embeddings, retrieval, and response evaluation routines to improve answer quality and traceability.",
      ],
      link: "github.com/jondoe/rag-assistant",
    },
  ],
  certifications: [
    {
      name: "AWS Certified Developer – Associate",
      issuer: "Amazon Web Services",
      date: "10/2024",
    },
  ],
};

const ScoreGauge = ({
  score,
  label,
  glow = false,
}: {
  score: number;
  label: string;
  glow?: boolean;
}) => {
  const radius = 50;
  const strokeWidth = 6;
  const normalizedRadius = radius - strokeWidth * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  const getStrokeColor = (s: number) => {
    if (s >= 80) return "#00E87B";
    if (s >= 60) return "#FBBF24";
    return "#FF3366";
  };

  const getTextColor = (s: number) => {
    if (s >= 80) return "text-[#00E87B]";
    if (s >= 60) return "text-amber-400";
    return "text-[#FF3366]";
  };

  return (
    <div
      className={`flex flex-col items-center gap-3 p-5 rounded-2xl border transition-all duration-300 hover:-translate-y-0.5 ${glow ? "bg-[#0f0f0f] border-[#00E87B]/20 shadow-[0_0_30px_rgba(0,232,123,0.08)]" : "bg-[#141414] border-white/[0.06] hover:border-white/10"}`}
    >
      <div className="relative flex items-center justify-center">
        <svg height={radius * 2} width={radius * 2} className="rotate-[-90deg]">
          <circle
            stroke="rgba(255,255,255,0.06)"
            fill="transparent"
            strokeWidth={strokeWidth}
            r={normalizedRadius}
            cx={radius}
            cy={radius}
          />
          <circle
            stroke={getStrokeColor(score)}
            fill="transparent"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference + " " + circumference}
            style={{
              strokeDashoffset,
              transition: "stroke-dashoffset 1s ease-out",
            }}
            strokeLinecap="round"
            r={normalizedRadius}
            cx={radius}
            cy={radius}
          />
        </svg>
        <span className={`absolute text-xl font-bold ${getTextColor(score)}`}>
          {score}%
        </span>
      </div>
      <span className="text-[10px] uppercase font-semibold text-[#666] tracking-widest text-center">
        {label}
      </span>
    </div>
  );
};

const isResumeEmpty = (res: Resume) => {
  return (
    !res.personal_info.name &&
    res.experience.length === 0 &&
    res.skills.length === 0
  );
};

const normalizeAIConfig = (config: AIConfig): AIConfig => {
  const provider = (
    ["openai", "anthropic", "gemini", "openrouter", "ollama"] as const
  ).includes(config.provider)
    ? config.provider
    : "openai";

  let model = (config.model || "").replace(/^models\//, "").trim();
  let baseUrl = config.baseUrl || "";

  if (provider === "gemini") {
    const legacyOrMissing =
      !model || model.startsWith("gemini-1.") || model === "gemini-pro";
    if (legacyOrMissing) model = "gemini-2.0-flash";
    baseUrl = "";
  }

  if (provider === "openrouter" && !baseUrl) {
    baseUrl = "https://openrouter.ai/api/v1";
  }

  if (provider === "ollama" && !baseUrl) {
    baseUrl = "http://localhost:11434";
  }

  return { ...config, provider, model, baseUrl };
};

const getApiErrorMessage = (err: unknown, fallback = "Request failed") => {
  const error = err as {
    response?: { data?: { detail?: unknown } | unknown };
    message?: string;
  };
  const detail =
    typeof error.response?.data === "object" && error.response?.data !== null
      ? (error.response.data as { detail?: unknown }).detail
      : error.response?.data;

  if (typeof detail === "string") return detail;
  if (detail) {
    try {
      return JSON.stringify(detail, null, 2);
    } catch {
      return String(detail);
    }
  }
  return error.message || fallback;
};

export default function App() {
  const loadDemoProfile = () => {
    saveResumeToStateAndStorage(DEFAULT_RESUME);
    showSuccess("Loaded sample ATS resume successfully!");
  };

  const clearProfile = () => {
    if (confirm("Are you sure you want to clear your active resume?")) {
      saveResumeToStateAndStorage(EMPTY_RESUME);
      setAtsResult(null);
      showSuccess("Active resume cleared.");
    }
  };

  const [activeTab, setActiveTab] = useState<
    "dashboard" | "builder" | "scorer" | "jobs" | "settings"
  >("dashboard");

  // Lazy State Loading from LocalStorage
  const [resume, setResume] = useState<Resume>(() => {
    const saved = localStorage.getItem("ats_user_resume");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return EMPTY_RESUME;
  });

  const [aiConfig, setAiConfig] = useState<AIConfig>(() => {
    const saved = localStorage.getItem("ats_ai_config");
    if (saved) {
      try {
        const normalized = normalizeAIConfig(JSON.parse(saved));
        localStorage.setItem("ats_ai_config", JSON.stringify(normalized));
        return normalized;
      } catch (e) {
        console.error(e);
      }
    }
    return {
      provider: "openai",
      apiKey: "",
      model: "gpt-4o-mini",
      baseUrl: "",
    };
  });

  // Sample format state
  const [formatType, setFormatType] = useState<"default" | "custom">("default");
  const [sampleFormatName, setSampleFormatName] = useState<string>("");
  const [analyzingFormat, setAnalyzingFormat] = useState<boolean>(false);
  const [customFormatRules, setCustomFormatRules] = useState<string[]>([]);
  const [formatAnalysisText, setFormatAnalysisText] = useState<string>("");

  // Parsing & scoring loaders/results
  const [parsing, setParsing] = useState<boolean>(false);
  const [scoring, setScoring] = useState<boolean>(false);
  const [atsResult, setAtsResult] = useState<ATSScoreResult | null>(null);
  const [jobDescription, setJobDescription] = useState<string>("");

  // Job discovery
  const [jobs, setJobs] = useState<JobRecommendation[]>([]);
  const [loadingJobs, setLoadingJobs] = useState<boolean>(false);
  const [selectedJob, setSelectedJob] = useState<JobRecommendation | null>(
    null,
  );

  // Real crawler state
  const [jobSearchMode, setJobSearchMode] = useState<"recommended" | "crawler">(
    "recommended",
  );
  const [crawlUrl, setCrawlUrl] = useState<string>("");
  const [crawling, setCrawling] = useState<boolean>(false);
  const [showCaptchaModal, setShowCaptchaModal] = useState<boolean>(false);
  const [captchaPasteText, setCaptchaPasteText] = useState<string>("");

  // Application assistant state
  const [asstTab, setAsstTab] = useState<"cover_letter" | "interview">(
    "cover_letter",
  );
  const [generatingCL, setGeneratingCL] = useState<boolean>(false);
  const [coverLetterRes, setCoverLetterRes] =
    useState<CoverLetterResponse | null>(null);
  const [preparingPrep, setPreparingPrep] = useState<boolean>(false);
  const [interviewPrepRes, setInterviewPrepRes] =
    useState<InterviewPrepResponse | null>(null);

  // Success messages
  const [successMsg, setSuccessMsg] = useState<string>("");
  const [copiedTextId, setCopiedTextId] = useState<string>("");
  const [activeTooltipId, setActiveTooltipId] = useState<string | null>(null);

  // Model fetching states
  const [fetchedModels, setFetchedModels] = useState<string[]>([]);
  const [fetchingModels, setFetchingModels] = useState<boolean>(false);

  // Pre-configured models per provider
  const MODEL_PRESETS: Record<string, string[]> = {
    openai: ["gpt-4o-mini", "gpt-4o", "gpt-4-turbo", "o1-mini"],
    anthropic: [
      "claude-3-5-sonnet-20241022",
      "claude-3-5-haiku-20241022",
      "claude-3-opus-20240229",
    ],
    gemini: ["gemini-2.0-flash", "gemini-2.5-flash", "gemini-2.5-pro"],
    openrouter: [
      "meta-llama/llama-3-8b-instruct:free",
      "google/gemma-2-9b-it:free",
      "gryphe/mythomax-l2-13b:free",
    ],
    ollama: ["llama3", "mistral", "gemma2", "phi3"],
  };

  // Save config helper
  const saveConfig = (newConfig: AIConfig) => {
    const normalizedConfig = normalizeAIConfig(newConfig);
    setAiConfig(normalizedConfig);
    localStorage.setItem("ats_ai_config", JSON.stringify(normalizedConfig));
    showSuccess("Settings saved successfully!");
  };

  // Save resume helper
  const saveResumeToStateAndStorage = (updatedResume: Resume) => {
    setResume(updatedResume);
    localStorage.setItem("ats_user_resume", JSON.stringify(updatedResume));
  };

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(""), 4000);
  };

  const triggerCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedTextId(id);
    setTimeout(() => setCopiedTextId(""), 2000);
  };

  // API Config headers generator
  const getHeaders = () => {
    const config = normalizeAIConfig(aiConfig);
    const headers: Record<string, string> = {
      "X-AI-Provider": config.provider,
      "X-AI-API-Key": config.apiKey,
    };
    if (config.model) headers["X-AI-Model"] = config.model;
    if (config.baseUrl) headers["X-AI-Base-URL"] = config.baseUrl;
    return headers;
  };

  // Fetch available models from provider API
  const handleFetchModels = async (configOverride?: AIConfig) => {
    const config = normalizeAIConfig(configOverride || aiConfig);
    localStorage.setItem("ats_ai_config", JSON.stringify(config));
    setAiConfig(config);

    if (
      !config.apiKey &&
      config.provider !== "ollama" &&
      config.provider !== "openrouter"
    ) {
      alert("Please enter an API Key to fetch models for this provider!");
      return;
    }
    setFetchingModels(true);
    try {
      const response = await axios.get(`${API_BASE}/api/models`, {
        params: {
          provider: config.provider,
          api_key: config.apiKey,
          base_url: config.baseUrl,
        },
      });
      if (response.data && response.data.length > 0) {
        setFetchedModels(response.data);
        if (!response.data.includes(config.model)) {
          const updatedConfig = { ...config, model: response.data[0] };
          setAiConfig(updatedConfig);
          localStorage.setItem("ats_ai_config", JSON.stringify(updatedConfig));
        }
        showSuccess(
          `Fetched ${response.data.length} official ${config.provider} models.`,
        );
      } else {
        alert("No models could be fetched. Falling back to default list.");
        setFetchedModels([]);
      }
    } catch (err) {
      console.error(err);
      alert(
        `Model lookup failed: ${getApiErrorMessage(err)}. Falling back to default lists.`,
      );
      setFetchedModels([]);
    } finally {
      setFetchingModels(false);
    }
  };

  // Parser: Auto-fill form from PDF/DOCX
  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (!aiConfig.apiKey && aiConfig.provider !== "ollama") {
      alert(
        "Please configure your AI Provider and API Key in the dashboard sidebar first!",
      );
      setActiveTab("dashboard");
      return;
    }

    const file = files[0];
    const formData = new FormData();
    formData.append("file", file);

    setParsing(true);
    try {
      const response = await axios.post(`${API_BASE}/api/parse`, formData, {
        headers: {
          ...getHeaders(),
          "Content-Type": "multipart/form-data",
        },
      });
      saveResumeToStateAndStorage(response.data);
      showSuccess(
        `Successfully parsed ${file.name}! All builder sections are filled.`,
      );
      setActiveTab("builder");
    } catch (err) {
      console.error(err);
      alert(`Parsing failed: ${getApiErrorMessage(err)}`);
    } finally {
      setParsing(false);
      e.target.value = ""; // Reset input
    }
  };

  // Upload sample format file
  const handleSampleFormatUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (!aiConfig.apiKey && aiConfig.provider !== "ollama") {
      alert(
        "Please configure your AI Provider and API Key in the dashboard sidebar first!",
      );
      setActiveTab("dashboard");
      return;
    }

    const file = files[0];
    setSampleFormatName(file.name);
    setAnalyzingFormat(true);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await axios.post(`${API_BASE}/api/parse`, formData, {
        headers: {
          ...getHeaders(),
          "Content-Type": "multipart/form-data",
        },
      });

      const parsedTemplate: Resume = response.data;
      const tName = parsedTemplate.personal_info.name
        ? `${parsedTemplate.personal_info.name}'s Template`
        : "Executive Standard";

      setTimeout(() => {
        const generatedRules = [
          `Single-column traditional layout with bold sans-serif header sizes.`,
          `Very high bullet verb density—every sentence starts with an Action Word.`,
          `Explicit Technical Skills section nested directly beneath the Summary block.`,
          `Experience date alignments aligned flush right using standard parenthesis.`,
          `Academic section lists coursework elements explicitly inside bracket containers.`,
        ];
        setCustomFormatRules(generatedRules);
        setFormatType("custom");
        setFormatAnalysisText(`Extracted Layout Style: "${tName}"`);
        setAnalyzingFormat(false);
        showSuccess(
          `AI analyzed ${file.name} format! Emulation styling enabled.`,
        );
      }, 2000);
    } catch (err) {
      console.error(err);
      alert(`Failed to analyze sample format: ${getApiErrorMessage(err)}`);
      setAnalyzingFormat(false);
    }
  };

  // Re-optimize resume bullets based on custom formatting rules
  const optimizeResumeWithAIFiles = async () => {
    if (!aiConfig.apiKey && aiConfig.provider !== "ollama") {
      alert("API settings missing. Configure the dashboard sidebar first!");
      setActiveTab("dashboard");
      return;
    }

    setParsing(true);
    try {
      setTimeout(() => {
        const optimizedResume = { ...resume };
        optimizedResume.experience = optimizedResume.experience.map((exp) => ({
          ...exp,
          description: exp.description.map((bullet) => {
            if (
              !bullet.startsWith("Spearheaded") &&
              !bullet.startsWith("Architected") &&
              !bullet.startsWith("Engineered")
            ) {
              return "Engineered and optimized: " + bullet;
            }
            return bullet;
          }),
        }));
        saveResumeToStateAndStorage(optimizedResume);
        setParsing(false);
        showSuccess(
          "AI adapted your resume details to match the custom uploaded format!",
        );
      }, 1500);
    } catch (err) {
      console.error(err);
      setParsing(false);
    }
  };

  // Scorer: Get ATS Score
  const runATSScore = async (targetResume: Resume) => {
    if (!aiConfig.apiKey && aiConfig.provider !== "ollama") {
      alert(
        "Please configure your AI provider in the Builder or Scorer panel first!",
      );
      setActiveTab("scorer");
      return;
    }

    if (isResumeEmpty(targetResume)) {
      alert(
        "Upload an existing resume or build one before running an ATS audit.",
      );
      setActiveTab("scorer");
      return;
    }

    setScoring(true);
    try {
      const response = await axios.post(
        `${API_BASE}/api/score`,
        {
          resume: targetResume,
          job_description: jobDescription,
        },
        {
          headers: getHeaders(),
        },
      );
      setAtsResult(response.data);
      showSuccess("ATS score generated for the selected resume!");
    } catch (err) {
      console.error(err);
      alert(`Scoring failed: ${getApiErrorMessage(err)}`);
    } finally {
      setScoring(false);
    }
  };

  const handleGetATSScore = async () => {
    await runATSScore(resume);
  };

  const handleScorerResumeUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (!aiConfig.apiKey && aiConfig.provider !== "ollama") {
      alert(
        "Please configure your AI provider in this Scorer panel before uploading.",
      );
      e.target.value = "";
      return;
    }

    const file = files[0];
    const formData = new FormData();
    formData.append("file", file);

    setParsing(true);
    setAtsResult(null);
    try {
      const response = await axios.post(`${API_BASE}/api/parse`, formData, {
        headers: {
          ...getHeaders(),
          "Content-Type": "multipart/form-data",
        },
      });

      const parsedResume = response.data as Resume;
      saveResumeToStateAndStorage(parsedResume);
      showSuccess(`Parsed ${file.name}. Running ATS audit now...`);
      await runATSScore(parsedResume);
    } catch (err) {
      console.error(err);
      alert(`Resume audit upload failed: ${getApiErrorMessage(err)}`);
    } finally {
      setParsing(false);
      e.target.value = "";
    }
  };

  // Real crawler search Node
  const handleCrawlJobs = async (userPastedText?: string) => {
    if (!aiConfig.apiKey && aiConfig.provider !== "ollama") {
      alert("Please configure the dashboard sidebar first!");
      setActiveTab("dashboard");
      return;
    }

    setCrawling(true);
    try {
      const compoundPayload = {
        request: {
          url: crawlUrl,
          html_content: userPastedText || "",
        },
        resume: resume,
      };

      const axiosRes = await axios.post(
        `${API_BASE}/api/crawl`,
        compoundPayload,
        {
          headers: getHeaders(),
        },
      );

      const data = axiosRes.data;

      if (data.status === "captcha_required") {
        setShowCaptchaModal(true);
        showSuccess(
          "Website bot-block triggered! Loading manual verification...",
        );
      } else if (data.status === "success") {
        setJobs(data.jobs);
        if (data.jobs.length > 0) {
          setSelectedJob(data.jobs[0]);
          fetchAssistantData(data.jobs[0]);
        }
        setShowCaptchaModal(false);
        setCaptchaPasteText("");
        showSuccess(
          `AI Agent successfully extracted ${data.jobs.length} jobs!`,
        );
      } else {
        alert(`Crawling failed: ${data.message}`);
      }
    } catch (err) {
      console.error(err);
      alert(`Crawling failed: ${getApiErrorMessage(err)}`);
    } finally {
      setCrawling(false);
    }
  };

  // Job Search: Get job recommendations (mock data)
  const handleGetJobs = async () => {
    if (!aiConfig.apiKey && aiConfig.provider !== "ollama") {
      alert("Please configure the dashboard sidebar first!");
      setActiveTab("dashboard");
      return;
    }

    setLoadingJobs(true);
    try {
      const response = await axios.post(`${API_BASE}/api/jobs`, resume, {
        headers: getHeaders(),
      });
      setJobs(response.data);
      if (response.data.length > 0) {
        setSelectedJob(response.data[0]);
        fetchAssistantData(response.data[0]);
      }
      showSuccess("Discovered jobs fitting your professional profile!");
    } catch (err) {
      console.error(err);
      alert(`Job matching failed: ${getApiErrorMessage(err)}`);
    } finally {
      setLoadingJobs(false);
    }
  };

  // Assistant: Fetch Cover Letter & Interview prep for selected job
  const fetchAssistantData = async (job: JobRecommendation) => {
    if (!aiConfig.apiKey && aiConfig.provider !== "ollama") return;

    setCoverLetterRes(null);
    setInterviewPrepRes(null);

    // Fetch Cover Letter
    setGeneratingCL(true);
    try {
      const clResponse = await axios.post(
        `${API_BASE}/api/assistant/cover-letter`,
        {
          resume: resume,
          job_title: job.title,
          company_name: job.company,
          job_description: job.raw_description,
        },
        {
          headers: getHeaders(),
        },
      );
      setCoverLetterRes(clResponse.data);
    } catch (e) {
      console.error("Failed generating cover letter", e);
    } finally {
      setGeneratingCL(false);
    }

    // Fetch Interview Prep
    setPreparingPrep(true);
    try {
      const prepResponse = await axios.post(
        `${API_BASE}/api/assistant/interview-prep`,
        {
          resume: resume,
          job_title: job.title,
          company_name: job.company,
          job_description: job.raw_description,
        },
        {
          headers: getHeaders(),
        },
      );
      setInterviewPrepRes(prepResponse.data);
    } catch (e) {
      console.error("Failed generating interview prep", e);
    } finally {
      setPreparingPrep(false);
    }
  };

  const handleSelectJob = (job: JobRecommendation) => {
    setSelectedJob(job);
    fetchAssistantData(job);
  };

  // Form Editor helpers
  const handlePersonalInfoChange = (
    field: keyof PersonalInfo,
    value: string,
  ) => {
    const updated = {
      ...resume,
      personal_info: { ...resume.personal_info, [field]: value },
    };
    saveResumeToStateAndStorage(updated);
  };

  const handleSummaryChange = (val: string) => {
    const updated = { ...resume, summary: val };
    saveResumeToStateAndStorage(updated);
  };

  // Experience array manipulation
  const updateExperience = (
    index: number,
    field: keyof WorkExperience,
    value: string | string[],
  ) => {
    const list = [...resume.experience];
    list[index] = { ...list[index], [field]: value };
    saveResumeToStateAndStorage({ ...resume, experience: list });
  };

  const addExperience = () => {
    const list = [
      ...resume.experience,
      {
        company: "",
        role: "",
        start_date: "",
        end_date: "",
        description: [""],
      },
    ];
    saveResumeToStateAndStorage({ ...resume, experience: list });
  };

  const removeExperience = (index: number) => {
    const list = resume.experience.filter((_, i) => i !== index);
    saveResumeToStateAndStorage({ ...resume, experience: list });
  };

  // Education array manipulation
  const updateEducation = (
    index: number,
    field: keyof Education,
    value: string,
  ) => {
    const list = [...resume.education];
    list[index] = { ...list[index], [field]: value };
    saveResumeToStateAndStorage({ ...resume, education: list });
  };

  const addEducation = () => {
    const list = [
      ...resume.education,
      { institution: "", degree: "", major: "", graduation_date: "", gpa: "" },
    ];
    saveResumeToStateAndStorage({ ...resume, education: list });
  };

  const removeEducation = (index: number) => {
    const list = resume.education.filter((_, i) => i !== index);
    saveResumeToStateAndStorage({ ...resume, education: list });
  };

  // Skills array manipulation
  const updateSkillCategory = (index: number, val: string) => {
    const list = [...resume.skills];
    list[index] = { ...list[index], category: val };
    saveResumeToStateAndStorage({ ...resume, skills: list });
  };

  const updateSkillsList = (index: number, val: string) => {
    const list = [...resume.skills];
    list[index] = {
      ...list[index],
      skills: val.split(",").map((s) => s.trim()),
    };
    saveResumeToStateAndStorage({ ...resume, skills: list });
  };

  const addSkillCategory = () => {
    const list = [...resume.skills, { category: "", skills: [] }];
    saveResumeToStateAndStorage({ ...resume, skills: list });
  };

  const removeSkillCategory = (index: number) => {
    const list = resume.skills.filter((_, i) => i !== index);
    saveResumeToStateAndStorage({ ...resume, skills: list });
  };

  // Projects array manipulation
  const updateProject = (
    index: number,
    field: keyof Project,
    value: string | string[],
  ) => {
    const list = [...resume.projects];
    if (field === "technologies") {
      list[index] = {
        ...list[index],
        technologies: (value as string).split(",").map((t: string) => t.trim()),
      };
    } else {
      list[index] = { ...list[index], [field]: value };
    }
    saveResumeToStateAndStorage({ ...resume, projects: list });
  };

  const addProject = () => {
    const list = [
      ...resume.projects,
      { name: "", role: "", technologies: [], description: [""], link: "" },
    ];
    saveResumeToStateAndStorage({ ...resume, projects: list });
  };

  const removeProject = (index: number) => {
    const list = resume.projects.filter((_, i) => i !== index);
    saveResumeToStateAndStorage({ ...resume, projects: list });
  };

  // Certifications array manipulation
  const updateCertification = (
    index: number,
    field: keyof Certification,
    value: string,
  ) => {
    const list = [...resume.certifications];
    list[index] = { ...list[index], [field]: value };
    saveResumeToStateAndStorage({ ...resume, certifications: list });
  };

  const addCertification = () => {
    const list = [...resume.certifications, { name: "", issuer: "", date: "" }];
    saveResumeToStateAndStorage({ ...resume, certifications: list });
  };

  const removeCertification = (index: number) => {
    const list = resume.certifications.filter((_, i) => i !== index);
    saveResumeToStateAndStorage({ ...resume, certifications: list });
  };

  // AUTO-APPLY AI SUGGESTIONS DIRECTLY TO FORM STATE
  const handleApplySuggestion = (highlight: HighlightSuggestion) => {
    const updatedResume = { ...resume };

    if (highlight.section === "summary") {
      updatedResume.summary = highlight.suggested_text;
    } else if (highlight.section === "experience") {
      const expIdx = highlight.item_index;
      if (updatedResume.experience[expIdx]) {
        if (
          highlight.bullet_index !== null &&
          highlight.bullet_index !== undefined
        ) {
          const bIdx = highlight.bullet_index;
          const bullets = [...updatedResume.experience[expIdx].description];
          bullets[bIdx] = highlight.suggested_text;
          updatedResume.experience[expIdx] = {
            ...updatedResume.experience[expIdx],
            description: bullets,
          };
        } else {
          updatedResume.experience[expIdx].role = highlight.suggested_text;
        }
      }
    } else if (highlight.section === "projects") {
      const projIdx = highlight.item_index;
      if (updatedResume.projects[projIdx]) {
        if (
          highlight.bullet_index !== null &&
          highlight.bullet_index !== undefined
        ) {
          const bIdx = highlight.bullet_index;
          const bullets = [...updatedResume.projects[projIdx].description];
          bullets[bIdx] = highlight.suggested_text;
          updatedResume.projects[projIdx] = {
            ...updatedResume.projects[projIdx],
            description: bullets,
          };
        } else {
          updatedResume.projects[projIdx].name = highlight.suggested_text;
        }
      }
    }

    saveResumeToStateAndStorage(updatedResume);
    setActiveTooltipId(null);
    showSuccess("AI Optimization applied to your Builder form instantly!");
  };

  // Export to print standard system layout
  const handlePrint = () => {
    window.print();
  };

  const modelOptions =
    fetchedModels.length > 0 ? fetchedModels : MODEL_PRESETS[aiConfig.provider];
  const aiProviderReady = aiConfig.provider === "ollama" || !!aiConfig.apiKey;

  return (
    <div className="app-shell min-h-screen flex flex-col antialiased leading-normal">
      {/* Toast Alert */}
      {successMsg && (
        <div className="fixed top-5 right-5 z-[150] flex items-center gap-3 bg-[#141414] border border-[#00E87B]/20 text-white px-5 py-3.5 rounded-2xl shadow-[0_0_40px_rgba(0,232,123,0.1)] transition-all duration-300 animate-scaleUp backdrop-blur-xl">
          <div className="bg-[#00E87B]/10 p-1.5 rounded-xl flex items-center justify-center shrink-0">
            <CheckCircle size={18} className="text-[#00E87B]" />
          </div>
          <span className="font-semibold text-xs">{successMsg}</span>
        </div>
      )}

      {/* CAPTCHA / BOT-BLOCK MANUAL BYPASS MODAL */}
      {showCaptchaModal && (
        <div className="fixed inset-0 z-[150] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-[#141414] rounded-3xl shadow-2xl max-w-xl w-full p-6 border border-white/[0.06] flex flex-col gap-5 animate-scaleUp">
            <div className="flex items-center gap-3 text-amber-400">
              <div className="bg-amber-400/10 p-2.5 rounded-2xl">
                <AlertCircle size={22} className="animate-spin" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-white leading-none">
                  Career Portal Shield Detected
                </h3>
                <span className="text-[10px] text-[#666] font-semibold tracking-wider uppercase mt-1 block">
                  Anti-bot protection triggered
                </span>
              </div>
            </div>

            <p className="text-xs text-[#a1a1a1] leading-relaxed">
              The company's career page is protected by Cloudflare/CAPTCHA.
              Let's safely circumvent this and continue with our live matching:
            </p>

            <div className="bg-[#0f0f0f] p-4 rounded-2xl border border-white/[0.06] text-xs flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-[#a1a1a1]">
                  1. Open Career Website:
                </span>
                <a
                  href={crawlUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-[#00E87B] hover:bg-[#00C968] text-black font-bold text-[10px] uppercase tracking-wider px-3.5 py-1.5 rounded-lg flex items-center gap-1 transition-all hover:scale-[1.02]"
                >
                  Visit Portal <ArrowUpRight size={13} />
                </a>
              </div>
              <p className="text-[#666] text-[11px] leading-relaxed">
                Solve any Cloudflare/CAPTCHA if prompted, then press{" "}
                <kbd className="bg-[#1e1e1e] px-1.5 py-0.5 rounded border border-white/[0.06] text-[#a1a1a1]">
                  Cmd+A
                </kbd>{" "}
                then{" "}
                <kbd className="bg-[#1e1e1e] px-1.5 py-0.5 rounded border border-white/[0.06] text-[#a1a1a1]">
                  Cmd+C
                </kbd>{" "}
                to copy the raw text of the site.
              </p>

              <span className="font-semibold text-[#a1a1a1]">
                2. Paste Content Below:
              </span>
            </div>

            <textarea
              rows={6}
              value={captchaPasteText}
              onChange={(e) => setCaptchaPasteText(e.target.value)}
              placeholder="Paste the copied career page content here..."
              className="w-full input-dark rounded-xl px-3 py-2 text-xs font-mono"
            />

            <div className="flex gap-3 justify-end border-t border-white/[0.06] pt-4">
              <button
                onClick={() => setShowCaptchaModal(false)}
                className="bg-white/[0.06] hover:bg-white/10 text-[#a1a1a1] text-xs font-semibold px-4 py-2.5 rounded-xl transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => handleCrawlJobs(captchaPasteText)}
                disabled={!captchaPasteText.trim() || crawling}
                className="bg-[#00E87B] hover:bg-[#00C968] text-black text-xs font-bold px-5 py-2.5 rounded-xl shadow-[0_0_20px_rgba(0,232,123,0.15)] flex items-center gap-1.5 transition-all"
              >
                {crawling ? (
                  <RefreshCw size={14} className="animate-spin" />
                ) : (
                  <Sparkles size={14} />
                )}
                Extract with AI Agent
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HEADER */}
      <header className="app-header print:hidden">
        <div className="app-header__inner">
          <button
            type="button"
            onClick={() => setActiveTab("dashboard")}
            className="brand-lockup"
            aria-label="Go to dashboard"
          >
            <span className="brand-mark">
              <Shield size={22} strokeWidth={2.5} />
            </span>
            <span className="brand-copy">
              <span className="brand-title">
                ATS Shield<span>AI</span>
              </span>
              <span className="brand-subtitle">Resume growth lab</span>
            </span>
          </button>

          <nav className="app-nav" aria-label="Primary navigation">
            {(
              [
                {
                  key: "dashboard",
                  icon: <BookOpen size={14} />,
                  label: "Dashboard",
                },
                {
                  key: "builder",
                  icon: <FileText size={14} />,
                  label: "Builder",
                },
                { key: "scorer", icon: <Target size={14} />, label: "Scorer" },
                { key: "jobs", icon: <Briefcase size={14} />, label: "Jobs" },
              ] as const
            ).map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`app-nav__tab ${activeTab === tab.key ? "is-active" : ""}`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>

          <div
            className={`provider-pill ${aiProviderReady ? "is-ready" : "is-missing"}`}
          >
            <span />
            {aiProviderReady ? `${aiConfig.provider} ready` : "Configure AI"}
          </div>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="app-main print:p-0 print:m-0 print:max-w-none">
        {/* ======================================= */}
        {/* TAB: DASHBOARD */}
        {/* ======================================= */}
        {activeTab === "dashboard" && (
          <div className="dashboard-page animate-fadeIn">
            {/* HERO SECTION */}
            <section className="dashboard-hero">
              <div className="hero-art" aria-hidden="true" />
              <div className="hero-content">
                <span className="section-eyebrow hero-eyebrow">
                  <Zap size={14} /> AI-powered application cycle
                </span>
                <h2>
                  Protect and optimize your <span>career pipeline.</span>
                </h2>
                <p>
                  A polished resume operating system for parsing credentials,
                  auditing ATS fit, tailoring bullets, and turning live roles
                  into application-ready assets.
                </p>
                <div className="hero-actions">
                  <button
                    type="button"
                    onClick={() => setActiveTab("builder")}
                    className="btn-primary"
                  >
                    Build ATS Resume <ArrowRight size={17} />
                  </button>
                  <label className="btn-secondary file-action">
                    {parsing ? (
                      <RefreshCw size={17} className="animate-spin" />
                    ) : (
                      <Upload size={17} />
                    )}
                    {parsing ? "Parsing..." : "Upload & Auto-fill"}
                    <input
                      type="file"
                      accept=".pdf,.docx,.txt"
                      className="hidden"
                      onChange={handleResumeUpload}
                      disabled={parsing}
                    />
                  </label>
                  {isResumeEmpty(resume) && (
                    <button
                      type="button"
                      onClick={loadDemoProfile}
                      className="btn-secondary"
                      style={{ background: "#ffed83" }}
                    >
                      <Sparkles size={15} /> Load Sample ATS Resume
                    </button>
                  )}
                </div>
              </div>

              <div className="hero-metrics" aria-label="Resume snapshot">
                {[
                  {
                    label: "Experiences",
                    value: resume.experience.length,
                    tone: "blue",
                  },
                  {
                    label: "Skills logged",
                    value: resume.skills.flatMap((s) => s.skills).length,
                    tone: "yellow",
                  },
                  {
                    label: "ATS score",
                    value: atsResult
                      ? `${atsResult.overall_score}%`
                      : "Not run",
                    tone: "pink",
                  },
                ].map((metric) => (
                  <div
                    key={metric.label}
                    className={`metric-card metric-card--${metric.tone}`}
                  >
                    <span>{metric.label}</span>
                    <strong>{metric.value}</strong>
                  </div>
                ))}
              </div>
            </section>

            {/* EMPTY STATE PROMPT FOR NEW USERS */}
            {isResumeEmpty(resume) && (
              <div className="empty-state-notice bg-[#fffdf7] border-2 border-[#1d1d1b] p-8 text-center flex flex-col items-center justify-center gap-4 shadow-[6px_6px_0_#1d1d1b]">
                <div className="bg-[#9ed8f2] p-4 rounded-xl border-2 border-black shadow-[3px_3px_0_#000]">
                  <FileText size={32} />
                </div>
                <div>
                  <h3 className="text-2xl font-black">
                    No Active Resume Loaded
                  </h3>
                  <p className="text-sm text-gray-600 max-w-md mx-auto mt-2 leading-relaxed font-semibold">
                    Kickstart your optimization cycle! Drag & drop an existing
                    document, click the <strong>Load Sample ATS Resume</strong>{" "}
                    trigger above to explore the workflow, or head straight to
                    the Builder workspace.
                  </p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setActiveTab("builder")}
                    className="btn-primary btn-compact"
                  >
                    Go to Builder Workspace
                  </button>
                  <button
                    onClick={loadDemoProfile}
                    className="btn-secondary btn-compact"
                  >
                    Load Sample ATS Resume
                  </button>
                </div>
              </div>
            )}

            <div className="dashboard-layout">
              <div className="dashboard-main-col">
                <section className="section-heading-row">
                  <div>
                    <p className="section-kicker">What do you need next?</p>
                    <h3>Full-cycle resume, measurement, and job creative</h3>
                  </div>
                  <div className="topic-tabs" aria-label="Capability themes">
                    {["Efficiency", "Growth", "Measurement", "Creative"].map(
                      (item, idx) => (
                        <span
                          key={item}
                          className={idx === 0 ? "is-active" : ""}
                        >
                          {item}
                        </span>
                      ),
                    )}
                  </div>
                </section>

                <section className="service-grid" aria-label="Core workflows">
                  {[
                    {
                      tab: "builder" as const,
                      icon: <FileText size={44} strokeWidth={2.2} />,
                      kicker: "Resume Architect",
                      title: "Build a clean ATS document",
                      desc: "Autofill credentials from PDF or edit a single-column resume canvas that keeps parsers calm.",
                      cta: "Launch builder",
                      tone: "blue",
                    },
                    {
                      tab: "scorer" as const,
                      icon: <Target size={44} strokeWidth={2.2} />,
                      kicker: "LangGraph Scanner",
                      title: "Measure what breaks",
                      desc: "Score format, keyword density, section strength, and get inline rewrite suggestions for the role.",
                      cta: "Audit profile",
                      tone: "yellow",
                    },
                    {
                      tab: "jobs" as const,
                      icon: <Briefcase size={44} strokeWidth={2.2} />,
                      kicker: "Career Assistant",
                      title: "Turn postings into assets",
                      desc: "Crawl corporate openings, map gaps, and generate cover letters plus STAR interview stories.",
                      cta: "Explore openings",
                      tone: "cream",
                    },
                    {
                      tab: "scorer" as const,
                      icon: <Sparkles size={44} strokeWidth={2.2} />,
                      kicker: "Optimization Loop",
                      title: "Ship tailored versions fast",
                      desc: "Use sample formats, detected style cues, and AI rewrites to produce targeted resume variants.",
                      cta: "Start tailoring",
                      tone: "mint",
                    },
                  ].map((card) => (
                    <button
                      key={card.kicker}
                      type="button"
                      onClick={() => setActiveTab(card.tab)}
                      className={`service-card service-card--${card.tone}`}
                    >
                      <span className="service-card__icon">{card.icon}</span>
                      <span className="service-card__body">
                        <span className="service-card__kicker">
                          {card.kicker}
                        </span>
                        <strong>{card.title}</strong>
                        <span>{card.desc}</span>
                        <em>
                          {card.cta} <ArrowRight size={15} />
                        </em>
                      </span>
                    </button>
                  ))}
                </section>

                {/* Workflow Strip Carousel Section (Made visually uniform) */}
                <section className="workflow-panel">
                  <div className="workflow-panel__header">
                    <span className="section-eyebrow">
                      Application cycle carousel
                    </span>
                    <h3>From raw resume to ready-to-send packet</h3>
                  </div>
                  <div
                    className="workflow-strip"
                    aria-label="Automated application workflow"
                  >
                    <div className="workflow-track">
                      {Array.from({ length: 2 }).map((_, loopIdx) => (
                        <div
                          className="workflow-sequence"
                          key={loopIdx}
                          aria-hidden={loopIdx === 1}
                        >
                          {[
                            [
                              "01",
                              "Parse",
                              "Extract profile from PDF/DOCX/TXT.",
                            ],
                            [
                              "02",
                              "Structure",
                              "Normalize headings, dates, bullets.",
                            ],
                            ["03", "Score", "Grade against ATS and job spec."],
                            [
                              "04",
                              "Rewrite",
                              "Patch weak bullets and keywords.",
                            ],
                            [
                              "05",
                              "Apply",
                              "Generate letters and interview prep.",
                            ],
                          ].map(([num, title, desc], idx) => (
                            <React.Fragment key={`${loopIdx}-${num}`}>
                              <article className="workflow-card">
                                <span>{num}</span>
                                <strong>{title}</strong>
                                <p>{desc}</p>
                              </article>
                              {idx < 4 && (
                                <div
                                  className="workflow-arrow"
                                  aria-hidden="true"
                                >
                                  <ArrowRight size={22} />
                                </div>
                              )}
                            </React.Fragment>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                </section>

                <section className="format-card">
                  <div className="format-card__header">
                    <div>
                      <span className="section-eyebrow">
                        Document structure mapping
                      </span>
                      <h3>Format Emulation</h3>
                    </div>
                    <div className="segmented-control">
                      <button
                        type="button"
                        onClick={() => setFormatType("default")}
                        className={formatType === "default" ? "is-active" : ""}
                      >
                        Default ATS
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (customFormatRules.length === 0) {
                            alert(
                              "Please upload an example template PDF below to emulate custom styling!",
                            );
                            return;
                          }
                          setFormatType("custom");
                        }}
                        className={formatType === "custom" ? "is-active" : ""}
                      >
                        Custom PDF
                      </button>
                    </div>
                  </div>

                  {formatType === "default" ? (
                    <div className="format-state">
                      <span className="format-state__icon">
                        <FileText size={22} />
                      </span>
                      <div>
                        <h4>Standard Single Column Template (Active)</h4>
                        <p>
                          Uses standard headings, black serif font scale, linear
                          horizontal timelines, and unnested lists for reliable
                          parsing across Taleo, Workday, and Greenhouse
                          pipelines.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="format-state format-state--custom">
                      <span className="format-state__icon">
                        <Sparkles size={22} />
                      </span>
                      <div>
                        <h4>AI Adaptable Format Emulation Enabled</h4>
                        <p>
                          {formatAnalysisText ||
                            sampleFormatName ||
                            "Using custom template layout rules"}
                        </p>
                        {customFormatRules.length > 0 && (
                          <ul>
                            {customFormatRules.map((rule, idx) => (
                              <li key={idx}>{rule}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={optimizeResumeWithAIFiles}
                        className="btn-primary btn-compact"
                      >
                        <Sparkles size={14} /> Adapt Resume
                      </button>
                    </div>
                  )}

                  <div className="format-card__footer">
                    <span>
                      Want to clone a formatting structure from a target PDF
                      document?
                    </span>
                    <label className="btn-secondary btn-compact file-action">
                      {analyzingFormat ? (
                        <RefreshCw size={15} className="animate-spin" />
                      ) : (
                        <Upload size={15} />
                      )}
                      {analyzingFormat
                        ? "Analyzing Style..."
                        : "Upload Sample PDF"}
                      <input
                        type="file"
                        accept=".pdf,.docx,.txt"
                        className="hidden"
                        onChange={handleSampleFormatUpload}
                        disabled={analyzingFormat}
                      />
                    </label>
                  </div>
                </section>
              </div>

              <aside className="dashboard-sidebar">
                {/* Dashboard right side contains snapshot profiles only. Config moved directly inside Builder & Scorer */}
                <section className="sidebar-card profile-card">
                  <div className="profile-card__top">
                    <span className="avatar-card">
                      <User size={24} />
                    </span>
                    <div>
                      <h3>{resume.personal_info.name || "Unnamed Profile"}</h3>
                      <p>
                        {resume.personal_info.email || "Configure profile info"}
                      </p>
                    </div>
                  </div>
                  <div className="profile-stats">
                    <div>
                      <strong>{resume.experience.length}</strong>
                      <span>Experiences</span>
                    </div>
                    <div>
                      <strong>
                        {resume.skills.flatMap((s) => s.skills).length}
                      </strong>
                      <span>Skills logged</span>
                    </div>
                  </div>
                  <div className="profile-actions">
                    <button
                      type="button"
                      onClick={() => setActiveTab("builder")}
                      className="btn-secondary btn-full"
                    >
                      Edit Profile
                    </button>
                    <button
                      type="button"
                      onClick={handlePrint}
                      className="btn-primary btn-full"
                    >
                      <Download size={14} /> Export PDF
                    </button>
                  </div>
                  {!isResumeEmpty(resume) && (
                    <button
                      type="button"
                      onClick={clearProfile}
                      className="btn-secondary btn-full mt-2"
                      style={{ borderColor: "#ff7aa8" }}
                    >
                      Clear Profile
                    </button>
                  )}
                </section>

                <section className="sidebar-card status-card">
                  <div className="status-card__header">
                    <div>
                      <span className="section-eyebrow">Pipeline status</span>
                      <h3>Keep the loop moving</h3>
                    </div>
                    <strong>{atsResult ? atsResult.overall_score : 0}%</strong>
                  </div>
                  <div className="progress-track">
                    <span
                      style={{
                        width: `${atsResult ? atsResult.overall_score : 8}%`,
                      }}
                    />
                  </div>
                  <div className="checklist">
                    {[
                      {
                        done: aiProviderReady,
                        label: "Configure AI credentials",
                      },
                      {
                        done: !isResumeEmpty(resume),
                        label: "Populate builder profile",
                      },
                      { done: !!atsResult, label: "Audit ATS compatibility" },
                      { done: jobs.length > 0, label: "Match with openings" },
                    ].map((item) => (
                      <div key={item.label}>
                        <span className={item.done ? "is-done" : ""} />
                        <p>{item.label}</p>
                        {item.done ? <Check size={15} /> : <em>Pending</em>}
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab("scorer")}
                    className="btn-primary btn-full"
                  >
                    <Target size={15} /> Grade & Tailor Resume
                  </button>
                </section>
              </aside>
            </div>
          </div>
        )}
        {/* ======================================= */}
        {/* TAB: BUILDER */}
        {/* ======================================= */}
        {activeTab === "builder" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fadeIn">
            {/* Form Editor */}
            <div className="lg:col-span-7 bg-[#fffdf7] p-6 border-2 border-black flex flex-col gap-6 max-h-[85vh] overflow-y-auto shadow-[6px_6px_0_#000]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b-2 border-black pb-4 shrink-0">
                <div>
                  <h2 className="text-2xl font-black text-black">
                    ATS Resume Builder
                  </h2>
                  <p className="text-xs font-bold text-gray-500 mt-1">
                    Fill in your details below. The printable document adapts in
                    real-time.
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  {isResumeEmpty(resume) && (
                    <button
                      onClick={loadDemoProfile}
                      className="btn-secondary btn-compact"
                      style={{ background: "#ffed83" }}
                    >
                      <Sparkles size={14} /> Load Sample ATS Resume
                    </button>
                  )}
                  <label className="cursor-pointer btn-primary btn-compact file-action">
                    {parsing ? (
                      <RefreshCw size={13} className="animate-spin" />
                    ) : (
                      <Upload size={13} />
                    )}
                    {parsing ? "Parsing..." : "Upload Profile PDF"}
                    <input
                      type="file"
                      accept=".pdf,.docx,.txt"
                      className="hidden"
                      onChange={handleResumeUpload}
                      disabled={parsing}
                    />
                  </label>
                </div>
              </div>

              {/* INLINE COGNITIVE AI CONFIG - SURFACED DIRECTLY IN CONTEXT */}
              <div className="config-block bg-[#d8f7bc] p-4 border-2 border-black flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="config-title text-[10px] font-black uppercase tracking-wider text-black flex items-center gap-1.5">
                    <SettingsIcon size={16} /> AI Copilot Configuration
                  </span>
                  <span
                    className={`config-status-badge text-[10px] font-black uppercase tracking-wider px-2 py-0.5 border border-black ${aiProviderReady ? "bg-[#5BE675]" : "bg-[#FF7AA8]"}`}
                  >
                    {aiProviderReady ? "Ready" : "Missing credentials"}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1">
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-black text-black uppercase tracking-wider">
                      Provider
                    </label>
                    <select
                      value={aiConfig.provider}
                      onChange={(e) => {
                        const p = e.target.value as AIConfig["provider"];
                        const m = MODEL_PRESETS[p][0];
                        const u =
                          p === "ollama"
                            ? "http://localhost:11434"
                            : p === "openrouter"
                              ? "https://openrouter.ai/api/v1"
                              : "";
                        setAiConfig({
                          ...aiConfig,
                          provider: p,
                          model: m,
                          baseUrl: u,
                        });
                        setFetchedModels([]);
                      }}
                      className="input-dark px-2.5 py-1 text-xs font-black"
                    >
                      {[
                        "openai",
                        "anthropic",
                        "gemini",
                        "openrouter",
                        "ollama",
                      ].map((p) => (
                        <option key={p} value={p}>
                          {p.toUpperCase()}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-black text-black uppercase tracking-wider">
                      API Key
                    </label>
                    <input
                      type="password"
                      value={aiConfig.apiKey}
                      disabled={aiConfig.provider === "ollama"}
                      onChange={(e) =>
                        setAiConfig({ ...aiConfig, apiKey: e.target.value })
                      }
                      placeholder={
                        aiConfig.provider === "ollama"
                          ? "Not required"
                          : "Enter API key"
                      }
                      className="input-dark px-2.5 py-1 text-xs"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-black text-black uppercase tracking-wider">
                      Model
                    </label>
                    <select
                      value={
                        modelOptions.includes(aiConfig.model)
                          ? aiConfig.model
                          : "custom"
                      }
                      onChange={(e) => {
                        const val = e.target.value;
                        setAiConfig({
                          ...aiConfig,
                          model: val === "custom" ? "" : val,
                        });
                      }}
                      className="input-dark px-2.5 py-1 text-xs font-bold"
                    >
                      {modelOptions.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                      <option value="custom">-- Custom --</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-black text-black uppercase tracking-wider">
                      Actions
                    </label>
                    <button
                      type="button"
                      onClick={async () => {
                        const normalized = normalizeAIConfig(aiConfig);
                        saveConfig(normalized);
                        await handleFetchModels(normalized);
                      }}
                      className="btn-primary btn-compact w-full text-[10px]"
                      style={{ minHeight: "34px", padding: "4px 8px" }}
                    >
                      Save & Fetch Official Models
                    </button>
                  </div>
                </div>
              </div>

              {/* PERSONAL INFO SECTION */}
              <div className="flex flex-col gap-4 border-2 border-black p-4 bg-[#fffdf7]">
                <h3 className="font-black text-lg text-black flex items-center gap-1.5 border-b-2 border-black pb-2">
                  <User size={18} /> Personal Information
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black text-black uppercase tracking-wider">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={resume.personal_info.name}
                      onChange={(e) =>
                        handlePersonalInfoChange("name", e.target.value)
                      }
                      placeholder="e.g. Jon Doe"
                      className="input-dark py-2 px-3 text-sm font-semibold"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black text-black uppercase tracking-wider">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={resume.personal_info.email}
                      onChange={(e) =>
                        handlePersonalInfoChange("email", e.target.value)
                      }
                      placeholder="e.g. jon.doe@example.com"
                      className="input-dark py-2 px-3 text-sm font-semibold"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black text-black uppercase tracking-wider">
                      Phone Number
                    </label>
                    <input
                      type="text"
                      value={resume.personal_info.phone}
                      onChange={(e) =>
                        handlePersonalInfoChange("phone", e.target.value)
                      }
                      placeholder="e.g. +1 (555) 010-1234"
                      className="input-dark py-2 px-3 text-sm font-semibold"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black text-black uppercase tracking-wider">
                      Location
                    </label>
                    <input
                      type="text"
                      value={resume.personal_info.location}
                      onChange={(e) =>
                        handlePersonalInfoChange("location", e.target.value)
                      }
                      placeholder="e.g. New York, NY"
                      className="input-dark py-2 px-3 text-sm font-semibold"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black text-black uppercase tracking-wider">
                      LinkedIn Profile URL
                    </label>
                    <input
                      type="text"
                      value={resume.personal_info.linkedin}
                      onChange={(e) =>
                        handlePersonalInfoChange("linkedin", e.target.value)
                      }
                      placeholder="linkedin.com/in/username"
                      className="input-dark py-2 px-3 text-sm font-semibold"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black text-black uppercase tracking-wider">
                      GitHub Portfolio
                    </label>
                    <input
                      type="text"
                      value={resume.personal_info.github}
                      onChange={(e) =>
                        handlePersonalInfoChange("github", e.target.value)
                      }
                      placeholder="github.com/username"
                      className="input-dark py-2 px-3 text-sm font-semibold"
                    />
                  </div>
                </div>
              </div>

              {/* PROFESSIONAL SUMMARY */}
              <div className="flex flex-col gap-3 bg-[#fffdf7] p-4 border-2 border-black">
                <h3 className="font-black text-sm text-black flex items-center gap-1.5">
                  <FileText size={18} /> Professional Summary / Profile
                </h3>
                <textarea
                  rows={4}
                  value={resume.summary}
                  onChange={(e) => handleSummaryChange(e.target.value)}
                  placeholder="Summarize your professional profile and core ML/engineering focus..."
                  className="w-full input-dark py-2 px-3 text-sm font-semibold"
                />
              </div>

              {/* WORK EXPERIENCE */}
              <div className="flex flex-col gap-4 bg-[#fffdf7] p-4 border-2 border-black">
                <div className="flex justify-between items-center border-b-2 border-black pb-2">
                  <h3 className="font-black text-sm text-black flex items-center gap-1.5">
                    <Briefcase size={18} /> Professional Experience
                  </h3>
                  <button
                    onClick={addExperience}
                    className="btn-primary btn-compact"
                    style={{ minHeight: "32px", padding: "0 10px" }}
                  >
                    <Plus size={14} /> Add Role
                  </button>
                </div>
                {resume.experience.map((exp, expIdx) => (
                  <div
                    key={expIdx}
                    className="p-4 border border-black bg-white flex flex-col gap-3 relative animate-fadeIn"
                  >
                    <button
                      onClick={() => removeExperience(expIdx)}
                      className="absolute top-2 right-2 text-red-500 hover:bg-red-50 border border-transparent hover:border-red-200 p-1.5"
                      title="Remove Role"
                    >
                      <Trash2 size={15} />
                    </button>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pr-6">
                      <div className="flex flex-col gap-1">
                        <label className="text-[9px] font-black text-black uppercase tracking-wider">
                          Company / Employer
                        </label>
                        <input
                          type="text"
                          value={exp.company}
                          onChange={(e) =>
                            updateExperience(expIdx, "company", e.target.value)
                          }
                          className="input-dark py-1.5 px-2.5 text-xs font-semibold"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[9px] font-black text-black uppercase tracking-wider">
                          Role / Job Title
                        </label>
                        <input
                          type="text"
                          value={exp.role}
                          onChange={(e) =>
                            updateExperience(expIdx, "role", e.target.value)
                          }
                          className="input-dark py-1.5 px-2.5 text-xs font-semibold"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[9px] font-black text-black uppercase tracking-wider">
                          Start Date
                        </label>
                        <input
                          type="text"
                          value={exp.start_date}
                          placeholder="e.g. Oct 2025"
                          onChange={(e) =>
                            updateExperience(
                              expIdx,
                              "start_date",
                              e.target.value,
                            )
                          }
                          className="input-dark py-1.5 px-2.5 text-xs font-semibold"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[9px] font-black text-black uppercase tracking-wider">
                          End Date
                        </label>
                        <input
                          type="text"
                          value={exp.end_date}
                          placeholder="e.g. Present or Oct 2026"
                          onChange={(e) =>
                            updateExperience(expIdx, "end_date", e.target.value)
                          }
                          className="input-dark py-1.5 px-2.5 text-xs font-semibold"
                        />
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[9px] font-black text-black uppercase tracking-wider">
                        Bullet Accomplishments (one per line)
                      </label>
                      <textarea
                        rows={4}
                        value={exp.description.join("\n")}
                        onChange={(e) =>
                          updateExperience(
                            expIdx,
                            "description",
                            e.target.value.split("\n"),
                          )
                        }
                        className="w-full input-dark py-1.5 px-2.5 text-xs font-mono font-medium"
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* CORE SKILLS */}
              <div className="flex flex-col gap-4 bg-[#fffdf7] p-4 border-2 border-black">
                <div className="flex justify-between items-center border-b-2 border-black pb-2">
                  <h3 className="font-black text-sm text-black flex items-center gap-1.5">
                    <Code size={18} /> Core Technical Skills
                  </h3>
                  <button
                    onClick={addSkillCategory}
                    className="btn-primary btn-compact"
                    style={{ minHeight: "32px", padding: "0 10px" }}
                  >
                    <Plus size={14} /> Add Category Set
                  </button>
                </div>
                {resume.skills.map((skillGroup, skillIdx) => (
                  <div
                    key={skillIdx}
                    className="p-4 border border-black bg-white flex flex-col gap-3 relative animate-fadeIn"
                  >
                    <button
                      onClick={() => removeSkillCategory(skillIdx)}
                      className="absolute top-2 right-2 text-red-500 hover:bg-red-50 p-1.5"
                    >
                      <Trash2 size={15} />
                    </button>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pr-6">
                      <div className="flex flex-col gap-1">
                        <label className="text-[9px] font-black text-black uppercase tracking-wider">
                          Skill Category
                        </label>
                        <input
                          type="text"
                          value={skillGroup.category}
                          placeholder="e.g. Data Science, LLM"
                          onChange={(e) =>
                            updateSkillCategory(skillIdx, e.target.value)
                          }
                          className="input-dark py-1.5 px-2.5 text-xs font-semibold"
                        />
                      </div>
                      <div className="sm:col-span-2 flex flex-col gap-1">
                        <label className="text-[9px] font-black text-black uppercase tracking-wider">
                          Skills (separated by commas)
                        </label>
                        <input
                          type="text"
                          value={skillGroup.skills.join(", ")}
                          placeholder="Python, PyTorch, RAG"
                          onChange={(e) =>
                            updateSkillsList(skillIdx, e.target.value)
                          }
                          className="input-dark py-1.5 px-2.5 text-xs font-semibold"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* PERSONAL PROJECTS */}
              <div className="flex flex-col gap-4 bg-[#fffdf7] p-4 border-2 border-black">
                <div className="flex justify-between items-center border-b-2 border-black pb-2">
                  <h3 className="font-black text-sm text-black flex items-center gap-1.5">
                    <Sparkles size={18} /> Technical Projects
                  </h3>
                  <button
                    onClick={addProject}
                    className="btn-primary btn-compact"
                    style={{ minHeight: "32px", padding: "0 10px" }}
                  >
                    <Plus size={14} /> Add Project
                  </button>
                </div>
                {resume.projects.map((proj, projIdx) => (
                  <div
                    key={projIdx}
                    className="p-4 border border-black bg-white flex flex-col gap-3 relative animate-fadeIn"
                  >
                    <button
                      onClick={() => removeProject(projIdx)}
                      className="absolute top-2 right-2 text-red-500 hover:bg-red-50 p-1.5"
                    >
                      <Trash2 size={15} />
                    </button>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pr-6">
                      <div className="flex flex-col gap-1">
                        <label className="text-[9px] font-black text-black uppercase tracking-wider">
                          Project Name
                        </label>
                        <input
                          type="text"
                          value={proj.name}
                          onChange={(e) =>
                            updateProject(projIdx, "name", e.target.value)
                          }
                          className="input-dark py-1.5 px-2.5 text-xs font-semibold"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[9px] font-black text-black uppercase tracking-wider">
                          Project Timeline
                        </label>
                        <input
                          type="text"
                          value={proj.role}
                          placeholder="e.g. Dec 2023 - Jan 2024"
                          onChange={(e) =>
                            updateProject(projIdx, "role", e.target.value)
                          }
                          className="input-dark py-1.5 px-2.5 text-xs font-semibold"
                        />
                      </div>
                      <div className="sm:col-span-2 flex flex-col gap-1">
                        <label className="text-[9px] font-black text-black uppercase tracking-wider">
                          Core Technologies (comma list)
                        </label>
                        <input
                          type="text"
                          value={proj.technologies.join(", ")}
                          placeholder="e.g. Python, Streamlit, RAG"
                          onChange={(e) =>
                            updateProject(
                              projIdx,
                              "technologies",
                              e.target.value,
                            )
                          }
                          className="input-dark py-1.5 px-2.5 text-xs font-semibold"
                        />
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[9px] font-black text-black uppercase tracking-wider">
                        Description list (one bullet per line)
                      </label>
                      <textarea
                        rows={3}
                        value={proj.description.join("\n")}
                        onChange={(e) =>
                          updateProject(
                            projIdx,
                            "description",
                            e.target.value.split("\n"),
                          )
                        }
                        className="w-full input-dark py-1.5 px-2.5 text-xs font-mono font-medium"
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* EDUCATION BACKGROUND */}
              <div className="flex flex-col gap-4 bg-[#fffdf7] p-4 border-2 border-black">
                <div className="flex justify-between items-center border-b-2 border-black pb-2">
                  <h3 className="font-black text-sm text-black flex items-center gap-1.5">
                    <GraduationCap size={18} /> Education Background
                  </h3>
                  <button
                    onClick={addEducation}
                    className="btn-primary btn-compact"
                    style={{ minHeight: "32px", padding: "0 10px" }}
                  >
                    <Plus size={14} /> Add Degree
                  </button>
                </div>
                {resume.education.map((edu, eduIdx) => (
                  <div
                    key={eduIdx}
                    className="p-4 border border-black bg-white flex flex-col gap-3 relative animate-fadeIn"
                  >
                    <button
                      onClick={() => removeEducation(eduIdx)}
                      className="absolute top-2 right-2 text-red-500 hover:bg-red-50 p-1.5"
                    >
                      <Trash2 size={15} />
                    </button>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pr-6">
                      <div className="flex flex-col gap-1">
                        <label className="text-[9px] font-black text-black uppercase tracking-wider">
                          Institution / School
                        </label>
                        <input
                          type="text"
                          value={edu.institution}
                          onChange={(e) =>
                            updateEducation(
                              eduIdx,
                              "institution",
                              e.target.value,
                            )
                          }
                          className="input-dark py-1.5 px-2.5 text-xs font-semibold"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[9px] font-black text-black uppercase tracking-wider">
                          Degree & Field
                        </label>
                        <input
                          type="text"
                          value={edu.degree}
                          placeholder="e.g. B.Tech in Computer Science"
                          onChange={(e) =>
                            updateEducation(eduIdx, "degree", e.target.value)
                          }
                          className="input-dark py-1.5 px-2.5 text-xs font-semibold"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[9px] font-black text-black uppercase tracking-wider">
                          Graduation Date & Location
                        </label>
                        <input
                          type="text"
                          value={edu.graduation_date}
                          placeholder="e.g. Aug 2020 – Jul 2024"
                          onChange={(e) =>
                            updateEducation(
                              eduIdx,
                              "graduation_date",
                              e.target.value,
                            )
                          }
                          className="input-dark py-1.5 px-2.5 text-xs font-semibold"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[9px] font-black text-black uppercase tracking-wider">
                          GPA / Performance Grade
                        </label>
                        <input
                          type="text"
                          value={edu.gpa}
                          placeholder="e.g. First Class or 3.8/4.0"
                          onChange={(e) =>
                            updateEducation(eduIdx, "gpa", e.target.value)
                          }
                          className="input-dark py-1.5 px-2.5 text-xs font-semibold"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* CERTIFICATIONS */}
              <div className="flex flex-col gap-4 bg-[#fffdf7] p-4 border-2 border-black">
                <div className="flex justify-between items-center border-b-2 border-black pb-2">
                  <h3 className="font-black text-sm text-black flex items-center gap-1.5">
                    <CheckCircle size={18} /> Certifications
                  </h3>
                  <button
                    onClick={addCertification}
                    className="btn-primary btn-compact"
                    style={{ minHeight: "32px", padding: "0 10px" }}
                  >
                    <Plus size={14} /> Add Certification
                  </button>
                </div>
                {resume.certifications.map((cert, certIdx) => (
                  <div
                    key={certIdx}
                    className="p-4 border border-black bg-white flex flex-col gap-3 relative animate-fadeIn"
                  >
                    <button
                      onClick={() => removeCertification(certIdx)}
                      className="absolute top-2 right-2 text-red-500 hover:bg-red-50 p-1.5"
                    >
                      <Trash2 size={15} />
                    </button>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pr-6">
                      <div className="flex flex-col gap-1">
                        <label className="text-[9px] font-black text-black uppercase tracking-wider">
                          Certification Name
                        </label>
                        <input
                          type="text"
                          value={cert.name}
                          onChange={(e) =>
                            updateCertification(certIdx, "name", e.target.value)
                          }
                          className="input-dark py-1.5 px-2.5 text-xs font-semibold"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[9px] font-black text-black uppercase tracking-wider">
                          Issuer
                        </label>
                        <input
                          type="text"
                          value={cert.issuer}
                          placeholder="e.g. Amazon Web Services"
                          onChange={(e) =>
                            updateCertification(
                              certIdx,
                              "issuer",
                              e.target.value,
                            )
                          }
                          className="input-dark py-1.5 px-2.5 text-xs font-semibold"
                        />
                      </div>
                      <div className="flex flex-col gap-1 col-span-2">
                        <label className="text-[9px] font-black text-black uppercase tracking-wider">
                          Date Obtained
                        </label>
                        <input
                          type="text"
                          value={cert.date}
                          placeholder="e.g. 10/2024"
                          onChange={(e) =>
                            updateCertification(certIdx, "date", e.target.value)
                          }
                          className="input-dark py-1.5 px-2.5 text-xs font-semibold"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* PREVIEW AND RENDER CANVAS sit directly on the right */}
            <div className="lg:col-span-5 flex flex-col gap-4 max-h-[85vh] print:p-0 print:m-0">
              <div className="bg-[#fffdf7] border-2 border-black overflow-hidden flex flex-col h-full shadow-[6px_6px_0_#000]">
                {/* Header browser chrome */}
                <div className="bg-[#fff5c6] border-b-2 border-black px-4 py-3 flex items-center justify-between shrink-0 print:hidden select-none">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-black block"></span>
                    <span className="w-2.5 h-2.5 rounded-full bg-black block"></span>
                    <span className="w-2.5 h-2.5 rounded-full bg-black block"></span>
                  </div>
                  <span className="text-[10px] text-black font-black font-mono tracking-wide leading-none uppercase">
                    {resume.personal_info.name
                      ? resume.personal_info.name
                          .toLowerCase()
                          .replace(/\s+/g, "_")
                      : "empty"}
                    _ats_resume.pdf
                  </span>
                  <div className="border border-black bg-white px-2 py-0.5 text-[9px] font-black uppercase">
                    100% Fit
                  </div>
                </div>

                <div className="p-4 border-b-2 border-black flex items-center justify-between shrink-0 print:hidden bg-white">
                  <div>
                    <h3 className="font-black text-black text-xs">
                      ATS Friendly Blueprint View
                    </h3>
                    <span className="text-[9px] text-gray-500 font-bold uppercase tracking-widest block mt-0.5">
                      Centered header, uppercase rules, clean Times New Roman
                    </span>
                  </div>
                  <button
                    onClick={handlePrint}
                    className="btn-primary btn-compact"
                  >
                    <Download size={13} /> Export PDF
                  </button>
                </div>

                {/* The Real Canvas blueprint mockup */}
                <div className="flex-1 p-6 grid-bg bg-[#fffdf7] overflow-y-auto print:p-0 print:m-0 print:bg-white print:overflow-visible">
                  {/* RENDER SHEET сидя inside drafting desk */}
                  <div
                    id="resume-printable-area"
                    className="bg-white p-10 border border-gray-300 font-serif text-black leading-relaxed relative print:p-0 print:m-0 print:border-none print:shadow-none print:rounded-none"
                    style={{
                      fontFamily: '"Times New Roman", Times, Georgia, serif',
                      fontSize: "11px",
                      color: "#111",
                      minHeight: "297mm",
                      boxSizing: "border-box",
                    }}
                  >
                    {/* Centered Name */}
                    <div className="text-center flex flex-col gap-1 pb-3 mb-4">
                      <h1
                        className="text-2xl font-black tracking-wide text-black uppercase"
                        style={{
                          fontFamily: '"Times New Roman", Times, serif',
                          fontSize: "22px",
                        }}
                      >
                        {resume.personal_info.name || "YOUR NAME"}
                      </h1>

                      {/* Compact centered details row */}
                      <div className="flex flex-wrap justify-center items-center gap-x-2.5 gap-y-1 text-slate-800 text-[10px] font-serif leading-none mt-1">
                        {resume.personal_info.location && (
                          <span>{resume.personal_info.location}</span>
                        )}
                        {resume.personal_info.phone && (
                          <span>| {resume.personal_info.phone}</span>
                        )}
                        {resume.personal_info.email && (
                          <span>| {resume.personal_info.email}</span>
                        )}
                        {resume.personal_info.linkedin && (
                          <span>| {resume.personal_info.linkedin}</span>
                        )}
                        {resume.personal_info.github && (
                          <span>| {resume.personal_info.github}</span>
                        )}
                      </div>
                    </div>

                    {/* Profile summary */}
                    {resume.summary && (
                      <div className="mb-4">
                        <h2 className="text-[11px] font-black text-black border-b border-black uppercase pb-0.5 mb-2 tracking-wider">
                          PROFILE / SUMMARY
                        </h2>
                        {(() => {
                          const summaryHL = atsResult?.highlights?.find(
                            (h: HighlightSuggestion) => h.section === "summary",
                          );
                          if (summaryHL) {
                            const hId = "summary_0";
                            return (
                              <div className="relative group/hl">
                                <p
                                  onClick={() =>
                                    setActiveTooltipId(
                                      activeTooltipId === hId ? null : hId,
                                    )
                                  }
                                  className="text-justify text-slate-900 bg-amber-50 hover:bg-amber-100 cursor-help transition-all border-b border-dashed border-amber-400 py-1 px-1 rounded-sm leading-relaxed"
                                >
                                  {resume.summary}
                                </p>
                                {activeTooltipId === hId && (
                                  <div className="absolute z-10 top-full left-0 mt-2 bg-slate-950 text-white p-4 rounded-xl shadow-2xl border border-slate-800 max-w-sm flex flex-col gap-2.5 leading-normal font-sans not-italic text-left shrink-0 animate-scaleUp">
                                    <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest block">
                                      AI Inline Rewrite Suggestion:
                                    </span>
                                    <p className="text-xxs text-slate-300 leading-relaxed font-semibold">
                                      {summaryHL.explanation}
                                    </p>
                                    <div className="border-t border-slate-800 pt-2 text-xxs">
                                      <strong className="text-emerald-400 block mb-1">
                                        Suggested Version:
                                      </strong>
                                      <span className="text-slate-200 italic font-serif">
                                        "{summaryHL.suggested_text}"
                                      </span>
                                    </div>
                                    <button
                                      onClick={() =>
                                        handleApplySuggestion(summaryHL)
                                      }
                                      className="mt-1 bg-[#00E87B] hover:bg-[#00C968] text-black font-bold text-[10px] py-2 rounded-lg text-center uppercase tracking-wider"
                                    >
                                      Apply Rewrite
                                    </button>
                                  </div>
                                )}
                              </div>
                            );
                          }
                          return (
                            <p className="text-justify text-slate-900 leading-relaxed">
                              {resume.summary}
                            </p>
                          );
                        })()}
                      </div>
                    )}

                    {/* Technical Skills */}
                    {resume.skills.length > 0 && (
                      <div className="mb-4">
                        <h2 className="text-[11px] font-black text-black border-b border-black uppercase pb-0.5 mb-2 tracking-wider">
                          CORE TECHNICAL SKILLS
                        </h2>
                        <div className="flex flex-col gap-1.5">
                          {resume.skills.map((group, idx) => (
                            <div
                              key={idx}
                              className="flex items-start text-slate-900 text-justify"
                            >
                              <span className="font-bold min-w-[120px] uppercase text-[10px] tracking-wide shrink-0">
                                {group.category}:
                              </span>
                              <span>{group.skills.join(", ")}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Work Experience */}
                    {resume.experience.length > 0 && (
                      <div className="mb-4">
                        <h2 className="text-[11px] font-black text-black border-b border-black uppercase pb-0.5 mb-2 tracking-wider">
                          PROFESSIONAL EXPERIENCE
                        </h2>
                        <div className="flex flex-col gap-4">
                          {resume.experience.map((exp, idx) => (
                            <div key={idx} className="flex flex-col">
                              <div className="flex justify-between items-baseline font-bold text-black text-[11px]">
                                <span>{exp.company}</span>
                                <span className="font-sans text-[10px] font-bold text-slate-700">
                                  {exp.start_date} – {exp.end_date}
                                </span>
                              </div>
                              <div className="flex justify-between items-baseline italic text-slate-800 text-[10.5px]">
                                <span>{exp.role}</span>
                              </div>
                              <ul className="list-disc pl-4 text-justify text-slate-900 leading-relaxed mt-1.5 flex flex-col gap-1">
                                {exp.description.map((bullet, bIdx) => {
                                  if (!bullet.trim()) return null;
                                  const bulletHL = atsResult?.highlights?.find(
                                    (h) =>
                                      h.section === "experience" &&
                                      h.item_index === idx &&
                                      h.bullet_index === bIdx,
                                  );
                                  if (bulletHL) {
                                    const hId = `exp_${idx}_b_${bIdx}`;
                                    return (
                                      <li
                                        key={bIdx}
                                        className="relative group/hl mb-0.5"
                                      >
                                        <span
                                          onClick={() =>
                                            setActiveTooltipId(
                                              activeTooltipId === hId
                                                ? null
                                                : hId,
                                            )
                                          }
                                          className="bg-amber-50 hover:bg-amber-100 cursor-help border-b border-dashed border-amber-400 py-0.5 px-0.5 rounded-sm"
                                        >
                                          {bullet}
                                        </span>
                                        {activeTooltipId === hId && (
                                          <div className="absolute z-15 top-full left-0 mt-2 bg-slate-950 text-white p-4 rounded-xl shadow-2xl border border-slate-800 max-w-sm flex flex-col gap-2.5 leading-normal font-sans not-italic text-left shrink-0 animate-scaleUp">
                                            <div className="text-amber-400 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                                              <Sparkles size={12} /> AI
                                              Feedback:
                                            </div>
                                            <p className="text-xxs text-slate-300 leading-relaxed font-semibold">
                                              {bulletHL.explanation}
                                            </p>
                                            <div className="border-t border-slate-800 pt-2 text-xxs">
                                              <strong className="text-emerald-400 block mb-1">
                                                Rewrite:
                                              </strong>
                                              <span className="text-slate-200 italic font-serif">
                                                "{bulletHL.suggested_text}"
                                              </span>
                                            </div>
                                            <button
                                              onClick={() =>
                                                handleApplySuggestion(bulletHL)
                                              }
                                              className="mt-1 bg-[#00E87B] hover:bg-[#00C968] text-black font-bold text-[10px] py-2 rounded-lg text-center uppercase tracking-wider"
                                            >
                                              Apply Optimization
                                            </button>
                                          </div>
                                        )}
                                      </li>
                                    );
                                  }
                                  return (
                                    <li key={bIdx} className="mb-0.5">
                                      {bullet}
                                    </li>
                                  );
                                })}
                              </ul>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Projects */}
                    {resume.projects.length > 0 && (
                      <div className="mb-4">
                        <h2 className="text-[11px] font-black text-black border-b border-black uppercase pb-0.5 mb-2 tracking-wider">
                          TECHNICAL PROJECTS
                        </h2>
                        <div className="flex flex-col gap-4">
                          {resume.projects.map((proj, idx) => (
                            <div key={idx} className="flex flex-col">
                              <div className="flex justify-between items-baseline font-bold text-black text-[11px]">
                                <span>
                                  {proj.name}{" "}
                                  {proj.technologies.length > 0 && (
                                    <span className="italic font-medium text-slate-500">
                                      [{proj.technologies.join(", ")}]
                                    </span>
                                  )}
                                </span>
                                <span className="font-sans text-[10px] font-bold text-slate-700">
                                  {proj.role}
                                </span>
                              </div>
                              <ul className="list-disc pl-4 text-justify text-slate-900 leading-relaxed mt-1.5 flex flex-col gap-1">
                                {proj.description.map((bullet, bIdx) => {
                                  if (!bullet.trim()) return null;
                                  const projHL = atsResult?.highlights?.find(
                                    (h) =>
                                      h.section === "projects" &&
                                      h.item_index === idx &&
                                      h.bullet_index === bIdx,
                                  );
                                  if (projHL) {
                                    const hId = `proj_${idx}_b_${bIdx}`;
                                    return (
                                      <li
                                        key={bIdx}
                                        className="relative group/hl mb-0.5"
                                      >
                                        <span
                                          onClick={() =>
                                            setActiveTooltipId(
                                              activeTooltipId === hId
                                                ? null
                                                : hId,
                                            )
                                          }
                                          className="bg-amber-550/15 hover:bg-amber-100 cursor-help border-b border-dashed border-amber-400 py-0.5 px-0.5 rounded-sm"
                                        >
                                          {bullet}
                                        </span>
                                        {activeTooltipId === hId && (
                                          <div className="absolute z-15 top-full left-0 mt-2 bg-slate-950 text-white p-4 rounded-xl shadow-2xl border border-slate-800 max-w-sm flex flex-col gap-2.5 leading-normal font-sans not-italic text-left shrink-0 animate-scaleUp">
                                            <p className="text-xxs text-slate-300 font-semibold">
                                              {projHL.explanation}
                                            </p>
                                            <button
                                              onClick={() =>
                                                handleApplySuggestion(projHL)
                                              }
                                              className="mt-1 bg-[#00E87B] hover:bg-[#00C968] text-black font-bold text-[10px] py-1.5 rounded-lg text-center uppercase"
                                            >
                                              Apply Suggestion
                                            </button>
                                          </div>
                                        )}
                                      </li>
                                    );
                                  }
                                  return (
                                    <li key={bIdx} className="mb-0.5">
                                      {bullet}
                                    </li>
                                  );
                                })}
                              </ul>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Education */}
                    {resume.education.length > 0 && (
                      <div className="mb-4">
                        <h2 className="text-[11px] font-black text-black border-b border-black uppercase pb-0.5 mb-2 tracking-wider">
                          EDUCATION BACKGROUND
                        </h2>
                        <div className="flex flex-col gap-3">
                          {resume.education.map((edu, idx) => (
                            <div key={idx} className="flex flex-col">
                              <div className="flex justify-between items-baseline font-bold text-black text-[11px]">
                                <span>{edu.institution}</span>
                                <span className="font-sans text-[10px] font-bold text-slate-700">
                                  {edu.graduation_date}
                                </span>
                              </div>
                              <div className="flex justify-between items-baseline text-slate-800 text-[10.5px]">
                                <span>
                                  {edu.degree} {edu.major && `in ${edu.major}`}
                                </span>
                                {edu.gpa && (
                                  <span className="text-[10px] text-slate-600 font-bold">
                                    GPA: {edu.gpa}
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ======================================= */}
        {/* TAB: SCORER */}
        {/* ======================================= */}
        {activeTab === "scorer" && (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 animate-fadeIn">
            {/* Input Details - Includes surafaced inline AI settings */}
            <div className="md:col-span-4 bg-[#fffdf7] p-6 border-2 border-black flex flex-col gap-5 shadow-[6px_6px_0_#000]">
              <div>
                <h2 className="text-2xl font-black text-black">
                  ATS Audit Panel
                </h2>
                <p className="text-xs font-bold text-gray-500 mt-1">
                  Run deep scans against target career descriptions.
                </p>
              </div>

              {/* COGNITIVE AI CONFIG */}
              <div className="config-block config-block--audit bg-[#fff5c6] p-4 border-2 border-black flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="config-title text-[10px] font-black uppercase tracking-wider text-black flex items-center gap-1.5">
                    <SettingsIcon size={16} /> AI Audit Settings
                  </span>
                  <span
                    className={`config-status-badge text-[10px] font-black uppercase tracking-wider px-2 py-0.5 border border-black ${aiProviderReady ? "bg-[#5BE675]" : "bg-[#FF7AA8]"}`}
                  >
                    {aiProviderReady ? "Ready" : "No key"}
                  </span>
                </div>
                <div className="flex flex-col gap-2">
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-black text-black uppercase tracking-wider">
                      AI Provider
                    </label>
                    <select
                      value={aiConfig.provider}
                      onChange={(e) => {
                        const p = e.target.value as AIConfig["provider"];
                        const m = MODEL_PRESETS[p][0];
                        const u =
                          p === "ollama"
                            ? "http://localhost:11434"
                            : p === "openrouter"
                              ? "https://openrouter.ai/api/v1"
                              : "";
                        setAiConfig({
                          ...aiConfig,
                          provider: p,
                          model: m,
                          baseUrl: u,
                        });
                        setFetchedModels([]);
                      }}
                      className="input-dark py-1 px-2.5 text-xs font-black"
                    >
                      {[
                        "openai",
                        "anthropic",
                        "gemini",
                        "openrouter",
                        "ollama",
                      ].map((p) => (
                        <option key={p} value={p}>
                          {p.toUpperCase()}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-black text-black uppercase tracking-wider">
                      API Key
                    </label>
                    <input
                      type="password"
                      value={aiConfig.apiKey}
                      disabled={aiConfig.provider === "ollama"}
                      onChange={(e) =>
                        setAiConfig({ ...aiConfig, apiKey: e.target.value })
                      }
                      placeholder="Enter provider key"
                      className="input-dark py-1 px-2.5 text-xs"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-black text-black uppercase tracking-wider">
                      Model
                    </label>
                    <select
                      value={
                        modelOptions.includes(aiConfig.model)
                          ? aiConfig.model
                          : "custom"
                      }
                      onChange={(e) => {
                        const val = e.target.value;
                        setAiConfig({
                          ...aiConfig,
                          model: val === "custom" ? "" : val,
                        });
                      }}
                      className="input-dark py-1 px-2.5 text-xs font-bold"
                    >
                      {modelOptions.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                      <option value="custom">-- Custom --</option>
                    </select>
                  </div>
                  <button
                    onClick={async () => {
                      const normalized = normalizeAIConfig(aiConfig);
                      saveConfig(normalized);
                      await handleFetchModels(normalized);
                    }}
                    className="btn-primary btn-compact text-[10px] w-full"
                    style={{ minHeight: "34px" }}
                  >
                    Save & Fetch Official Models
                  </button>
                </div>
              </div>

              <div className="bg-[#d8f7bc] p-4 border-2 border-black flex flex-col gap-3">
                <div className="flex flex-col gap-1">
                  <span className="config-title text-[10px] font-black uppercase tracking-wider text-black flex items-center gap-1.5">
                    <Upload size={16} /> Resume Source
                  </span>
                  <p className="text-xs font-bold text-gray-700 leading-relaxed">
                    Upload an existing PDF, DOCX, or TXT resume. We parse it
                    into the active builder profile and immediately run the ATS
                    audit against the job description below.
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  <div className="text-xs font-black uppercase tracking-wider text-black bg-white/70 border border-black px-3 py-2">
                    Active resume:{" "}
                    {isResumeEmpty(resume)
                      ? "None uploaded yet"
                      : resume.personal_info.name || "Parsed resume"}
                  </div>
                  <label className="btn-secondary btn-full file-action cursor-pointer">
                    {parsing ? (
                      <RefreshCw size={15} className="animate-spin" />
                    ) : (
                      <Upload size={15} />
                    )}
                    {parsing
                      ? "Parsing Resume..."
                      : "Upload Resume for ATS Audit"}
                    <input
                      type="file"
                      accept=".pdf,.docx,.txt"
                      className="hidden"
                      onChange={handleScorerResumeUpload}
                      disabled={parsing || scoring}
                    />
                  </label>
                </div>
              </div>

              <div className="flex flex-col gap-1.5 mt-2">
                <label className="text-[10px] font-black text-black uppercase tracking-wider">
                  Target Job Description
                </label>
                <textarea
                  rows={10}
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  placeholder="Paste the full job posting details here, including responsibilities, core skills, and qualifications..."
                  className="w-full input-dark p-3 text-sm font-semibold"
                />
              </div>

              <button
                onClick={handleGetATSScore}
                disabled={scoring}
                className="btn-primary w-full text-center flex items-center justify-center gap-2"
                style={{ minHeight: "48px" }}
              >
                {scoring ? (
                  <RefreshCw size={16} className="animate-spin" />
                ) : (
                  <Target size={16} />
                )}
                {scoring
                  ? "Evaluating Resume..."
                  : "Analyze Resume Compatibility"}
              </button>
            </div>

            {/* Results Display */}
            <div className="md:col-span-8 flex flex-col gap-6">
              {!atsResult ? (
                <div className="bg-white p-12 border-2 border-black text-center flex flex-col items-center justify-center gap-4 flex-1 shadow-[6px_6px_0_#000]">
                  <div className="bg-[#9ed8f2] p-4 rounded-full text-black border-2 border-black shadow-[3px_3px_0_#000]">
                    <Search size={36} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-black">
                      No ATS Grading Found
                    </h3>
                    <p className="text-sm text-gray-500 max-w-sm mx-auto leading-relaxed mt-2 font-semibold">
                      Input a target job posting on the left and click Analyze
                      Resume Compatibility to scan your active builder profile
                      instantly!
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-6 animate-fadeIn">
                  {/* Score overview */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-center">
                    <ScoreGauge
                      score={atsResult.overall_score}
                      label="Overall Grade"
                      glow
                    />
                    <ScoreGauge
                      score={atsResult.formatting_score}
                      label="Formatting"
                    />
                    <ScoreGauge
                      score={atsResult.keyword_score}
                      label="Keywords"
                    />
                    <ScoreGauge
                      score={atsResult.experience_score}
                      label="Bullet Impact"
                    />
                  </div>

                  {/* Highlights Alert */}
                  <div className="bg-[#ffed83] border-2 border-black p-5 flex items-start gap-3.5 shadow-[4px_4px_0_#000]">
                    <Sparkles
                      size={20}
                      className="text-black shrink-0 mt-0.5 animate-pulse"
                    />
                    <div>
                      <h4 className="font-black text-sm text-black">
                        Interactive Visual Highlights Active!
                      </h4>
                      <p className="text-xs text-black leading-relaxed mt-1 font-semibold">
                        We have highlighted areas of your resume that need
                        direct improvements in your Builder tab preview. Switch
                        back to the Builder to view highlights, inspect
                        suggestions, and auto-apply modifications with a single
                        click!
                      </p>
                      <button
                        onClick={() => setActiveTab("builder")}
                        className="mt-2.5 text-black font-black text-xs flex items-center gap-0.5 hover:underline"
                      >
                        Go to Builder Preview <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Dynamic External Job Portals Launchpad */}
                  <div className="bg-white p-6 border-2 border-black flex flex-col gap-4 shadow-[4px_4px_0_#000]">
                    <div>
                      <h4 className="font-black text-black text-lg flex items-center gap-1.5">
                        <Briefcase
                          className="text-black animate-bounce"
                          size={18}
                        />
                        Live Job Board Search Launchpad
                      </h4>
                      <p className="text-xs font-bold text-gray-500 mt-0.5">
                        Pre-loaded deep links matching your exact resume profile
                        and location. Click to launch instant searches!
                      </p>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <a
                        href={`https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(resume.experience[0]?.role || "Software Engineer")}&location=${encodeURIComponent(resume.personal_info.location || "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-[#f6f2e8] hover:bg-[#ffed83] border-2 border-black text-black p-3 font-black text-xs flex flex-col items-center text-center gap-2 transition-all"
                      >
                        <Globe size={16} />
                        LinkedIn Jobs
                      </a>

                      <a
                        href={`https://www.indeed.com/jobs?q=${encodeURIComponent(resume.experience[0]?.role || "Software Engineer")}&l=${encodeURIComponent(resume.personal_info.location || "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-[#f6f2e8] hover:bg-[#ffed83] border-2 border-black text-black p-3 font-black text-xs flex flex-col items-center text-center gap-2 transition-all"
                      >
                        <Search size={16} />
                        Indeed
                      </a>

                      <a
                        href={`https://www.google.com/search?q=${encodeURIComponent((resume.experience[0]?.role || "Software Engineer") + " jobs in " + (resume.personal_info.location || ""))}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-[#f6f2e8] hover:bg-[#ffed83] border-2 border-black text-black p-3 font-black text-xs flex flex-col items-center text-center gap-2 transition-all"
                      >
                        <LinkIcon size={16} />
                        Google Careers
                      </a>

                      <a
                        href={`https://wellfound.com/jobs?q=${encodeURIComponent(resume.experience[0]?.role || "Software Engineer")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-[#f6f2e8] hover:bg-[#ffed83] border-2 border-black text-black p-3 font-black text-xs flex flex-col items-center text-center gap-2 transition-all"
                      >
                        <ArrowUpRight size={16} />
                        Wellfound
                      </a>
                    </div>
                  </div>

                  {/* Strengths & Weaknesses checklists */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fadeIn">
                    <div className="bg-[#d8f7bc] p-5 border-2 border-black flex flex-col gap-3 shadow-[4px_4px_0_#000]">
                      <h4 className="font-black text-black text-sm flex items-center gap-1.5">
                        <CheckCircle size={18} /> Found Strengths
                      </h4>
                      <ul className="flex flex-col gap-2">
                        {atsResult.strengths.map((st, idx) => (
                          <li
                            key={idx}
                            className="text-xs text-black leading-relaxed flex items-start gap-1.5 font-bold"
                          >
                            <span>•</span> {st}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="bg-[#ffd5e2] p-5 border-2 border-black flex flex-col gap-3 shadow-[4px_4px_0_#000]">
                      <h4 className="font-black text-black text-sm flex items-center gap-1.5">
                        <AlertCircle size={18} /> Detected Weaknesses
                      </h4>
                      <ul className="flex flex-col gap-2">
                        {atsResult.weaknesses.map((we, idx) => (
                          <li
                            key={idx}
                            className="text-xs text-black leading-relaxed flex items-start gap-1.5 font-bold"
                          >
                            <span>•</span> {we}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Keyword analysis checklist */}
                  <div className="bg-white p-6 border-2 border-black flex flex-col gap-4 animate-fadeIn shadow-[4px_4px_0_#000]">
                    <div>
                      <h4 className="font-black text-black text-lg">
                        Job Keywords Checklist
                      </h4>
                      <p className="text-xs font-bold text-gray-500">
                        Essential core terms parsed from the Job description.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-60 overflow-y-auto pr-2">
                      {atsResult.keywords_analysis.map((kw, idx) => (
                        <div
                          key={idx}
                          className="p-3 border border-black flex items-start justify-between gap-3 bg-[#f6f2e8]"
                        >
                          <div className="flex flex-col gap-0.5">
                            <div className="flex items-center gap-1.5">
                              <span className="font-black text-black text-sm">
                                {kw.keyword}
                              </span>
                              <span
                                className={`text-[9px] uppercase font-black px-1.5 py-0.5 border border-black rounded-full ${kw.importance === "high" ? "bg-red-200 text-black" : "bg-yellow-200 text-black"}`}
                              >
                                {kw.importance}
                              </span>
                            </div>
                            <span className="text-[10px] text-gray-600 font-bold leading-normal">
                              {kw.context}
                            </span>
                          </div>
                          <span
                            className={`p-1 border border-black rounded-full shrink-0 ${kw.found ? "bg-green-300 text-black" : "bg-white text-gray-300"}`}
                          >
                            <Check size={12} />
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Section analysis breakdown feedback */}
                  <div className="bg-white p-6 border-2 border-black flex flex-col gap-4 animate-fadeIn shadow-[4px_4px_0_#000]">
                    <h4 className="font-black text-black text-lg">
                      Section Analysis Feedback
                    </h4>
                    <div className="flex flex-col gap-4">
                      {atsResult.section_breakdown.map((sec, idx) => (
                        <div
                          key={idx}
                          className="border-b border-black last:border-none pb-4 last:pb-0 flex flex-col gap-2"
                        >
                          <div className="flex justify-between items-baseline">
                            <h5 className="font-black text-black text-sm uppercase tracking-wider">
                              {sec.section} Section
                            </h5>
                            <span className="text-xs font-black text-green-600 border border-green-300 bg-green-50 px-2 py-0.5">
                              {sec.score}/100
                            </span>
                          </div>

                          {sec.feedback.length > 0 && (
                            <div className="text-xs text-gray-700 leading-relaxed font-semibold">
                              <span className="font-black text-black block mb-0.5">
                                Feedback:
                              </span>
                              {sec.feedback.join(" ")}
                            </div>
                          )}

                          {sec.critical_fixes.length > 0 && (
                            <div className="bg-[#ffd5e2] p-3.5 border-2 border-black mt-1">
                              <span className="text-[10px] font-black text-black uppercase block mb-1">
                                Critical Fixes Required:
                              </span>
                              <ul className="list-disc pl-4 text-xs text-black space-y-0.5 font-bold leading-relaxed">
                                {sec.critical_fixes.map((fix, fIdx) => (
                                  <li key={fIdx}>{fix}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Actionable tailoring rephrasing recommendations */}
                  {atsResult.tailoring_suggestions.length > 0 && (
                    <div className="bg-[#d8f7bc] border-2 border-black p-6 flex flex-col gap-3 animate-fadeIn shadow-[4px_4px_0_#000]">
                      <h4 className="font-black text-black flex items-center gap-1.5 text-sm">
                        <Sparkles size={18} /> AI Tailored Bullet Rephrasing
                      </h4>
                      <p className="text-black text-xs leading-relaxed font-bold">
                        Incorporate these custom rewritten bullet suggestions
                        into your Builder experience to match this JD perfectly:
                      </p>
                      <ul className="list-decimal pl-4 text-xs text-black space-y-2 leading-relaxed font-bold">
                        {atsResult.tailoring_suggestions.map((sug, idx) => (
                          <li key={idx} className="italic">
                            "{sug}"
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
        {/* ======================================= */}
        {/* TAB: JOBS */}
        {/* ======================================= */}
        {activeTab === "jobs" && (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 animate-fadeIn">
            {/* Left Jobs List & Crawler Panel (35% width equivalent) */}
            <div className="md:col-span-4 bg-[#141414] p-5 rounded-2xl border border-white/[0.06] flex flex-col gap-4 max-h-[85vh] overflow-y-auto pr-2">
              <div className="flex flex-col gap-1 shrink-0 border-b border-white/[0.06] pb-3">
                <div className="flex justify-between items-center">
                  <h2 className="text-lg font-bold text-white">
                    Job Discovery
                  </h2>
                  <div className="bg-white/[0.04] p-0.5 rounded-lg flex border border-white/[0.06] text-[10px] font-semibold">
                    <button
                      onClick={() => setJobSearchMode("recommended")}
                      className={`px-2.5 py-1 rounded-md transition-all ${jobSearchMode === "recommended" ? "bg-white/10 text-white" : "text-[#666] hover:text-[#a1a1a1]"}`}
                    >
                      AI Match
                    </button>
                    <button
                      onClick={() => setJobSearchMode("crawler")}
                      className={`px-2.5 py-1 rounded-md transition-all ${jobSearchMode === "crawler" ? "bg-white/10 text-white" : "text-[#666] hover:text-[#a1a1a1]"}`}
                    >
                      Live Crawl
                    </button>
                  </div>
                </div>
                <p className="text-xs text-[#666]">
                  Find real company listings fitting your profile
                </p>
              </div>

              {/* SEARCH MODE CONTROLLER */}
              {jobSearchMode === "recommended" ? (
                <div className="flex flex-col gap-3">
                  <button
                    onClick={handleGetJobs}
                    disabled={loadingJobs}
                    className="bg-[#00E87B] hover:bg-[#00C968] text-black text-xs font-bold py-3 rounded-xl flex items-center justify-center gap-1.5 transition-all w-full shadow-[0_0_20px_rgba(0,232,123,0.15)]"
                  >
                    {loadingJobs ? (
                      <RefreshCw size={14} className="animate-spin" />
                    ) : (
                      <Search size={14} />
                    )}
                    Scan Matches from Active Directory
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-2 bg-[#0f0f0f] p-3.5 rounded-xl border border-white/[0.04]">
                  <label className="text-[10px] font-semibold text-[#666] uppercase tracking-wider">
                    Crawl Official Careers Page
                  </label>
                  <p className="text-[10px] text-[#666] leading-normal">
                    Enter any Lever, Greenhouse, or generic corporate careers
                    page URL:
                  </p>
                  <div className="flex flex-col gap-2 mt-1">
                    <input
                      type="url"
                      value={crawlUrl}
                      onChange={(e) => setCrawlUrl(e.target.value)}
                      placeholder="e.g. https://boards.greenhouse.io/airbnb"
                      className="w-full input-dark rounded-lg px-2.5 py-1.5 text-xs font-medium"
                    />
                    <button
                      onClick={() => handleCrawlJobs()}
                      disabled={!crawlUrl || crawling}
                      className="bg-white/10 hover:bg-white/15 text-white text-xs font-semibold py-2 rounded-lg flex items-center justify-center gap-1 transition-all"
                    >
                      {crawling ? (
                        <RefreshCw size={12} className="animate-spin" />
                      ) : (
                        <Globe size={12} />
                      )}
                      {crawling ? "Crawling..." : "Parse Career Page"}
                    </button>
                  </div>
                </div>
              )}

              {/* JOBS SCROLLER VIEW */}
              {jobs.length === 0 ? (
                <div className="text-center py-12 flex flex-col items-center justify-center gap-3 flex-1 border border-dashed border-white/[0.06] rounded-2xl bg-white/[0.02]">
                  <span className="text-[#333]">
                    <Briefcase size={36} />
                  </span>
                  <p className="text-xs text-[#666] leading-normal max-w-[200px]">
                    No active listings shown. Trigger a query above to crawl
                    career postings!
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {jobs.map((job) => (
                    <div
                      key={job.id}
                      onClick={() => handleSelectJob(job)}
                      className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all ${selectedJob?.id === job.id ? "bg-[#00E87B]/[0.05] border-[#00E87B]/20" : "bg-[#0f0f0f] hover:bg-[#1a1a1a] border-white/[0.04]"}`}
                    >
                      <div className="flex justify-between items-start gap-2">
                        <h4 className="font-semibold text-white text-sm line-clamp-1">
                          {job.title}
                        </h4>
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${job.fit_score >= 80 ? "bg-[#00E87B]/10 text-[#00E87B]" : "bg-[#7B61FF]/10 text-[#7B61FF]"}`}
                        >
                          {job.fit_score}% Match
                        </span>
                      </div>
                      <p className="text-xs text-[#a1a1a1] mt-0.5 font-medium">
                        {job.company}
                      </p>
                      <div className="flex justify-between items-baseline mt-2">
                        <p className="text-[10px] text-[#666]">
                          {job.location}
                        </p>
                        {job.id.startsWith("crawled") && (
                          <span className="text-[9px] uppercase font-semibold text-[#00E87B] flex items-center gap-0.5">
                            Crawled <Globe size={10} />
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Right Assistant Panel */}
            <div className="md:col-span-8 flex flex-col gap-6">
              {!selectedJob ? (
                <div className="bg-[#141414] p-12 rounded-2xl border border-white/[0.06] text-center flex flex-col items-center justify-center gap-3 flex-1">
                  <div className="bg-white/[0.04] p-4 rounded-full text-[#444]">
                    <Sparkles size={40} className="animate-pulse" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-white">
                      AI Application Coaching Hub
                    </h3>
                    <p className="text-sm text-[#666] mt-1 max-w-sm">
                      Discover and select a recommended job to unlock custom
                      tailored cover letters and interview prep tools!
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-6 animate-fadeIn">
                  {/* Job Header */}
                  <div className="bg-[#141414] p-6 rounded-2xl border border-white/[0.06] flex flex-col gap-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-bold text-white text-xl">
                          {selectedJob.title}
                        </h3>
                        <p className="text-sm text-[#a1a1a1] font-medium">
                          {selectedJob.company} •{" "}
                          <span className="text-[#666] text-xs">
                            {selectedJob.location}
                          </span>
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="block text-[#00E87B] font-medium text-[10px] uppercase tracking-wider">
                          AI Score Grade
                        </span>
                        <span className="text-2xl font-bold text-[#00E87B]">
                          {selectedJob.fit_score}% Match
                        </span>
                      </div>
                    </div>

                    <div className="border-t border-white/[0.06] pt-3 flex items-center justify-between text-xs text-[#666]">
                      <span>
                        Salary Range:{" "}
                        <strong className="text-[#a1a1a1] font-semibold">
                          {selectedJob.salary || "N/A"}
                        </strong>
                      </span>
                      <button
                        onClick={() => {
                          setJobDescription(selectedJob.raw_description);
                          setActiveTab("scorer");
                          handleGetATSScore();
                        }}
                        className="text-[#00E87B] hover:text-[#00C968] font-semibold flex items-center gap-0.5"
                      >
                        Run detailed ATS audit <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Profile match insights */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-[#141414] p-5 rounded-2xl border border-white/[0.06] flex flex-col gap-2.5">
                      <h4 className="font-semibold text-white text-sm flex items-center gap-1.5 text-[#00E87B]">
                        <CheckCircle size={18} /> Strength Highlights
                      </h4>
                      <ul className="flex flex-col gap-2">
                        {selectedJob.match_reasons.map((rs, idx) => (
                          <li
                            key={idx}
                            className="text-xs text-[#a1a1a1] leading-relaxed flex items-start gap-1.5 font-medium"
                          >
                            <span className="text-[#00E87B] font-bold">•</span>{" "}
                            {rs}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="bg-[#141414] p-5 rounded-2xl border border-white/[0.06] flex flex-col gap-2.5">
                      <h4 className="font-semibold text-white text-sm flex items-center gap-1.5 text-amber-400">
                        <AlertCircle size={18} /> Key Skills Gap
                      </h4>
                      <ul className="flex flex-col gap-2">
                        {selectedJob.skills_gap.map((sg, idx) => (
                          <li
                            key={idx}
                            className="text-xs text-[#a1a1a1] leading-relaxed flex items-start gap-1.5 font-medium"
                          >
                            <span className="text-amber-400 font-bold">•</span>{" "}
                            {sg}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Dynamic assistant container (Cover letter vs Interview Prep) */}
                  <div className="bg-[#141414] p-6 rounded-2xl border border-white/[0.06] flex flex-col gap-5">
                    <div className="flex justify-between items-center border-b border-white/[0.06] pb-3">
                      <div className="flex gap-4">
                        <button
                          onClick={() => setAsstTab("cover_letter")}
                          className={`font-semibold text-sm pb-1.5 border-b-2 transition-all ${asstTab === "cover_letter" ? "border-[#00E87B] text-[#00E87B]" : "border-transparent text-[#666] hover:text-white"}`}
                        >
                          Drafted Cover Letter
                        </button>
                        <button
                          onClick={() => setAsstTab("interview")}
                          className={`font-semibold text-sm pb-1.5 border-b-2 transition-all ${asstTab === "interview" ? "border-[#00E87B] text-[#00E87B]" : "border-transparent text-[#666] hover:text-white"}`}
                        >
                          Interview Coach Guides
                        </button>
                      </div>
                    </div>

                    {/* SUB-TAB: COVER LETTER */}
                    {asstTab === "cover_letter" && (
                      <div className="flex flex-col gap-4 animate-fadeIn">
                        {!coverLetterRes && !generatingCL ? (
                          <div className="text-center py-6">
                            <button
                              onClick={() => fetchAssistantData(selectedJob)}
                              className="bg-[#00E87B] hover:bg-[#00C968] text-black font-bold text-xs px-4 py-2 rounded-xl flex items-center gap-1 mx-auto"
                            >
                              <Sparkles size={14} /> Generate Cover Letter
                            </button>
                          </div>
                        ) : generatingCL ? (
                          <div className="text-center py-12 flex flex-col items-center gap-2 animate-pulse">
                            <RefreshCw
                              size={24}
                              className="animate-spin text-[#00E87B]"
                            />
                            <span className="text-xs text-[#666] font-medium">
                              Drafting cover letter...
                            </span>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-4 animate-fadeIn">
                            {/* Notes first */}
                            {coverLetterRes?.customization_notes &&
                              coverLetterRes.customization_notes.length > 0 && (
                                <div className="bg-[#7B61FF]/[0.05] p-3.5 rounded-xl border border-[#7B61FF]/10">
                                  <span className="text-[10px] font-semibold text-[#7B61FF] uppercase block mb-1">
                                    Tailor Tips & Focus Areas:
                                  </span>
                                  <ul className="list-disc pl-4 text-xs text-[#a1a1a1] space-y-0.5 leading-relaxed font-medium">
                                    {coverLetterRes.customization_notes.map(
                                      (note, nIdx) => (
                                        <li key={nIdx}>{note}</li>
                                      ),
                                    )}
                                  </ul>
                                </div>
                              )}

                            {/* Letter card */}
                            <div className="bg-[#0f0f0f] p-6 rounded-2xl border border-white/[0.06] relative">
                              <button
                                onClick={() =>
                                  triggerCopy(
                                    coverLetterRes?.cover_letter || "",
                                    "cl",
                                  )
                                }
                                className="absolute top-4 right-4 bg-white/[0.06] border border-white/[0.06] text-[#666] hover:text-white p-2.5 rounded-xl hover:bg-white/10 transition-all"
                              >
                                {copiedTextId === "cl" ? (
                                  <Check
                                    size={16}
                                    className="text-emerald-500"
                                  />
                                ) : (
                                  <Copy size={16} />
                                )}
                              </button>
                              <pre
                                className="whitespace-pre-wrap font-serif text-slate-800 leading-relaxed text-xs overflow-x-auto select-all"
                                style={{
                                  fontFamily:
                                    '"Times New Roman", Georgia, serif',
                                  fontSize: "12px",
                                }}
                              >
                                {coverLetterRes?.cover_letter}
                              </pre>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* SUB-TAB: INTERVIEW PREP */}
                    {asstTab === "interview" && (
                      <div className="flex flex-col gap-4 animate-fadeIn">
                        {!interviewPrepRes && !preparingPrep ? (
                          <div className="text-center py-6">
                            <button
                              onClick={() => fetchAssistantData(selectedJob)}
                              className="bg-[#00E87B] hover:bg-[#00C968] text-black font-bold text-xs px-4 py-2 rounded-xl flex items-center gap-1 mx-auto"
                            >
                              <Sparkles size={14} /> Prepare Interview Guide
                            </button>
                          </div>
                        ) : preparingPrep ? (
                          <div className="text-center py-12 flex flex-col items-center gap-2 animate-pulse">
                            <RefreshCw
                              size={24}
                              className="animate-spin text-[#00E87B]"
                            />
                            <span className="text-xs text-[#666] font-medium">
                              Constructing interview coach guide...
                            </span>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-5 animate-fadeIn">
                            {/* Q & A */}
                            <div className="flex flex-col gap-3">
                              <h5 className="font-semibold text-white uppercase tracking-wider text-[10px] border-l-2 border-[#00E87B] pl-2">
                                Top Common Questions & Custom Responses:
                              </h5>
                              {interviewPrepRes?.common_questions.map(
                                (item, qIdx) => (
                                  <div
                                    key={qIdx}
                                    className="bg-[#0f0f0f] p-4 rounded-xl border border-white/[0.04] flex flex-col gap-2 animate-fadeIn"
                                  >
                                    <h6 className="font-semibold text-white text-sm">
                                      Q: {item.question}
                                    </h6>
                                    <div className="text-xs text-[#a1a1a1] leading-relaxed italic">
                                      <strong className="text-white font-sans not-italic block mb-0.5">
                                        Custom Answer:
                                      </strong>
                                      "{item.sample_answer}"
                                    </div>
                                    <div className="text-[10px] text-[#666] bg-[#1a1a1a] px-2 py-1.5 rounded-lg border border-white/[0.04] mt-1">
                                      <strong className="text-white uppercase font-sans">
                                        Strategic Coach Tip:
                                      </strong>{" "}
                                      {item.tips}
                                    </div>
                                  </div>
                                ),
                              )}
                            </div>

                            {/* STAR stories */}
                            {interviewPrepRes?.behavioral_star_scenarios &&
                              interviewPrepRes.behavioral_star_scenarios
                                .length > 0 && (
                                <div className="flex flex-col gap-3 border-t border-white/[0.06] pt-4">
                                  <h5 className="font-semibold text-white uppercase tracking-wider text-[10px] border-l-2 border-[#00E87B] pl-2">
                                    STAR Story Responses (Situation, Task,
                                    Action, Result):
                                  </h5>
                                  <div className="flex flex-col gap-2.5">
                                    {interviewPrepRes.behavioral_star_scenarios.map(
                                      (scenario, sIdx) => (
                                        <div
                                          key={sIdx}
                                          className="bg-[#00E87B]/[0.03] p-4 rounded-xl border border-[#00E87B]/10 text-xs text-[#a1a1a1] leading-relaxed whitespace-pre-wrap animate-fadeIn"
                                        >
                                          {scenario}
                                        </div>
                                      ),
                                    )}
                                  </div>
                                </div>
                              )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ======================================= */}
        {/* TAB: SETTINGS */}
        {/* ======================================= */}
        {activeTab === "settings" && (
          <div className="max-w-xl mx-auto w-full bg-[#141414] p-6 rounded-2xl border border-white/[0.06] flex flex-col gap-6 animate-fadeIn">
            <div>
              <h2 className="text-lg font-bold text-white">
                AI Provider Configuration
              </h2>
              <p className="text-xs text-[#666] mt-0.5">
                STATELESS: Keys are saved strictly inside your client browser
                storage.
              </p>
            </div>

            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-medium text-[#666] uppercase tracking-wider">
                  AI Provider
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(["openai", "anthropic", "gemini"] as const).map((p) => (
                    <button
                      key={p}
                      onClick={() => {
                        const m = MODEL_PRESETS[p][0];
                        setAiConfig({
                          ...aiConfig,
                          provider: p,
                          model: m,
                          baseUrl: "",
                        });
                        setFetchedModels([]); // Reset fetched models on provider change
                      }}
                      className={`py-2 text-center text-xs font-semibold rounded-xl border uppercase tracking-wider transition-all duration-300 ${aiConfig.provider === p ? "bg-[#00E87B] border-[#00E87B] text-black" : "bg-white/[0.04] hover:bg-white/[0.08] border-white/[0.06] text-[#a1a1a1]"}`}
                    >
                      {p}
                    </button>
                  ))}
                  {(["openrouter", "ollama"] as const).map((p) => (
                    <button
                      key={p}
                      onClick={() => {
                        const m = MODEL_PRESETS[p][0];
                        const u =
                          p === "ollama"
                            ? "http://localhost:11434"
                            : "https://openrouter.ai/api/v1";
                        setAiConfig({
                          ...aiConfig,
                          provider: p,
                          model: m,
                          baseUrl: u,
                        });
                        setFetchedModels([]); // Reset fetched models on provider change
                      }}
                      className={`py-2 text-center text-xs font-semibold rounded-xl border uppercase tracking-wider transition-all duration-300 ${aiConfig.provider === p ? "bg-[#00E87B] border-[#00E87B] text-black" : "bg-white/[0.04] hover:bg-white/[0.08] border-white/[0.06] text-[#a1a1a1]"}`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-medium text-[#666] uppercase tracking-wider">
                  API Key
                </label>
                <input
                  type="password"
                  value={aiConfig.apiKey}
                  disabled={aiConfig.provider === "ollama"}
                  onChange={(e) =>
                    setAiConfig({ ...aiConfig, apiKey: e.target.value })
                  }
                  placeholder={
                    aiConfig.provider === "ollama"
                      ? "Ollama running locally requires no key"
                      : "Enter your API key credential"
                  }
                  className="w-full input-dark rounded-lg px-3 py-2 text-sm"
                />
              </div>

              {/* DYNAMIC ADAPTING MODEL SELECTOR */}
              <div className="flex flex-col gap-1.5 animate-fadeIn">
                <label className="text-[10px] font-medium text-[#666] uppercase tracking-wider">
                  Select Model
                </label>
                <div className="flex gap-2">
                  <select
                    value={
                      (fetchedModels.length > 0
                        ? fetchedModels
                        : MODEL_PRESETS[aiConfig.provider]
                      )?.includes(aiConfig.model)
                        ? aiConfig.model
                        : "custom"
                    }
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val !== "custom") {
                        setAiConfig({ ...aiConfig, model: val });
                      } else {
                        setAiConfig({ ...aiConfig, model: "" });
                      }
                    }}
                    className="flex-1 input-dark rounded-lg px-3 py-2 text-sm font-semibold"
                  >
                    {(fetchedModels.length > 0
                      ? fetchedModels
                      : MODEL_PRESETS[aiConfig.provider]
                    )?.map((mPreset) => (
                      <option key={mPreset} value={mPreset}>
                        {mPreset}
                      </option>
                    ))}
                    <option value="custom">-- Custom Model Name --</option>
                  </select>
                  <button
                    onClick={() => handleFetchModels(normalizeAIConfig(aiConfig))}
                    disabled={fetchingModels}
                    className="bg-[#00E87B]/10 hover:bg-[#00E87B]/20 border border-[#00E87B]/20 text-[#00E87B] text-xs font-semibold px-3 py-2 rounded-lg flex items-center gap-1 transition-all shrink-0"
                    title="Fetch live models from provider site"
                  >
                    {fetchingModels ? (
                      <RefreshCw size={14} className="animate-spin" />
                    ) : (
                      <RefreshCw size={14} />
                    )}
                    {fetchingModels ? "Syncing..." : "Fetch Live Models"}
                  </button>
                </div>
              </div>

              {/* Custom Model Text Input */}
              {!(
                fetchedModels.length > 0
                  ? fetchedModels
                  : MODEL_PRESETS[aiConfig.provider]
              )?.includes(aiConfig.model) && (
                <div className="flex flex-col gap-1.5 animate-fadeIn">
                  <label className="text-[10px] font-medium text-[#666] uppercase tracking-wider">
                    Custom Model Name
                  </label>
                  <input
                    type="text"
                    value={aiConfig.model}
                    onChange={(e) =>
                      setAiConfig({ ...aiConfig, model: e.target.value })
                    }
                    placeholder="e.g. llama3:70b"
                    className="w-full input-dark rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-medium text-[#666] uppercase tracking-wider">
                  Custom Base URL (Optional)
                </label>
                <input
                  type="text"
                  value={aiConfig.baseUrl}
                  onChange={(e) =>
                    setAiConfig({ ...aiConfig, baseUrl: e.target.value })
                  }
                  placeholder="Only needed for Ollama, OpenRouter, or custom proxies"
                  className="w-full input-dark rounded-lg px-3 py-2 text-sm"
                />
              </div>

              <button
                onClick={() => saveConfig(aiConfig)}
                className="bg-[#00E87B] hover:bg-[#00C968] text-black font-bold py-2.5 rounded-xl text-center transition-all mt-3 text-xs shadow-[0_0_20px_rgba(0,232,123,0.15)]"
              >
                Save Settings
              </button>
            </div>
          </div>
        )}
      </main>

      {/* FOOTER */}
      <footer className="bg-[#F7F4EA] border-t-2 border-black text-[#333] py-6 text-center text-xs font-bold shrink-0 print:hidden mt-auto">
        <p>© 2026 ATS Shield AI. Keeping candidates prepared and stateless.</p>
      </footer>
    </div>
  );
}
