import { useEffect, useState } from "react";

import { CraftButton, CraftDialog } from "@/components/craft/AppPrimitives";

import { EMPTY_FORM } from "../types";
import type {
  CoverLetterRef,
  JobFormValues,
  ResumeRef,
} from "../types";
import { JobFormFields } from "./JobFormFields";

interface AddJobDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resumes: ResumeRef[];
  coverLetters: CoverLetterRef[];
  onSubmit: (form: JobFormValues) => Promise<boolean>;
  /** Pre-fill, e.g. a job captured by the browser extension. */
  initial?: Partial<JobFormValues> | null;
  /** Where the pre-fill came from ("SEEK", "LinkedIn", a site name). */
  sourceLabel?: string | null;
}

/** Editorial "Log an application" dialog — blank, or pre-filled from a captured ad. */
export const AddJobDialog = ({
  open,
  onOpenChange,
  resumes,
  coverLetters,
  onSubmit,
  initial,
  sourceLabel,
}: AddJobDialogProps) => {
  const [form, setForm] = useState<JobFormValues>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setForm({ ...EMPTY_FORM, ...initial });
    // Reset only when the dialog opens, not when the parent re-renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const update = (patch: Partial<JobFormValues>) =>
    setForm((p) => ({ ...p, ...patch }));

  const handleSubmit = async () => {
    setSaving(true);
    const ok = await onSubmit(form);
    setSaving(false);
    if (ok) onOpenChange(false);
  };

  const captured = Boolean(initial);

  return (
    <CraftDialog
      open={open}
      onOpenChange={onOpenChange}
      kicker={captured ? `Saved from ${sourceLabel || "the web"}` : "§ Log an application"}
      title={
        captured ? (
          <>
            Check it, then <span className="cc-italic-wonk">save</span>.
          </>
        ) : (
          <>
            New <span className="cc-italic-wonk">application</span>.
          </>
        )
      }
      description={
        captured
          ? "Filled in from the ad you were looking at. Fix anything that came through wrong, add the résumé you'll use, and save."
          : "Company, role, and status are the essentials. Add the job description and notes if you have them."
      }
      maxWidth="max-w-2xl"
      footer={
        <>
          <CraftButton variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </CraftButton>
          <CraftButton onClick={handleSubmit} disabled={saving}>
            {saving ? "Saving…" : captured ? "Save job" : "Save application"}
          </CraftButton>
        </>
      }
    >
      <JobFormFields
        values={form}
        onChange={update}
        resumes={resumes}
        coverLetters={coverLetters}
      />
    </CraftDialog>
  );
};
