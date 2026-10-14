export interface Resume {
  id: string;
  name: string;
  content: any;
  created_at: string;
  updated_at: string;
  tags?: string[];
  is_favorite?: boolean;
  category?: string;
  job_title?: string;
  target_company?: string;
  ats_score?: number;
  last_analyzed_at?: string;
  template_id?: string;
}

export type ViewMode = "grid" | "list";
export type SortKey = "date" | "name" | "updated";
export type SortOrder = "asc" | "desc";

export interface ResumeCategory {
  id: string;
  label: string;
}

export const RESUME_CATEGORIES: ResumeCategory[] = [
  { id: "general", label: "General" },
  { id: "tech", label: "Tech / IT" },
  { id: "business", label: "Business" },
  { id: "creative", label: "Creative" },
  { id: "academic", label: "Academic" },
];

export const PRESET_TAGS = [
  "Full-time",
  "Part-time",
  "Remote",
  "Hybrid",
  "Contract",
  "Entry-level",
  "Mid-level",
  "Senior",
  "Executive",
  "Updated",
  "Draft",
  "Final",
  "Submitted",
];

export function getCategory(id?: string | null): ResumeCategory {
  return RESUME_CATEGORIES.find((c) => c.id === id) ?? RESUME_CATEGORIES[0];
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** "edited today", "edited 3 days ago", "edited 21 Sept". */
export function editedLabel(iso: string): string {
  const day = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((day(new Date()) - day(new Date(iso))) / 86_400_000);
  if (days <= 0) return "edited today";
  if (days === 1) return "edited yesterday";
  if (days < 14) return `edited ${days} days ago`;
  return `edited ${new Date(iso).toLocaleDateString("en-AU", { day: "numeric", month: "short" })}`;
}

/** ATS score in words and a colour band, or null when it was never checked. */
export function scoreBand(score: number | null | undefined): { label: string; tone: "good" | "fair" | "low" } | null {
  if (typeof score !== "number") return null;
  if (score >= 80) return { label: `ATS ${score}`, tone: "good" };
  if (score >= 60) return { label: `ATS ${score}`, tone: "fair" };
  return { label: `ATS ${score}`, tone: "low" };
}
