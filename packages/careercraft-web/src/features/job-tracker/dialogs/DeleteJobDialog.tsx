import { CraftButton, CraftDialog } from "@/components/craft/AppPrimitives";

import type { JobApplication } from "../types";

interface DeleteJobDialogProps {
  application: JobApplication | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export const DeleteJobDialog = ({
  application,
  open,
  onOpenChange,
  onConfirm,
}: DeleteJobDialogProps) => (
  <CraftDialog
    open={open}
    onOpenChange={onOpenChange}
    title="Delete this job?"
    description={
      <>
        {application ? `${application.job_title} at ${application.company}` : "This job"} comes
        off your board for good, notes and all. Your résumés and cover letters stay where they are.
      </>
    }
    footer={
      <>
        <CraftButton variant="ghost" onClick={() => onOpenChange(false)}>
          Cancel
        </CraftButton>
        <CraftButton variant="danger" onClick={onConfirm}>
          Delete
        </CraftButton>
      </>
    }
  />
);
