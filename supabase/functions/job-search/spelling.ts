/* "Did you mean…": a word of a search that no ad title nearby uses, swapped
   for one at least two of them do use that's a slip of the keyboard away
   ("devloper" → "developer", "nurce" → "nurse"). The words come from the
   board's own ad titles, so there's no dictionary to keep: a job is spelt
   the way employers spell it. Titles only: an ad's description is full of
   ordinary words ("must", "just") that a real job word is one edit from
   ("rust"). Only tried when a search finds nothing, and only kept when the
   corrected search finds something (search.ts). */

const WORD = /[a-z0-9+#]+/g;

/** Edits between two words: a letter added, dropped or changed, or two side by side swapped. */
export function editDistance(a: string, b: string): number {
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) =>
    Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
  }
  return d[a.length][b.length];
}

/**
 * The search with each word that no title uses replaced by the closest word
 * in the titles of at least two ads: one edit away, or two for a word of
 * eight letters or more (a short word two edits away is usually another
 * word: "welder", "wonder"). Ties go to the commoner word. Short words and
 * words with digits are left alone ("hr", "c++", "level 2"), and so is
 * everything around the words (".NET devloper" → ".NET developer"). Null
 * when nothing changed.
 */
export function correctQuery(query: string, titles: string[]): string | null {
  // In how many ads' titles each word appears.
  const ads = new Map<string, number>();
  for (const title of titles) {
    for (const w of new Set(title.toLowerCase().match(WORD) ?? [])) ads.set(w, (ads.get(w) ?? 0) + 1);
  }
  let changed = false;
  const out = query.replace(/[a-z0-9+#]+/gi, (original) => {
    const word = original.toLowerCase();
    if (ads.has(word) || word.length < 4 || /\d/.test(word)) return original;
    const most = word.length >= 8 ? 2 : 1;
    let best: string | null = null;
    let bestEdits = Infinity;
    let bestAds = 0;
    for (const [candidate, n] of ads) {
      if (n < 2 || Math.abs(candidate.length - word.length) > most) continue;
      const edits = editDistance(word, candidate);
      if (edits > most) continue;
      if (edits < bestEdits || (edits === bestEdits && n > bestAds)) {
        [best, bestEdits, bestAds] = [candidate, edits, n];
      }
    }
    if (!best) return original;
    changed = true;
    return best;
  });
  return changed ? out.trim() : null;
}
