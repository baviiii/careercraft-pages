/* Colour and logos for the Home feed.

   News sources get their real favicon (via Google's favicon service, which
   only ever sees the publisher's domain). Employers on Adzuna don't come
   with a website, so they get a lettered badge in a colour of their own:
   the same company is always the same colour. */

import { initials } from "@/features/job-tracker/lib/cardBits";

/** "https://www.abc.net.au/news/…" → "abc.net.au". */
export function hostOf(url: string | null): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, "") || null;
  } catch {
    return null;
  }
}

export function faviconUrl(host: string): string {
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=64`;
}

/* Solid badges read as logos where the soft tracker tints read as tags. */
const BADGES = [
  { bg: "var(--cc-rust)", fg: "#fff" },
  { bg: "var(--cc-signal)", fg: "#fff" },
  { bg: "var(--cc-wheat)", fg: "#fff" },
  { bg: "#C2412D", fg: "#fff" },
  { bg: "var(--cc-ink)", fg: "#fff" },
  { bg: "#1F7A8C", fg: "#fff" },
  { bg: "#FFDE59", fg: "var(--cc-ink)" },
];

export function badgeFor(name: string): { bg: string; fg: string; letters: string } {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return { ...BADGES[h % BADGES.length], letters: initials(name || "?") };
}

/** The job-news categories (supabase/functions/job-news/feeds.ts), in words and a tone. */
const CATEGORIES: Record<string, { label: string; tone: string }> = {
  hiring: { label: "Hiring", tone: "cc-tone-sage" },
  pay: { label: "Pay", tone: "cc-tone-wheat" },
  layoffs: { label: "Layoffs", tone: "fc-tone-pen" },
  visas: { label: "Visas", tone: "fc-tone-teal" },
  ai: { label: "AI", tone: "cc-tone-cobalt" },
  skills: { label: "Skills", tone: "fc-tone-teal" },
  workplace: { label: "Workplace", tone: "cc-tone-cobalt" },
  general: { label: "Work", tone: "cc-tone-ink" },
};

export function categoryOf(category: string): { label: string; tone: string } {
  const key = (category || "").toLowerCase();
  if (CATEGORIES[key]) return CATEGORIES[key];
  const label = key ? key.charAt(0).toUpperCase() + key.slice(1) : "News";
  return { label, tone: "cc-tone-ink" };
}
