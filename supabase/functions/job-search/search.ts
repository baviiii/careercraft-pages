/* One search, planned: which board searches to make, in what order, and how
   to carry on from here. Kept apart from index.ts, which talks to the board,
   so every path can be tested with a pretend board (search_test.ts).

   The matches come first, page by page: what was typed (or the caller's own
   phrasings, each with its share of the page), as the board finds them. On
   Browse Jobs (`widen`), when they run out the list carries on with similar
   ads, page by page too, marked as not an exact match: ads with any of the
   search's words, inside the category most of the matches are filed under
   (terms.ts); for a one-word search, the whole category. So a search with
   plenty of matches is only its matches, and one with few still has
   somewhere to go. A search the board refused isn't a list that ran out,
   and isn't widened.

   When what was typed finds nothing it may be misspelt. The titles of ads
   nearby that share a word with it (for one word, any ads nearby) give a
   correction (spelling.ts); when the corrected search finds something,
   that's the search ("Showing results for developer"). */

import { type Category, commonCategory, severalWords, termShares } from "./terms.ts";
import { correctQuery } from "./spelling.ts";

export interface Ad {
  id: string;
  title: string;
}

export interface BoardPage<J extends Ad> {
  jobs: J[];
  /** The board's category for each ad. */
  categories: Category[];
}

/** A board search: all of `what`'s words, any of `anyOf`'s, in `category`. */
export interface BoardSearch {
  what?: string;
  anyOf?: string;
  category?: string;
}

export interface Board<J extends Ad> {
  search(search: BoardSearch, perPage: number, page: number): Promise<BoardPage<J>>;
}

/** Where the similar ads carry on from: any of `words` in `category`. */
export interface WiderCursor {
  category: string;
  words: string;
  page: number;
}

/**
 * What "Show more" asks for next: more matches (with the category they're
 * filed under so far, in case the next page has none to say), or more
 * similar ads.
 */
export type Next = { page: number; field?: Category } | { wider: WiderCursor } | null;

export interface SearchRequest {
  query: string;
  /** The caller's own phrasings (the profile's), searched as they are. */
  terms: string[];
  perPage: number;
  page: number;
  maxPage: number;
  /** Carry on with similar ads when the matches run out. */
  widen: boolean;
  /** Carrying on with the similar ads (an earlier response's `next`). */
  wider?: WiderCursor;
  /** Where the matches on earlier pages are filed (an earlier `next.field`). */
  field?: Category;
  /** Search what was typed, never a correction of it. */
  exact?: boolean;
}

type Settled<J extends Ad> = PromiseSettledResult<BoardPage<J>>;

export interface SearchPlan<J extends Ad> {
  /** What was searched: what was typed, or its correction. */
  query: string;
  /** What was typed, when `query` is a correction of it. */
  correctedFrom: string | null;
  terms: string[];
  /** The searches for the matches, in order. */
  matches: Settled<J>[];
  /** The search for similar ads, if one ran. */
  wider: Settled<J> | null;
  /** The category the similar ads start from, on the page they start. */
  related: Category | null;
  next: Next;
}

const settle = <T>(p: Promise<T>) => Promise.allSettled([p]).then(([r]) => r);
const found = <J extends Ad>(r: Settled<J>) => (r.status === "fulfilled" ? r.value.jobs.length : 0);
const categoriesOf = <J extends Ad>(rs: Settled<J>[]) =>
  rs.flatMap((r) => (r.status === "fulfilled" ? r.value.categories : []));

export async function planSearch<J extends Ad>(board: Board<J>, req: SearchRequest): Promise<SearchPlan<J>> {
  const { perPage, maxPage } = req;
  const similar = (wider: WiderCursor) =>
    settle(board.search({ anyOf: wider.words || undefined, category: wider.category }, perPage, wider.page));
  const after = (r: Settled<J>, wider: WiderCursor): Next =>
    found(r) >= perPage && wider.page < maxPage ? { wider: { ...wider, page: wider.page + 1 } } : null;

  // Carrying on with the similar ads: the matches ran out on an earlier page.
  if (req.widen && req.wider) {
    const wider = await similar(req.wider);
    return {
      query: req.query,
      correctedFrom: null,
      terms: [],
      matches: [],
      wider,
      related: null,
      next: after(wider, req.wider),
    };
  }

  // The matches. Capped at 3 phrasings so no search fans out into a dozen
  // paid calls. Each has its share of the page (termShares), the same every
  // page, so page 2 carries on where page 1 stopped for each.
  const explicit = req.terms.map((t) => t.trim()).filter(Boolean);
  const candidates = (explicit.length ? explicit : [req.query])
    .filter((t, i, a) => a.findIndex((x) => x.toLowerCase() === t.toLowerCase()) === i)
    .slice(0, 3);
  const allShares = termShares(perPage, candidates.length);
  let terms = candidates.filter((_, i) => allShares[i] > 0);
  const shares = allShares.filter((s) => s > 0);
  let matches = await Promise.allSettled(terms.map((t, i) => board.search({ what: t }, shares[i], req.page)));

  let query = req.query;
  let correctedFrom: string | null = null;
  const plan = (wider: Settled<J> | null, related: Category | null, next: Next): SearchPlan<J> => ({
    query,
    correctedFrom,
    terms,
    matches,
    wider,
    related,
    next,
  });

  let category = commonCategory(categoriesOf(matches)) ?? req.field ?? null;

  // Any phrasing that filled its share may have another page of matches.
  if (matches.some((r, i) => found(r) >= shares[i])) {
    return plan(null, null, req.page < maxPage ? { page: req.page + 1, ...(category ? { field: category } : {}) } : null);
  }
  if (!req.widen || !query || matches.some((r) => r.status === "rejected")) return plan(null, null, null);

  // Nothing at all for what was typed: perhaps a slip of the keyboard.
  const several = severalWords(query);
  if (req.page === 1 && !explicit.length && matches.every((r) => found(r) === 0) && (several || !req.exact)) {
    // Ads nearby that share a word with it, or, for one word, any ads nearby.
    const nearby = await settle(board.search(several ? { anyOf: query } : {}, perPage, 1));
    const titles = nearby.status === "fulfilled" ? nearby.value.jobs.map((j) => j.title) : [];
    const fixed = req.exact ? null : correctQuery(query, titles);
    if (fixed) {
      const retry = await Promise.allSettled([board.search({ what: fixed }, shares[0], 1)]);
      if (found(retry[0]) > 0) {
        [correctedFrom, query, terms, matches] = [query, fixed, [fixed], retry];
        category = commonCategory(categoriesOf(matches));
        if (found(retry[0]) >= shares[0]) {
          return plan(null, null, maxPage > 1 ? { page: 2, ...(category ? { field: category } : {}) } : null);
        }
      }
    }
    // Ads that share a word with the search are filed where its matches
    // would be; any ads nearby say nothing about it.
    if (!correctedFrom && several) category = commonCategory(categoriesOf([nearby]));
  }
  // Filed nowhere, so nowhere to widen: the board's category names are too
  // short to place a search by meaning (see terms.ts).
  if (!category) return plan(null, null, null);

  const start: WiderCursor = { category: category.tag, words: severalWords(query) ? query : "", page: 1 };
  const wider = await similar(start);
  return plan(wider, category, after(wider, start));
}
