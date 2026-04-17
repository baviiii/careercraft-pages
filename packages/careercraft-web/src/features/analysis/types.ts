import type {
  LayoutGrid,
  BriefcaseIcon,
  Search,
  FileCheck,
  AlertTriangle,
  Lightbulb,
  Wand2,
  FileOutput,
} from "lucide-react";

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
  icon:
    | typeof LayoutGrid
    | typeof BriefcaseIcon
    | typeof Search
    | typeof FileCheck
    | typeof AlertTriangle
    | typeof Lightbulb
    | typeof Wand2
    | typeof FileOutput;
}

/** Editorial tone helper — returns classes keyed to the ATS score. */
export const scoreTone = (score: number): {
  tone: "strong" | "steady" | "uneven" | "weak";
  label: string;
} => {
  if (score >= 80) return { tone: "strong", label: "Well set" };
  if (score >= 60) return { tone: "steady", label: "Passable" };
  if (score >= 40) return { tone: "uneven", label: "Needs edits" };
  return { tone: "weak", label: "Unready" };
};
