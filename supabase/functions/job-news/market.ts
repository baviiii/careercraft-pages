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
  /**
   * Of `missing`, the figures Adzuna refused (a request it won't answer,
   * such as a figure it doesn't keep for this search): asking again gets
   * the same answer. The rest timed out, were rate-limited or hit a server
   * error, and may come back.
   */
  refused?: MarketPart[];
  /**
   * Fetches running that have left a gap that may come back; each one
   * doubles the wait before the next (keepFor). Absent on rows stored
   * before this existed.
   */
  misses?: number;
  /** Which figures were asked for (pay by month only for every job). */
  asked?: MarketPart[];
}

export type MarketPart = "count" | "bands" | "companies" | "places" | "history";
export const MARKET_PARTS: readonly MarketPart[] = ["count", "bands", "companies", "places", "history"];

/**
 * The role as Adzuna will search it. Its `what` needs every word to appear
 * and doesn't split on punctuation, so "Full-Stack" would miss "Full Stack"
 * ads. Also the cache key (lower-cased), so the two spellings share a row.
 */
export function normaliseRole(role: string): string {
  const what = role.replace(/[-–—/]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 120);
  // No letter or digit ("*", "?") is no role: every job, and its cache row
  // ("*") can't be taken by a search for "*".
  return /[\p{L}\p{N}]/u.test(what) ? what : "";
}

/** Adzuna answered, and the answer is no: the same request gets the same answer. */
export class AdzunaRefusal extends Error {}

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
      const why = `Adzuna ${path}: ${body?.display ?? body?.exception ?? `HTTP ${res.status}`}`;
      // A rate limit (429), a server error, or a problem with the account
      // (401, 403: a key or an allowance) may pass, whatever the body says;
      // an answer that refuses the request itself (an `exception` on a 200,
      // or another 4xx) won't.
      const mayPass = res.status === 401 || res.status === 403 || res.status === 429 || res.status >= 500;
      const refused = !mayPass && (Boolean(body?.exception) || res.status >= 400);
      throw refused ? new AdzunaRefusal(why) : new Error(why);
    }
    return body;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Four or five requests in parallel. Each figure stands alone, so one that
 * fails leaves a gap on the page rather than an error, and `partial` says
 * so. Pay by month is asked for only for every job: Adzuna's history takes
 * a place and a category, not words (developer.adzuna.com/docs/historical),
 * and refuses a role.
 */
