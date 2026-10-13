/* Filters applied to the jobs already loaded, so they're instant and only ever
   say what's true of what's on screen. The board itself only searches by
   words and place: Adzuna labels a job full-time or part-time and nothing
   else, so casual, contract and seniority go by the ad's own wording. */

import type { JobCatalogJob } from "@/features/job-tracker/types";

export type RefineKey =
  | "full-time"
  | "part-time"
  | "casual"
  | "contract"
  | "remote"
  | "pay"
  | "week"
  | "entry";

export interface RefineChip {
  key: RefineKey;
  label: string;
  /** Shown on hover, for the chips that read the ad's wording. */
  hint?: string;
  test: (job: JobCatalogJob) => boolean;
}

const text = (j: JobCatalogJob) => `${j.title} ${j.description_snippet ?? ""}`;
const DAY = 86_400_000;

export const REFINE_CHIPS: RefineChip[] = [
  { key: "full-time", label: "Full-time", test: (j) => j.job_type === "full-time" },
  { key: "part-time", label: "Part-time", test: (j) => j.job_type === "part-time" },
  {
    key: "casual",
    label: "Casual",
    hint: "Going by the ad's wording",
    test: (j) => /\bcasual\b/i.test(text(j)),
  },
  {
    key: "contract",
    label: "Contract",
    hint: "Going by the ad's wording",
    test: (j) => j.job_type === "contract" || /\b(contract|fixed[- ]term|temp(orary)?)\b/i.test(text(j)),
  },
  { key: "remote", label: "Remote", test: (j) => j.is_remote },
  {
    key: "pay",
    label: "Pay listed",
    hint: "The employer put a figure in the ad",
    test: (j) => Boolean(j.salary_min || j.salary_max) && !j.salary_is_predicted,
  },
  {
    key: "week",
    label: "This week",
    test: (j) => Boolean(j.posted_at) && Date.now() - new Date(j.posted_at as string).getTime() < 7 * DAY,
  },
  {
    key: "entry",
    label: "Grad & entry",
    hint: "Going by the job title",
    test: (j) => /\b(graduate|grad|junior|jnr|entry|trainee|intern(ship)?|apprentice(ship)?|cadet)\b/i.test(j.title),
  },
];

/** Work-type chips are alternatives (any of them); the rest must all hold. */
const EITHER: RefineKey[] = ["full-time", "part-time", "casual", "contract"];

export function applyRefine(jobs: JobCatalogJob[], active: Set<RefineKey>): JobCatalogJob[] {
  if (active.size === 0) return jobs;
  const chips = REFINE_CHIPS.filter((c) => active.has(c.key));
  const either = chips.filter((c) => EITHER.includes(c.key));
  const all = chips.filter((c) => !EITHER.includes(c.key));
  return jobs.filter(
    (j) => (either.length === 0 || either.some((c) => c.test(j))) && all.every((c) => c.test(j)),
  );
}

/** How many loaded jobs each chip would match on its own. */
export function chipCounts(jobs: JobCatalogJob[]): Record<RefineKey, number> {
  const out = {} as Record<RefineKey, number>;
  for (const c of REFINE_CHIPS) out[c.key] = jobs.filter(c.test).length;
  return out;
}
