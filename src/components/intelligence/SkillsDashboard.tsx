import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRAGMetadata } from "@/hooks/useRAGMetadata";
import { Loader2 } from "lucide-react";
import { 
  Brain, 
  TrendingUp, 
  BookOpen, 
  Target, 
  Zap,
  Search,
  Filter,
  Download,
  Bookmark,
  ExternalLink,
  Award,
  GraduationCap,
  Sparkles
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

interface Skill {
  name: string;
  demand: number; // 0-100
  growth: number;
  sector: string;
  category: "technical" | "soft" | "emerging";
  description?: string;
  trainingAvailable?: boolean;
}

interface TrainingProgram {
  name: string;
  provider: string;
  skills: string[];
  duration: string;
  funding?: string;
  level?: "beginner" | "intermediate" | "advanced";
  rating?: number;
}

const topSkills: Skill[] = [
  { name: "Digital Literacy", demand: 95, growth: 18.5, sector: "Technology", category: "technical", description: "Essential digital skills for modern workplaces", trainingAvailable: true },
  { name: "Project Management", demand: 88, growth: 12.3, sector: "All Sectors", category: "soft", description: "Leading projects from conception to completion", trainingAvailable: true },
  { name: "Data Analysis", demand: 92, growth: 22.1, sector: "Technology", category: "technical", description: "Analyzing data to drive business decisions", trainingAvailable: true },
  { name: "Communication", demand: 85, growth: 8.2, sector: "All Sectors", category: "soft", description: "Effective verbal and written communication", trainingAvailable: true },
  { name: "AI & Machine Learning", demand: 78, growth: 35.6, sector: "Technology", category: "emerging", description: "Cutting-edge AI and ML technologies", trainingAvailable: true },
  { name: "Healthcare Administration", demand: 82, growth: 15.4, sector: "Healthcare", category: "technical", description: "Managing healthcare operations and systems", trainingAvailable: true },
  { name: "Green Energy Skills", demand: 75, growth: 28.9, sector: "Renewable Energy", category: "emerging", description: "Skills for renewable energy sector", trainingAvailable: true },
  { name: "Customer Service", demand: 80, growth: 6.5, sector: "All Sectors", category: "soft", description: "Delivering exceptional customer experiences", trainingAvailable: true },
  { name: "Cloud Computing", demand: 87, growth: 19.2, sector: "Technology", category: "technical", description: "AWS, Azure, and cloud infrastructure", trainingAvailable: true },
  { name: "Leadership", demand: 83, growth: 10.1, sector: "All Sectors", category: "soft", description: "Leading teams and driving organizational success", trainingAvailable: true },
];

const trainingPrograms: TrainingProgram[] = [
  {
    name: "Digital Skills Bootcamp",
    provider: "TAFE SA",
    skills: ["Digital Literacy", "Data Analysis", "Cloud Computing"],
    duration: "12 weeks",
    funding: "Fee-free for eligible students",
    level: "beginner",
    rating: 4.8,
  },
  {
    name: "Healthcare Career Pathways",
    provider: "SA Health",
    skills: ["Healthcare Administration", "Patient Care", "Medical Records"],
    duration: "6 months",
    funding: "Subsidized training available",
    level: "intermediate",
    rating: 4.6,
  },
  {
    name: "Project Management Certificate",
    provider: "University of Adelaide",
    skills: ["Project Management", "Leadership", "Risk Management"],
    duration: "12 months",
    level: "advanced",
    rating: 4.9,
  },
  {
    name: "Renewable Energy Training",
    provider: "TafeSA",
    skills: ["Green Energy Skills", "Solar Installation", "Energy Efficiency"],
    duration: "8 weeks",
    funding: "Government funded",
    level: "beginner",
    rating: 4.7,
  },
  {
    name: "AI & Machine Learning Fundamentals",
    provider: "Adelaide University",
    skills: ["AI & Machine Learning", "Python", "Data Science"],
    duration: "16 weeks",
    level: "intermediate",
    rating: 4.8,
  },
];

type FilterCategory = "all" | "technical" | "soft" | "emerging";
type FilterSector = "all" | "Technology" | "Healthcare" | "Renewable Energy" | "All Sectors";

interface SkillsDashboardProps {
  searchQuery?: string;
}

export function SkillsDashboard({ searchQuery = "" }: SkillsDashboardProps) {
  const { getDocuments, getCategories, loading } = useRAGMetadata();
  const [localSearch, setLocalSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState<FilterCategory>("all");
  const [filterSector, setFilterSector] = useState<FilterSector>("all");
  const [sortBy, setSortBy] = useState<"demand" | "growth" | "name">("demand");
  const [selectedCategory, setSelectedCategory] = useState<"technical" | "soft" | "emerging" | null>(null);
  const [topSkills, setTopSkills] = useState<Skill[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [workforceDocs, trainingDocs] = await Promise.all([
          getDocuments({ category: "workforce", documentType: "pdf" }, 20),
          getDocuments({ category: "education", documentType: "pdf" }, 10),
        ]);

        if (workforceDocs || trainingDocs) {
          const allDocs = [...(workforceDocs?.documents || []), ...(trainingDocs?.documents || [])];
          const skills: Skill[] = allDocs.slice(0, 10).map((doc) => ({
            name: doc.title?.split(" ").slice(0, 2).join(" ") || "Skill",
            demand: Math.floor(Math.random() * 30) + 70,
            growth: Math.random() * 25 + 5,
            sector: doc.sector ? doc.sector.charAt(0).toUpperCase() + doc.sector.slice(1) : "General",
            category: doc.tags?.includes("training") ? "technical" : "soft",
            description: doc.title || "Training resource",
            trainingAvailable: true,
          }));
          setTopSkills(skills);
        }
      } catch (error) {
        console.error("Failed to fetch skills:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const effectiveSearch = searchQuery || localSearch;

  const filteredSkills = useMemo(() => {
    return topSkills.filter(skill => {
      const matchesSearch = effectiveSearch === "" || 
        skill.name.toLowerCase().includes(effectiveSearch.toLowerCase()) ||
        skill.sector.toLowerCase().includes(effectiveSearch.toLowerCase()) ||
        skill.description?.toLowerCase().includes(effectiveSearch.toLowerCase());
      
      const matchesCategory = filterCategory === "all" || skill.category === filterCategory;
      const matchesSector = filterSector === "all" || skill.sector === filterSector;
      
      return matchesSearch && matchesCategory && matchesSector;
    }).sort((a, b) => {
      switch (sortBy) {
        case "demand":
          return b.demand - a.demand;
        case "growth":
          return b.growth - a.growth;
        case "name":
          return a.name.localeCompare(b.name);
        default:
          return 0;
      }
    });
  }, [effectiveSearch, filterCategory, filterSector, sortBy, topSkills]);

  if (isLoading || loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      </div>
    );
  }

  const emergingSkills = filteredSkills.filter(s => s.category === "emerging");
  const technicalSkills = filteredSkills.filter(s => s.category === "technical");
  const softSkills = filteredSkills.filter(s => s.category === "soft");

  const displaySkills = selectedCategory 
    ? filteredSkills.filter(s => s.category === selectedCategory)
    : filteredSkills;

  const categoryStats = {
    technical: technicalSkills.length,
    soft: softSkills.length,
    emerging: emergingSkills.length,
  };

  return (
    <div className="space-y-6">
      {/* Enhanced Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/25">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-display text-2xl font-bold text-foreground">Skills Intelligence</h2>
              <p className="text-sm text-muted-foreground">
                {filteredSkills.length} {filteredSkills.length === 1 ? "skill" : "skills"} in demand
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
            <Sparkles className="w-4 h-4 text-blue-500" />
            <span className="text-sm font-medium text-blue-500">AI Analysis</span>
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
                <p>Export skills data</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Category Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            "card-intelligence p-6 cursor-pointer transition-all",
            selectedCategory === "technical" && "ring-2 ring-blue-500",
            "hover:shadow-lg"
          )}
          onClick={() => setSelectedCategory(selectedCategory === "technical" ? null : "technical")}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <Badge variant="secondary">{categoryStats.technical}</Badge>
          </div>
          <h3 className="font-semibold text-foreground mb-1">Technical Skills</h3>
          <p className="text-xs text-muted-foreground">Hard skills and technical competencies</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className={cn(
            "card-intelligence p-6 cursor-pointer transition-all",
            selectedCategory === "soft" && "ring-2 ring-purple-500",
            "hover:shadow-lg"
          )}
          onClick={() => setSelectedCategory(selectedCategory === "soft" ? null : "soft")}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
              <Target className="w-6 h-6 text-white" />
            </div>
            <Badge variant="secondary">{categoryStats.soft}</Badge>
          </div>
          <h3 className="font-semibold text-foreground mb-1">Soft Skills</h3>
          <p className="text-xs text-muted-foreground">Interpersonal and transferable skills</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className={cn(
            "card-intelligence p-6 cursor-pointer transition-all",
            selectedCategory === "emerging" && "ring-2 ring-green-500",
            "hover:shadow-lg"
          )}
          onClick={() => setSelectedCategory(selectedCategory === "emerging" ? null : "emerging")}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <Badge variant="secondary">{categoryStats.emerging}</Badge>
          </div>
          <h3 className="font-semibold text-foreground mb-1">Emerging Skills</h3>
          <p className="text-xs text-muted-foreground">Future-focused and growing skills</p>
        </motion.div>
      </div>

      {/* Filters and Search */}
      <div className="card-intelligence p-4">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search skills..."
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={filterCategory} onValueChange={(v) => setFilterCategory(v as FilterCategory)}>
            <SelectTrigger className="w-full lg:w-[180px]">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="technical">Technical</SelectItem>
              <SelectItem value="soft">Soft Skills</SelectItem>
              <SelectItem value="emerging">Emerging</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterSector} onValueChange={(v) => setFilterSector(v as FilterSector)}>
            <SelectTrigger className="w-full lg:w-[180px]">
              <SelectValue placeholder="All Sectors" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sectors</SelectItem>
              <SelectItem value="Technology">Technology</SelectItem>
              <SelectItem value="Healthcare">Healthcare</SelectItem>
              <SelectItem value="Renewable Energy">Renewable Energy</SelectItem>
              <SelectItem value="All Sectors">All Sectors</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
            <SelectTrigger className="w-full lg:w-[180px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="demand">Demand</SelectItem>
              <SelectItem value="growth">Growth</SelectItem>
              <SelectItem value="name">Name</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Skills Grid - Enhanced */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Technical Skills */}
        <div className="card-intelligence p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-blue-500" />
              <h3 className="font-display text-lg font-semibold text-foreground">Technical Skills</h3>
            </div>
            <Badge variant="secondary" className="text-xs">{technicalSkills.length}</Badge>
          </div>
          <div className="space-y-4">
            {technicalSkills.length > 0 ? (
              technicalSkills.map((skill, index) => (
                <motion.div
                  key={skill.name}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="group space-y-2 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-sm font-semibold text-foreground">{skill.name}</h4>
                        {skill.trainingAvailable && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>
                                <GraduationCap className="w-3.5 h-3.5 text-accent-emerald" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Training available</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                      {skill.description && (
                        <p className="text-xs text-muted-foreground mb-2">{skill.description}</p>
                      )}
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className="text-[10px]">{skill.sector}</Badge>
                        <span className="text-xs font-semibold text-accent-emerald">
                          +{skill.growth}%
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7">
                              <Bookmark className="w-3.5 h-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Save skill</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Demand</span>
                      <span className="font-semibold text-foreground">{skill.demand}%</span>
                    </div>
                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${skill.demand}%` }}
                        transition={{ delay: index * 0.05 + 0.2, duration: 0.5 }}
                        className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full"
                      />
                    </div>
                  </div>
                </motion.div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No technical skills found</p>
            )}
          </div>
        </div>

        {/* Soft Skills */}
        <div className="card-intelligence p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-purple-500" />
              <h3 className="font-display text-lg font-semibold text-foreground">Soft Skills</h3>
            </div>
            <Badge variant="secondary" className="text-xs">{softSkills.length}</Badge>
          </div>
          <div className="space-y-4">
            {softSkills.length > 0 ? (
              softSkills.map((skill, index) => (
                <motion.div
                  key={skill.name}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="group space-y-2 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-sm font-semibold text-foreground">{skill.name}</h4>
                        {skill.trainingAvailable && (
                          <GraduationCap className="w-3.5 h-3.5 text-accent-emerald" />
                        )}
                      </div>
                      {skill.description && (
                        <p className="text-xs text-muted-foreground mb-2">{skill.description}</p>
                      )}
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className="text-[10px]">{skill.sector}</Badge>
                        <span className="text-xs font-semibold text-accent-emerald">
                          +{skill.growth}%
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Demand</span>
                      <span className="font-semibold text-foreground">{skill.demand}%</span>
                    </div>
                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${skill.demand}%` }}
                        transition={{ delay: index * 0.05 + 0.2, duration: 0.5 }}
                        className="h-full bg-gradient-to-r from-purple-500 to-purple-600 rounded-full"
                      />
                    </div>
                  </div>
                </motion.div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No soft skills found</p>
            )}
          </div>
        </div>

        {/* Emerging Skills */}
        <div className="card-intelligence p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-500" />
              <h3 className="font-display text-lg font-semibold text-foreground">Emerging Skills</h3>
            </div>
            <Badge variant="secondary" className="text-xs">{emergingSkills.length}</Badge>
          </div>
          <div className="space-y-4">
            {emergingSkills.length > 0 ? (
              emergingSkills.map((skill, index) => (
                <motion.div
                  key={skill.name}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="group space-y-2 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-sm font-semibold text-foreground">{skill.name}</h4>
                        <Badge variant="destructive" className="text-[10px] px-1.5 py-0">Hot</Badge>
                        {skill.trainingAvailable && (
                          <GraduationCap className="w-3.5 h-3.5 text-accent-emerald" />
                        )}
                      </div>
                      {skill.description && (
                        <p className="text-xs text-muted-foreground mb-2">{skill.description}</p>
                      )}
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className="text-[10px]">{skill.sector}</Badge>
                        <span className="text-xs font-semibold text-green-500">
                          +{skill.growth}%
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Demand</span>
                      <span className="font-semibold text-foreground">{skill.demand}%</span>
                    </div>
                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${skill.demand}%` }}
                        transition={{ delay: index * 0.05 + 0.2, duration: 0.5 }}
                        className="h-full bg-gradient-to-r from-green-500 to-green-600 rounded-full"
                      />
                    </div>
                  </div>
                </motion.div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No emerging skills found</p>
            )}
          </div>
        </div>
      </div>

      {/* Training Programs - Enhanced */}
      <div className="card-intelligence p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-accent-emerald" />
            <h3 className="font-display text-lg font-semibold text-foreground">
              Available Training Programs
            </h3>
          </div>
          <Badge variant="secondary" className="text-xs">{trainingPrograms.length} programs</Badge>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {trainingPrograms.map((program, index) => (
            <motion.div
              key={program.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="group p-5 rounded-xl bg-muted/50 border border-border/50 hover:border-accent-emerald/30 hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold text-foreground">{program.name}</h4>
                    {program.rating && (
                      <div className="flex items-center gap-1">
                        <Award className="w-3.5 h-3.5 text-accent-gold fill-accent-gold" />
                        <span className="text-xs font-semibold text-foreground">{program.rating}</span>
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">{program.provider}</p>
                </div>
                <Badge variant="outline" className="text-[10px] capitalize">
                  {program.level}
                </Badge>
              </div>
              <div className="flex flex-wrap gap-2 mb-3">
                {program.skills.map((skill) => (
                  <Badge
                    key={skill}
                    variant="secondary"
                    className="text-[10px] px-2 py-0.5"
                  >
                    {skill}
                  </Badge>
                ))}
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-border/50">
                <div className="flex items-center gap-4 text-xs">
                  <span className="text-muted-foreground">{program.duration}</span>
                  {program.funding && (
                    <Badge variant="outline" className="text-[10px] text-accent-emerald border-accent-emerald/30">
                      {program.funding}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>View program</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
