/* How one search is spread over the board, and where it goes when its
   matches run out.

   The board matches words, so a search finds one wording of a job. In
   Adelaide most software roles are advertised as "Software Engineer", and a
   search for "Software Developer" found two of them (2026-11-14). A list of
   other names for each job can't keep up with every job there is, so when a
   search's matches run out it carries on with ads that have any of its words
   rather than all of them, inside the board's own category for the job: "IT
   Jobs" ads that say "software" or "developer". The category keeps out a
   property developer; the order, closest in meaning to the search first,
   puts "Software Engineer" near the top (search.ts, index.ts).

   The category is the board's too: the one most of the matches are filed
   under. Its names alone are too short to place a search by meaning ("IT",
   "Admin": "devloper" came out closest to Travel, 2026-11-18), so a search
   the board files nowhere isn't widened. */

export interface Category {
  tag: string;
  label: string;
}

/* Categories that aren't a field of work: the board's catch-all, and the
   ones that cut across every field ("Graduate Jobs", "Part time Jobs"). */
const isCrossField = (tag: string) => /(?:^|-)(?:other|general|unknown|graduate|part-time)(?:-|$)/.test(tag);

/** The field most of these ads are filed under, the first seen on a tie. */
export function commonCategory(categories: Category[]): Category | null {
  const counts = new Map<string, { category: Category; n: number }>();
  for (const c of categories) {
    if (!c.tag || isCrossField(c.tag)) continue;
    const entry = counts.get(c.tag);
    if (entry) entry.n += 1;
    else counts.set(c.tag, { category: c, n: 1 });
  }
  let best: { category: Category; n: number } | null = null;
  for (const entry of counts.values()) if (!best || entry.n > best.n) best = entry;
  return best?.category ?? null;
}

/** "Healthcare & Nursing Jobs" → "Healthcare & Nursing", for "More Healthcare & Nursing jobs". */
export const categoryName = (label: string) => label.replace(/\s+jobs$/i, "").trim();

/** More than one word: "any of them" is wider than all of them. */
export const severalWords = (query: string) => query.trim().split(/\s+/).filter(Boolean).length > 1;

/**
 * How many results each search asks the board for, adding up to exactly
 * `perPage`: the first (what the person typed, or the phrasing that describes
 * them best) gets at least half, the others split the rest. The same shares
 * every page, so page 2 carries on where page 1 stopped for every search and
 * nothing is trimmed off and lost. A page too small to share goes to the
 * first alone (a share of 0 means "don't search it").
 */
export function termShares(perPage: number, terms: number): number[] {
  if (terms <= 1) return [perPage];
  const rest = Math.floor(perPage / 2 / (terms - 1));
  if (rest < 1) return Array.from({ length: terms }, (_, i) => (i === 0 ? perPage : 0));
  return [perPage - rest * (terms - 1), ...Array.from({ length: terms - 1 }, () => rest)];
}
