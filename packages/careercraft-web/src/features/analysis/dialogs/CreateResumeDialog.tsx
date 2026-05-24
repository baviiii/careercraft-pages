import {
  AlertTriangle,
  Briefcase,
  CheckCircle2,
  FileOutput,
  Save,
  Wand2,
} from "lucide-react";

import { CraftButton, CraftDialog } from "@/components/craft/AppPrimitives";
import type { ATSAIAnalysis } from "@/lib/atsAIAnalyzer";
import type { AIResumeData } from "@/lib/resumeParser";

interface CreateResumeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  analysis: ATSAIAnalysis | null;
  parsedResumeData: AIResumeData | null;
  isBuilderResume: boolean;
  selectedResumeTemplateId: string | null;
  onGoBuilder: () => void;
  onGoCoverLetter: () => void;
  onSaveResume: () => void;
  onAddToJobs: () => void;
}

export const CreateResumeDialog = ({
  open,
  onOpenChange,
  analysis,
  parsedResumeData,
  isBuilderResume,
  selectedResumeTemplateId,
  onGoBuilder,
  onGoCoverLetter,
  onSaveResume,
  onAddToJobs,
}: CreateResumeDialogProps) => (
  <CraftDialog
    open={open}
    onOpenChange={onOpenChange}
    kicker="§ What next"
    title={
      <>
        Set this draft in{" "}
        <span className="cc-italic-wonk">motion</span>.
      </>
    }
    description="Your data is extracted. Pick what to do next — build a new resume, draft a cover letter, save it, or track the job."
    maxWidth="max-w-2xl"
    footer={
      <CraftButton variant="ghost" onClick={() => onOpenChange(false)}>
        Cancel
      </CraftButton>
    }
  >
    {parsedResumeData && (
      <div className="border border-[color:var(--cc-hair-strong)] bg-[color:var(--cc-cream-2)] p-4 mb-5">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="w-4 h-4 mt-1 text-[color:var(--cc-rust)] flex-shrink-0" />
          <div className="min-w-0">
            <div className="cc-label text-[color:var(--cc-rust)]">
              § Data extracted
            </div>
            <p className="mt-1 cc-font-editorial italic text-[color:var(--cc-ink)]">
              {parsedResumeData.contact?.name &&
                `${parsedResumeData.contact.name}`}
              {parsedResumeData.experience?.length
                ? ` · ${parsedResumeData.experience.length} roles`
                : ""}
              {parsedResumeData.skills?.length
                ? ` · ${parsedResumeData.skills.length} skills`
                : ""}
            </p>
            {isBuilderResume && selectedResumeTemplateId && (
              <p className="mt-1 cc-label text-[color:var(--cc-rust)]">
                built with template · {selectedResumeTemplateId}
              </p>
            )}
          </div>
        </div>
      </div>
    )}

    <div className="grid grid-cols-2 gap-px bg-[color:var(--cc-hair-strong)] border border-[color:var(--cc-hair-strong)]">
      <DialogTile
        Icon={Wand2}
        kicker="§ 01"
        title={isBuilderResume ? "Edit in Builder" : "Resume Builder"}
        body={
          isBuilderResume
            ? "Edit using your current template."
            : "Pick a template & export as PDF."
        }
        onClick={onGoBuilder}
      />
      <DialogTile
        Icon={FileOutput}
        kicker="§ 02"
        title="Cover letter"
        body="Draft a tailored letter for this posting."
        onClick={onGoCoverLetter}
      />
      <DialogTile
        Icon={Save}
        kicker="§ 03"
        title="Save résumé"
        body="Save a copy to your resumes."
        onClick={onSaveResume}
      />
      <DialogTile
        Icon={Briefcase}
        kicker="§ 04"
        title="Track the job"
        body="Log this application in the tracker."
        onClick={onAddToJobs}
      />
    </div>

    {analysis && analysis.overallScore < 70 && (
      <div className="mt-5 border-l-2 border-[color:var(--cc-rust)] pl-4 flex items-start gap-2.5">
        <AlertTriangle className="w-4 h-4 mt-1 text-[color:var(--cc-rust)] flex-shrink-0" />
        <p className="cc-font-editorial italic text-[color:var(--cc-ink-soft)]">
          Reading of{" "}
          <span className="text-[color:var(--cc-ink)] cc-tabular">
            {analysis.overallScore}/100
          </span>
          . Run the rewrite tools before settling on a final draft.
        </p>
      </div>
    )}
  </CraftDialog>
);

const DialogTile = ({
  Icon,
  kicker,
  title,
  body,
  onClick,
}: {
  Icon: typeof Wand2;
  kicker: string;
  title: string;
  body: string;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className="bg-[color:var(--cc-cream)] p-5 text-left hover:bg-[color:var(--cc-cream-2)] transition-colors group"
  >
    <div className="flex items-start gap-3">
      <div className="flex-shrink-0 w-10 h-10 border border-[color:var(--cc-ink)] flex items-center justify-center group-hover:bg-[color:var(--cc-ink)] transition-colors">
        <Icon className="w-4 h-4 text-[color:var(--cc-rust)] group-hover:text-[color:var(--cc-cream)] transition-colors" />
      </div>
      <div className="min-w-0">
        <div className="cc-label text-[color:var(--cc-rust)]">{kicker}</div>
        <h4 className="mt-1.5 cc-font-display text-lg leading-tight">{title}</h4>
        <p className="mt-1 cc-font-editorial italic text-[color:var(--cc-ink-soft)] text-sm">
          {body}
        </p>
      </div>
    </div>
  </button>
);
