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
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-3 space-y-2"
    >
      <div className="flex items-center gap-2 mb-2">
        <Lightbulb className="w-3.5 h-3.5 text-yellow-400" />
        <span className="text-xs text-slate-400 font-medium">You might want to ask:</span>
      </div>
      <div className="space-y-1.5">
        {questions.map((question, idx) => (
          <motion.button
            key={idx}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.1 }}
            onClick={() => onSelect(question)}
            className="group w-full flex items-center gap-2 p-2.5 rounded-lg bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 hover:border-purple-500/30 text-left transition-all text-sm text-slate-300 hover:text-white"
          >
            <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-purple-400 transition-colors flex-shrink-0" />
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
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        "mt-4 p-4 rounded-xl border",
        config.bg,
        config.border
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", config.bg)}>
          <Icon className={cn("w-4 h-4", config.color)} />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <p className={cn("font-semibold text-sm", config.color)}>
              {insight.title}
            </p>
            <Badge variant="outline" className={cn("text-[10px]", config.color, config.border)}>
              AI INSIGHT
            </Badge>
          </div>
          <p className="text-xs text-slate-300 mb-2">{insight.description}</p>
          {insight.actionable && (
            <button
              onClick={onClickAction}
              className={cn(
                "text-xs font-medium flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all",
                config.bg,
                "hover:opacity-80"
              )}
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
    <div className={cn("inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border", bg, border)}>
      <Icon className={cn("w-3.5 h-3.5", color)} />
      <div className="flex items-center gap-2">
        <span className={cn("text-xs font-medium", color)}>{label}</span>
        {avgRelevance && (
          <span className="text-[10px] text-slate-400">
            {Math.round(avgRelevance)}% match
          </span>
        )}
        {sourceCount && (
          <span className="text-[10px] text-slate-400">
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
  // Safely try to get intelligence context (may not be available in all pages)
  const intelligenceContext = useContext(IntelligenceContext);
  const hasIntelligenceData = !!intelligenceContext;

  // If intelligence data is not available, render a simple fallback chart
  if (!hasIntelligenceData) {
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
        className="mt-4 p-4 rounded-xl bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20"
      >
        <div className="flex items-center gap-2 mb-3">
          <BarChart3 className="w-4 h-4 text-blue-400" />
          <span className="text-sm font-semibold text-white">{visualData.title}</span>
          <Badge variant="outline" className="text-[10px] bg-blue-500/10 text-blue-400 border-blue-500/20 ml-auto">
            LIVE DATA
          </Badge>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-3">
          <div className="p-2.5 rounded-lg bg-slate-800/50">
            <p className="text-xs text-slate-400 mb-1">Allocation</p>
            <p className="text-lg font-bold text-white">${(allocation.amount / 1000).toFixed(1)}B</p>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-800/50">
            <p className="text-xs text-slate-400 mb-1">Growth</p>
            <p className={cn(
              "text-lg font-bold",
              allocation.change >= 0 ? "text-emerald-400" : "text-red-400"
            )}>
              {allocation.change > 0 ? "+" : ""}{allocation.change.toFixed(1)}%
            </p>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-800/50">
            <p className="text-xs text-slate-400 mb-1">Share</p>
            <p className="text-lg font-bold text-white">{percentage.toFixed(1)}%</p>
          </div>
        </div>

        <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
          />
        </div>

        <p className="text-xs text-slate-400 mt-2">
          Data from Intelligence Dashboard • {allocation.confidence.toUpperCase()} confidence
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
        className="mt-4 p-4 rounded-xl bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20"
      >
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="w-4 h-4 text-emerald-400" />
          <span className="text-sm font-semibold text-white">{visualData.title}</span>
          <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/20 ml-auto">
            TOP OPPORTUNITIES
          </Badge>
        </div>

        <div className="space-y-2">
          {careers.map((career, idx) => (
            <div key={idx} className="p-2.5 rounded-lg bg-slate-800/50 border border-slate-700/50">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-white">{career.occupation}</span>
                <span className="text-xs font-semibold text-emerald-400">+{career.growth.toFixed(0)}%</span>
              </div>
              <p className="text-xs text-slate-400 mt-1">{career.sector}</p>
            </div>
          ))}
        </div>

        <p className="text-xs text-slate-400 mt-2">
          Data from Intelligence Dashboard • Updated daily
        </p>
      </motion.div>
    );
  }

  return null;
}
