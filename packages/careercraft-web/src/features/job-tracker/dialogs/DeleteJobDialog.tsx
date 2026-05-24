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
    kicker="§ Delete application"
    title="Delete this application?"
    description={
      <>
        The application at{" "}
        <span className="cc-italic-wonk">
          “{application?.company || "this company"}”
        </span>{" "}
        will be permanently deleted. This cannot be undone.
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
