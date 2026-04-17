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
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
