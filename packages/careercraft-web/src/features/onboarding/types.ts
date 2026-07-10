export type OnboardingMode = 'resume' | 'describe' | 'hybrid';
export type OnboardingSource = 'resume' | 'describe' | 'hybrid' | 'skipped';

export interface OnboardingPersona {
  archetype: string;
  seniority: 'student' | 'entry' | 'mid' | 'senior' | 'lead' | 'principal' | 'exec';
  function: string;
  subFunction: string | null;
  vertical: string | null;
  narrative: string;
}

export interface OnboardingInferredProfile {
  full_name: string | null;
  phone: string | null;
  headline: string | null;
  bio: string | null;
  current_job_title: string | null;
  current_company: string | null;
  years_of_experience: string | null;
  industry: string | null;
  career_level: string | null;
  location_city: string | null;
  location_country: string | null;
  employment_status: string | null;
}

export interface OnboardingTargets {
  target_job_titles: string[];
  target_companies: string[];
  preferred_locations: string[];
  work_arrangement: string[];
  desired_salary_min: number | null;
  desired_salary_max: number | null;
  desired_salary_currency: string | null;
  job_change_timeline: string | null;
}

export interface OnboardingJobPreferences {
  industries: string[];
  job_types: string[];
  company_sizes: string[];
  remote_preference: string;
  min_salary: number | null;
}

export interface OnboardingSkill {
  name: string;
  category: string;
  proficiency: string;
  years_experience: number | null;
}

export interface OnboardingCertification {
  name: string;
  issuer: string | null;
  issue_date: string | null;
  expiry_date: string | null;
}

export interface OnboardingCVStandards {
  recommended_length: string;
  format: string;
  ats_notes: string[];
  improvements: string[];
}

export interface OnboardingAnalysis {
  persona: OnboardingPersona;
  inferredProfile: OnboardingInferredProfile;
  targets: OnboardingTargets;
  jobPreferences: OnboardingJobPreferences;
  skills: OnboardingSkill[];
  certifications: OnboardingCertification[];
  cvStandards: OnboardingCVStandards;
  confidence: {
    overall: number;
    persona: number;
    skills: number;
  };
}

export interface OnboardAnalyzeResponse {
  ok: boolean;
  runId: string;
  analysis: OnboardingAnalysis;
  runsRemaining: number;
  /** Set only on legacy / unexpected responses. Errors normally arrive via FunctionsHttpError. */
  error?: string;
}
