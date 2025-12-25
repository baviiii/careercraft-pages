import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useRAGMetadata } from "@/hooks/useRAGMetadata";
import { Loader2, TrendingUp, Building2, Heart, GraduationCap, Cpu, Leaf, HardHat } from "lucide-react";

interface Sector {
  name: string;
  displayName: string;
  count: number;
  percentage: number;
  icon: React.ReactNode;
  color: string;
  bgGradient: string;
}

const sectorConfig: Record<string, { icon: React.ReactNode; color: string; bgGradient: string }> = {
  health: { 
    icon: <Heart className="w-5 h-5" />, 
    color: "text-rose-600",
    bgGradient: "from-rose-500/20 to-rose-600/10"
  },
  "public-sector": { 
    icon: <Building2 className="w-5 h-5" />, 
    color: "text-blue-600",
    bgGradient: "from-blue-500/20 to-blue-600/10"
  },
  education: { 
    icon: <GraduationCap className="w-5 h-5" />, 
    color: "text-purple-600",
    bgGradient: "from-purple-500/20 to-purple-600/10"
  },
  technology: { 
    icon: <Cpu className="w-5 h-5" />, 
    color: "text-cyan-600",
    bgGradient: "from-cyan-500/20 to-cyan-600/10"
  },
  construction: { 
    icon: <HardHat className="w-5 h-5" />, 
    color: "text-amber-600",
    bgGradient: "from-amber-500/20 to-amber-600/10"
  },
  general: { 
    icon: <Building2 className="w-5 h-5" />, 
    color: "text-slate-600",
    bgGradient: "from-slate-500/20 to-slate-600/10"
  },
};

export function SectorHeatmap() {
  const { getCategories, loading, error } = useRAGMetadata();
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setFetchError(null);
      try {
        const categories = await getCategories();

        if (categories && categories.sectors) {
          const sectorFacets = categories.sectors || [];
          const total = sectorFacets.reduce((sum: number, s: any) => sum + (s.count || 0), 0);
          setTotalCount(total);

          const sectorData: Sector[] = sectorFacets
            .filter((facet: any) => facet.value && facet.count > 0)
            .map((facet: any) => {
              const sectorKey = facet.value.toLowerCase().replace(/\s+/g, "-");
              const config = sectorConfig[sectorKey] || sectorConfig.general;
              const displayName = facet.value
                .split("-")
                .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
                .join(" ");
              
              return {
                name: facet.value,
                displayName,
                count: facet.count,
                percentage: total > 0 ? Math.round((facet.count / total) * 100) : 0,
                ...config,
              };
            })
            .sort((a: Sector, b: Sector) => b.count - a.count);

          setSectors(sectorData);
        } else {
          setFetchError("Unable to load sector data. Please check your Azure Search configuration.");
        }
      } catch (error) {
        console.error("Failed to fetch sector data:", error);
        setFetchError(error instanceof Error ? error.message : "Failed to load sector data");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  if (isLoading || loading) {
    return (
      <div className="card-intelligence p-6">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
          <span className="ml-2 text-sm text-muted-foreground">Analyzing sector data...</span>
        </div>
      </div>
    );
  }

  if (fetchError || error) {
    return (
      <div className="card-intelligence p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="font-display text-lg font-bold text-foreground">Sector Coverage</h2>
            <p className="text-sm text-muted-foreground">Document distribution by industry</p>
          </div>
        </div>
        <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
          <p className="text-sm text-destructive font-medium">Unable to load data</p>
          <p className="text-xs text-muted-foreground mt-1">
            {fetchError || error || "Please check your Azure Search configuration."}
          </p>
        </div>
      </div>
    );
  }

  if (sectors.length === 0) {
    return (
      <div className="card-intelligence p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="font-display text-lg font-bold text-foreground">Sector Coverage</h2>
            <p className="text-sm text-muted-foreground">Document distribution by industry</p>
          </div>
        </div>
        <div className="p-4 rounded-lg bg-muted/50 border border-border/50">
          <p className="text-sm text-muted-foreground text-center">No sector data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card-intelligence p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-display text-lg font-bold text-foreground">Sector Coverage</h2>
          <p className="text-sm text-muted-foreground">
            {totalCount.toLocaleString()} indexed segments across {sectors.length} sectors
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20">
          <TrendingUp className="w-3.5 h-3.5 text-blue-500" />
          <span className="text-xs font-semibold text-blue-600">All Sectors</span>
        </div>
      </div>

      {/* Main Sectors - Visual Cards */}
      <div className="space-y-3">
        {sectors.slice(0, 6).map((sector, index) => (
          <motion.div
            key={sector.name}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.08 }}
            className={cn(
              "relative p-4 rounded-xl cursor-pointer group transition-all",
              "hover:shadow-lg hover:-translate-y-0.5",
              `bg-gradient-to-r ${sector.bgGradient}`,
              "border border-border/30"
            )}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "p-2.5 rounded-xl bg-background/80 shadow-sm",
                  sector.color
                )}>
                  {sector.icon}
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">{sector.displayName}</h3>
                  <p className="text-xs text-muted-foreground">
                    {sector.count.toLocaleString()} indexed segments
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-foreground">{sector.percentage}%</p>
                <p className="text-xs text-muted-foreground">of total</p>
              </div>
            </div>
            
            {/* Progress Bar */}
            <div className="mt-3 h-2 w-full bg-background/50 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${sector.percentage}%` }}
                transition={{ delay: index * 0.08 + 0.2, duration: 0.6, ease: "easeOut" }}
                className={cn(
                  "h-full rounded-full",
                  sector.color.replace("text-", "bg-").replace("-600", "-500")
                )}
              />
            </div>
          </motion.div>
        ))}
      </div>

      {/* Additional Sectors Summary */}
      {sectors.length > 6 && (
        <div className="mt-4 p-3 rounded-lg bg-muted/30 border border-border/50">
          <p className="text-xs text-muted-foreground text-center">
            +{sectors.length - 6} more sectors with {sectors.slice(6).reduce((sum, s) => sum + s.count, 0).toLocaleString()} segments
          </p>
        </div>
      )}
    </div>
  );
}
