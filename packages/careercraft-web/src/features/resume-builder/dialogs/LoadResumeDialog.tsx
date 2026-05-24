/* The cabinet — open one of the saved résumés. */

import { ArrowRight, FileText } from "lucide-react";

import { CraftDialog } from "@/components/craft/AppPrimitives";

import type { SavedResumeRow } from "../types";

interface LoadResumeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  savedResumes: SavedResumeRow[];
  onSelect: (resume: SavedResumeRow) => void;
}

export const LoadResumeDialog = ({
  open,
  onOpenChange,
  savedResumes,
  onSelect,
}: LoadResumeDialogProps) => (
  <CraftDialog
    open={open}
    onOpenChange={onOpenChange}
    kicker="§ Your resumes"
    title={
      <>
        Open a <span className="cc-italic-wonk">saved resume</span>.
      </>
    }
    description="Pick one and you'll pick up right where you left off."
    maxWidth="max-w-xl"
    footer={
      <button
        onClick={() => onOpenChange(false)}
        className="cc-btn cc-btn-ghost"
      >
        Close
      </button>
    }
  >
    {savedResumes.length === 0 ? (
      <div className="border border-[color:var(--cc-hair-strong)] bg-[color:var(--cc-cream-2)] p-10 text-center">
        <FileText className="w-10 h-10 mx-auto text-[color:var(--cc-ink-soft)]" />
        <p className="mt-4 cc-font-display text-2xl leading-tight">
          No resumes saved yet.
        </p>
        <p className="mt-2 cc-font-editorial italic text-[color:var(--cc-ink-soft)]">
          Upload a résumé, paste one in, or start from scratch.
        </p>
      </div>
    ) : (
      <ul className="max-h-[440px] overflow-y-auto space-y-px border border-[color:var(--cc-hair-strong)]">
        {savedResumes.map((resume, index) => (
          <li key={resume.id}>
            <button
              onClick={() => onSelect(resume)}
              className="w-full text-left bg-[color:var(--cc-cream)] hover:bg-[color:var(--cc-cream-2)] transition-colors p-4 md:p-5 flex items-center justify-between gap-4 group"
            >
              <div className="flex items-start gap-4 min-w-0">
                <span className="cc-font-display italic text-[color:var(--cc-rust)] text-xl cc-tabular pt-1 w-10 flex-shrink-0">
                  {String(index + 1).padStart(2, "0")}.
                </span>
                <div className="min-w-0">
                  <div className="cc-font-display text-xl leading-tight tracking-tight truncate">
                    {resume.name}
                  </div>
                  <div className="mt-1 cc-label text-[color:var(--cc-ash)] cc-tabular">
                    saved{" "}
                    {new Date(resume.created_at).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </div>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-[color:var(--cc-ash)] group-hover:text-[color:var(--cc-rust)] transition-colors flex-shrink-0" />
            </button>
          </li>
        ))}
      </ul>
    )}
  </CraftDialog>
);
