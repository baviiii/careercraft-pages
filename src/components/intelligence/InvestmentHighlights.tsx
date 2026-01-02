/**
 * InvestmentHighlights - Key investment insights
 * Uses IntelligenceContext for data
 */

import { useMemo } from "react";
import { motion } from "framer-motion";
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Target, 
  Sparkles,
  ArrowUpRight,
  Loader2,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { useIntelligence } from "@/contexts/IntelligenceContext";

export function InvestmentHighlights() {
  const { 
    fundingAllocations, 
    crossTabInsights, 
    globalLoading,
    topGrowthSector,
    totalBudget,
  } = useIntelligence();

  // Build highlights from context
  const highlights = useMemo(() => {
    const items: Array<{
      title: string;
      value: string;
      change: number;
      type: "growth" | "decline" | "new" | "priority";
      description: string;
    }> = [];

    // Top growth sector
    const topGrowth = fundingAllocations.sort((a, b) => b.change - a.change)[0];
    if (topGrowth) {
      items.push({
        title: topGrowth.sector,
        value: `$${(topGrowth.amount / 1000).toFixed(1)}B`,
        change: topGrowth.change,
        type: "growth",
        description: "Fastest growing sector",
      });
    }

    // High priority sectors
    const prioritySectors = fundingAllocations.filter(f => f.priority === "high");
    prioritySectors.slice(0, 2).forEach(sector => {
      items.push({
        title: sector.sector,
        value: `${sector.programs} programs`,
        change: sector.change,
        type: "priority",
        description: "Priority investment area",
      });
    });

    // Largest allocation
    const largest = fundingAllocations[0];
    if (largest && !items.find(i => i.title === largest.sector)) {
      items.push({
        title: largest.sector,
        value: `$${(largest.amount / 1000).toFixed(1)}B`,
        change: largest.change,
        type: "priority",
        description: "Largest allocation",
      });
    }

    return items.slice(0, 4);
  }, [fundingAllocations]);

  if (globalLoading) {
    return (
      <div className="card-intelligence p-6">
        <div className="flex items-center justify-center h-48">
          <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
        </div>
      </div>
    );
  }

  return (
    <div className="card-intelligence p-6 h-full">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
            <Target className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="font-display text-lg font-bold text-foreground">Investment Highlights</h2>
            <p className="text-sm text-muted-foreground">Key funding signals</p>
          </div>
        </div>
      </div>

      {/* Highlights List */}
      <div className="space-y-3">
        {highlights.map((highlight, index) => (
          <motion.div
            key={`${highlight.title}-${highlight.type}-${index}`}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className={cn(
              "p-4 rounded-xl border transition-all hover:shadow-sm cursor-pointer",
              highlight.type === "growth" && "bg-emerald-500/10 border-emerald-500/20",
              highlight.type === "decline" && "bg-red-500/10 border-red-500/20",
              highlight.type === "priority" && "bg-amber-500/10 border-amber-500/20",
              highlight.type === "new" && "bg-blue-500/10 border-blue-500/20"
            )}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  {highlight.type === "growth" && <TrendingUp className="w-4 h-4 text-emerald-500" />}
                  {highlight.type === "decline" && <TrendingDown className="w-4 h-4 text-red-500" />}
                  {highlight.type === "priority" && <Zap className="w-4 h-4 text-amber-500" />}
                  {highlight.type === "new" && <Sparkles className="w-4 h-4 text-blue-500" />}
                  <span className="font-semibold text-foreground text-sm">{highlight.title}</span>
                </div>
                <p className="text-xs text-muted-foreground">{highlight.description}</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-foreground">{highlight.value}</p>
                {highlight.change !== 0 && (
                  <span className={cn(
                    "text-xs font-medium",
                    highlight.change > 0 ? "text-emerald-600" : "text-red-500"
                  )}>
                    {highlight.change > 0 ? "+" : ""}{highlight.change.toFixed(1)}%
                  </span>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* AI Connection Insight */}
      {crossTabInsights.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-4 p-4 rounded-xl bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20"
        >
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-4 h-4 text-purple-500" />
            </div>
            <div>
              <p className="text-xs font-semibold text-purple-600 uppercase tracking-wide mb-1">AI Insight</p>
              <p className="text-sm text-foreground">{crossTabInsights[0].title}</p>
              <p className="text-xs text-muted-foreground mt-1">{crossTabInsights[0].connection}</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Total Summary */}
      <div className="mt-4 pt-4 border-t border-border/50">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Total Budget Tracked</span>
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-amber-500" />
            <span className="font-bold text-foreground">${(totalBudget / 1000).toFixed(1)}B</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default InvestmentHighlights;
