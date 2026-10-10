import {
  AlertTriangle,
  ArrowRight,
  Briefcase,
  FileOutput,
  PenLine,
  Save,
  type LucideIcon,
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

/** "Jane Doe · 4 roles · 22 skills" — what was read from the résumé. */
const extractedLine = (data: AIResumeData | null) =>
  [
    data?.contact?.name,
    data?.experience?.length ? `${data.experience.length} roles` : "",
    data?.skills?.length ? `${data.skills.length} skills` : "",
  ]
    .filter(Boolean)
    .join(" · ");

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
    title="What next?"
    description={extractedLine(parsedResumeData) || undefined}
    maxWidth="max-w-2xl"
    footer={
      <CraftButton variant="ghost" onClick={() => onOpenChange(false)}>
        Cancel
      </CraftButton>
    }
  >
    {isBuilderResume && selectedResumeTemplateId && (
      <p className="mb-4 cc-label-sm text-[color:var(--cc-ash)]">
        Template · {selectedResumeTemplateId}
      </p>
    )}

    <div className="grid gap-3 sm:grid-cols-2">
      <DialogTile
        Icon={PenLine}
        title={isBuilderResume ? "Edit in builder" : "Résumé builder"}
        body={isBuilderResume ? "Keep your current template" : "Pick a template, export a PDF"}
        onClick={onGoBuilder}
      />
      <DialogTile
        Icon={FileOutput}
        title="Cover letter"
        body="A letter for this job"
        onClick={onGoCoverLetter}
      />
      <DialogTile
        Icon={Save}
        title="Save résumé"
        body="Keep a copy in My résumés"
        onClick={onSaveResume}
      />
      <DialogTile
        Icon={Briefcase}
        title="Track the job"
        body="Add it to the job tracker"
        onClick={onAddToJobs}
      />
    </div>

    {analysis && analysis.overallScore < 70 && (
      <p className="mt-5 flex items-start gap-2.5 rounded-xl bg-[color:var(--cc-wheat-soft)] px-4 py-3 text-[14px] text-[color:var(--cc-ink)]">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--cc-wheat-deep)]" />
        <span>
          Score <span className="cc-tabular font-semibold">{analysis.overallScore}/100</span> — the
          Rewrite tab can lift it first.
        </span>
      </p>
    )}
  </CraftDialog>
);

const DialogTile = ({
  Icon,
  title,
  body,
  onClick,
}: {
  Icon: LucideIcon;
  title: string;
  body: string;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className="group flex items-center gap-3.5 rounded-2xl border border-[color:var(--cc-hair)] bg-white p-4 text-left transition-colors hover:border-[color:var(--cc-ink)]"
  >
    <span className="cc-icon-chip h-10 w-10 shrink-0">
      <Icon className="h-4 w-4" />
    </span>
    <span className="min-w-0 flex-1">
      <span className="block cc-font-display text-[17px] leading-tight">{title}</span>
      <span className="mt-0.5 block text-[13px] text-[color:var(--cc-ink-soft)]">{body}</span>
    </span>
    <ArrowRight className="h-4 w-4 shrink-0 text-[color:var(--cc-ash)] transition-transform group-hover:translate-x-0.5 group-hover:text-[color:var(--cc-ink)]" />
  </button>
);
