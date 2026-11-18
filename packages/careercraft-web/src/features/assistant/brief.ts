/* What the assistant says when someone arrives: a hello by name, the one
   most useful next step from their own data, and a line of encouragement.
   Pure functions, so the wording and the order of priorities live in one
   place and can be read top to bottom. */

import { tidyFileName } from "@/lib/fileNames";

export interface AssistantAction {
  label: string;
  path: string;
}

/** What a next step is about, which decides the little picture beside it. */
export type NudgeKind = "interview" | "follow-up" | "resume" | "saved" | "ats" | "track";

export interface AssistantNudge {
  kind: NudgeKind;
  text: string;
  /** The same step in a few words, for a one-line row. */
  short: string;
  action?: AssistantAction;
  /** The interview's day ("2026-11-20"), for a calendar page. */
  day?: string;
  /** How many follow-ups are due, or how many jobs are saved. */
  count?: number;
  /** The last ATS score, and the résumé it belongs to (tidied for show). */
  score?: number;
  resume?: string;
}

export interface AssistantBrief {
  firstName: string;
  hello: string;
  /** Up to three next steps, most urgent first. */
  nudges: AssistantNudge[];
  cheer: string;
}

export interface BriefApplication {
  company: string;
  status: string;
  reminder_date: string | null;
  interview_date: string | null;
}

export interface BriefResume {
  name: string;
  ats_score: number | null;
}

export interface BriefInput {
  firstName: string;
  applications: BriefApplication[];
  /** Most recently updated first. */
  resumes: BriefResume[];
  now: Date;
}

/* Written for people in the middle of a job hunt: warm, plain, no slogans.
   One is picked per person per day. */
export const CHEERS: string[] = [
  "Job hunting is mostly quiet work. Quiet work still counts.",
  "One careful application beats ten rushed ones.",
  "A no is about one role on one day. It isn't about you.",
  "You don't have to feel ready. You only need the next step.",
  "Every interview is practice for the one that ends in a yes.",
  "Small steps most days add up faster than big pushes now and then.",
  "No reply yet isn't an answer. Keep going.",
  "Your experience deserves to be described well. That's what we're here for.",
  "Rest counts as well. Come back fresh.",
  "Somewhere a team is hoping someone like you applies.",
  "Open one thing, finish one thing. That's a good day.",
  "You've done hard things before. This is one more.",
  "Nobody's résumé starts out perfect. Every edit makes yours better.",
  "Showing up is half of it, and you're here.",
];

/* The little bubbles Fay says now and then, between the daily hellos.
   Short enough to read at a glance; clicking one opens her card. */
export const BUBBLES: string[] = [
  "You've got this!",
  "One step at a time.",
  "Proud of you for showing up.",
  "Small steps still count.",
  "Take a breath. You're doing fine.",
  "Need a hand? Click me.",
  "Psst, I've got a tip for you.",
  "Ask me anything about Faircopy!",
];

/* Fay keeps the local clock: lively in the morning, sleepy late at night. */
export type DayPart = "morning" | "day" | "evening" | "night";

export function dayPart(now: Date): DayPart {
  const h = now.getHours();
  if (h >= 22 || h < 5) return "night";
  if (h < 11) return "morning";
  if (h < 18) return "day";
  return "evening";
}

/* A few lines only make sense at one time of day. */
const BUBBLES_AT: Partial<Record<DayPart, string[]>> = {
  morning: ["Morning! What's one thing for today?", "Fresh start. Let's go!"],
  night: ["It's getting late. Rest counts too.", "*yawn* Still here if you need me."],
};

/** A random bubble that isn't the one just shown, with the time of day's own lines mixed in. */
export function nextBubble(
  previous: string | null,
  random: () => number = Math.random,
  part: DayPart | null = null,
): string {
  const pool = [...BUBBLES, ...((part && BUBBLES_AT[part]) || [])].filter((b) => b !== previous);
  return pool[Math.floor(random() * pool.length)];
}

const ACTIVE = new Set(["saved", "applied", "interview"]);

/** A plain "2026-11-12" is a local calendar day; anything else is a timestamp. */
export function parseDay(value: string): Date {
  const plain = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return plain
    ? new Date(Number(plain[1]), Number(plain[2]) - 1, Number(plain[3]))
    : new Date(value);
}

/** Whole days from today to the date (0 = today, 1 = tomorrow, -1 = yesterday). */
export function daysFromToday(value: string, now: Date): number {
  const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  return Math.round((startOf(parseDay(value)) - startOf(now)) / 86_400_000);
}

function whenWord(days: number, value: string): string {
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  return `on ${parseDay(value).toLocaleDateString("en-AU", { weekday: "long" })}`;
}

