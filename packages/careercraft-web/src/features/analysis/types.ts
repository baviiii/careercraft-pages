import type { LucideIcon } from "lucide-react";

import { toneFor, type Tone } from "./tone";

export type AnalysisStep = "upload" | "analyzing" | "results";

export interface SavedResume {
  id: string;
  name: string;
  content: any;
  created_at: string;
  template_id?: string;
}

export interface SavedCoverLetter {
  id: string;
  content: string;
  created_at: string;
}

export type CoverLetterTone = "professional" | "confident" | "casual";

export type EnhancementType =
  | "auto-rewrite"
  | "rewrite-experience"
  | "generate-achievements"
  | "generate-summaries";

export type ResultTabId =
  | "overview"
  | "requirements"
  | "keywords"
  | "quality"
  | "redflags"
  | "improvements"
  | "enhance"
  | "coverletter";

export type SaveType = "original" | "enhanced";

export type ResumeSource = "upload" | "saved";

export interface ResultTab {
  id: ResultTabId;
  label: string;
  icon: LucideIcon;
}

const VERDICT: Record<Tone, string> = {
  good: "Strong match",
  ok: "Almost there",
  warn: "Needs work",
  bad: "Not ready",
};

/** The ATS score's band and the word stamped on the scorecard. */
export const scoreTone = (score: number): { tone: Tone; label: string } => {
  const tone = toneFor(score);
  return { tone, label: VERDICT[tone] };
};
