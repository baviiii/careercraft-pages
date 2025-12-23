import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  DollarSign, 
  TrendingUp, 
  Calendar, 
  FileText, 
  Award,
  Search,
  Filter,
  Download,
  ExternalLink,
  Bookmark,
  Info,
  CheckCircle2,
  Clock,
  AlertCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface BudgetAllocation {
  sector: string;
  amount: number; // in millions
  change: number; // percentage
  programs: number;
  color?: string;
}

interface FundingProgram {
  name: string;
  amount: string;
  sector: string;
  year: string;
  status: "active" | "upcoming" | "closing";
  eligibility: string;
  deadline?: string;
  description?: string;
}

const budgetAllocations: BudgetAllocation[] = [
  { sector: "Healthcare", amount: 8450, change: 8.2, programs: 12, color: "bg-red-500" },
  { sector: "Education", amount: 6230, change: 5.4, programs: 8, color: "bg-purple-500" },
  { sector: "Skills & Training", amount: 4520, change: 12.8, programs: 15, color: "bg-blue-500" },
  { sector: "Infrastructure", amount: 3890, change: -2.1, programs: 6, color: "bg-amber-500" },
  { sector: "Renewable Energy", amount: 2150, change: 18.5, programs: 4, color: "bg-green-500" },
  { sector: "Regional Development", amount: 1890, change: 9.3, programs: 7, color: "bg-cyan-500" },
];

const fundingPrograms: FundingProgram[] = [
  {
    name: "Skills for Future Fund",
    amount: "$450M",
    sector: "Skills & Training",
    year: "2024-25",
    status: "active",
    eligibility: "Training providers, individuals seeking upskilling",
    deadline: "Ongoing",
    description: "Comprehensive funding for skills development and training programs",
  },
  {
    name: "Healthcare Workforce Initiative",
    amount: "$280M",
    sector: "Healthcare",
    year: "2024-25",
    status: "active",
    eligibility: "Healthcare workers, students in health fields",
    deadline: "Dec 2025",
    description: "Supporting healthcare workforce development and training",
  },
  {
    name: "Digital Skills Boost",
    amount: "$125M",
    sector: "Technology",
    year: "2024-25",
    status: "active",
    eligibility: "Tech training programs, digital literacy courses",
    deadline: "Ongoing",
    description: "Funding for digital skills and technology training",
  },
  {
    name: "Regional Jobs Fund",
    amount: "$180M",
    sector: "Regional Development",
    year: "2024-25",
    status: "upcoming",
    eligibility: "Regional businesses, job creators",
    deadline: "Mar 2025",
    description: "Supporting job creation and economic development in regional areas",
  },
  {
    name: "Green Jobs Program",
    amount: "$95M",
    sector: "Renewable Energy",
    year: "2024-25",
    status: "active",
    eligibility: "Renewable energy training, green skills development",
    deadline: "Jun 2025",
    description: "Promoting green jobs and renewable energy skills",
  },
  {
    name: "Infrastructure Skills Program",
    amount: "$120M",
    sector: "Infrastructure",
    year: "2024-25",
    status: "active",
    eligibility: "Infrastructure projects, construction training",
    deadline: "Sep 2025",
    description: "Supporting infrastructure development and related skills",
  },
];

type FilterStatus = "all" | "active" | "upcoming" | "closing";
type FilterSector = "all" | string;

interface FundingDashboardProps {
  searchQuery?: string;
}

