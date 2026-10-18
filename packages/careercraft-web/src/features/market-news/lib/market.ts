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

const STATE_SHORT: Record<string, string> = {
  "new south wales": "NSW",
  victoria: "VIC",
  queensland: "QLD",
  "western australia": "WA",
  "south australia": "SA",
  tasmania: "TAS",
  "australian capital territory": "ACT",
  "northern territory": "NT",
};
export const shortPlace = (name: string) => STATE_SHORT[name.toLowerCase()] ?? name;

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
