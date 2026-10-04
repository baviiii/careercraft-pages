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
import { formatChange, formatMillions } from "@/lib/intelligence/funding";

interface FundingChartsProps {
  /** One budget measure per entry. Bars compare amounts; nothing is summed. */
  allocations: FundingAllocation[];
}

export function FundingCharts({ allocations }: FundingChartsProps) {
  // Sort allocations by amount for visualization
  const sortedAllocations = useMemo(() => {
    return [...allocations]
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10);
  }, [allocations]);

  const maxAmount = sortedAllocations[0]?.amount || 1;

  return (
    <div className="rounded-2xl border border-fuchsia-500/20 bg-gradient-to-br from-slate-900/70 via-purple-950/30 to-slate-900/70 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-fuchsia-500 to-pink-600 flex items-center justify-center shadow-lg shadow-fuchsia-500/20">
            <BarChart3 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-display text-lg font-bold text-white">Budget Distribution</h3>
            <p className="text-xs text-white/50">Top {sortedAllocations.length} measures by stated amount</p>
          </div>
        </div>
        <Badge className="text-xs bg-fuchsia-500/20 text-fuchsia-200 border-fuchsia-400/40">
          Live Data
        </Badge>
      </div>

      {/* Horizontal Bar Chart */}
      <div className="space-y-4">
        {sortedAllocations.map((alloc, index) => {
          // Relative to the largest measure — a visual comparison, not a share
          // of any total.
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
                  <span className="font-medium text-sm text-white">{alloc.sector}</span>
                  <Badge
                    className={cn(
                      "text-xs",
                      alloc.confidence === "high" && "bg-emerald-500/20 text-emerald-300 border-emerald-400/30",
                      alloc.confidence === "medium" && "bg-amber-500/20 text-amber-300 border-amber-400/30"
                    )}
                  >
                    {alloc.confidence}
                  </Badge>
                </div>
                <div className="flex items-center gap-3">
                  {alloc.change != null && alloc.change !== 0 && (
                    <span
                      className={cn(
                        "text-xs font-medium flex items-center gap-1",
                        alloc.change > 0 ? "text-emerald-400" : "text-red-400"
                      )}
                    >
                      <TrendingUp className={cn("w-3 h-3", alloc.change < 0 && "rotate-180")} />
                      {formatChange(alloc.change)}
                    </span>
                  )}
                  <span className="text-sm font-bold text-white">
                    {formatMillions(alloc.amount)}
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="relative h-8 bg-white/10 rounded-lg overflow-hidden border border-white/10">
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
                    {alloc.period ?? ""}
                  </span>
                </div>
              </div>

              {/* Source Count */}
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>{alloc.confidence === "high" ? "Amount quoted from the document" : "Amount read from the document"}</span>
                <span>{alloc.sources.length} source{alloc.sources.length !== 1 ? "s" : ""}</span>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Summary Stats */}
      <div className="mt-6 pt-6 border-t border-white/10 grid grid-cols-3 gap-4">
        <div className="text-center">
          <p className="text-xs text-white/50 mb-1">Largest measure</p>
          <p className="text-lg font-bold text-white">{sortedAllocations.length > 0 ? formatMillions(maxAmount) : "—"}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-white/50 mb-1">Amounts quoted</p>
          <p className="text-lg font-bold text-white">
            {allocations.filter((a) => a.confidence === "high").length}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-white/50 mb-1">Measures</p>
          <p className="text-lg font-bold text-white">{allocations.length}</p>
        </div>
      </div>

      {/* Growth Distribution — only when some measure states a year-on-year
          change. Otherwise every bucket reads 0, which says "nothing grew"
          when the truth is "no change was stated". */}
      {allocations.some((a) => a.change != null) && (
      <div className="mt-6 pt-6 border-t border-white/10">
        <div className="flex items-center gap-2 mb-4">
          <PieChartIcon className="w-4 h-4 text-fuchsia-400" />
          <h4 className="font-semibold text-sm text-white">Growth Distribution</h4>
        </div>
        <div className="flex gap-4">
          {/* High Growth */}
          <div className="flex-1 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
            <p className="text-2xl font-bold text-emerald-400">
              {allocations.filter(a => a.change != null && a.change > 10).length}
            </p>
            <p className="text-xs text-white/50 mt-1">High Growth (&gt;10%)</p>
          </div>

          {/* Moderate Growth */}
          <div className="flex-1 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
            <p className="text-2xl font-bold text-blue-400">
              {allocations.filter(a => a.change != null && a.change > 0 && a.change <= 10).length}
            </p>
            <p className="text-xs text-white/50 mt-1">Moderate (0-10%)</p>
          </div>

          {/* Decline */}
          <div className="flex-1 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
            <p className="text-2xl font-bold text-red-400">
              {allocations.filter(a => a.change != null && a.change < 0).length}
            </p>
            <p className="text-xs text-white/50 mt-1">Decline (&lt;0%)</p>
          </div>
        </div>
      </div>
      )}
    </div>
  );
}

export default FundingCharts;
