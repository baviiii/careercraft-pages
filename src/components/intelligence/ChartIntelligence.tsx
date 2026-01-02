/**
 * HORUS ChartIntelligence — Visual Intelligence with AI Interpretation
 * 
 * Beautiful charts that don't just show data — they explain what it means.
 * Every visualization comes with AI-generated interpretation.
 */

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  PieChart,
  Activity,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  Info,
  Sparkles,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { useIntelligence } from "@/contexts/IntelligenceContext";

interface ChartIntelligenceProps {
  type: "funding" | "careers" | "skills" | "overview";
  className?: string;
  compact?: boolean;
}

// Animated bar component
const AnimatedBar = ({ 
  value, 
  maxValue, 
  label, 
  color,
  change,
  index,
}: { 
  value: number; 
  maxValue: number; 
  label: string;
  color: string;
  change?: number;
  index: number;
}) => {
  const percentage = Math.min((value / maxValue) * 100, 100);
  
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1 }}
      className="group"
    >
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-medium text-foreground truncate max-w-[120px]">
          {label}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-foreground">
            ${(value / 1000).toFixed(1)}B
          </span>
          {change !== undefined && change !== 0 && (
            <span className={cn(
              "text-[10px] font-bold flex items-center gap-0.5",
              change > 0 ? "text-emerald-500" : "text-red-500"
            )}>
              {change > 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              {change > 0 ? "+" : ""}{change.toFixed(1)}%
            </span>
          )}
        </div>
      </div>
      <div className="relative h-3 rounded-full bg-slate-800/50 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.8, delay: index * 0.1, ease: "easeOut" }}
          className={cn(
            "absolute inset-y-0 left-0 rounded-full",
            `bg-gradient-to-r ${color}`
          )}
        />
        {/* Shimmer effect */}
        <motion.div
          className="absolute inset-y-0 w-20 bg-gradient-to-r from-transparent via-white/20 to-transparent"
          initial={{ x: "-100%" }}
          animate={{ x: "400%" }}
          transition={{ duration: 2, delay: 1 + index * 0.1, repeat: Infinity, repeatDelay: 3 }}
        />
      </div>
    </motion.div>
  );
};

// Donut chart segment
const DonutSegment = ({
  percentage,
  offset,
  color,
  label,
  index,
}: {
  percentage: number;
  offset: number;
  color: string;
  label: string;
  index: number;
}) => {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const strokeLength = (percentage / 100) * circumference;
  const strokeOffset = circumference - strokeLength;
  const rotation = (offset / 100) * 360 - 90;
  
  return (
    <motion.circle
      cx="50"
      cy="50"
      r={radius}
      fill="none"
      strokeWidth="12"
      className={cn("stroke-current", color)}
      strokeDasharray={circumference}
      strokeDashoffset={strokeOffset}
      strokeLinecap="round"
      initial={{ strokeDashoffset: circumference }}
      animate={{ strokeDashoffset: strokeOffset }}
      transition={{ duration: 1, delay: index * 0.15, ease: "easeOut" }}
      style={{ 
        transform: `rotate(${rotation}deg)`,
        transformOrigin: "50% 50%"
      }}
    />
  );
};

