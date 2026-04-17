import {
  BarChart3,
  Check,
  CheckCircle2,
  Copy,
  FileOutput,
  PenLine,
  Sparkles,
  Trophy,
  Wand2,
  X,
} from "lucide-react";

import { CraftButton } from "@/components/craft/AppPrimitives";
import type { ATSAIAnalysis } from "@/lib/atsAIAnalyzer";
import type { AIResumeData } from "@/lib/resumeParser";

import type { EnhancementType } from "../types";

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
  icon: typeof Sparkles;
  label: string;
  desc: string;
  kicker: string;
}> = [
  {
    id: "auto-rewrite",
    icon: Sparkles,
    label: "Auto-rewrite the draft",
    desc: "A complete pass, optimised for this posting.",
    kicker: "§ Full rewrite",
  },
  {
    id: "rewrite-experience",
    icon: PenLine,
    label: "Rewrite the experience",
    desc: "Tighten the work history with metrics.",
    kicker: "§ Experience",
  },
  {
    id: "generate-achievements",
    icon: Trophy,
    label: "Draft achievement bullets",
    desc: "Keyword-rich, accomplishment-led lines.",
    kicker: "§ Achievements",
  },
  {
    id: "generate-summaries",
    icon: FileOutput,
    label: "Spin new summaries",
    desc: "Professional, technical, and skills-first variants.",
    kicker: "§ Summaries",
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
}: ActionableRewritesPanelProps) => (
  <div className="space-y-8">
    <div className="grid md:grid-cols-2 gap-5">
      {TOOLS.map((tool) => {
        const isLoading =
          activeEnhancement === tool.id && !enhancementResult && !enhancedResumeData;
        const isLocked =
          activeEnhancement !== null &&
          activeEnhancement !== tool.id &&
          !enhancementResult &&
          !enhancedResumeData;
        const Icon = tool.icon;
        return (
          <button
            key={tool.id}
            onClick={() => {
              if (!activeEnhancement || enhancementResult || enhancedResumeData) {
                onRun(tool.id);
              }
            }}
            disabled={isLocked}
            className={`cc-card cc-card-hover p-6 text-left ${
              activeEnhancement === tool.id
                ? "bg-[color:var(--cc-cream-2)]"
                : ""
            } ${isLocked ? "opacity-40 pointer-events-none" : ""}`}
          >
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 border border-[color:var(--cc-ink)] flex items-center justify-center">
                <Icon className="w-5 h-5 text-[color:var(--cc-rust)]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="cc-label text-[color:var(--cc-rust)]">
                  {tool.kicker}
                </div>
                <h4 className="mt-2 cc-font-display text-xl leading-tight">
                  {tool.label}
                </h4>
                <p className="mt-2 cc-font-editorial italic text-[color:var(--cc-ink-soft)]">
                  {tool.desc}
                </p>
              </div>
              {isLoading && (
                <div className="w-5 h-5 border-2 border-[color:var(--cc-ink)] border-t-transparent rounded-full animate-spin flex-shrink-0" />
              )}
            </div>
          </button>
        );
      })}
    </div>

    {activeEnhancement && enhancementResult && !enhancedResumeData && (
      <section className="border-2 border-[color:var(--cc-ink)] bg-[color:var(--cc-cream)] p-7">
        <div className="flex items-start justify-between gap-4 mb-5 flex-wrap">
          <div>
            <div className="cc-label text-[color:var(--cc-rust)]">
              § The rewrite
            </div>
            <h3 className="mt-2 cc-font-display text-2xl leading-tight">
              Fresh <span className="cc-italic-wonk">draft</span> ready.
            </h3>
          </div>
          <div className="flex flex-wrap gap-2">
            <CraftButton
              size="sm"
              onClick={onApplyAndReanalyze}
              disabled={isReanalyzing}
            >
              {isReanalyzing ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Re-reading…
                </>
              ) : (
                <>
                  <BarChart3 className="w-3.5 h-3.5" />
                  Apply & re-read
                </>
              )}
            </CraftButton>
            <CraftButton
              size="sm"
              variant="ghost"
              onClick={() => onCopy(enhancementResult, "enhancement")}
            >
              {copiedText === "enhancement" ? (
                <Check className="w-3.5 h-3.5" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              Copy
            </CraftButton>
            <CraftButton size="sm" variant="ghost" onClick={onOpenSaveEnhanced}>
              <Wand2 className="w-3.5 h-3.5" />
              Edit in Builder
            </CraftButton>
            <CraftButton size="sm" variant="ghost" onClick={onClearEnhancement}>
              <X className="w-3.5 h-3.5" />
            </CraftButton>
          </div>
        </div>

        <div className="border border-[color:var(--cc-hair-strong)] bg-[color:var(--cc-cream-2)] p-4 mb-5">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-baseline gap-3">
              <span className="cc-font-display cc-tabular text-3xl text-[color:var(--cc-ink)]">
                {analysis.overallScore}
              </span>
              <span className="cc-label text-[color:var(--cc-ash)]">
                current reading
              </span>
            </div>
            {analysis.overallScore < 80 && (
              <span className="cc-pill cc-pill-rust">Goal · 80 +</span>
            )}
          </div>
          <p className="mt-2 cc-font-editorial italic text-sm text-[color:var(--cc-ink-soft)]">
            {analysis.overallScore >= 80
              ? "Ready to file — but the rewrite may edge it higher."
              : "Apply and re-read to see the new score."}
          </p>
        </div>

        <div className="border border-[color:var(--cc-hair-strong)] bg-[color:var(--cc-cream-2)] max-h-[420px] overflow-auto p-5">
          <pre className="whitespace-pre-wrap cc-font-mono text-[13px] leading-relaxed text-[color:var(--cc-ink)]">
            {enhancementResult}
          </pre>
        </div>
      </section>
    )}

    {activeEnhancement && enhancedResumeData && (
      <section className="border-2 border-[color:var(--cc-ink)] bg-[color:var(--cc-cream-2)] p-7">
        <div className="flex items-start justify-between gap-4 mb-5 flex-wrap">
          <div>
            <div className="cc-label text-[color:var(--cc-rust)]">
              § Structured rewrite
            </div>
            <h3 className="mt-2 cc-font-display text-2xl leading-tight">
              Optimised <span className="cc-italic-wonk">draft</span> ready.
            </h3>
          </div>
          <div className="flex flex-wrap gap-2">
            <CraftButton
              size="sm"
              onClick={onApplyAndReanalyze}
              disabled={isReanalyzing}
            >
              {isReanalyzing ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Re-reading…
                </>
              ) : (
                <>
                  <BarChart3 className="w-3.5 h-3.5" />
                  Apply & re-read
                </>
              )}
            </CraftButton>
            <CraftButton size="sm" variant="ghost" onClick={onGoBuilderWithEnhanced}>
              <Wand2 className="w-3.5 h-3.5" />
              Open in Builder
            </CraftButton>
            <CraftButton size="sm" variant="ghost" onClick={onClearEnhancement}>
              <X className="w-3.5 h-3.5" />
            </CraftButton>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-5">
          <div>
            <div className="cc-label text-[color:var(--cc-ash)] mb-2">
              § Revised summary
            </div>
            <div className="border border-[color:var(--cc-hair-strong)] bg-[color:var(--cc-cream)] p-4 cc-font-editorial italic text-[color:var(--cc-ink)]">
              {enhancedResumeData.summary || "—"}
            </div>
          </div>

          <div>
            <div className="cc-label text-[color:var(--cc-ash)] mb-2">
              § Skills · {enhancedResumeData.skills?.length || 0}
            </div>
            <div className="border border-[color:var(--cc-hair-strong)] bg-[color:var(--cc-cream)] p-4">
              <div className="flex flex-wrap gap-1.5">
                {enhancedResumeData.skills?.slice(0, 12).map((skill, i) => (
                  <span key={i} className="cc-pill">
                    {skill}
                  </span>
                ))}
                {(enhancedResumeData.skills?.length || 0) > 12 && (
                  <span className="cc-pill cc-pill-filled">
                    +{enhancedResumeData.skills!.length - 12}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-5">
          <div className="cc-label text-[color:var(--cc-ash)] mb-2">
            § Revised experience
          </div>
          <div className="border border-[color:var(--cc-hair-strong)] bg-[color:var(--cc-cream)] max-h-56 overflow-auto p-5 space-y-5">
            {enhancedResumeData.experience?.map((exp, i) => (
              <div key={exp.id || i}>
                <p className="cc-font-display text-lg leading-tight">
                  {exp.title}{" "}
                  <span className="cc-font-editorial italic text-[color:var(--cc-ink-soft)]">
                    at {exp.company}
                  </span>
                </p>
                <p className="cc-label text-[color:var(--cc-ash)] mt-1">
                  {exp.startDate} – {exp.endDate}
                </p>
                <ul className="mt-3 space-y-1.5 list-none">
                  {exp.bullets?.slice(0, 3).map((bullet, j) => (
                    <li
                      key={j}
                      className="cc-font-editorial text-[15px] text-[color:var(--cc-ink)] pl-4 relative before:content-['§'] before:absolute before:left-0 before:text-[color:var(--cc-rust)]"
                    >
                      {bullet}
                    </li>
                  ))}
                  {(exp.bullets?.length || 0) > 3 && (
                    <li className="cc-label text-[color:var(--cc-rust)] pl-4">
                      +{exp.bullets!.length - 3} more
                    </li>
                  )}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <p className="mt-5 flex items-center gap-2 cc-font-editorial italic text-[color:var(--cc-ink-soft)]">
          <CheckCircle2 className="w-4 h-4 text-[color:var(--cc-rust)]" />
          Open in Builder to fit this rewrite to your chosen template.
        </p>
      </section>
    )}
  </div>
);
