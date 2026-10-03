/**
 * Job-title suggestions while someone types their role.
 *
 * Titles come from the ABS occupation classification (OSCA) when its data file
 * is present (`/data/occupations-au.json`, built by scripts/build-occupations),
 * so suggestions use the names Australian employers and agencies use. Without it
 * — or before it loads — the broad POPULAR_ROLES seed stands in. Either way these
 * are only suggestions: any typed job is accepted.
 */
import { POPULAR_ROLES } from "./careerFields";

/** A title, optionally with other names it goes by ("Chef" ← "Cook (Commercial)"). */
type Entry = string | { title: string; alt?: string[] };

let catalogue: Promise<Array<{ title: string; alt: string[] }>> | null = null;

function loadCatalogue() {
  catalogue ??= fetch("/data/occupations-au.json")
    .then((res) => (res.ok ? res.json() : []))
    .then((data: unknown) =>
      (Array.isArray(data) ? (data as Entry[]) : [])
        .map((e) => (typeof e === "string" ? { title: e, alt: [] } : { title: e.title, alt: e.alt ?? [] }))
        .filter((e) => typeof e.title === "string" && e.title.length > 0),
    )
    .catch(() => []);
  return catalogue;
}

/** Start loading before the first keystroke, so the first suggestions aren't the fallback. */
export function preloadOccupations(): void {
  void loadCatalogue();
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

  const loaded = await loadCatalogue();
  const pool = loaded.length > 0 ? loaded : POPULAR_ROLES.map((title) => ({ title, alt: [] as string[] }));

  return pool
    .map((e) => ({ title: e.title, s: Math.max(score(e.title, q), ...e.alt.map((a) => score(a, q) - 0.5)) }))
    .filter((e) => e.s > 0)
    .sort((a, b) => b.s - a.s || a.title.length - b.title.length)
    .slice(0, limit)
    .map((e) => e.title);
}
