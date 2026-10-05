/**
 * Role and level vocabulary for Interview Prep and the career tabs.
 *
 * There is no list of allowed careers. The role is whatever the learner is going
 * for — their getting-started answer, or anything they type — and the coach
 * understands any job. This file used to hold a closed list of 18 fields, half
 * of them tech, plus an industry → field substring map that sent security guards
 * to cyber security and food production to product management. What remains is
 * only vocabulary that is genuinely fixed:
 *  - a broad seed of example roles, shown as suggestions when nothing better is known;
 *  - the career levels exactly as profiles store them, with plain labels.
 */
import { CAREER_LEVELS } from "@/hooks/useUserProfile";

/** Example roles across the whole workforce. Suggestions only — never a limit. */
export const POPULAR_ROLES: readonly string[] = [
  // Trades and construction
  "Electrician",
  "Plumber",
  "Carpenter",
  "Diesel Mechanic",
  "Construction Labourer",
  // Health and care
  "Registered Nurse",
  "Aged Care Worker",
  "Disability Support Worker",
  "Pharmacy Assistant",
  "Medical Receptionist",
  // Hospitality and retail
  "Chef",
  "Barista",
  "Retail Assistant",
  "Hospitality Manager",
  // Education and community
  "Primary School Teacher",
  "Early Childhood Educator",
  "Youth Worker",
  // Business and office
  "Administration Officer",
  "Accountant",
  "Customer Service Officer",
  "Sales Representative",
  "Marketing Coordinator",
  "Human Resources Officer",
  // Transport and logistics
  "Truck Driver",
  "Warehouse Worker",
  // Technology
  "Software Engineer",
  "IT Support Officer",
  "Data Analyst",
];

/** Labels that read right for a tradie or a nurse as much as an office worker. */
const PLAIN_LEVEL_LABELS: Record<string, string> = {
  entry: "Starting out (apprentice, graduate, entry level)",
  mid: "Experienced",
  senior: "Senior",
  lead: "Lead or supervisor",
  manager: "Manager",
  director: "Director",
  vp: "Executive",
  "c-level": "Chief executive or owner",
};

/** Career levels as `profiles.career_level` stores them (shared with Settings), with plain labels. */
export const CAREER_LEVEL_OPTIONS: ReadonlyArray<{ value: string; label: string }> = CAREER_LEVELS.map((l) => ({
  value: l.value,
  label: PLAIN_LEVEL_LABELS[l.value] ?? l.label,
}));

/**
 * What to call a level: the job's own name for it when the coach supplied one
 * ("Apprentice" for an electrician's entry level), otherwise the plain label.
 */
export function levelLabel(value: string | null | undefined, jobLevels?: Partial<Record<string, string>>): string {
  if (!value) return "Any level";
  return jobLevels?.[value] ?? CAREER_LEVEL_OPTIONS.find((o) => o.value === value)?.label ?? value;
}
