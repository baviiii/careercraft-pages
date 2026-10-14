/* Open one of the saved résumés in the builder. */

import { ArrowRight, FileText } from "lucide-react";

import { CraftButton, CraftDialog } from "@/components/craft/AppPrimitives";

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
    title="Open a saved résumé"
    description="Pick one to carry on where you left off."
    maxWidth="max-w-xl"
    footer={
      <CraftButton variant="ghost" onClick={() => onOpenChange(false)}>
        Close
      </CraftButton>
    }
  >
    {savedResumes.length === 0 ? (
      <div className="rounded-xl bg-[color:var(--cc-cream-2)] px-6 py-10 text-center">
        <FileText className="mx-auto h-8 w-8 text-[color:var(--cc-ash)]" />
        <p className="mt-3 cc-font-display text-xl font-semibold leading-tight">No saved résumés yet.</p>
        <p className="mt-1.5 text-[14px] text-[color:var(--cc-ink-soft)]">
          Upload one, paste one in, or start blank.
        </p>
      </div>
    ) : (
      <ul className="max-h-[440px] space-y-2 overflow-y-auto">
        {savedResumes.map((resume) => (
          <li key={resume.id}>
            <button
              type="button"
              onClick={() => onSelect(resume)}
              className="group flex w-full items-center justify-between gap-4 rounded-xl border border-[color:var(--cc-hair)] bg-white p-4 text-left transition-colors hover:border-[color:var(--cc-rust)]"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[color:var(--cc-rust-soft)] text-[color:var(--cc-rust)]">
                  <FileText className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <div className="truncate text-[15px] font-semibold text-[color:var(--cc-ink)]">{resume.name}</div>
                  <div className="mt-0.5 cc-tabular text-[13px] text-[color:var(--cc-ash)]">
                    Saved{" "}
                    {new Date(resume.created_at).toLocaleDateString("en-AU", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </div>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 shrink-0 text-[color:var(--cc-ash)] transition-colors group-hover:text-[color:var(--cc-rust)]" />
            </button>
          </li>
        ))}
      </ul>
    )}
  </CraftDialog>
);
