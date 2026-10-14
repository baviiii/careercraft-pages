/* "In this search": a few plain facts worked out from the jobs on screen.
   No model, no market-wide claims. Estimated pay is Adzuna's guess, not the
   employer's, so it's left out of the pay figure. */

import type { JobCatalogJob } from "@/features/job-tracker/types";

export interface SearchSummary {
  total: number;
  /** Ads where the employer stated pay, at any rate (yearly, hourly, daily). */
  payListed: number;
  /** Of those, the ones giving a yearly figure. */
  payStated: number;
  /** Middle half of stated pay, annual, when at least 3 ads give a figure. */
  typicalPay: [number, number] | null;
  topCompanies: { name: string; count: number }[];
  fullTime: number;
  partTime: number;
  remote: number;
  thisWeek: number;
}

const DAY = 86_400_000;
/* Stand-in names for hidden advertisers. They aren't one company hiring. */
const PLACEHOLDER = /^(unknown company|company|confidential|private advertiser)$/i;

function quantile(sorted: number[], q: number): number {
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

export function summarise(jobs: JobCatalogJob[]): SearchSummary {
  const listed = jobs.filter((j) => !j.salary_is_predicted && (j.salary_min || j.salary_max));
  const stated = listed
    .map((j) => {
      const lo = j.salary_min ?? j.salary_max ?? 0;
      const hi = j.salary_max ?? j.salary_min ?? 0;
      return (lo + hi) / 2;
    })
    /* Hourly and daily rates sneak in as tiny "annual" figures. */
    .filter((mid) => mid >= 20_000)
    .sort((a, b) => a - b);

  const counts = new Map<string, number>();
  for (const j of jobs) {
    if (!j.company || PLACEHOLDER.test(j.company.trim())) continue;
    counts.set(j.company, (counts.get(j.company) ?? 0) + 1);
  }
  const topCompanies = [...counts.entries()]
    .filter(([, n]) => n > 1)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([name, count]) => ({ name, count }));

  const now = Date.now();
  return {
    total: jobs.length,
    payListed: listed.length,
    payStated: stated.length,
    typicalPay: stated.length >= 3 ? [quantile(stated, 0.25), quantile(stated, 0.75)] : null,
    topCompanies,
    fullTime: jobs.filter((j) => j.job_type === "full-time").length,
    partTime: jobs.filter((j) => j.job_type === "part-time").length,
    remote: jobs.filter((j) => j.is_remote).length,
    thisWeek: jobs.filter((j) => j.posted_at && now - new Date(j.posted_at).getTime() < 7 * DAY).length,
  };
}

/** "$85k", rounded to the nearest thousand. */
export const k = (n: number) => `$${Math.round(n / 1000)}k`;

/** "$85k–$95k", "$35–$40 an hour", or the bare figures. Some ads quote an
    hourly, daily or weekly rate in the salary fields; only an hourly rate is
    obvious from the number, so anything else small shows without a unit
    rather than guessing one. */
export function payLabel(j: JobCatalogJob): string | null {
  const lo = j.salary_min || j.salary_max;
  const hi = j.salary_max || j.salary_min;
  if (!lo || !hi) return null;
  if (hi < 20_000) {
    const $ = (n: number) => `$${Math.round(n).toLocaleString("en-AU")}`;
    const amount = lo === hi ? $(lo) : `${$(lo)}–${$(hi)}`;
    return hi <= 200 ? `${amount} an hour` : amount;
  }
  return Math.round(lo / 1000) === Math.round(hi / 1000) ? k(lo) : `${k(lo)}–${k(hi)}`;
}

const TYPE_LABEL: Record<string, string> = { "full-time": "Full-time", "part-time": "Part-time", contract: "Contract" };

/** "Full-time", "Part-time", or the board's word with a capital. */
export const typeLabel = (t: string) => TYPE_LABEL[t] ?? t.charAt(0).toUpperCase() + t.slice(1).replace(/_/g, " ");

/** "today", "yesterday", "3 days ago", "2 weeks ago". */
export function postedLabel(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / DAY);
  if (Number.isNaN(days)) return null;
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 14) return `${days} days ago`;
  if (days < 60) return `${Math.floor(days / 7)} weeks ago`;
  return `${Math.floor(days / 30)} months ago`;
}
