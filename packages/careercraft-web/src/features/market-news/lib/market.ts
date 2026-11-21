/* "Your market": the figures job-news returns for one role
   (supabase/functions/job-news/market.ts), and the words for them. */

export interface MarketSnapshot {
  role: string;
  total: number | null;
  averageSalary: number | null;
  salaryBands: Array<{ from: number; count: number }>;
  companies: Array<{ name: string; count: number; averageSalary: number | null }>;
  places: Array<{ name: string; count: number }>;
  salaryHistory: Array<{ month: string; average: number }>;
  fetchedAt: string;
  partial: boolean;
}

/** Each state and territory by name, to its short form. A Map, so a name
    like "constructor" is just a name. */
export const STATE_NAMES: ReadonlyMap<string, string> = new Map([
  ["new south wales", "NSW"],
  ["victoria", "VIC"],
  ["queensland", "QLD"],
  ["western australia", "WA"],
  ["south australia", "SA"],
  ["tasmania", "TAS"],
  ["australian capital territory", "ACT"],
  ["northern territory", "NT"],
]);

/** "NSW" from "New South Wales", or from "New South Wales, Australia" as Adzuna sends it. */
export function shortPlace(name: string): string {
  const state = name.replace(/,\s*australia\s*$/i, "").trim();
  return STATE_NAMES.get(state.toLowerCase()) ?? state;
}

/** The role as job-news keys its cache (its normaliseRole, lower-cased), so
    this page's cache agrees with it: "Full-Stack" and "full stack" are one.
    job-news/market_test.ts holds the two together. */
export function roleKey(role: string): string {
  const what = role
    .replace(/[-–—/]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
  // No letter or digit ("*", "?") is no role: every job.
  return /[\p{L}\p{N}]/u.test(what) ? what.toLowerCase() : "";
}

/** $92k, or $92.4k when the decimal matters for a comparison. */
export function money(n: number, precise = false): string {
  if (n >= 1000) {
    const k = n / 1000;
    return `$${precise && k < 1000 ? k.toFixed(1).replace(/\.0$/, "") : Math.round(k)}k`;
  }
  return `$${Math.round(n)}`;
}

export const count = (n: number) => new Intl.NumberFormat("en-AU").format(n);

/** "Nov 2025" from "2025-11". */
export function monthLabel(ym: string, short = false): string {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1, 1));
  return new Intl.DateTimeFormat("en-AU", { month: "short", year: short ? "2-digit" : "numeric", timeZone: "UTC" }).format(d);
}

/** Each band as "$80k–$100k"; the last one has no top. */
export function bandRows(bands: MarketSnapshot["salaryBands"]) {
  return bands.map((b, i) => ({
    label: bands[i + 1] ? `${money(b.from)}–${money(bands[i + 1].from)}` : `${money(b.from)}+`,
    value: b.count,
  }));
}

/** The band the middle ad falls in, by count. Null with no bands. */
export function middleBand(bands: MarketSnapshot["salaryBands"]): number | null {
  const total = bands.reduce((s, b) => s + b.count, 0);
  if (total === 0) return null;
  let seen = 0;
  for (let i = 0; i < bands.length; i++) {
    seen += bands[i].count;
    if (seen >= total / 2) return i;
  }
  return bands.length - 1;
}
