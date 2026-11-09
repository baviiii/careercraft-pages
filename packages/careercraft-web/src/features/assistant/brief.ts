/* What the assistant says when someone arrives: a hello by name, the one
   most useful next step from their own data, and a line of encouragement.
   Pure functions, so the wording and the order of priorities live in one
   place and can be read top to bottom. */

export interface AssistantAction {
  label: string;
  path: string;
}

export interface AssistantNudge {
  text: string;
  action?: AssistantAction;
}

export interface AssistantBrief {
  hello: string;
  nudge: AssistantNudge | null;
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

const ACTIVE = new Set(["saved", "applied", "interview"]);

/** A plain "2026-11-12" is a local calendar day; anything else is a timestamp. */
function parseDay(value: string): Date {
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

export function helloFor(firstName: string, now: Date): string {
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

/** The single most useful next step, most urgent first. */
export function pickNudge({ applications, resumes, now }: BriefInput): AssistantNudge | null {
  const interview = applications
    .filter((a) => a.interview_date && a.status !== "rejected")
    .map((a) => ({ a, days: daysFromToday(a.interview_date as string, now) }))
    .filter(({ days }) => days >= 0 && days <= 3)
    .sort((x, y) => x.days - y.days)[0];
  if (interview) {
    return {
      text: `Your interview with ${interview.a.company} is ${whenWord(
        interview.days,
        interview.a.interview_date as string,
      )}. A practice round now can settle the nerves.`,
      action: { label: "Practise now", path: "/interview-prep" },
    };
  }

  const due = applications
    .filter((a) => a.reminder_date && ACTIVE.has(a.status))
    .map((a) => ({ a, days: daysFromToday(a.reminder_date as string, now) }))
    .filter(({ days }) => days <= 0)
    .sort((x, y) => x.days - y.days);
  if (due.length === 1) {
    return {
      text: `Today's the day to follow up with ${due[0].a.company}.`,
      action: { label: "Open the tracker", path: "/tracker" },
    };
  }
  if (due.length > 1) {
    return {
      text: `${due.length} follow-ups are due. ${due[0].a.company} has waited longest.`,
      action: { label: "Open the tracker", path: "/tracker" },
    };
  }

  if (resumes.length === 0) {
    return {
      text: "Let's start with your résumé. Everything else here builds on it.",
      action: { label: "Build my résumé", path: "/builder" },
    };
  }

  const saved = applications.filter((a) => a.status === "saved").length;
  if (saved > 0) {
    return {
      text:
        saved === 1
          ? "You've saved a job but haven't applied yet. Today could be the day."
          : `You've saved ${saved} jobs but haven't applied yet. Pick one for today?`,
      action: { label: "See saved jobs", path: "/tracker" },
    };
  }

  const scored = resumes.find((r) => r.ats_score !== null);
  if (scored && (scored.ats_score as number) < 70) {
    return {
      text: `"${scored.name}" scored ${scored.ats_score} on its last ATS check. A few fixes could lift it.`,
      action: { label: "Run a new check", path: "/analysis" },
    };
  }

  if (applications.length === 0) {
    return {
      text: "Your résumé's ready. Add the jobs you're eyeing to the tracker so nothing slips.",
      action: { label: "Open the tracker", path: "/tracker" },
    };
  }

  return null;
}

export function buildBrief(input: BriefInput, seed: string): AssistantBrief {
  return {
    hello: helloFor(input.firstName, input.now),
    nudge: pickNudge(input),
    cheer: cheerFor(seed, input.now),
  };
}