/** The very first time Fay meets someone, she says who she is. */
export function introFor(firstName: string): { hello: string; line: string } {
  return {
    hello: firstName ? `Hi ${firstName}, I'm Fay!` : "Hi, I'm Fay!",
    line: "I'll point you to a useful next step each day. Click me any time to find a page or ask how something works.",
  };
}

export function helloFor(firstName: string, now: Date): string {
  if (dayPart(now) === "night") return firstName ? `You're up late, ${firstName}!` : "You're up late!";
  const h = now.getHours();
  const part = h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
  return firstName ? `${part}, ${firstName}!` : `${part}!`;
}

/** The same line all day for one person, a different one tomorrow. */
export function cheerFor(seed: string, now: Date): string {
  const day = Math.floor(
    (Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) - Date.UTC(now.getFullYear(), 0, 0)) /
      86_400_000,
  );
  let h = day;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return CHEERS[h % CHEERS.length];
}

/** Every next step that applies, most urgent first. */
export function pickNudges({ applications, resumes, now }: BriefInput): AssistantNudge[] {
  const nudges: AssistantNudge[] = [];

  const interview = applications
    .filter((a) => a.interview_date && a.status !== "rejected")
    .map((a) => ({ a, days: daysFromToday(a.interview_date as string, now) }))
    .filter(({ days }) => days >= 0 && days <= 3)
    .sort((x, y) => x.days - y.days)[0];
  if (interview) {
    const when = whenWord(interview.days, interview.a.interview_date as string);
    nudges.push({
      kind: "interview",
      text: `Your interview with ${interview.a.company} is ${when}. A practice round now can settle the nerves.`,
      short: `Interview with ${interview.a.company} ${when}`,
      action: { label: "Practise now", path: "/interview-prep" },
      day: interview.a.interview_date as string,
    });
  }

  const due = applications
    .filter((a) => a.reminder_date && ACTIVE.has(a.status))
    .map((a) => ({ a, days: daysFromToday(a.reminder_date as string, now) }))
    .filter(({ days }) => days <= 0)
    .sort((x, y) => x.days - y.days);
  if (due.length > 0) {
    nudges.push({
      kind: "follow-up",
      text:
        due.length === 1
          ? `Today's the day to follow up with ${due[0].a.company}.`
          : `${due.length} follow-ups are due. ${due[0].a.company} has waited longest.`,
      short:
        due.length === 1 ? `Follow up with ${due[0].a.company}` : `${due.length} follow-ups are due`,
      action: { label: "Open the tracker", path: "/tracker" },
      count: due.length,
    });
  }

  if (resumes.length === 0) {
    nudges.push({
      kind: "resume",
      text: "Let's start with your résumé. Everything else here builds on it.",
      short: "Build your résumé",
      action: { label: "Build my résumé", path: "/builder" },
    });
  }

  const saved = applications.filter((a) => a.status === "saved").length;
  if (saved > 0) {
    nudges.push({
      kind: "saved",
      text:
        saved === 1
          ? "You've saved a job but haven't applied yet. Today could be the day."
          : `You've saved ${saved} jobs but haven't applied yet. Pick one for today?`,
      short: saved === 1 ? "A saved job to apply for" : `${saved} saved jobs to apply for`,
      action: { label: "See saved jobs", path: "/tracker" },
      count: saved,
    });
  }

  const scored = resumes.find((r) => r.ats_score !== null);
  if (scored && (scored.ats_score as number) < 70) {
    nudges.push({
      kind: "ats",
      text: `Your résumé scored ${scored.ats_score} on its last ATS check. A few fixes could lift it.`,
      short: `Your résumé scored ${scored.ats_score} on its last ATS check`,
      action: { label: "Run a new check", path: "/analysis" },
      score: scored.ats_score as number,
      // Which one, when there's more than one to choose from.
      ...(resumes.length > 1 && {
        resume: tidyFileName(scored.name) || "Untitled résumé",
      }),
    });
  }

  if (resumes.length > 0 && applications.length === 0) {
    nudges.push({
      kind: "track",
      text: "Your résumé's ready. Add the jobs you're eyeing to the tracker so nothing slips.",
      short: "Add the jobs you're eyeing to the tracker",
      action: { label: "Open the tracker", path: "/tracker" },
    });
  }

  return nudges;
}

export function buildBrief(input: BriefInput, seed: string): AssistantBrief {
  return {
    firstName: input.firstName,
    hello: helloFor(input.firstName, input.now),
    nudges: pickNudges(input).slice(0, 3),
    cheer: cheerFor(seed, input.now),
  };
}
