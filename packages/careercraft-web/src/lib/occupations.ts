/**
 * Job-title suggestions while someone types their role.
 *
 * Titles come from the ABS occupation classification, OSCA 2024 — 3,000+
 * principal titles, alternative titles and specialisations, the names
 * Australian employers actually use (`/data/occupations-au.json`, built by
 * scripts/build-occupations.py). If that file is missing or still loading, the
 * broad POPULAR_ROLES seed stands in. Either way these are only suggestions:
 * any typed job is accepted.
 */
import { POPULAR_ROLES } from "./careerFields";

interface Catalogue {
  entries: Array<{ title: string; principal: boolean }>;
  /** Required by the CC BY 4.0 licence; shown under the suggestions. */
  attribution: string | null;
}

let catalogue: Promise<Catalogue> | null = null;
let loadedAttribution: string | null = null;

function loadCatalogue(): Promise<Catalogue> {
  catalogue ??= fetch("/data/occupations-au.json")
    .then((res) => (res.ok ? res.json() : null))
    .then((data: { source?: string; licence?: string; titles?: unknown[] } | null) => {
      const entries = (data?.titles ?? []).flatMap((t) =>
        typeof t === "string"
          ? [{ title: t, principal: false }]
          : Array.isArray(t) && typeof t[0] === "string"
            ? [{ title: t[0], principal: true }]
            : [],
      );
      const attribution = entries.length && data?.source ? `${data.source} (${data.licence ?? "CC BY 4.0"})` : null;
      loadedAttribution = attribution;
      return { entries, attribution };
    })
    .catch(() => ({ entries: [], attribution: null }));
  return catalogue;
}

/** Start loading before the first keystroke, so the first suggestions aren't the fallback. */
export function preloadOccupations(): void {
  void loadCatalogue();
}

/** The data credit, once the ABS titles have loaded; null while falling back. */
export function occupationsAttribution(): string | null {
  return loadedAttribution;
}

function score(text: string, q: string): number {
  const t = text.toLowerCase();
  if (t.startsWith(q)) return 3;
  if (t.split(/[\s/(),-]+/).some((w) => w.startsWith(q))) return 2;
  return t.includes(q) ? 1 : 0;
}

/** Titles matching what's been typed, best first: "nur" → "Nurse Educator", "Registered Nurse"… */
export async function suggestTitles(query: string, limit = 6): Promise<string[]> {
  const q = query.trim().toLowerCase();
  if (!q) return POPULAR_ROLES.slice(0, limit);

  const { entries } = await loadCatalogue();
  const pool = entries.length > 0 ? entries : POPULAR_ROLES.map((title) => ({ title, principal: true }));

  return pool
    .map((e) => ({ ...e, s: score(e.title, q) }))
    .filter((e) => e.s > 0)
    .sort((a, b) => b.s - a.s || Number(b.principal) - Number(a.principal) || a.title.length - b.title.length)
    .slice(0, limit)
    .map((e) => e.title);
}
