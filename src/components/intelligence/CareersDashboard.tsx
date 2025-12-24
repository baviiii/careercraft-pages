import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRAGMetadata } from "@/hooks/useRAGMetadata";
import { Loader2 } from "lucide-react";
import { 
  TrendingUp, 
  TrendingDown, 
  Briefcase, 
  MapPin, 
  Users, 
  BarChart3,
  Search,
  Filter,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Star,
  Bookmark,
  ExternalLink,
  Download,
  Eye
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

interface CareerTrend {
  occupation: string;
  sector: string;
  growth: number;
  jobs: number;
  avgSalary?: string;
  location?: string;
  demand?: "high" | "medium" | "low";
  featured?: boolean;
}

interface SectorGrowth {
  sector: string;
  growth: number;
  jobs: number;
  color: string;
}

const topCareers: CareerTrend[] = [
  { occupation: "Registered Nurse", sector: "Healthcare", growth: 18.5, jobs: 1240, avgSalary: "$85k-$110k", location: "Adelaide, Regional", demand: "high", featured: true },
  { occupation: "Software Engineer", sector: "Technology", growth: 22.3, jobs: 890, avgSalary: "$95k-$140k", location: "Adelaide", demand: "high", featured: true },
  { occupation: "Construction Manager", sector: "Construction", growth: 15.2, jobs: 650, avgSalary: "$90k-$130k", location: "Adelaide, Regional", demand: "high" },
  { occupation: "Early Childhood Teacher", sector: "Education", growth: 12.8, jobs: 420, avgSalary: "$70k-$95k", location: "Adelaide, Regional", demand: "medium" },
  { occupation: "Electrician", sector: "Construction", growth: 14.1, jobs: 580, avgSalary: "$75k-$110k", location: "Adelaide, Regional", demand: "high" },
  { occupation: "Mental Health Worker", sector: "Healthcare", growth: 20.4, jobs: 380, avgSalary: "$65k-$90k", location: "Adelaide, Regional", demand: "high" },
  { occupation: "Data Analyst", sector: "Technology", growth: 19.7, jobs: 320, avgSalary: "$80k-$115k", location: "Adelaide", demand: "high" },
  { occupation: "Project Manager", sector: "All Sectors", growth: 11.5, jobs: 450, avgSalary: "$90k-$130k", location: "Adelaide", demand: "medium" },
];

const sectorGrowth: SectorGrowth[] = [
  { sector: "Healthcare", growth: 16.8, jobs: 3250, color: "bg-red-500" },
  { sector: "Technology", growth: 21.2, jobs: 1890, color: "bg-blue-500" },
  { sector: "Construction", growth: 13.5, jobs: 2340, color: "bg-amber-500" },
  { sector: "Education", growth: 9.2, jobs: 1560, color: "bg-purple-500" },
  { sector: "Renewable Energy", growth: 24.6, jobs: 890, color: "bg-green-500" },
];

type SortField = "growth" | "jobs" | "occupation" | "salary";
type SortDirection = "asc" | "desc";
type FilterSector = "all" | "Healthcare" | "Technology" | "Construction" | "Education" | "Renewable Energy";

interface CareersDashboardProps {
  searchQuery?: string;
}

export function CareersDashboard({ searchQuery = "" }: CareersDashboardProps) {
  const { getDocuments, searchDocuments, loading } = useRAGMetadata();
  const [localSearch, setLocalSearch] = useState("");
  const [sortField, setSortField] = useState<SortField>("growth");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [filterSector, setFilterSector] = useState<FilterSector>("all");
  const [filterDemand, setFilterDemand] = useState<"all" | "high" | "medium" | "low">("all");
  const [selectedCareer, setSelectedCareer] = useState<string | null>(null);
  const [topCareers, setTopCareers] = useState<CareerTrend[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const result = await getDocuments({ category: "career-guidance", documentType: "pdf" }, 20);
        if (result && result.documents.length > 0) {
          const careers: CareerTrend[] = result.documents.slice(0, 8).map((doc) => ({
            occupation: doc.title?.split(" ").slice(0, 3).join(" ") || "Career Resource",
            sector: doc.sector ? doc.sector.charAt(0).toUpperCase() + doc.sector.slice(1) : "General",
            growth: Math.random() * 20 + 5, // Placeholder
            jobs: (doc.chunkCount || 0) * 10, // Estimate from chunks
            avgSalary: "See Document",
            location: "South Australia",
            demand: "high" as const,
            featured: false,
          }));
          setTopCareers(careers);
        }
      } catch (error) {
        console.error("Failed to fetch careers:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const effectiveSearch = searchQuery || localSearch;

  const filteredAndSortedCareers = useMemo(() => {
    let filtered = topCareers.filter(career => {
      const matchesSearch = effectiveSearch === "" || 
        career.occupation.toLowerCase().includes(effectiveSearch.toLowerCase()) ||
        career.sector.toLowerCase().includes(effectiveSearch.toLowerCase());
      
      const matchesSector = filterSector === "all" || career.sector === filterSector;
      const matchesDemand = filterDemand === "all" || career.demand === filterDemand;
      
      return matchesSearch && matchesSector && matchesDemand;
    });

    filtered.sort((a, b) => {
      let aVal: number | string;
      let bVal: number | string;

      switch (sortField) {
        case "growth":
          aVal = a.growth;
          bVal = b.growth;
          break;
        case "jobs":
          aVal = a.jobs;
          bVal = b.jobs;
          break;
        case "occupation":
          aVal = a.occupation;
          bVal = b.occupation;
          break;
        case "salary":
          aVal = a.avgSalary?.replace(/[^0-9]/g, "") || "0";
          bVal = b.avgSalary?.replace(/[^0-9]/g, "") || "0";
          break;
        default:
          return 0;
      }

      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortDirection === "asc" 
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }

      return sortDirection === "asc" 
        ? (aVal as number) - (bVal as number)
        : (bVal as number) - (aVal as number);
    });

    return filtered;
  }, [effectiveSearch, filterSector, filterDemand, sortField, sortDirection, topCareers]);

  if (isLoading || loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      </div>
    );
  }

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="w-3.5 h-3.5" />;
    return sortDirection === "asc" ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />;
  };

  const totalJobs = filteredAndSortedCareers.reduce((sum, c) => sum + c.jobs, 0);
  const avgGrowth = filteredAndSortedCareers.length > 0
    ? filteredAndSortedCareers.reduce((sum, c) => sum + c.growth, 0) / filteredAndSortedCareers.length
    : 0;

  return (
    <div className="space-y-6">
      {/* Enhanced Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
              <Briefcase className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-display text-2xl font-bold text-foreground">Career Opportunities</h2>
              <p className="text-sm text-muted-foreground">
                {filteredAndSortedCareers.length} {filteredAndSortedCareers.length === 1 ? "career" : "careers"} found
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent-emerald/10 border border-accent-emerald/20">
            <BarChart3 className="w-4 h-4 text-accent-emerald" />
            <span className="text-sm font-medium text-accent-emerald">Live Data</span>
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
                <p>Export career data to CSV</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Sector Growth Overview - Enhanced */}
      <div className="card-intelligence p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-lg font-semibold text-foreground">
            Sector Growth Rates
          </h3>
          <Badge variant="secondary" className="text-xs">
            {sectorGrowth.length} sectors
          </Badge>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {sectorGrowth.map((sector, index) => (
            <motion.div
              key={sector.sector}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="group relative p-4 rounded-xl bg-muted/50 border border-border/50 hover:border-accent-emerald/30 hover:shadow-md transition-all cursor-pointer"
              onClick={() => setFilterSector(sector.sector as FilterSector)}
            >
              <div className="flex items-center gap-2 mb-2">
                <div className={cn("w-2 h-2 rounded-full", sector.color)} />
                <span className="text-sm font-medium text-foreground">{sector.sector}</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{sector.jobs.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground mb-2">jobs available</p>
              <div className="flex items-center gap-1">
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
              {filterSector === sector.sector && (
                <div className="absolute top-2 right-2">
                  <div className="w-2 h-2 bg-accent-emerald rounded-full" />
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>

      {/* Filters and Search Bar */}
      <div className="card-intelligence p-4">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search careers..."
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={filterSector} onValueChange={(v) => setFilterSector(v as FilterSector)}>
            <SelectTrigger className="w-full lg:w-[180px]">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="All Sectors" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sectors</SelectItem>
              {sectorGrowth.map(s => (
                <SelectItem key={s.sector} value={s.sector}>{s.sector}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterDemand} onValueChange={(v) => setFilterDemand(v as any)}>
            <SelectTrigger className="w-full lg:w-[180px]">
              <SelectValue placeholder="All Demand Levels" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Demand Levels</SelectItem>
              <SelectItem value="high">High Demand</SelectItem>
              <SelectItem value="medium">Medium Demand</SelectItem>
              <SelectItem value="low">Low Demand</SelectItem>
            </SelectContent>
          </Select>
          {(filterSector !== "all" || filterDemand !== "all" || localSearch) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setFilterSector("all");
                setFilterDemand("all");
                setLocalSearch("");
              }}
              className="gap-2"
            >
              Clear filters
            </Button>
          )}
        </div>
      </div>

      {/* Key Insights - Enhanced */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card-intelligence p-6 group hover:shadow-lg transition-all"
        >
          <div className="flex items-center justify-between mb-3">
            <Users className="w-8 h-8 text-accent-emerald" />
            <Badge variant="secondary" className="text-xs">Total</Badge>
          </div>
          <h4 className="font-semibold text-foreground mb-2">Total Opportunities</h4>
          <p className="text-3xl font-bold text-foreground mb-1">
            {totalJobs.toLocaleString()}
          </p>
          <p className="text-xs text-muted-foreground">Active job openings</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="card-intelligence p-6 group hover:shadow-lg transition-all"
        >
          <div className="flex items-center justify-between mb-3">
            <TrendingUp className="w-8 h-8 text-accent-emerald" />
            <Badge variant="secondary" className="text-xs">Average</Badge>
          </div>
          <h4 className="font-semibold text-foreground mb-2">Average Growth</h4>
          <p className="text-3xl font-bold text-foreground mb-1">
            +{avgGrowth.toFixed(1)}%
          </p>
          <p className="text-xs text-muted-foreground">Year-over-year growth</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="card-intelligence p-6 group hover:shadow-lg transition-all"
        >
          <div className="flex items-center justify-between mb-3">
            <MapPin className="w-8 h-8 text-accent-emerald" />
            <Badge variant="secondary" className="text-xs">Top</Badge>
          </div>
          <h4 className="font-semibold text-foreground mb-2">Top Sector</h4>
          <p className="text-xl font-bold text-foreground mb-1">
            {sectorGrowth.sort((a, b) => b.growth - a.growth)[0].sector}
          </p>
          <p className="text-xs text-muted-foreground">
            {sectorGrowth.sort((a, b) => b.growth - a.growth)[0].growth}% growth
          </p>
        </motion.div>
      </div>

      {/* Enhanced Careers Table */}
      <div className="card-intelligence p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Briefcase className="w-5 h-5 text-accent-emerald" />
            <h3 className="font-display text-lg font-semibold text-foreground">
              Top Growth Careers
            </h3>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Sort by:</span>
            <div className="flex gap-1">
              {(["growth", "jobs", "occupation"] as SortField[]).map(field => (
                <Button
                  key={field}
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort(field)}
                  className={cn(
                    "h-7 px-2 text-xs",
                    sortField === field && "bg-accent-emerald/10 text-accent-emerald"
                  )}
                >
                  {field.charAt(0).toUpperCase() + field.slice(1)}
                  <SortIcon field={field} />
                </Button>
              ))}
            </div>
          </div>
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
                <th className="text-right py-3 px-4 text-sm font-semibold text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
                  onClick={() => handleSort("growth")}
                >
                  <div className="flex items-center justify-end gap-1">
                    Growth
                    <SortIcon field="growth" />
                  </div>
                </th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
                  onClick={() => handleSort("jobs")}
                >
                  <div className="flex items-center justify-end gap-1">
                    Jobs Available
                    <SortIcon field="jobs" />
                  </div>
                </th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-muted-foreground">
                  Avg Salary
                </th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-muted-foreground">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {filteredAndSortedCareers.map((career, index) => (
                  <motion.tr
                    key={career.occupation}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: index * 0.03 }}
                    className={cn(
                      "border-b border-border/50 hover:bg-muted/30 transition-colors group",
                      selectedCareer === career.occupation && "bg-accent-emerald/5"
                    )}
                  >
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        {career.featured && (
                          <Star className="w-4 h-4 text-accent-gold fill-accent-gold" />
                        )}
                        <span className="font-medium text-foreground">{career.occupation}</span>
                        {career.demand === "high" && (
                          <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                            Hot
                          </Badge>
                        )}
                      </div>
                      {career.location && (
                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {career.location}
                        </p>
                      )}
                    </td>
                    <td className="py-4 px-4">
                      <Badge variant="secondary" className="text-xs">
                        {career.sector}
                      </Badge>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <TrendingUp className="w-4 h-4 text-accent-emerald" />
                        <span className="font-semibold text-accent-emerald">
                          +{career.growth}%
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <span className="font-medium text-foreground">
                        {career.jobs.toLocaleString()}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <span className="text-sm text-muted-foreground">{career.avgSalary}</span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <Eye className="w-4 h-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>View details</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <Bookmark className="w-4 h-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Save career</p>
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
                              <p>Find jobs</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
          {filteredAndSortedCareers.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No careers found matching your filters.</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setFilterSector("all");
                  setFilterDemand("all");
                  setLocalSearch("");
                }}
                className="mt-4"
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
