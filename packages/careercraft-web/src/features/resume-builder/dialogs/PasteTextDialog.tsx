/* Paste-text dialog — editorial styling, not a shadcn panel. */

import { Check, Loader2, Sparkles } from "lucide-react";

import { CraftButton, CraftDialog } from "@/components/craft/AppPrimitives";

import { CraftTextarea } from "../components/FormField";

interface PasteTextDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pastedText: string;
  onPastedTextChange: (text: string) => void;
  useAIParsing: boolean;
  onToggleAIParsing: (v: boolean) => void;
  isProcessing: boolean;
  onProcess: () => void;
}

export const PasteTextDialog = ({
  open,
  onOpenChange,
  pastedText,
  onPastedTextChange,
  useAIParsing,
  onToggleAIParsing,
  isProcessing,
  onProcess,
}: PasteTextDialogProps) => {
  const words = pastedText.length
    ? pastedText.split(/\s+/).filter(Boolean).length
    : 0;

  return (
    <CraftDialog
      open={open}
      onOpenChange={onOpenChange}
      kicker="§ Paste"
      title={
        <>
          Type it <span className="cc-italic-wonk">in</span>.
        </>
      }
      description={
        useAIParsing
          ? "AI will read the text and extract structured data."
          : "Basic extraction. Flip AI on for a finer read."
      }
      maxWidth="max-w-2xl"
      footer={
        <>
          <button
            onClick={() => {
              onOpenChange(false);
              onPastedTextChange("");
            }}
            className="cc-btn cc-btn-ghost"
          >
            Cancel
          </button>
          <CraftButton
            onClick={onProcess}
            disabled={!pastedText.trim() || isProcessing}
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Reading…
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                Read & compose
              </>
            )}
          </CraftButton>
        </>
      }
    >
      <div className="space-y-4">
        <label className="flex items-center justify-between border border-[color:var(--cc-hair-strong)] bg-[color:var(--cc-cream-2)] px-4 py-3 cursor-pointer">
          <div className="flex items-center gap-2">
            <Sparkles
              className={`w-4 h-4 ${
                useAIParsing
                  ? "text-[color:var(--cc-rust)]"
                  : "text-[color:var(--cc-ash)]"
              }`}
            />
            <span className="cc-label text-[color:var(--cc-ink)]">
              AI parsing
            </span>
          </div>
          <input
            type="checkbox"
            checked={useAIParsing}
            onChange={(e) => onToggleAIParsing(e.target.checked)}
            className="w-4 h-4 accent-[color:var(--cc-ink)]"
          />
        </label>

        <CraftTextarea
          value={pastedText}
          onChange={(e) => onPastedTextChange(e.target.value)}
          placeholder={`Paste the résumé text here…

Jane Doe
jane@example.com · (555) 123-4567 · Adelaide, SA

EXPERIENCE
Software Engineer at Acme
Jan 2020 – Present
· Shipped scalable APIs serving 1M+ users
· Led team of five

EDUCATION
BSc Computer Science, UoA, 2019

SKILLS
React, TypeScript, Postgres, AWS`}
          className="min-h-[260px] font-mono text-sm"
        />

        <p className="cc-font-editorial italic text-[color:var(--cc-ink-soft)] cc-tabular">
          {words > 0
            ? `${words} words · ready to compose.`
            : "Paste anything and we'll sort the stacks."}
        </p>
      </div>
    </CraftDialog>
  );
};
