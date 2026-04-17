/* ───────────────────────────────────────────────────────────
   CareerCraft — Market News
   Cream editorial shell, shared sidebar, ink tabs, rust accents.
   Data wiring preserved: news, trends, insights.
   ─────────────────────────────────────────────────────────── */

import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useRateLimit } from "@/hooks/useSecurity";
import { usePersonalization } from "@/hooks/usePersonalization";
import { sanitize } from "@/lib/security/sanitizers";
import { auditLog } from "@/lib/security/auditLog";
import { RATE_LIMITS } from "@/lib/security/rateLimiter";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowUpRight,
  Filter,
  Newspaper,
  BarChart3,
  Sparkles,
  RefreshCw,
  Settings as SettingsIcon,
  UserCheck,
  Wand2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CraftAppLayout } from "@/components/craft/CraftAppLayout";

import {
  NewsTab,
  TrendsTab,
  InsightsTab,
  NewsArticle,
  TrendItem,
  MarketInsight,
  SkillDemand,
  TopIndustry,
  TopCompany,
  INDUSTRIES,
  EXPERIENCE_LEVELS,
} from "@/components/job-market";

const MARKET_TABS = [
  {
    id: "news",
    label: "News",
    icon: Newspaper,
    note: "Dispatches from the market floor.",
  },
  {
    id: "trends",
    label: "Analytics",
    icon: BarChart3,
    note: "Trends and movement, read aloud.",
  },
  {
    id: "insights",
    label: "Insights",
    icon: Sparkles,
    note: "AI readings and forward odds.",
  },
] as const;

