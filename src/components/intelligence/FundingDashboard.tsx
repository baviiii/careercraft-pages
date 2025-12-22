import { motion } from "framer-motion";
import { DollarSign, TrendingUp, Calendar, FileText, Award } from "lucide-react";
import { cn } from "@/lib/utils";

interface BudgetAllocation {
  sector: string;
  amount: number; // in millions
  change: number; // percentage
  programs: number;
}

interface FundingProgram {
  name: string;
  amount: string;
  sector: string;
  year: string;
  status: "active" | "upcoming" | "closing";
  eligibility: string;
}

const budgetAllocations: BudgetAllocation[] = [
  { sector: "Healthcare", amount: 8450, change: 8.2, programs: 12 },
  { sector: "Education", amount: 6230, change: 5.4, programs: 8 },
  { sector: "Skills & Training", amount: 4520, change: 12.8, programs: 15 },
  { sector: "Infrastructure", amount: 3890, change: -2.1, programs: 6 },
  { sector: "Renewable Energy", amount: 2150, change: 18.5, programs: 4 },
  { sector: "Regional Development", amount: 1890, change: 9.3, programs: 7 },
];

const fundingPrograms: FundingProgram[] = [
  {
    name: "Skills for Future Fund",
    amount: "$450M",
    sector: "Skills & Training",
    year: "2024-25",
    status: "active",
    eligibility: "Training providers, individuals seeking upskilling",
  },
  {
    name: "Healthcare Workforce Initiative",
    amount: "$280M",
    sector: "Healthcare",
    year: "2024-25",
    status: "active",
    eligibility: "Healthcare workers, students in health fields",
  },
  {
    name: "Digital Skills Boost",
    amount: "$125M",
    sector: "Technology",
    year: "2024-25",
    status: "active",
    eligibility: "Tech training programs, digital literacy courses",
  },
  {
    name: "Regional Jobs Fund",
    amount: "$180M",
    sector: "Regional Development",
    year: "2024-25",
    status: "upcoming",
    eligibility: "Regional businesses, job creators",
  },
  {
    name: "Green Jobs Program",
    amount: "$95M",
    sector: "Renewable Energy",
    year: "2024-25",
    status: "active",
    eligibility: "Renewable energy training, green skills development",
  },
];

export function FundingDashboard() {
  const totalBudget = budgetAllocations.reduce((sum, b) => sum + b.amount, 0);
  const totalPrograms = fundingPrograms.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold text-foreground">Funding & Budgets</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Budget allocations and available funding programs in South Australia
          </p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <DollarSign className="w-4 h-4 text-amber-500" />
          <span className="text-sm font-medium text-amber-500">Budget Data</span>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card-intelligence p-6"
        >
          <DollarSign className="w-8 h-8 text-amber-500 mb-3" />
          <h4 className="font-semibold text-foreground mb-2">Total Budget</h4>
          <p className="text-3xl font-bold text-foreground">
            ${(totalBudget / 1000).toFixed(1)}B
          </p>
          <p className="text-xs text-muted-foreground mt-1">Across all sectors</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="card-intelligence p-6"
        >
          <Award className="w-8 h-8 text-accent-emerald mb-3" />
          <h4 className="font-semibold text-foreground mb-2">Active Programs</h4>
          <p className="text-3xl font-bold text-foreground">{totalPrograms}</p>
          <p className="text-xs text-muted-foreground mt-1">Funding programs</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="card-intelligence p-6"
        >
          <TrendingUp className="w-8 h-8 text-blue-500 mb-3" />
          <h4 className="font-semibold text-foreground mb-2">Top Growth</h4>
          <p className="text-3xl font-bold text-foreground">
            +{Math.max(...budgetAllocations.map(b => b.change)).toFixed(1)}%
          </p>
          <p className="text-xs text-muted-foreground mt-1">Year-over-year</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="card-intelligence p-6"
        >
          <Calendar className="w-8 h-8 text-purple-500 mb-3" />
          <h4 className="font-semibold text-foreground mb-2">Financial Year</h4>
          <p className="text-3xl font-bold text-foreground">2024-25</p>
          <p className="text-xs text-muted-foreground mt-1">Current period</p>
        </motion.div>
      </div>

      {/* Budget Allocations */}
      <div className="card-intelligence p-6">
        <h3 className="font-display text-lg font-semibold text-foreground mb-4">
          Budget Allocations by Sector
        </h3>
        <div className="space-y-4">
          {budgetAllocations
            .sort((a, b) => b.amount - a.amount)
            .map((allocation, index) => {
              const percentage = (allocation.amount / totalBudget) * 100;
              return (
                <motion.div
                  key={allocation.sector}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="font-medium text-foreground">{allocation.sector}</span>
                      <span className="text-xs text-muted-foreground">
                        ({allocation.programs} programs)
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        {allocation.change > 0 ? (
                          <TrendingUp className="w-4 h-4 text-accent-emerald" />
                        ) : (
                          <TrendingUp className="w-4 h-4 text-destructive rotate-180" />
                        )}
                        <span
                          className={cn(
                            "text-sm font-semibold",
                            allocation.change > 0 ? "text-accent-emerald" : "text-destructive"
                          )}
                        >
                          {allocation.change > 0 ? "+" : ""}{allocation.change}%
                        </span>
                      </div>
                      <span className="font-bold text-foreground">
                        ${(allocation.amount / 1000).toFixed(1)}B
                      </span>
                    </div>
                  </div>
                  <div className="h-3 w-full bg-muted rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${percentage}%` }}
                      transition={{ delay: index * 0.1 + 0.2, duration: 0.5 }}
                      className="h-full bg-gradient-to-r from-amber-500 to-amber-600 rounded-full"
                    />
                  </div>
                </motion.div>
              );
            })}
        </div>
      </div>

      {/* Funding Programs */}
      <div className="card-intelligence p-6">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="w-5 h-5 text-accent-emerald" />
          <h3 className="font-display text-lg font-semibold text-foreground">
            Available Funding Programs
          </h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {fundingPrograms.map((program, index) => (
            <motion.div
              key={program.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="p-5 rounded-xl bg-muted/50 border border-border/50 hover:border-accent-emerald/30 transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="font-semibold text-foreground mb-1">{program.name}</h4>
                  <p className="text-sm text-muted-foreground">{program.sector}</p>
                </div>
                <span
                  className={cn(
                    "px-3 py-1 rounded-full text-xs font-medium",
                    program.status === "active" && "bg-accent-emerald/10 text-accent-emerald border border-accent-emerald/20",
                    program.status === "upcoming" && "bg-blue-500/10 text-blue-500 border border-blue-500/20",
                    program.status === "closing" && "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                  )}
                >
                  {program.status}
                </span>
              </div>
              <div className="flex items-center gap-4 mb-3">
                <div>
                  <p className="text-2xl font-bold text-foreground">{program.amount}</p>
                  <p className="text-xs text-muted-foreground">Allocated funding</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{program.year}</p>
                  <p className="text-xs text-muted-foreground">Financial year</p>
                </div>
              </div>
              <div className="pt-3 border-t border-border/50">
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">Eligibility:</span> {program.eligibility}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

