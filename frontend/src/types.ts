export interface PersonalInfo {
  name: string;
  email: string;
  phone: string;
  location: string;
  linkedin: string;
  github: string;
  website: string;
}

export interface WorkExperience {
  company: string;
  role: string;
  start_date: string;
  end_date: string;
  description: string[];
}

export interface Education {
  institution: string;
  degree: string;
  major: string;
  graduation_date: string;
  gpa: string;
}

export interface SkillCategory {
  category: string;
  skills: string[];
}

export interface Project {
  name: string;
  role: string;
  technologies: string[];
  description: string[];
  link: string;
}

export interface Certification {
  name: string;
  issuer: string;
  date: string;
}

export interface Resume {
  personal_info: PersonalInfo;
  summary: string;
  experience: WorkExperience[];
  education: Education[];
  skills: SkillCategory[];
  projects: Project[];
  certifications: Certification[];
}

export interface SectionScore {
  section: string;
  score: number;
  feedback: string[];
  critical_fixes: string[];
}

export interface KeywordMatch {
  keyword: string;
  found: boolean;
  importance: "high" | "medium" | "low";
  context: string;
}

export interface HighlightSuggestion {
  section: "summary" | "experience" | "skills" | "projects" | "education";
  item_index: number;
  bullet_index?: number | null;
  original_text: string;
  suggested_text: string;
  explanation: string;
}

export interface ATSScoreResult {
  overall_score: number;
  formatting_score: number;
  keyword_score: number;
  experience_score: number;
  section_breakdown: SectionScore[];
  keywords_analysis: KeywordMatch[];
  highlights: HighlightSuggestion[];
  strengths: string[];
  weaknesses: string[];
  tailoring_suggestions: string[];
}

export interface JobRecommendation {
  id: string;
  title: string;
  company: string;
  location: string;
  salary?: string;
  fit_score: number;
  match_reasons: string[];
  skills_gap: string[];
  description_summary: string;
  raw_description: string;
}

export interface CoverLetterResponse {
  cover_letter: string;
  customization_notes: string[];
}

export interface QAPair {
  question: string;
  sample_answer: string;
  tips: string;
}

export interface InterviewPrepResponse {
  common_questions: QAPair[];
  behavioral_star_scenarios: string[];
}

export interface AIConfig {
  provider: "openai" | "anthropic" | "gemini" | "openrouter" | "ollama";
  apiKey: string;
  model: string;
  baseUrl: string;
}
