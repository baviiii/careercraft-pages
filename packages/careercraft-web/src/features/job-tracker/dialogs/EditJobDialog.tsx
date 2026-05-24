import { useEffect, useState } from "react";

import { CraftButton, CraftDialog } from "@/components/craft/AppPrimitives";

import { EMPTY_FORM, appToForm } from "../types";
import type {
  CoverLetterRef,
  JobApplication,
  JobFormValues,
  ResumeRef,
} from "../types";
import { JobFormFields } from "./JobFormFields";

interface EditJobDialogProps {
  application: JobApplication | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resumes: ResumeRef[];
  coverLetters: CoverLetterRef[];
  onSubmit: (id: string, form: JobFormValues) => Promise<boolean>;
}

/** Editorial "Amend entry" dialog prefilled from an existing application. */
export const EditJobDialog = ({
  application,
  open,
  onOpenChange,
  resumes,
  coverLetters,
  onSubmit,
}: EditJobDialogProps) => {
  const [form, setForm] = useState<JobFormValues>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && application) setForm(appToForm(application));
  }, [open, application]);

  const update = (patch: Partial<JobFormValues>) =>
    setForm((p) => ({ ...p, ...patch }));

  const handleSubmit = async () => {
    if (!application) return;
    setSaving(true);
    const ok = await onSubmit(application.id, form);
    setSaving(false);
    if (ok) onOpenChange(false);
  };

  return (
    <CraftDialog
      open={open}
      onOpenChange={onOpenChange}
      kicker="§ Edit application"
      title={
        <>
          Update this <span className="cc-italic-wonk">application</span>.
        </>
      }
      description="Change the status, add notes, or update any details."
      maxWidth="max-w-2xl"
      footer={
        <>
          <CraftButton variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </CraftButton>
          <CraftButton onClick={handleSubmit} disabled={saving}>
            {saving ? "Saving…" : "Save changes"}
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
