/**
 * Persona accent theming — the product's editorial accent (rust by default)
 * re-tints to match the user's professional world once onboarding has read
 * them. Cream paper and ink stay fixed; only the accent family
 * (--cc-rust / -deep / -soft) shifts, via a data attribute on <html> that
 * the palettes in design-system.css key off.
 *
 * The accent is cached in localStorage so it applies before any profile
 * fetch on subsequent visits (no rust flash).
 */

export type CCAccent = 'rust' | 'sage' | 'harbor' | 'plum' | 'petrol' | 'ochre';

const STORAGE_KEY = 'cc-accent';
const ACCENTS: readonly CCAccent[] = ['rust', 'sage', 'harbor', 'plum', 'petrol', 'ochre'];

const ACCENT_KEYWORDS: Array<[CCAccent, string[]]> = [
  // Care, health, community — warm sage.
  ['sage', ['health', 'nurs', 'care', 'medical', 'clinic', 'pharma', 'disability', 'social work', 'community', 'non-profit', 'psycholog', 'therap']],
  // Money, law, governance — worn navy.
  ['harbor', ['finance', 'bank', 'account', 'audit', 'legal', 'law', 'insurance', 'government', 'policy', 'compliance', 'consult']],
  // Creative and story-driven work — plum.
  ['plum', ['design', 'creative', 'market', 'media', 'brand', 'content', 'advertis', 'entertain', 'art', 'ux', 'writer', 'journal']],
  // Teaching, research, science — petrol blue-green.
  ['petrol', ['educat', 'teach', 'research', 'science', 'academ', 'universit', 'biolog', 'environment']],
  // Hands-on industry — ochre.
  ['ochre', ['construct', 'trade', 'logistic', 'transport', 'operation', 'manufactur', 'hospitality', 'retail', 'chef', 'warehouse', 'mining', 'agricult', 'electric', 'plumb', 'mechanic']],
  // Technology and everything else keeps the house rust.
  ['rust', []],
];

export interface AccentSignals {
  personaFunction?: string | null;
  subFunction?: string | null;
  vertical?: string | null;
  industry?: string | null;
}

/** Pick the accent for a profile. Deterministic keyword match, rust fallback. */
export function resolveAccent(signals: AccentSignals): CCAccent {
  const hay = [signals.personaFunction, signals.subFunction, signals.vertical, signals.industry]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  if (!hay) return 'rust';
  for (const [accent, keys] of ACCENT_KEYWORDS) {
    if (keys.some((k) => hay.includes(k))) return accent;
  }
  return 'rust';
}

/** Apply an accent to the document and remember it for the next visit. */
export function applyAccent(accent: CCAccent): void {
  if (typeof document === 'undefined') return;
  if (accent === 'rust') {
    delete document.documentElement.dataset.ccAccent;
  } else {
    document.documentElement.dataset.ccAccent = accent;
  }
  try {
    localStorage.setItem(STORAGE_KEY, accent);
  } catch {
    /* private mode — theming still applies for this page load */
  }
}

/** Re-apply the cached accent at boot, before any profile data arrives. */
export function applyStoredAccent(): void {
  if (typeof document === 'undefined') return;
  try {
    const stored = localStorage.getItem(STORAGE_KEY) as CCAccent | null;
    if (stored && ACCENTS.includes(stored) && stored !== 'rust') {
      document.documentElement.dataset.ccAccent = stored;
    }
  } catch {
    /* ignore */
  }
}

/** Clear the accent (sign-out / account deletion). */
export function clearAccent(): void {
  if (typeof document === 'undefined') return;
  delete document.documentElement.dataset.ccAccent;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
