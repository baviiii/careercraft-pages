import { CraftButton, CraftDialog } from "@/components/craft/AppPrimitives";

import type { Resume } from "../types";

interface DeleteResumeDialogProps {
  resume: Resume | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export const DeleteResumeDialog = ({
  resume,
  open,
  onOpenChange,
  onConfirm,
}: DeleteResumeDialogProps) => (
  <CraftDialog
    open={open}
    onOpenChange={onOpenChange}
    kicker="§ Delete resume"
    title="Delete this resume?"
    description={
      <>
        <span className="cc-italic-wonk">
          “{resume?.name || "Untitled"}”
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
