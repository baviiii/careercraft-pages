export type ApplicationStatus = "saved" | "applied" | "interview" | "offer" | "rejected";

export type JobType =
  | "full-time"
  | "part-time"
  | "contract"
  | "remote"
  | "hybrid";

export interface JobApplication {
  id: string;
  job_title: string;
  company: string;
  status: ApplicationStatus;
  notes: string | null;
  reminder_date: string | null;
  /** When the interview is booked; Interview Prep counts down to it. Absent before its migration. */
  interview_date?: string | null;
  applied_date: string;
  created_at: string;
  updated_at: string;
  resume_id: string | null;
  cover_letter_id: string | null;
  job_description: string | null;
  job_url: string | null;
  salary_range: string | null;
  location: string | null;
  job_type: string | null;
  fit_score_latest?: number | null;
  last_status_change_at?: string | null;
}

export interface JobCatalogJob {
  id: string;
  source: string;
  source_job_id: string | null;
  canonical_url: string | null;
  title: string;
  company: string;
  location: string | null;
  salary_min: number | null;
  salary_max: number | null;
  currency: string | null;
  job_type: string | null;
  is_remote: boolean;
  /** The board's classification, e.g. "Healthcare & Nursing Jobs". */
  category: string | null;
  /** True when the board predicted the salary instead of the employer stating it. */
  salary_is_predicted: boolean;
  /** Closeness to the user's profile, 0-1, attached server-side by job-search. */
  similarity?: number;
  description_snippet: string | null;
  /* Was `full_description`. Adzuna never sent a full description — see the
     note in supabase/functions/job-search/index.ts. */
  posted_at: string | null;
}

/* `JobFitScore` described rows written by the deleted job-fit-score function.
   Its `model` column was always null, which is the shape of the whole thing:
   there was no model. The `job_fit_scores` table still exists and still holds
   whatever was written before this change — dropping it needs a migration and
   a decision about those rows, so it is deliberately left alone. Nothing reads
   it now; the ATS check goes through /analysis. */

export interface ApplicationEvent {
  id: string;
  application_id: string;
  source: string;
  event_type: string;
  summary: string;
  confidence: number | null;
  payload: Record<string, unknown>;
  auto_applied: boolean;
  occurred_at: string;
  created_at: string;
}

export interface ResumeRef {
  id: string;
  name: string;
}

export interface CoverLetterRef {
  id: string;
  title: string | null;
  content: string;
  created_at: string;
}

export type StatusFilter = ApplicationStatus | "all";

export interface StatusMeta {
  id: ApplicationStatus;
  label: string;
}

/** What each stage is called on the board, in filters and in the form. */
export const STATUS_META: Record<ApplicationStatus, StatusMeta> = {
  /* Found it, haven't applied yet. Kept out of the reply rate. */
  saved: { id: "saved", label: "Saved" },
  applied: { id: "applied", label: "Applied" },
  interview: { id: "interview", label: "Interview" },
  offer: { id: "offer", label: "Offer" },
  rejected: { id: "rejected", label: "Didn't work out" },
};

export const STATUS_ORDER: ApplicationStatus[] = [
  "saved",
  "applied",
  "interview",
  "offer",
  "rejected",
];

export const JOB_TYPE_OPTIONS: { value: JobType; label: string }[] = [
  { value: "full-time", label: "Full-time" },
  { value: "part-time", label: "Part-time" },
  { value: "contract", label: "Contract" },
  { value: "remote", label: "Remote" },
  { value: "hybrid", label: "Hybrid" },
];

export interface JobFormValues {
  jobTitle: string;
  company: string;
  status: ApplicationStatus;
  notes: string;
  reminderDate: string;
  interviewDate: string;
  jobDescription: string;
  jobUrl: string;
  salaryRange: string;
  jobLocation: string;
  jobType: JobType | "";
  selectedResumeId: string;
  selectedCoverLetterId: string;
}

export const EMPTY_FORM: JobFormValues = {
  jobTitle: "",
  company: "",
  status: "applied",
  notes: "",
  reminderDate: "",
  interviewDate: "",
  jobDescription: "",
  jobUrl: "",
  salaryRange: "",
  jobLocation: "",
  jobType: "",
  selectedResumeId: "",
  selectedCoverLetterId: "",
};

export function appToForm(app: JobApplication): JobFormValues {
  return {
    jobTitle: app.job_title,
    company: app.company,
    status: app.status,
    notes: app.notes || "",
    reminderDate: app.reminder_date ? app.reminder_date.split("T")[0] : "",
    interviewDate: app.interview_date ? app.interview_date.split("T")[0] : "",
    jobDescription: app.job_description || "",
    jobUrl: app.job_url || "",
    salaryRange: app.salary_range || "",
    jobLocation: app.location || "",
    jobType: (app.job_type as JobType) || "",
    selectedResumeId: app.resume_id || "",
    selectedCoverLetterId: app.cover_letter_id || "",
  };
}

export function formatAppliedDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-AU", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
