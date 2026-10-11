import { CraftDialog } from "@/components/craft/AppPrimitives";

import { TrackerButton } from "../components/TrackerButton";
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
        <TrackerButton variant="ghost" onClick={() => onOpenChange(false)}>
          Cancel
        </TrackerButton>
        <TrackerButton variant="danger" onClick={onConfirm}>
          Delete
        </TrackerButton>
      </>
    }
  />
);
