/* Target-role dialog — paste the job description, unlock AI rewrite. */

import { Check } from "lucide-react";

import { CraftButton, CraftDialog } from "@/components/craft/AppPrimitives";

import { CraftTextarea } from "../components/FormField";

interface JobDescriptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobDescription: string;
  onJobDescriptionChange: (v: string) => void;
  onConfirm: () => void;
}

export const JobDescriptionDialog = ({
  open,
  onOpenChange,
  jobDescription,
  onJobDescriptionChange,
  onConfirm,
}: JobDescriptionDialogProps) => {
  const words = jobDescription.length
    ? jobDescription.split(/\s+/).filter(Boolean).length
    : 0;

  return (
    <CraftDialog
      open={open}
      onOpenChange={onOpenChange}
      kicker="§ Target role"
      title={
        <>
          The <span className="cc-italic-wonk">brief</span>.
        </>
      }
      description="Paste the job description. AI rewrite will lean into these keywords and priorities."
      maxWidth="max-w-2xl"
      footer={
        <>
          <button
            onClick={() => onOpenChange(false)}
            className="cc-btn cc-btn-ghost"
          >
            Cancel
          </button>
          {jobDescription && (
            <button
              onClick={() => onJobDescriptionChange("")}
              className="cc-btn cc-btn-ghost"
            >
              Clear
            </button>
          )}
          <CraftButton onClick={onConfirm}>
            <Check className="w-4 h-4" />
            {jobDescription ? "File target" : "Close"}
          </CraftButton>
        </>
      }
    >
      <CraftTextarea
        value={jobDescription}
        onChange={(e) => onJobDescriptionChange(e.target.value)}
        placeholder={`Paste the job description here…

We're hiring a Senior Engineer with experience in:
· React, TypeScript, Node
· Scaling web apps
· Leading cross-functional teams

Requirements:
· 5+ years of experience
· BSc in CS or equivalent`}
        className="min-h-[280px] font-mono text-sm"
      />
      <p className="mt-3 cc-font-editorial italic text-[color:var(--cc-ink-soft)] cc-tabular">
        {words > 0
          ? `${words} words on the brief.`
          : "Paste anywhere — we'll match your bullets to the role."}
      </p>
    </CraftDialog>
  );
};
