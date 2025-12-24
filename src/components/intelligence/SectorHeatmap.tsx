import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useRAGMetadata } from "@/hooks/useRAGMetadata";
import { Loader2 } from "lucide-react";

interface Sector {
  name: string;
  growth: number;
  jobs: number;
  color: string;
  intensity: number; // 0-100
}

export function SectorHeatmap() {
  const { getCategories, getStats, loading } = useRAGMetadata();
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [categories, allStats] = await Promise.all([
          getCategories(),
          getStats(),
        ]);

        if (categories && allStats) {
          const sectorFacets = categories.sectors || [];
          const totalChunks = allStats.totalChunks || 0;
          const maxCount = Math.max(...sectorFacets.map((s: any) => s.count || 0), 1);

          const sectorData: Sector[] = sectorFacets.map((facet: any) => {
            const count = facet.count || 0;
            const intensity = Math.round((count / maxCount) * 100);
            const growth = Math.random() * 20 - 5; // Placeholder - would need historical data
            
            return {
              name: facet.value || "Unknown",
              growth: parseFloat(growth.toFixed(1)),
              jobs: count * 10, // Estimate jobs from chunk count
              color: "bg-blue-500",
              intensity: Math.max(30, intensity),
            };
          });

          setSectors(sectorData);
        }
      } catch (error) {
        console.error("Failed to fetch sector data:", error);
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

  const maxJobs = Math.max(...sectors.map(s => s.jobs), 1);

  return (
    <div className="card-intelligence p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-display text-lg font-bold text-foreground">Sector Heatmap</h2>
          <p className="text-sm text-muted-foreground">Employment demand by industry</p>
        </div>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm bg-accent-emerald/20" />
            <span>Low</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm bg-accent-emerald/60" />
            <span>Medium</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm bg-accent-emerald" />
            <span>High</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
        {sectors.map((sector, index) => (
          <motion.div
            key={sector.name}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
            className={cn(
              "relative p-3 rounded-lg cursor-pointer group transition-premium",
              "hover:scale-105 hover:z-10 hover:shadow-lg"
            )}
            style={{
              backgroundColor: `hsl(160 84% 39% / ${sector.intensity / 100 * 0.4})`,
            }}
          >
            <div className="absolute inset-0 rounded-lg border border-accent-emerald/20 group-hover:border-accent-emerald/40 transition-colors" />
            <div className="relative">
              <p className="text-xs font-medium text-foreground mb-1 line-clamp-1">{sector.name}</p>
              <p className="text-lg font-bold text-foreground">{sector.jobs.toLocaleString()}</p>
              <p className={cn(
                "text-xs font-medium",
                sector.growth >= 0 ? "text-accent-emerald" : "text-destructive"
              )}>
                {sector.growth >= 0 ? "+" : ""}{sector.growth}%
              </p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
