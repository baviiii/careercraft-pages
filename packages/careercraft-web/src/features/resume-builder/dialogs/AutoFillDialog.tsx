/* Confirm auto-fill from the user's saved profile. */

import { Check, Sparkles, X } from "lucide-react";

import { CraftButton, CraftDialog } from "@/components/craft/AppPrimitives";

interface AutoFillDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profileName?: string;
  profileSkillCount: number;
  onConfirm: () => void;
}

export const AutoFillDialog = ({
  open,
  onOpenChange,
  profileName,
  profileSkillCount,
  onConfirm,
}: AutoFillDialogProps) => (
  <CraftDialog
    open={open}
    onOpenChange={onOpenChange}
    kicker="§ Auto-fill"
    title={
      <>
        Lift from the <span className="cc-italic-wonk">profile</span>.
      </>
    }
    description="Fill empty fields with what's on file — nothing already written will be overwritten."
    footer={
      <>
        <button
          onClick={() => onOpenChange(false)}
          className="cc-btn cc-btn-ghost"
        >
          <X className="w-4 h-4" />
          Cancel
        </button>
        <CraftButton onClick={onConfirm}>
          <Check className="w-4 h-4" />
          Fill it in
        </CraftButton>
      </>
    }
  >
    <div className="border border-[color:var(--cc-hair-strong)] bg-[color:var(--cc-cream-2)] p-5">
      <div className="flex items-start gap-3">
        <Sparkles className="w-5 h-5 mt-0.5 text-[color:var(--cc-rust)]" />
        <div>
          <div className="cc-label text-[color:var(--cc-ink)]">
            Lifting from {profileName || "your profile"}
          </div>
          <ul className="mt-3 space-y-1.5 cc-font-editorial text-[17px] text-[color:var(--cc-ink-soft)]">
            <li>· Contact (name, email, phone, location, links)</li>
            <li>· Professional summary</li>
            <li>· {profileSkillCount} filed skills</li>
            <li>· Career notes where available</li>
          </ul>
        </div>
      </div>
    </div>
  </CraftDialog>
);
