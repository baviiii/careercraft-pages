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
import { formatChange, formatMillions } from "@/lib/intelligence/funding";

// Helper function to format amounts (billions or millions with one decimal)
const sectorColors: Record<string, { bg: string; text: string; gradient: string }> = {
  "Infrastructure": { bg: "bg-amber-500/20", text: "text-amber-600", gradient: "from-amber-500 to-orange-600" },
  "Healthcare": { bg: "bg-red-500/20", text: "text-red-600", gradient: "from-red-500 to-rose-600" },
  "Technology": { bg: "bg-blue-500/20", text: "text-blue-600", gradient: "from-blue-500 to-cyan-600" },
  "Education": { bg: "bg-purple-500/20", text: "text-purple-600", gradient: "from-purple-500 to-violet-600" },
  "Construction": { bg: "bg-amber-500/20", text: "text-amber-600", gradient: "from-amber-500 to-orange-600" },
  "Renewable Energy": { bg: "bg-green-500/20", text: "text-green-600", gradient: "from-green-500 to-emerald-600" },
  "Regional Development": { bg: "bg-cyan-500/20", text: "text-cyan-600", gradient: "from-cyan-500 to-teal-600" },
  "Skills & Training": { bg: "bg-indigo-500/20", text: "text-indigo-600", gradient: "from-indigo-500 to-blue-600" },
  "Transport & Logistics": { bg: "bg-amber-500/20", text: "text-amber-600", gradient: "from-amber-500 to-orange-600" },
};

// Align with funding: Transport and Infrastructure are one budget line; merge for heatmap
function heatmapSectorKey(sector: string): string {
  const t = sector.trim().toLowerCase();
  if (t.includes("transport") || t.includes("infrastructure") || t.includes("logistics") || t.includes("roads") || t.includes("rail")) {
    return "Infrastructure";
  }
  return sector.trim();
}

export function SectorHeatmap() {
  const { fundingAllocations, careerOpportunities, globalLoading } = useIntelligence();

  // Build heatmap data from context (canonical keys so Transport + Infrastructure merge)
  const heatmapData = useMemo(() => {
    const sectorMap = new Map<string, { funding: number; jobs: number; growth: number; change?: number }>();

    fundingAllocations.forEach(alloc => {
      const key = heatmapSectorKey(alloc.sector);
      const existing = sectorMap.get(key) || { funding: 0, jobs: 0, growth: 0, change: undefined };
      sectorMap.set(key, {
        ...existing,
        funding: Math.max(existing.funding, alloc.amount),
        change: alloc.change,
      });
    });

    careerOpportunities.forEach(career => {
      const key = heatmapSectorKey(career.sector || "");
      const existing = sectorMap.get(key) || { funding: 0, jobs: 0, growth: 0, change: 0 };
      const newJobs = existing.jobs + (career.jobs || 0);
      const newGrowth = existing.jobs && (career.jobs != null)
        ? (existing.growth * existing.jobs + (career.growth ?? 0) * (career.jobs || 0)) / newJobs
        : (existing.growth ?? career.growth ?? 0);
      sectorMap.set(key, {
        ...existing,
        jobs: newJobs,
        growth: newGrowth,
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
      <div className="rounded-2xl bg-gradient-to-br from-pink-500/15 via-purple-500/10 to-pink-500/15 backdrop-blur-xl border border-pink-400/30 shadow-2xl shadow-pink-500/20 p-6">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-6 h-6 animate-spin text-pink-400" />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-gradient-to-br from-pink-500/15 via-purple-500/10 to-pink-500/15 backdrop-blur-xl border border-pink-400/30 shadow-2xl shadow-pink-500/20 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center shadow-lg shadow-pink-500/30">
            <BarChart3 className="w-6 h-6 text-white" />
          </div>
          <div>
            {/* "Sector Heatmap" over "Investment intensity by sector" named
                the chart type and then the axis. Neither tells the reader
                what they will learn, and "intensity" is a word this data
                does not support — it is a share of a total, which is a thing
                anyone can read directly. */}
            <h2 className="font-display text-xl font-bold text-white drop-shadow-lg">Which sectors get the most</h2>
            <p className="text-sm text-pink-200/80">Largest stated budget measure per sector</p>
          </div>
        </div>
        <Badge className="text-xs bg-gradient-to-r from-pink-500/30 to-purple-500/30 text-pink-200 border-pink-400/40 backdrop-blur-sm">{heatmapData.length} sectors</Badge>
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
                    "relative p-4 rounded-xl cursor-pointer transition-all overflow-hidden backdrop-blur-sm",
                    "bg-gradient-to-br from-pink-500/25 to-purple-500/20",
                    "border border-pink-400/40 hover:border-pink-400/60 hover:scale-105 shadow-lg"
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
                    <p className="text-sm font-semibold mb-1 line-clamp-1 text-white drop-shadow">
                      {sector.sector}
                    </p>
                    <p className="text-2xl font-bold text-white drop-shadow-lg">
                      {sector.funding > 0 ? formatMillions(sector.funding) : "—"}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      {sector.change != null && sector.change !== 0 && (
                        <div className={cn(
                          "flex items-center gap-0.5 text-xs font-medium",
                          sector.change > 0 ? "text-emerald-300" : "text-red-300"
                        )}>
                          {sector.change > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                          {formatChange(sector.change)}
                        </div>
                      )}
                      {sector.jobs > 0 && (
                        <span className="text-xs text-pink-200/80">
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
                  <p className="text-xs">Largest stated measure: {sector.funding > 0 ? formatMillions(sector.funding) : "no stated measure"}</p>
                  {sector.jobs > 0 && <p className="text-xs">Jobs: {(sector.jobs ?? 0).toLocaleString()}</p>}
                  {sector.change != null && sector.change !== 0 && <p className="text-xs">YoY Change: {formatChange(sector.change)}</p>}
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ))}
      </div>

      {/* Legend */}
      <div className="mt-6 pt-4 border-t border-pink-400/30">
        <div className="flex items-center justify-between text-xs text-pink-200/80">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-gradient-to-r from-pink-300 to-purple-300" />
              <span>Lower Investment</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-gradient-to-r from-pink-500 to-purple-600" />
              <span>Higher Investment</span>
            </div>
          </div>
          <span className="text-white font-semibold">{fundingAllocations.length} budget measures</span>
        </div>
      </div>
    </div>
  );
}

export default SectorHeatmap;
