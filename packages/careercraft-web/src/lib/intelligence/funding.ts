/**
 * Formatting for budget figures on the Intelligence page.
 *
 * A figure here is one measure's amount as one document states it. These
 * helpers format a single figure; there is deliberately no helper that adds
 * figures up (INTELLIGENCE-REDESIGN.md §8).
 */

/** Millions of AUD → "$1.9B" / "$453M" / "$0.8M". */
export function formatMillions(millions: number): string {
  if (!Number.isFinite(millions)) return "—";
  if (millions >= 1000) return `$${(millions / 1000).toFixed(1)}B`;
  if (millions >= 1) return `$${Math.round(millions)}M`;
  return `$${millions.toFixed(1)}M`;
}

/** Year-on-year change, or "—" when no document states one. Never "0%". */
export function formatChange(change: number | undefined): string {
  if (change == null || !Number.isFinite(change)) return "—";
  return `${change > 0 ? "+" : ""}${change.toFixed(1)}%`;
}
