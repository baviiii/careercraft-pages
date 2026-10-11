/* Small pieces shared by the job card, the detail panel and the board:
   avatar initials and tint, friendly dates, what "next step" means at each
   stage, and the one line an empty lane shows. */

import type { ApplicationStatus, JobApplication } from "../types";

/* ── Avatar ──────────────────────────────────────────────────── */

const TONES: { bg: string; fg: string }[] = [
  { bg: "rgba(42, 82, 204, 0.12)", fg: "var(--cc-rust-deep)" },
  { bg: "rgba(63, 122, 92, 0.14)", fg: "var(--cc-signal-deep)" },
  { bg: "rgba(180, 135, 44, 0.18)", fg: "var(--cc-wheat-deep)" },
  { bg: "rgba(194, 65, 45, 0.12)", fg: "#9C3424" },
  { bg: "rgba(64, 69, 78, 0.10)", fg: "var(--cc-ink-2)" },
];

const SMALL_WORDS = /^(for|of|the|and|pty|ltd|limited|inc|co)$/i;

/** "Department for Education" → "DE", "Hays" → "H". */
export function initials(company: string): string {
  const words = company.split(/\s+/).filter((w) => /^[A-Za-z0-9]/.test(w) && !SMALL_WORDS.test(w));
  return (words.slice(0, 2).map((w) => w[0]).join("") || "?").toUpperCase();
}

/** The same company always gets the same tint. */
export function avatarTone(company: string): { bg: string; fg: string } {
  let h = 0;
  for (const ch of company) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return TONES[h % TONES.length];
}

/* ── Dates ───────────────────────────────────────────────────── */

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

/** Whole days between `iso` and today (0 = today). */
export function daysSince(iso: string): number {
  return Math.round((startOfDay(new Date()) - startOfDay(new Date(iso))) / 86_400_000);
}

const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-AU", { day: "numeric", month: "short" });

/** "today", "yesterday", "3 days ago", or "on 4 Oct" past a month. */
export function relativeDay(iso: string): string {
  const d = daysSince(iso);
  if (d <= 0) return "today";
  if (d === 1) return "yesterday";
  if (d < 31) return `${d} days ago`;
  return `on ${shortDate(iso)}`;
}

/** The quiet line at the foot of a card. */
export function whenLine(app: JobApplication): string {
  switch (app.status) {
    case "saved":
      return `saved ${relativeDay(app.applied_date)}`;
    case "applied":
      return `applied ${relativeDay(app.applied_date)}`;
    case "interview":
      return "interviewing";
    case "offer":
      return "offer in hand";
    case "rejected":
      return "closed";
  }
}

/** Is a follow-up date set for today or earlier? */
export function followUpDue(app: JobApplication): boolean {
  if (!app.reminder_date || app.status === "rejected" || app.status === "offer") return false;
  return daysSince(app.reminder_date) >= 0;
}

/** "Follow up today", "Follow-up overdue", or "Follow up 14 Oct". */
export function followUpLabel(app: JobApplication): string | null {
  if (!app.reminder_date) return null;
  const d = daysSince(app.reminder_date);
  if (d === 0) return "Follow up today";
  if (d > 0) return "Follow-up overdue";
  return `Follow up ${shortDate(app.reminder_date)}`;
}

/* ── Stages ──────────────────────────────────────────────────── */

export interface NextStep {
  label: string;
  to: ApplicationStatus;
  /** Rubber stamp shown on the card as it moves on. */
  stamp: string | null;
}

/** The one obvious move from each stage. Offer has none: you're done. */
export const NEXT_STEP: Partial<Record<ApplicationStatus, NextStep>> = {
  saved: { label: "I applied", to: "applied", stamp: "SENT" },
  applied: { label: "Got an interview", to: "interview", stamp: "INTERVIEW" },
  interview: { label: "Got an offer", to: "offer", stamp: "OFFER" },
  rejected: { label: "Reopen", to: "applied", stamp: null },
};

/** What an empty lane says. */
export const STAGE_EMPTY: Record<ApplicationStatus, string> = {
  saved: "Jobs you're eyeing land here, from Browse Jobs or the extension.",
  applied: "Nothing sent yet.",
  interview: "Interviews land here.",
  offer: "Offers land here. Fingers crossed.",
  rejected: "Jobs that didn't work out rest here.",
};

/** One sentence for the detail panel's "Next step" box. */
export const STAGE_HINT: Record<ApplicationStatus, string> = {
  saved: "When you've sent it, mark it as applied and the clock starts on replies.",
  applied: "Heard back? Move it along. No word in two weeks is a good time to follow up.",
  interview: "Practise the questions this kind of role tends to ask.",
  offer: "Congratulations. Take your time with the decision.",
  rejected: "It happens to everyone. Reopen it if they get back in touch.",
};
