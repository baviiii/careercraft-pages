import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  TrendingUp,
  TrendingDown,
  Globe,
  Building2,
  Rocket,
  Activity,
  MapPin,
  Star,
  Code2,
  Cloud,
  Wallet,
  Heart,
  Trophy,
  Crown,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  AlertCircle,
  Flame,
  X,
  ChevronRight,
  BarChart3,
  LineChart,
  Target,
  Sparkles,
  Users,
  DollarSign,
  Clock,
  Eye,
  Briefcase,
} from "lucide-react";
import { TrendItem, SkillDemand } from "./types";

interface TrendsTabProps {
  trends: TrendItem[];
  skillDemand: SkillDemand[];
  loading?: boolean;
}

export default function TrendsTab({ trends, skillDemand }: TrendsTabProps) {
  const [selectedTrend, setSelectedTrend] = useState<TrendItem | null>(null);
  const [selectedSkill, setSelectedSkill] = useState<SkillDemand | null>(null);
  const [hoveredStat, setHoveredStat] = useState<number | null>(null);

  // Animated counter effect simulation
  const animatedStats = [
    { label: "Total Jobs", value: "47.2K", change: "+12%", icon: TrendingUp, color: "from-blue-500 to-indigo-600" },
    { label: "Hot Skills", value: "156", change: "+85%", icon: Rocket, color: "from-amber-500 to-orange-600" },
    { label: "Companies", value: "2.8K", change: "+18%", icon: Building2, color: "from-emerald-500 to-teal-600" },
    { label: "Remote %", value: "23%", change: "+8%", icon: Globe, color: "from-purple-500 to-violet-600" },
  ];
  return (
    <div className="space-y-8">
      {/* Hero Stats Banner - Interactive with Glow Effects */}
      <div className="relative overflow-hidden rounded-3xl">
        {/* Animated Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.2),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(139,92,246,0.3),transparent_50%)]" />
        
        {/* Floating Particles Effect */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-10 left-10 w-2 h-2 bg-white/30 rounded-full animate-pulse" />
          <div className="absolute top-20 right-20 w-3 h-3 bg-white/20 rounded-full animate-bounce" style={{ animationDelay: "0.5s" }} />
          <div className="absolute bottom-20 left-1/4 w-2 h-2 bg-white/25 rounded-full animate-pulse" style={{ animationDelay: "1s" }} />
          <div className="absolute top-1/3 right-1/3 w-1.5 h-1.5 bg-white/30 rounded-full animate-bounce" style={{ animationDelay: "1.5s" }} />
        </div>

        <div className="relative z-10 p-6 md:p-8 text-white">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="absolute inset-0 bg-white/30 rounded-2xl blur-xl animate-pulse" />
                <div className="relative p-4 bg-white/20 backdrop-blur-sm rounded-2xl border border-white/30">
                  <Activity className="w-7 h-7" />
                </div>
              </div>
              <div>
                <h2 className="text-2xl md:text-3xl font-bold">Market Pulse</h2>
                <p className="text-white/70 text-sm flex items-center gap-2">
                  <span className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                    Live Data
                  </span>
                  <span>•</span>
                  <span>3-Year Analysis (2023-2025)</span>
                  <span>•</span>
                  <span>Australian Market</span>
                </p>
              </div>
            </div>
            <Badge className="bg-white/20 text-white border-white/30 gap-1.5">
              <BarChart3 className="w-3.5 h-3.5" /> Analytics
            </Badge>
          </div>

          {/* Interactive Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {animatedStats.map((stat, i) => (
              <div
                key={i}
                className={`group relative cursor-pointer transition-all duration-500 ${
                  hoveredStat === i ? "scale-105 z-10" : "hover:scale-102"
                }`}
                onMouseEnter={() => setHoveredStat(i)}
                onMouseLeave={() => setHoveredStat(null)}
              >
                {/* Glow Effect on Hover */}
                <div className={`absolute -inset-1 bg-gradient-to-r ${stat.color} rounded-3xl blur-xl opacity-0 group-hover:opacity-50 transition-opacity duration-500`} />
                
                <div className="relative bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/20 group-hover:bg-white/20 group-hover:border-white/40 transition-all duration-300">
                  <div className="flex items-center justify-between mb-3">
                    <div className={`p-2 rounded-xl bg-gradient-to-br ${stat.color} shadow-lg`}>
                      <stat.icon className="w-4 h-4 text-white" />
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-white/50 group-hover:text-white group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                  </div>
                  <p className="text-3xl md:text-4xl font-bold mb-1 group-hover:scale-105 transition-transform origin-left">
                    {stat.value}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-white/70">{stat.label}</span>
                    <span className="text-xs font-bold text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded-full">
                      {stat.change}
                    </span>
                  </div>
                  
                  {/* Mini Chart Indicator */}
                  <div className="mt-3 flex items-end gap-0.5 h-8">
                    {[40, 55, 45, 70, 60, 80, 75, 90].map((h, idx) => (
                      <div
                        key={idx}
                        className="flex-1 bg-white/30 rounded-t transition-all duration-300 group-hover:bg-white/50"
                        style={{ 
                          height: `${h}%`,
                          transitionDelay: `${idx * 50}ms`
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Trending Topics Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Rising Fast - Blue Theme */}
        <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl" />
          <div className="relative p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg shadow-blue-500/30">
                  <Rocket className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-blue-900 dark:text-blue-100">Rising Fast</h3>
                  <p className="text-xs text-blue-600 dark:text-blue-400">YoY Growth 2023-2025</p>
                </div>
              </div>
              <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20">
                <Flame className="w-3 h-3 mr-1" /> Hot
              </Badge>
            </div>
            <div className="space-y-3">
              {trends
                .filter((t) => t.direction === "up")
                .slice(0, 5)
                .map((trend, i) => (
                  <div
                    key={i}
                    onClick={() => setSelectedTrend(trend)}
                    className="group flex items-center gap-3 p-3 bg-white/60 dark:bg-white/5 backdrop-blur-sm rounded-xl border border-blue-100 dark:border-blue-800/30 hover:bg-white dark:hover:bg-white/10 hover:shadow-lg hover:scale-[1.02] transition-all duration-300 cursor-pointer"
                  >
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm transition-transform group-hover:scale-110 ${
                        i === 0
                          ? "bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-lg shadow-amber-500/30"
                          : i === 1
                          ? "bg-gradient-to-br from-slate-300 to-slate-400 text-white"
                          : i === 2
                          ? "bg-gradient-to-br from-amber-600 to-amber-700 text-white"
                          : "bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300"
                      }`}
                    >
                      {i === 0 ? <Crown className="w-5 h-5" /> : i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors">
                        {trend.topic}
                      </p>
                      <p className="text-xs text-muted-foreground">{trend.volume}</p>
                    </div>
                    <div className="flex items-center gap-1 px-2.5 py-1 bg-emerald-500/10 rounded-lg group-hover:bg-emerald-500/20 transition-colors">
                      <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-sm font-bold text-emerald-600">
                        +{trend.changePercent}%
                      </span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                ))}
            </div>
          </div>
        </Card>

        {/* Declining - Keep rose for contrast */}
        <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-slate-50 to-rose-50 dark:from-slate-950/30 dark:to-rose-950/30">
          <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/10 rounded-full blur-3xl" />
          <div className="relative p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-rose-500 rounded-xl shadow-lg shadow-rose-500/30">
                  <TrendingDown className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-rose-900 dark:text-rose-100">Cooling Down</h3>
                  <p className="text-xs text-rose-600 dark:text-rose-400">Declining since 2023</p>
                </div>
              </div>
              <Badge className="bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20">
                <AlertCircle className="w-3 h-3 mr-1" /> Watch
              </Badge>
            </div>
            <div className="space-y-3">
              {trends
                .filter((t) => t.direction === "down")
                .slice(0, 5)
                .map((trend, i) => (
                  <div
                    key={i}
                    onClick={() => setSelectedTrend(trend)}
                    className="group flex items-center gap-3 p-3 bg-white/60 dark:bg-white/5 backdrop-blur-sm rounded-xl border border-rose-100 dark:border-rose-800/30 hover:bg-white dark:hover:bg-white/10 hover:shadow-lg hover:scale-[1.02] transition-all duration-300 cursor-pointer"
                  >
                    <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-900/50 flex items-center justify-center text-rose-700 dark:text-rose-300 font-bold text-sm transition-transform group-hover:scale-110">
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate group-hover:text-rose-700 dark:group-hover:text-rose-300 transition-colors">
                        {trend.topic}
                      </p>
                      <p className="text-xs text-muted-foreground">{trend.volume}</p>
                    </div>
                    <div className="flex items-center gap-1 px-2.5 py-1 bg-rose-500/10 rounded-lg group-hover:bg-rose-500/20 transition-colors">
                      <ArrowDownRight className="w-3.5 h-3.5 text-rose-600" />
                      <span className="text-sm font-bold text-rose-600">
                        -{Math.abs(trend.changePercent)}%
                      </span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                ))}
              {trends.filter((t) => t.direction === "down").length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-blue-500" />
                  <p className="font-medium">All trends positive!</p>
                  <p className="text-sm">No declining topics right now</p>
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Top Locations - Blue Theme */}
        <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-950/30 dark:to-blue-950/30">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl" />
          <div className="relative p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-xl shadow-lg shadow-indigo-500/30">
                  <MapPin className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-indigo-900 dark:text-indigo-100">Top Locations</h3>
                  <p className="text-xs text-indigo-600 dark:text-indigo-400">Where jobs are</p>
                </div>
              </div>
              <Badge className="bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/20">
                <Globe className="w-3 h-3 mr-1" /> AU
              </Badge>
            </div>
            <div className="space-y-3">
              {trends
                .filter((t) => t.topic.includes("📍"))
                .slice(0, 5)
                .map((trend, i) => (
                  <div
                    key={i}
                    className="group flex items-center gap-3 p-3 bg-white/60 dark:bg-white/5 backdrop-blur-sm rounded-xl border border-indigo-100 dark:border-indigo-800/30 hover:bg-white dark:hover:bg-white/10 hover:shadow-lg transition-all duration-300 cursor-pointer"
                  >
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
                        i === 0
                          ? "bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/30"
                          : "bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300"
                      }`}
                    >
                      {i === 0 ? <Star className="w-5 h-5" /> : i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate group-hover:text-indigo-700 dark:group-hover:text-indigo-300 transition-colors">
                        {trend.topic.replace("📍 ", "")}
                      </p>
                      <p className="text-xs text-muted-foreground">{trend.volume}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-indigo-600">
                        {trend.description.split("%")[0]}%
                      </p>
                      <p className="text-xs text-muted-foreground">of market</p>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </Card>
      </div>

      {/* Skills Demand Section - Blue Theme */}
      <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-blue-50 via-indigo-50 to-blue-50 dark:from-blue-950/30 dark:via-indigo-950/30 dark:to-blue-950/30">
        <div className="absolute top-0 left-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl" />
        <div className="relative p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-lg shadow-blue-500/30">
                <Code2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold bg-gradient-to-r from-blue-700 to-indigo-700 dark:from-blue-300 dark:to-indigo-300 bg-clip-text text-transparent">
                  Skills in Demand
                </h3>
                <p className="text-sm text-muted-foreground">
                  Most requested skills across all job listings
                </p>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-3 justify-center">
            {skillDemand.map((skill, i) => {
              const colors = [
                "from-blue-500 to-indigo-600",
                "from-indigo-500 to-blue-600",
                "from-blue-600 to-indigo-700",
              ];
              const bgColors = [
                "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800",
                "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800",
                "bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800",
              ];
              const isTop = i < 3;
              return (
                <div
                  key={i}
                  onClick={() => setSelectedSkill(skill)}
                  className={`group relative px-5 py-3 rounded-2xl border backdrop-blur-sm transition-all duration-300 hover:scale-105 hover:shadow-xl cursor-pointer ${
                    isTop
                      ? `bg-gradient-to-r ${colors[i % colors.length]} text-white border-transparent shadow-lg hover:shadow-2xl`
                      : bgColors[i % bgColors.length]
                  }`}
                >
                  {/* Glow effect */}
                  <div className={`absolute -inset-1 bg-gradient-to-r ${colors[i % colors.length]} rounded-2xl blur-lg opacity-0 group-hover:opacity-40 transition-opacity duration-500`} />
                  
                  <div className="relative">
                    {isTop && (
                      <div className="absolute -top-4 -right-4">
                        <div className="w-7 h-7 bg-amber-400 rounded-full flex items-center justify-center shadow-lg animate-bounce" style={{ animationDuration: "2s" }}>
                          <Trophy className="w-4 h-4 text-amber-900" />
                        </div>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{skill.skill}</span>
                      <span className={`text-xs ${isTop ? "text-white/80" : "opacity-60"}`}>
                        ({skill.jobCount})
                      </span>
                    </div>
                    {skill.growth > 0 && (
                      <div
                        className={`flex items-center gap-1 mt-1 text-xs ${
                          isTop ? "text-white/80" : "text-emerald-600"
                        }`}
                      >
                        <TrendingUp className="w-3 h-3" />
                        <span>+{skill.growth}% growth</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Card>

      {/* Quick Insights Row - Interactive Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Avg Salary", value: "$125K", change: "+8%", up: true, icon: Wallet, color: "blue", detail: "Senior roles average $145K" },
          { label: "Remote Jobs", value: "10.8K", change: "23%", up: true, icon: Cloud, color: "indigo", detail: "Up from 15% in 2023" },
          { label: "Entry Level", value: "5.2K", change: "-8%", up: false, icon: Heart, color: "sky", detail: "Consider upskilling" },
          { label: "New Today", value: "847", change: "Fresh", up: true, icon: Zap, color: "blue", detail: "Posted in last 24h" },
        ].map((item, i) => (
          <div key={i} className="group relative">
            <div className={`absolute -inset-1 bg-gradient-to-r from-${item.color}-500 to-${item.color}-600 rounded-3xl blur-xl opacity-0 group-hover:opacity-30 transition-opacity duration-500`} />
            <Card className={`relative p-5 bg-gradient-to-br from-${item.color}-50 to-${item.color === "blue" ? "indigo" : item.color}-50 dark:from-${item.color}-950/30 dark:to-${item.color === "blue" ? "indigo" : item.color}-950/30 border-${item.color}-200/50 dark:border-${item.color}-800/30 hover:shadow-xl hover:shadow-${item.color}-500/20 transition-all duration-500 cursor-pointer overflow-hidden`}>
              {/* Animated Background */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              
              <div className="relative">
                <div className="flex items-center justify-between mb-3">
                  <div className={`p-2.5 bg-${item.color}-500/10 rounded-xl group-hover:scale-110 transition-transform duration-300`}>
                    <item.icon className={`w-5 h-5 text-${item.color}-600`} />
                  </div>
                  <ChevronRight className={`w-4 h-4 text-${item.color}-400 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-300`} />
                </div>
                <p className={`text-3xl font-bold text-${item.color}-900 dark:text-${item.color}-100 group-hover:scale-105 transition-transform duration-300 origin-left`}>
                  {item.value}
                </p>
                <div className="flex items-center justify-between mt-2">
                  <span className={`text-xs font-medium text-${item.color}-700 dark:text-${item.color}-300`}>
                    {item.label}
                  </span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    item.up 
                      ? "bg-emerald-500/10 text-emerald-600" 
                      : "bg-rose-500/10 text-rose-600"
                  }`}>
                    {item.change}
                  </span>
                </div>
                
                {/* Hover Detail */}
                <div className="mt-3 pt-3 border-t border-slate-200/50 dark:border-slate-700/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <p className="text-xs text-muted-foreground">{item.detail}</p>
                </div>
              </div>
            </Card>
          </div>
        ))}
      </div>

      {/* Trend Detail Modal */}
      <Dialog open={!!selectedTrend} onOpenChange={() => setSelectedTrend(null)}>
        <DialogContent className="max-w-2xl p-0 rounded-3xl overflow-hidden">
          {selectedTrend && (
            <>
              {/* Header */}
              <div className={`relative p-6 ${
                selectedTrend.direction === "up" 
                  ? "bg-gradient-to-br from-emerald-500 to-teal-600" 
                  : "bg-gradient-to-br from-rose-500 to-red-600"
              } text-white`}>
                <button
                  onClick={() => setSelectedTrend(null)}
                  className="absolute top-4 right-4 p-2 bg-white/20 backdrop-blur-md rounded-xl hover:bg-white/30 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white/20 rounded-2xl">
                    {selectedTrend.direction === "up" ? (
                      <TrendingUp className="w-8 h-8" />
                    ) : (
                      <TrendingDown className="w-8 h-8" />
                    )}
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">{selectedTrend.topic}</h2>
                    <p className="text-white/80">{selectedTrend.volume} • {selectedTrend.timeframe}</p>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-6">
                <p className="text-muted-foreground mb-6">{selectedTrend.description}</p>

                {/* Stats Grid */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl text-center">
                    <p className={`text-2xl font-bold ${
                      selectedTrend.direction === "up" ? "text-emerald-600" : "text-rose-600"
                    }`}>
                      {selectedTrend.direction === "up" ? "+" : "-"}{selectedTrend.changePercent}%
                    </p>
                    <p className="text-xs text-muted-foreground">Change</p>
                  </div>
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl text-center">
                    <p className="text-2xl font-bold text-blue-600">{selectedTrend.volume}</p>
                    <p className="text-xs text-muted-foreground">Volume</p>
                  </div>
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl text-center">
                    <p className="text-2xl font-bold text-purple-600">2025</p>
                    <p className="text-xs text-muted-foreground">Timeframe</p>
                  </div>
                </div>

                {/* Simulated Chart */}
                <div className="mb-6">
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <LineChart className="w-4 h-4 text-blue-500" />
                    3-Year Trend
                  </h4>
                  <div className="h-32 bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 flex items-end gap-2">
                    {[30, 45, 40, 55, 50, 65, 60, 75, 70, 85, 80, 90].map((h, idx) => (
                      <div
                        key={idx}
                        className={`flex-1 rounded-t transition-all duration-500 ${
                          selectedTrend.direction === "up"
                            ? "bg-gradient-to-t from-emerald-500 to-teal-400"
                            : "bg-gradient-to-t from-rose-500 to-red-400"
                        }`}
                        style={{ height: `${h}%` }}
                      />
                    ))}
                  </div>
                  <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                    <span>2023</span>
                    <span>2024</span>
                    <span>2025</span>
                  </div>
                </div>

                {/* Related Terms */}
                {selectedTrend.relatedTerms && selectedTrend.relatedTerms.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-3">Related Skills</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedTrend.relatedTerms.map((term, i) => (
                        <Badge key={i} variant="outline" className="rounded-full">
                          {term}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3 mt-6 pt-6 border-t">
                  <Button className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl gap-2">
                    <Briefcase className="w-4 h-4" />
                    View Related Jobs
                  </Button>
                  <Button variant="outline" className="rounded-xl gap-2">
                    <Target className="w-4 h-4" />
                    Set Alert
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Skill Detail Modal */}
      <Dialog open={!!selectedSkill} onOpenChange={() => setSelectedSkill(null)}>
        <DialogContent className="max-w-lg p-0 rounded-3xl overflow-hidden">
          {selectedSkill && (
            <>
              <div className="p-6 bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
                <button
                  onClick={() => setSelectedSkill(null)}
                  className="absolute top-4 right-4 p-2 bg-white/20 backdrop-blur-md rounded-xl hover:bg-white/30 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white/20 rounded-2xl">
                    <Code2 className="w-8 h-8" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">{selectedSkill.skill}</h2>
                    <p className="text-white/80">{selectedSkill.jobCount} jobs available</p>
                  </div>
                </div>
              </div>

              <div className="p-6">
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 rounded-2xl">
                    <div className="flex items-center gap-2 mb-1">
                      <TrendingUp className="w-4 h-4 text-emerald-600" />
                      <span className="text-sm font-medium text-emerald-600">Growth</span>
                    </div>
                    <p className="text-2xl font-bold text-emerald-700">+{selectedSkill.growth}%</p>
                  </div>
                  <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-2xl">
                    <div className="flex items-center gap-2 mb-1">
                      <DollarSign className="w-4 h-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-600">Avg Salary</span>
                    </div>
                    <p className="text-2xl font-bold text-blue-700">{selectedSkill.avgSalary}</p>
                  </div>
                </div>

                {/* Demand Bar */}
                <div className="mb-6">
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium">Demand Level</span>
                    <span className="text-sm font-bold text-blue-600">{selectedSkill.demand}%</span>
                  </div>
                  <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full transition-all duration-1000"
                      style={{ width: `${selectedSkill.demand}%` }}
                    />
                  </div>
                </div>

                <Button className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl gap-2">
                  <Briefcase className="w-4 h-4" />
                  Find {selectedSkill.skill} Jobs
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
