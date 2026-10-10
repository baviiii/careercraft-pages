export type LetterTone = "professional" | "confident" | "casual";

/** The tones the `rewrite-resume` cover-letter prompt understands. */
export const TONES: { value: LetterTone; label: string }[] = [
  { value: "professional", label: "Professional" },
  { value: "confident", label: "Confident" },
  { value: "casual", label: "Casual" },
];

export const toTone = (value: string | null | undefined): LetterTone =>
  value === "confident" || value === "casual" ? value : "professional";

export interface SavedLetter {
  id: string;
  title: string | null;
  content: string;
  job_description: string | null;
  tone: string | null;
  category: string | null;
  tags: string[] | null;
  notes: string | null;
  resume_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ResumeOption {
  id: string;
  name: string;
  content: unknown;
}

/** A tracked application, as far as cover letters care about it. */
export interface LetterApplication {
  id: string;
  job_title: string;
  company: string;
  cover_letter_id: string | null;
  resume_id: string | null;
  job_description: string | null;
  job_url: string | null;
}

/** What the details dialog edits, on save and afterwards. */
export interface LetterDetails {
  title: string;
  category: string;
  tags: string[];
  notes: string;
}

/* Below this an ad is an extract, not the ad. Same rule and reasoning as the
   tracker's ATS hand-off (JobDetailPanel): job boards return ~200 characters. */
export const FULL_AD_CHARS = 400;
