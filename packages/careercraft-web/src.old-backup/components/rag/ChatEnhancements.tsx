/**
 * CHAT ENHANCEMENTS - Ferrari-grade UI components
 * Follow-ups, Proactive Insights, Confidence Indicators, Visual Charts
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
import type { ProactiveInsight, VisualChartData } from "@careercraft/shared";

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
            className="group flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] hover:border-white/12 text-left transition-all text-sm text-white/50 hover:text-white/80"
          >
            <ArrowRight className="w-3.5 h-3.5 text-white/20 group-hover:text-white/50 transition-colors flex-shrink-0" />
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
    trend: { icon: TrendingUp, color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20" },
    recommendation: { icon: Sparkles, color: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/20" },
    warning: { icon: AlertTriangle, color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20" },
    opportunity: { icon: Zap, color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
  };

  const config = iconConfig[insight.type];
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="mt-4 p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]"
    >
      <div className="flex items-start gap-3">
        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center bg-white/5")}>
          <Icon className={cn("w-4 h-4", config.color)} />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <p className={cn("font-semibold text-sm", config.color)}>
              {insight.title}
            </p>
            <span className="text-[9px] text-white/20 bg-white/5 px-1.5 py-0.5 rounded">AI INSIGHT</span>
          </div>
          <p className="text-xs text-white/50 mb-2">{insight.description}</p>
          {insight.actionable && (
            <button
              onClick={onClickAction}
              className="text-xs font-medium flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-all"
            >
              <Target className={cn("w-3 h-3", config.color)} />
              <span className={config.color}>{insight.actionable}</span>
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
      color: "text-emerald-400",
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/20",
      label: "High Confidence",
      description: "Based on authoritative sources",
    },
    medium: {
      icon: Info,
      color: "text-blue-400",
      bg: "bg-blue-500/10",
      border: "border-blue-500/20",
      label: "Medium Confidence",
      description: "Based on available data",
    },
    low: {
      icon: AlertCircle,
      color: "text-amber-400",
      bg: "bg-amber-500/10",
      border: "border-amber-500/20",
      label: "Low Confidence",
      description: "Limited information available",
    },
  };

  const { icon: Icon, color, bg, border, label, description } = config[confidence];

  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06]">
      <Icon className={cn("w-3.5 h-3.5", color)} />
      <div className="flex items-center gap-2">
        <span className={cn("text-xs font-medium", color)}>{label}</span>
        {avgRelevance && (
          <span className="text-[10px] text-white/25">
            {Math.round(avgRelevance)}% match
          </span>
        )}
        {sourceCount && (
          <span className="text-[10px] text-white/25">
            • {sourceCount} sources
          </span>
        )}
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
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      className="mt-4 p-4 rounded-xl bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20"
    >
      <div className="flex items-center gap-2 mb-3">
        <BarChart3 className="w-4 h-4 text-blue-400" />
        <span className="text-sm font-semibold text-white">{visualData.title}</span>
      </div>
      <p className="text-xs text-slate-400">
        Chart visualization available in the Hours Intelligence Dashboard.
      </p>
    </motion.div>
  );
}
