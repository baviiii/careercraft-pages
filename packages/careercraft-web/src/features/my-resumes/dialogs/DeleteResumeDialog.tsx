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
    kicker="§ Retire draft"
    title="Remove from the cabinet?"
    description={
      <>
        <span className="cc-italic-wonk">
          “{resume?.name || "Untitled"}”
        </span>{" "}
        will be permanently deleted. The pages cannot be brought back.
      </>
    }
    footer={
      <>
        <CraftButton variant="ghost" onClick={() => onOpenChange(false)}>
          Keep it
        </CraftButton>
        <CraftButton variant="danger" onClick={onConfirm}>
          Burn the draft
        </CraftButton>
      </>
    }
  />
);
