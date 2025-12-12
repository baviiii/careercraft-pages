import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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
  Bell,
  Search,
  ExternalLink,
  Bookmark,
  BookmarkCheck,
  Loader2,
  RefreshCw,
  Home,
  Menu,
  Settings,
  Filter,
  BarChart3,
  AlertTriangle,
  Briefcase,
  DollarSign,
  Globe,
  Plane,
  Users,
  Sparkles,
} from "lucide-react";

const INDUSTRIES = [
  "Technology",
  "Finance",
  "Healthcare",
  "Manufacturing",
  "Retail",
  "Education",
  "Media",
  "Energy",
  "Real Estate",
  "Transportation",
];

const COUNTRIES = [
  "United States",
  "United Kingdom",
  "Australia",
  "Canada",
  "Germany",
  "India",
  "Singapore",
  "Netherlands",
  "Ireland",
  "UAE",
];

const ALERT_TYPES = [
  { id: "hiring", label: "Hiring Waves", icon: Users },
  { id: "layoffs", label: "Layoffs", icon: AlertTriangle },
  { id: "salary", label: "Salary Changes", icon: DollarSign },
  { id: "remote", label: "Remote Work Trends", icon: Globe },
  { id: "immigration", label: "Visa/Immigration", icon: Plane },
  { id: "ai", label: "AI Impact", icon: Sparkles },
];

interface NewsArticle {
  title: string;
  description: string;
  url: string;
  source: string;
  publishedAt: string;
  urlToImage?: string;
  category: string;
}

interface TrendAnalysis {
  trends: { trend: string; direction: string; confidence: number }[];
  insights: { title: string; description: string; impact: string }[];
  predictions: { prediction: string; timeframe: string; likelihood: number }[];
  whatThisMeansForYou: string;
}

