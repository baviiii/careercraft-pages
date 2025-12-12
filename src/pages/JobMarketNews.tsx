import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Newspaper,
  TrendingUp,
  TrendingDown,
  Search,
  Bookmark,
  BookmarkCheck,
  Loader2,
  RefreshCw,
  Home,
  Menu,
  Briefcase,
  DollarSign,
  Globe,
  Zap,
  AlertTriangle,
  Users,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Building2,
  Target,
  Lightbulb,
  LineChart,
  Flame,
  Calendar,
  Eye,
  ChevronRight,
  Filter,
  MapPin,
  GraduationCap,
} from "lucide-react";

// Categories for news filtering
const NEWS_CATEGORIES = [
  { name: "All News", value: "all", icon: Newspaper },
  { name: "Hiring Trends", value: "hiring", icon: Users },
  { name: "Tech Industry", value: "tech", icon: Zap },
  { name: "Salary Reports", value: "salary", icon: DollarSign },
  { name: "Remote Work", value: "remote", icon: Globe },
  { name: "AI & Automation", value: "ai", icon: Sparkles },
  { name: "Layoffs", value: "layoffs", icon: AlertTriangle },
  { name: "Innovation", value: "innovation", icon: Lightbulb },
  { name: "Immigration", value: "immigration", icon: Globe },
];

const INDUSTRIES = [
  "All",
  "Technology",
  "Finance",
  "Healthcare",
  "Education",
  "Construction",
  "Retail",
  "Marketing",
  "Legal",
];

const EXPERIENCE_LEVELS = [
  "All",
  "Junior",
  "Mid",
  "Senior",
  "Lead",
];

interface NewsArticle {
  id: string;
  title: string;
  description: string;
  url: string;
  source: string;
  publishedAt: string;
  category: string;
  imageUrl?: string;
  readTime?: string;
}

interface TrendItem {
  id: string;
  topic: string;
  direction: "up" | "down" | "stable";
  changePercent: number;
  volume: string;
  description: string;
  relatedTerms?: string[];
  timeframe: string;
}

interface MarketInsight {
  title: string;
  value: string;
  change: string;
  direction: "up" | "down" | "stable";
  description: string;
  icon: string;
}

interface SkillDemand {
  skill: string;
  demand: number;
  growth: number;
  avgSalary: string;
  jobCount: number;
}

interface TopIndustry {
  industry: string;
  jobCount: number;
  percentage: number;
}

interface TopCompany {
  name: string;
  jobCount: number;
}

