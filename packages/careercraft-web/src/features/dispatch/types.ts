/* ───────────────────────────────────────────────────────────
   Dispatch — the personalized Home feed.

   One ranked stream mixing two sources: career news articles
   (job-news / news_articles) and live roles from the market
   (job-search → Adzuna). Both are normalised to `DispatchItem`
   so ranking and rendering stay source-agnostic.
   ─────────────────────────────────────────────────────────── */

/** Raw article shape returned by the `fetch_news` edge action. */
export interface NewsArticle {
  id: string;
  title: string;
  description: string;
  url: string;
  source: string;
  publishedAt: string;
  category: string;
  imageUrl?: string | null;
  readTime?: string;
}

/** Why an item earned its place — the transparency cue behind every card. */
export interface RelevanceNote {
  /** 0-100ish; raw personalization score before recency weighting. */
  score: number;
  /** Human-readable causes, e.g. "Your industry", "2 skills mentioned". */
  reasons: string[];
  /** Ranking score actually used for ordering (score + recency). */
  rank: number;
}

interface DispatchItemBase {
  /** Stable key for React and for dedupe. */
  key: string;
  relevance: RelevanceNote;
  /** ISO timestamp used for the dateline and recency decay. */
  timestamp: string | null;
  /** Outbound link. */
  url: string | null;
}

export interface DispatchStory extends DispatchItemBase {
  kind: "story";
  title: string;
  standfirst: string;
  source: string;
  category: string;
  imageUrl: string | null;
  readTime: string | null;
}

export interface DispatchRole extends DispatchItemBase {
  kind: "role";
  title: string;
  company: string;
  location: string | null;
  isRemote: boolean;
  salary: string | null;
  snippet: string | null;
}

export type DispatchItem = DispatchStory | DispatchRole;

/** A single active ranking input, surfaced in the tuning bar. */
export interface TuningSignal {
  id: string;
  label: string;
  /** Which part of the profile this came from — drives the chip's tone. */
  kind: "role" | "location" | "industry" | "skill" | "company";
}
