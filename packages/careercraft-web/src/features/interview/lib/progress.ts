/**
 * Interview progress, worked out from the learner's session rows. Pure
 * functions: no fetching, no React, so the round picker, the progress panel
 * and history all agree on every number.
 */
import { ROUND_TYPES, type RoundType } from "./roundTypes";
import { normalizeScore100, sessionOverallScore, type SessionRow } from "./sessions";

/** A finished session's score out of 100, or null when there isn't one. */
export function rowScore(row: SessionRow): number | null {
  return row.status === "completed" ? normalizeScore100(sessionOverallScore(row)) : null;
}

export interface TypeProgress {
  type: RoundType;
  /** Every session of this type, finished or not. */
  count: number;
  finished: number;
  /** Most recent finished score, and the one before it. */
  latest: number | null;
  previous: number | null;
  average: number | null;
  /** Finished scores, oldest first, last eight — the sparkline. */
  scores: number[];
  lastPractised: string | null;
}

/** Progress for every round type, in picker order. Rows may come in any order. */
export function progressByType(rows: SessionRow[]): TypeProgress[] {
  const oldestFirst = [...rows].sort((a, b) => a.created_at.localeCompare(b.created_at));
  return ROUND_TYPES.map(({ id }) => {
    const mine = oldestFirst.filter((r) => r.round_type === id);
    const scores = mine.map(rowScore).filter((s): s is number => s !== null);
    return {
      type: id,
      count: mine.length,
      finished: mine.filter((r) => r.status === "completed").length,
      latest: scores.at(-1) ?? null,
      previous: scores.at(-2) ?? null,
      average: scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null,
      scores: scores.slice(-8),
      lastPractised: mine.at(-1)?.created_at ?? null,
    };
  });
}

/**
 * How a finished session compares with the previous finished session of the
 * same type. Comparing across types would be noise: a phone screen and a
 * technical round aren't scored on the same thing.
 */
export function scoreChange(rows: SessionRow[], row: SessionRow): number | null {
  const score = rowScore(row);
  if (score === null) return null;
  const earlier = rows
    .filter((r) => r.round_type === row.round_type && r.id !== row.id && r.created_at < row.created_at)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map(rowScore)
    .find((s): s is number => s !== null);
  return earlier === undefined ? null : score - earlier;
}

export function startOfDay(d: Date): Date {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  return out;
}

export const DAY_MS = 86_400_000;

export interface DaySessions {
  /** Local midnight of the day. */
  date: Date;
  isToday: boolean;
  /** Oldest first. */
  sessions: Array<{ id: string; type: RoundType; score: number | null; finished: boolean }>;
}

/** The last seven days, oldest first, ending today (local time). */
export function lastSevenDays(rows: SessionRow[], now = new Date()): DaySessions[] {
  const today = startOfDay(now);
  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (6 - i));
    const next = new Date(date);
    next.setDate(date.getDate() + 1);
    const sessions = rows
      .filter((r) => {
        const at = new Date(r.created_at);
        return at >= date && at < next;
      })
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
      .map((r) => ({ id: r.id, type: r.round_type, score: rowScore(r), finished: r.status === "completed" }));
    return { date, isToday: i === 6, sessions };
  });
}

/**
 * Days in a row with any practice, counting back from today — or from
 * yesterday, so a streak isn't shown as broken before today's session.
 */
export function practiceStreak(rows: SessionRow[], now = new Date()): { current: number; longest: number } {
  const days = new Set(rows.map((r) => startOfDay(new Date(r.created_at)).getTime()));
  if (!days.size) return { current: 0, longest: 0 };

  // Day keys are local midnights, so step by calendar day, not by 24 hours —
  // a daylight-saving change makes one day 23 or 25 hours long.
  const back = (t: number) => {
    const d = new Date(t);
    d.setDate(d.getDate() - 1);
    return d.getTime();
  };
  let cursor = startOfDay(now).getTime();
  if (!days.has(cursor)) cursor = back(cursor);
  let current = 0;
  while (days.has(cursor)) {
    current += 1;
    cursor = back(cursor);
  }

  const sorted = [...days].sort((a, b) => a - b);
  let longest = 1;
  let run = 1;
  for (let i = 1; i < sorted.length; i += 1) {
    // Within an hour of one day apart counts as consecutive (DST again).
    run = Math.abs(sorted[i]! - sorted[i - 1]! - DAY_MS) <= 3_600_000 ? run + 1 : 1;
    longest = Math.max(longest, run);
  }
  return { current, longest: Math.max(longest, current) };
}

/** Sessions started in the last seven days, today included. */
export function sessionsThisWeek(rows: SessionRow[], now = new Date()): number {
  const from = startOfDay(now);
  from.setDate(from.getDate() - 6);
  return rows.filter((r) => new Date(r.created_at) >= from).length;
}

/** Average of every finished session's score, and how many it's from. */
export function overallAverage(rows: SessionRow[]): { average: number | null; from: number } {
  const scores = rows.map(rowScore).filter((s): s is number => s !== null);
  return {
    average: scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null,
    from: scores.length,
  };
}

/** "9 Oct" — day first, as Australians read dates, never "10/9". */
export function shortDate(iso: string | Date): string {
  return new Date(iso).toLocaleDateString("en-AU", { day: "numeric", month: "short" });
}

/** "Today", "Yesterday", "3 days ago", then "9 Oct". */
export function relativeDay(iso: string, now = new Date()): string {
  const days = Math.round((startOfDay(now).getTime() - startOfDay(new Date(iso)).getTime()) / DAY_MS);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return shortDate(iso);
}

/** "+6", "−3", "±0" — a real minus sign, so the numbers line up. */
export function signed(n: number): string {
  if (n > 0) return `+${n}`;
  if (n < 0) return `−${Math.abs(n)}`;
  return "±0";
}
