/**
 * ExecutiveSummary - AI-generated executive brief
 * Production-grade: Synthesizes key insights into actionable intelligence
 */

import { motion } from "framer-motion";
import { Sparkles, TrendingUp, AlertCircle, Info, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { useIntelligence } from "@/contexts/IntelligenceContext";
import type { IntelligenceTab } from "@/lib/intelligencePrompts";

interface ExecutiveSummaryProps {
  tab: IntelligenceTab;
}

export function ExecutiveSummary({ tab }: ExecutiveSummaryProps) {
  const { getTabData, fundingAllocations, careerOpportunities, skillsDemand, totalBudget } = useIntelligence();
  const tabData = getTabData(tab);

  // Generate executive summary based on tab and data
  const generateSummary = (): {
    headline: string;
    keyPoints: string[];
    urgency: "critical" | "important" | "informational";
    actionable: string;
  } => {
    switch (tab) {
      case "funding":
        const topSector = fundingAllocations[0];
        const highGrowthSectors = fundingAllocations.filter(f => f.change > 10);
        return {
          headline: `$${(totalBudget / 1000).toFixed(1)}B Total Budget Tracked Across ${fundingAllocations.length} Key Sectors`,
          keyPoints: [
            `${topSector?.sector || "Leading sector"} receives largest allocation: $${((topSector?.amount || 0) / 1000).toFixed(1)}B (${topSector?.change.toFixed(1)}% YoY)`,
            `${highGrowthSectors.length} sectors show >10% funding growth, signaling strategic priorities`,
            `${fundingAllocations.filter(f => f.confidence === "high").length} allocations verified from structured budget tables`,
          ],
          urgency: highGrowthSectors.length > 3 ? "important" : "informational",
          actionable: `Monitor ${topSector?.sector || "priority sectors"} for program opportunities and workforce demand signals.`,
        };

      case "careers":
        const topCareer = careerOpportunities[0];
        const highDemandCareers = careerOpportunities.filter(c => c.demand === "high");
        return {
          headline: `${careerOpportunities.length} Career Opportunities Identified with ${highDemandCareers.length} High-Demand Roles`,
          keyPoints: [
            `${topCareer?.occupation || "Top role"} shows ${topCareer?.growth.toFixed(1)}% projected growth`,
            `${careerOpportunities.filter(c => c.trending).length} trending occupations with accelerating demand`,
            `Skills alignment critical for ${highDemandCareers.length} high-growth positions`,
          ],
          urgency: highDemandCareers.length > 8 ? "important" : "informational",
          actionable: `Align training programs with high-growth occupations to capture emerging opportunities.`,
        };

      case "skills":
        const emergingSkills = skillsDemand.filter(s => s.category === "emerging");
        const highDemandSkills = skillsDemand.filter(s => s.demand > 80);
        return {
          headline: `${skillsDemand.length} Critical Skills Identified with ${emergingSkills.length} Emerging Capabilities`,
          keyPoints: [
            `${emergingSkills.length} emerging skills (AI, green tech, digital) show sustained demand growth`,
            `${highDemandSkills.length} skills exceed 80% demand threshold across sectors`,
            `${skillsDemand.filter(s => s.trainingAvailable).length} skills have training programs available`,
          ],
          urgency: emergingSkills.length > 5 ? "important" : "informational",
          actionable: `Prioritize emerging skill development to maintain competitive workforce capability.`,
        };

      case "overview":
      default:
        return {
          headline: `Strategic Intelligence: Whole-of-Government Analysis`,
          keyPoints: [
            `${fundingAllocations.length} sectors tracked with $${(totalBudget / 1000).toFixed(1)}B total budget`,
            `${careerOpportunities.length} career opportunities aligned with funding signals`,
            `${skillsDemand.length} critical skills identified for workforce capability`,
          ],
          urgency: "informational",
          actionable: `Navigate to specific intelligence tabs for detailed sector analysis and program insights.`,
        };
    }
  };

  const summary = generateSummary();
  const topInsights = tabData.insights.slice(0, 3);

  const urgencyConfig = {
    critical: {
      icon: AlertCircle,
      color: "text-red-600",
      bg: "bg-red-500/10",
      border: "border-red-500/20",
    },
    important: {
      icon: Zap,
      color: "text-amber-600",
      bg: "bg-amber-500/10",
      border: "border-amber-500/20",
    },
    informational: {
      icon: Info,
      color: "text-blue-600",
      bg: "bg-blue-500/10",
      border: "border-blue-500/20",
    },
  };

  const config = urgencyConfig[summary.urgency];
  const UrgencyIcon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        "card-intelligence p-6 border-l-4 mb-6",
        summary.urgency === "critical" && "border-l-red-500",
        summary.urgency === "important" && "border-l-amber-500",
        summary.urgency === "informational" && "border-l-blue-500"
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", config.bg)}>
            <Sparkles className={cn("w-5 h-5", config.color)} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-display text-lg font-bold text-foreground">Executive Summary</h3>
              <Badge variant="outline" className={cn("text-xs flex items-center gap-1", config.bg, config.color, config.border)}>
                <UrgencyIcon className="w-3 h-3" />
                {summary.urgency.toUpperCase()}
              </Badge>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">AI-generated intelligence brief</p>
          </div>
        </div>
      </div>

      {/* Headline */}
      <div className="mb-4 p-4 rounded-xl bg-muted/30 border border-border/50">
        <p className="font-semibold text-foreground leading-relaxed">{summary.headline}</p>
      </div>

      {/* Key Points */}
      <div className="space-y-2 mb-4">
        {summary.keyPoints.map((point, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 * (index + 1) }}
            className="flex items-start gap-2"
          >
            <TrendingUp className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-slate-400 leading-relaxed">{point}</p>
          </motion.div>
        ))}
      </div>

      {/* HORUS Insights */}
      {topInsights.length > 0 && (
        <div className="pt-4 border-t border-border/50">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
            HORUS Intelligence Signals
          </p>
          <div className="space-y-2">
            {topInsights.map((insight, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 * (index + 1) }}
                className="p-3 rounded-lg bg-gradient-to-r from-purple-500/5 to-blue-500/5 border border-purple-500/10"
              >
                <p className="text-sm font-medium text-foreground mb-1">{insight.title}</p>
                <p className="text-xs text-slate-400 line-clamp-2">{insight.whyItMatters}</p>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Actionable */}
      <div className={cn("mt-4 p-3 rounded-lg border", config.bg, config.border)}>
        <p className={cn("text-xs font-semibold mb-1", config.color)}>ACTIONABLE INTELLIGENCE</p>
        <p className="text-sm text-foreground">{summary.actionable}</p>
      </div>
    </motion.div>
  );
}

export default ExecutiveSummary;
