/**
 * Single source of truth for career field + seniority labels used across
 * Interview Prep, Career Guidance, Certifications, and profile mapping.
 */

export const CAREER_FIELDS = [
  "Software Engineering",
  "DevOps / SRE",
  "Cloud / AWS",
  "Data Science",
  "Data Engineering",
  "Security",
  "Networking",
  "IT Support",
  "Product Management",
  "UX/UI Design",
  "Sales",
  "Marketing",
  "Finance",
  "Healthcare / Nursing",
  "Human Resources",
  "Legal",
  "Operations",
  "Customer Success",
] as const;

export type CareerField = (typeof CAREER_FIELDS)[number];

export const CAREER_SENIORITY = [
  "Junior",
  "Mid-Level",
  "Senior",
  "Lead",
  "Manager",
  "Director",
  "VP",
  "C-Level",
] as const;

export type CareerSeniority = (typeof CAREER_SENIORITY)[number];

/** Maps legacy / alternate labels to the canonical list (handles old saved values). */
const FIELD_ALIASES: Record<string, CareerField> = {
  "DevOps & SRE": "DevOps / SRE",
  "Data Science & ML": "Data Science",
};

export function normalizeCareerField(value: string | undefined | null): string {
  if (!value) return "";
  const trimmed = value.trim();
  if (FIELD_ALIASES[trimmed]) return FIELD_ALIASES[trimmed];
  if (isCareerField(trimmed)) return trimmed;
  return trimmed;
}

export function isCareerField(value: string): value is CareerField {
  return (CAREER_FIELDS as readonly string[]).includes(value);
}

export function isCareerSeniority(value: string): value is CareerSeniority {
  return (CAREER_SENIORITY as readonly string[]).includes(value);
}

/** Profile industry keywords → canonical field (used by personalization defaults). */
export const INDUSTRY_TO_CAREER_FIELD: Record<string, CareerField> = {
  technology: "Software Engineering",
  software: "Software Engineering",
  devops: "DevOps / SRE",
  cloud: "Cloud / AWS",
  data: "Data Science",
  "data engineering": "Data Engineering",
  security: "Security",
  networking: "Networking",
  "it support": "IT Support",
  product: "Product Management",
  design: "UX/UI Design",
  sales: "Sales",
  marketing: "Marketing",
  finance: "Finance",
  healthcare: "Healthcare / Nursing",
  hr: "Human Resources",
  legal: "Legal",
  operations: "Operations",
  "customer success": "Customer Success",
};

/** Profile career level keywords → canonical seniority. */
export const CAREER_LEVEL_TO_SENIORITY: Record<string, CareerSeniority> = {
  entry: "Junior",
  junior: "Junior",
  mid: "Mid-Level",
  senior: "Senior",
  lead: "Lead",
  manager: "Manager",
  director: "Director",
  vp: "VP",
  executive: "C-Level",
};

export function mapIndustryToCareerField(industry: string): string {
  const lower = industry.toLowerCase();
  const hit = Object.entries(INDUSTRY_TO_CAREER_FIELD).find(([key]) => lower.includes(key));
  return hit?.[1] ?? industry;
}

export function mapCareerLevelToSeniority(level: string): CareerSeniority | undefined {
  const lower = level.toLowerCase();
  const hit = Object.entries(CAREER_LEVEL_TO_SENIORITY).find(([key]) => lower.includes(key));
  return hit?.[1];
}
