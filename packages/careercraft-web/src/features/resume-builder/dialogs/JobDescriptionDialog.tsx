/* The job ad dialog. With an ad in, the pen on each point can rewrite it
   to match what the ad asks for. */

import { Check } from "lucide-react";

import { CraftButton, CraftDialog } from "@/components/craft/AppPrimitives";

import { CraftTextarea } from "../components/FormField";

interface JobDescriptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobDescription: string;
  onJobDescriptionChange: (v: string) => void;
  onConfirm: () => void;
}

export const JobDescriptionDialog = ({
  open,
  onOpenChange,
  jobDescription,
  onJobDescriptionChange,
  onConfirm,
}: JobDescriptionDialogProps) => {
  const words = jobDescription.length
    ? jobDescription.split(/\s+/).filter(Boolean).length
    : 0;

  return (
    <CraftDialog
      open={open}
      onOpenChange={onOpenChange}
      title="The job ad"
      description="Paste the ad you're applying for. Rewrites of your points will use its words and priorities."
      maxWidth="max-w-2xl"
      footer={
        <>
          <CraftButton variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </CraftButton>
          {jobDescription && (
            <CraftButton variant="ghost" onClick={() => onJobDescriptionChange("")}>
              Clear
            </CraftButton>
          )}
          <CraftButton onClick={onConfirm}>
            <Check className="h-4 w-4" />
            {jobDescription ? "Use this ad" : "Close"}
          </CraftButton>
        </>
      }
    >
      <CraftTextarea
        value={jobDescription}
        onChange={(e) => onJobDescriptionChange(e.target.value)}
        placeholder={`Paste the job ad here, for example:

Customer Service Officer, full time, Adelaide CBD
About the role
· Answer customer enquiries by phone and email
· Keep accurate records in our CRM

About you
· 1+ years in a customer-facing role
· Clear written and spoken English`}
        aria-label="Job ad"
        className="min-h-[280px] text-[14px]"
      />
      <p className="mt-2.5 cc-tabular text-[13px] text-[color:var(--cc-ash)]">
        {words > 0 ? `${words} words.` : "The whole ad is best, including the 'About you' part."}
      </p>
    </CraftDialog>
  );
};
