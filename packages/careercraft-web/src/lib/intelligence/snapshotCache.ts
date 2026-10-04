/* ───────────────────────────────────────────────────────────
   snapshotCache — the Observatory's answer to a 45-second cold start.

   Every panel on this page is derived from four Horus queries that take
   20–50 seconds each. There is an in-memory cache already, but it dies with
   the tab, so every visit — including a reload two seconds later — paid the
   full wait against an empty screen.

   The corpus is 84 published government documents. It changes when someone
   ingests a new budget paper, which is to say rarely. Treating that as live
   data and refusing to show the last answer is the wrong trade: a figure
   from this morning, clearly labelled, beats a skeleton.

   So: persist the derived slices, paint them instantly on the next visit,
   then refresh in the background and replace. The UI must say which it is
   showing — see `savedAt`.
   ─────────────────────────────────────────────────────────── */

const KEY = "cc-intelligence-snapshot";

/** Bump when the persisted shape changes so stale entries are dropped. */
// 2: funding entries became single budget measures from Horus's extracted
// figures (no summed totals, no invented year-on-year change). A v1 snapshot
// holds the old scraped, merged-by-larger-amount sectors — drop it.
const VERSION = 2;

/**
 * How long a snapshot may be shown before it is treated as worthless.
 *
 * Deliberately generous. The alternative to a six-hour-old figure is a blank
 * page, and these documents are annual budget papers — a day-old reading of
 * them is not meaningfully staler than a fresh one. Refresh still runs
 * immediately in the background regardless; this only bounds what we are
 * willing to paint first.
 */
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

/** The slices worth persisting. Loading flags and errors are deliberately excluded —
 *  a restored snapshot is never "loading", and a stale error is noise. */
export interface IntelligenceSnapshot {
  version: number;
  savedAt: number;
  /** Corpus size when captured. A change here invalidates everything. */
  documentCount: number;
  metrics: unknown;
  fundingAllocations: unknown[];
  careerOpportunities: unknown[];
  skillsDemand: unknown[];
  trainingPrograms: unknown[];
  crossTabInsights: unknown[];
  /** Per-tab AI narrative — the most expensive thing to regenerate. */
  insights: Record<string, unknown[]>;
}

export function saveSnapshot(
  snapshot: Omit<IntelligenceSnapshot, "version" | "savedAt">,
): void {
  try {
    const payload: IntelligenceSnapshot = {
      ...snapshot,
      version: VERSION,
      savedAt: Date.now(),
    };
    window.localStorage.setItem(KEY, JSON.stringify(payload));
  } catch {
    /* Quota or private mode. The page still works, just slower. */
  }
}

/**
 * Read the snapshot, if one is usable.
 *
 * `expectedDocumentCount` guards against showing figures derived from a
 * different corpus: if documents have been added since, the cached readings
 * describe a set that no longer exists and are dropped rather than shown.
 * Pass undefined when the count is not yet known (first paint, before
 * metadata lands) — freshness is still enforced by MAX_AGE_MS.
 */
export function loadSnapshot(
  expectedDocumentCount?: number,
): IntelligenceSnapshot | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as IntelligenceSnapshot;
    if (parsed?.version !== VERSION) {
      clearSnapshot();
      return null;
    }
    if (typeof parsed.savedAt !== "number") return null;
    if (Date.now() - parsed.savedAt > MAX_AGE_MS) return null;
    if (
      expectedDocumentCount !== undefined &&
      parsed.documentCount !== expectedDocumentCount
    ) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export function clearSnapshot(): void {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* nothing to do */
  }
}

/** "just now" / "8 minutes ago" / "yesterday" — for the freshness line. */
export function describeAge(savedAt: number): string {
  const mins = Math.floor((Date.now() - savedAt) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} minute${mins === 1 ? "" : "s"} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  return "yesterday";
}
