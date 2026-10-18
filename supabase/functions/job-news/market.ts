// One role's job market across Australia, from Adzuna's own statistics.
//
// This replaced fetch_trends and fetch_insights. Those blended Adzuna's 50 AU
// ads with Remotive (remote jobs worldwide) and Arbeitnow (mostly Germany),
// counted roles by substring (so "ai" matched every "email"), and read
// "growth vs last year" from a hard-coded table, with a coin flip for any
// role it didn't list. Everything here is a figure Adzuna computes over every
// live Australian ad for the role, and the page says so.

const BASE = "https://api.adzuna.com/v1/api/jobs/au";
const TIMEOUT_MS = 8000;

export interface MarketSnapshot {
  /** What was searched, as typed. Empty means every job in Australia. */
  role: string;
  /** Live ads matching the role. */
  total: number | null;
  /** Adzuna's mean advertised salary across those ads, in AUD a year. */
  averageSalary: number | null;
  /** Ads per salary band, lowest first; `from` is the band's lower edge. */
  salaryBands: Array<{ from: number; count: number }>;
  /** Employers with the most ads, most first. */
  companies: Array<{ name: string; count: number; averageSalary: number | null }>;
  /** Ads per state or territory, most first. */
  places: Array<{ name: string; count: number }>;
  /** Mean advertised salary per month, oldest first. */
  salaryHistory: Array<{ month: string; average: number }>;
  fetchedAt: string;
  /** True when at least one of the figures didn't come back. */
  partial: boolean;
  /** Which figures didn't come back, so a later answer can fill them in. */
  missing: MarketPart[];
}

export type MarketPart = "count" | "bands" | "companies" | "places" | "history";

/**
 * The role as Adzuna will search it. Its `what` needs every word to appear
 * and doesn't split on punctuation, so "Full-Stack" would miss "Full Stack"
 * ads. Also the cache key (lower-cased), so the two spellings share a row.
 */
export const normaliseRole = (role: string) =>
  role.replace(/[-–—/]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 120);

const num = (v: unknown): number | null => {
  const n = typeof v === "string" ? Number(v) : v;
  return typeof n === "number" && Number.isFinite(n) ? n : null;
};

// deno-lint-ignore no-explicit-any
async function get(path: string, params: Record<string, string>, appId: string, appKey: string): Promise<any> {
  const url = new URL(`${BASE}/${path}`);
  url.searchParams.set("app_id", appId);
  url.searchParams.set("app_key", appKey);
  for (const [k, v] of Object.entries(params)) if (v) url.searchParams.set(k, v);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal, headers: { Accept: "application/json" } });
    const body = await res.json().catch(() => null);
    // Adzuna answers some failures with 200 and an `exception` field.
    if (!res.ok || !body || body.exception) {
      throw new Error(`Adzuna ${path}: ${body?.display ?? body?.exception ?? `HTTP ${res.status}`}`);
    }
    return body;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Five requests in parallel. Each figure stands alone, so one that fails
 * leaves a gap on the page rather than an error, and `partial` says so.
 */
export async function adzunaSnapshot(role: string, appId: string, appKey: string): Promise<MarketSnapshot> {
  const what = normaliseRole(role);
  const q: Record<string, string> = what ? { what } : {};

  const [search, histogram, top, geo, history] = await Promise.allSettled([
    get("search/1", { ...q, results_per_page: "1" }, appId, appKey),
    get("histogram", q, appId, appKey),
    get("top_companies", q, appId, appKey),
    get("geodata", q, appId, appKey),
    get("history", { ...q, months: "12" }, appId, appKey),
  ]);
  [search, histogram, top, geo, history].forEach((r) => {
    if (r.status === "rejected") console.error("[market]", r.reason instanceof Error ? r.reason.message : r.reason);
  });
  // deno-lint-ignore no-explicit-any
  const value = (r: PromiseSettledResult<any>) => (r.status === "fulfilled" ? r.value : null);

  const s = value(search);
  const bands = Object.entries((value(histogram)?.histogram ?? {}) as Record<string, unknown>)
    .map(([from, count]) => ({ from: num(from), count: num(count) }))
    .filter((b): b is { from: number; count: number } => b.from !== null && b.count !== null)
    .sort((a, b) => a.from - b.from);

  // deno-lint-ignore no-explicit-any
  const companies = ((value(top)?.leaderboard ?? []) as any[])
    .map((c) => ({ name: String(c?.canonical_name ?? "").trim(), count: num(c?.count) ?? 0, averageSalary: num(c?.average_salary) }))
    .filter((c) => c.name && c.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  // deno-lint-ignore no-explicit-any
  const places = ((value(geo)?.locations ?? []) as any[])
    .map((l) => ({ name: String(l?.location?.display_name ?? "").trim(), count: num(l?.count) ?? 0 }))
    .filter((p) => p.name && p.count > 0)
    .sort((a, b) => b.count - a.count);

  const salaryHistory = Object.entries((value(history)?.month ?? {}) as Record<string, unknown>)
    .map(([month, average]) => ({ month, average: num(average) }))
    .filter((m): m is { month: string; average: number } => /^\d{4}-\d{2}$/.test(m.month) && m.average !== null && m.average > 0)
    .sort((a, b) => a.month.localeCompare(b.month))
    .slice(-12);

  const parts: Array<[MarketPart, PromiseSettledResult<unknown>]> = [
    ["count", search],
    ["bands", histogram],
    ["companies", top],
    ["places", geo],
    ["history", history],
  ];
  const missing = parts.filter(([, r]) => r.status === "rejected").map(([part]) => part);

  return {
    role,
    total: num(s?.count),
    averageSalary: num(s?.mean),
    salaryBands: bands,
    companies,
    places,
    salaryHistory,
    fetchedAt: new Date().toISOString(),
    partial: missing.length > 0,
    missing,
  };
}

/**
 * Fill the parts a new answer is missing from an older one, so a single
 * failing endpoint doesn't throw away figures we already had. What still
 * can't be filled stays missing.
 */
export function fillFrom(fresh: MarketSnapshot, older: MarketSnapshot | null | undefined): MarketSnapshot {
  if (!older || fresh.missing.length === 0) return fresh;
  const had = new Set(older.missing ?? []);
  const merged = { ...fresh };
  const still: MarketPart[] = [];
  for (const part of fresh.missing) {
    if (had.has(part)) {
      still.push(part);
      continue;
    }
    if (part === "count") {
      merged.total = older.total;
      merged.averageSalary = older.averageSalary;
    } else if (part === "bands") merged.salaryBands = older.salaryBands;
    else if (part === "companies") merged.companies = older.companies;
    else if (part === "places") merged.places = older.places;
    else if (part === "history") merged.salaryHistory = older.salaryHistory;
  }
  return { ...merged, missing: still, partial: still.length > 0 };
}

/** Nothing usable came back at all. */
export const isEmptySnapshot = (s: MarketSnapshot) =>
  s.total === null && s.salaryBands.length === 0 && s.companies.length === 0 && s.places.length === 0 &&
  s.salaryHistory.length === 0;
