/* ───────────────────────────────────────────────────────────
   Faircopy — AU Jobs
   Cream editorial shell, shared sidebar, ink tabs, rust accents.
   Data wiring preserved: search, saved, analysis, alerts.
   ─────────────────────────────────────────────────────────── */

import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useRateLimit } from "@/hooks/useSecurity";
import { usePersonalization, type MatchBand } from "@/hooks/usePersonalization";
import { MatchMeter } from "@/components/craft/MatchMeter";
import { sanitize } from "@/lib/security/sanitizers";
import { auditLog } from "@/lib/security/auditLog";
import { RATE_LIMITS } from "@/lib/security/rateLimiter";
import { CraftAppLayout } from "@/components/craft/CraftAppLayout";
import { cn } from "@/lib/utils";
import {
  Search,
  ExternalLink,
  Bookmark,
  BookmarkCheck,
  Loader2,
  RefreshCw,
  Briefcase,
  DollarSign,
  MapPin,
  Building2,
  Clock,
  Globe,
  ChevronDown,
  Users,
  TrendingUp,
  TrendingDown,
  Bell,
  Settings as SettingsIcon,
  Sparkles,
  AlertTriangle,
  Plane,
  Star,
  Target,
  X,
  Heart,
  BarChart3,
  ArrowUpRight,
} from "lucide-react";

/* ───────────── constants ───────────── */

const AU_CITIES = [
  { name: "All Australia", value: "australia" },
  { name: "Sydney, NSW", value: "sydney" },
  { name: "Melbourne, VIC", value: "melbourne" },
  { name: "Brisbane, QLD", value: "brisbane" },
  { name: "Perth, WA", value: "perth" },
  { name: "Adelaide, SA", value: "adelaide" },
  { name: "Gold Coast, QLD", value: "gold coast" },
  { name: "Canberra, ACT", value: "canberra" },
  { name: "Newcastle, NSW", value: "newcastle" },
  { name: "Hobart, TAS", value: "hobart" },
];

const JOB_TYPES = [
  { name: "All Types", value: "all" },
  { name: "Full-time", value: "fulltime" },
  { name: "Part-time", value: "parttime" },
  { name: "Contract", value: "contract" },
  { name: "Remote", value: "remote" },
  { name: "Internship", value: "intern" },
];

const EXPERIENCE_LEVELS = [
  { name: "All Levels", value: "all" },
  { name: "Entry Level", value: "entry" },
  { name: "Mid Level", value: "mid" },
  { name: "Senior Level", value: "senior" },
  { name: "Executive", value: "executive" },
];

const INDUSTRIES = [
  "Technology",
  "Finance",
  "Healthcare",
  "Engineering",
  "Sales",
  "Marketing",
  "Education",
  "Legal",
  "Retail",
  "Manufacturing",
];

const AU_TABS = [
  { id: "jobs", label: "Listings", icon: Briefcase, note: "Open roles across the country." },
  { id: "saved", label: "Saved", icon: Heart, note: "Jobs you've saved for later." },
  { id: "analysis", label: "Analysis", icon: BarChart3, note: "AI analysis of the current market." },
  { id: "alerts", label: "Alerts", icon: Bell, note: "Set up email alerts for new jobs." },
] as const;

const ALERT_TYPES = [
  { id: "hiring", label: "Hiring Waves", icon: Users, description: "When companies are hiring in bulk" },
  { id: "layoffs", label: "Layoffs", icon: AlertTriangle, description: "Workforce reductions, quietly flagged" },
  { id: "salary", label: "Salary Changes", icon: DollarSign, description: "Pay trends in your field" },
  { id: "remote", label: "Remote Work", icon: Globe, description: "New remote postings" },
  { id: "immigration", label: "Visa/Immigration", icon: Plane, description: "Sponsorship-friendly listings" },
  { id: "ai", label: "AI Impact", icon: Sparkles, description: "AI-related market shifts" },
];

/* ───────────── types ───────────── */

interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  salary?: string;
  salaryMin?: number;
  salaryMax?: number;
  /** True when the board predicted the salary rather than the employer stating it. */
  salaryIsPredicted?: boolean;
  type: string;
  description: string;
  /** The board's classification, used for the industry signal in the match score. */
  category?: string;
  /** Closeness to the user's profile, 0-1, computed server-side. */
  similarity?: number;
  url: string;
  postedAt: string;
  source: string;
  logo?: string;
  isRemote?: boolean;
  skills?: string[];
}

interface JobStats {
  totalJobs: number;
  avgSalary: string;
  topCompanies: string[];
  hotSkills: string[];
  /**
   * Whether meaning-based ranking actually ran. Surfaced because it degrades
   * silently on purpose — the other signals still rank the page, so a broken
   * Horus connection and a working one look identical from the UI.
   */
  similarityStatus?: 'ok' | 'no-profile' | 'not-configured' | 'unavailable';
}

interface TrendAnalysis {
  trends: { trend: string; direction: string; confidence: number }[];
  insights: { title: string; description: string; impact: string }[];
  predictions: { prediction: string; timeframe: string; likelihood: number }[];
  salaryTrends?: { direction: string; averageChange: string; topPayingRoles: string[] };
  hotSkills?: string[];
  whatThisMeansForYou: string;
}

interface UserPreferences {
  preferredCity: string;
  preferredIndustries: string[];
  jobTypes: string[];
  salaryMin: number;
  alerts: Record<string, boolean>;
  emailNotifications: boolean;
  pushNotifications: boolean;
  summaryFrequency: string;
}

const DEFAULT_PREFERENCES: UserPreferences = {
  preferredCity: "australia",
  preferredIndustries: [],
  jobTypes: [],
  salaryMin: 0,
  alerts: {},
  emailNotifications: false,
  pushNotifications: false,
  summaryFrequency: "daily",
};

/* ───────────── page ───────────── */

