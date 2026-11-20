import { type Board, type BoardSearch, planSearch, type SearchRequest } from "./search.ts";
import type { Category } from "./terms.ts";

const eq = (got: unknown, want: unknown, why: string) => {
  if (JSON.stringify(got) !== JSON.stringify(want)) {
    throw new Error(`${why}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
  }
};

interface J {
  id: string;
  title: string;
}

const IT: Category = { tag: "it-jobs", label: "IT Jobs" };
const HEALTH: Category = { tag: "healthcare-nursing-jobs", label: "Healthcare & Nursing Jobs" };
const TRADES: Category = { tag: "trade-construction-jobs", label: "Trade & Construction Jobs" };
const many = (n: number, title: string): J[] => Array.from({ length: n }, (_, i) => ({ id: `${title}-${i}`, title }));

/** A board search as a key: `what` (all words), `any:` (any words), `in:` (category), and the page. */
const keyOf = (s: BoardSearch, page: number) =>
  [s.what ?? "", s.anyOf ? `any:${s.anyOf}` : "", s.category ? `in:${s.category}` : "", page].join("|");

/** A pretend board, answering each search from `pages` by its key. */
function fakeBoard(pages: Record<string, { jobs: J[]; category?: Category } | "refuse">) {
  const calls: string[] = [];
  const board: Board<J> = {
    search(s, perPage, page) {
      const key = keyOf(s, page);
      calls.push(key);
      const p = pages[key];
      if (p === "refuse") return Promise.reject(new Error("Adzuna returned 429"));
      const jobs = (p?.jobs ?? []).slice(0, perPage);
      const c = p?.category;
      return Promise.resolve({ jobs, categories: c ? jobs.map(() => c) : [] });
    },
  };
  return { board, calls };
}

const req = (over: Partial<SearchRequest>): SearchRequest => ({
  query: "",
  terms: [],
  perPage: 50,
  page: 1,
  maxPage: 20,
  widen: true,
  ...over,
});
const count = (r: PromiseSettledResult<{ jobs: J[] }> | null) => (r?.status === "fulfilled" ? r.value.jobs.length : 0);

Deno.test("plenty of matches: only matches, and more of them next", async () => {
  const { board, calls } = fakeBoard({ "electrician|||1": { jobs: many(50, "Electrician"), category: TRADES } });
  const plan = await planSearch(board, req({ query: "electrician" }));
  eq(plan.wider, null, "not widened");
  eq(plan.next, { page: 2, field: TRADES }, "next page of matches, and where they're filed");
  eq(calls, ["electrician|||1"], "one board call");
});

Deno.test("few matches: then ads with any of the words, in their category", async () => {
  const { board, calls } = fakeBoard({
    "Software Developer|||1": { jobs: many(2, "Software Developer"), category: IT },
    "|any:Software Developer|in:it-jobs|1": { jobs: many(50, "Software Engineer"), category: IT },
  });
  const plan = await planSearch(board, req({ query: "Software Developer" }));
  eq(count(plan.matches[0]), 2, "the matches");
  eq(count(plan.wider), 50, "similar ads");
  eq(plan.related, IT, "where from");
  eq(plan.next, { wider: { category: "it-jobs", words: "Software Developer", page: 2 } }, "next page of similar ads");
  eq(calls, ["Software Developer|||1", "|any:Software Developer|in:it-jobs|1"], "two board calls");
});

Deno.test("a one-word search carries on with its whole category", async () => {
  const { board, calls } = fakeBoard({
    "Electrician|||1": { jobs: many(3, "Electrician"), category: TRADES },
    "||in:trade-construction-jobs|1": { jobs: many(10, "Plumber") },
  });
  const plan = await planSearch(board, req({ query: "Electrician" }));
  eq(plan.related, TRADES, "trades");
  eq(plan.next, null, "the category ran out too");
  eq(calls, ["Electrician|||1", "||in:trade-construction-jobs|1"], "calls");
});

Deno.test("matches that run out on a later page still carry on, filed where page 1's were", async () => {
  const { board, calls } = fakeBoard({
    "||in:trade-construction-jobs|1": { jobs: many(50, "Plumber") },
  });
  const plan = await planSearch(board, req({ query: "Electrician", page: 2, field: TRADES }));
  eq(plan.related, TRADES, "from the earlier pages");
  eq(calls, ["Electrician|||2", "||in:trade-construction-jobs|1"], "calls");
});

Deno.test("a one-word typo is corrected from nearby ads' titles", async () => {
  const { board, calls } = fakeBoard({
    "|||1": { jobs: [...many(3, "Software Developer"), ...many(5, "Registered Nurse")] },
    "developer|||1": { jobs: many(4, "Developer"), category: IT },
    "||in:it-jobs|1": { jobs: many(50, "IT Support Officer"), category: IT },
  });
  const plan = await planSearch(board, req({ query: "devloper" }));
  eq([plan.query, plan.correctedFrom, plan.terms], ["developer", "devloper", ["developer"]], "corrected");
  eq(count(plan.matches[0]), 4, "the corrected matches");
  eq(plan.related, IT, "then the rest of IT");
  eq(calls, ["devloper|||1", "|||1", "developer|||1", "||in:it-jobs|1"], "calls");
});

Deno.test("a typo in a longer search is corrected from ads sharing its other words", async () => {
  const { board, calls } = fakeBoard({
    "|any:sofware developer||1": { jobs: many(3, "Software Developer"), category: IT },
    "software developer|||1": { jobs: many(2, "Software Developer"), category: IT },
    "|any:software developer|in:it-jobs|1": { jobs: many(20, "Software Engineer"), category: IT },
  });
  const plan = await planSearch(board, req({ query: "sofware developer" }));
  eq(plan.query, "software developer", "corrected");
  eq(plan.related, IT, "IT");
  eq(calls, [
    "sofware developer|||1",
    "|any:sofware developer||1",
    "software developer|||1",
    "|any:software developer|in:it-jobs|1",
  ], "calls");
});

Deno.test("a corrected search with plenty of matches carries on with its own pages", async () => {
  const { board } = fakeBoard({
    "|||1": { jobs: many(3, "Developer") },
    "developer|||1": { jobs: many(50, "Developer"), category: IT },
  });
  const plan = await planSearch(board, req({ query: "devloper" }));
  eq([plan.query, plan.wider, plan.next], ["developer", null, { page: 2, field: IT }], "matches first");
});

Deno.test("no typo and nothing found: a longer search still widens where its words are filed", async () => {
  const { board, calls } = fakeBoard({
    "|any:rust developer||1": { jobs: many(8, "Software Developer"), category: IT },
    "|any:rust developer|in:it-jobs|1": { jobs: many(8, "Software Developer"), category: IT },
  });
  const plan = await planSearch(board, req({ query: "rust developer" }));
  eq([plan.query, plan.correctedFrom], ["rust developer", null], "not corrected");
  eq(plan.related, IT, "IT, where ads with its words are");
  eq(calls.length, 3, "match, nearby, similar");
});

Deno.test("one word, no typo, nothing found: no guessing, just no matches", async () => {
  const { board, calls } = fakeBoard({ "|||1": { jobs: many(5, "Registered Nurse"), category: HEALTH } });
  const plan = await planSearch(board, req({ query: "astronaut" }));
  eq([plan.wider, plan.related, plan.next], [null, null, null], "nothing more");
  eq(calls, ["astronaut|||1", "|||1"], "calls");
});

Deno.test("a correction that finds nothing either isn't kept", async () => {
  const { board } = fakeBoard({ "|||1": { jobs: many(3, "Developer") } });
  const plan = await planSearch(board, req({ query: "devloper" }));
  eq([plan.query, plan.correctedFrom, plan.wider], ["devloper", null, null], "as typed, nothing more");
});

Deno.test("searching exactly what was typed never corrects it", async () => {
  const one = fakeBoard({ "|||1": { jobs: many(3, "Developer") } });
  const a = await planSearch(one.board, req({ query: "devloper", exact: true }));
  eq([a.query, a.correctedFrom], ["devloper", null], "as typed");
  eq(one.calls, ["devloper|||1"], "no nearby sample for one word");

  const two = fakeBoard({ "|any:sofware developer||1": { jobs: many(3, "Software Developer"), category: IT } });
  const b = await planSearch(two.board, req({ query: "sofware developer", exact: true }));
  eq([b.correctedFrom, b.related], [null, IT], "still widens where its words are filed");
});

Deno.test("a board that refused isn't widened, nor asked again", async () => {
  const { board, calls } = fakeBoard({ "Software Developer|||1": "refuse" });
  const plan = await planSearch(board, req({ query: "Software Developer" }));
  eq(plan.matches[0].status, "rejected", "refused");
  eq([plan.wider, plan.next], [null, null], "no widening");
  eq(calls, ["Software Developer|||1"], "one call");
});

Deno.test("other pages (home feed, tracker) aren't widened", async () => {
  const { board, calls } = fakeBoard({ "Software Developer|||1": { jobs: many(2, "Software Developer"), category: IT } });
  const plan = await planSearch(board, req({ query: "Software Developer", widen: false }));
  eq([plan.wider, plan.next], [null, null], "matches only");
  eq(calls.length, 1, "one call");
});

Deno.test("carrying on with the similar ads asks for their next page only", async () => {
  const { board, calls } = fakeBoard({ "|any:Software Developer|in:it-jobs|2": { jobs: many(50, "Software Engineer") } });
  const plan = await planSearch(
    board,
    req({ query: "Software Developer", wider: { category: "it-jobs", words: "Software Developer", page: 2 } }),
  );
  eq(count(plan.wider), 50, "similar ads");
  eq([plan.matches, plan.related], [[], null], "no matches searched, nothing new to name");
  eq(plan.next, { wider: { category: "it-jobs", words: "Software Developer", page: 3 } }, "next");
  eq(calls, ["|any:Software Developer|in:it-jobs|2"], "one call");
});

Deno.test("the profile's phrasings share the page, and widen without correcting", async () => {
  const { board, calls } = fakeBoard({ "icu nurse|||1": { jobs: many(3, "ICU Nurse"), category: HEALTH } });
  const plan = await planSearch(
    board,
    req({ query: "ICU Nurse", terms: ["icu nurse", "critical care nurse", "registered nurse"] }),
  );
  eq(plan.terms, ["icu nurse", "critical care nurse", "registered nurse"], "terms");
  eq(plan.related, HEALTH, "health");
  eq(calls, [
    "icu nurse|||1",
    "critical care nurse|||1",
    "registered nurse|||1",
    "|any:ICU Nurse|in:healthcare-nursing-jobs|1",
  ], "calls");
});

Deno.test("a cross-field category isn't a field to widen into", async () => {
  const { board } = fakeBoard({
    "Barista|||1": { jobs: many(2, "Barista"), category: { tag: "part-time-jobs", label: "Part time Jobs" } },
  });
  eq((await planSearch(board, req({ query: "Barista" }))).wider, null, "part time");
});

Deno.test("no widening for an empty search, and no next page past the last", async () => {
  const empty = fakeBoard({ "|||1": { jobs: many(3, "Anything"), category: IT } });
  eq((await planSearch(empty.board, req({ query: "" }))).wider, null, "nothing to widen");
  const last = fakeBoard({ "electrician|||20": { jobs: many(50, "Electrician"), category: TRADES } });
  eq((await planSearch(last.board, req({ query: "electrician", page: 20 }))).next, null, "last page");
});
