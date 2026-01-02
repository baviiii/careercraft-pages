import { useState, useMemo, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { IntelligenceProvider, useIntelligence } from "@/contexts/IntelligenceContext";
import { UnifiedLayout } from "@/components/layout/UnifiedLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useJobCounts } from "@/hooks/useJobCounts";
import { CareerDetailModal } from "@/components/careers/CareerDetailModal";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Compass,
  MapPin,
  Calendar,
  Users,
  TrendingUp,
  TrendingDown,
  Building2,
  GraduationCap,
  Briefcase,
  Heart,
  Zap,
  Factory,
  Cpu,
  Leaf,
  ChevronRight,
  ArrowUpRight,
  Filter,
  Sparkles,
  MessageSquare,
  Target,
  BookOpen,
  Award,
  X,
  AlertCircle,
  Wrench,
  ExternalLink,
  FileText,
  Search,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Info,
  Globe,
  Building,
  Phone,
  Mail,
  Clock,
  Star,
  Shield,
  DollarSign,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================================================
// SECTOR CONFIGURATION
// ============================================================================

const sectorIcons: Record<string, any> = {
  health: Heart,
  healthcare: Heart,
  social: Heart,
  "aged care": Heart,
  disability: Heart,
  construction: Factory,
  building: Factory,
  infrastructure: Factory,
  technology: Cpu,
  ict: Cpu,
  digital: Cpu,
  cyber: Cpu,
  energy: Zap,
  clean: Zap,
  renewable: Zap,
  mining: Zap,
  education: GraduationCap,
  training: GraduationCap,
  defence: Building2,
  aerospace: Building2,
  space: Building2,
  agriculture: Leaf,
  food: Leaf,
  wine: Leaf,
  retail: Briefcase,
  hospitality: Briefcase,
  tourism: Briefcase,
  manufacturing: Factory,
  engineering: Factory,
  finance: DollarSign,
  government: Building,
  public: Building,
  default: Briefcase,
};

const sectorColors: Record<string, { text: string; bg: string; border: string }> = {
  health: { text: "text-rose-400", bg: "from-rose-500/25 to-pink-500/20", border: "border-rose-400/40" },
  healthcare: { text: "text-rose-400", bg: "from-rose-500/25 to-pink-500/20", border: "border-rose-400/40" },
  construction: { text: "text-amber-400", bg: "from-amber-500/25 to-orange-500/20", border: "border-amber-400/40" },
  technology: { text: "text-blue-400", bg: "from-blue-500/25 to-indigo-500/20", border: "border-blue-400/40" },
  energy: { text: "text-emerald-400", bg: "from-emerald-500/25 to-teal-500/20", border: "border-emerald-400/40" },
  education: { text: "text-purple-400", bg: "from-purple-500/25 to-violet-500/20", border: "border-purple-400/40" },
  defence: { text: "text-slate-400", bg: "from-slate-500/25 to-gray-500/20", border: "border-slate-400/40" },
  agriculture: { text: "text-lime-400", bg: "from-lime-500/25 to-green-500/20", border: "border-lime-400/40" },
  hospitality: { text: "text-orange-400", bg: "from-orange-500/25 to-amber-500/20", border: "border-orange-400/40" },
  manufacturing: { text: "text-cyan-400", bg: "from-cyan-500/25 to-sky-500/20", border: "border-cyan-400/40" },
  government: { text: "text-indigo-400", bg: "from-indigo-500/25 to-blue-500/20", border: "border-indigo-400/40" },
  default: { text: "text-slate-400", bg: "from-slate-500/25 to-gray-500/20", border: "border-slate-400/40" },
};

// ============================================================================
// SA REGIONS
// ============================================================================

const regions = [
  { id: "all", name: "All SA Regions", description: "Statewide opportunities" },
  { id: "adelaide", name: "Adelaide Metro", description: "Greater Adelaide area" },
  { id: "barossa", name: "Barossa Valley", description: "Wine & tourism hub" },
  { id: "fleurieu", name: "Fleurieu Peninsula", description: "Coastal & agriculture" },
  { id: "limestone", name: "Limestone Coast", description: "Forestry & agriculture" },
  { id: "riverland", name: "Riverland", description: "Horticulture & food" },
  { id: "yorke", name: "Yorke Peninsula", description: "Mining & agriculture" },
  { id: "eyre", name: "Eyre Peninsula", description: "Aquaculture & grain" },
  { id: "whyalla", name: "Whyalla & Upper Spencer", description: "Steel & renewables" },
  { id: "murraylands", name: "Murray & Mallee", description: "River communities" },
];

// ============================================================================
// TARGET AUDIENCES
// ============================================================================

const audiences = [
  { 
    id: "graduates", 
    name: "Recent Graduates", 
    icon: GraduationCap,
    description: "Entry-level positions, graduate programs",
    filter: (career: any) => career.demand === "high" || (career.salary && parseInt(career.salary.replace(/\D/g, '')) < 75000)
  },
  { 
    id: "migrants", 
    name: "Skilled Migrants", 
    icon: Users,
    description: "Visa-sponsored, skills recognition",
    filter: (career: any) => career.demand === "high" && (career.jobs || 0) > 50
  },
  { 
    id: "switchers", 
    name: "Career Changers", 
    icon: Compass,
    description: "Transferable skills, retraining",
    filter: (career: any) => career.demand !== "low" && (career.growth || 0) > 0
  },
  { 
    id: "returners", 
    name: "Workforce Returners", 
    icon: Briefcase,
    description: "Flexible roles, part-time options",
    filter: (career: any) => (career.growth || 0) > 0
  },
];

// ============================================================================
// JOB SEARCH RESOURCES - From SA Government PDFs
// ============================================================================

const jobSearchResources = [
  {
    name: "I WORK FOR SA",
    url: "https://iworkfor.sa.gov.au",
    description: "Official SA Government jobs portal - all public sector vacancies",
    type: "Government Portal",
    icon: Building,
    priority: 1,
  },
  {
    name: "SEEK",
    url: "https://www.seek.com.au/jobs/in-South-Australia",
    description: "Australia's largest job board with SA listings",
    type: "Job Board",
    icon: Search,
    priority: 2,
  },
  {
    name: "Indeed Australia",
    url: "https://au.indeed.com/jobs?l=South+Australia",
    description: "Wide range of jobs across all industries",
    type: "Job Board",
    icon: Globe,
    priority: 3,
  },
  {
    name: "LinkedIn Jobs",
    url: "https://www.linkedin.com/jobs/south-australia-jobs",
    description: "Professional networking and job listings",
    type: "Professional Network",
    icon: Users,
    priority: 4,
  },
  {
    name: "Workforce Australia",
    url: "https://www.workforceaustralia.gov.au",
    description: "Federal government employment services",
    type: "Government Service",
    icon: Shield,
    priority: 5,
  },
  {
    name: "TAFE SA Jobs Board",
    url: "https://www.tafesa.edu.au",
    description: "Training pathways and apprenticeships",
    type: "Training & Education",
    icon: GraduationCap,
    priority: 6,
  },
];

// ============================================================================
// APPLICATION TIPS - From SA Government PDFs
// ============================================================================

const applicationTips = [
  {
    title: "Tailor Your Resume",
    description: "Address selection criteria directly. Use the job ad language and demonstrate relevant experience.",
    icon: FileText,
  },
  {
    title: "Research the Organisation",
    description: "Understand the department's strategic priorities and how your role contributes to them.",
    icon: Search,
  },
  {
    title: "Prepare STAR Responses",
    description: "Situation, Task, Action, Result - structure your interview answers using this framework.",
    icon: Star,
  },
  {
    title: "Check Eligibility",
    description: "Some government roles require citizenship, security clearances, or specific qualifications.",
    icon: Shield,
  },
];

// ============================================================================
// LOADING STATE COMPONENT
// ============================================================================

interface LoadingStage {
  id: string;
  label: string;
  status: "pending" | "loading" | "complete" | "error";
  detail?: string;
}

function ProgressiveLoader({ 
  stages, 
  onRetry 
}: { 
  stages: LoadingStage[];
  onRetry?: () => void;
}) {
  const completedCount = stages.filter(s => s.status === "complete").length;
  const hasError = stages.some(s => s.status === "error");
  const progress = (completedCount / stages.length) * 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center min-h-[60vh] p-8"
    >
      <div className="rounded-2xl border border-pink-400/40 bg-gradient-to-br from-pink-500/20 via-purple-500/15 to-blue-500/20 backdrop-blur-xl shadow-xl shadow-pink-500/20 relative overflow-hidden max-w-lg w-full p-8">
        {/* Animated background orbs */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-pink-400/20 to-purple-400/20 rounded-full blur-2xl animate-pulse" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-br from-blue-400/20 to-indigo-400/20 rounded-full blur-xl animate-pulse" style={{ animationDelay: "500ms" }} />
        
        <div className="relative z-10">
          {/* Header */}
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="p-3 rounded-full bg-gradient-to-br from-pink-500/40 to-purple-500/40 backdrop-blur-sm border border-pink-400/50">
              <Sparkles className="w-6 h-6 text-white animate-pulse" />
            </div>
            <div className="text-center">
              <h2 className="text-xl font-bold text-white">Loading Career Intelligence</h2>
              <p className="text-sm text-pink-200">Analyzing 54 government documents...</p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mb-6">
            <div className="flex justify-between text-xs text-pink-200 mb-2">
              <span>{completedCount} of {stages.length} stages complete</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="h-2 bg-pink-900/30 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>

          {/* Stage list */}
          <div className="space-y-3">
            {stages.map((stage, i) => (
              <motion.div
                key={stage.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg transition-all",
                  stage.status === "loading" && "bg-pink-500/10 border border-pink-400/30",
                  stage.status === "complete" && "bg-emerald-500/10 border border-emerald-400/30",
                  stage.status === "error" && "bg-red-500/10 border border-red-400/30",
                  stage.status === "pending" && "bg-slate-500/10 border border-slate-400/20"
                )}
              >
                <div className="flex-shrink-0">
                  {stage.status === "loading" && (
                    <Loader2 className="w-5 h-5 text-pink-400 animate-spin" />
                  )}
                  {stage.status === "complete" && (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  )}
                  {stage.status === "error" && (
                    <AlertCircle className="w-5 h-5 text-red-400" />
                  )}
                  {stage.status === "pending" && (
                    <Clock className="w-5 h-5 text-slate-500" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    "text-sm font-medium",
                    stage.status === "loading" && "text-pink-100",
                    stage.status === "complete" && "text-emerald-100",
                    stage.status === "error" && "text-red-100",
                    stage.status === "pending" && "text-slate-400"
                  )}>
                    {stage.label}
                  </p>
                  {stage.detail && (
                    <p className="text-xs text-slate-400 truncate">{stage.detail}</p>
                  )}
                </div>
              </motion.div>
            ))}
          </div>

          {/* Error state with retry */}
          {hasError && onRetry && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-6 flex flex-col items-center gap-3"
            >
              <p className="text-sm text-red-300 text-center">
                Some data couldn't be loaded. You can still browse available careers.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={onRetry}
                className="gap-2 border-pink-400/40 bg-pink-500/10 hover:bg-pink-500/20"
              >
                <RefreshCw className="w-4 h-4" />
                Retry Loading
              </Button>
            </motion.div>
          )}

          {/* Tip while loading */}
          {!hasError && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
              className="mt-6 p-3 rounded-lg bg-blue-500/10 border border-blue-400/30"
            >
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-blue-200">
                  <strong>Tip:</strong> Data is extracted from SA Budget Papers, Workforce Strategies, 
                  and Jobs & Skills Reports. Results are updated as each document is processed.
                </p>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ============================================================================
// JOB SEARCH PANEL COMPONENT
// ============================================================================

function JobSearchPanel({ sector }: { sector?: string }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-emerald-500/40 bg-gradient-to-br from-emerald-500/15 via-teal-500/10 to-cyan-500/15 backdrop-blur-xl shadow-lg overflow-hidden"
    >
      {/* Header - always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-5 flex items-center justify-between hover:bg-emerald-500/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500/40 to-teal-500/40 backdrop-blur-sm border border-emerald-400/50">
            <Search className="w-5 h-5 text-white" />
          </div>
          <div className="text-left">
            <h3 className="text-lg font-bold text-white">Where to Find Jobs</h3>
            <p className="text-sm text-emerald-200">
              {sector ? `${sector} opportunities` : "Top SA job platforms"}
            </p>
          </div>
        </div>
        <ChevronRight className={cn(
          "w-5 h-5 text-emerald-300 transition-transform",
          isExpanded && "rotate-90"
        )} />
      </button>

      {/* Expandable content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 space-y-4">
              {/* Job portals */}
              <div className="grid gap-2">
                {jobSearchResources.map((resource) => (
                  <a
                    key={resource.name}
                    href={resource.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 rounded-xl border border-emerald-400/30 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 hover:from-emerald-500/20 hover:to-teal-500/20 hover:border-emerald-400/50 transition-all group"
                  >
                    <div className="p-2 rounded-lg bg-emerald-500/20 backdrop-blur-sm">
                      <resource.icon className="w-4 h-4 text-emerald-300" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-white group-hover:text-emerald-200 transition-colors">
                        {resource.name}
                      </p>
                      <p className="text-xs text-emerald-200/70 truncate">
                        {resource.description}
                      </p>
                    </div>
                    <Badge className="text-xs bg-emerald-500/20 text-emerald-300 border-emerald-400/30">
                      {resource.type}
                    </Badge>
                    <ExternalLink className="w-4 h-4 text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </a>
                ))}
              </div>

              {/* Application tips */}
              <div className="pt-4 border-t border-emerald-400/20">
                <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-300" />
                  Application Tips from SA Government
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  {applicationTips.map((tip) => (
                    <div
                      key={tip.title}
                      className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-400/20"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <tip.icon className="w-3.5 h-3.5 text-emerald-400" />
                        <p className="text-xs font-semibold text-emerald-200">{tip.title}</p>
                      </div>
                      <p className="text-xs text-emerald-300/70">{tip.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ============================================================================
// CAREER CARD COMPONENT
// ============================================================================

function CareerCard({ 
  career, 
  onClick 
}: { 
  career: any;
  onClick?: (career: any) => void;
}) {
  const demandColors = {
    high: "bg-emerald-500/20 text-emerald-300 border-emerald-400/40",
    medium: "bg-amber-500/20 text-amber-300 border-amber-400/40",
    low: "bg-slate-500/20 text-slate-300 border-slate-400/40",
  };

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onClick?.(career)}
      className="p-4 rounded-xl border border-pink-400/30 bg-gradient-to-r from-pink-500/15 via-purple-500/10 to-pink-500/15 hover:border-pink-400/50 hover:from-pink-500/25 hover:via-purple-500/20 hover:to-pink-500/25 transition-all group cursor-pointer backdrop-blur-sm shadow-md hover:shadow-lg hover:shadow-pink-500/20"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-white group-hover:text-pink-200 transition-colors line-clamp-1">
            {career.occupation}
          </p>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            {career.jobs > 0 && (
              <span className="flex items-center gap-1 text-xs text-pink-200">
                <Briefcase className="w-3 h-3" />
                {career.jobs.toLocaleString()} positions
              </span>
            )}
            {career.growth !== undefined && career.growth !== null && (
              <span className={cn(
                "flex items-center gap-1 text-xs",
                career.growth > 0 ? "text-emerald-300" : career.growth < 0 ? "text-red-300" : "text-slate-300"
              )}>
                {career.growth > 0 ? (
                  <>
                    <TrendingUp className="w-3 h-3" />
                    +{career.growth}% growth
                  </>
                ) : career.growth < 0 ? (
                  <>
                    <TrendingDown className="w-3 h-3" />
                    {career.growth}% decline
                  </>
                ) : (
                  <>
                    {career.growth}% growth
                  </>
                )}
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            {career.demand && (
              <Badge className={cn("text-xs", demandColors[career.demand as keyof typeof demandColors] || demandColors.medium)}>
                {career.demand} demand
              </Badge>
            )}
            {career.salary && (
              <span className="text-xs text-emerald-300 font-medium">
                {career.salary}
              </span>
            )}
            {career.location && (
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {career.location}
              </span>
            )}
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-pink-300 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
      </div>
    </motion.div>
  );
}

// ============================================================================
// SECTOR CARD COMPONENT
// ============================================================================

function SectorCard({
  sector,
  isSelected,
  onClick,
  getJobCount,
  getJobUrl,
  navigate,
}: {
  sector: any;
  isSelected: boolean;
  onClick: () => void;
  getJobCount: (sector: string) => number;
  getJobUrl: (sector: string) => string;
  navigate: (url: string) => void;
}) {
  const Icon = sector.icon || Briefcase;
  const colors = sector.colors || sectorColors.default;
  const isGrowing = parseFloat(sector.growth) > 0;

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <div
        className={cn(
          "cursor-pointer transition-all duration-300 group relative overflow-hidden rounded-2xl backdrop-blur-xl border shadow-lg h-full",
          isSelected
            ? "border-pink-400/60 bg-gradient-to-br from-pink-500/25 via-purple-500/20 to-blue-500/25 ring-2 ring-pink-400/40 shadow-xl shadow-pink-500/30"
            : "border-pink-500/30 bg-gradient-to-br from-pink-500/15 via-purple-500/10 to-blue-500/15 hover:border-pink-400/50 hover:shadow-xl hover:shadow-pink-500/20"
        )}
        onClick={onClick}
      >
        <div className="p-5 relative z-10">
          <div className="flex items-start justify-between mb-4">
            <div className={cn(
              "w-12 h-12 rounded-xl flex items-center justify-center shadow-lg transition-all backdrop-blur-sm border",
              isSelected
                ? "bg-gradient-to-br from-pink-500 via-purple-500 to-blue-500 text-white scale-105 border-pink-400/50 shadow-pink-500/30"
                : "bg-gradient-to-br from-pink-500/40 via-purple-500/40 to-blue-500/40 group-hover:scale-105 border-pink-400/30"
            )}>
              <Icon className="w-6 h-6 text-white" />
            </div>
            {sector.growth && (
              <Badge
                className={cn(
                  "text-xs font-semibold backdrop-blur-sm",
                  isGrowing
                    ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                    : "bg-red-500/20 text-red-400 border-red-500/30"
                )}
              >
                {isGrowing ? (
                  <TrendingUp className="w-3 h-3 mr-1" />
                ) : (
                  <TrendingDown className="w-3 h-3 mr-1" />
                )}
                {sector.growth}
              </Badge>
            )}
          </div>
          
          <h3 className="font-bold text-white mb-2 text-lg line-clamp-1">{sector.name}</h3>
          
          <div className="flex items-center gap-2 mb-3">
            <Briefcase className="w-4 h-4 text-pink-200" />
            <p className="text-sm font-semibold text-white">
              {(sector.jobs || 0).toLocaleString()}
            </p>
            <p className="text-sm text-pink-200">positions</p>
          </div>

          {/* Live Job Counts from AustralianJobs */}
          {(() => {
            const liveJobCount = getJobCount(sector.name);
            const jobUrl = getJobUrl(sector.name);
            if (liveJobCount > 0) {
              return (
                <div 
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(jobUrl);
                  }}
                  className="mt-2 mb-3 p-2 rounded-lg bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border border-emerald-400/30 hover:from-emerald-500/30 hover:to-teal-500/30 transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Zap className="w-3.5 h-3.5 text-emerald-300" />
                      <span className="text-xs font-semibold text-emerald-200">
                        {liveJobCount.toLocaleString()} jobs available today
                      </span>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-emerald-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              );
            }
            return null;
          })()}

          {sector.careers && sector.careers.length > 0 && (
            <div className="pt-3 border-t border-pink-400/30 flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5 text-pink-300" />
              <span className="text-xs text-pink-100">
                {sector.careers.length} career paths tracked
              </span>
            </div>
          )}

          <ChevronRight className={cn(
            "w-5 h-5 absolute bottom-5 right-5 text-pink-300 transition-all",
            isSelected ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0"
          )} />
        </div>
      </div>
    </motion.div>
  );
}

// ============================================================================
// MAIN CONTENT COMPONENT
// ============================================================================

function CareerExplorerContent() {
  const navigate = useNavigate();
  const [selectedSector, setSelectedSector] = useState<string | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<string>("all");
  const [selectedTimeframe, setSelectedTimeframe] = useState("now");
  const [selectedAudience, setSelectedAudience] = useState<string | null>(null);
  const [selectedCareer, setSelectedCareer] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Connect to Intelligence System - RAG Data
  const { 
    careerOpportunities: intelligenceCareers, 
    skillsDemand: intelligenceSkills, 
    globalLoading,
    // Add any refresh/retry functions if available
  } = useIntelligence();

  // Loading stages for progressive UI
  const [loadingStages, setLoadingStages] = useState<LoadingStage[]>([
    { id: "init", label: "Initializing RAG engine", status: "pending" },
    { id: "careers", label: "Extracting career data", status: "pending" },
    { id: "skills", label: "Analyzing skills demand", status: "pending" },
    { id: "sectors", label: "Building sector intelligence", status: "pending" },
  ]);

  // Simulate progressive loading based on data availability
  useEffect(() => {
    if (globalLoading) {
      // Start loading animation
      setLoadingStages(prev => prev.map((stage, i) => ({
        ...stage,
        status: i === 0 ? "loading" : "pending"
      })));

      // Progress through stages
      const timers = [
        setTimeout(() => setLoadingStages(prev => prev.map((s, i) => 
          i === 0 ? { ...s, status: "complete" } : 
          i === 1 ? { ...s, status: "loading", detail: "Processing workforce documents..." } : s
        )), 500),
        setTimeout(() => setLoadingStages(prev => prev.map((s, i) => 
          i <= 1 ? { ...s, status: "complete" } : 
          i === 2 ? { ...s, status: "loading", detail: "Identifying high-demand skills..." } : s
        )), 1500),
        setTimeout(() => setLoadingStages(prev => prev.map((s, i) => 
          i <= 2 ? { ...s, status: "complete" } : 
          i === 3 ? { ...s, status: "loading", detail: "Mapping industry sectors..." } : s
        )), 2500),
      ];

      return () => timers.forEach(clearTimeout);
    } else {
      // Mark all complete when done
      setLoadingStages(prev => prev.map(s => ({ ...s, status: "complete" })));
    }
  }, [globalLoading]);

  // Check data availability
  const hasData = intelligenceCareers.length > 0;
  const isPartialData = intelligenceCareers.length > 0 && intelligenceCareers.length < 10;
  
  // Debug logging
  useEffect(() => {
    console.log("[CareerExplorer] Data check:", {
      globalLoading,
      hasData,
      careersCount: intelligenceCareers.length,
      sampleCareers: intelligenceCareers.slice(0, 3).map(c => c.occupation),
    });
  }, [globalLoading, hasData, intelligenceCareers.length]);

  // Generate sectors dynamically from RAG career data
  const dynamicSectors = useMemo(() => {
    if (!hasData) return [];

    const sectorMap = new Map<string, {
      id: string;
      name: string;
      icon: any;
      colors: typeof sectorColors.default;
      jobs: number;
      careers: typeof intelligenceCareers;
      growth: string;
    }>();

    intelligenceCareers.forEach(career => {
      const sectorName = career.sector || "Other";
      const sectorKey = sectorName.toLowerCase().replace(/[^a-z0-9]/g, '');
      
      if (!sectorMap.has(sectorKey)) {
        // Find matching icon
        const iconKey = Object.keys(sectorIcons).find(key => 
          sectorKey.includes(key) || sectorName.toLowerCase().includes(key)
        ) || 'default';
        
        // Find matching colors
        const colorKey = Object.keys(sectorColors).find(key => 
          sectorKey.includes(key) || sectorName.toLowerCase().includes(key)
        ) || 'default';

        sectorMap.set(sectorKey, {
          id: sectorKey,
          name: sectorName,
          icon: sectorIcons[iconKey] || sectorIcons.default,
          colors: sectorColors[colorKey] || sectorColors.default,
          jobs: 0,
          careers: [],
          growth: "+0%",
        });
      }

      const sector = sectorMap.get(sectorKey)!;
      sector.jobs += career.jobs || 0;
      sector.careers.push(career);
    });

    // Calculate average growth per sector
    return Array.from(sectorMap.values())
      .map(sector => {
        const avgGrowth = sector.careers.length > 0 
          ? sector.careers.reduce((sum, c) => sum + (c.growth || 0), 0) / sector.careers.length
          : 0;
        return {
          ...sector,
          growth: avgGrowth >= 0 ? `+${Math.round(avgGrowth)}%` : `${Math.round(avgGrowth)}%`,
        };
      })
      .sort((a, b) => b.jobs - a.jobs);
  }, [intelligenceCareers, hasData]);

  // Fetch live job counts from AustralianJobs API
  const sectorNames = useMemo(() => dynamicSectors.map(s => s.name), [dynamicSectors]);
  const { getJobCount, getJobUrl, loading: jobsLoading } = useJobCounts(sectorNames);

  // Filter careers based on ALL active filters
  const filteredCareers = useMemo(() => {
    if (!hasData) return [];
    
    let filtered = [...intelligenceCareers];

    // Filter by audience
    if (selectedAudience) {
      const audienceConfig = audiences.find(a => a.id === selectedAudience);
      if (audienceConfig?.filter) {
        filtered = filtered.filter(audienceConfig.filter);
      }
    }

    // Filter by region
    if (selectedRegion && selectedRegion !== "all") {
      filtered = filtered.filter(career =>
        career.location?.toLowerCase().includes(selectedRegion) ||
        // Regional sector biases based on SA economic profiles
        (selectedRegion === "barossa" && career.sector?.toLowerCase().includes("agriculture")) ||
        (selectedRegion === "barossa" && career.sector?.toLowerCase().includes("hospitality")) ||
        (selectedRegion === "whyalla" && career.sector?.toLowerCase().includes("manufacturing")) ||
        (selectedRegion === "whyalla" && career.sector?.toLowerCase().includes("energy")) ||
        (selectedRegion === "adelaide" && true) // Adelaide has all sectors
      );
    }

    // Filter by timeframe
    if (selectedTimeframe === "future") {
      filtered = filtered.filter(career => (career.growth || 0) > 5);
    }

    return filtered;
  }, [intelligenceCareers, selectedAudience, selectedRegion, selectedTimeframe, hasData]);

  // Update sectors with filtered data
  const filteredSectors = useMemo(() => {
    return dynamicSectors.map(sector => {
      const sectorCareers = filteredCareers.filter(c =>
        c.sector?.toLowerCase() === sector.name.toLowerCase() ||
      c.sector?.toLowerCase().includes(sector.name.toLowerCase().split(' ')[0]) ||
      sector.name.toLowerCase().includes(c.sector?.toLowerCase() || '')
    );
    const totalJobs = sectorCareers.reduce((sum, c) => sum + (c.jobs || 0), 0);

    return {
      ...sector,
        jobs: totalJobs,
        careers: sectorCareers,
    };
    }).filter(s => s.careers.length > 0 || s.jobs > 0);
  }, [dynamicSectors, filteredCareers]);

  const currentSector = filteredSectors.find(s => s.id === selectedSector);
  const currentRegion = regions.find(r => r.id === selectedRegion);

  // Retry handler
  const handleRetry = useCallback(() => {
    window.location.reload();
  }, []);

  // Clear filters
  const clearFilters = useCallback(() => {
    setSelectedAudience(null);
    setSelectedRegion("all");
    setSelectedTimeframe("now");
    setSelectedSector(null);
  }, []);

  const hasActiveFilters = selectedAudience || selectedRegion !== "all" || selectedTimeframe !== "now";

  // ============================================================================
  // LOADING STATE
  // ============================================================================
  
  if (globalLoading) {
    return (
      <UnifiedLayout title="Career Explorer">
        <ProgressiveLoader stages={loadingStages} onRetry={handleRetry} />
      </UnifiedLayout>
    );
  }

  // ============================================================================
  // NO DATA STATE - Production honesty
  // ============================================================================

  if (!hasData) {
    return (
      <UnifiedLayout title="Career Explorer">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center min-h-[60vh] p-8"
        >
          <div className="rounded-2xl border border-pink-400/40 bg-gradient-to-br from-pink-500/20 via-purple-500/15 to-blue-500/20 backdrop-blur-xl shadow-xl shadow-pink-500/20 relative overflow-hidden max-w-2xl w-full p-8">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-pink-400/20 to-purple-400/20 rounded-full blur-2xl opacity-50 animate-pulse" />
            <div className="relative z-10">
              <div className="text-center mb-6">
                <div className="inline-flex p-4 rounded-full bg-gradient-to-br from-pink-500/30 via-purple-500/30 to-blue-500/30 border border-pink-400/50 backdrop-blur-sm mb-4 shadow-lg shadow-pink-500/20">
                  <AlertCircle className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2 drop-shadow-lg">No Career Data Available</h2>
                <p className="text-pink-100 leading-relaxed max-w-md mx-auto">
                  The RAG intelligence system hasn't extracted structured career data from the knowledge base.
                </p>
              </div>
              <div className="rounded-xl border border-pink-400/30 bg-gradient-to-r from-pink-500/10 via-purple-500/5 to-blue-500/10 backdrop-blur-sm p-4 mb-6">
                <p className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                  <Info className="w-4 h-4 text-pink-300" />
                  This could mean:
                </p>
                <ul className="text-sm text-pink-100 space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="text-pink-300 mt-0.5">•</span>
                    <span>No workforce documents with occupation tables uploaded to RAG</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-pink-300 mt-0.5">•</span>
                    <span>Documents lack required columns (occupation, growth%, jobs)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-pink-300 mt-0.5">•</span>
                    <span>Extraction succeeded but validation found no production-grade data</span>
                  </li>
                </ul>
              </div>
              
              {/* Job search alternatives */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                  <Search className="w-4 h-4 text-pink-300" />
                  Meanwhile, explore live job platforms:
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {jobSearchResources.slice(0, 3).map((resource) => (
                    <a
                      key={resource.name}
                      href={resource.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 p-3 rounded-lg bg-gradient-to-r from-pink-500/15 via-purple-500/10 to-blue-500/15 hover:from-pink-500/25 hover:via-purple-500/20 hover:to-blue-500/25 border border-pink-400/30 hover:border-pink-400/50 transition-all group backdrop-blur-sm"
                    >
                      <resource.icon className="w-4 h-4 text-pink-300 flex-shrink-0" />
                      <span className="text-sm text-white group-hover:text-pink-100 flex-1">{resource.name}</span>
                      <ExternalLink className="w-3 h-3 text-pink-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </a>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button
                  onClick={handleRetry}
                  className="gap-2 border-pink-400/50 bg-gradient-to-r from-pink-500/20 to-purple-500/20 hover:from-pink-500/30 hover:to-purple-500/30 text-white backdrop-blur-sm shadow-md shadow-pink-500/20"
                >
                  <RefreshCw className="w-4 h-4" />
                  Retry Extraction
                </Button>
                <Button
                  onClick={() => navigate('/sa-career-hub')}
                  className="gap-2 border-purple-400/50 bg-gradient-to-r from-purple-500/20 to-blue-500/20 hover:from-purple-500/30 hover:to-blue-500/30 text-white backdrop-blur-sm shadow-md shadow-purple-500/20"
                >
                  <MessageSquare className="w-4 h-4" />
                  Ask AI Career Coach
                </Button>
              </div>

              {/* Production note */}
              <div className="mt-6 pt-4 border-t border-pink-400/20 text-center">
                <p className="text-xs text-pink-200/70">
                  Production intelligence system - only displays data extracted from real government documents
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </UnifiedLayout>
    );
  }

  // ============================================================================
  // MAIN CONTENT
  // ============================================================================

  return (
    <UnifiedLayout
      title="Career Explorer"
      subtitle={`${intelligenceCareers.length} careers from ${dynamicSectors.length} sectors`}
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="space-y-8"
      >
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-pink-500/40 via-purple-500/40 to-blue-500/40 backdrop-blur-sm border border-pink-400/50 shadow-lg shadow-pink-500/20">
                <Compass className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="font-display text-4xl font-bold text-white">
                  Career Explorer
                </h1>
                <p className="text-sm text-slate-300 flex items-center gap-2 mt-1">
                  <span className="font-semibold text-purple-400">{filteredCareers.length}</span>
                  <span>opportunities</span>
                  {intelligenceCareers.length !== filteredCareers.length && (
                    <span className="text-slate-500">
                      (from {intelligenceCareers.length} total)
                    </span>
                  )}
                  <Sparkles className="w-3.5 h-3.5 text-purple-400 ml-1" />
                  <span className="font-medium text-purple-400">RAG Powered</span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-2 glass-card border-white/20 bg-white/5 hover:bg-purple-500/20 hover:border-purple-500/50 backdrop-blur-sm"
                onClick={() => window.open('/career-coach', '_blank')}
              >
                <MessageSquare className="w-4 h-4 text-purple-400" />
                <span className="text-white">AI Career Coach</span>
              </Button>
            </div>
          </div>
          
          {/* Partial data notice */}
          {isPartialData && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="mt-4 p-3 rounded-lg bg-amber-500/10 border border-amber-400/30"
            >
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-amber-400" />
                <p className="text-sm text-amber-200">
                  <strong>Loading more data...</strong> Currently showing {intelligenceCareers.length} careers. 
                  More results will appear as documents are processed.
                </p>
              </div>
            </motion.div>
          )}
        </motion.div>

        {/* Job Search Panel - Always visible */}
        <JobSearchPanel sector={currentSector?.name} />

        {/* Filters Bar */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="relative p-5 rounded-2xl border border-pink-500/30 bg-gradient-to-br from-pink-500/15 via-purple-500/10 to-blue-500/15 backdrop-blur-xl shadow-lg shadow-pink-500/10 overflow-hidden">
            <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-pink-400/20 to-purple-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            <div className="relative z-10 space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-white">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-pink-500/40 to-purple-500/40 backdrop-blur-sm border border-pink-400/50 shadow-md">
                    <Filter className="w-4 h-4 text-white" />
                  </div>
                  <span>Filters</span>
                </div>
                
                <Select value={selectedRegion} onValueChange={setSelectedRegion}>
                  <SelectTrigger className="w-52">
                    <MapPin className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Select region" />
                  </SelectTrigger>
                  <SelectContent>
                    {regions.map(region => (
                      <SelectItem key={region.id} value={region.id}>
                        <div className="flex flex-col">
                          <span>{region.name}</span>
                          <span className="text-xs text-slate-400">{region.description}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Select value={selectedTimeframe} onValueChange={setSelectedTimeframe}>
                  <SelectTrigger className="w-40">
                    <Calendar className="w-4 h-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="past">Historical Data</SelectItem>
                    <SelectItem value="now">Current Demand</SelectItem>
                    <SelectItem value="future">Future Growth (5yr)</SelectItem>
                  </SelectContent>
                </Select>

                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                    className="gap-2 ml-auto text-pink-300 hover:text-white hover:bg-pink-500/20"
                  >
                    <X className="w-3.5 h-3.5" />
                    Clear All Filters
                  </Button>
                )}
              </div>

              {/* Audience filter */}
              <div>
                <p className="text-xs text-slate-400 mb-2">Target Audience</p>
                <div className="flex flex-wrap gap-2">
                  {audiences.map(audience => (
                    <Button
                      key={audience.id}
                      variant={selectedAudience === audience.id ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedAudience(
                        selectedAudience === audience.id ? null : audience.id
                      )}
                      className={cn(
                        "gap-2 backdrop-blur-sm",
                        selectedAudience === audience.id
                          ? "bg-purple-500/20 text-purple-300 border-purple-500/50 hover:bg-purple-500/30"
                          : "glass-card border-white/20 bg-white/5 text-white hover:bg-purple-500/10 hover:border-purple-500/30"
                      )}
                      title={audience.description}
                    >
                      <audience.icon className="w-3.5 h-3.5" />
                      <span>{audience.name}</span>
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Sector Grid */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-2xl font-display font-bold text-white">Industry Sectors</h2>
              <p className="text-sm text-slate-400">
                {filteredSectors.length} sectors from SA Government workforce data
              </p>
            </div>
            <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 backdrop-blur-sm">
              <TrendingUp className="w-3 h-3 mr-1.5" />
              <span className="font-semibold">
                {filteredSectors.filter(s => parseFloat(s.growth) > 0).length}
              </span>
              <span className="text-slate-300 ml-1">Growing</span>
            </Badge>
          </div>

          {filteredSectors.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {filteredSectors.map((sector, index) => (
                <motion.div
                  key={sector.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <SectorCard
                    sector={sector}
                    isSelected={selectedSector === sector.id}
                    onClick={() => setSelectedSector(
                      selectedSector === sector.id ? null : sector.id
                    )}
                    getJobCount={getJobCount}
                    getJobUrl={getJobUrl}
                    navigate={navigate}
                  />
                </motion.div>
              ))}
                        </div>
          ) : (
            <div className="p-8 rounded-xl border border-pink-400/30 bg-pink-500/10 text-center">
              <AlertCircle className="w-8 h-8 text-pink-400 mx-auto mb-3" />
              <p className="text-white font-medium">No sectors match your filters</p>
              <p className="text-sm text-pink-200 mt-1">Try adjusting your region or audience selection</p>
              <Button
                          variant="outline"
                size="sm"
                onClick={clearFilters}
                className="mt-4 gap-2"
              >
                <X className="w-3.5 h-3.5" />
                Clear Filters
              </Button>
                        </div>
                      )}
        </motion.div>

        {/* Selected Sector Details */}
        <AnimatePresence>
          {currentSector && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="grid grid-cols-1 lg:grid-cols-3 gap-6"
            >
              {/* Main content */}
              <div className="lg:col-span-2 rounded-2xl border border-pink-500/40 bg-gradient-to-br from-pink-500/20 via-purple-500/15 to-blue-500/20 backdrop-blur-xl relative overflow-hidden shadow-xl shadow-pink-500/20">
                <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-pink-400/30 to-purple-500/25 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-blue-400/20 to-purple-500/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
                
                <div className="p-6 relative z-10">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2.5 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 text-white shadow-lg">
                      <currentSector.icon className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xl font-display font-bold text-white">{currentSector.name}</div>
                      <div className="text-sm font-normal text-slate-400 flex items-center gap-1.5 mt-1">
                        <MapPin className="w-3.5 h-3.5" />
                        {currentRegion?.name || "All SA Regions"}
                        {selectedAudience && (
                          <>
                            <span className="text-slate-500">•</span>
                            <span className="text-slate-300">
                              {audiences.find(a => a.id === selectedAudience)?.name}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                
                  <div className="space-y-5">
                  {/* Key Metrics */}
                  <div className="grid grid-cols-3 gap-4">
                      <div className="p-4 rounded-xl border border-pink-400/40 bg-gradient-to-br from-pink-500/25 via-rose-500/20 to-pink-400/25 backdrop-blur-sm shadow-lg">
                        <p className="text-3xl font-bold text-pink-100">
                        {currentSector.jobs.toLocaleString()}
                      </p>
                        <p className="text-xs text-pink-200 font-medium mt-1">Total Positions</p>
                    </div>
                      <div className="p-4 rounded-xl border border-emerald-400/40 bg-gradient-to-br from-emerald-500/25 via-teal-500/20 to-emerald-400/25 backdrop-blur-sm shadow-lg">
                        <p className="text-3xl font-bold text-emerald-100">
                        {currentSector.growth}
                      </p>
                        <p className="text-xs text-emerald-200 font-medium mt-1">Avg Growth</p>
                    </div>
                      <div className="p-4 rounded-xl border border-blue-400/40 bg-gradient-to-br from-blue-500/25 via-indigo-500/20 to-blue-400/25 backdrop-blur-sm shadow-lg">
                        <p className="text-3xl font-bold text-blue-100">
                          {currentSector.careers.length}
                        </p>
                        <p className="text-xs text-blue-200 font-medium mt-1">Career Paths</p>
                    </div>
                  </div>

                    {/* Career list */}
                    {currentSector.careers.length > 0 ? (
                    <div>
                        <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
                          <Target className="w-4 h-4 text-pink-300" />
                          Career Opportunities
                          <Badge className="ml-auto text-xs bg-pink-500/30 text-pink-100 border-pink-400/50">
                            {currentSector.careers.length} found
                                    </Badge>
                        </h4>
                        <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                          {currentSector.careers.map((career, i) => (
                            <CareerCard 
                              key={i} 
                              career={career}
                              onClick={(career) => {
                                setSelectedCareer(career);
                                setIsModalOpen(true);
                              }}
                            />
                        ))}
                      </div>
                    </div>
                    ) : (
                      <div className="p-6 rounded-xl border border-pink-400/30 bg-pink-500/10 text-center">
                        <p className="text-sm text-pink-100">
                          No careers found for the current filters. Try adjusting your search.
                        </p>
                      </div>
                    )}

                    {/* Skills in demand */}
                  <div>
                      <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-blue-300" />
                        Skills in Demand
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {intelligenceSkills
                          .filter(skill => 
                            currentSector.careers?.some(c =>
                              c.occupation?.toLowerCase().includes(skill.name?.toLowerCase() || '') ||
                          skill.name?.toLowerCase().includes(currentSector.name.toLowerCase().split(' ')[0])
                            )
                          )
                          .slice(0, 10)
                        .map((skill, i) => (
                            <Badge 
                              key={i} 
                              className="bg-gradient-to-r from-blue-500/30 to-indigo-500/30 text-blue-100 border-blue-400/50 hover:from-blue-500/40 hover:to-indigo-500/40 transition-all cursor-pointer"
                            >
                            {skill.name}
                              {skill.demand && (
                                <span className="ml-1 text-blue-300">• {skill.demand}</span>
                              )}
                          </Badge>
                        ))}
                        {intelligenceSkills.length === 0 && (
                          <p className="text-sm text-slate-400">Skills data loading...</p>
                      )}
                    </div>
                  </div>
                  </div>
                </div>
              </div>

              {/* Actions panel */}
              <div className="rounded-2xl border border-pink-500/40 bg-gradient-to-br from-pink-500/20 via-purple-500/15 to-blue-500/20 backdrop-blur-xl shadow-xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-32 h-32 bg-gradient-to-br from-purple-400/20 to-pink-400/20 rounded-full blur-2xl" />
                <div className="p-6 relative z-10">
                  <div className="flex items-center gap-2 mb-5">
                    <div className="p-2 rounded-lg bg-gradient-to-br from-pink-500/40 to-purple-500/40 backdrop-blur-sm">
                      <Sparkles className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="text-lg font-semibold text-white">Quick Actions</h3>
                  </div>
                  
                  <div className="space-y-3">
                  <Button
                    variant="outline"
                      className="w-full justify-between group rounded-xl border-pink-400/40 bg-gradient-to-r from-pink-500/20 to-purple-500/20 hover:from-pink-500/30 hover:to-purple-500/30 hover:border-pink-300/60"
                    onClick={() => window.open(`/career-coach?sector=${currentSector.name}`, '_blank')}
                  >
                    <div className="text-left flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-pink-200" />
                      <div>
                          <p className="font-semibold text-white">Ask AI Coach</p>
                          <p className="text-xs text-pink-100">Career guidance</p>
                      </div>
                    </div>
                      <ArrowUpRight className="w-4 h-4 text-pink-200 opacity-50 group-hover:opacity-100" />
                  </Button>

                    <a
                      href="https://iworkfor.sa.gov.au"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block"
                    >
                  <Button
                    variant="outline"
                        className="w-full justify-between group rounded-xl border-emerald-400/40 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 hover:from-emerald-500/30 hover:to-teal-500/30 hover:border-emerald-300/60"
                  >
                    <div className="text-left flex items-center gap-2">
                          <Building className="w-4 h-4 text-emerald-200" />
                      <div>
                            <p className="font-semibold text-white">I Work for SA</p>
                            <p className="text-xs text-emerald-100">Government jobs</p>
                      </div>
                    </div>
                        <ExternalLink className="w-4 h-4 text-emerald-200 opacity-50 group-hover:opacity-100" />
                  </Button>
                    </a>

                    <a
                      href="https://www.tafesa.edu.au"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block"
                    >
                  <Button
                    variant="outline"
                        className="w-full justify-between group rounded-xl border-blue-400/40 bg-gradient-to-r from-blue-500/20 to-indigo-500/20 hover:from-blue-500/30 hover:to-indigo-500/30 hover:border-blue-300/60"
                  >
                    <div className="text-left flex items-center gap-2">
                          <GraduationCap className="w-4 h-4 text-blue-200" />
                      <div>
                            <p className="font-semibold text-white">TAFE SA Courses</p>
                            <p className="text-xs text-blue-100">Training programs</p>
                      </div>
                    </div>
                        <ExternalLink className="w-4 h-4 text-blue-200 opacity-50 group-hover:opacity-100" />
                  </Button>
                    </a>

                    <a
                      href={`https://www.seek.com.au/jobs?keywords=${encodeURIComponent(currentSector.name)}&where=South+Australia`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block"
                    >
                  <Button
                    variant="outline"
                        className="w-full justify-between group rounded-xl border-amber-400/40 bg-gradient-to-r from-amber-500/20 to-orange-500/20 hover:from-amber-500/30 hover:to-orange-500/30 hover:border-amber-300/60"
                  >
                    <div className="text-left flex items-center gap-2">
                          <Search className="w-4 h-4 text-amber-200" />
                      <div>
                            <p className="font-semibold text-white">Search SEEK</p>
                            <p className="text-xs text-amber-100">{currentSector.name} jobs</p>
                      </div>
                    </div>
                        <ExternalLink className="w-4 h-4 text-amber-200 opacity-50 group-hover:opacity-100" />
                  </Button>
                    </a>
                  </div>

                  {/* Data source info */}
                  <div className="mt-6 p-3 rounded-lg bg-slate-500/10 border border-slate-400/20">
                    <div className="flex items-start gap-2">
                      <Info className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-slate-300">
                        Data sourced from SA Budget Papers, Workforce Strategy Reports, 
                        and Jobs & Skills Commission documents.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer info */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-center text-sm text-slate-400 py-4"
        >
          <p>
            Career intelligence powered by RAG analysis of {intelligenceCareers.length} occupations 
            across {dynamicSectors.length} sectors from 54 SA Government documents.
          </p>
      </motion.div>

      {/* Career Detail Modal */}
      <CareerDetailModal
        career={selectedCareer}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedCareer(null);
        }}
      />
      </motion.div>
    </UnifiedLayout>
  );
}

// ============================================================================
// EXPORT
// ============================================================================

export default function CareerExplorer() {
  return (
    <IntelligenceProvider>
      <CareerExplorerContent />
    </IntelligenceProvider>
  );
}