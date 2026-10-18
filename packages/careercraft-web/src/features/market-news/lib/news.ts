/* Market News: what a story is, which topic it's filed under, and how the
   "For you" order is worked out.

   The order is the profile scorer every news surface shares
   (usePersonalization().scoreArticle: industry, target role, companies you
   follow, skills, closeness by meaning) plus one thing only this page knows:
   whether a story names a company already in the person's tracker. Recency
   fades everything, so a strong match from two months ago doesn't sit above
   this week's news forever. Nothing is hidden; a story that matches nothing
   just sorts by date. */

import { containsTerm } from "@/lib/containsTerm";

export interface NewsArticle {
  id: string;
  title: string;
  description: string;
  url: string;
  /** The publication. Empty on a few old rows, where the link's host stands in. */
  source: string;
  publishedAt: string;
  category: string;
  imageUrl?: string | null;
  /** Closeness to the profile by meaning, 0-1, attached by job-news. */
  similarity?: number;
}

/** The topics job-news files stories under (supabase/functions/job-news/feeds.ts). */
export const TOPICS = [
  { value: "all", label: "All", noun: "" },
  { value: "hiring", label: "Hiring", noun: "hiring" },
  { value: "pay", label: "Pay", noun: "pay" },
  { value: "layoffs", label: "Job cuts", noun: "job-cut" },
  { value: "visas", label: "Visas", noun: "visa" },
  { value: "ai", label: "AI", noun: "AI" },
  { value: "skills", label: "Skills & study", noun: "skills and study" },
  { value: "workplace", label: "Workplace", noun: "workplace" },
] as const;
export type Topic = (typeof TOPICS)[number]["value"];

export const topicLabel = (category: string) =>
  TOPICS.find((t) => t.value === category && t.value !== "all")?.label ?? null;

export const RANGES = [
  { value: 7, label: "Past week", short: "week" },
  { value: 30, label: "Past month", short: "month" },
  { value: 90, label: "Past 3 months", short: "3 months" },
] as const;
export type RangeDays = (typeof RANGES)[number]["value"];

export function publisher(a: NewsArticle): string {
  if (a.source) return a.source;
  try {
    return new URL(a.url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

/* ── The tracker ───────────────────────────────────────────── */

/** Legal endings no headline uses. */
const LEGAL_SUFFIX = /[,\s]+(pty\.?|ltd\.?|limited|inc\.?|corporation|corp\.?|co\.?|plc|holdings)$/i;
/** Endings headlines often drop ("KPMG Australia" is "KPMG" in the news). */
const SOFT_SUFFIX = /\s+(australia|group|services)$/i;
/** Words that only name an organisation with the ending still on:
    "Services Australia", "Engineers Australia", "Health Services". */
const GENERIC = new Set([
  "services", "engineers", "tourism", "health", "education", "energy", "water", "transport", "security",
  "solutions", "consulting", "finance", "construction", "property", "retail", "care", "legal", "recruitment",
  "digital", "media", "mining", "logistics", "people", "careers", "jobs", "national", "australian", "community",
  "housing", "sport", "food", "foods", "power", "capital", "global", "united", "group", "first", "new", "royal",
]);
/** Tracker rows whose "company" isn't one. */
const NOT_A_COMPANY = /^(confidential|private advertiser|anonymous|recruitment agency|various|n\/?a|unknown|self)$/i;

/** Company names from the tracker, as they'd appear in a headline. */
export function trackedCompanyNames(companies: Array<string | null | undefined>): string[] {
  const names = new Set<string>();
  for (const raw of companies) {
    let name = (raw ?? "").trim();
    // Repeatedly: "Acme Holdings Pty Ltd" has three.
    for (let i = 0; i < 3; i++) name = name.replace(LEGAL_SUFFIX, "").trim();
    const short = name.replace(SOFT_SUFFIX, "").trim();
    if (short !== name && short.length >= 3 && !GENERIC.has(short.toLowerCase())) name = short;
    if (name.length >= 2 && !NOT_A_COMPANY.test(name) && !GENERIC.has(name.toLowerCase())) names.add(name);
  }
  return [...names];
}

/** The first tracked company the story names, as a whole word. */
export function trackedCompanyIn(text: string, names: string[]): string | null {
  return names.find((name) => containsTerm(text, name)) ?? null;
}

/* ── Ranking ───────────────────────────────────────────────── */

export interface StoryFit {
  /** Why it's near the top, in words. Empty when nothing matched. */
  reasons: string[];
  /** A company from the tracker that the story names. */
  trackedCompany: string | null;
  /** Ordering key for "For you". */
  rank: number;
}

/** A company you've applied to outranks any profile signal. */
const TRACKED_POINTS = 30;
/** Days for a story's weight to fall to about a third. */
const FADE_DAYS = 14;

type ScoreArticle = (a: {
  title?: string;
  description?: string;
  category?: string;
  similarity?: number;
}) => { score: number; reasons: string[] };

export function fitStory(a: NewsArticle, scoreArticle: ScoreArticle | null, tracked: string[]): StoryFit {
  const text = `${a.title}. ${a.description}`;
  const trackedCompany = trackedCompanyIn(text, tracked);
  const base = scoreArticle ? scoreArticle(a) : { score: 0, reasons: [] };
  const score = base.score + (trackedCompany ? TRACKED_POINTS : 0);
  const ageDays = Math.max(0, (Date.now() - new Date(a.publishedAt).getTime()) / 86_400_000);
  return {
    reasons: base.reasons,
    trackedCompany,
    rank: (score + 8) * Math.exp(-ageDays / FADE_DAYS),
  };
}