export function ChartIntelligence({ type, className, compact = false }: ChartIntelligenceProps) {
  const {
    fundingAllocations,
    careerOpportunities,
    skillsDemand,
    crossTabInsights,
    globalLoading,
  } = useIntelligence();

  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Prepare chart data based on type
  const chartData = useMemo(() => {
    switch (type) {
      case "funding":
        return fundingAllocations.slice(0, 6).map((item, i) => ({
          label: item.sector,
          value: item.amount,
          change: item.change,
          color: [
            "from-amber-500 to-orange-600",
            "from-blue-500 to-cyan-600",
            "from-purple-500 to-pink-600",
            "from-emerald-500 to-teal-600",
            "from-red-500 to-rose-600",
            "from-indigo-500 to-violet-600",
          ][i % 6],
        }));
      
      case "careers":
        return careerOpportunities.slice(0, 6).map((item, i) => ({
          label: item.occupation,
          value: item.jobs,
          change: item.growth,
          color: [
            "from-blue-500 to-cyan-600",
            "from-emerald-500 to-teal-600",
            "from-purple-500 to-pink-600",
            "from-amber-500 to-orange-600",
            "from-indigo-500 to-violet-600",
            "from-red-500 to-rose-600",
          ][i % 6],
        }));
      
      case "skills":
        return skillsDemand.slice(0, 6).map((item, i) => ({
          label: item.name,
          value: item.demand,
          change: item.growth,
          color: [
            "from-purple-500 to-pink-600",
            "from-blue-500 to-cyan-600",
            "from-emerald-500 to-teal-600",
            "from-amber-500 to-orange-600",
            "from-indigo-500 to-violet-600",
            "from-red-500 to-rose-600",
          ][i % 6],
        }));
      
      default:
        return [];
    }
  }, [type, fundingAllocations, careerOpportunities, skillsDemand]);

  const maxValue = useMemo(() => {
    return Math.max(...chartData.map(d => d.value), 1);
  }, [chartData]);

  // Generate AI interpretation
  const interpretation = useMemo(() => {
    if (chartData.length === 0) return null;

    const topItem = chartData[0];
    const growingItems = chartData.filter(d => (d.change || 0) > 5);
    const decliningItems = chartData.filter(d => (d.change || 0) < -5);

    switch (type) {
      case "funding":
        return {
          headline: `${topItem?.label || "Leading sector"} dominates fiscal allocation`,
          insight: growingItems.length > 0
            ? `${growingItems.length} sectors show significant growth, with ${growingItems[0]?.label || "top performer"} leading at +${growingItems[0]?.change?.toFixed(1) || 0}%. This indicates strategic reallocation of resources.`
            : `Budget allocations remain stable across tracked sectors. Monitor for Q2 rebalancing signals.`,
          signal: decliningItems.length > 0
            ? `⚠️ ${decliningItems.length} sector(s) showing reduced allocation — potential policy pivot`
            : `✓ Funding trajectory aligned with stated priorities`,
        };
      
      case "careers":
        return {
          headline: `Workforce signals point to ${growingItems.length > 2 ? "broad" : "targeted"} growth`,
          insight: `${topItem?.label || "Top occupation"} leads job creation with ${topItem?.value?.toLocaleString() || 0} positions. ${growingItems.length} occupations exceed 5% growth threshold.`,
          signal: growingItems.length > 3
            ? `✓ Labour market expansion across multiple sectors — positive outlook`
            : `⚠️ Concentrated growth — watch for skill misalignment`,
        };
      
      case "skills":
        const emergingCount = skillsDemand.filter(s => s.category === "emerging").length;
        return {
          headline: `${emergingCount} emerging skills gaining priority`,
          insight: `${topItem?.label || "Top skill"} shows ${topItem?.change?.toFixed(1) || 0}% demand growth. Skills aligned with government investment areas show strongest trajectory.`,
          signal: emergingCount > 3
            ? `✓ Workforce transformation underway — upskilling window open`
            : `⚠️ Limited emerging skills — potential capability gap`,
        };
      
      default:
        return null;
    }
  }, [type, chartData, skillsDemand]);

  // Donut chart data for overview
  const donutData = useMemo(() => {
    if (type !== "overview") return [];
    
    const total = fundingAllocations.reduce((sum, f) => sum + f.amount, 0) || 1;
    let cumulative = 0;
    
    return fundingAllocations.slice(0, 5).map((item, i) => {
      const percentage = (item.amount / total) * 100;
      const offset = cumulative;
      cumulative += percentage;
      
      return {
        label: item.sector,
        percentage,
        offset,
        color: [
          "text-amber-500",
          "text-blue-500",
          "text-purple-500",
          "text-emerald-500",
          "text-pink-500",
        ][i % 5],
        value: item.amount,
      };
    });
  }, [type, fundingAllocations]);

  if (globalLoading && chartData.length === 0) {
    return (
      <div className={cn("card-intelligence p-6", className)}>
        <div className="flex items-center justify-center h-48">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          >
            <Activity className="w-8 h-8 text-blue-500" />
          </motion.div>
        </div>
      </div>
    );
  }

  if (chartData.length === 0 && type !== "overview") {
    return (
      <div className={cn("card-intelligence p-6", className)}>
        <div className="text-center py-8">
          <BarChart3 className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">No data available for visualization</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "rounded-2xl overflow-hidden border border-border/50 bg-card",
      className
    )}>
      {/* Header */}
      <div className="p-5 border-b border-border/50 bg-gradient-to-r from-blue-500/5 to-purple-500/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              {type === "overview" ? (
                <PieChart className="w-5 h-5 text-white" />
              ) : (
                <BarChart3 className="w-5 h-5 text-white" />
              )}
            </div>
            <div>
              <h3 className="font-display font-bold text-foreground">
                {type === "funding" && "Fiscal Distribution"}
                {type === "careers" && "Workforce Signals"}
                {type === "skills" && "Capability Demand"}
                {type === "overview" && "Budget Composition"}
              </h3>
              <p className="text-xs text-muted-foreground">
                Visual intelligence with AI interpretation
              </p>
            </div>
          </div>
          <Badge variant="secondary" className="gap-1 text-xs">
            <Sparkles className="w-3 h-3" />
            Live Data
          </Badge>
        </div>
      </div>

      {/* Chart Area */}
      <div className="p-5">
        {type === "overview" ? (
          // Donut chart for overview
          <div className="flex items-center gap-8">
            <div className="relative w-32 h-32 flex-shrink-0">
              <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                {donutData.map((segment, i) => (
                  <DonutSegment
                    key={segment.label}
                    percentage={segment.percentage}
                    offset={segment.offset}
                    color={segment.color}
                    label={segment.label}
                    index={i}
                  />
                ))}
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-lg font-bold text-foreground">
                    ${(fundingAllocations.reduce((s, f) => s + f.amount, 0) / 1000).toFixed(1)}B
                  </p>
                  <p className="text-[10px] text-muted-foreground">TOTAL</p>
                </div>
              </div>
            </div>
            
            <div className="flex-1 space-y-2">
              {donutData.map((segment, i) => (
                <motion.div
                  key={segment.label}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="flex items-center justify-between py-1"
                  onMouseEnter={() => setHoveredIndex(i)}
                  onMouseLeave={() => setHoveredIndex(null)}
                >
                  <div className="flex items-center gap-2">
                    <div className={cn("w-3 h-3 rounded-full", segment.color.replace("text-", "bg-"))} />
                    <span className={cn(
                      "text-xs transition-colors",
                      hoveredIndex === i ? "text-foreground font-medium" : "text-muted-foreground"
                    )}>
                      {segment.label}
                    </span>
                  </div>
                  <span className="text-xs font-mono text-foreground">
                    {segment.percentage.toFixed(1)}%
                  </span>
                </motion.div>
              ))}
            </div>
          </div>
        ) : (
          // Bar chart for other types
          <div className="space-y-4">
            {chartData.map((item, index) => (
              <AnimatedBar
                key={item.label}
                value={item.value}
                maxValue={maxValue}
                label={item.label}
                color={item.color}
                change={item.change}
                index={index}
              />
            ))}
          </div>
        )}
      </div>

      {/* AI Interpretation Panel */}
      {interpretation && !compact && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mx-5 mb-5 p-4 rounded-xl bg-gradient-to-r from-blue-500/5 to-purple-500/5 border border-blue-500/20"
        >
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
              <Zap className="w-4 h-4 text-blue-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-1">
                AI Interpretation
              </p>
              <p className="text-sm font-semibold text-foreground mb-2">
                {interpretation.headline}
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed mb-2">
                {interpretation.insight}
              </p>
              <p className="text-xs font-mono text-muted-foreground/80">
                {interpretation.signal}
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Quick Stats Footer */}
      <div className="px-5 py-3 border-t border-border/50 bg-muted/20">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <TrendingUp className="w-3 h-3 text-emerald-500" />
              <span className="text-muted-foreground">
                {chartData.filter(d => (d.change || 0) > 0).length} growing
              </span>
            </div>
            <div className="flex items-center gap-1">
              <TrendingDown className="w-3 h-3 text-red-500" />
              <span className="text-muted-foreground">
                {chartData.filter(d => (d.change || 0) < 0).length} declining
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1 text-muted-foreground">
            <Info className="w-3 h-3" />
            <span className="font-mono">{chartData.length} sectors tracked</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ChartIntelligence;

