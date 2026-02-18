/**
 * FundingCharts - Data visualization for funding allocations
 * Production-grade: Interactive charts showing budget trends and distributions
 */

import { useMemo } from "react";
import { motion } from "framer-motion";
import { BarChart3, TrendingUp, PieChart as PieChartIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import type { FundingAllocation } from "@/contexts/IntelligenceContext";

interface FundingChartsProps {
  allocations: FundingAllocation[];
  totalBudget: number;
}

export function FundingCharts({ allocations, totalBudget }: FundingChartsProps) {
  // Sort allocations by amount for visualization
  const sortedAllocations = useMemo(() => {
    return [...allocations]
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10);
  }, [allocations]);

  const maxAmount = sortedAllocations[0]?.amount || 1;

  return (
    <div className="card-intelligence p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <BarChart3 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-display text-lg font-bold text-foreground">Budget Distribution</h3>
            <p className="text-xs text-slate-400">Top {sortedAllocations.length} sector allocations</p>
          </div>
        </div>
        <Badge variant="outline" className="text-xs">
          Live Data
        </Badge>
      </div>

      {/* Horizontal Bar Chart */}
      <div className="space-y-4">
        {sortedAllocations.map((alloc, index) => {
          const percentage = totalBudget > 0 ? (alloc.amount / totalBudget) * 100 : 0;
          const barWidth = (alloc.amount / maxAmount) * 100;

          return (
            <motion.div
              key={alloc.sector}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="space-y-2"
            >
              {/* Sector Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm text-foreground">{alloc.sector}</span>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-xs",
                      alloc.confidence === "high" && "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
                      alloc.confidence === "medium" && "bg-amber-500/10 text-amber-600 border-amber-500/20"
                    )}
                  >
                    {alloc.confidence}
                  </Badge>
                </div>
                <div className="flex items-center gap-3">
                  {alloc.change !== 0 && (
                    <span
                      className={cn(
                        "text-xs font-medium flex items-center gap-1",
                        alloc.change > 0 ? "text-emerald-600" : "text-red-600"
                      )}
                    >
                      <TrendingUp className={cn("w-3 h-3", alloc.change < 0 && "rotate-180")} />
                      {alloc.change > 0 ? "+" : ""}{alloc.change.toFixed(1)}%
                    </span>
                  )}
                  <span className="text-sm font-bold text-foreground">
                    ${(alloc.amount / 1000).toFixed(2)}B
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="relative h-8 bg-muted rounded-lg overflow-hidden border border-border/50">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${barWidth}%` }}
                  transition={{ delay: index * 0.05 + 0.1, duration: 0.6, ease: "easeOut" }}
                  className={cn(
                    "absolute inset-y-0 left-0 rounded-lg",
                    "bg-gradient-to-r from-blue-500 to-cyan-500",
                    alloc.priority === "high" && "from-amber-500 to-orange-600",
                    alloc.priority === "low" && "from-gray-400 to-gray-500"
                  )}
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent" />
                </motion.div>

                {/* Amount Label Inside Bar */}
                <div className="relative h-full flex items-center px-3">
                  <span className="text-xs font-medium text-white drop-shadow-md">
                    {percentage.toFixed(1)}% of total
                  </span>
                </div>
              </div>

              {/* Source Count */}
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>{alloc.programs} programs tracked</span>
                <span>{alloc.sources.length} source{alloc.sources.length !== 1 ? "s" : ""}</span>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Summary Stats */}
      <div className="mt-6 pt-6 border-t border-border/50 grid grid-cols-3 gap-4">
        <div className="text-center">
          <p className="text-xs text-slate-400 mb-1">Total Tracked</p>
          <p className="text-lg font-bold text-foreground">${(totalBudget / 1000).toFixed(1)}B</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-slate-400 mb-1">Avg Allocation</p>
          <p className="text-lg font-bold text-foreground">
            ${(totalBudget / allocations.length / 1000).toFixed(2)}B
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-slate-400 mb-1">Sectors</p>
          <p className="text-lg font-bold text-foreground">{allocations.length}</p>
        </div>
      </div>

      {/* Growth Distribution */}
      <div className="mt-6 pt-6 border-t border-border/50">
        <div className="flex items-center gap-2 mb-4">
          <PieChartIcon className="w-4 h-4 text-blue-500" />
          <h4 className="font-semibold text-sm text-foreground">Growth Distribution</h4>
        </div>
        <div className="flex gap-4">
          {/* High Growth */}
          <div className="flex-1 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
            <p className="text-2xl font-bold text-emerald-600">
              {allocations.filter(a => a.change > 10).length}
            </p>
            <p className="text-xs text-slate-400 mt-1">High Growth (&gt;10%)</p>
          </div>

          {/* Moderate Growth */}
          <div className="flex-1 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
            <p className="text-2xl font-bold text-blue-600">
              {allocations.filter(a => a.change > 0 && a.change <= 10).length}
            </p>
            <p className="text-xs text-slate-400 mt-1">Moderate (0-10%)</p>
          </div>

          {/* Decline */}
          <div className="flex-1 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
            <p className="text-2xl font-bold text-red-600">
              {allocations.filter(a => a.change < 0).length}
            </p>
            <p className="text-xs text-slate-400 mt-1">Decline (&lt;0%)</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default FundingCharts;