export function FundingDashboard({ searchQuery = "" }: FundingDashboardProps) {
  const [localSearch, setLocalSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [filterSector, setFilterSector] = useState<FilterSector>("all");
  const [sortBy, setSortBy] = useState<"amount" | "name" | "deadline">("amount");

  const effectiveSearch = searchQuery || localSearch;

  const filteredPrograms = useMemo(() => {
    let filtered = fundingPrograms.filter(program => {
      const matchesSearch = effectiveSearch === "" || 
        program.name.toLowerCase().includes(effectiveSearch.toLowerCase()) ||
        program.sector.toLowerCase().includes(effectiveSearch.toLowerCase()) ||
        program.eligibility.toLowerCase().includes(effectiveSearch.toLowerCase()) ||
        program.description?.toLowerCase().includes(effectiveSearch.toLowerCase());
      
      const matchesStatus = filterStatus === "all" || program.status === filterStatus;
      const matchesSector = filterSector === "all" || program.sector === filterSector;
      
      return matchesSearch && matchesStatus && matchesSector;
    });

    filtered.sort((a, b) => {
      switch (sortBy) {
        case "amount":
          const aAmount = parseFloat(a.amount.replace(/[^0-9.]/g, ""));
          const bAmount = parseFloat(b.amount.replace(/[^0-9.]/g, ""));
          return bAmount - aAmount;
        case "name":
          return a.name.localeCompare(b.name);
        case "deadline":
          return (a.deadline || "").localeCompare(b.deadline || "");
        default:
          return 0;
      }
    });

    return filtered;
  }, [effectiveSearch, filterStatus, filterSector, sortBy]);

  const totalBudget = budgetAllocations.reduce((sum, b) => sum + b.amount, 0);
  const activePrograms = fundingPrograms.filter(p => p.status === "active").length;
  const totalPrograms = fundingPrograms.length;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active":
        return <CheckCircle2 className="w-4 h-4 text-accent-emerald" />;
      case "upcoming":
        return <Clock className="w-4 h-4 text-blue-500" />;
      case "closing":
        return <AlertCircle className="w-4 h-4 text-amber-500" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-accent-emerald/10 text-accent-emerald border-accent-emerald/20";
      case "upcoming":
        return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      case "closing":
        return "bg-amber-500/10 text-amber-500 border-amber-500/20";
      default:
        return "";
    }
  };

  const uniqueSectors = Array.from(new Set(fundingPrograms.map(p => p.sector)));

  return (
    <div className="space-y-6">
      {/* Enhanced Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/25">
              <DollarSign className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-display text-2xl font-bold text-foreground">Funding & Budgets</h2>
              <p className="text-sm text-muted-foreground">
                {filteredPrograms.length} {filteredPrograms.length === 1 ? "program" : "programs"} available
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <DollarSign className="w-4 h-4 text-amber-500" />
            <span className="text-sm font-medium text-amber-500">Budget Data</span>
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Download className="w-4 h-4" />
                  <span className="hidden sm:inline">Export</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Export funding data</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Key Metrics - Enhanced */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card-intelligence p-6 group hover:shadow-lg transition-all"
        >
          <div className="flex items-center justify-between mb-3">
            <DollarSign className="w-8 h-8 text-amber-500" />
            <Badge variant="secondary" className="text-xs">Total</Badge>
          </div>
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
          className="card-intelligence p-6 group hover:shadow-lg transition-all"
        >
          <div className="flex items-center justify-between mb-3">
            <Award className="w-8 h-8 text-accent-emerald" />
            <Badge variant="secondary" className="text-xs">Active</Badge>
          </div>
          <h4 className="font-semibold text-foreground mb-2">Active Programs</h4>
          <p className="text-3xl font-bold text-foreground">{activePrograms}</p>
          <p className="text-xs text-muted-foreground mt-1">Currently accepting applications</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="card-intelligence p-6 group hover:shadow-lg transition-all"
        >
          <div className="flex items-center justify-between mb-3">
            <TrendingUp className="w-8 h-8 text-blue-500" />
            <Badge variant="secondary" className="text-xs">Growth</Badge>
          </div>
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
          className="card-intelligence p-6 group hover:shadow-lg transition-all"
        >
          <div className="flex items-center justify-between mb-3">
            <Calendar className="w-8 h-8 text-purple-500" />
            <Badge variant="secondary" className="text-xs">Current</Badge>
          </div>
          <h4 className="font-semibold text-foreground mb-2">Financial Year</h4>
          <p className="text-3xl font-bold text-foreground">2024-25</p>
          <p className="text-xs text-muted-foreground mt-1">Current period</p>
        </motion.div>
      </div>

      {/* Budget Allocations - Enhanced */}
      <div className="card-intelligence p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-lg font-semibold text-foreground">
            Budget Allocations by Sector
          </h3>
          <Badge variant="secondary" className="text-xs">
            {budgetAllocations.length} sectors
          </Badge>
        </div>
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
                  className="group space-y-2 p-4 rounded-xl bg-muted/30 border border-border/50 hover:border-border hover:shadow-sm transition-all cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn("w-3 h-3 rounded-full", allocation.color)} />
                      <div>
                        <span className="font-medium text-foreground">{allocation.sector}</span>
                        <span className="text-xs text-muted-foreground ml-2">
                          ({allocation.programs} programs)
                        </span>
                      </div>
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
                      <span className="font-bold text-foreground text-lg">
                        ${(allocation.amount / 1000).toFixed(1)}B
                      </span>
                    </div>
                  </div>
                  <div className="h-3 w-full bg-muted rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${percentage}%` }}
                      transition={{ delay: index * 0.1 + 0.2, duration: 0.5 }}
                      className={cn("h-full rounded-full", allocation.color || "bg-amber-500")}
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{percentage.toFixed(1)}% of total budget</span>
                    <span>{allocation.programs} active programs</span>
                  </div>
                </motion.div>
              );
            })}
        </div>
      </div>

      {/* Filters and Search */}
      <div className="card-intelligence p-4">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search funding programs..."
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as FilterStatus)}>
            <SelectTrigger className="w-full lg:w-[180px]">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="upcoming">Upcoming</SelectItem>
              <SelectItem value="closing">Closing Soon</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterSector} onValueChange={(v) => setFilterSector(v as FilterSector)}>
            <SelectTrigger className="w-full lg:w-[180px]">
              <SelectValue placeholder="All Sectors" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sectors</SelectItem>
              {uniqueSectors.map(sector => (
                <SelectItem key={sector} value={sector}>{sector}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
            <SelectTrigger className="w-full lg:w-[180px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="amount">Amount</SelectItem>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="deadline">Deadline</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Funding Programs - Enhanced */}
      <div className="card-intelligence p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-accent-emerald" />
            <h3 className="font-display text-lg font-semibold text-foreground">
              Available Funding Programs
            </h3>
          </div>
          <Badge variant="secondary" className="text-xs">
            {filteredPrograms.length} programs
          </Badge>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AnimatePresence>
            {filteredPrograms.map((program, index) => (
              <motion.div
                key={program.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: index * 0.05 }}
                className="group p-5 rounded-xl bg-muted/50 border border-border/50 hover:border-accent-emerald/30 hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-foreground">{program.name}</h4>
                      {getStatusIcon(program.status)}
                    </div>
                    <Badge variant="outline" className="text-xs mb-2">
                      {program.sector}
                    </Badge>
                    {program.description && (
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                        {program.description}
                      </p>
                    )}
                  </div>
                  <span
                    className={cn(
                      "px-3 py-1 rounded-full text-xs font-medium border flex items-center gap-1.5",
                      getStatusColor(program.status)
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
                  {program.deadline && (
                    <div>
                      <p className="text-sm font-medium text-foreground">{program.deadline}</p>
                      <p className="text-xs text-muted-foreground">Deadline</p>
                    </div>
                  )}
                </div>
                <div className="pt-3 border-t border-border/50">
                  <div className="flex items-start gap-2 mb-3">
                    <Info className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">Eligibility:</span> {program.eligibility}
                    </p>
                  </div>
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary" className="text-[10px]">
                      {program.year}
                    </Badge>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <Bookmark className="w-4 h-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Save program</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <ExternalLink className="w-4 h-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>View details</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {filteredPrograms.length === 0 && (
            <div className="col-span-2 text-center py-12">
              <p className="text-muted-foreground mb-4">No funding programs found matching your filters.</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setFilterStatus("all");
                  setFilterSector("all");
                  setLocalSearch("");
                }}
              >
                Clear all filters
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
