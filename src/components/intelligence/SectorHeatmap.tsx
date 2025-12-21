import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface Sector {
  name: string;
  growth: number;
  jobs: number;
  color: string;
  intensity: number; // 0-100
}

const sectors: Sector[] = [
  { name: "Healthcare", growth: 15.2, jobs: 3240, color: "bg-red-500", intensity: 95 },
  { name: "Construction", growth: 12.8, jobs: 2890, color: "bg-amber-500", intensity: 85 },
  { name: "ICT & Digital", growth: 18.5, jobs: 2150, color: "bg-blue-500", intensity: 100 },
  { name: "Defence", growth: 14.2, jobs: 1890, color: "bg-slate-600", intensity: 80 },
  { name: "Renewable Energy", growth: 22.1, jobs: 1650, color: "bg-green-500", intensity: 90 },
  { name: "Education", growth: 8.4, jobs: 2450, color: "bg-purple-500", intensity: 70 },
  { name: "Agriculture", growth: 6.2, jobs: 1420, color: "bg-lime-500", intensity: 55 },
  { name: "Tourism & Hospitality", growth: -2.1, jobs: 980, color: "bg-pink-500", intensity: 35 },
  { name: "Manufacturing", growth: 4.8, jobs: 1680, color: "bg-orange-500", intensity: 60 },
  { name: "Mining", growth: 9.6, jobs: 1340, color: "bg-yellow-600", intensity: 75 },
  { name: "Financial Services", growth: 7.2, jobs: 1120, color: "bg-cyan-500", intensity: 65 },
  { name: "Creative Industries", growth: 11.3, jobs: 890, color: "bg-fuchsia-500", intensity: 72 },
];

export function SectorHeatmap() {
  const maxJobs = Math.max(...sectors.map(s => s.jobs));

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