export default function JobMarketNews() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<(typeof MARKET_TABS)[number]["id"]>(
    "news",
  );

  /* ───────────── personalization ───────────── */
  const {
    profile: userProfile,
    loading: profileLoading,
    hasPersonalizationData,
    getNewsFilters,
  } = usePersonalization();

  const [showPersonalized, setShowPersonalized] = useState(true);

  /* ───────────── security / rate limit ───────────── */
  const { checkLimit: checkNewsLimit } = useRateLimit({
    key: "job-market-news",
    config: RATE_LIMITS.API,
    onLimitExceeded: (result) => {
      toast({
        title: "Too Many Requests",
        description: `Please wait ${result.retryAfter} seconds before refreshing.`,
        variant: "destructive",
      });
    },
  });

  /* ───────────── state ───────────── */
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [loadingNews, setLoadingNews] = useState(false);
  const [loadingMoreNews, setLoadingMoreNews] = useState(false);
  const [newsCategory, setNewsCategory] = useState("all");
  const [savedArticles, setSavedArticles] = useState<string[]>([]);
  const [newsStartDate, setNewsStartDate] = useState<string>("");
  const [newsEndDate, setNewsEndDate] = useState<string>("");
  const [newsPage, setNewsPage] = useState(1);
  const [hasMoreNews, setHasMoreNews] = useState(true);
  const [newsTimeRange, setNewsTimeRange] = useState("week");

  const [trends, setTrends] = useState<TrendItem[]>([]);
  const [insights, setInsights] = useState<MarketInsight[]>([]);
  const [skillDemand, setSkillDemand] = useState<SkillDemand[]>([]);
  const [topIndustries, setTopIndustries] = useState<TopIndustry[]>([]);
  const [topCompanies, setTopCompanies] = useState<TopCompany[]>([]);
  const [loadingTrends, setLoadingTrends] = useState(false);

  const [selectedIndustry, setSelectedIndustry] = useState("All");
  const [selectedLevel, setSelectedLevel] = useState("All");

  /* ───────────── effects ───────────── */

  useEffect(() => {
    if (hasPersonalizationData && !profileLoading && showPersonalized) {
      const newsFilters = getNewsFilters();
      if (newsFilters.industries.length > 0) {
        setSelectedIndustry(newsFilters.industries[0]);
      }
    }
  }, [hasPersonalizationData, profileLoading, showPersonalized]);

  useEffect(() => {
    let mounted = true;
    const init = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
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
    return () => {
      mounted = false;
    };
  }, [navigate]);

  const loadSavedArticles = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session) {
      const saved = localStorage.getItem(`savedArticles_${session.user.id}`);
      if (saved) setSavedArticles(JSON.parse(saved));
    }
  };

  const fetchNews = useCallback(
    async (append = false, page = 1) => {
      const rateLimitResult = checkNewsLimit();
      if (!rateLimitResult.allowed) return;

      if (append) setLoadingMoreNews(true);
      else setLoadingNews(true);

      try {
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

        if (append) setNews((prev) => [...prev, ...(data.articles || [])]);
        else setNews(data.articles || []);

        setHasMoreNews(data.hasMore || false);
        setNewsPage(page);

        auditLog({
          type: "API_CALL",
          action: `Fetch news: ${sanitizedCategory}`,
          resource: "job-news",
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
    },
    [newsCategory, newsStartDate, newsEndDate, toast, checkNewsLimit],
  );

  const fetchMarketData = useCallback(async () => {
    setLoadingTrends(true);
    try {
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

  useEffect(() => {
    fetchMarketData();
  }, [selectedIndustry, selectedLevel]);

  useEffect(() => {
    setNewsPage(1);
    fetchNews(false, 1);
  }, [newsCategory]);

  useEffect(() => {
    if (newsStartDate || newsEndDate) {
      setNewsPage(1);
      fetchNews(false, 1);
    }
  }, [newsStartDate, newsEndDate]);

  /* ───────────── handlers ───────────── */

  const handleRefresh = () => {
    setNewsPage(1);
    fetchNews(false, 1);
    fetchMarketData();
  };

  const handleTimeRangeChange = async (
    startDate: string,
    endDate: string,
    rangeValue?: string,
  ) => {
    setNewsStartDate(startDate);
    setNewsEndDate(endDate);
    setNewsPage(1);
    if (rangeValue) setNewsTimeRange(rangeValue);

    const start = new Date(startDate);
    const end = new Date(endDate);
    const daySpan = Math.ceil(
      (end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000),
    );

    if (daySpan > 30) {
      supabase.functions
        .invoke("job-news", {
          body: {
            action: "prefetch_news",
            category: newsCategory,
            startDate,
            endDate,
          },
        })
        .then(({ data }) => {
          if (data?.success) fetchNews(false, 1);
        })
        .catch((err) => console.error("Prefetch failed:", err));
    }
  };

  const handleLoadMoreNews = () => fetchNews(true, newsPage + 1);

  const isLoading = loadingNews || loadingTrends;
  const activeMeta =
    MARKET_TABS.find((t) => t.id === activeTab) ?? MARKET_TABS[0];

  /* ───────────── render ───────────── */

  return (
    <CraftAppLayout
      headerActions={
        <button
          onClick={handleRefresh}
          disabled={isLoading}
          className="cc-btn cc-btn-ghost"
          style={{ padding: "0.7rem 1rem" }}
        >
          <RefreshCw
            className={cn("w-3.5 h-3.5", isLoading && "animate-spin")}
          />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      }
    >
      {/* ─────── Masthead ─────── */}
      <section className="border-b border-[color:var(--cc-hair-strong)] pb-10 md:pb-12">
        <div className="grid grid-cols-12 gap-6 md:gap-10 items-end">
          <div className="col-span-12 md:col-span-8">
            <div className="cc-label text-[color:var(--cc-rust)]">
              § Press · Australian job market — Vol. I
            </div>
            <h1 className="mt-5 cc-font-display text-5xl md:text-7xl leading-[0.9] tracking-tight">
              Market <span className="cc-italic-wonk">news,</span>
              <br />
              read quietly.
            </h1>
            <p className="mt-6 cc-font-editorial text-xl md:text-2xl leading-[1.35] text-[color:var(--cc-ink-soft)] max-w-2xl">
              {activeMeta.note} Policy, hiring signals and forward readings —
              cited, filed, and set in plain type.
            </p>
          </div>

          <div className="col-span-12 md:col-span-4">
            <div className="border-2 border-[color:var(--cc-ink)] bg-[color:var(--cc-cream)] p-6 md:p-7">
              <div className="flex items-center justify-between">
                <div className="cc-label text-[color:var(--cc-rust)]">
                  Press plate
                </div>
                <div className="cc-label-sm text-[color:var(--cc-ash)]">
                  № {String(news.length).padStart(3, "0")}
                </div>
              </div>
              <div className="mt-5 cc-font-display italic text-xl leading-tight">
                {news.length > 0
                  ? `${news.length} dispatches filed today.`
                  : "The press is warm, awaiting copy."}
              </div>
              <div className="mt-5 pt-4 border-t border-[color:var(--cc-hair-strong)] cc-label-sm text-[color:var(--cc-ash)]">
                {isLoading ? (
                  <span className="inline-flex items-center gap-2">
                    <RefreshCw className="w-3 h-3 animate-spin" /> Printing…
                  </span>
                ) : (
                  <span className="cc-tabular">Signed to press</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─────── Section tabs ─────── */}
      <div className="mt-10 flex flex-wrap items-center gap-1 border-b border-[color:var(--cc-hair-strong)]">
        {MARKET_TABS.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "relative inline-flex items-center gap-2 px-5 py-3 cc-label transition-colors",
                active
                  ? "text-[color:var(--cc-ink)]"
                  : "text-[color:var(--cc-ash)] hover:text-[color:var(--cc-ink)]",
              )}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {active && (
                <span className="absolute left-0 right-0 -bottom-px h-[2px] bg-[color:var(--cc-rust)]" />
              )}
            </button>
          );
        })}
      </div>

      {/* ─────── Personalization banner ─────── */}
      {hasPersonalizationData && !profileLoading && (
        <div className="mt-8 border border-[color:var(--cc-hair-strong)] bg-[color:var(--cc-cream-2)] p-5 md:p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full border border-[color:var(--cc-ink)] flex items-center justify-center flex-shrink-0">
                <Wand2 className="w-4 h-4 text-[color:var(--cc-rust)]" />
              </div>
              <div>
                <div className="cc-label text-[color:var(--cc-rust)]">
                  § Personalised
                </div>
                <div className="mt-1 cc-font-display italic text-xl text-[color:var(--cc-ink)]">
                  {userProfile.industry
                    ? `Set for ${userProfile.industry}.`
                    : "Set from your profile."}
                </div>
                <div className="mt-1 cc-font-editorial text-[15px] text-[color:var(--cc-ink-soft)]">
                  The desk reads the market through your own lens.
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <label className="inline-flex items-center gap-2 cc-label-sm text-[color:var(--cc-ash)] cursor-pointer select-none">
                <span>Personalise</span>
                <span
                  onClick={() => setShowPersonalized((v) => !v)}
                  className={cn(
                    "relative inline-block w-10 h-5 border transition-colors",
                    showPersonalized
                      ? "bg-[color:var(--cc-ink)] border-[color:var(--cc-ink)]"
                      : "bg-transparent border-[color:var(--cc-hair-strong)]",
                  )}
                  aria-pressed={showPersonalized}
                  role="button"
                  tabIndex={0}
                >
                  <span
                    className={cn(
                      "absolute top-[2px] w-3.5 h-3.5 transition-all",
                      showPersonalized
                        ? "left-[22px] bg-[color:var(--cc-cream)]"
                        : "left-[2px] bg-[color:var(--cc-ink)]",
                    )}
                  />
                </span>
              </label>
              <button
                onClick={() => navigate("/settings")}
                className="cc-btn cc-btn-ghost"
                style={{ padding: "0.65rem 0.9rem" }}
              >
                <SettingsIcon className="w-3.5 h-3.5" /> Preferences
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────── Profile setup prompt ─────── */}
      {!hasPersonalizationData && !profileLoading && (
        <div className="mt-8 border-2 border-[color:var(--cc-ink)] bg-[color:var(--cc-cream)] p-6 md:p-7">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="cc-label text-[color:var(--cc-rust)]">
                § Bench note
              </div>
              <div className="mt-1 cc-font-display italic text-2xl text-[color:var(--cc-ink)]">
                Make the news <span className="cc-italic-wonk">yours.</span>
              </div>
              <p className="mt-2 cc-font-editorial text-[17px] text-[color:var(--cc-ink-soft)] max-w-lg">
                Set your industry and level so the desk can file the right
                stories to your bench.
              </p>
            </div>
            <button
              onClick={() => navigate("/settings")}
              className="cc-btn cc-btn-primary"
            >
              <UserCheck className="w-4 h-4" /> Set profile
              <ArrowUpRight className="w-4 h-4 cc-arrow-up" />
            </button>
          </div>
        </div>
      )}

      {/* ─────── Filters (trends/insights only) ─────── */}
      {(activeTab === "trends" || activeTab === "insights") && (
        <div className="mt-8 flex flex-wrap items-center gap-4 border border-[color:var(--cc-hair-strong)] bg-[color:var(--cc-cream-2)] p-4">
          <div className="flex items-center gap-2 cc-label text-[color:var(--cc-ash)]">
            <Filter className="w-3.5 h-3.5" />
            <span>Filter</span>
          </div>

          <Select value={selectedIndustry} onValueChange={setSelectedIndustry}>
            <SelectTrigger className="w-[200px] rounded-none border-[color:var(--cc-hair-strong)] bg-[color:var(--cc-cream)] cc-font-sans text-[color:var(--cc-ink)]">
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
            <SelectTrigger className="w-[200px] rounded-none border-[color:var(--cc-hair-strong)] bg-[color:var(--cc-cream)] cc-font-sans text-[color:var(--cc-ink)]">
              <SelectValue placeholder="Experience level" />
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

      {/* ─────── Tab content ─────── */}
      <div className="mt-10">
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
          <TrendsTab
            trends={trends}
            skillDemand={skillDemand}
            loading={loadingTrends}
          />
        )}

        {activeTab === "insights" && (
          <InsightsTab
            insights={insights}
            topIndustries={topIndustries}
            topCompanies={topCompanies}
            loading={loadingTrends}
          />
        )}
      </div>
    </CraftAppLayout>
  );
}
