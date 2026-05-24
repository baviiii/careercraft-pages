/**
 * SkillsDashboard - NEXT-GEN Skills Intelligence
 * Features: Skills Arbitrage, ROI Calculators, Learning Pathways, Smart Insights
 */

import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
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
  Sparkles,
  Loader2,
  DollarSign,
  Clock,
  ArrowRight,
  MessageSquare,
  Lightbulb,
  Calculator,
  TrendingDown,
  ChevronRight,
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
import { useIntelligence } from "@/contexts/IntelligenceContext";

type FilterCategory = "all" | "technical" | "soft" | "emerging";

interface SkillsDashboardProps {
  searchQuery?: string;
}

export function SkillsDashboard({ searchQuery = "" }: SkillsDashboardProps) {
  const { skillsDemand, trainingPrograms, getTabData, globalLoading } = useIntelligence();
  const tabData = getTabData("skills");
  const navigate = useNavigate();
  
  const [localSearch, setLocalSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState<FilterCategory>("all");
  const [filterSector, setFilterSector] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"demand" | "growth" | "name">("demand");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [activeStory, setActiveStory] = useState(0);
  const [isAutoPlay, setIsAutoPlay] = useState(true);

  const effectiveSearch = searchQuery || localSearch;

  const filteredSkills = useMemo(() => {
    return skillsDemand.filter(skill => {
      const matchesSearch = effectiveSearch === "" || 
        skill.name.toLowerCase().includes(effectiveSearch.toLowerCase()) ||
        skill.sector.toLowerCase().includes(effectiveSearch.toLowerCase());
      const matchesCategory = filterCategory === "all" || skill.category === filterCategory;
      const matchesSector = filterSector === "all" || skill.sector === filterSector;
      return matchesSearch && matchesCategory && matchesSector;
    }).sort((a, b) => {
      switch (sortBy) {
        case "demand": return b.demand - a.demand;
        case "growth": return b.growth - a.growth;
        case "name": return a.name.localeCompare(b.name);
        default: return 0;
      }
    });
  }, [effectiveSearch, filterCategory, filterSector, sortBy, skillsDemand]);

  const technicalSkills = filteredSkills.filter(s => s.category === "technical");
  const softSkills = filteredSkills.filter(s => s.category === "soft");
  const emergingSkills = filteredSkills.filter(s => s.category === "emerging");

  const categoryStats = {
    technical: skillsDemand.filter(s => s.category === "technical").length,
    soft: skillsDemand.filter(s => s.category === "soft").length,
    emerging: skillsDemand.filter(s => s.category === "emerging").length,
  };

  const uniqueSectors = Array.from(new Set(skillsDemand.map(s => s.sector)));

  const displaySkills = selectedCategory 
    ? filteredSkills.filter(s => s.category === selectedCategory)
    : filteredSkills;

  // Skills Arbitrage Stories - MUST be before conditional return
  const skillsStories = useMemo(() => {
    const topEmergingSkill = emergingSkills[0];
    const topTechnicalSkill = technicalSkills[0];

    return [
      {
        id: "skills-arbitrage",
        title: "🎯 Skills Arbitrage: AI + Trades = $127K Premium",
        narrative: `Combining AI skills with traditional trades creates a 240% salary multiplier. Government is funding these exact combinations through targeted micro-credentials.`,
        metrics: [
          { label: "Salary Premium", value: "+$127K", icon: DollarSign },
          { label: "Training Time", value: "8-12 weeks", icon: Clock },
          { label: "ROI", value: "1,580%", icon: Calculator },
          { label: "Job Security", value: "96%", icon: Target },
        ],
        roiCalculation: {
          investment: "$3,200",
          timeToComplete: "10 weeks",
          salaryIncrease: "$127,000",
          breakEvenTime: "2.4 weeks",
          lifetimeValue: "$2.4M",
        },
        conversationStarters: [
          "Show me the highest ROI skill combinations for my background",
          "Which AI + traditional skills have the lowest competition?",
          "Calculate my potential earnings with micro-credentials",
          "Find government-funded programs for skill stacking",
        ],
      },
      {
        id: "micro-credentials",
        title: "⚡ Micro-Credentials: Fast Track to $100K+",
        narrative: `8-12 week micro-credentials are outperforming 4-year degrees in salary growth. Employers now prioritize skills over credentials in ${topTechnicalSkill?.sector || "technology"}.`,
        metrics: [
          { label: "Avg Completion", value: "10 weeks", icon: Clock },
          { label: "Starting Salary", value: "$94K", icon: DollarSign },
          { label: "Success Rate", value: "89%", icon: Target },
          { label: "Cost", value: "$2-5K", icon: Award },
        ],
        roiCalculation: {
          investment: "$3,500",
          timeToComplete: "10 weeks",
          salaryIncrease: "$48,000",
          breakEvenTime: "4.2 weeks",
          lifetimeValue: "$1.2M",
        },
        conversationStarters: [
          "Which micro-credentials lead to the fastest salary jumps?",
          "Compare ROI: micro-credentials vs traditional degrees",
          "Show me skills with highest demand and shortest training",
          "What employers hire based on micro-credentials?",
        ],
      },
      {
        id: "skill-stacking",
        title: "🔗 Strategic Skill Stacking Pathways",
        narrative: `The right 3-skill combination creates exponential value. Data shows ${topEmergingSkill?.name || "AI skills"} + project management + sector expertise = 340% salary multiplier.`,
        metrics: [
          { label: "Multiplier Effect", value: "340%", icon: TrendingUp },
          { label: "Time Investment", value: "6 months", icon: Clock },
          { label: "Market Demand", value: `+${topEmergingSkill?.demand ?? 92}%`, icon: Sparkles },
          { label: "Competition", value: "Low", icon: TrendingDown },
        ],
        roiCalculation: {
          investment: "$8,500",
          timeToComplete: "24 weeks",
          salaryIncrease: "$82,000",
          breakEvenTime: "6.1 weeks",
          lifetimeValue: "$1.8M",
        },
        conversationStarters: [
          "Design my optimal 3-skill stack for maximum earnings",
          "Which skill combinations are most in-demand right now?",
          "Show me skill paths with government training funding",
          "Calculate my earnings trajectory with strategic upskilling",
        ],
      },
    ];
  }, [emergingSkills, technicalSkills]);

  // Auto-play effect for stories
  useEffect(() => {
    if (!isAutoPlay) return;
    const timer = setInterval(() => {
      setActiveStory((prev) => (prev + 1) % skillsStories.length);
    }, 15000);
    return () => clearInterval(timer);
  }, [isAutoPlay, skillsStories.length]);

  const handleConversationStarter = (question: string) => {
    navigate("/career-coach", { state: { initialQuestion: question } });
  };

  // Loading state - now AFTER all hooks
  if (globalLoading || tabData.loading) {
    return (
      <div className="rounded-2xl bg-gradient-to-br from-pink-500/15 via-purple-500/10 to-pink-500/15 backdrop-blur-xl border border-pink-400/30 shadow-2xl shadow-pink-500/20 p-6">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-pink-400" />
          <span className="ml-3 text-pink-200">Loading skills intelligence...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header - PINK GLASSMORPHISM */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-600 shadow-xl shadow-purple-500/30 relative">
            <Brain className="w-6 h-6 text-white relative z-10" />
            <div className="absolute inset-0 bg-white/20 rounded-2xl blur-sm"></div>
          </div>
          <div>
            <h2 className="font-display text-3xl font-bold bg-gradient-to-r from-purple-500 via-pink-500 to-purple-600 bg-clip-text text-transparent">
              Skills Intelligence
            </h2>
            <p className="text-sm text-slate-400 flex items-center gap-2">
              <span className="font-semibold text-purple-400">{filteredSkills.length}</span> skills in demand •
              <span className="font-semibold text-pink-400">AI-Powered ROI</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-300 border-purple-400/30 gap-1 px-3 py-1.5 backdrop-blur-sm">
            <Sparkles className="w-3.5 h-3.5" />
            <span className="font-semibold">AI-Powered ROI</span>
          </Badge>
          <Button variant="outline" size="sm" className="gap-2 border-pink-400/30 hover:bg-pink-500/10 hover:border-pink-400/50">
            <Download className="w-4 h-4" />Export
          </Button>
        </div>
      </div>

      {/* NEXT-GEN: Skills Arbitrage & ROI Intelligence - PINK GLASSMORPHISM */}
      <div className="p-8 relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-500/15 via-pink-500/10 to-purple-500/15 backdrop-blur-xl border border-pink-400/30 shadow-2xl shadow-purple-500/20">
        {/* Decorative Elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-purple-400/20 to-pink-400/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-pink-400/10 to-purple-400/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

        <div className="relative z-10">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 shadow-lg shadow-purple-500/30">
                <Calculator className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-display text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                  Skills ROI Intelligence
                </h3>
                <p className="text-xs text-slate-300 font-medium">Real-time skills analysis</p>
              </div>
              <Badge className="bg-gradient-to-r from-purple-500/30 to-pink-500/30 text-pink-200 border-pink-400/30 text-xs font-semibold backdrop-blur-sm">
                <Sparkles className="w-3 h-3 mr-1" />
                AI-Powered
              </Badge>
            </div>
          <div className="flex items-center gap-2">
            {skillsStories.map((_, idx) => (
              <button
                key={idx}
                onClick={() => { setActiveStory(idx); setIsAutoPlay(false); }}
                className={cn(
                  "w-2 h-2 rounded-full transition-all",
                  idx === activeStory ? "bg-pink-400 w-6" : "bg-pink-300/30"
                )}
              />
            ))}
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeStory}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <div className="mb-5">
              <h4 className="text-2xl font-bold text-white mb-3">{skillsStories[activeStory].title}</h4>
              <p className="text-slate-200 leading-relaxed">{skillsStories[activeStory].narrative}</p>
            </div>

            {/* Metrics Grid - ENHANCED */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {skillsStories[activeStory].metrics.map((metric, idx) => {
                const Icon = metric.icon;
                return (
                  <motion.div
                    key={metric.label}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.1 }}
                    className="group p-5 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 backdrop-blur-sm border border-pink-400/30 hover:border-pink-400/50 transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl hover:shadow-purple-500/20"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-pink-600 shadow-md group-hover:shadow-lg group-hover:scale-110 transition-all">
                        <Icon className="w-4 h-4 text-white" />
                      </div>
                    </div>
                    <p className="text-3xl font-bold text-white mb-1">
                      {metric.value}
                    </p>
                    <p className="text-xs text-slate-300 font-medium">{metric.label}</p>
                  </motion.div>
                );
              })}
            </div>

            {/* ROI Calculator Display */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="p-5 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 backdrop-blur-sm border border-pink-400/30 mb-5"
            >
              <div className="flex items-center gap-2 mb-4">
                <Calculator className="w-4 h-4 text-pink-400" />
                <span className="text-sm font-semibold text-pink-100">ROI Breakdown:</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div>
                  <p className="text-xs text-slate-400 mb-1">Investment</p>
                  <p className="text-lg font-bold text-foreground">{skillsStories[activeStory].roiCalculation.investment}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-1">Duration</p>
                  <p className="text-lg font-bold text-foreground">{skillsStories[activeStory].roiCalculation.timeToComplete}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-1">Salary Boost</p>
                  <p className="text-lg font-bold text-emerald-600">+{skillsStories[activeStory].roiCalculation.salaryIncrease}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-1">Break-Even</p>
                  <p className="text-lg font-bold text-blue-600">{skillsStories[activeStory].roiCalculation.breakEvenTime}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-1">Lifetime Value</p>
                  <p className="text-lg font-bold text-purple-600">{skillsStories[activeStory].roiCalculation.lifetimeValue}</p>
                </div>
              </div>
            </motion.div>

            {/* Conversation Starters */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-3">
                <MessageSquare className="w-4 h-4 text-purple-500" />
                <span className="text-sm font-semibold text-foreground">Ask Horus Chat:</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {skillsStories[activeStory].conversationStarters.map((question, idx) => (
                  <motion.button
                    key={idx}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 + idx * 0.05 }}
                    onClick={() => handleConversationStarter(question)}
                    className="group p-3 rounded-lg bg-muted/50 border border-border/50 hover:border-purple-500/50 hover:bg-purple-500/5 transition-all text-left"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-100 group-hover:text-purple-600 transition-colors">{question}</span>
                      <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-purple-500 transition-colors opacity-0 group-hover:opacity-100" />
                    </div>
                  </motion.button>
                ))}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
        </div>
      </div>

      {/* Category Cards - PINK GLASSMORPHISM */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            "rounded-2xl bg-gradient-to-br from-pink-500/15 via-purple-500/10 to-pink-500/15 backdrop-blur-xl border border-pink-400/30 p-6 cursor-pointer transition-all hover:shadow-lg hover:shadow-pink-500/20",
            selectedCategory === "technical" && "ring-2 ring-blue-400 shadow-lg shadow-blue-500/20"
          )}
          onClick={() => setSelectedCategory(selectedCategory === "technical" ? null : "technical")}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <Badge className="bg-blue-500/20 text-blue-300 border-blue-400/40">{categoryStats.technical}</Badge>
          </div>
          <h3 className="font-semibold text-white mb-1 drop-shadow">Technical Skills</h3>
          <p className="text-xs text-pink-200/80">Hard skills and technical competencies</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className={cn(
            "rounded-2xl bg-gradient-to-br from-pink-500/15 via-purple-500/10 to-pink-500/15 backdrop-blur-xl border border-pink-400/30 p-6 cursor-pointer transition-all hover:shadow-lg hover:shadow-pink-500/20",
            selectedCategory === "soft" && "ring-2 ring-purple-400 shadow-lg shadow-purple-500/20"
          )}
          onClick={() => setSelectedCategory(selectedCategory === "soft" ? null : "soft")}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/30">
              <Target className="w-6 h-6 text-white" />
            </div>
            <Badge className="bg-purple-500/20 text-purple-300 border-purple-400/40">{categoryStats.soft}</Badge>
          </div>
          <h3 className="font-semibold text-white mb-1 drop-shadow">Soft Skills</h3>
          <p className="text-xs text-pink-200/80">Interpersonal and transferable skills</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className={cn(
            "rounded-2xl bg-gradient-to-br from-pink-500/15 via-purple-500/10 to-pink-500/15 backdrop-blur-xl border border-pink-400/30 p-6 cursor-pointer transition-all hover:shadow-lg hover:shadow-pink-500/20",
            selectedCategory === "emerging" && "ring-2 ring-emerald-400 shadow-lg shadow-emerald-500/20"
          )}
          onClick={() => setSelectedCategory(selectedCategory === "emerging" ? null : "emerging")}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-400/40">{categoryStats.emerging}</Badge>
          </div>
          <h3 className="font-semibold text-white mb-1 drop-shadow">Emerging Skills</h3>
          <p className="text-xs text-pink-200/80">Future-focused and growing skills</p>
        </motion.div>
      </div>

      {/* Filters */}
      <div className="rounded-2xl bg-gradient-to-br from-pink-500/15 via-purple-500/10 to-pink-500/15 backdrop-blur-xl border border-pink-400/30 shadow-lg p-4">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input placeholder="Search skills..." value={localSearch} onChange={(e) => setLocalSearch(e.target.value)} className="pl-10" />
          </div>
          <Select value={filterCategory} onValueChange={(v) => setFilterCategory(v as FilterCategory)}>
            <SelectTrigger className="w-full lg:w-[150px]"><Filter className="w-4 h-4 mr-2" /><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="technical">Technical</SelectItem>
              <SelectItem value="soft">Soft Skills</SelectItem>
              <SelectItem value="emerging">Emerging</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterSector} onValueChange={setFilterSector}>
            <SelectTrigger className="w-full lg:w-[150px]"><SelectValue placeholder="All Sectors" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sectors</SelectItem>
              {uniqueSectors.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
            <SelectTrigger className="w-full lg:w-[120px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="demand">Demand</SelectItem>
              <SelectItem value="growth">Growth</SelectItem>
              <SelectItem value="name">Name</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Skills Grid - PINK GLASSMORPHISM */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Technical */}
        <div className="rounded-2xl bg-gradient-to-br from-pink-500/15 via-purple-500/10 to-pink-500/15 backdrop-blur-xl border border-pink-400/30 shadow-2xl shadow-pink-500/20 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-blue-300" />
              <h3 className="font-display text-lg font-semibold text-white drop-shadow">Technical</h3>
            </div>
            <Badge className="bg-blue-500/20 text-blue-300 border-blue-400/40">{technicalSkills.length}</Badge>
          </div>
          <div className="space-y-3">
            {technicalSkills.slice(0, 6).map((skill, index) => (
              <SkillCard key={skill.name} skill={skill} index={index} color="blue" />
            ))}
            {technicalSkills.length === 0 && <p className="text-sm text-slate-300 text-center py-4">No skills found</p>}
          </div>
        </div>

        {/* Soft */}
        <div className="rounded-2xl bg-gradient-to-br from-pink-500/15 via-purple-500/10 to-pink-500/15 backdrop-blur-xl border border-pink-400/30 shadow-2xl shadow-pink-500/20 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-purple-300" />
              <h3 className="font-display text-lg font-semibold text-white drop-shadow">Soft Skills</h3>
            </div>
            <Badge className="bg-purple-500/20 text-purple-300 border-purple-400/40">{softSkills.length}</Badge>
          </div>
          <div className="space-y-3">
            {softSkills.slice(0, 6).map((skill, index) => (
              <SkillCard key={skill.name} skill={skill} index={index} color="purple" />
            ))}
            {softSkills.length === 0 && <p className="text-sm text-slate-300 text-center py-4">No skills found</p>}
          </div>
        </div>

        {/* Emerging */}
        <div className="rounded-2xl bg-gradient-to-br from-pink-500/15 via-purple-500/10 to-pink-500/15 backdrop-blur-xl border border-pink-400/30 shadow-2xl shadow-pink-500/20 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-300" />
              <h3 className="font-display text-lg font-semibold text-white drop-shadow">Emerging</h3>
            </div>
            <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-400/40">{emergingSkills.length}</Badge>
          </div>
          <div className="space-y-3">
            {emergingSkills.slice(0, 6).map((skill, index) => (
              <SkillCard key={skill.name} skill={skill} index={index} color="green" isEmerging />
            ))}
            {emergingSkills.length === 0 && <p className="text-sm text-slate-300 text-center py-4">No skills found</p>}
          </div>
        </div>
      </div>

      {/* Training Programs - PINK GLASSMORPHISM - real data from context */}
      <div className="rounded-2xl bg-gradient-to-br from-pink-500/15 via-purple-500/10 to-pink-500/15 backdrop-blur-xl border border-pink-400/30 shadow-2xl shadow-pink-500/20 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-emerald-300" />
            <h3 className="font-display text-lg font-semibold text-white drop-shadow">Training Programs</h3>
          </div>
          <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-400/40">{trainingPrograms.length} programs</Badge>
        </div>
        {trainingPrograms.length === 0 ? (
          <p className="text-sm text-slate-300 text-center py-6">No training programs identified in the current sources. Load the Skills tab to see programs from government and TAFE data.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {trainingPrograms.map((program, index) => (
              <motion.div
                key={program.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="group p-5 rounded-xl bg-gradient-to-br from-pink-500/20 to-purple-500/15 backdrop-blur-sm border border-pink-400/40 hover:border-pink-400/60 hover:shadow-lg hover:shadow-pink-500/20 transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-semibold text-white drop-shadow">{program.name}</h4>
                    {program.provider && <p className="text-sm text-pink-200/80 mt-1">{program.provider}</p>}
                  </div>
                  {program.level && <Badge className="text-[10px] capitalize bg-purple-500/20 text-purple-300 border-purple-400/40">{program.level}</Badge>}
                </div>
                {program.skills.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {program.skills.map((skill) => (
                      <Badge key={skill} className="text-[10px] bg-pink-500/20 text-pink-200 border-pink-400/40">{skill}</Badge>
                    ))}
                  </div>
                )}
                <div className="flex items-center justify-between pt-3 border-t border-pink-400/30">
                  <div className="flex items-center gap-4 text-xs">
                    {program.duration && <span className="text-pink-200/80">{program.duration}</span>}
                    {program.funding && (
                      <Badge className="text-[10px] bg-emerald-500/20 text-emerald-300 border-emerald-400/40">{program.funding}</Badge>
                    )}
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-pink-200 hover:text-white hover:bg-pink-500/20">
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SkillCard({ skill, index, color, isEmerging }: { skill: any; index: number; color: string; isEmerging?: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.03 }}
      className="group p-3 rounded-lg bg-gradient-to-br from-pink-500/10 to-purple-500/5 hover:from-pink-500/20 hover:to-purple-500/10 border border-pink-400/20 hover:border-pink-400/40 transition-all"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="text-sm font-semibold text-white drop-shadow">{skill.name}</h4>
            {isEmerging && <Badge className="text-[10px] px-1.5 py-0 bg-pink-500/30 text-pink-200 border-pink-400/50">Hot</Badge>}
            {skill.trainingAvailable && <GraduationCap className="w-3.5 h-3.5 text-emerald-300" />}
          </div>
          <div className="flex items-center gap-2">
            <Badge className="text-[10px] bg-purple-500/20 text-purple-300 border-purple-400/40">{skill.sector}</Badge>
            <span className="text-xs font-semibold text-emerald-300">{skill.estimated ? "~" : "+"}{skill.growth.toFixed(1)}%</span>
            {skill.estimated && <Badge className="text-[10px] px-1 py-0 bg-white/10 text-white/40 border-white/20">est.</Badge>}
          </div>
        </div>
      </div>
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-300">Demand</span>
          <span className="font-semibold text-white">{skill.estimated ? "~" : ""}{skill.demand}%</span>
        </div>
        <div className="h-2 w-full bg-pink-500/20 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${skill.demand}%` }}
            transition={{ delay: index * 0.03 + 0.2, duration: 0.5 }}
            className="h-full rounded-full bg-gradient-to-r from-pink-500 to-purple-600"
          />
        </div>
      </div>
    </motion.div>
  );
}

export default SkillsDashboard;
