/**
 * Getting ready for a real interview on the calendar. For each tracker job at
 * the interview stage (and each applied job, which is waiting on a phone
 * screen), a short plan of which rounds to practise, sized to the days left,
 * ticked off as practice sessions for that job are finished.
 *
 * Deterministic on purpose: "three days, so a behavioural round, a technical
 * round, then a full interview" is a rule a learner can check, not a guess.
 */
import { DAY_MS, shortDate, startOfDay } from "./progress";
import type { RoundType } from "./roundTypes";
import type { SessionRow } from "./sessions";
import type { TrackerJob } from "./practiceData";

export interface PrepStep {
  type: RoundType;
  done: boolean;
}

export interface PrepPlan {
  job: TrackerJob;
  /** Whole days until the interview date in the tracker; null when none is set. */
  daysLeft: number | null;
  /** "Today", "Tomorrow", "In 3 days · Tue 21 Oct", "No date set". */
  when: string;
  steps: PrepStep[];
  /** The first step not done yet. */
  next: RoundType | null;
}

/**
 * A tracker date ("2026-10-21") as that day, here. new Date("2026-10-21") is
 * midnight UTC, which west of Greenwich is the evening before.
 */
function localDay(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  const d = m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(value);
  return Number.isNaN(d.getTime()) ? null : startOfDay(d);
}

/** Which rounds to practise with this much time. */
function stepsFor(status: string, daysLeft: number | null): RoundType[] {
  if (status === "applied") return ["screen"];
  if (daysLeft === null || daysLeft >= 3) return ["behavioral", "technical", "full"];
  if (daysLeft === 2) return ["behavioral", "full"];
  return ["full"];
}

export function prepPlan(job: TrackerJob, sessions: SessionRow[], now = new Date()): PrepPlan | null {
  const date = job.interviewDate ? localDay(job.interviewDate) : null;
  const daysLeft = date ? Math.round((date.getTime() - startOfDay(now).getTime()) / DAY_MS) : null;
  // An interview that's been and gone isn't something to prepare for.
  if (daysLeft !== null && daysLeft < 0) return null;

  const practised = new Set(
    sessions
      .filter((s) => s.job_application_id === job.id && s.status === "completed")
      .map((s) => s.round_type),
  );
  const steps = stepsFor(job.status, daysLeft).map((type) => ({ type, done: practised.has(type) }));
  const when =
    daysLeft === null
      ? "No date set"
      : daysLeft === 0
        ? "Today"
        : daysLeft === 1
          ? "Tomorrow"
          : `In ${daysLeft} days · ${date!.toLocaleDateString("en-AU", { weekday: "short" })} ${shortDate(date!)}`;
  return { job, daysLeft, when, steps, next: steps.find((s) => !s.done)?.type ?? null };
}

/** Plans for the jobs that need one, soonest first, at most `limit`. */
export function upcomingPlans(jobs: TrackerJob[], sessions: SessionRow[], limit = 3, now = new Date()): PrepPlan[] {
  return jobs
    .filter((j) => j.status === "interview" || j.status === "applied")
    .map((j) => prepPlan(j, sessions, now))
    .filter((p): p is PrepPlan => p !== null)
    .sort((a, b) => {
      // Dated interviews first (soonest first), then undated interviews, then applications.
      const rank = (p: PrepPlan) => (p.job.status === "interview" ? (p.daysLeft === null ? 1 : 0) : 2);
      return rank(a) - rank(b) || (a.daysLeft ?? 99) - (b.daysLeft ?? 99);
    })
    .slice(0, limit);
}
