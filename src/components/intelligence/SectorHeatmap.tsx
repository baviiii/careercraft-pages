/**
 * SectorHeatmap - Visual sector analysis
 * Uses IntelligenceContext for data
 */

import { useMemo } from "react";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, BarChart3, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useIntelligence } from "@/contexts/IntelligenceContext";

const sectorColors: Record<string, { bg: string; text: string; gradient: string }> = {
  "Healthcare": { bg: "bg-red-500/20", text: "text-red-600", gradient: "from-red-500 to-rose-600" },
  "Technology": { bg: "bg-blue-500/20", text: "text-blue-600", gradient: "from-blue-500 to-cyan-600" },
  "Education": { bg: "bg-purple-500/20", text: "text-purple-600", gradient: "from-purple-500 to-violet-600" },
  "Construction": { bg: "bg-amber-500/20", text: "text-amber-600", gradient: "from-amber-500 to-orange-600" },
  "Renewable Energy": { bg: "bg-green-500/20", text: "text-green-600", gradient: "from-green-500 to-emerald-600" },
  "Regional Development": { bg: "bg-cyan-500/20", text: "text-cyan-600", gradient: "from-cyan-500 to-teal-600" },
  "Skills & Training": { bg: "bg-indigo-500/20", text: "text-indigo-600", gradient: "from-indigo-500 to-blue-600" },
};

export function SectorHeatmap() {
  const { fundingAllocations, careerOpportunities, globalLoading, totalBudget } = useIntelligence();

  // Build heatmap data from context
  const heatmapData = useMemo(() => {
    const sectorMap = new Map<string, { funding: number; jobs: number; growth: number; change: number }>();

    fundingAllocations.forEach(alloc => {
      const existing = sectorMap.get(alloc.sector) || { funding: 0, jobs: 0, growth: 0, change: 0 };
      sectorMap.set(alloc.sector, {
        ...existing,
        funding: existing.funding + alloc.amount,
        change: alloc.change,
      });
    });

    careerOpportunities.forEach(career => {
      const existing = sectorMap.get(career.sector) || { funding: 0, jobs: 0, growth: 0, change: 0 };
      sectorMap.set(career.sector, {
        ...existing,
        jobs: existing.jobs + career.jobs,
        growth: (existing.growth + career.growth) / 2 || career.growth,
      });
    });

    return Array.from(sectorMap.entries())
      .map(([sector, data]) => ({
        sector,
        ...data,
        intensity: Math.min(100, (data.funding / 1000) * 10 + data.growth * 2),
        colors: sectorColors[sector] || { bg: "bg-slate-500/20", text: "text-slate-600", gradient: "from-slate-500 to-gray-600" },
      }))
      .sort((a, b) => b.intensity - a.intensity)
      .slice(0, 8);
  }, [fundingAllocations, careerOpportunities]);

  if (globalLoading) {
    return (
      <div className="card-intelligence p-6">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
        </div>
      </div>
    );
  }

  return (
    <div className="card-intelligence p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <BarChart3 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="font-display text-lg font-bold text-foreground">Sector Heatmap</h2>
            <p className="text-sm text-muted-foreground">Investment intensity by sector</p>
          </div>
        </div>
        <Badge variant="secondary" className="text-xs">{heatmapData.length} sectors</Badge>
      </div>

      {/* Heatmap Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {heatmapData.map((sector, index) => (
          <TooltipProvider key={sector.sector}>
            <Tooltip>
              <TooltipTrigger asChild>
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ scale: 1.02 }}
                  className={cn(
                    "relative p-4 rounded-xl cursor-pointer transition-all overflow-hidden",
                    sector.colors.bg,
                    "border border-transparent hover:border-white/20"
                  )}
                  style={{
                    opacity: 0.5 + (sector.intensity / 200),
                  }}
                >
                  {/* Intensity Gradient Overlay */}
                  <div 
                    className={cn("absolute inset-0 opacity-20 bg-gradient-to-br", sector.colors.gradient)}
                    style={{ opacity: sector.intensity / 200 }}
                  />
                  
                  <div className="relative z-10">
                    <p className={cn("text-sm font-semibold mb-1 line-clamp-1", sector.colors.text)}>
                      {sector.sector}
                    </p>
                    <p className="text-2xl font-bold text-foreground">
                      ${(sector.funding / 1000).toFixed(1)}B
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      {sector.change !== 0 && (
                        <div className={cn(
                          "flex items-center gap-0.5 text-xs font-medium",
                          sector.change > 0 ? "text-emerald-600" : "text-red-500"
                        )}>
                          {sector.change > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                          {sector.change > 0 ? "+" : ""}{sector.change.toFixed(1)}%
                        </div>
                      )}
                      {sector.jobs > 0 && (
                        <span className="text-xs text-muted-foreground">
                          {(sector.jobs ?? 0).toLocaleString()} jobs
                        </span>
                      )}
                    </div>
                  </div>
                </motion.div>
              </TooltipTrigger>
              <TooltipContent>
                <div className="space-y-1">
                  <p className="font-semibold">{sector.sector}</p>
                  <p className="text-xs">Funding: ${((sector.funding ?? 0) / 1000).toFixed(2)}B</p>
                  {sector.jobs > 0 && <p className="text-xs">Jobs: {(sector.jobs ?? 0).toLocaleString()}</p>}
                  {sector.change !== 0 && <p className="text-xs">YoY Change: {sector.change > 0 ? "+" : ""}{(sector.change ?? 0).toFixed(1)}%</p>}
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ))}
      </div>

      {/* Legend */}
      <div className="mt-6 pt-4 border-t border-border/50">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-gradient-to-r from-blue-200 to-blue-300" />
              <span>Lower Investment</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-gradient-to-r from-blue-500 to-purple-600" />
              <span>Higher Investment</span>
            </div>
          </div>
          <span>Total: ${(totalBudget / 1000).toFixed(1)}B</span>
        </div>
      </div>
    </div>
  );
}

export default SectorHeatmap;
