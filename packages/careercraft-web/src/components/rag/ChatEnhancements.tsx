/**
 * CHAT ENHANCEMENTS — console-toned companions to CareerCoach.
 * Follow-ups, Proactive Insights, Confidence Indicators, Visual Charts.
 * Everything draws from the `.cc-console` variable set in craft.css so the
 * pieces read as one instrument, not bolted-on widgets.
 */

import { motion } from "framer-motion";
import {
  Lightbulb,
  TrendingUp,
  AlertCircle,
  Sparkles,
  BarChart3,
  CheckCircle2,
  AlertTriangle,
  Info,
  ArrowRight,
  Zap,
  Target,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ProactiveInsight, VisualChartData } from "@/hooks/useEnterpriseRAG";
import { useContext } from "react";
import IntelligenceContext from "@/contexts/IntelligenceContext";

// ============================================================================
// FOLLOW-UP QUESTIONS - AI suggests next queries
// ============================================================================

interface FollowUpQuestionsProps {
  questions: string[];
  onSelect: (question: string) => void;
}

export function FollowUpQuestions({ questions, onSelect }: FollowUpQuestionsProps) {
  if (!questions || questions.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-4 space-y-2"
    >
      <div className="flex flex-wrap gap-2">
        {questions.map((question, idx) => (
          <motion.button
            key={idx}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.08 }}
            onClick={() => onSelect(question)}
            className="group flex items-center gap-2 rounded-xl border border-[color:var(--con-line)] bg-[color:var(--con-panel)] px-3.5 py-2 text-left text-[13px] text-[color:var(--con-ink-2)] transition-colors hover:border-[color:var(--con-accent-line)] hover:text-[color:var(--con-ink)]"
          >
            <ArrowRight className="w-3.5 h-3.5 flex-shrink-0 text-[color:var(--con-ink-3)] transition-colors group-hover:text-[color:var(--con-accent)]" />
            <span className="flex-1">{question}</span>
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}

// ============================================================================
// PROACTIVE INSIGHTS - AI notices patterns
// ============================================================================

interface ProactiveInsightCardProps {
  insight: ProactiveInsight;
  onClickAction?: () => void;
}

export function ProactiveInsightCard({ insight, onClickAction }: ProactiveInsightCardProps) {
  const iconConfig = {
    trend: { icon: TrendingUp, color: "text-[color:var(--con-accent)]" },
    recommendation: { icon: Sparkles, color: "text-[color:var(--con-accent)]" },
    warning: { icon: AlertTriangle, color: "text-[color:var(--con-wheat)]" },
    opportunity: { icon: Zap, color: "text-[color:var(--con-sage)]" },
  };

  const config = iconConfig[insight.type];
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="con-panel mt-4 border-l-2 border-l-[color:var(--con-accent)] p-4"
    >
      <div className="flex items-start gap-3">
        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-[color:var(--con-line)] bg-[color:var(--con-raised)]">
          <Icon className={cn("w-4 h-4", config.color)} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2">
            <p className="text-sm font-semibold text-[color:var(--con-ink)]">
              {insight.title}
            </p>
            <span className="con-mono rounded bg-[color:var(--con-raised)] px-1.5 py-0.5 text-[color:var(--con-ink-3)]">Insight</span>
          </div>
          <p className="mb-2 text-xs leading-relaxed text-[color:var(--con-ink-2)]">{insight.description}</p>
          {insight.actionable && (
            <button
              onClick={onClickAction}
              className="flex items-center gap-1.5 rounded-lg border border-[color:var(--con-line)] bg-[color:var(--con-raised)] px-3 py-1.5 text-xs font-medium text-[color:var(--con-ink-2)] transition-colors hover:border-[color:var(--con-accent-line)] hover:text-[color:var(--con-ink)]"
            >
              <Target className={cn("w-3 h-3", config.color)} />
              <span>{insight.actionable}</span>
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ============================================================================
// CONFIDENCE INDICATOR - Shows response quality
// ============================================================================

interface ConfidenceIndicatorProps {
  confidence: "high" | "medium" | "low";
  avgRelevance?: number;
  sourceCount?: number;
}

export function ConfidenceIndicator({
  confidence,
  avgRelevance,
  sourceCount,
}: ConfidenceIndicatorProps) {
  const config = {
    high: {
      icon: CheckCircle2,
      color: "text-[color:var(--con-sage)]",
      label: "High confidence",
    },
    medium: {
      icon: Info,
      color: "text-[color:var(--con-accent)]",
      label: "Medium confidence",
    },
    low: {
      icon: AlertCircle,
      color: "text-[color:var(--con-wheat)]",
      label: "Low confidence",
    },
  };

  const { icon: Icon, color, label } = config[confidence];

  return (
    <div className="inline-flex items-center gap-2 rounded-lg border border-[color:var(--con-line)] bg-[color:var(--con-panel)] px-3 py-1.5">
      <Icon className={cn("w-3.5 h-3.5", color)} />
      <div className="flex items-center gap-2">
        <span className={cn("text-xs font-medium", color)}>{label}</span>
        {/* Match % is only meaningful when the answer is actually grounded —
            never decorate a low-confidence answer with a big score. */}
        {confidence !== "low" && avgRelevance ? (
          <span className="con-mono text-[color:var(--con-ink-3)]">
            {Math.round(avgRelevance)}% match
          </span>
        ) : null}
        {sourceCount ? (
          <span className="con-mono text-[color:var(--con-ink-3)]">
            · {sourceCount} sources
          </span>
        ) : null}
      </div>
    </div>
  );
}

// ============================================================================
// EMBEDDED CHART - Shows intelligence dashboard data inline
// ============================================================================

interface EmbeddedChartProps {
  visualData: VisualChartData;
}

export function EmbeddedChart({ visualData }: EmbeddedChartProps) {
  // Safely try to get intelligence context (may not be available in all pages)
  const intelligenceContext = useContext(IntelligenceContext);
  const hasIntelligenceData = !!intelligenceContext;

  // If intelligence data is not available, render a simple fallback chart
  if (!hasIntelligenceData) {
    return (
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: "auto" }}
        className="con-panel mt-4 p-4"
      >
        <div className="flex items-center gap-2 mb-3">
          <BarChart3 className="w-4 h-4 text-[color:var(--con-accent)]" />
          <span className="text-sm font-semibold text-[color:var(--con-ink)]">{visualData.title}</span>
        </div>
        <p className="text-xs text-[color:var(--con-ink-3)]">
          Chart visualization available. Enable Intelligence Dashboard for enhanced data.
        </p>
      </motion.div>
    );
  }

  const { fundingAllocations, careerOpportunities, skillsDemand, totalBudget } = intelligenceContext;

  if (visualData.type === "funding" && visualData.sector) {
    const allocation = fundingAllocations.find(
      a => a.sector.toLowerCase().includes(visualData.sector!.toLowerCase())
    );

    if (!allocation) return null;

    const percentage = totalBudget > 0 ? (allocation.amount / totalBudget) * 100 : 0;

    return (
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: "auto" }}
        className="con-panel mt-4 p-4"
      >
        <div className="flex items-center gap-2 mb-3">
          <BarChart3 className="w-4 h-4 text-[color:var(--con-accent)]" />
          <span className="text-sm font-semibold text-[color:var(--con-ink)]">{visualData.title}</span>
          <Badge variant="outline" className="con-mono ml-auto border-[color:var(--con-accent-line)] bg-[color:var(--con-accent-soft)] text-[10px] text-[color:var(--con-accent)]">
            Live data
          </Badge>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-3">
          <div className="rounded-lg bg-[color:var(--con-raised)] p-2.5">
            <p className="con-mono mb-1 text-[color:var(--con-ink-3)]">Allocation</p>
            <p className="text-lg font-bold text-[color:var(--con-ink)]">${(allocation.amount / 1000).toFixed(1)}B</p>
          </div>
          <div className="rounded-lg bg-[color:var(--con-raised)] p-2.5">
            <p className="con-mono mb-1 text-[color:var(--con-ink-3)]">Growth</p>
            <p className={cn(
              "text-lg font-bold",
              allocation.change >= 0 ? "text-[color:var(--con-sage)]" : "text-[color:var(--con-rose)]"
            )}>
              {allocation.change > 0 ? "+" : ""}{allocation.change.toFixed(1)}%
            </p>
          </div>
          <div className="rounded-lg bg-[color:var(--con-raised)] p-2.5">
            <p className="con-mono mb-1 text-[color:var(--con-ink-3)]">Share</p>
            <p className="text-lg font-bold text-[color:var(--con-ink)]">{percentage.toFixed(1)}%</p>
          </div>
        </div>

        <div className="h-2 w-full overflow-hidden rounded-full bg-[color:var(--con-raised)]">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="h-full bg-[color:var(--con-accent)]"
          />
        </div>

        <p className="con-mono mt-2 text-[color:var(--con-ink-3)]">
          Intelligence Dashboard · {allocation.confidence} confidence
        </p>
      </motion.div>
    );
  }

  if (visualData.type === "careers" && visualData.sector) {
    const careers = careerOpportunities.filter(
      c => c.sector.toLowerCase().includes(visualData.sector!.toLowerCase())
    ).slice(0, 3);

    if (careers.length === 0) return null;

    return (
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: "auto" }}
        className="con-panel mt-4 p-4"
      >
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="w-4 h-4 text-[color:var(--con-sage)]" />
          <span className="text-sm font-semibold text-[color:var(--con-ink)]">{visualData.title}</span>
          <Badge variant="outline" className="con-mono ml-auto border-[color:var(--con-line-2)] bg-[color:var(--con-raised)] text-[10px] text-[color:var(--con-sage)]">
            Top opportunities
          </Badge>
        </div>

        <div className="space-y-2">
          {careers.map((career, idx) => (
            <div key={idx} className="rounded-lg border border-[color:var(--con-line)] bg-[color:var(--con-raised)] p-2.5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-[color:var(--con-ink)]">{career.occupation}</span>
                <span className="text-xs font-semibold text-[color:var(--con-sage)]">+{career.growth.toFixed(0)}%</span>
              </div>
              <p className="con-mono mt-1 text-[color:var(--con-ink-3)]">{career.sector}</p>
            </div>
          ))}
        </div>

        <p className="con-mono mt-2 text-[color:var(--con-ink-3)]">
          Intelligence Dashboard · updated daily
        </p>
      </motion.div>
    );
  }

  return null;
}