export async function adzunaSnapshot(role: string, appId: string, appKey: string): Promise<MarketSnapshot> {
  const what = normaliseRole(role);
  const q: Record<string, string> = what ? { what } : {};
  const none = Promise.resolve(null);

  const asked: MarketPart[] = what ? ["count", "bands", "companies", "places"] : [...MARKET_PARTS];
  const [search, histogram, top, geo, history] = await Promise.allSettled([
    get("search/1", { ...q, results_per_page: "1" }, appId, appKey),
    get("histogram", q, appId, appKey),
    get("top_companies", q, appId, appKey),
    get("geodata", q, appId, appKey),
    asked.includes("history") ? get("history", { months: "12" }, appId, appKey) : none,
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
  const refused = parts
    .filter(([, r]) => r.status === "rejected" && r.reason instanceof AdzunaRefusal)
    .map(([part]) => part);

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
    refused,
    asked,
  };
}

/**
 * Fill the parts a new answer is missing from an older one, so a single
 * failing endpoint doesn't throw away figures we already had. What still
 * can't be filled stays missing, and counts as a miss unless Adzuna
 * refused it.
 */
export function fillFrom(fresh: MarketSnapshot, older: MarketSnapshot | null | undefined): MarketSnapshot {
  const had = new Set(older?.missing ?? []);
  const merged = { ...fresh };
  const still: MarketPart[] = [];
  for (const part of fresh.missing) {
    if (!older || had.has(part)) {
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
  const refused = (fresh.refused ?? []).filter((part) => still.includes(part));
  const mayComeBack = still.some((part) => !refused.includes(part));
  const before = older?.misses ?? (older?.partial ? 1 : 0);
  return {
    ...merged,
    missing: still,
    refused,
    partial: still.length > 0,
    misses: mayComeBack ? before + 1 : 0,
  };
}

/**
 * How long a stored answer is reused before Adzuna is asked again. Complete,
 * or with only refusals missing: the full time. With a gap that may come
 * back: `retryMs`, doubling with each miss running, up to the full time.
 * Four requests per role (five for every job), out of an allowance every
 * job search shares.
 */
export function keepFor(s: MarketSnapshot, fullMs: number, retryMs: number): number {
  if (!s.partial) return fullMs;
  const misses = s.misses ?? 1;
  return misses > 0 ? Math.min(fullMs, retryMs * 2 ** (misses - 1)) : fullMs;
}

/**
 * How many fresh snapshots may be fetched, each four Adzuna requests out of
 * the allowance every job search on the site shares (Adzuna's standard
 * limits are 25 requests a minute and 250 a day). Counted from the stored
 * rows' fetch times: each role keeps one row and is fetched about once a
 * day, so rows fetched in the last day are close to the fetches made; a gap
 * retried within the day is undercounted. Raise these if the account's
 * limits are higher.
 */
export const RATION = { perMinute: 2, perHour: 8, perDay: 20 };

export function overRation(fetchedAts: string[], now: number, ration = RATION): boolean {
  const ages = fetchedAts.map((t) => now - Date.parse(t)).filter((age) => age >= 0);
  const within = (ms: number) => ages.filter((age) => age < ms).length;
  return within(60_000) >= ration.perMinute || within(3_600_000) >= ration.perHour || within(86_400_000) >= ration.perDay;
}

/** Every request failed, and not all of them were refused: Adzuna is down, or the key or the
    allowance is (401, 403 and 429 may pass). Every request refused is this one request, not Adzuna. */
export function isOutage(s: MarketSnapshot): boolean {
  const asked = s.asked ?? MARKET_PARTS;
  return asked.every((part) => s.missing.includes(part)) && asked.some((part) => !(s.refused ?? []).includes(part));
}

/** Nothing usable came back at all. */
export const isEmptySnapshot = (s: MarketSnapshot) =>
  s.total === null && s.salaryBands.length === 0 && s.companies.length === 0 && s.places.length === 0 &&
  s.salaryHistory.length === 0;

/** What serving a snapshot needs from outside, so a test can fake it. */
export interface SnapshotDeps {
  /** The stored answer for the role, and when it was fetched. */
  stored(): Promise<{ snapshot: MarketSnapshot; fetchedAt: string } | null>;
  /** When each answer stored in the last day was fetched (the ration). */
  recent(): Promise<string[]>;
  /** Take one from the person's plan quota; throws when it's spent. */
  charge(): Promise<unknown>;
  /** Ask Adzuna. */
  fetch(): Promise<MarketSnapshot>;
  /** Keep an answer. */
  save(snapshot: MarketSnapshot): Promise<void>;
}

export type SnapshotAnswer =
  | { kind: "snapshot"; snapshot: MarketSnapshot }
  /** The ration is spent: new roles wait. */
  | { kind: "resting" }
  /** Adzuna can't be asked just now, and nothing is stored. */
  | { kind: "unreachable" };

export interface SnapshotPolicy {
  /** How long a complete answer is reused. */
  fullMs: number;
  /** The first wait before a gap that may come back is asked about again. */
  retryMs: number;
  /** How long to stop asking after every request failed, or a role came back empty. */
  backoffMs: number;
  /** The longest one request holds the queue (a call that never settles can't block the rest). */
  slotMs?: number;
  ration?: typeof RATION;
}

/**
 * One instance's snapshot server. The order matters and is tested
 * (market_test.ts): a stored answer still fresh is served; otherwise, while
 * Adzuna is backed off, or this role came back empty a moment ago, or the
 * ration is spent, the stored answer is served however old (or nothing,
 * said as such); otherwise the request waits its turn (one fetch at a time
 * per instance, so a burst of new roles can't spend four requests each at
 * once), looks again in case the role was fetched meanwhile, is charged to
 * the person's quota (a spent quota serves the stored answer if there is
 * one), and asks Adzuna.
 */
export function snapshotServer(policy: SnapshotPolicy, now: () => number = Date.now) {
  let backoffUntil = 0;
  const emptyUntil = new Map<string, number>();
  /** Fetches that stored nothing (empty, or an outage), which the stored rows can't count. */
  let unsaved: number[] = [];
  let queue: Promise<unknown> = Promise.resolve();
  const oneAtATime = <T>(task: () => Promise<T>): Promise<T> => {
    const run = queue.then(task);
    let timer: number | undefined;
    const slot = new Promise<void>((resolve) => {
      timer = setTimeout(resolve, policy.slotMs ?? 20_000);
    });
    queue = Promise.race([run, slot])
      .catch(() => undefined)
      .finally(() => clearTimeout(timer));
    return run;
  };
  const answer = (snapshot: MarketSnapshot): SnapshotAnswer => ({ kind: "snapshot", snapshot });

  /** An answer that needs no fetch, if there is one, and the stored answer to fall back on. */
  async function withoutFetching(key: string, deps: SnapshotDeps) {
    const row = await deps.stored();
    const older = row?.snapshot;
    const age = row ? now() - Date.parse(row.fetchedAt) : Infinity;
    if (older && age < keepFor(older, policy.fullMs, policy.retryMs)) return { done: answer(older), older };
    if (now() < backoffUntil || (emptyUntil.get(key) ?? 0) > now()) {
      return { done: older ? answer(older) : ({ kind: "unreachable" } as const), older };
    }
    unsaved = unsaved.filter((t) => now() - t < 86_400_000);
    const fetched = [...(await deps.recent()), ...unsaved.map((t) => new Date(t).toISOString())];
    if (overRation(fetched, now(), policy.ration)) {
      return { done: older ? answer(older) : ({ kind: "resting" } as const), older };
    }
    return { done: null, older };
  }

  return async function serve(key: string, deps: SnapshotDeps): Promise<SnapshotAnswer> {
    const first = await withoutFetching(key, deps);
    if (first.done) return first.done;
    return await oneAtATime(async () => {
      // Another request may have fetched this role, or spent the ration, meanwhile.
      const { done, older } = await withoutFetching(key, deps);
      if (done) return done;
      try {
        await deps.charge();
      } catch (e) {
        if (older) return answer(older);
        throw e;
      }
      const fresh = await deps.fetch();
      if (isEmptySnapshot(fresh)) {
        unsaved.push(now());
        if (isOutage(fresh)) {
          backoffUntil = now() + policy.backoffMs;
        } else {
          for (const [k, until] of emptyUntil) if (until <= now()) emptyUntil.delete(k);
          emptyUntil.set(key, now() + policy.backoffMs);
        }
        return older ? answer(older) : { kind: "unreachable" };
      }
      const snapshot = fillFrom(fresh, older);
      await deps.save(snapshot);
      return answer(snapshot);
    });
  };
}
