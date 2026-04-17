export type ApplicationStatus = "applied" | "interview" | "offer" | "rejected";

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
}

export interface ResumeRef {
  id: string;
  name: string;
}

export interface CoverLetterRef {
  id: string;
  content: string;
  created_at: string;
}

export type StatusFilter = ApplicationStatus | "all";

export interface StatusMeta {
  id: ApplicationStatus;
  label: string;
  kicker: string;
  pill: "default" | "rust" | "filled";
  verb: string;
}

/** Editorial metadata for each application status. */
export const STATUS_META: Record<ApplicationStatus, StatusMeta> = {
  applied: {
    id: "applied",
    label: "Applied",
    kicker: "§ Dispatches sent",
    pill: "default",
    verb: "Log an application",
  },
  interview: {
    id: "interview",
    label: "Interview",
    kicker: "§ Replies received",
    pill: "rust",
    verb: "Record the call",
  },
  offer: {
    id: "offer",
    label: "Offer",
    kicker: "§ Offers on the table",
    pill: "filled",
    verb: "Record the offer",
  },
  rejected: {
    id: "rejected",
    label: "Rejected",
    kicker: "§ Letters of regret",
    pill: "default",
    verb: "File a rejection",
  },
};

export const STATUS_ORDER: ApplicationStatus[] = [
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
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
