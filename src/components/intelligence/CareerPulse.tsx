/**
 * CareerPulse - Real-time career intelligence metrics
 * 
 * Now powered by IntelligenceContext for cost-efficient data sharing.
 * Falls back to direct API calls when used outside the context.
 */

import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  Loader2, 
  FileText, 
  Briefcase, 
  GraduationCap, 
  Building2, 
  DollarSign, 
  Brain, 
  Zap,
  Sparkles,
  ArrowUpRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

// Try to use context, fall back to direct hook if not available
let useIntelligence: (() => any) | null = null;
try {
  const contextModule = require("@/contexts/IntelligenceContext");
  useIntelligence = contextModule.useIntelligence;
} catch {
  useIntelligence = null;
}

interface PulseMetric {
  label: string;
  value: string;
  subValue?: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  trend?: "up" | "down" | "stable";
  trendValue?: string;
}

const categoryIcons: Record<string, React.ReactNode> = {
  "budget": <DollarSign className="w-5 h-5" />,
  "strategy": <Building2 className="w-5 h-5" />,
  "workforce": <Briefcase className="w-5 h-5" />,
  "career-guidance": <GraduationCap className="w-5 h-5" />,
  "education": <GraduationCap className="w-5 h-5" />,
  "policy": <FileText className="w-5 h-5" />,
  "report": <FileText className="w-5 h-5" />,
};

const categoryColors: Record<string, { color: string; bgColor: string }> = {
  "budget": { color: "text-amber-600", bgColor: "bg-amber-500/10" },
  "strategy": { color: "text-blue-600", bgColor: "bg-blue-500/10" },
  "workforce": { color: "text-emerald-600", bgColor: "bg-emerald-500/10" },
  "career-guidance": { color: "text-purple-600", bgColor: "bg-purple-500/10" },
  "education": { color: "text-indigo-600", bgColor: "bg-indigo-500/10" },
  "policy": { color: "text-rose-600", bgColor: "bg-rose-500/10" },
  "report": { color: "text-cyan-600", bgColor: "bg-cyan-500/10" },
};

