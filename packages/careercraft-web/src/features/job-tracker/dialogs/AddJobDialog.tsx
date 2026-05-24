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
}

/** Editorial "Log an application" dialog with a blank form. */
export const AddJobDialog = ({
  open,
  onOpenChange,
  resumes,
  coverLetters,
  onSubmit,
}: AddJobDialogProps) => {
  const [form, setForm] = useState<JobFormValues>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setForm(EMPTY_FORM);
  }, [open]);

  const update = (patch: Partial<JobFormValues>) =>
    setForm((p) => ({ ...p, ...patch }));

  const handleSubmit = async () => {
    setSaving(true);
    const ok = await onSubmit(form);
    setSaving(false);
    if (ok) onOpenChange(false);
  };

  return (
    <CraftDialog
      open={open}
      onOpenChange={onOpenChange}
      kicker="§ Log an application"
      title={
        <>
          New <span className="cc-italic-wonk">application</span>.
        </>
      }
      description="Company, role, and status are the essentials. Add the job description and notes if you have them."
      maxWidth="max-w-2xl"
      footer={
        <>
          <CraftButton variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </CraftButton>
          <CraftButton onClick={handleSubmit} disabled={saving}>
            {saving ? "Saving…" : "Save application"}
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