export default function JobMarketNews() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("news");

  // News state
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [loadingNews, setLoadingNews] = useState(false);
  const [newsCategory, setNewsCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [savedArticles, setSavedArticles] = useState<string[]>([]);

  // Trends & Insights state
  const [trends, setTrends] = useState<TrendItem[]>([]);
  const [insights, setInsights] = useState<MarketInsight[]>([]);
  const [skillDemand, setSkillDemand] = useState<SkillDemand[]>([]);
  const [topIndustries, setTopIndustries] = useState<TopIndustry[]>([]);
  const [topCompanies, setTopCompanies] = useState<TopCompany[]>([]);
  const [loadingTrends, setLoadingTrends] = useState(false);

  // Filters
  const [selectedIndustry, setSelectedIndustry] = useState("All");
  const [selectedLevel, setSelectedLevel] = useState("All");

  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }

      if (!mounted) return;

      loadSavedArticles();
      fetchNews();
      fetchMarketData();
    };

    init();
    return () => { mounted = false; };
  }, [navigate]);

  const loadSavedArticles = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      const saved = localStorage.getItem(`savedArticles_${session.user.id}`);
      if (saved) setSavedArticles(JSON.parse(saved));
    }
  };

  const fetchNews = useCallback(async () => {
    setLoadingNews(true);
    try {
      const { data, error } = await supabase.functions.invoke("job-news", {
        body: {
          action: "fetch_news",
          category: newsCategory,
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setNews(data.articles || []);
      setLastUpdated(new Date());
    } catch (error: any) {
      console.error("Error fetching news:", error);
      toast({
        title: "Failed to load news",
        description: "Please check your connection and try again",
        variant: "destructive",
      });
    } finally {
      setLoadingNews(false);
    }
  }, [newsCategory, toast]);

  const fetchMarketData = useCallback(async () => {
    setLoadingTrends(true);
    try {
      // Fetch trends
      const trendsRes = await supabase.functions.invoke("job-news", {
        body: {
          action: "fetch_trends",
          country: "au",
          industry: selectedIndustry,
          level: selectedLevel,
        },
      });

      if (trendsRes.error) throw trendsRes.error;
      setTrends(trendsRes.data.trends || []);

      // Fetch insights
      const insightsRes = await supabase.functions.invoke("job-news", {
        body: {
          action: "fetch_insights",
          country: "au",
          industry: selectedIndustry,
          level: selectedLevel,
        },
      });

      if (insightsRes.error) throw insightsRes.error;
      setInsights(insightsRes.data.insights || []);
      setSkillDemand(insightsRes.data.skillDemand || []);
      setTopIndustries(insightsRes.data.topIndustries || []);
      setTopCompanies(insightsRes.data.topCompanies || []);
    } catch (error: any) {
      console.error("Error fetching market data:", error);
      toast({
        title: "Failed to load market data",
        description: "Please check your connection",
        variant: "destructive",
      });
    } finally {
      setLoadingTrends(false);
    }
  }, [selectedIndustry, selectedLevel, toast]);

  // Re-fetch market data when filters change
  useEffect(() => {
    fetchMarketData();
  }, [selectedIndustry, selectedLevel]);

  const toggleSaveArticle = async (articleId: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    let newSaved: string[];
    if (savedArticles.includes(articleId)) {
      newSaved = savedArticles.filter(id => id !== articleId);
    } else {
      newSaved = [...savedArticles, articleId];
    }
    setSavedArticles(newSaved);
    localStorage.setItem(`savedArticles_${session.user.id}`, JSON.stringify(newSaved));
  };

  const getTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffHours < 1) return "Just now";
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "hiring":
        return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
      case "tech":
        return "bg-blue-500/10 text-blue-600 border-blue-500/20";
      case "salary":
        return "bg-amber-500/10 text-amber-600 border-amber-500/20";
      case "remote":
        return "bg-purple-500/10 text-purple-600 border-purple-500/20";
      case "ai":
        return "bg-pink-500/10 text-pink-600 border-pink-500/20";
      case "layoffs":
        return "bg-red-500/10 text-red-600 border-red-500/20";
      case "innovation":
        return "bg-cyan-500/10 text-cyan-600 border-cyan-500/20";
      case "immigration":
        return "bg-indigo-500/10 text-indigo-600 border-indigo-500/20";
      default:
        return "bg-gray-500/10 text-gray-600 border-gray-500/20";
    }
  };

  const renderIcon = (iconName: string) => {
    switch (iconName) {
      case "briefcase": return <Briefcase className="w-6 h-6" />;
      case "dollar": return <DollarSign className="w-6 h-6" />;
      case "globe": return <Globe className="w-6 h-6" />;
      case "clock": return <Calendar className="w-6 h-6" />;
      case "map": return <MapPin className="w-6 h-6" />;
      case "building": return <Building2 className="w-6 h-6" />;
      default: return <Briefcase className="w-6 h-6" />;
    }
  };

  const TrendIcon = ({ direction }: { direction: "up" | "down" | "stable" }) => {
    if (direction === "up") return <ArrowUpRight className="w-5 h-5 text-emerald-500" />;
    if (direction === "down") return <ArrowDownRight className="w-5 h-5 text-red-500" />;
    return <Minus className="w-5 h-5 text-amber-500" />;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-blue-500/5">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full w-72 bg-card/95 backdrop-blur-xl border-r border-border z-50 transform transition-transform duration-300 lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
      >
        <div className="p-6 h-full flex flex-col">
          <button
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-3 mb-8 group"
          >
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:shadow-blue-500/40 transition-shadow">
              <Newspaper className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="text-xl font-bold bg-gradient-to-r from-blue-500 to-indigo-600 bg-clip-text text-transparent">
                Market News
              </span>
              <p className="text-xs text-muted-foreground">
                AU Job Market Intel
              </p>
            </div>
          </button>

          <nav className="space-y-2 flex-1">
            <button
              onClick={() => navigate("/dashboard")}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-muted-foreground hover:bg-muted/50 transition-colors"
            >
              <Home className="w-5 h-5" />Dashboard
            </button>
            <button
              onClick={() => navigate("/au-jobs")}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-muted-foreground hover:bg-muted/50 transition-colors"
            >
              <Briefcase className="w-5 h-5" />Job Listings
            </button>
            <button
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-gradient-to-r from-blue-500/10 to-indigo-500/10 text-blue-600 border border-blue-500/20"
            >
              <Newspaper className="w-5 h-5" />News & Trends
            </button>
          </nav>

          {/* Quick Stats */}
          <Card className="p-4 bg-gradient-to-br from-blue-500/5 to-indigo-500/5 border-blue-500/20">
            <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-500" />
              Today's Highlights
            </h4>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-sm text-muted-foreground">
                  Tech hiring up 12%
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                <span className="text-sm text-muted-foreground">
                  Remote jobs +8%
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-amber-500" />
                <span className="text-sm text-muted-foreground">
                  Avg salary $125k
                </span>
              </div>
            </div>
          </Card>
        </div>
      </aside>

      {/* Main Content */}
      <div className="lg:pl-72">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border">
          <div className="flex items-center justify-between px-4 md:px-8 py-4">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
                  <span className="text-2xl">📊</span>
                  AU Job Market Intel
                </h1>
                <p className="text-sm text-muted-foreground hidden sm:block">
                  Live insights and news for job seekers & founders
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  fetchNews();
                  fetchMarketData();
                }}
                disabled={loadingNews || loadingTrends}
              >
                <RefreshCw
                  className={`w-4 h-4 mr-2 ${
                    loadingNews || loadingTrends ? "animate-spin" : ""
                  }`}
                />
                <span className="hidden sm:inline">Refresh</span>
              </Button>
            </div>
          </div>
        </header>

        <main className="p-4 md:p-8">
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="space-y-6"
          >
            <TabsList className="grid w-full max-w-md grid-cols-3 p-1 bg-muted/50">
              <TabsTrigger
                value="news"
                className="gap-2 data-[state=active]:bg-background"
              >
                <Newspaper className="w-4 h-4" />News
              </TabsTrigger>
              <TabsTrigger
                value="trends"
                className="gap-2 data-[state=active]:bg-background"
              >
                <TrendingUp className="w-4 h-4" />Trends
              </TabsTrigger>
              <TabsTrigger
                value="insights"
                className="gap-2 data-[state=active]:bg-background"
              >
                <Lightbulb className="w-4 h-4" />Insights
              </TabsTrigger>
            </TabsList>

            {/* NEWS TAB */}
            <TabsContent value="news" className="space-y-6">
              <Card className="p-4 md:p-6 bg-gradient-to-r from-card to-card/50 border-blue-500/10">
                <div className="flex flex-col gap-4">
                  {/* Category Pills */}
                  <div className="flex flex-wrap gap-2">
                    {NEWS_CATEGORIES.map((cat) => (
                      <Button
                        key={cat.value}
                        variant={
                          newsCategory === cat.value ? "default" : "outline"
                        }
                        size="sm"
                        onClick={() => setNewsCategory(cat.value)}
                        className={
                          newsCategory === cat.value
                            ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white border-0"
                            : "hover:bg-blue-50"
                        }
                      >
                        <cat.icon className="w-4 h-4 mr-1.5" />
                        {cat.name}
                      </Button>
                    ))}
                  </div>
                </div>
              </Card>

              {loadingNews ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {[...Array(6)].map((_, i) => (
                    <Card key={i} className="overflow-hidden">
                      <Skeleton className="h-40 w-full" />
                      <div className="p-4 space-y-3">
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-6 w-full" />
                        <Skeleton className="h-4 w-3/4" />
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {news.map((article) => (
                    <Card
                      key={article.id}
                      className="overflow-hidden hover:shadow-xl hover:shadow-blue-500/5 transition-all duration-300 group border-border/50"
                    >
                      <div className="relative h-48 overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10" />
                        <img
                          src={article.imageUrl || "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&q=80"}
                          alt={article.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute top-3 left-3 z-20">
                          <Badge
                            className={`${getCategoryColor(
                              article.category
                            )} backdrop-blur-md bg-white/90`}
                          >
                            {article.category}
                          </Badge>
                        </div>
                        <div className="absolute bottom-3 left-3 z-20">
                          <p className="text-white text-xs font-medium flex items-center gap-2">
                            <span>{article.source}</span>
                            <span>•</span>
                            <span>{getTimeAgo(article.publishedAt)}</span>
                          </p>
                        </div>
                      </div>
                      <div className="p-5">
                        <h3 className="font-bold text-lg leading-tight mb-2 group-hover:text-blue-600 transition-colors">
                          {article.title}
                        </h3>
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                          {article.description}
                        </p>
                        <a
                          href={article.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-700"
                        >
                          Read full story <ChevronRight className="w-4 h-4 ml-1" />
                        </a>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* TRENDS & INSIGHTS COMMON FILTERS */}
            {(activeTab === "trends" || activeTab === "insights") && (
              <div className="flex flex-wrap gap-4 mb-6 p-4 bg-card border rounded-xl shadow-sm">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Filter Data:</span>
                </div>

                <Select
                  value={selectedIndustry}
                  onValueChange={setSelectedIndustry}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Industry" />
                  </SelectTrigger>
                  <SelectContent>
                    {INDUSTRIES.map((ind) => (
                      <SelectItem key={ind} value={ind}>
                        {ind}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={selectedLevel} onValueChange={setSelectedLevel}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Experience Level" />
                  </SelectTrigger>
                  <SelectContent>
                    {EXPERIENCE_LEVELS.map((lvl) => (
                      <SelectItem key={lvl} value={lvl}>
                        {lvl}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* TRENDS TAB */}
            <TabsContent value="trends" className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <Card className="p-6 border-emerald-500/10 bg-emerald-50/10">
                  <h3 className="font-semibold mb-6 flex items-center gap-2 text-emerald-700">
                    <TrendingUp className="w-5 h-5" />
                    Trending Up (Last 7 Days)
                  </h3>
                  <div className="space-y-4">
                    {trends
                      .filter((t) => t.direction === "up")
                      .slice(0, 5)
                      .map((trend, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between p-3 bg-white rounded-xl shadow-sm border border-emerald-100"
                        >
                          <div className="flex items-center gap-3">
                            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 text-xs font-bold">
                              {i + 1}
                            </span>
                            <div>
                              <p className="font-medium text-sm">{trend.topic}</p>
                              <p className="text-xs text-muted-foreground">
                                {trend.volume} listings
                              </p>
                            </div>
                          </div>
                          <Badge
                            className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-0"
                          >
                            +{trend.changePercent}%
                          </Badge>
                        </div>
                      ))}
                  </div>
                </Card>

                <Card className="p-6 border-blue-500/10 bg-blue-50/10">
                  <h3 className="font-semibold mb-6 flex items-center gap-2 text-blue-700">
                    <MapPin className="w-5 h-5" />
                    Top Locations
                  </h3>
                  <div className="space-y-4">
                    {trends
                      .filter((t) => t.topic.includes("📍"))
                      .slice(0, 5)
                      .map((trend, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between p-3 bg-white rounded-xl shadow-sm border border-blue-100"
                        >
                          <div className="flex items-center gap-3">
                            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-xs font-bold">
                              {i + 1}
                            </span>
                            <div>
                              <p className="font-medium text-sm">
                                {trend.topic.replace("📍 ", "")}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {trend.volume} listings
                              </p>
                            </div>
                          </div>
                          <Badge
                            className="bg-blue-100 text-blue-700 hover:bg-blue-200 border-0"
                          >
                            {trend.description.split("%")[0]}%
                          </Badge>
                        </div>
                      ))}
                  </div>
                </Card>
              </div>

              {/* Skills Cloud */}
              <Card className="p-6">
                <h3 className="font-semibold mb-6 flex items-center gap-2">
                  <Target className="w-5 h-5 text-purple-500" />
                  Top Skills in Demand
                </h3>
                <div className="flex flex-wrap gap-2">
                  {skillDemand.map((skill, i) => (
                    <div
                      key={i}
                      className="px-4 py-2 rounded-full bg-slate-50 border border-slate-100 flex items-center gap-2 hover:bg-slate-100 transition-colors cursor-default"
                      style={{
                        transform: `scale(${1 + skill.demand / 300})`,
                      }}
                    >
                      <span className="font-medium text-sm text-slate-700">
                        {skill.skill}
                      </span>
                      <span className="text-xs text-slate-400">
                        ({skill.jobCount})
                      </span>
                    </div>
                  ))}
                </div>
              </Card>
            </TabsContent>

            {/* INSIGHTS TAB */}
            <TabsContent value="insights" className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {insights.map((insight, i) => (
                  <Card key={i} className="p-6 hover:shadow-lg transition-shadow">
                    <div
                      className={`w-12 h-12 rounded-xl mb-4 flex items-center justify-center ${
                        insight.direction === "up"
                          ? "bg-emerald-500/10"
                          : insight.direction === "down"
                          ? "bg-red-500/10"
                          : "bg-amber-500/10"
                      }`}
                    >
                      {renderIcon(insight.icon)}
                    </div>
                    <p className="text-3xl font-bold mb-1">{insight.value}</p>
                    <p className="text-sm text-muted-foreground mb-2">
                      {insight.title}
                    </p>
                    <div
                      className={`inline-flex items-center gap-1 text-sm font-medium ${
                        insight.direction === "up"
                          ? "text-emerald-600"
                          : insight.direction === "down"
                          ? "text-red-600"
                          : "text-amber-600"
                      }`}
                    >
                      <TrendIcon direction={insight.direction} />
                      {insight.change}
                    </div>
                  </Card>
                ))}
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <Card className="p-6">
                  <h3 className="font-semibold mb-6 flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-indigo-500" />
                    Top Hiring Companies
                  </h3>
                  <div className="space-y-4">
                    {topCompanies.map((company, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between group cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold group-hover:bg-indigo-100 transition-colors">
                            {company.name.charAt(0)}
                          </div>
                          <div>
                            <p
                              className="font-medium text-sm group-hover:text-indigo-600 transition-colors"
                            >
                              {company.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {company.jobCount} open roles
                            </p>
                          </div>
                        </div>
                        <ChevronRight
                          className="w-4 h-4 text-muted-foreground group-hover:text-indigo-600 transition-colors"
                        />
                      </div>
                    ))}
                  </div>
                </Card>

                <Card className="p-6">
                  <h3 className="font-semibold mb-6 flex items-center gap-2">
                    <GraduationCap className="w-5 h-5 text-pink-500" />
                    Top Industries
                  </h3>
                  <div className="space-y-6">
                    {topIndustries.map((ind, i) => (
                      <div key={i}>
                        <div className="flex justify-between mb-2">
                          <span className="text-sm font-medium">{ind.industry}</span>
                          <span className="text-sm text-muted-foreground">
                            {ind.percentage}%
                          </span>
                        </div>
                        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-pink-500 to-purple-500 rounded-full"
                            style={{ width: `${ind.percentage}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>

              {/* AI Summary */}
              <Card className="p-6 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  AI Market Summary
                </h3>
                <div className="prose prose-sm max-w-none text-muted-foreground">
                  <p>
                    The Australian job market is showing strong growth in the
                    technology sector, with a 12% increase in tech-related job
                    postings over the past month. Remote work opportunities
                    continue to rise, now representing 23% of all job listings.
                    Key skills in demand include React, TypeScript, Python, and
                    cloud technologies (AWS, Azure). Average salaries for senior
                    developers have increased by 8% year-over-year, with Sydney
                    and Melbourne offering the highest compensation packages.
                  </p>
                  <p className="mt-3">
                    <strong>Key Takeaway:</strong> Focus on cloud certifications
                    and modern JavaScript frameworks to maximize your market
                    value in the current Australian job market.
                  </p>
                </div>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  );
}
