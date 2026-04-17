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
    kicker="§ Strike from ledger"
    title="Remove this entry?"
    description={
      <>
        The application at{" "}
        <span className="cc-italic-wonk">
          “{application?.company || "this company"}”
        </span>{" "}
        will be permanently deleted. The line cannot be recovered.
      </>
    }
    footer={
      <>
        <CraftButton variant="ghost" onClick={() => onOpenChange(false)}>
          Keep it
        </CraftButton>
        <CraftButton variant="danger" onClick={onConfirm}>
          Strike it out
        </CraftButton>
      </>
    }
  />
);