export default function AustralianJobs() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeTab, setActiveTab] =
    useState<(typeof AU_TABS)[number]["id"]>("jobs");

  const {
    profile: userProfile,
    loading: profileLoading,
    hasPersonalizationData,
    getPersonalizedJobQuery,
    getPersonalizedJobFilters,
    isJobRecommended,
    getProfileEmbeddingText,
  } = usePersonalization();

  const { checkLimit: checkSearchLimit } = useRateLimit({
    key: "au-jobs-search",
    config: RATE_LIMITS.SEARCH,
    onLimitExceeded: (result) => {
      toast({
        title: "Too Many Requests",
        description: `Please wait ${result.retryAfter} seconds before searching again.`,
        variant: "destructive",
      });
    },
  });

  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCity, setSelectedCity] = useState("australia");
  const [selectedType, setSelectedType] = useState("all");
  const [selectedLevel, setSelectedLevel] = useState("all");
  const [selectedIndustry, setSelectedIndustry] = useState("");
  const [savedJobs, setSavedJobs] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [stats, setStats] = useState<JobStats | null>(null);

  const [trendAnalysis, setTrendAnalysis] = useState<TrendAnalysis | null>(null);
  const [analyzingTrends, setAnalyzingTrends] = useState(false);

  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES);
  const [savingPreferences, setSavingPreferences] = useState(false);

  /* ───────────── effects ───────────── */

  useEffect(() => {
    if (hasPersonalizationData && !profileLoading) {
      const filters = getPersonalizedJobFilters();
      // Only prefill values the selects actually contain, or they render blank.
      if (filters.location && AU_CITIES.some((c) => c.value === filters.location))
        setSelectedCity(filters.location);
      if (filters.industry) setSelectedIndustry(filters.industry);
      if (
        filters.experienceLevel &&
        EXPERIENCE_LEVELS.some((l) => l.value === filters.experienceLevel && l.value !== "all")
      )
        setSelectedLevel(filters.experienceLevel);
    }
  }, [hasPersonalizationData, profileLoading]);

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

      loadUserPreferences(session.user.id);
      loadSavedJobs(session.user.id);

      const searchTerm = hasPersonalizationData ? getPersonalizedJobQuery() : "developer";

      setLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke("job-news", {
          body: {
            action: "fetch_au_jobs",
            query: searchTerm,
            location: "australia",
            page: 1,
          },
        });

        if (error) throw error;
        if (data.error) console.error("API Error:", data.error);

        setJobs(data.jobs || []);
        setStats(data.stats || null);
        setHasMore((data.jobs || []).length >= 20);
      } catch (error: any) {
        console.error("Error fetching jobs:", error);
        toast({
          title: "Failed to load jobs",
          description: error.message || "Please check your connection",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    init();
    return () => {
      mounted = false;
    };
  }, [navigate, toast, hasPersonalizationData]);

  const loadUserPreferences = (userId: string) => {
    const saved = localStorage.getItem(`jobPreferences_${userId}`);
    if (saved) {
      const prefs = JSON.parse(saved);
      setPreferences(prefs);
      if (prefs.preferredCity) setSelectedCity(prefs.preferredCity);
    }
  };

  const loadSavedJobs = (userId: string) => {
    const saved = localStorage.getItem(`savedJobs_${userId}`);
    if (saved) setSavedJobs(JSON.parse(saved));
  };

  const saveUserPreferences = async () => {
    setSavingPreferences(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {
        const prefsToSave = { ...preferences, preferredCity: selectedCity };
        localStorage.setItem(`jobPreferences_${session.user.id}`, JSON.stringify(prefsToSave));
        toast({
          title: "Preferences saved",
          description: "Your job preferences have been updated.",
        });
      }
    } catch {
      toast({ title: "Error saving preferences", variant: "destructive" });
    } finally {
      setSavingPreferences(false);
    }
  };

  const fetchJobs = useCallback(
    async (reset = false) => {
      const rateLimitResult = checkSearchLimit();
      if (!rateLimitResult.allowed) return;

      if (reset) {
        setLoading(true);
        setPage(1);
      } else {
        setLoadingMore(true);
      }

      try {
        const currentPage = reset ? 1 : page;
        const sanitizedQuery = sanitize(searchQuery || "developer", { maxLength: 200 });
        const sanitizedIndustry = sanitize(selectedIndustry, { maxLength: 100 });

        const { data, error } = await supabase.functions.invoke("job-news", {
          body: {
            action: "fetch_au_jobs",
            query: sanitizedQuery,
            location: selectedCity,
            jobType: selectedType,
            experienceLevel: selectedLevel,
            industry: sanitizedIndustry,
            page: currentPage,
            /* Lets the function rank by meaning. Omitted for anyone who has
               not onboarded, which skips the embedding call server-side. */
            profileText: getProfileEmbeddingText() ?? undefined,
          },
        });

        if (error) throw error;
        if (data.error) throw new Error(data.error);

        const newJobs = data.jobs || [];
        if (reset) setJobs(newJobs);
        else setJobs((prev) => [...prev, ...newJobs]);

        setHasMore(newJobs.length >= 20);
        setStats(data.stats || null);

        auditLog({
          type: "API_CALL",
          action: `Job search: ${sanitizedQuery}`,
          resource: "au-jobs",
          details: { query: sanitizedQuery, city: selectedCity, page: currentPage },
          success: true,
        });

        if (!reset) setPage((p) => p + 1);
      } catch (error: any) {
        console.error("Error fetching jobs:", error);
        toast({
          title: "Failed to load jobs",
          description: "Please check your connection and try again",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [
      searchQuery,
      selectedCity,
      selectedType,
      selectedLevel,
      selectedIndustry,
      page,
      toast,
      checkSearchLimit,
      getProfileEmbeddingText,
    ],
  );

  const analyzeJobTrends = async () => {
    if (jobs.length === 0) {
      toast({
        title: "No jobs to analyse",
        description: "Search for jobs first, then run an analysis.",
        variant: "destructive",
      });
      return;
    }
    setAnalyzingTrends(true);
    try {
      const jobSummary = jobs
        .slice(0, 15)
        .map(
          (j) =>
            `${j.title} at ${j.company}${j.salary ? ` - ${j.salary}` : ""}${
              j.location ? ` in ${j.location}` : ""
            }`,
        )
        .join("\n");

      const { data, error } = await supabase.functions.invoke("job-news", {
        body: {
          action: "analyze_trends",
          query: jobSummary,
          industry: selectedIndustry || "Technology",
          country: "Australia",
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setTrendAnalysis(data);
      setActiveTab("analysis");
      toast({ title: "Analysis complete", description: "Your market report is ready." });
    } catch (error: any) {
      console.error("Error analysing trends:", error);
      toast({
        title: "Analysis failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setAnalyzingTrends(false);
    }
  };

  const toggleSaveJob = async (jobId: string) => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return;
    const newSaved = savedJobs.includes(jobId)
      ? savedJobs.filter((id) => id !== jobId)
      : [...savedJobs, jobId];
    setSavedJobs(newSaved);
    localStorage.setItem(`savedJobs_${session.user.id}`, JSON.stringify(newSaved));
  };

  const toggleAlert = (alertId: string) =>
    setPreferences((prev) => ({
      ...prev,
      alerts: { ...prev.alerts, [alertId]: !prev.alerts[alertId] },
    }));

  const handleSearch = () => fetchJobs(true);

  const formatSalary = (job: Job) => {
    if (job.salary) return job.salary;
    if (job.salaryMin && job.salaryMax)
      return `$${(job.salaryMin / 1000).toFixed(0)}k – $${(job.salaryMax / 1000).toFixed(0)}k`;
    if (job.salaryMin) return `From $${(job.salaryMin / 1000).toFixed(0)}k`;
    return null;
  };

  const getTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
  };

  const savedJobsList = jobs.filter((job) => savedJobs.includes(job.id));

  const sortedJobs = useMemo(() => {
    if (!hasPersonalizationData) {
      return jobs.map((job) => ({ ...job, fitsPreferences: false, match: 0, band: "low" as MatchBand, reasons: [] as string[] }));
    }
    const jobsWithScore = jobs.map((job) => {
      const result = isJobRecommended({
        title: job.title,
        company: job.company,
        salary: job.salary,
        salaryMin: job.salaryMin,
        salaryMax: job.salaryMax,
        salaryIsPredicted: job.salaryIsPredicted,
        location: job.location,
        type: job.type,
        category: job.category,
        /* Skills are read out of this now, against the user's own skill list.
           `skills` is no longer passed: the server fills it from a hardcoded
           list of 38 software terms, so it was empty for every nurse, tradie
           and teacher — and that was the score's biggest signal. */
        description: job.description,
        isRemote: job.isRemote,
        similarity: job.similarity,
      });
      return {
        ...job,
        fitsPreferences: result.match >= 35,
        matchScore: result.score,
        match: result.match,
        band: result.band,
        reasons: result.reasons,
      };
    });

    /* Phase 0 measurement — see PERSONALISATION-PLAN.md.
       `industryMatches` maps the board's category onto our 20 industries using
       word overlap plus a short synonym list, and that list was written against
       the Adzuna labels I EXPECTED, not ones I had seen: their /categories
       endpoint needs a key I do not have. So the 14/14 it scores is against
       predicted labels, not real ones.

       Rather than guess again, report the categories that matched nothing.
       Aggregated per search and de-duplicated, so this is a line or two per
       search rather than one per job. Delete once the synonym list has been
       checked against a real /categories response. */
    if (import.meta.env.DEV && stats?.similarityStatus) {
      const note = {
        ok: 'ranking by meaning is live',
        'no-profile': 'skipped — profile is empty, so nothing to compare',
        'not-configured': 'skipped — HORUS_BASE_URL / key missing in Supabase secrets',
        unavailable: 'FAILED — Horus refused, timed out, or is paused',
      }[stats.similarityStatus];
      console.log(`[similarity] ${stats.similarityStatus}: ${note}`);
    }

    if (import.meta.env.DEV) {
      const unmatched = new Set(
        jobsWithScore
          .filter((j) => !j.reasons?.includes('Industry match') && j.category)
          .map((j) => j.category as string),
      );
      if (unmatched.size > 0) {
        console.warn(
          '[match] categories that matched no industry:',
          [...unmatched].sort(),
        );
      }
    }

    return jobsWithScore.sort((a, b) => (b.match ?? 0) - (a.match ?? 0));
  }, [jobs, hasPersonalizationData, isJobRecommended, stats?.similarityStatus]);

  const matchingJobsCount = sortedJobs.filter((j) => j.fitsPreferences).length;
  const activeMeta = AU_TABS.find((t) => t.id === activeTab) ?? AU_TABS[0];

  /* ───────────── render ───────────── */

  return (
    <CraftAppLayout
      headerActions={
        <button
          onClick={() => fetchJobs(true)}
          disabled={loading}
          className="cc-btn cc-btn-ghost"
          style={{ padding: "0.7rem 1rem" }}
        >
          <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      }
    >
      {/* ─────── Masthead ─────── */}
      <section className="border-b border-[color:var(--cc-hair-strong)] pb-10 md:pb-12">
        <div className="grid grid-cols-12 gap-6 md:gap-10 items-end">
          <div className="col-span-12 md:col-span-8">
            <div className="cc-label text-[color:var(--cc-rust)]">
              § Browse jobs
            </div>
            <h1 className="mt-5 cc-font-display text-5xl md:text-7xl leading-[0.9] tracking-tight">
              Australian <span className="cc-italic-wonk">jobs,</span>
              <br />
              one search away.
            </h1>
            <p className="mt-6 cc-font-editorial text-xl md:text-2xl leading-[1.35] text-[color:var(--cc-ink-soft)] max-w-2xl">
              {activeMeta.note} Live jobs from SEEK, Indeed, LinkedIn and Jora —
              scored against your profile to show the best matches first.
            </p>
          </div>

          <div className="col-span-12 md:col-span-4">
            <div className="border-2 border-[color:var(--cc-ink)] bg-[color:var(--cc-cream)] p-6 md:p-7">
              <div className="flex items-center justify-between">
                <div className="cc-label text-[color:var(--cc-rust)]">Search summary</div>
                <div className="cc-label-sm text-[color:var(--cc-ash)]">
                  № {String(jobs.length).padStart(3, "0")}
                </div>
              </div>
              <div className="mt-5 cc-font-display italic text-xl leading-tight">
                {jobs.length > 0
                  ? `${jobs.length} jobs found.`
                  : "No results — try a new search."}
              </div>
              <div className="mt-5 pt-4 border-t border-[color:var(--cc-hair-strong)] space-y-2 cc-label-sm">
                <Row k="Saved" v={`${savedJobs.length}`} />
                {stats?.avgSalary && <Row k="Avg salary" v={stats.avgSalary} />}
                {matchingJobsCount > 0 && (
                  <Row k="Fits you" v={`${matchingJobsCount}`} dot />
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─────── Section tabs ─────── */}
      <div className="mt-10 flex flex-wrap items-center gap-1 border-b border-[color:var(--cc-hair-strong)]">
        {AU_TABS.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          const badge =
            tab.id === "saved" && savedJobs.length > 0 ? savedJobs.length : undefined;
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
              {badge !== undefined && (
                <span
                  className={cn(
                    "ml-1 inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 text-[11px] cc-tabular border",
                    active
                      ? "border-[color:var(--cc-rust)] text-[color:var(--cc-rust)]"
                      : "border-[color:var(--cc-hair-strong)] text-[color:var(--cc-ash)]",
                  )}
                >
                  {badge}
                </span>
              )}
              {active && (
                <span className="absolute left-0 right-0 -bottom-px h-[2px] bg-[color:var(--cc-rust)]" />
              )}
            </button>
          );
        })}
      </div>

      {/* ─────── JOBS TAB ─────── */}
      {activeTab === "jobs" && (
        <div className="mt-10 space-y-8">
          {/* Search + filters */}
          <div className="border border-[color:var(--cc-hair-strong)] bg-[color:var(--cc-cream-2)]">
            <div className="p-5 md:p-6 border-b border-[color:var(--cc-hair-strong)]">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[color:var(--cc-ash)]" />
                  <input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    placeholder="Job title, skill or company"
                    className="w-full h-12 pl-10 pr-4 bg-[color:var(--cc-cream)] border border-[color:var(--cc-hair-strong)] cc-font-sans text-[color:var(--cc-ink)] placeholder:text-[color:var(--cc-ash)] focus:outline-none focus:border-[color:var(--cc-ink)]"
                  />
                </div>
                <button
                  onClick={handleSearch}
                  disabled={loading}
                  className="cc-btn cc-btn-primary"
                  style={{ padding: "0 1.6rem" }}
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Search className="w-4 h-4" />
                  )}
                  Search
                  <ArrowUpRight className="w-4 h-4 cc-arrow-up" />
                </button>
              </div>
            </div>

            <div className="p-5 md:p-6 flex flex-wrap gap-3">
              <CraftSelect
                value={selectedCity}
                onChange={setSelectedCity}
                icon={MapPin}
                placeholder="Location"
                options={AU_CITIES.map((c) => ({ value: c.value, label: c.name }))}
                width="w-[190px]"
              />
              <CraftSelect
                value={selectedType}
                onChange={setSelectedType}
                icon={Briefcase}
                placeholder="Job type"
                options={JOB_TYPES.map((t) => ({ value: t.value, label: t.name }))}
                width="w-[160px]"
              />
              <CraftSelect
                value={selectedLevel}
                onChange={setSelectedLevel}
                icon={Users}
                placeholder="Experience"
                options={EXPERIENCE_LEVELS.map((l) => ({
                  value: l.value,
                  label: l.name,
                }))}
                width="w-[170px]"
              />
              <CraftSelect
                value={selectedIndustry || "all"}
                onChange={(v) => setSelectedIndustry(v === "all" ? "" : v)}
                icon={Target}
                placeholder="Industry"
                options={[
                  { value: "all", label: "All industries" },
                  ...INDUSTRIES.map((i) => ({ value: i, label: i })),
                ]}
                width="w-[170px]"
              />

              {(selectedCity !== "australia" ||
                selectedType !== "all" ||
                selectedLevel !== "all" ||
                selectedIndustry) && (
                <button
                  onClick={() => {
                    setSelectedCity("australia");
                    setSelectedType("all");
                    setSelectedLevel("all");
                    setSelectedIndustry("");
                  }}
                  className="inline-flex items-center gap-1 cc-label-sm text-[color:var(--cc-ash)] hover:text-[color:var(--cc-ink)]"
                >
                  <X className="w-3.5 h-3.5" /> Clear
                </button>
              )}
            </div>
          </div>

          {/* Stats strip */}
          {stats && !loading && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-[color:var(--cc-hair-strong)] border border-[color:var(--cc-hair-strong)]">
              <StatPlate
                index={0}
                icon={Briefcase}
                label="Active jobs"
                value={stats.totalJobs.toLocaleString()}
              />
              <StatPlate
                index={1}
                icon={DollarSign}
                label="Avg salary"
                value={stats.avgSalary}
              />
              <StatPlate
                index={2}
                icon={Building2}
                label="Companies"
                value={`${stats.topCompanies?.length || 50}+`}
              />
              <StatPlate
                index={3}
                icon={Star}
                label="Hot skills"
                value={`${stats.hotSkills?.length || 10}+`}
              />
            </div>
          )}

          {/* Personalization line */}
          {hasPersonalizationData && !loading && matchingJobsCount > 0 && (
            <div className="flex items-center gap-3 cc-label-sm text-[color:var(--cc-ash)]">
              <Star className="w-3.5 h-3.5 text-[color:var(--cc-rust)]" />
              <span>
                <span className="cc-font-display italic text-lg text-[color:var(--cc-ink)]">
                  {matchingJobsCount}
                </span>{" "}
                jobs match your profile.
              </span>
              <span>·</span>
              <button
                onClick={() => navigate("/settings")}
                className="cc-link text-[color:var(--cc-ink)]"
              >
                Edit profile
              </button>
            </div>
          )}

          {/* Profile setup prompt */}
          {!hasPersonalizationData && !profileLoading && !loading && (
            <div className="border-2 border-[color:var(--cc-ink)] bg-[color:var(--cc-cream)] p-5 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="cc-label text-[color:var(--cc-rust)]">§ Set up profile</div>
                <div className="mt-1 cc-font-display italic text-xl text-[color:var(--cc-ink)]">
                  Complete your profile to see job matches.
                </div>
              </div>
              <button
                onClick={() => navigate("/settings")}
                className="cc-btn cc-btn-primary"
              >
                Set profile
                <ArrowUpRight className="w-4 h-4 cc-arrow-up" />
              </button>
            </div>
          )}

          {/* Listings */}
          {loading ? (
            <div className="space-y-3">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="border border-[color:var(--cc-hair-strong)] bg-[color:var(--cc-cream-2)] p-6"
                >
                  <div className="flex gap-4">
                    <div className="w-14 h-14 border border-[color:var(--cc-hair-strong)] bg-[color:var(--cc-cream)] animate-pulse" />
                    <div className="flex-1 space-y-3">
                      <div className="h-6 w-3/4 bg-[color:var(--cc-hair)] animate-pulse" />
                      <div className="h-4 w-1/2 bg-[color:var(--cc-hair)] animate-pulse" />
                      <div className="flex gap-2">
                        <div className="h-5 w-20 bg-[color:var(--cc-hair)] animate-pulse" />
                        <div className="h-5 w-24 bg-[color:var(--cc-hair)] animate-pulse" />
                        <div className="h-5 w-16 bg-[color:var(--cc-hair)] animate-pulse" />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {sortedJobs.map((job) => (
                <JobRow
                  key={job.id}
                  job={job}
                  isSaved={savedJobs.includes(job.id)}
                  onToggleSave={() => toggleSaveJob(job.id)}
                  formatSalary={formatSalary}
                  getTimeAgo={getTimeAgo}
                  fitsPreferences={job.fitsPreferences}
                  match={job.match}
                  band={job.band}
                  reasons={job.reasons}
                />
              ))}

              {jobs.length > 0 && hasMore && (
                <div className="flex justify-center pt-4">
                  <button
                    onClick={() => fetchJobs(false)}
                    disabled={loadingMore}
                    className="cc-btn cc-btn-ghost"
                  >
                    {loadingMore ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                    Load more
                  </button>
                </div>
              )}

              {!loading && jobs.length === 0 && (
                <div className="border-2 border-[color:var(--cc-ink)] bg-[color:var(--cc-cream)] p-12 md:p-14 text-center">
                  <div className="cc-label text-[color:var(--cc-rust)]">§ No results</div>
                  <h3 className="mt-4 cc-font-display text-3xl md:text-4xl leading-[0.95] tracking-tight">
                    No jobs found.
                  </h3>
                  <p className="mt-4 cc-font-editorial text-lg text-[color:var(--cc-ink-soft)] max-w-md mx-auto">
                    Loosen the filters or try a different title.
                  </p>
                  <button
                    onClick={() => {
                      setSearchQuery("");
                      setSelectedCity("australia");
                      setSelectedType("all");
                      setSelectedLevel("all");
                      setSelectedIndustry("");
                      fetchJobs(true);
                    }}
                    className="mt-8 cc-btn cc-btn-primary"
                  >
                    <RefreshCw className="w-4 h-4" /> Reset &amp; search
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ─────── SAVED TAB ─────── */}
      {activeTab === "saved" && (
        <div className="mt-10">
          {savedJobsList.length > 0 ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-[color:var(--cc-hair-strong)] pb-4">
                <div>
                  <div className="cc-label text-[color:var(--cc-rust)]">§ Saved</div>
                  <div className="mt-1 cc-font-display italic text-2xl">
                    {savedJobsList.length} jobs saved.
                  </div>
                </div>
              </div>
              {savedJobsList.map((job) => (
                <JobRow
                  key={job.id}
                  job={job}
                  isSaved
                  onToggleSave={() => toggleSaveJob(job.id)}
                  formatSalary={formatSalary}
                  getTimeAgo={getTimeAgo}
                />
              ))}
            </div>
          ) : (
            <div className="border-2 border-[color:var(--cc-ink)] bg-[color:var(--cc-cream)] p-12 md:p-14 text-center">
              <div className="cc-label text-[color:var(--cc-rust)]">§ Nothing saved</div>
              <h3 className="mt-4 cc-font-display text-3xl md:text-4xl leading-[0.95] tracking-tight">
                No saved jobs <span className="cc-italic-wonk">yet.</span>
              </h3>
              <p className="mt-4 cc-font-editorial text-lg text-[color:var(--cc-ink-soft)] max-w-md mx-auto">
                Tap the bookmark on any job to save it here.
              </p>
              <button
                onClick={() => setActiveTab("jobs")}
                className="mt-8 cc-btn cc-btn-primary"
              >
                <Briefcase className="w-4 h-4" /> Browse jobs
              </button>
            </div>
          )}
        </div>
      )}

      {/* ─────── ANALYSIS TAB ─────── */}
      {activeTab === "analysis" && (
        <div className="mt-10 space-y-6">
          {trendAnalysis ? (
            <>
              <EditorialPanel kicker="§ Reading" title="What this means for you">
                <p className="cc-font-editorial text-lg leading-[1.5] text-[color:var(--cc-ink-soft)]">
                  {trendAnalysis.whatThisMeansForYou}
                </p>
              </EditorialPanel>

              {trendAnalysis.hotSkills && trendAnalysis.hotSkills.length > 0 && (
                <EditorialPanel kicker="§ In demand" title="Hot skills">
                  <div className="flex flex-wrap gap-2">
                    {trendAnalysis.hotSkills.map((skill, i) => (
                      <span
                        key={i}
                        className="px-3 py-1.5 border border-[color:var(--cc-ink)] bg-[color:var(--cc-cream)] cc-label-sm text-[color:var(--cc-ink)]"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </EditorialPanel>
              )}

              {trendAnalysis.salaryTrends && (
                <EditorialPanel kicker="§ Pay" title="Salary trends">
                  <div className="grid md:grid-cols-3 gap-px bg-[color:var(--cc-hair-strong)] border border-[color:var(--cc-hair-strong)]">
                    <div className="bg-[color:var(--cc-cream)] p-6 text-center">
                      {trendAnalysis.salaryTrends.direction === "up" ? (
                        <TrendingUp className="w-6 h-6 mx-auto text-[color:var(--cc-rust)]" />
                      ) : (
                        <TrendingDown className="w-6 h-6 mx-auto text-[color:var(--cc-ink)]" />
                      )}
                      <div className="mt-4 cc-font-display text-4xl text-[color:var(--cc-ink)]">
                        {trendAnalysis.salaryTrends.averageChange}
                      </div>
                      <div className="mt-2 cc-label text-[color:var(--cc-ash)]">
                        Average change
                      </div>
                    </div>
                    <div className="md:col-span-2 bg-[color:var(--cc-cream)] p-6">
                      <div className="cc-label text-[color:var(--cc-ash)]">Top-paying roles</div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {trendAnalysis.salaryTrends.topPayingRoles?.map((role, i) => (
                          <span
                            key={i}
                            className="px-2.5 py-1 border border-[color:var(--cc-hair-strong)] bg-[color:var(--cc-cream-2)] cc-label-sm"
                          >
                            {role}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </EditorialPanel>
              )}

              <EditorialPanel kicker="§ Trends" title="Market movement">
                <div className="space-y-3">
                  {trendAnalysis.trends?.map((trend, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-4 border border-[color:var(--cc-hair-strong)] bg-[color:var(--cc-cream-2)] p-4"
                    >
                      {trend.direction === "up" ? (
                        <TrendingUp className="w-5 h-5 text-[color:var(--cc-rust)]" />
                      ) : trend.direction === "down" ? (
                        <TrendingDown className="w-5 h-5 text-[color:var(--cc-ink)]" />
                      ) : (
                        <BarChart3 className="w-5 h-5 text-[color:var(--cc-ash)]" />
                      )}
                      <div className="flex-1">
                        <div className="cc-font-display italic text-lg text-[color:var(--cc-ink)]">
                          {trend.trend}
                        </div>
                        <div className="mt-0.5 cc-label-sm text-[color:var(--cc-ash)]">
                          Confidence · {trend.confidence}%
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </EditorialPanel>

              <EditorialPanel kicker="§ Insights" title="Key readings">
                <div className="grid md:grid-cols-2 gap-px bg-[color:var(--cc-hair-strong)] border border-[color:var(--cc-hair-strong)]">
                  {trendAnalysis.insights?.map((insight, i) => (
                    <div key={i} className="bg-[color:var(--cc-cream)] p-5">
                      <div className="flex items-center justify-between">
                        <div className="cc-font-display italic text-lg">
                          {insight.title}
                        </div>
                        <span className="cc-label-sm px-2 py-0.5 border border-[color:var(--cc-hair-strong)] text-[color:var(--cc-ink-soft)]">
                          {insight.impact}
                        </span>
                      </div>
                      <p className="mt-3 cc-font-editorial text-[15px] leading-snug text-[color:var(--cc-ink-soft)]">
                        {insight.description}
                      </p>
                    </div>
                  ))}
                </div>
              </EditorialPanel>

              <EditorialPanel kicker="§ Forecast" title="Predictions">
                <div className="space-y-3">
                  {trendAnalysis.predictions?.map((pred, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-4 border border-[color:var(--cc-hair-strong)] bg-[color:var(--cc-cream-2)] p-4"
                    >
                      <div className="w-12 h-12 rounded-full border border-[color:var(--cc-ink)] flex items-center justify-center flex-shrink-0">
                        <span className="cc-font-display italic text-sm text-[color:var(--cc-rust)]">
                          {pred.likelihood}%
                        </span>
                      </div>
                      <div>
                        <div className="cc-font-display italic text-lg">
                          {pred.prediction}
                        </div>
                        <div className="mt-1 cc-label-sm text-[color:var(--cc-ash)]">
                          {pred.timeframe}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </EditorialPanel>
            </>
          ) : (
            <div className="border-2 border-[color:var(--cc-ink)] bg-[color:var(--cc-cream)] p-12 md:p-14 text-center">
              <div className="cc-label text-[color:var(--cc-rust)]">§ No analysis</div>
              <h3 className="mt-4 cc-font-display text-3xl md:text-4xl leading-[0.95] tracking-tight">
                No analysis <span className="cc-italic-wonk">yet.</span>
              </h3>
              <p className="mt-4 cc-font-editorial text-lg text-[color:var(--cc-ink-soft)] max-w-md mx-auto">
                Search for jobs first, then run an AI analysis to see trends.
              </p>
              <button
                onClick={analyzeJobTrends}
                disabled={jobs.length === 0 || analyzingTrends}
                className="mt-8 cc-btn cc-btn-primary"
              >
                {analyzingTrends ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                Analyse current jobs
              </button>
            </div>
          )}
        </div>
      )}

      {/* ─────── ALERTS / PREFS TAB ─────── */}
      {activeTab === "alerts" && (
        <div className="mt-10 space-y-6">
          <EditorialPanel
            kicker="§ Alerts"
            title="Job alert types"
            sub="Pick what you want to be notified about."
          >
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-px bg-[color:var(--cc-hair-strong)] border border-[color:var(--cc-hair-strong)]">
              {ALERT_TYPES.map((alert) => (
                <div
                  key={alert.id}
                  className="bg-[color:var(--cc-cream)] p-5 flex items-start gap-4"
                >
                  <div className="w-10 h-10 rounded-full border border-[color:var(--cc-ink)] flex items-center justify-center flex-shrink-0">
                    <alert.icon className="w-4 h-4 text-[color:var(--cc-rust)]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="cc-font-display italic text-lg">
                        {alert.label}
                      </span>
                      <Switch
                        checked={preferences.alerts[alert.id] || false}
                        onCheckedChange={() => toggleAlert(alert.id)}
                      />
                    </div>
                    <p className="mt-1 cc-label-sm text-[color:var(--cc-ash)]">
                      {alert.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </EditorialPanel>

          <EditorialPanel kicker="§ Notifications" title="Notification settings">
            <div className="space-y-3">
              <PrefRow
                label="Email notifications"
                sub="Receive alerts by email."
                control={
                  <Switch
                    checked={preferences.emailNotifications}
                    onCheckedChange={(v) =>
                      setPreferences((p) => ({ ...p, emailNotifications: v }))
                    }
                  />
                }
              />
              <PrefRow
                label="Push notifications"
                sub="Browser alerts, in the moment."
                control={
                  <Switch
                    checked={preferences.pushNotifications}
                    onCheckedChange={(v) =>
                      setPreferences((p) => ({ ...p, pushNotifications: v }))
                    }
                  />
                }
              />
              <PrefRow
                label="Summary frequency"
                sub="How often we send you a job summary."
                control={
                  <CraftSelect
                    value={preferences.summaryFrequency}
                    onChange={(v) =>
                      setPreferences((p) => ({ ...p, summaryFrequency: v }))
                    }
                    placeholder="Frequency"
                    options={[
                      { value: "daily", label: "Daily" },
                      { value: "weekly", label: "Weekly" },
                      { value: "monthly", label: "Monthly" },
                    ]}
                    width="w-[150px]"
                  />
                }
              />
            </div>
          </EditorialPanel>

          <EditorialPanel
            kicker="§ Defaults"
            title="Default search"
            sub="Your preferred filters, ready for next time."
          >
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="cc-label text-[color:var(--cc-ash)] block mb-2">
                  Preferred location
                </label>
                <CraftSelect
                  value={selectedCity}
                  onChange={setSelectedCity}
                  icon={MapPin}
                  placeholder="Select city"
                  options={AU_CITIES.map((c) => ({
                    value: c.value,
                    label: c.name,
                  }))}
                  width="w-full"
                />
              </div>
              <div>
                <label className="cc-label text-[color:var(--cc-ash)] block mb-2">
                  Preferred industry
                </label>
                <CraftSelect
                  value={selectedIndustry || "all"}
                  onChange={(v) => setSelectedIndustry(v === "all" ? "" : v)}
                  icon={Target}
                  placeholder="Select industry"
                  options={[
                    { value: "all", label: "All industries" },
                    ...INDUSTRIES.map((i) => ({ value: i, label: i })),
                  ]}
                  width="w-full"
                />
              </div>
            </div>
          </EditorialPanel>

          <button
            onClick={saveUserPreferences}
            disabled={savingPreferences}
            className="w-full cc-btn cc-btn-primary"
          >
            {savingPreferences ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <SettingsIcon className="w-4 h-4" />
            )}
            Save all preferences
            <ArrowUpRight className="w-4 h-4 cc-arrow-up" />
          </button>
        </div>
      )}
    </CraftAppLayout>
  );
}

/* ───────────── subcomponents ───────────── */

interface RowProps {
  k: string;
  v: string;
  dot?: boolean;
}
const Row = ({ k, v, dot }: RowProps) => (
  <div className="flex items-center justify-between">
    <span className="cc-label-sm text-[color:var(--cc-ash)]">{k}</span>
    <span className="flex items-center gap-2 cc-font-display italic text-base text-[color:var(--cc-ink)]">
      {dot && (
        <span className="w-1.5 h-1.5 rounded-full bg-[color:var(--cc-rust)]" />
      )}
      {v}
    </span>
  </div>
);

interface CraftSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  icon?: React.ComponentType<{ className?: string }>;
  width?: string;
}
const CraftSelect = ({
  value,
  onChange,
  options,
  placeholder,
  icon: Icon,
  width = "w-[160px]",
}: CraftSelectProps) => (
  <Select value={value} onValueChange={onChange}>
    <SelectTrigger
      className={cn(
        width,
        "rounded-none border-[color:var(--cc-hair-strong)] bg-[color:var(--cc-cream)] text-[color:var(--cc-ink)] cc-font-sans hover:border-[color:var(--cc-ink)]",
      )}
    >
      {Icon && <Icon className="w-3.5 h-3.5 mr-2 text-[color:var(--cc-ash)]" />}
      <SelectValue placeholder={placeholder} />
    </SelectTrigger>
    <SelectContent>
      {options.map((o) => (
        <SelectItem key={o.value} value={o.value}>
          {o.label}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
);

interface StatPlateProps {
  index: number;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}
const StatPlate = ({ index, icon: Icon, label, value }: StatPlateProps) => {
  const romans = ["i.", "ii.", "iii.", "iv."];
  return (
    <div className="bg-[color:var(--cc-cream)] p-5 md:p-6">
      <div className="cc-font-display italic text-xl text-[color:var(--cc-rust)] leading-none">
        {romans[index] || `${index + 1}.`}
      </div>
      <div className="mt-5 flex items-baseline gap-3">
        <span className="cc-font-display text-3xl md:text-4xl leading-none text-[color:var(--cc-ink)] cc-tabular">
          {value}
        </span>
        <Icon className="w-4 h-4 text-[color:var(--cc-ash)]" />
      </div>
      <div className="mt-3 cc-label text-[color:var(--cc-ink)]">{label}</div>
    </div>
  );
};

interface EditorialPanelProps {
  kicker: string;
  title: string;
  sub?: string;
  children: React.ReactNode;
}
const EditorialPanel = ({ kicker, title, sub, children }: EditorialPanelProps) => (
  <section>
    <div className="pb-5 mb-6 border-b border-[color:var(--cc-hair-strong)]">
      <div className="cc-label text-[color:var(--cc-rust)]">{kicker}</div>
      <h2 className="mt-3 cc-font-display text-2xl md:text-3xl leading-[0.95] tracking-tight">
        {title}
      </h2>
      {sub && (
        <p className="mt-2 cc-font-editorial text-lg text-[color:var(--cc-ink-soft)] max-w-xl">
          {sub}
        </p>
      )}
    </div>
    {children}
  </section>
);

interface PrefRowProps {
  label: string;
  sub: string;
  control: React.ReactNode;
}
const PrefRow = ({ label, sub, control }: PrefRowProps) => (
  <div className="flex items-center justify-between gap-4 border border-[color:var(--cc-hair-strong)] bg-[color:var(--cc-cream-2)] p-4">
    <div>
      <div className="cc-font-display italic text-lg text-[color:var(--cc-ink)]">
        {label}
      </div>
      <div className="mt-0.5 cc-label-sm text-[color:var(--cc-ash)]">{sub}</div>
    </div>
    <div>{control}</div>
  </div>
);

/* ───────────── JobRow ───────────── */

interface JobRowProps {
  job: Job;
  isSaved: boolean;
  onToggleSave: () => void;
  formatSalary: (job: Job) => string | null;
  getTimeAgo: (date: string) => string;
  fitsPreferences?: boolean;
  match?: number;
  band?: MatchBand;
  reasons?: string[];
}

const SOURCE_NOTE: Record<string, string> = {
  seek: "SEEK",
  indeed: "Indeed",
  linkedin: "LinkedIn",
  jora: "Jora",
};

const JobRow = ({
  job,
  isSaved,
  onToggleSave,
  formatSalary,
  getTimeAgo,
  fitsPreferences = false,
  match,
  band,
  reasons,
}: JobRowProps) => {
  const salary = formatSalary(job);
  const hasMatch = typeof match === "number" && match > 0;
  return (
    <article
      className={cn(
        "relative border bg-[color:var(--cc-cream)] p-5 md:p-6 transition-colors hover:bg-[color:var(--cc-cream-2)]",
        fitsPreferences
          ? "border-[color:var(--cc-ink)]"
          : "border-[color:var(--cc-hair-strong)]",
      )}
    >
      {fitsPreferences && (
        <span className="absolute top-0 left-0 h-full w-[3px] bg-[color:var(--cc-rust)]" />
      )}

      <div className="flex gap-4">
        <div className="hidden sm:flex w-14 h-14 border border-[color:var(--cc-hair-strong)] bg-[color:var(--cc-cream-2)] items-center justify-center flex-shrink-0">
          {job.logo ? (
            <img
              src={job.logo}
              alt={job.company}
              className="w-10 h-10 object-contain"
            />
          ) : (
            <Building2 className="w-5 h-5 text-[color:var(--cc-ash)]" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h3 className="cc-font-display text-xl md:text-2xl leading-[1.15] tracking-tight text-[color:var(--cc-ink)]">
                {job.title}
              </h3>
              <div className="mt-1 flex items-center gap-2 cc-label text-[color:var(--cc-ash)]">
                <Building2 className="w-3.5 h-3.5" />
                <span>{job.company}</span>
                <span>·</span>
                <MapPin className="w-3.5 h-3.5" />
                <span className="truncate">{job.location}</span>
              </div>
            </div>

            <div className="flex items-center gap-3 flex-shrink-0">
              {hasMatch && (
                <MatchMeter match={match!} band={band ?? "low"} reasons={reasons} />
              )}
              <button
                onClick={onToggleSave}
                className="p-2 border border-[color:var(--cc-hair-strong)] hover:border-[color:var(--cc-ink)] transition-colors"
                aria-label={isSaved ? "Unsave" : "Save"}
              >
                {isSaved ? (
                  <BookmarkCheck className="w-4 h-4 text-[color:var(--cc-rust)]" />
                ) : (
                  <Bookmark className="w-4 h-4 text-[color:var(--cc-ash)]" />
                )}
              </button>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {fitsPreferences && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 border border-[color:var(--cc-ink)] bg-[color:var(--cc-cream)] cc-label-sm text-[color:var(--cc-ink)]">
                <Star className="w-3 h-3 text-[color:var(--cc-rust)]" />
                {reasons && reasons.length > 0 ? reasons[0] : "Matches your profile"}
              </span>
            )}
            {salary && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 border border-[color:var(--cc-hair-strong)] bg-[color:var(--cc-cream-2)] cc-label-sm">
                <DollarSign className="w-3 h-3" />
                {salary}
              </span>
            )}
            {job.type && (
              <span className="px-2.5 py-1 border border-[color:var(--cc-hair-strong)] bg-[color:var(--cc-cream-2)] cc-label-sm">
                {job.type}
              </span>
            )}
            {job.isRemote && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 border border-[color:var(--cc-hair-strong)] bg-[color:var(--cc-cream-2)] cc-label-sm">
                <Globe className="w-3 h-3" />
                Remote
              </span>
            )}
            <span className="px-2.5 py-1 cc-label-sm text-[color:var(--cc-ash)]">
              via {SOURCE_NOTE[job.source?.toLowerCase()] || job.source}
            </span>
          </div>

          {job.description && (
            <p className="mt-4 cc-font-editorial text-[16px] leading-[1.5] text-[color:var(--cc-ink-soft)] line-clamp-2">
              {job.description}
            </p>
          )}

          {job.skills && job.skills.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {job.skills.slice(0, 5).map((skill, i) => (
                <span
                  key={i}
                  className="cc-label-sm text-[color:var(--cc-ash)] cc-tabular"
                >
                  · {skill}
                </span>
              ))}
              {job.skills.length > 5 && (
                <span className="cc-label-sm text-[color:var(--cc-ash)]">
                  + {job.skills.length - 5} more
                </span>
              )}
            </div>
          )}

          <div className="mt-5 pt-4 border-t border-[color:var(--cc-hair)] flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 cc-label-sm text-[color:var(--cc-ash)]">
              <Clock className="w-3.5 h-3.5" />
              {getTimeAgo(job.postedAt)}
            </span>
            <a
              href={job.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 cc-label text-[color:var(--cc-ink)] cc-link"
            >
              Apply now
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>
    </article>
  );
};
