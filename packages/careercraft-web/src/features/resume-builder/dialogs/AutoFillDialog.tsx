/* Confirm filling the builder from the user's saved profile. */

import { Check, User } from "lucide-react";

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
    title="Fill from your profile"
    description="Only empty fields get filled. Anything you've already typed stays as it is."
    footer={
      <>
        <CraftButton variant="ghost" onClick={() => onOpenChange(false)}>
          Cancel
        </CraftButton>
        <CraftButton onClick={onConfirm}>
          <Check className="h-4 w-4" />
          Fill it in
        </CraftButton>
      </>
    }
  >
    <div className="rounded-xl bg-[color:var(--cc-cream-2)] p-4">
      <div className="flex items-center gap-2 text-[14px] font-medium text-[color:var(--cc-ink)]">
        <User className="h-4 w-4 text-[color:var(--cc-rust)]" />
        From {profileName || "your profile"}
      </div>
      <ul className="mt-2.5 space-y-1.5 text-[14.5px] text-[color:var(--cc-ink-soft)]">
        {[
          "Contact details: name, email, phone, location and links",
          "Your summary",
          `${profileSkillCount} skill${profileSkillCount === 1 ? "" : "s"}`,
          "Work history, if your profile has it",
        ].map((line) => (
          <li key={line} className="flex gap-2">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--cc-signal-deep)]" />
            {line}
          </li>
        ))}
      </ul>
    </div>
  </CraftDialog>
);
