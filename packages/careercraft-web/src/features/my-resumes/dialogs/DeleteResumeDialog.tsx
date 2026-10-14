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
    title="Delete this résumé?"
    description={`“${resume?.name || "Untitled résumé"}” will be deleted for good. This can't be undone.`}
    footer={
      <>
        <CraftButton variant="ghost" onClick={() => onOpenChange(false)}>
          Keep it
        </CraftButton>
        <CraftButton variant="danger" onClick={onConfirm}>
          Delete
        </CraftButton>
      </>
    }
  />
);
