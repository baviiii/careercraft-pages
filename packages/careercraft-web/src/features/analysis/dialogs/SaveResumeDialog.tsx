import { CraftButton, CraftDialog } from "@/components/craft/AppPrimitives";
import type { ATSAIAnalysis } from "@/lib/atsAIAnalyzer";

import type { SaveType } from "../types";

interface SaveResumeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  saveName: string;
  onSaveNameChange: (value: string) => void;
  saveType: SaveType;
  isSaving: boolean;
  analysis: ATSAIAnalysis | null;
  onConfirm: () => void;
}

export const SaveResumeDialog = ({
  open,
  onOpenChange,
  saveName,
  onSaveNameChange,
  saveType,
  isSaving,
  analysis,
  onConfirm,
}: SaveResumeDialogProps) => (
  <CraftDialog
    open={open}
    onOpenChange={onOpenChange}
    kicker="§ File it"
    title={
      <>
        Save &{" "}
        <span className="cc-italic-wonk">edit</span> in Builder
      </>
    }
    description="The draft will be parsed, filed to your cabinet, and opened in the Builder for a template."
    maxWidth="max-w-lg"
    footer={
      <>
        <CraftButton variant="ghost" onClick={() => onOpenChange(false)}>
          Cancel
        </CraftButton>
        <CraftButton onClick={onConfirm} disabled={isSaving}>
          {isSaving ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
              Parsing…
            </>
          ) : (
            <>Continue to Builder</>
          )}
        </CraftButton>
      </>
    }
  >
    <div className="space-y-5">
      <label className="block">
        <span className="cc-label text-[color:var(--cc-ash)] block mb-2">
          Name the draft
        </span>
        <input
          value={saveName}
          onChange={(e) => onSaveNameChange(e.target.value)}
          className="cc-input"
          placeholder="e.g. Senior PM — Stripe"
        />
      </label>

      <div className="border-l-2 border-[color:var(--cc-rust)] pl-4">
        <div className="cc-label text-[color:var(--cc-rust)]">§ What happens next</div>
        <ol className="mt-2 space-y-1.5 cc-font-editorial italic text-[color:var(--cc-ink-soft)]">
          <li>i. the draft is parsed into structured fields</li>
          <li>ii. you'll pick a template in the Builder</li>
          <li>iii. edit, rework, and export as a clean PDF</li>
        </ol>
      </div>

      <div className="border border-[color:var(--cc-hair-strong)] bg-[color:var(--cc-cream-2)] p-4">
        <div className="cc-meta">
          <span className="cc-meta-label">Saving</span>
          <span className="cc-meta-value">
            {saveType === "enhanced" ? "Enhanced version" : "Original résumé"}
          </span>
        </div>
        {analysis && (
          <div className="cc-meta mt-1.5">
            <span className="cc-meta-label">Reading</span>
            <span className="cc-meta-value">
              {analysis.overallScore} / 100
            </span>
          </div>
        )}
      </div>
    </div>
  </CraftDialog>
);
