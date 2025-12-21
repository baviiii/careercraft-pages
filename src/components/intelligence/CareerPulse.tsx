import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Minus, Activity } from "lucide-react";
import { cn } from "@/lib/utils";

interface PulseMetric {
  label: string;
  value: string;
  change: number;
  changeLabel: string;
  trend: "up" | "down" | "stable";
}

const pulseMetrics: PulseMetric[] = [
  {
    label: "Active Job Postings",
    value: "12,847",
    change: 8.2,
    changeLabel: "vs last month",
    trend: "up",
  },
  {
    label: "Skills in Demand",
    value: "847",
    change: 12.5,
    changeLabel: "emerging skills",
    trend: "up",
  },
  {
    label: "Avg. Time to Hire",
    value: "23 days",
    change: -4.1,
    changeLabel: "faster hiring",
    trend: "down",
  },
  {
    label: "Salary Growth",
    value: "+4.2%",
    change: 4.2,
    changeLabel: "year over year",
    trend: "up",
  },
];

export function CareerPulse() {
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
        {pulseMetrics.map((metric, index) => (
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