export default function JobNews() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("news");
  
  // News state
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCountry, setSelectedCountry] = useState("");
  const [selectedIndustry, setSelectedIndustry] = useState("");
  const [savedArticles, setSavedArticles] = useState<string[]>([]);
  
  // Trends state
  const [trends, setTrends] = useState<TrendAnalysis | null>(null);
  const [analyzingTrends, setAnalyzingTrends] = useState(false);
  
  // Alerts state
  const [alerts, setAlerts] = useState<Record<string, boolean>>({});
  const [preferences, setPreferences] = useState({
    industries: [] as string[],
    countries: [] as string[],
    summaryFrequency: "daily",
    emailNotifications: false,
    pushNotifications: false,
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) navigate("/auth");
      else fetchNews();
    });
  }, [navigate]);

  const fetchNews = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("job-news", {
        body: {
          action: "fetch_news",
          query: searchQuery || "jobs hiring technology",
          country: selectedCountry,
          industry: selectedIndustry,
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setArticles(data.articles || []);
    } catch (error: any) {
      console.error("Error fetching news:", error);
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const analyzeTrends = async () => {
    if (articles.length === 0) {
      toast({ title: "No articles to analyze", variant: "destructive" });
      return;
    }

    setAnalyzingTrends(true);
    try {
      const articleSummary = articles.slice(0, 10).map(a => `${a.title}: ${a.description}`).join("\n");
      
      const { data, error } = await supabase.functions.invoke("job-news", {
        body: {
          action: "analyze_trends",
          query: articleSummary,
          industry: selectedIndustry,
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setTrends(data);
      setActiveTab("trends");
    } catch (error: any) {
      console.error("Error analyzing trends:", error);
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setAnalyzingTrends(false);
    }
  };

  const toggleSaveArticle = (url: string) => {
    if (savedArticles.includes(url)) {
      setSavedArticles(savedArticles.filter(u => u !== url));
    } else {
      setSavedArticles([...savedArticles, url]);
    }
  };

  const toggleAlert = (alertId: string) => {
    setAlerts(prev => ({ ...prev, [alertId]: !prev[alertId] }));
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "layoffs": return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case "hiring": return <Users className="w-4 h-4 text-green-500" />;
      case "salary": return <DollarSign className="w-4 h-4 text-amber-500" />;
      case "remote_work": return <Globe className="w-4 h-4 text-blue-500" />;
      case "immigration": return <Plane className="w-4 h-4 text-purple-500" />;
      case "ai_impact": return <Sparkles className="w-4 h-4 text-primary" />;
      default: return <Briefcase className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "layoffs": return "destructive";
      case "hiring": return "default";
      case "salary": return "secondary";
      default: return "outline";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 h-full w-64 bg-card border-r border-border z-50 transform transition-transform duration-300 lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6">
          <button onClick={() => navigate("/dashboard")} className="flex items-center gap-2 mb-8">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center">
              <Newspaper className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold">Job News</span>
          </button>

          <nav className="space-y-1">
            <button onClick={() => navigate("/dashboard")} className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:bg-muted">
              <Home className="w-5 h-5" />Dashboard
            </button>
            <button onClick={() => setActiveTab("news")} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg ${activeTab === 'news' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted'}`}>
              <Newspaper className="w-5 h-5" />Latest News
            </button>
            <button onClick={() => setActiveTab("trends")} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg ${activeTab === 'trends' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted'}`}>
              <BarChart3 className="w-5 h-5" />Market Trends
            </button>
            <button onClick={() => setActiveTab("alerts")} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg ${activeTab === 'alerts' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted'}`}>
              <Bell className="w-5 h-5" />Alerts Settings
            </button>
          </nav>
        </div>
      </aside>

      {/* Main Content */}
      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border">
          <div className="flex items-center justify-between px-4 md:px-8 py-4">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSidebarOpen(true)}>
                <Menu className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-xl md:text-2xl font-bold">Job Market News & Trends</h1>
                <p className="text-sm text-muted-foreground hidden sm:block">Stay informed about the job market</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={fetchNews} disabled={loading}>
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />Refresh
              </Button>
              <Button onClick={analyzeTrends} disabled={analyzingTrends || articles.length === 0}>
                {analyzingTrends ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                Analyze Trends
              </Button>
            </div>
          </div>
        </header>

        <main className="p-4 md:p-8">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full max-w-lg grid-cols-3">
              <TabsTrigger value="news" className="gap-2"><Newspaper className="w-4 h-4" />News</TabsTrigger>
              <TabsTrigger value="trends" className="gap-2"><BarChart3 className="w-4 h-4" />Trends</TabsTrigger>
              <TabsTrigger value="alerts" className="gap-2"><Bell className="w-4 h-4" />Alerts</TabsTrigger>
            </TabsList>

            {/* NEWS TAB */}
            <TabsContent value="news" className="space-y-6">
              {/* Filters */}
              <Card className="p-4">
                <div className="flex flex-wrap gap-4">
                  <div className="flex-1 min-w-[200px]">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search news..."
                        className="pl-10"
                        onKeyDown={(e) => e.key === "Enter" && fetchNews()}
                      />
                    </div>
                  </div>
                  <Select value={selectedCountry} onValueChange={setSelectedCountry}>
                    <SelectTrigger className="w-[180px]"><SelectValue placeholder="Country" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Countries</SelectItem>
                      {COUNTRIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={selectedIndustry} onValueChange={setSelectedIndustry}>
                    <SelectTrigger className="w-[180px]"><SelectValue placeholder="Industry" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Industries</SelectItem>
                      {INDUSTRIES.map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button onClick={fetchNews} disabled={loading}>
                    <Filter className="w-4 h-4 mr-2" />Apply
                  </Button>
                </div>
              </Card>

              {/* News Articles */}
              {loading ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {[...Array(6)].map((_, i) => (
                    <Card key={i} className="p-4 animate-pulse">
                      <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                      <div className="h-3 bg-muted rounded w-full mb-1" />
                      <div className="h-3 bg-muted rounded w-2/3" />
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {articles.map((article, i) => (
                    <Card key={i} className="p-4 hover:shadow-lg transition-shadow group">
                      <div className="flex items-start justify-between mb-2">
                        <Badge variant={getCategoryColor(article.category) as any} className="flex items-center gap-1">
                          {getCategoryIcon(article.category)}
                          {article.category.replace("_", " ")}
                        </Badge>
                        <button onClick={() => toggleSaveArticle(article.url)} className="opacity-0 group-hover:opacity-100 transition-opacity">
                          {savedArticles.includes(article.url) ? (
                            <BookmarkCheck className="w-5 h-5 text-primary" />
                          ) : (
                            <Bookmark className="w-5 h-5 text-muted-foreground hover:text-primary" />
                          )}
                        </button>
                      </div>
                      <h3 className="font-semibold mb-2 line-clamp-2 group-hover:text-primary transition-colors">{article.title}</h3>
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{article.description}</p>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{article.source}</span>
                        <span>{new Date(article.publishedAt).toLocaleDateString()}</span>
                      </div>
                      <a href={article.url} target="_blank" rel="noopener noreferrer" className="mt-3 flex items-center gap-1 text-sm text-primary hover:underline">
                        Read more<ExternalLink className="w-3 h-3" />
                      </a>
                    </Card>
                  ))}
                </div>
              )}

              {!loading && articles.length === 0 && (
                <Card className="p-12 text-center">
                  <Newspaper className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold">No news found</h3>
                  <p className="text-muted-foreground">Try adjusting your search filters</p>
                </Card>
              )}
            </TabsContent>

            {/* TRENDS TAB */}
            <TabsContent value="trends" className="space-y-6">
              {trends ? (
                <>
                  {/* What This Means For You */}
                  <Card className="p-6 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-primary" />What This Means For You
                    </h3>
                    <p className="text-muted-foreground">{trends.whatThisMeansForYou}</p>
                  </Card>

                  {/* Trends */}
                  <Card className="p-6">
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-primary" />Market Trends
                    </h3>
                    <div className="space-y-4">
                      {trends.trends?.map((trend, i) => (
                        <div key={i} className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                          {trend.direction === "up" ? (
                            <TrendingUp className="w-6 h-6 text-green-500" />
                          ) : trend.direction === "down" ? (
                            <TrendingDown className="w-6 h-6 text-red-500" />
                          ) : (
                            <BarChart3 className="w-6 h-6 text-amber-500" />
                          )}
                          <div className="flex-1">
                            <p className="font-medium">{trend.trend}</p>
                            <p className="text-sm text-muted-foreground">Confidence: {trend.confidence}%</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>

                  {/* Insights */}
                  <Card className="p-6">
                    <h3 className="font-semibold mb-4">Key Insights</h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      {trends.insights?.map((insight, i) => (
                        <div key={i} className="p-4 border rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium">{insight.title}</h4>
                            <Badge variant={insight.impact === "high" ? "destructive" : insight.impact === "medium" ? "secondary" : "outline"}>
                              {insight.impact}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{insight.description}</p>
                        </div>
                      ))}
                    </div>
                  </Card>

                  {/* Predictions */}
                  <Card className="p-6">
                    <h3 className="font-semibold mb-4">Predictions</h3>
                    <div className="space-y-4">
                      {trends.predictions?.map((pred, i) => (
                        <div key={i} className="flex items-start gap-4 p-4 bg-muted/50 rounded-lg">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <span className="text-sm font-bold text-primary">{pred.likelihood}%</span>
                          </div>
                          <div>
                            <p className="font-medium">{pred.prediction}</p>
                            <Badge variant="outline" className="mt-1">{pred.timeframe}</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                </>
              ) : (
                <Card className="p-12 text-center">
                  <BarChart3 className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold">No trend analysis yet</h3>
                  <p className="text-muted-foreground mb-4">Fetch news first, then click "Analyze Trends" to get AI insights</p>
                  <Button onClick={analyzeTrends} disabled={articles.length === 0}>
                    <Sparkles className="w-4 h-4 mr-2" />Analyze Trends
                  </Button>
                </Card>
              )}
            </TabsContent>

            {/* ALERTS TAB */}
            <TabsContent value="alerts" className="space-y-6">
              <Card className="p-6">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Bell className="w-5 h-5 text-primary" />Alert Types
                </h3>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {ALERT_TYPES.map(alert => (
                    <div key={alert.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <alert.icon className="w-5 h-5 text-primary" />
                        <span className="font-medium">{alert.label}</span>
                      </div>
                      <Switch checked={alerts[alert.id] || false} onCheckedChange={() => toggleAlert(alert.id)} />
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="p-6">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Settings className="w-5 h-5 text-primary" />Notification Preferences
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <span>Email Notifications</span>
                    <Switch checked={preferences.emailNotifications} onCheckedChange={(v) => setPreferences(p => ({ ...p, emailNotifications: v }))} />
                  </div>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <span>Push Notifications</span>
                    <Switch checked={preferences.pushNotifications} onCheckedChange={(v) => setPreferences(p => ({ ...p, pushNotifications: v }))} />
                  </div>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <span>Summary Frequency</span>
                    <Select value={preferences.summaryFrequency} onValueChange={(v) => setPreferences(p => ({ ...p, summaryFrequency: v }))}>
                      <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </Card>

              <Button className="w-full" onClick={() => toast({ title: "Preferences saved!" })}>
                Save Preferences
              </Button>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  );
}
