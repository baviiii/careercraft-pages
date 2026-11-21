import * as browser from "../../../packages/careercraft-web/src/features/market-news/lib/market.ts";

import {
  adzunaSnapshot,
  fillFrom,
  isOutage,
  keepFor,
  normaliseRole,
  overRation,
  snapshotServer,
  type MarketPart,
  type MarketSnapshot,
  type SnapshotDeps,
} from "./market.ts";

const eq = (got: unknown, want: unknown, why: string) => {
  if (JSON.stringify(got) !== JSON.stringify(want)) {
    throw new Error(`${why}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
  }
};

const HOUR = 3_600_000;
/** As job-news keeps a complete answer: a day. */
const FULL = 24 * HOUR;

/** An answer with every figure, minus the ones named; `refused` of those, Adzuna said no to. */
const answer = (missing: MarketPart[] = [], refused: MarketPart[] = []): MarketSnapshot => ({
  role: "Full Stack Developer",
  total: missing.includes("count") ? null : 250,
  averageSalary: missing.includes("count") ? null : 125_672,
  salaryBands: missing.includes("bands") ? [] : [{ from: 80_000, count: 4 }],
  companies: missing.includes("companies") ? [] : [{ name: "Leidos", count: 4, averageSalary: null }],
  places: missing.includes("places") ? [] : [{ name: "New South Wales, Australia", count: 106 }],
  salaryHistory: missing.includes("history") ? [] : [{ month: "2026-10", average: 120_000 }],
  fetchedAt: "2026-11-20T00:00:00Z",
  partial: missing.length > 0,
  missing,
  refused,
});

const kept = (s: MarketSnapshot) => keepFor(s, FULL, HOUR) / HOUR;

Deno.test("a complete answer is kept the full time", () => {
  eq(kept(fillFrom(answer(), null)), 24, "hours");
});

Deno.test("a gap that may come back is retried after 1, 2, 4, 8, 16, then 24 hours", () => {
  let stored = fillFrom(answer(["count"]), null);
  const waits = [kept(stored)];
  for (let i = 0; i < 6; i++) {
    stored = fillFrom(answer(["count"]), stored);
    waits.push(kept(stored));
  }
  eq(waits, [1, 2, 4, 8, 16, 24, 24], "hours between tries");
  eq(stored.missing, ["count"], "still missing");
});

Deno.test("a figure Adzuna refused waits the full time, first time too", () => {
  const first = fillFrom(answer(["history"], ["history"]), null);
  eq(first.partial, true, "partial, so the page knows");
  eq(kept(first), 24, "not asked again within the day");
  eq(kept(fillFrom(answer(["history"], ["history"]), first)), 24, "nor the time after");
});

Deno.test("once it comes back, the waits start over", () => {
  let stored = fillFrom(answer(["count"]), null);
  stored = fillFrom(answer(["count"]), stored);
  eq(kept(stored), 2, "second miss");
  stored = fillFrom(answer(), stored);
  eq([stored.partial, stored.misses, kept(stored)], [false, 0, 24], "complete again");
  stored = fillFrom(answer(["count"]), stored);
  eq([stored.total, stored.partial, kept(stored)], [250, false, 24], "the next gap is filled from before");
});

Deno.test("a gap the older answer can fill is filled, and the answer is complete", () => {
  const older = fillFrom(answer(), null);
  const stored = fillFrom(answer(["bands"]), older);
  eq(stored.salaryBands, older.salaryBands, "bands from before");
  eq(stored.partial, false, "complete");
  eq(kept(stored), 24, "kept");
});

Deno.test("a refusal beside a gap that may come back is retried soon, for the latter", () => {
  const stored = fillFrom(answer(["history", "count"], ["history"]), null);
  eq(stored.refused, ["history"], "refused");
  eq(kept(stored), 1, "count retried soon");
});

Deno.test("a row stored before misses existed is retried after an hour, as before", () => {
  const old = answer(["history"]);
  delete old.refused;
  eq(kept(old), 1, "hours");
});

Deno.test("new roles are rationed per minute, hour and day", () => {
  const now = Date.parse("2026-11-21T12:00:00Z");
  const ago = (ms: number) => new Date(now - ms).toISOString();
  eq(overRation([], now), false, "nothing fetched");
  eq(overRation([ago(10_000)], now), false, "one this minute");
  eq(overRation([ago(10_000), ago(20_000)], now), true, "two this minute");
  eq(overRation(Array.from({ length: 7 }, (_, i) => ago((i + 2) * 60_000)), now), false, "seven this hour");
  eq(overRation(Array.from({ length: 8 }, (_, i) => ago((i + 2) * 60_000)), now), true, "eight this hour");
  eq(overRation(Array.from({ length: 19 }, (_, i) => ago((i + 1) * HOUR)), now), false, "nineteen today");
  eq(overRation(Array.from({ length: 20 }, (_, i) => ago((i + 1) * HOUR)), now), true, "twenty today");
  eq(overRation([ago(25 * HOUR), "not a date"], now), false, "older than a day, or unreadable, don't count");
});

/** Runs adzunaSnapshot against a fake Adzuna, one answer per endpoint; returns what it asked for. */
async function withFakeAdzuna(
  role: string,
  answers: Record<string, () => Promise<Response>>,
  check: (s: MarketSnapshot) => void,
): Promise<string[]> {
  const real = globalThis.fetch;
  const asked: string[] = [];
  globalThis.fetch = ((input: URL | RequestInfo) => {
    const url = new URL(String(input));
    const path = url.pathname.split("/").slice(5).join("/");
    asked.push(`${path}${url.searchParams.has("what") ? "?what" : ""}`);
    return (answers[path] ?? reply({}))();
  }) as typeof fetch;
  try {
    check(await adzunaSnapshot(role, "id", "key"));
  } finally {
    globalThis.fetch = real;
  }
  return asked;
}
const reply = (body: unknown, status = 200) => () => Promise.resolve(new Response(JSON.stringify(body), { status }));
const adzunaError = { exception: "SOMETHING", display: "Something went wrong", doc: "https://api.adzuna.com/" };

Deno.test("a rate limit, a server error or an account problem may pass, whatever the body", async () => {
  await withFakeAdzuna(
    "Full Stack Developer",
    {
      "search/1": reply(adzunaError, 401),
      histogram: reply(adzunaError, 503),
      top_companies: reply(adzunaError, 429),
      geodata: reply(adzunaError, 403),
    },
    (s) => {
      eq(s.missing, ["count", "bands", "companies", "places"], "missing");
      eq(s.refused, [], "none refused");
      eq(isOutage(s), true, "every request failed");
    },
  );
});

Deno.test("a refusal is an exception on a 200, or another 4xx", async () => {
  await withFakeAdzuna(
    "Full Stack Developer",
    {
      "search/1": reply({ count: 250, mean: 125_672 }),
      histogram: reply(adzunaError),
      top_companies: reply(adzunaError, 400),
      geodata: () => Promise.reject(new TypeError("network down")),
    },
    (s) => {
      eq(s.total, 250, "count came back");
      eq(s.missing, ["bands", "companies", "places"], "missing");
      eq(s.refused, ["bands", "companies"], "the 200 with an exception and the 400");
      eq(isOutage(s), false, "the count came back");
    },
  );
});

Deno.test("pay by month is asked for every job only, never with a role's words", async () => {
  const forRole = await withFakeAdzuna("Nurse", { history: reply({ month: { "2026-10": 1 } }) }, (s) => {
    eq(s.asked, ["count", "bands", "companies", "places"], "asked");
    eq([s.missing, s.salaryHistory], [[], []], "no gap for it");
  });
  eq(forRole.some((a) => a.startsWith("history")), false, "history not asked for a role");
  const forAll = await withFakeAdzuna(
    "",
    { history: reply({ month: { "2026-09": 90_000, "2026-10": 91_000, "2026-11": 92_000 } }) },
    (s) => eq(s.salaryHistory.length, 3, "history for every job"),
  );
  eq(forAll.includes("history"), true, "asked without words");
});

Deno.test("an outage is every request asked failing, not every request refused", () => {
  const four: MarketPart[] = ["count", "bands", "companies", "places"];
  eq(isOutage({ ...answer(four, four), asked: four }), false, "all refused: this request, not Adzuna");
  eq(isOutage({ ...answer(four), asked: four }), true, "all may pass (a key, an allowance, Adzuna down)");
  eq(isOutage({ ...answer(["count", "bands"]), asked: four }), false, "some came back");
  eq(isOutage(answer(["count", "bands", "companies", "places", "history"])), true, "rows from before: all five");
});

/* ── Serving: the order of the steps (snapshotServer) ───────────────── */

const T0 = Date.parse("2026-11-21T12:00:00Z");

interface World {
  stored?: MarketSnapshot;
  storedAt?: number;
  reply?: MarketSnapshot;
  recent?: string[];
  quotaSpent?: boolean;
  /** A role whose quota call never settles. */
  hangs?: string;
  slotMs?: number;
}

/** A fake world: a store, Adzuna and the quota, counting what's spent. */
function world(opts: World = {}) {
  let clock = T0;
  const rows = new Map<string, { snapshot: MarketSnapshot; fetchedAt: string }>();
  if (opts.stored) rows.set("nurse", { snapshot: opts.stored, fetchedAt: new Date(opts.storedAt ?? T0).toISOString() });
  const spent = { fetches: 0, charges: 0 };
  const server = snapshotServer({ fullMs: FULL, retryMs: HOUR, backoffMs: 10 * 60_000, slotMs: opts.slotMs }, () => clock);
  const deps = (key: string, reply: MarketSnapshot): SnapshotDeps => ({
    stored: () => Promise.resolve(rows.get(key) ?? null),
    recent: () => Promise.resolve([...(opts.recent ?? []), ...[...rows.values()].map((r) => r.fetchedAt)]),
    charge: () => {
      spent.charges++;
      if (key === opts.hangs) return new Promise(() => {});
      return opts.quotaSpent ? Promise.reject(new Error("quota spent")) : Promise.resolve();
    },
    fetch: async () => {
      spent.fetches++;
      await new Promise((r) => setTimeout(r, 5));
      return { ...reply, fetchedAt: new Date(clock).toISOString() };
    },
    save: (snapshot) => {
      rows.set(key, { snapshot, fetchedAt: snapshot.fetchedAt });
      return Promise.resolve();
    },
  });
  return {
    ask: (key: string, reply?: MarketSnapshot) => server(key, deps(key, reply ?? opts.reply ?? answer())),
    spent,
    later: (ms: number) => (clock += ms),
  };
}

Deno.test("a stored answer still fresh is served with nothing spent", async () => {
  const w = world({ stored: answer(), storedAt: T0 - 2 * HOUR });
  eq((await w.ask("nurse")).kind, "snapshot", "served");
  eq(w.spent, { fetches: 0, charges: 0 }, "nothing spent");
});

Deno.test("a new role is charged once and fetched once, then served from the store", async () => {
  const w = world();
  eq((await w.ask("nurse")).kind, "snapshot", "first");
  eq((await w.ask("nurse")).kind, "snapshot", "second");
  eq(w.spent, { fetches: 1, charges: 1 }, "one of each");
});

Deno.test("two asks at once for a new role cost one fetch", async () => {
  const w = world();
  const [a, b] = await Promise.all([w.ask("nurse"), w.ask("nurse")]);
  eq([a.kind, b.kind], ["snapshot", "snapshot"], "both answered");
  eq(w.spent.fetches, 1, "the second found it stored");
});

const FOUR: MarketPart[] = ["count", "bands", "companies", "places"];

Deno.test("when every request fails in a way that may pass, no role is asked again for a while", async () => {
  const down: MarketSnapshot = { ...answer(FOUR), asked: FOUR, salaryHistory: [] };
  const w = world();
  eq((await w.ask("nurse", down)).kind, "unreachable", "first");
  eq((await w.ask("welder", down)).kind, "unreachable", "another role");
  eq(w.spent.fetches, 1, "backed off after the first");
  w.later(11 * 60_000);
  await w.ask("welder", down);
  eq(w.spent.fetches, 2, "asked again after the backoff");
});

Deno.test("a role every request refuses is remembered for a while, and other roles are still asked", async () => {
  const refused: MarketSnapshot = { ...answer(FOUR, FOUR), asked: FOUR, salaryHistory: [] };
  const w = world();
  eq((await w.ask("weird role", refused)).kind, "unreachable", "refused");
  await w.ask("weird role", refused);
  eq(w.spent.fetches, 1, "not asked again");
  eq((await w.ask("nurse")).kind, "snapshot", "another role");
  eq(w.spent.fetches, 2, "fetched");
});

Deno.test("a call that never settles holds the queue for one slot, not for good", async () => {
  const w = world({ hangs: "stuck", slotMs: 30 });
  void w.ask("stuck");
  eq((await w.ask("nurse")).kind, "snapshot", "the next role is answered");
  eq(w.spent.fetches, 1, "fetched");
});

Deno.test("fetches that store nothing still count toward the ration", async () => {
  const empty: MarketSnapshot = { ...answer(["count"]), asked: FOUR, salaryBands: [], companies: [], places: [], salaryHistory: [] };
  const w = world();
  await w.ask("zzz", empty);
  eq((await w.ask("nurse")).kind, "snapshot", "second fetch this minute");
  eq((await w.ask("welder")).kind, "resting", "a third this minute rests (two a minute)");
  eq(w.spent.fetches, 2, "two fetches");
});

Deno.test("a role that comes back empty isn't asked again for a while, but other roles are", async () => {
  const empty: MarketSnapshot = {
    ...answer(["count"]),
    asked: ["count", "bands", "companies", "places"],
    salaryBands: [],
    companies: [],
    places: [],
    salaryHistory: [],
  };
  const w = world();
  eq((await w.ask("zzz", empty)).kind, "unreachable", "nothing to show");
  await w.ask("zzz", empty);
  eq(w.spent.fetches, 1, "not asked again");
  eq((await w.ask("nurse")).kind, "snapshot", "another role");
  eq(w.spent.fetches, 2, "fetched");
});

Deno.test("past the ration a new role rests, uncharged, and a stored one is served however old", async () => {
  const full = Array.from({ length: 20 }, (_, i) => new Date(T0 - (i + 1) * HOUR).toISOString());
  const w = world({ stored: answer(), storedAt: T0 - 30 * HOUR, recent: full });
  eq((await w.ask("welder")).kind, "resting", "new role");
  eq((await w.ask("nurse")).kind, "snapshot", "stored role, 30 hours old");
  eq(w.spent, { fetches: 0, charges: 0 }, "nothing spent");
});

Deno.test("a spent quota serves the stored answer, and is said as such without one", async () => {
  const w = world({ stored: answer(), storedAt: T0 - 30 * HOUR, quotaSpent: true });
  eq((await w.ask("nurse")).kind, "snapshot", "stored answer");
  let thrown = "";
  await w.ask("welder").catch((e) => (thrown = String(e)));
  eq(thrown.includes("quota spent"), true, "the quota's own error, for the page to read");
  eq(w.spent.fetches, 0, "Adzuna never asked");
});

Deno.test("the page caches by the same key as the function", () => {
  for (const role of ["Full-Stack Developer", "full stack  developer", " C# / .NET Dev ", "Nurse – ICU", "", "x".repeat(150), "*", " ? ", "Électricien"]) {
    eq(browser.roleKey(role), normaliseRole(role).toLowerCase(), JSON.stringify(role));
  }
});

Deno.test("a search with no letter or digit is every job, so it can't take every job's cache row", () => {
  eq([normaliseRole("*"), normaliseRole(" - / "), normaliseRole("C#")], ["", "", "C#"], "roles");
});
