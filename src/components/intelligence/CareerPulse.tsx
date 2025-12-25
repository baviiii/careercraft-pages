import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Minus, Activity, Loader2, FileText, Users, Briefcase, GraduationCap, Building2, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRAGMetadata, CategoryStats } from "@/hooks/useRAGMetadata";

interface PulseMetric {
  label: string;
  value: string;
  subValue?: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
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
  const { getStats, getCategories, loading, error } = useRAGMetadata();
  const [metrics, setMetrics] = useState<PulseMetric[]>([]);
  const [categories, setCategories] = useState<CategoryStats[]>([]);
  const [totalDocs, setTotalDocs] = useState(0);
  const [totalChunks, setTotalChunks] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setFetchError(null);
      try {
        const categoriesData = await getCategories();

        if (categoriesData) {
          setCategories(categoriesData.categories || []);
          
          // Calculate totals
          const docCount = categoriesData.categories?.reduce((sum, cat) => sum + cat.count, 0) || 0;
          const chunkCount = categoriesData.sectors?.reduce((sum: number, sector: any) => sum + sector.count, 0) || 0;
          
          setTotalDocs(docCount);
          setTotalChunks(chunkCount);

          // Build metrics from categories
          const topCategories = (categoriesData.categories || [])
            .sort((a, b) => b.count - a.count)
            .slice(0, 6);

          const metricsData: PulseMetric[] = topCategories.map(cat => {
            const colorConfig = categoryColors[cat.category] || { color: "text-blue-600", bgColor: "bg-blue-500/10" };
            const displayName = cat.category
              .split("-")
              .map(word => word.charAt(0).toUpperCase() + word.slice(1))
              .join(" ");
            
            return {
              label: displayName,
              value: cat.count.toString(),
              subValue: `${cat.count} documents`,
              icon: categoryIcons[cat.category] || <FileText className="w-5 h-5" />,
              color: colorConfig.color,
              bgColor: colorConfig.bgColor,
            };
          });

          setMetrics(metricsData);
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
          <span className="ml-2 text-sm text-muted-foreground">Loading intelligence data...</span>
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
            <h2 className="font-display text-lg font-bold text-foreground">SA Career Intelligence</h2>
            <p className="text-sm text-muted-foreground">Real-time data from government sources</p>
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

  return (
    <div className="card-intelligence p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-gradient-gold flex items-center justify-center shadow-lg shadow-accent-gold/20">
          <Activity className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1">
          <h2 className="font-display text-lg font-bold text-foreground">SA Career Intelligence</h2>
          <p className="text-sm text-muted-foreground">
            Powered by {totalDocs.toLocaleString()} documents • {totalChunks.toLocaleString()} indexed segments
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent-emerald/10 border border-accent-emerald/20">
          <span className="w-2 h-2 bg-accent-emerald rounded-full animate-pulse-subtle" />
          <span className="text-xs font-semibold text-accent-emerald">Live</span>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="p-4 rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/20">
          <div className="flex items-center gap-2 mb-1">
            <FileText className="w-4 h-4 text-blue-500" />
            <span className="text-xs font-medium text-blue-600 uppercase tracking-wide">Total Documents</span>
          </div>
          <p className="text-3xl font-bold text-foreground">{totalDocs.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">Government sources indexed</p>
        </div>
        <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border border-emerald-500/20">
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-4 h-4 text-emerald-500" />
            <span className="text-xs font-medium text-emerald-600 uppercase tracking-wide">Searchable Segments</span>
          </div>
          <p className="text-3xl font-bold text-foreground">{totalChunks.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">AI-searchable content chunks</p>
        </div>
      </div>

      {/* Category Breakdown */}
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">By Category</h3>
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
            <p className="text-2xl font-bold text-foreground mb-0.5">{metric.value}</p>
            <p className="text-xs font-medium text-muted-foreground">{metric.label}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
