/* Paste your résumé's text and have it sorted into the builder's fields. */

import { Check } from "lucide-react";

import { CraftButton, CraftDialog } from "@/components/craft/AppPrimitives";
import { CraftSpinner } from "@/components/craft/CraftSpinner";

import { CraftTextarea } from "../components/FormField";

interface PasteTextDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pastedText: string;
  onPastedTextChange: (text: string) => void;
  isProcessing: boolean;
  onProcess: () => void;
}

export const PasteTextDialog = ({
  open,
  onOpenChange,
  pastedText,
  onPastedTextChange,
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
      title="Paste your résumé"
      description="We'll sort the text into the right fields. No account needed. Copying straight out of a PDF is fine, even if the columns come out jumbled."
      maxWidth="max-w-2xl"
      footer={
        <>
          <CraftButton
            variant="ghost"
            onClick={() => {
              onOpenChange(false);
              onPastedTextChange("");
            }}
          >
            Cancel
          </CraftButton>
          <CraftButton
            onClick={onProcess}
            disabled={!pastedText.trim() || isProcessing}
          >
            {isProcessing ? (
              <>
                <CraftSpinner size="sm" label="Reading" />
                Reading…
              </>
            ) : (
              <>
                <Check className="h-4 w-4" />
                Fill in my details
              </>
            )}
          </CraftButton>
        </>
      }
    >
      {/* The AI-parsing toggle that sat here is gone. Its "off" position
          selected a regex parser that cannot read a multi-column paste — a
          switch whose only function was to produce a worse result. */}
      <CraftTextarea
        value={pastedText}
        onChange={(e) => onPastedTextChange(e.target.value)}
        placeholder={`Paste your résumé text here, for example:

Sam Lee
sam@example.com · 0412 345 678 · Adelaide SA

EXPERIENCE
Customer Service Officer, SA Water
Mar 2022 – Present
· Handled 60+ customer calls a day
· Trained four new starters

EDUCATION
Bachelor of Business, University of Adelaide, 2021

SKILLS
Excel, Salesforce, customer service`}
        aria-label="Résumé text"
        className="min-h-[260px] text-[14px]"
      />
      <p className="mt-2.5 cc-tabular text-[13px] text-[color:var(--cc-ash)]">
        {words > 0 ? `${words} words.` : "Paste the whole thing. You can fix anything afterwards."}
      </p>
    </CraftDialog>
  );
};
