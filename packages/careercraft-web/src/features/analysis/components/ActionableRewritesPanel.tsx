import {
  AlignLeft,
  ArrowRight,
  BarChart3,
  Check,
  Copy,
  FileText,
  Loader2,
  PenLine,
  Trophy,
  X,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";

import type { ATSAIAnalysis } from "@/lib/atsAIAnalyzer";
import type { AIResumeData } from "@/lib/resumeParser";

import type { EnhancementType } from "../types";
import { MarkList } from "./proof";

interface ActionableRewritesPanelProps {
  analysis: ATSAIAnalysis;
  activeEnhancement: EnhancementType | null;
  enhancementResult: string;
  enhancedResumeData: AIResumeData | null;
  isReanalyzing: boolean;
  copiedText: string | null;
  onRun: (type: EnhancementType) => void;
  onApplyAndReanalyze: () => void;
  onCopy: (text: string, id: string) => void;
  onOpenSaveEnhanced: () => void;
  onGoBuilderWithEnhanced: () => void;
  onClearEnhancement: () => void;
}

const TOOLS: Array<{
  id: EnhancementType;
  icon: LucideIcon;
  label: string;
  desc: string;
}> = [
  {
    id: "auto-rewrite",
    icon: FileText,
    label: "Rewrite the whole résumé",
    desc: "Tailored to this job",
  },
  {
    id: "rewrite-experience",
    icon: PenLine,
    label: "Rewrite experience",
    desc: "Tighter bullets with numbers",
  },
  {
    id: "generate-achievements",
    icon: Trophy,
    label: "Achievement bullets",
    desc: "Results-first lines using the job's keywords",
  },
  {
    id: "generate-summaries",
    icon: AlignLeft,
    label: "Summary options",
    desc: "Professional, technical and skills-first versions",
  },
];

export const ActionableRewritesPanel = ({
  analysis,
  activeEnhancement,
  enhancementResult,
  enhancedResumeData,
  isReanalyzing,
  copiedText,
  onRun,
  onApplyAndReanalyze,
  onCopy,
  onOpenSaveEnhanced,
  onGoBuilderWithEnhanced,
  onClearEnhancement,
}: ActionableRewritesPanelProps) => {
  const hasResult = !!enhancementResult || !!enhancedResumeData;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        {TOOLS.map((tool) => {
          const isActive = activeEnhancement === tool.id;
          const isLoading = isActive && !hasResult;
          const isLocked = activeEnhancement !== null && !isActive && !hasResult;
          const Icon = tool.icon;
          return (
            <button
              key={tool.id}
              onClick={() => {
                if (!activeEnhancement || hasResult) onRun(tool.id);
              }}
              disabled={isLocked}
              className={`cc-surface cc-lift group w-full p-5 text-left md:p-6 ${
                isActive ? "outline outline-2 outline-[color:var(--cc-rust)]" : ""
              } ${isLocked ? "pointer-events-none opacity-40" : ""}`}
            >
              <div className="flex items-center gap-4">
                <span className="cc-icon-chip h-11 w-11 shrink-0">
                  <Icon className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="cc-font-display text-[18px] leading-tight text-[color:var(--cc-ink)]">
                    {tool.label}
                  </h3>
                  <p className="mt-1 text-[14px] text-[color:var(--cc-ink-soft)]">{tool.desc}</p>
                </div>
                {isLoading ? (
                  <Loader2 className="h-5 w-5 shrink-0 animate-spin text-[color:var(--cc-rust)]" />
                ) : (
                  <ArrowRight className="h-4 w-4 shrink-0 text-[color:var(--cc-ash)] transition-transform group-hover:translate-x-0.5 group-hover:text-[color:var(--cc-ink)]" />
                )}
              </div>
            </button>
          );
        })}
      </div>

      {activeEnhancement && enhancementResult && !enhancedResumeData && (
        <ResultShell
          score={analysis.overallScore}
          actions={
            <>
              <ApplyButton busy={isReanalyzing} onClick={onApplyAndReanalyze} />
              <button
                className="cc-action cc-action--ghost cc-action--sm"
                onClick={() => onCopy(enhancementResult, "enhancement")}
              >
                {copiedText === "enhancement" ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
                Copy
              </button>
              <button className="cc-action cc-action--ghost cc-action--sm" onClick={onOpenSaveEnhanced}>
                <PenLine className="h-3.5 w-3.5" />
                Edit in builder
              </button>
              <CloseButton onClick={onClearEnhancement} />
            </>
          }
        >
          <div className="cc-proof-sheet max-h-[480px] overflow-auto p-6 md:p-9">
            <div className="whitespace-pre-wrap">{enhancementResult}</div>
          </div>
        </ResultShell>
      )}

      {activeEnhancement && enhancedResumeData && (
        <ResultShell
          score={analysis.overallScore}
          actions={
            <>
              <ApplyButton busy={isReanalyzing} onClick={onApplyAndReanalyze} />
              <button
                className="cc-action cc-action--ghost cc-action--sm"
                onClick={onGoBuilderWithEnhanced}
              >
                <PenLine className="h-3.5 w-3.5" />
                Open in builder
              </button>
              <CloseButton onClick={onClearEnhancement} />
            </>
          }
        >
          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <div className="cc-label-sm mb-2 text-[color:var(--cc-ash)]">Summary</div>
              <div className="cc-proof-sheet p-5">{enhancedResumeData.summary || "—"}</div>
            </div>
            <div>
              <div className="cc-label-sm mb-2 text-[color:var(--cc-ash)]">
                Skills · {enhancedResumeData.skills?.length || 0}
              </div>
              <div className="cc-proof-sheet p-5">
                <MarkList items={enhancedResumeData.skills ?? []} kind="plain" limit={12} />
              </div>
            </div>
          </div>

          <div className="mt-5">
            <div className="cc-label-sm mb-2 text-[color:var(--cc-ash)]">Experience</div>
            <div className="cc-proof-sheet max-h-72 space-y-6 overflow-auto p-5 md:p-6">
              {enhancedResumeData.experience?.map((exp, i) => (
                <div key={exp.id || i}>
                  <p className="cc-font-display text-[17px] leading-tight">
                    {exp.title}
                    <span className="font-normal text-[color:var(--cc-ink-soft)]"> · {exp.company}</span>
                  </p>
                  <p className="cc-label-sm mt-1 text-[color:var(--cc-ash)]">
                    {exp.startDate} – {exp.endDate}
                  </p>
                  <ul className="mt-3 space-y-1.5">
                    {exp.bullets?.slice(0, 3).map((bullet, j) => (
                      <li key={j} className="relative pl-4 text-[14.5px] before:absolute before:left-0 before:text-[color:var(--cc-ash)] before:content-['–']">
                        {bullet}
                      </li>
                    ))}
                    {(exp.bullets?.length || 0) > 3 && (
                      <li className="pl-4 text-[13px] text-[color:var(--cc-ash)]">
                        +{exp.bullets!.length - 3} more
                      </li>
                    )}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </ResultShell>
      )}
    </div>
  );
};

const ResultShell = ({
  score,
  actions,
  children,
}: {
  score: number;
  actions: ReactNode;
  children: ReactNode;
}) => (
  <section className="cc-surface p-6 md:p-8">
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h3 className="cc-font-display text-[24px] leading-tight text-[color:var(--cc-ink)]">
          Rewrite ready
        </h3>
        <p className="mt-1 text-[14px] text-[color:var(--cc-ink-soft)]">
          Current score <span className="cc-tabular font-semibold text-[color:var(--cc-ink)]">{score}</span>
          {score < 80 && " · aim for 80+"}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">{actions}</div>
    </div>
    {children}
  </section>
);

const ApplyButton = ({ busy, onClick }: { busy: boolean; onClick: () => void }) => (
  <button className="cc-action cc-action--sm" onClick={onClick} disabled={busy}>
    {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <BarChart3 className="h-3.5 w-3.5" />}
    {busy ? "Re-scoring…" : "Apply & re-score"}
  </button>
);

const CloseButton = ({ onClick }: { onClick: () => void }) => (
  <button
    className="cc-action cc-action--ghost cc-action--sm !px-2.5"
    onClick={onClick}
    aria-label="Close rewrite"
  >
    <X className="h-3.5 w-3.5" />
  </button>
);
