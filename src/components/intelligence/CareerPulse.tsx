import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Minus, Activity, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRAGMetadata } from "@/hooks/useRAGMetadata";

interface PulseMetric {
  label: string;
  value: string;
  change: number;
  changeLabel: string;
  trend: "up" | "down" | "stable";
}

export function CareerPulse() {
  const { getStats, getCategories, loading, error } = useRAGMetadata();
  const [metrics, setMetrics] = useState<PulseMetric[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setFetchError(null);
      try {
        const [allStats, careerStats, skillsStats, categories] = await Promise.all([
          getStats(),
          getStats({ category: "career-guidance" }),
          getStats({ category: "workforce" }),
          getCategories(),
        ]);

        if (allStats && categories) {
          const totalDocs = allStats.totalDocuments || 0;
          const totalChunks = allStats.totalChunks || 0;
          const careerDocs = careerStats?.totalDocuments || 0;
          const skillsDocs = skillsStats?.totalDocuments || 0;
          
          // Calculate skills count from tags
          const skillsCount = categories.sectors?.length || 0;
          
          setMetrics([
            {
              label: "Total Documents",
              value: totalDocs.toLocaleString(),
              change: 0,
              changeLabel: "indexed documents",
              trend: "stable",
            },
            {
              label: "Career Resources",
              value: careerDocs.toString(),
              change: 0,
              changeLabel: "career guidance docs",
              trend: "stable",
            },
            {
              label: "Skills & Training",
              value: skillsCount.toString(),
              change: 0,
              changeLabel: "sectors covered",
              trend: "stable",
            },
            {
              label: "Total Chunks",
              value: totalChunks.toLocaleString(),
              change: 0,
              changeLabel: "searchable chunks",
              trend: "stable",
            },
          ]);
        } else {
          setFetchError("Unable to load dashboard data. Please check your Azure Search configuration.");
        }
      } catch (error) {
        console.error("Failed to fetch pulse data:", error);
        setFetchError(error instanceof Error ? error.message : "Failed to load dashboard data");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  if (isLoading || loading) {
    return (
      <div className="card-intelligence p-6">
        <div className="flex items-center justify-center h-32">
          <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
        </div>
      </div>
    );
  }

  if (fetchError || error) {
    return (
      <div className="card-intelligence p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-gold flex items-center justify-center shadow-lg shadow-accent-gold/20">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="font-display text-lg font-bold text-foreground">SA Career Pulse</h2>
            <p className="text-sm text-muted-foreground">Today's job market intelligence</p>
          </div>
        </div>
        <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
          <p className="text-sm text-destructive font-medium">Unable to load data</p>
          <p className="text-xs text-muted-foreground mt-1">
            {fetchError || error || "Please check your Azure Search configuration and ensure the rag-metadata function is deployed."}
          </p>
        </div>
      </div>
    );
  }

  if (metrics.length === 0) {
    return (
      <div className="card-intelligence p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-gold flex items-center justify-center shadow-lg shadow-accent-gold/20">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="font-display text-lg font-bold text-foreground">SA Career Pulse</h2>
            <p className="text-sm text-muted-foreground">Today's job market intelligence</p>
          </div>
        </div>
        <div className="p-4 rounded-lg bg-muted/50 border border-border/50">
          <p className="text-sm text-muted-foreground text-center">No data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card-intelligence p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-gradient-gold flex items-center justify-center shadow-lg shadow-accent-gold/20">
          <Activity className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="font-display text-lg font-bold text-foreground">SA Career Pulse</h2>
          <p className="text-sm text-muted-foreground">Today's job market intelligence</p>
        </div>
        <div className="ml-auto flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent-emerald/10 border border-accent-emerald/20">
          <span className="w-2 h-2 bg-accent-emerald rounded-full animate-pulse-subtle" />
          <span className="text-xs font-semibold text-accent-emerald">Live</span>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((metric, index) => (
          <motion.div
            key={metric.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="p-4 rounded-xl bg-muted/50 border border-border/50"
          >
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
              {metric.label}
            </p>
            <p className="text-2xl font-bold text-foreground mb-1">{metric.value}</p>
            <div className={cn(
              "flex items-center gap-1 text-sm font-medium",
              metric.trend === "up" && metric.change > 0 && "text-accent-emerald",
              metric.trend === "down" && metric.change < 0 && "text-accent-emerald",
              metric.trend === "up" && metric.change < 0 && "text-destructive",
              metric.trend === "stable" && "text-muted-foreground"
            )}>
              {metric.trend === "up" && <TrendingUp className="w-3.5 h-3.5" />}
              {metric.trend === "down" && <TrendingDown className="w-3.5 h-3.5" />}
              {metric.trend === "stable" && <Minus className="w-3.5 h-3.5" />}
              <span>{Math.abs(metric.change)}%</span>
              <span className="text-muted-foreground font-normal">{metric.changeLabel}</span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
