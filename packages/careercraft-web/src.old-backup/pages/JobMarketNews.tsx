import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useRateLimit } from "@/hooks/useSecurity";
import { usePersonalization } from "@/hooks/usePersonalization";
import { sanitize } from "@/lib/security/sanitizers";
import { auditLog } from "@/lib/security/auditLog";
import { RATE_LIMITS } from "@/lib/security/rateLimiter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Filter, Wand2, UserCheck, Star, Settings } from "lucide-react";

// Import modular tab components
import {
  NewsTab,
  TrendsTab,
  InsightsTab,
  DashboardLayout,
  NewsArticle,
  TrendItem,
  MarketInsight,
  SkillDemand,
  TopIndustry,
  TopCompany,
  INDUSTRIES,
  EXPERIENCE_LEVELS,
} from "@/components/job-market";

export default function JobMarketNews() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("news");
  
  // Personalization
  const {
    profile: userProfile,
    loading: profileLoading,
    hasPersonalizationData,
    getNewsFilters,
    getPersonalizationSummary,
  } = usePersonalization();
  
  const [showPersonalized, setShowPersonalized] = useState(true);

  // Security - Rate limiting for API calls
  const { checkLimit: checkNewsLimit } = useRateLimit({
    key: 'job-market-news',
    config: RATE_LIMITS.API,
    onLimitExceeded: (result) => {
      toast({
        title: "Too Many Requests",
        description: `Please wait ${result.retryAfter} seconds before refreshing.`,
        variant: "destructive",
      });
    },
  });

  // News state
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [loadingNews, setLoadingNews] = useState(false);
  const [loadingMoreNews, setLoadingMoreNews] = useState(false);
  const [newsCategory, setNewsCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [savedArticles, setSavedArticles] = useState<string[]>([]);
  const [newsStartDate, setNewsStartDate] = useState<string>("");
  const [newsEndDate, setNewsEndDate] = useState<string>("");
  const [newsPage, setNewsPage] = useState(1);
  const [hasMoreNews, setHasMoreNews] = useState(true);
  const [newsTimeRange, setNewsTimeRange] = useState("week");

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
  
  // Apply personalized filters when profile loads
  useEffect(() => {
    if (hasPersonalizationData && !profileLoading && showPersonalized) {
      const newsFilters = getNewsFilters();
      if (newsFilters.industries.length > 0) {
        setSelectedIndustry(newsFilters.industries[0]);
      }
    }
  }, [hasPersonalizationData, profileLoading, showPersonalized]);

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

  const fetchNews = useCallback(async (append = false, page = 1) => {
    // Security: Check rate limit
    const rateLimitResult = checkNewsLimit();
    if (!rateLimitResult.allowed) {
      return;
    }
    
    if (append) {
      setLoadingMoreNews(true);
    } else {
      setLoadingNews(true);
    }
    
    try {
      // Security: Sanitize category input
      const sanitizedCategory = sanitize(newsCategory, { maxLength: 50 });
      
      const { data, error } = await supabase.functions.invoke("job-news", {
        body: {
          action: "fetch_news",
          category: sanitizedCategory,
          startDate: newsStartDate || undefined,
          endDate: newsEndDate || undefined,
          pageNumber: page,
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      if (append) {
        setNews(prev => [...prev, ...(data.articles || [])]);
      } else {
        setNews(data.articles || []);
      }
      
      setHasMoreNews(data.hasMore || false);
      setNewsPage(page);
      setLastUpdated(new Date());
      
      // Security: Audit log
      auditLog({
        type: 'API_CALL',
        action: `Fetch news: ${sanitizedCategory}`,
        resource: 'job-news',
        details: { category: sanitizedCategory, page },
        success: true,
      });
    } catch (error: any) {
      console.error("Error fetching news:", error);
      toast({
        title: "Failed to load news",
        description: "Please check your connection and try again",
        variant: "destructive",
      });
    } finally {
      setLoadingNews(false);
      setLoadingMoreNews(false);
    }
  }, [newsCategory, newsStartDate, newsEndDate, toast, checkNewsLimit]);

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


  const handleRefresh = () => {
    setNewsPage(1);
    fetchNews(false, 1);
    fetchMarketData();
  };

  const handleTimeRangeChange = async (startDate: string, endDate: string, rangeValue?: string) => {
    setNewsStartDate(startDate);
    setNewsEndDate(endDate);
    setNewsPage(1);
    if (rangeValue) setNewsTimeRange(rangeValue);
    
    // Calculate day span to determine if we need to prefetch
    const start = new Date(startDate);
    const end = new Date(endDate);
    const daySpan = Math.ceil((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
    
    // For long time ranges (>30 days), trigger background prefetch
    if (daySpan > 30) {
      console.log(`Long time range (${daySpan} days), triggering background prefetch...`);
      
      // Fire and forget - don't wait for prefetch to complete
      supabase.functions.invoke("job-news", {
        body: {
          action: "prefetch_news",
          category: newsCategory,
          startDate,
          endDate,
        },
      }).then(({ data }) => {
        if (data?.success) {
          console.log(`Prefetch complete: ${data.totalSaved} articles cached`);
          // Optionally refresh the news list after prefetch
          fetchNews(false, 1);
        }
      }).catch(err => {
        console.error("Prefetch failed:", err);
      });
    }
    
    // Fetch will be triggered by useEffect
  };

  const handleLoadMoreNews = () => {
    fetchNews(true, newsPage + 1);
  };

  // Re-fetch news when category changes
  useEffect(() => {
    setNewsPage(1);
    fetchNews(false, 1);
  }, [newsCategory]);

  // Re-fetch news when date range changes
  useEffect(() => {
    if (newsStartDate || newsEndDate) {
      setNewsPage(1);
      fetchNews(false, 1);
    }
  }, [newsStartDate, newsEndDate]);

  return (
    <DashboardLayout
      activeTab={activeTab}
      onTabChange={setActiveTab}
      onRefresh={handleRefresh}
      isLoading={loadingNews || loadingTrends}
    >
      {/* Personalization Banner */}
      {hasPersonalizationData && !profileLoading && (
        <Card className="p-4 mb-6 bg-gradient-to-r from-blue-500/10 via-indigo-500/5 to-transparent border-blue-500/20">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                <Wand2 className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="font-medium text-sm flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-blue-600" />
                  Personalized news feed
                </p>
                <p className="text-xs text-muted-foreground">
                  {userProfile.industry ? `Showing ${userProfile.industry} news` : 'Based on your profile preferences'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground">Personalize</span>
              <Switch 
                checked={showPersonalized} 
                onCheckedChange={setShowPersonalized}
              />
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => navigate('/settings')}
                className="text-xs"
              >
                <Settings className="w-3 h-3 mr-1" />
                Preferences
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Profile Setup Prompt */}
      {!hasPersonalizationData && !profileLoading && (
        <Card className="p-4 mb-6 bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent border-emerald-500/20">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                <Star className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="font-medium text-sm">Get personalized market insights</p>
                <p className="text-xs text-muted-foreground">
                  Set your industry and preferences to see relevant news and trends
                </p>
              </div>
            </div>
            <Button 
              size="sm" 
              onClick={() => navigate('/settings')}
              className="bg-gradient-to-r from-emerald-500 to-teal-600"
            >
              <UserCheck className="w-4 h-4 mr-2" />
              Setup Profile
            </Button>
          </div>
        </Card>
      )}

      {/* Filters for Trends & Insights */}
      {(activeTab === "trends" || activeTab === "insights") && (
        <div className="flex flex-wrap gap-4 mb-6 p-4 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50 rounded-2xl shadow-sm">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">Filter Data:</span>
          </div>

          <Select
            value={selectedIndustry}
            onValueChange={setSelectedIndustry}
          >
            <SelectTrigger className="w-[180px] rounded-xl">
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
            <SelectTrigger className="w-[180px] rounded-xl">
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

      {/* Tab Content */}
      {activeTab === "news" && (
        <NewsTab
          news={news}
          loading={loadingNews}
          newsCategory={newsCategory}
          onCategoryChange={setNewsCategory}
          onTimeRangeChange={handleTimeRangeChange}
          onLoadMore={handleLoadMoreNews}
          hasMore={hasMoreNews}
          loadingMore={loadingMoreNews}
          currentTimeRange={newsTimeRange}
        />
      )}

      {activeTab === "trends" && (
        <TrendsTab trends={trends} skillDemand={skillDemand} loading={loadingTrends} />
      )}

      {activeTab === "insights" && (
        <InsightsTab
          insights={insights}
          topIndustries={topIndustries}
          topCompanies={topCompanies}
          loading={loadingTrends}
        />
      )}
    </DashboardLayout>
  );
}