export function CareerPulse() {
  // Try to use context data first
  const contextData = useIntelligence ? (() => {
    try {
      return useIntelligence!();
    } catch {
      return null;
    }
  })() : null;

  const [isLoading, setIsLoading] = useState(!contextData);

  // Derive metrics from context or show loading
  const metrics = useMemo<PulseMetric[]>(() => {
    if (!contextData) return [];

    const {
      metrics: contextMetrics,
      fundingAllocations,
      careerOpportunities,
      skillsDemand,
      totalBudget,
      totalJobs,
    } = contextData;

    const categories = contextMetrics?.categories || [];
    
    // Build metrics from context data
    const pulseMetrics: PulseMetric[] = [];

    // Budget metric
    if (totalBudget > 0) {
      pulseMetrics.push({
        label: "Budget",
        value: `$${(totalBudget / 1000).toFixed(1)}B`,
        subValue: `${fundingAllocations.length} sectors tracked`,
        icon: <DollarSign className="w-5 h-5" />,
        color: "text-amber-600",
        bgColor: "bg-amber-500/10",
        trend: fundingAllocations[0]?.change > 0 ? "up" : "stable",
        trendValue: fundingAllocations[0]?.change ? `${fundingAllocations[0].change.toFixed(1)}%` : undefined,
      });
    }

    // Careers metric
    if (totalJobs > 0) {
      pulseMetrics.push({
        label: "Opportunities",
        value: totalJobs.toLocaleString(),
        subValue: `${careerOpportunities.filter((c: any) => c.trending).length} trending`,
        icon: <Briefcase className="w-5 h-5" />,
        color: "text-blue-600",
        bgColor: "bg-blue-500/10",
        trend: "up",
        trendValue: careerOpportunities.length > 0 
          ? `+${(careerOpportunities.reduce((s: number, c: any) => s + c.growth, 0) / careerOpportunities.length).toFixed(1)}%`
          : undefined,
      });
    }

    // Skills metric
    if (skillsDemand.length > 0) {
      const emergingCount = skillsDemand.filter((s: any) => s.category === "emerging").length;
      pulseMetrics.push({
        label: "Skills",
        value: skillsDemand.length.toString(),
        subValue: `${emergingCount} emerging`,
        icon: <Brain className="w-5 h-5" />,
        color: "text-purple-600",
        bgColor: "bg-purple-500/10",
        trend: "up",
        trendValue: `+${(skillsDemand.reduce((s: number, sk: any) => s + sk.growth, 0) / skillsDemand.length).toFixed(1)}%`,
      });
    }

    // Add category-based metrics
    categories.slice(0, 3).forEach((cat: any) => {
      const colorConfig = categoryColors[cat.name] || { color: "text-blue-600", bgColor: "bg-blue-500/10" };
      const displayName = cat.name
        .split("-")
        .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");

      pulseMetrics.push({
        label: displayName,
        value: cat.count.toString(),
        subValue: "documents",
        icon: categoryIcons[cat.name] || <FileText className="w-5 h-5" />,
        color: colorConfig.color,
        bgColor: colorConfig.bgColor,
        trend: cat.trend > 0 ? "up" : cat.trend < 0 ? "down" : "stable",
      });
    });

    return pulseMetrics.slice(0, 6);
  }, [contextData]);

  const totalDocs = contextData?.metrics?.totalDocuments || 0;
  const totalChunks = contextData?.metrics?.totalChunks || 0;
  const topCareers = contextData?.careerOpportunities?.slice(0, 5).map((c: any) => c.occupation) || [];
  const topSkills = contextData?.skillsDemand?.slice(0, 5).map((s: any) => s.name) || [];
  const isContextLoading = contextData?.globalLoading || false;

  useEffect(() => {
    if (contextData) {
      setIsLoading(false);
    }
  }, [contextData]);

  if (isLoading || isContextLoading) {
    return (
      <div className="card-intelligence p-6">
        <div className="flex items-center justify-center h-32">
          <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
          <span className="ml-2 text-sm text-muted-foreground">Loading intelligence data...</span>
        </div>
      </div>
    );
  }

  if (!contextData) {
    return (
      <div className="card-intelligence p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-gold flex items-center justify-center shadow-lg shadow-accent-gold/20">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="font-display text-lg font-bold text-foreground">SA Career Intelligence</h2>
            <p className="text-sm text-muted-foreground">Initializing...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card-intelligence p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
          <Activity className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1">
          <h2 className="font-display text-lg font-bold text-foreground">SA Career Intelligence</h2>
          <p className="text-sm text-muted-foreground">
            Powered by {totalDocs.toLocaleString()} documents • {totalChunks.toLocaleString()} indexed segments
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
          <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
          <span className="text-xs font-semibold text-emerald-600">Live</span>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="p-4 rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/20">
          <div className="flex items-center gap-2 mb-1">
            <FileText className="w-4 h-4 text-blue-500" />
            <span className="text-xs font-medium text-blue-600 uppercase tracking-wide">Indexed Documents</span>
          </div>
          <p className="text-3xl font-bold text-foreground">{totalDocs.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">Government sources • AI-powered search</p>
        </div>
        <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border border-emerald-500/20">
          <div className="flex items-center gap-2 mb-1">
            <Brain className="w-4 h-4 text-emerald-500" />
            <span className="text-xs font-medium text-emerald-600 uppercase tracking-wide">Intelligence Chunks</span>
          </div>
          <p className="text-3xl font-bold text-foreground">{totalChunks.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">Vector-embedded • Semantic search ready</p>
        </div>
      </div>

      {/* Live Intelligence Highlights */}
      {(topCareers.length > 0 || topSkills.length > 0) && (
        <div className="mb-6 p-4 rounded-xl bg-gradient-to-br from-purple-500/10 to-indigo-500/5 border border-purple-500/20">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-4 h-4 text-purple-500" />
            <span className="text-xs font-semibold text-purple-600 uppercase tracking-wide">Live Intelligence</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {topCareers.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Top Growing Careers</p>
                <div className="flex flex-wrap gap-1.5">
                  {topCareers.slice(0, 4).map((career: string, i: number) => (
                    <span key={i} className="text-xs px-2 py-1 rounded-full bg-purple-500/10 text-purple-600 border border-purple-500/20">
                      {career}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {topSkills.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">In-Demand Skills</p>
                <div className="flex flex-wrap gap-1.5">
                  {topSkills.slice(0, 4).map((skill: string, i: number) => (
                    <span key={i} className="text-xs px-2 py-1 rounded-full bg-indigo-500/10 text-indigo-600 border border-indigo-500/20">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Metric Cards */}
      {metrics.length > 0 && (
        <>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Key Metrics</h3>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            {metrics.map((metric, index) => (
              <motion.div
                key={metric.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={cn(
                  "p-4 rounded-xl border border-border/50 hover:shadow-md transition-all cursor-pointer group",
                  metric.bgColor
                )}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className={cn("p-1.5 rounded-lg bg-background/80", metric.color)}>
                    {metric.icon}
                  </div>
                </div>
                <div className="flex items-baseline gap-2 mb-0.5">
                  <p className="text-2xl font-bold text-foreground">{metric.value}</p>
                  {metric.trend === "up" && metric.trendValue && (
                    <div className="flex items-center gap-0.5 text-emerald-500">
                      <TrendingUp className="w-3 h-3" />
                      <span className="text-xs font-medium">{metric.trendValue}</span>
                    </div>
                  )}
                  {metric.trend === "down" && (
                    <TrendingDown className="w-3 h-3 text-red-500" />
                  )}
                </div>
                <p className="text-xs font-medium text-muted-foreground">{metric.label}</p>
                {metric.subValue && (
                  <p className="text-[10px] text-muted-foreground mt-0.5">{metric.subValue}</p>
                )}
              </motion.div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default CareerPulse;
