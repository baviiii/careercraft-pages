import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Briefcase, MapPin, Users, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

interface CareerTrend {
  occupation: string;
  sector: string;
  growth: number;
  jobs: number;
  avgSalary?: string;
}

interface SectorGrowth {
  sector: string;
  growth: number;
  jobs: number;
  color: string;
}

const topCareers: CareerTrend[] = [
  { occupation: "Registered Nurse", sector: "Healthcare", growth: 18.5, jobs: 1240, avgSalary: "$85k-$110k" },
  { occupation: "Software Engineer", sector: "Technology", growth: 22.3, jobs: 890, avgSalary: "$95k-$140k" },
  { occupation: "Construction Manager", sector: "Construction", growth: 15.2, jobs: 650, avgSalary: "$90k-$130k" },
  { occupation: "Early Childhood Teacher", sector: "Education", growth: 12.8, jobs: 420, avgSalary: "$70k-$95k" },
  { occupation: "Electrician", sector: "Construction", growth: 14.1, jobs: 580, avgSalary: "$75k-$110k" },
  { occupation: "Mental Health Worker", sector: "Healthcare", growth: 20.4, jobs: 380, avgSalary: "$65k-$90k" },
];

const sectorGrowth: SectorGrowth[] = [
  { sector: "Healthcare", growth: 16.8, jobs: 3250, color: "bg-red-500" },
  { sector: "Technology", growth: 21.2, jobs: 1890, color: "bg-blue-500" },
  { sector: "Construction", growth: 13.5, jobs: 2340, color: "bg-amber-500" },
  { sector: "Education", growth: 9.2, jobs: 1560, color: "bg-purple-500" },
  { sector: "Renewable Energy", growth: 24.6, jobs: 890, color: "bg-green-500" },
];

export function CareersDashboard() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold text-foreground">Career Opportunities</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Top growth careers and sector trends in South Australia
          </p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent-emerald/10 border border-accent-emerald/20">
          <BarChart3 className="w-4 h-4 text-accent-emerald" />
          <span className="text-sm font-medium text-accent-emerald">Live Data</span>
        </div>
      </div>

      {/* Sector Growth Overview */}
      <div className="card-intelligence p-6">
        <h3 className="font-display text-lg font-semibold text-foreground mb-4">
          Sector Growth Rates
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {sectorGrowth.map((sector, index) => (
            <motion.div
              key={sector.sector}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="p-4 rounded-xl bg-muted/50 border border-border/50"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className={cn("w-2 h-2 rounded-full", sector.color)} />
                <span className="text-sm font-medium text-foreground">{sector.sector}</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{sector.jobs.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">jobs available</p>
              <div className="flex items-center gap-1 mt-2">
                {sector.growth > 0 ? (
                  <TrendingUp className="w-3.5 h-3.5 text-accent-emerald" />
                ) : (
                  <TrendingDown className="w-3.5 h-3.5 text-destructive" />
                )}
                <span className={cn(
                  "text-sm font-medium",
                  sector.growth > 0 ? "text-accent-emerald" : "text-destructive"
                )}>
                  {sector.growth > 0 ? "+" : ""}{sector.growth}% growth
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Top Careers Table */}
      <div className="card-intelligence p-6">
        <div className="flex items-center gap-3 mb-4">
          <Briefcase className="w-5 h-5 text-accent-emerald" />
          <h3 className="font-display text-lg font-semibold text-foreground">
            Top Growth Careers
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">
                  Occupation
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">
                  Sector
                </th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-muted-foreground">
                  Growth
                </th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-muted-foreground">
                  Jobs Available
                </th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-muted-foreground">
                  Avg Salary
                </th>
              </tr>
            </thead>
            <tbody>
              {topCareers.map((career, index) => (
                <motion.tr
                  key={career.occupation}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="border-b border-border/50 hover:bg-muted/30 transition-colors"
                >
                  <td className="py-3 px-4">
                    <span className="font-medium text-foreground">{career.occupation}</span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-sm text-muted-foreground">{career.sector}</span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <TrendingUp className="w-4 h-4 text-accent-emerald" />
                      <span className="font-semibold text-accent-emerald">
                        +{career.growth}%
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span className="font-medium text-foreground">
                      {career.jobs.toLocaleString()}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span className="text-sm text-muted-foreground">{career.avgSalary}</span>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Key Insights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card-intelligence p-6"
        >
          <Users className="w-8 h-8 text-accent-emerald mb-3" />
          <h4 className="font-semibold text-foreground mb-2">Total Opportunities</h4>
          <p className="text-3xl font-bold text-foreground mb-1">
            {(topCareers.reduce((sum, c) => sum + c.jobs, 0)).toLocaleString()}
          </p>
          <p className="text-xs text-muted-foreground">Active job openings</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="card-intelligence p-6"
        >
          <TrendingUp className="w-8 h-8 text-accent-emerald mb-3" />
          <h4 className="font-semibold text-foreground mb-2">Average Growth</h4>
          <p className="text-3xl font-bold text-foreground mb-1">
            +{(topCareers.reduce((sum, c) => sum + c.growth, 0) / topCareers.length).toFixed(1)}%
          </p>
          <p className="text-xs text-muted-foreground">Year-over-year growth</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="card-intelligence p-6"
        >
          <MapPin className="w-8 h-8 text-accent-emerald mb-3" />
          <h4 className="font-semibold text-foreground mb-2">Top Sector</h4>
          <p className="text-xl font-bold text-foreground mb-1">
            {sectorGrowth.sort((a, b) => b.growth - a.growth)[0].sector}
          </p>
          <p className="text-xs text-muted-foreground">
            {sectorGrowth.sort((a, b) => b.growth - a.growth)[0].growth}% growth
          </p>
        </motion.div>
      </div>
    </div>
  );
}

