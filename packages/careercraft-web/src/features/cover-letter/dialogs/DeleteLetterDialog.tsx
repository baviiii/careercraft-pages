import { Loader2 } from "lucide-react";
import { useState } from "react";

import { CraftButton, CraftDialog } from "@/components/craft/AppPrimitives";

interface DeleteLetterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  label: string;
  /** How many tracked applications this letter is attached to. */
  attachedTo: number;
  onConfirm: () => Promise<void>;
}

export const DeleteLetterDialog = ({
  open,
  onOpenChange,
  label,
  attachedTo,
  onConfirm,
}: DeleteLetterDialogProps) => {
  const [busy, setBusy] = useState(false);

  const confirm = async () => {
    setBusy(true);
    try {
      await onConfirm();
    } finally {
      setBusy(false);
    }
  };

  return (
    <CraftDialog
      open={open}
      onOpenChange={onOpenChange}
      kicker="Delete letter"
      title={`Delete “${label}”?`}
      description={
        attachedTo > 0
          ? `It's attached to ${attachedTo === 1 ? "an application" : `${attachedTo} applications`} in your tracker. They keep everything else, just not this letter.`
          : "This can't be undone."
      }
      footer={
        <>
          <CraftButton variant="ghost" onClick={() => onOpenChange(false)}>
            Keep it
          </CraftButton>
          <CraftButton variant="danger" onClick={confirm} disabled={busy}>
            {busy && <Loader2 className="w-4 h-4 animate-spin" />}
            Delete
          </CraftButton>
        </>
      }
    />
  );
};
