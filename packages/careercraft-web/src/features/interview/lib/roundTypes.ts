/**
 * The four kinds of interview round, in the order a real hiring process runs
 * them: a recruiter's phone screen, then behavioural and technical rounds,
 * then the full final-round interview.
 *
 * Each type is real end to end. The coach builds a different set of questions
 * for each (interview-coach-mcp, domain/interview-loop.ts), scores answers
 * with that round's lens, saves the type on the session (round_type), and the
 * progress panel and history colour every session by it.
 *
 * The ids are the coach's ids and are stored in the database, so they keep
 * the code's American spelling ("behavioral"); the labels are what people see.
 */
import { Layers, MessagesSquare, Phone, Wrench, type LucideIcon } from "lucide-react";

import type { RoundType } from "@/lib/interviewCoach";

import type { InterviewMode } from "../types";

export type { RoundType };

export interface RoundTypeMeta {
  id: RoundType;
  label: string;
  /** The round in a sentence: "Start the {noun}". */
  noun: string;
  /** What the round is, in a few words. */
  lede: string;
  /** What it covers. */
  covers: string;
  icon: LucideIcon;
  /** Question counts offered for this round. The middle one is the default. */
  lengths: [number, number, number];
  defaultMode: InterviewMode;
  /** The coach's time budget per question, for the "about N min" estimate. */
  minutesPerQuestion: number;
  /** The answer box's prompt in the room. */
  answerPrompt: string;
}

export const ROUND_TYPES: RoundTypeMeta[] = [
  {
    id: "screen",
    label: "Phone screen",
    noun: "phone screen",
    lede: "The recruiter's first call",
    covers: "Your pitch, why this role, salary and notice period.",
    icon: Phone,
    lengths: [3, 4, 6],
    defaultMode: "coached",
    minutesPerQuestion: 2,
    answerPrompt: "Answer as you would on the phone — short, specific, to the point…",
  },
  {
    id: "behavioral",
    label: "Behavioural",
    noun: "behavioural round",
    lede: "“Tell me about a time…”",
    covers: "Past situations, one skill each, answered in STAR.",
    icon: MessagesSquare,
    lengths: [4, 6, 8],
    defaultMode: "coached",
    minutesPerQuestion: 4.5,
    answerPrompt: "The situation, what you had to do, what you did, and what came of it…",
  },
  {
    id: "technical",
    label: "Technical",
    noun: "technical round",
    lede: "The work itself",
    covers: "Method, judgement and trade-offs in your field.",
    icon: Wrench,
    lengths: [4, 6, 8],
    defaultMode: "realistic",
    minutesPerQuestion: 6.5,
    answerPrompt: "Talk it through — your approach, the trade-offs, what you would check…",
  },
  {
    id: "full",
    label: "Full interview",
    noun: "full interview",
    lede: "The final round",
    covers: "A mix of all of it, like a real panel.",
    icon: Layers,
    lengths: [4, 6, 8],
    defaultMode: "realistic",
    minutesPerQuestion: 5.5,
    answerPrompt: "Answer as you would out loud — specifics, structure, trade-offs…",
  },
];

export const DEFAULT_ROUND: RoundType = "full";

const BY_ID = new Map(ROUND_TYPES.map((t) => [t.id, t]));

/**
 * Anything unknown is a full interview: sessions saved before round types
 * existed have no type, and structurally they were full loops.
 */
export function parseRoundType(raw: unknown): RoundType {
  const s = typeof raw === "string" ? raw.trim().toLowerCase() : "";
  if (s === "behavioural") return "behavioral";
  return BY_ID.has(s as RoundType) ? (s as RoundType) : DEFAULT_ROUND;
}

export function roundMeta(type: RoundType): RoundTypeMeta {
  return BY_ID.get(type) ?? BY_ID.get(DEFAULT_ROUND)!;
}

/** The class that sets a round's colour variables (features/interview/interview.css). */
export function roundClass(type: RoundType): string {
  return `cc-iv-${type}`;
}

/** "about 10 min" for a round of `count` questions. */
export function roundMinutes(type: RoundType, count: number): number {
  const raw = roundMeta(type).minutesPerQuestion * count;
  return raw < 15 ? Math.max(5, Math.round(raw)) : Math.round(raw / 5) * 5;
}

/**
 * Interview plans come back with free-text round names ("Recruiter screen",
 * "System design", "Behavioral"). Practising one picks the closest type.
 */
export function roundTypeFromName(name: string): RoundType {
  const n = name.toLowerCase();
  if (/screen|phone|recruit|\bhr\b|first call/.test(n)) return "screen";
  if (/behavio|competenc|values|culture|star\b/.test(n)) return "behavioral";
  if (/technical|tech\b|coding|system|design|case|practical|skills|clinical|assessment/.test(n)) return "technical";
  return "full";
}
