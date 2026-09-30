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

export interface JobAutomationSettings {
  email_sync_enabled: boolean;
  confidence_threshold: number;
  auto_apply_non_destructive: boolean;
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

export type StatusPillVariant =
  | "default"
  | "rust"
  | "filled"
  | "signal"
  | "signal-filled"
  | "rust-soft";

export interface StatusMeta {
  id: ApplicationStatus;
  label: string;
  kicker: string;
  pill: StatusPillVariant;
  verb: string;
}

/** Editorial metadata for each application status. */
export const STATUS_META: Record<ApplicationStatus, StatusMeta> = {
  applied: {
    id: "applied",
    label: "Applied",
    kicker: "§ Applied",
    pill: "signal",
    verb: "Log an application",
  },
  interview: {
    id: "interview",
    label: "Interview",
    kicker: "§ Interview",
    pill: "rust",
    verb: "Log an interview",
  },
  offer: {
    id: "offer",
    label: "Offer",
    kicker: "§ Offer",
    pill: "signal-filled",
    verb: "Log an offer",
  },
  rejected: {
    id: "rejected",
    label: "Rejected",
    kicker: "§ Rejected",
    pill: "rust-soft",
    verb: "Log a rejection",
  },
};

/** Maps status metadata to Craft pill classes (list cards + detail panel). */
export function statusPillClass(status: ApplicationStatus): string {
  switch (STATUS_META[status].pill) {
    case "filled":
      return "cc-pill cc-pill-filled";
    case "rust":
      return "cc-pill cc-pill-rust";
    case "signal":
      return "cc-pill cc-pill-signal";
    case "signal-filled":
      return "cc-pill cc-pill-signal cc-pill-filled";
    case "rust-soft":
      return "cc-pill cc-pill-rust-soft";
    default:
      return "cc-pill";
  }
}

/* ───────── Per-status accent palette ──────────────────────────
   Every status earns its own colour identity so cards, chips and
   ledger glyphs share one visual language. Values resolve at runtime
   so they inherit any later theme changes from design-system.css.
   ──────────────────────────────────────────────────────────── */
export interface StatusAccent {
  /** 4-px edge band drawn on the JobCard left side. */
  edge: string;
  /** Soft tinted background for chips, lane headers, dot fills. */
  soft: string;
  /** Deep type colour used against soft fills for legibility. */
  deep: string;
  /** Single-glyph mark used in the ledger summary glyph row. */
  mark: string;
  /** Lowercase noun phrase for italic captions ("awaiting reply"). */
  note: string;
}

export const STATUS_ACCENT: Record<ApplicationStatus, StatusAccent> = {
  applied: {
    edge: "var(--cc-signal)",
    soft: "var(--cc-signal-soft)",
    deep: "var(--cc-signal-deep)",
    mark: "A",
    note: "awaiting reply",
  },
  interview: {
    edge: "var(--cc-rust)",
    soft: "var(--cc-rust-soft)",
    deep: "var(--cc-rust-deep)",
    mark: "I",
    note: "in conversation",
  },
  offer: {
    edge: "var(--cc-wheat-deep)",
    soft: "var(--cc-wheat-soft)",
    deep: "var(--cc-wheat-deep)",
    mark: "O",
    note: "decision pending",
  },
  rejected: {
    edge: "var(--cc-ash)",
    soft: "rgba(116, 106, 96, 0.14)",
    deep: "var(--cc-ash)",
    mark: "R",
    note: "closed entry",
  },
};

/** Lowercase roman numerals — used for ledger glyphs (i, ii, iii, …, xxx). */
const ROMAN_ONES = ["", "i", "ii", "iii", "iv", "v", "vi", "vii", "viii", "ix"];
const ROMAN_TENS = ["", "x", "xx", "xxx", "xl", "l", "lx", "lxx", "lxxx", "xc"];
export function toRoman(value: number): string {
  if (value <= 0) return "·";
  if (value >= 100) return String(value);
  return `${ROMAN_TENS[Math.floor(value / 10)]}${ROMAN_ONES[value % 10]}`;
}

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
