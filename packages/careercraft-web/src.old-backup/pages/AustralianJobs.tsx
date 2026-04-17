import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useRateLimit } from "@/hooks/useSecurity";
import { usePersonalization } from "@/hooks/usePersonalization";
import { sanitize } from "@/lib/security/sanitizers";
import { auditLog } from "@/lib/security/auditLog";
import { RATE_LIMITS } from "@/lib/security/rateLimiter";
import { JobsDashboardLayout } from "@/components/job-market";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Zap,
  ChevronDown,
  Users,
  TrendingUp,
  TrendingDown,
  Bell,
  Settings,
  Sparkles,
  AlertTriangle,
  Plane,
  Star,
  Target,
  X,
  Heart,
  BarChart3,
} from "lucide-react";

// Australian cities for filtering
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

const ALERT_TYPES = [
  { id: "hiring", label: "Hiring Waves", icon: Users, description: "Get notified when companies are hiring in bulk" },
  { id: "layoffs", label: "Layoffs", icon: AlertTriangle, description: "Stay informed about workforce reductions" },
  { id: "salary", label: "Salary Changes", icon: DollarSign, description: "Track salary trends in your field" },
  { id: "remote", label: "Remote Work", icon: Globe, description: "New remote opportunities" },
  { id: "immigration", label: "Visa/Immigration", icon: Plane, description: "Visa sponsorship job alerts" },
  { id: "ai", label: "AI Impact", icon: Sparkles, description: "AI-related job market changes" },
];

interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  salary?: string;
  salaryMin?: number;
  salaryMax?: number;
  type: string;
  description: string;
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

export default function AustralianJobs() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("jobs");
  
  // Personalization hook
  const { 
    profile: userProfile, 
    loading: profileLoading,
    hasPersonalizationData,
    getPersonalizedJobQuery,
    getPersonalizedJobFilters,
    isJobRecommended,
    getPersonalizationSummary,
  } = usePersonalization();
  
  const [showPersonalized, setShowPersonalized] = useState(true);
  
  // Security - Rate limiting for API calls
  const { checkLimit: checkSearchLimit, isLimited: isSearchLimited } = useRateLimit({
    key: 'au-jobs-search',
    config: RATE_LIMITS.SEARCH,
    onLimitExceeded: (result) => {
      toast({
        title: "Too Many Requests",
        description: `Please wait ${result.retryAfter} seconds before searching again.`,
        variant: "destructive",
      });
    },
  });
  
  // Jobs state
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
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // AI Analysis state
  const [trendAnalysis, setTrendAnalysis] = useState<TrendAnalysis | null>(null);
  const [analyzingTrends, setAnalyzingTrends] = useState(false);

  // Preferences state
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES);
  const [savingPreferences, setSavingPreferences] = useState(false);

  // Apply personalized filters when profile loads
  useEffect(() => {
    if (hasPersonalizationData && !profileLoading) {
      const filters = getPersonalizedJobFilters();
      if (filters.location && filters.location !== 'australia') {
        setSelectedCity(filters.location);
      }
      if (filters.industry) {
        setSelectedIndustry(filters.industry);
      }
      if (filters.experienceLevel && filters.experienceLevel !== 'all') {
        setSelectedLevel(filters.experienceLevel);
      }
    }
  }, [hasPersonalizationData, profileLoading]);

  useEffect(() => {
    let mounted = true;
    
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      
      if (mounted) {
        loadUserPreferences(session.user.id);
        loadSavedJobs(session.user.id);
        
        // Wait for profile to load for personalized search
        // Use personalized query if available, otherwise default
        const searchTerm = hasPersonalizationData ? getPersonalizedJobQuery() : "developer";
        
        // Fetch jobs directly here to avoid stale closure
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
          if (data.error) {
            console.error("API Error:", data.error);
          }

          console.log("Jobs fetched:", data);
          setJobs(data.jobs || []);
          setStats(data.stats || null);
          setLastUpdated(new Date());
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
      }
    };
    
    init();
    return () => { mounted = false; };
  }, [navigate, toast, hasPersonalizationData]);

  const loadUserPreferences = async (userId: string) => {
    const saved = localStorage.getItem(`jobPreferences_${userId}`);
    if (saved) {
      const prefs = JSON.parse(saved);
      setPreferences(prefs);
      if (prefs.preferredCity) setSelectedCity(prefs.preferredCity);
    }
  };

  const saveUserPreferences = async () => {
    setSavingPreferences(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const prefsToSave = {
          ...preferences,
          preferredCity: selectedCity,
        };
        localStorage.setItem(`jobPreferences_${session.user.id}`, JSON.stringify(prefsToSave));
        toast({ title: "Preferences saved!", description: "Your job search preferences have been updated." });
      }
    } catch (error) {
      toast({ title: "Error saving preferences", variant: "destructive" });
    } finally {
      setSavingPreferences(false);
    }
  };

  const loadSavedJobs = async (userId: string) => {
    const saved = localStorage.getItem(`savedJobs_${userId}`);
    if (saved) setSavedJobs(JSON.parse(saved));
  };

  const fetchJobs = useCallback(async (reset = false) => {
    // Security: Check rate limit before making API call
    const rateLimitResult = checkSearchLimit();
    if (!rateLimitResult.allowed) {
      return; // Toast is shown by the hook
    }
    
    if (reset) {
      setLoading(true);
      setPage(1);
    } else {
      setLoadingMore(true);
    }

    try {
      const currentPage = reset ? 1 : page;
      
      // Security: Sanitize user input before sending to API
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
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      const newJobs = data.jobs || [];
      
      if (reset) {
        setJobs(newJobs);
      } else {
        setJobs(prev => [...prev, ...newJobs]);
      }
      
      setHasMore(newJobs.length >= 20);
      setStats(data.stats || null);
      setLastUpdated(new Date());
      
      // Security: Audit log the search
      auditLog({
        type: 'API_CALL',
        action: `Job search: ${sanitizedQuery}`,
        resource: 'au-jobs',
        details: { query: sanitizedQuery, city: selectedCity, page: currentPage },
        success: true,
      });
      
      if (!reset) setPage(p => p + 1);
      
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
  }, [searchQuery, selectedCity, selectedType, selectedLevel, selectedIndustry, page, toast, checkSearchLimit]);

  const analyzeJobTrends = async () => {
    if (jobs.length === 0) {
      toast({ title: "No jobs to analyze", description: "Search for jobs first", variant: "destructive" });
      return;
    }

    setAnalyzingTrends(true);
    try {
      const jobSummary = jobs.slice(0, 15).map(j => 
        `${j.title} at ${j.company}${j.salary ? ` - ${j.salary}` : ''}${j.location ? ` in ${j.location}` : ''}`
      ).join("\n");
      
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
      toast({ title: "Analysis complete!", description: "AI insights are ready" });
    } catch (error: any) {
      console.error("Error analyzing trends:", error);
      toast({ title: "Analysis failed", description: error.message, variant: "destructive" });
    } finally {
      setAnalyzingTrends(false);
    }
  };

  const toggleSaveJob = async (jobId: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    let newSaved: string[];
    if (savedJobs.includes(jobId)) {
      newSaved = savedJobs.filter(id => id !== jobId);
    } else {
      newSaved = [...savedJobs, jobId];
    }
    setSavedJobs(newSaved);
    localStorage.setItem(`savedJobs_${session.user.id}`, JSON.stringify(newSaved));
  };

  const toggleAlert = (alertId: string) => {
    setPreferences(prev => ({
      ...prev,
      alerts: { ...prev.alerts, [alertId]: !prev.alerts[alertId] }
    }));
  };

  const handleSearch = () => {
    fetchJobs(true);
  };

  const formatSalary = (job: Job) => {
    if (job.salary) return job.salary;
    if (job.salaryMin && job.salaryMax) {
      return `$${(job.salaryMin / 1000).toFixed(0)}k - $${(job.salaryMax / 1000).toFixed(0)}k`;
    }
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

  const getSourceColor = (source: string) => {
    switch (source.toLowerCase()) {
      case "seek": return "bg-purple-500/10 text-purple-600 border-purple-500/20";
      case "indeed": return "bg-blue-500/10 text-blue-600 border-blue-500/20";
      case "linkedin": return "bg-sky-500/10 text-sky-600 border-sky-500/20";
      case "jora": return "bg-orange-500/10 text-orange-600 border-orange-500/20";
      default: return "bg-gray-500/10 text-gray-600 border-gray-500/20";
    }
  };

  const savedJobsList = jobs.filter(job => savedJobs.includes(job.id));

  // Compute job match scores and sort - matching jobs first, then others
  const sortedJobs = useMemo(() => {
    if (!hasPersonalizationData) {
      return jobs.map(job => ({ ...job, fitsPreferences: false }));
    }
    
    const jobsWithScore = jobs.map(job => {
      const result = isJobRecommended({
        title: job.title,
        company: job.company,
        salary: job.salary,
        salaryMin: job.salaryMin,
        salaryMax: job.salaryMax,
        location: job.location,
        type: job.type,
        skills: job.skills,
        isRemote: job.isRemote,
      });
      
      return {
        ...job,
        fitsPreferences: result.isRecommended && result.score >= 20,
        matchScore: result.score,
      };
    });
    
    // Sort: matching jobs first (by score), then others
    return jobsWithScore.sort((a, b) => {
      if (a.fitsPreferences && !b.fitsPreferences) return -1;
      if (!a.fitsPreferences && b.fitsPreferences) return 1;
      if (a.fitsPreferences && b.fitsPreferences) return b.matchScore - a.matchScore;
      return 0;
    });
  }, [jobs, hasPersonalizationData, isJobRecommended]);
  
  const matchingJobsCount = sortedJobs.filter(j => j.fitsPreferences).length;

  return (
    <JobsDashboardLayout
      activeTab={activeTab}
      onTabChange={setActiveTab}
      onRefresh={() => fetchJobs(true)}
      isLoading={loading}
      stats={stats}
      savedJobsCount={savedJobs.length}
    >
      <div className="space-y-6">
        {/* JOBS TAB */}
        {activeTab === "jobs" && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {/* Search & Filters */}
              <Card className="p-4 md:p-6 bg-gradient-to-r from-card to-card/50">
                <div className="flex flex-col gap-4">
                  {/* Search Row */}
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex-1 relative">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Job title, skills, or company..."
                        className="pl-12 h-12 text-base bg-background"
                        onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                      />
                    </div>
                    <Button onClick={handleSearch} disabled={loading} className="h-12 px-8 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700">
                      {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5 mr-2" />}
                      Search Jobs
                    </Button>
                  </div>

                  {/* Filters Row */}
                  <div className="flex flex-wrap gap-3">
                    <Select value={selectedCity} onValueChange={setSelectedCity}>
                      <SelectTrigger className="w-[180px] bg-background">
                        <MapPin className="w-4 h-4 mr-2 text-muted-foreground" />
                        <SelectValue placeholder="Location" />
                      </SelectTrigger>
                      <SelectContent>
                        {AU_CITIES.map(city => (
                          <SelectItem key={city.value} value={city.value}>{city.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select value={selectedType} onValueChange={setSelectedType}>
                      <SelectTrigger className="w-[150px] bg-background">
                        <Briefcase className="w-4 h-4 mr-2 text-muted-foreground" />
                        <SelectValue placeholder="Job Type" />
                      </SelectTrigger>
                      <SelectContent>
                        {JOB_TYPES.map(type => (
                          <SelectItem key={type.value} value={type.value}>{type.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select value={selectedLevel} onValueChange={setSelectedLevel}>
                      <SelectTrigger className="w-[160px] bg-background">
                        <Users className="w-4 h-4 mr-2 text-muted-foreground" />
                        <SelectValue placeholder="Experience" />
                      </SelectTrigger>
                      <SelectContent>
                        {EXPERIENCE_LEVELS.map(level => (
                          <SelectItem key={level.value} value={level.value}>{level.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select value={selectedIndustry || "all"} onValueChange={(v) => setSelectedIndustry(v === "all" ? "" : v)}>
                      <SelectTrigger className="w-[160px] bg-background">
                        <Target className="w-4 h-4 mr-2 text-muted-foreground" />
                        <SelectValue placeholder="Industry" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Industries</SelectItem>
                        {INDUSTRIES.map(ind => (
                          <SelectItem key={ind} value={ind}>{ind}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {(selectedCity !== "australia" || selectedType !== "all" || selectedLevel !== "all" || selectedIndustry) && (
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => {
                          setSelectedCity("australia");
                          setSelectedType("all");
                          setSelectedLevel("all");
                          setSelectedIndustry("");
                        }}
                        className="text-muted-foreground"
                      >
                        <X className="w-4 h-4 mr-1" />
                        Clear
                      </Button>
                    )}
                  </div>
                </div>
              </Card>

              {/* Quick Stats Bar */}
              {stats && !loading && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Card className="p-4 bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-emerald-500/20">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                        <Briefcase className="w-5 h-5 text-emerald-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{stats.totalJobs.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">Active Jobs</p>
                      </div>
                    </div>
                  </Card>
                  <Card className="p-4 bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                        <DollarSign className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{stats.avgSalary}</p>
                        <p className="text-xs text-muted-foreground">Avg Salary</p>
                      </div>
                    </div>
                  </Card>
                  <Card className="p-4 bg-gradient-to-br from-purple-500/10 to-purple-500/5 border-purple-500/20">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{stats.topCompanies?.length || 50}+</p>
                        <p className="text-xs text-muted-foreground">Companies</p>
                      </div>
                    </div>
                  </Card>
                  <Card className="p-4 bg-gradient-to-br from-amber-500/10 to-amber-500/5 border-amber-500/20">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
                        <Zap className="w-5 h-5 text-amber-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{stats.hotSkills?.length || 10}+</p>
                        <p className="text-xs text-muted-foreground">Hot Skills</p>
                      </div>
                    </div>
                  </Card>
                </div>
              )}

              {/* Personalization Info */}
              {hasPersonalizationData && !loading && matchingJobsCount > 0 && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Star className="w-4 h-4 text-emerald-500" />
                  <span><strong className="text-foreground">{matchingJobsCount}</strong> jobs fit your preferences</span>
                  <span className="text-xs">•</span>
                  <button 
                    onClick={() => navigate('/settings')}
                    className="text-primary hover:underline text-xs"
                  >
                    Edit profile
                  </button>
                </div>
              )}

              {/* Profile Setup Prompt */}
              {!hasPersonalizationData && !profileLoading && !loading && (
                <Card className="p-3 bg-muted/50 border-dashed">
                  <div className="flex items-center justify-between gap-4">
                    <p className="text-sm text-muted-foreground">
                      <Star className="w-4 h-4 inline mr-1 text-amber-500" />
                      Complete your profile to see which jobs fit your preferences
                    </p>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => navigate('/settings')}
                    >
                      Setup Profile
                    </Button>
                  </div>
                </Card>
              )}

              {/* Job Listings */}
              {loading ? (
                <div className="space-y-4">
                  {[...Array(6)].map((_, i) => (
                    <Card key={i} className="p-6">
                      <div className="flex gap-4">
                        <Skeleton className="w-14 h-14 rounded-xl" />
                        <div className="flex-1 space-y-3">
                          <Skeleton className="h-6 w-3/4" />
                          <Skeleton className="h-4 w-1/2" />
                          <div className="flex gap-2">
                            <Skeleton className="h-6 w-20" />
                            <Skeleton className="h-6 w-24" />
                            <Skeleton className="h-6 w-16" />
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {sortedJobs.map((job) => (
                    <JobCard 
                      key={job.id} 
                      job={job} 
                      isSaved={savedJobs.includes(job.id)}
                      onToggleSave={() => toggleSaveJob(job.id)}
                      formatSalary={formatSalary}
                      getTimeAgo={getTimeAgo}
                      getSourceColor={getSourceColor}
                      fitsPreferences={job.fitsPreferences}
                    />
                  ))}

                  {/* Load More */}
                  {jobs.length > 0 && hasMore && (
                    <div className="flex justify-center pt-4">
                      <Button 
                        variant="outline" 
                        size="lg"
                        onClick={() => fetchJobs(false)}
                        disabled={loadingMore}
                        className="px-8"
                      >
                        {loadingMore ? (
                          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        ) : (
                          <ChevronDown className="w-5 h-5 mr-2" />
                        )}
                        Load More Jobs
                      </Button>
                    </div>
                  )}

                  {/* Empty State */}
                  {!loading && jobs.length === 0 && (
                    <Card className="p-12 text-center">
                      <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                        <Briefcase className="w-8 h-8 text-muted-foreground" />
                      </div>
                      <h3 className="text-xl font-semibold mb-2">No jobs found</h3>
                      <p className="text-muted-foreground mb-4">Try adjusting your search or filters</p>
                      <Button onClick={() => {
                        setSearchQuery("");
                        setSelectedCity("australia");
                        setSelectedType("all");
                        setSelectedLevel("all");
                        setSelectedIndustry("");
                        fetchJobs(true);
                      }}>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Reset & Search Again
                      </Button>
                    </Card>
                  )}
                </div>
              )}
          </div>
        )}

        {/* SAVED JOBS TAB */}
        {activeTab === "saved" && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {savedJobsList.length > 0 ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold">{savedJobsList.length} Saved Jobs</h2>
                  </div>
                  {savedJobsList.map((job) => (
                    <JobCard 
                      key={job.id} 
                      job={job} 
                      isSaved={true}
                      onToggleSave={() => toggleSaveJob(job.id)}
                      formatSalary={formatSalary}
                      getTimeAgo={getTimeAgo}
                      getSourceColor={getSourceColor}
                    />
                  ))}
                </div>
              ) : (
                <Card className="p-12 text-center">
                  <Heart className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold">No saved jobs yet</h3>
                  <p className="text-muted-foreground mb-4">Click the bookmark icon on any job to save it here</p>
                  <Button onClick={() => setActiveTab("jobs")}>
                    <Briefcase className="w-4 h-4 mr-2" />
                    Browse Jobs
                  </Button>
                </Card>
              )}
          </div>
        )}

        {/* AI ANALYSIS TAB */}
        {activeTab === "analysis" && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {trendAnalysis ? (
                <>
                  {/* What This Means For You */}
                  <Card className="p-6 bg-gradient-to-br from-emerald-500/5 to-teal-500/10 border-emerald-500/20">
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-emerald-500" />What This Means For You
                    </h3>
                    <p className="text-muted-foreground">{trendAnalysis.whatThisMeansForYou}</p>
                  </Card>

                  {/* Hot Skills */}
                  {trendAnalysis.hotSkills && trendAnalysis.hotSkills.length > 0 && (
                    <Card className="p-6">
                      <h3 className="font-semibold mb-4 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-emerald-500" />Hot Skills in Demand
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {trendAnalysis.hotSkills.map((skill, i) => (
                          <Badge key={i} className="text-sm py-1 px-3 bg-emerald-500/10 text-emerald-600 border-emerald-500/20">{skill}</Badge>
                        ))}
                      </div>
                    </Card>
                  )}

                  {/* Salary Trends */}
                  {trendAnalysis.salaryTrends && (
                    <Card className="p-6">
                      <h3 className="font-semibold mb-4 flex items-center gap-2">
                        <DollarSign className="w-5 h-5 text-amber-500" />Salary Trends
                      </h3>
                      <div className="grid md:grid-cols-3 gap-4">
                        <div className="text-center p-4 bg-muted/50 rounded-lg">
                          {trendAnalysis.salaryTrends.direction === "up" ? (
                            <TrendingUp className="w-8 h-8 mx-auto mb-2 text-emerald-500" />
                          ) : (
                            <TrendingDown className="w-8 h-8 mx-auto mb-2 text-red-500" />
                          )}
                          <p className="text-2xl font-bold">{trendAnalysis.salaryTrends.averageChange}</p>
                          <p className="text-sm text-muted-foreground">Average Change</p>
                        </div>
                        <div className="md:col-span-2 p-4 bg-muted/50 rounded-lg">
                          <p className="text-sm font-medium mb-2">Top Paying Roles</p>
                          <div className="flex flex-wrap gap-2">
                            {trendAnalysis.salaryTrends.topPayingRoles?.map((role, i) => (
                              <Badge key={i} variant="secondary">{role}</Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    </Card>
                  )}

                  {/* Market Trends */}
                  <Card className="p-6">
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                      <BarChart3 className="w-5 h-5 text-blue-500" />Market Trends
                    </h3>
                    <div className="space-y-4">
                      {trendAnalysis.trends?.map((trend, i) => (
                        <div key={i} className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                          {trend.direction === "up" ? (
                            <TrendingUp className="w-6 h-6 text-emerald-500" />
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
                      {trendAnalysis.insights?.map((insight, i) => (
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
                      {trendAnalysis.predictions?.map((pred, i) => (
                        <div key={i} className="flex items-start gap-4 p-4 bg-muted/50 rounded-lg">
                          <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                            <span className="text-sm font-bold text-emerald-600">{pred.likelihood}%</span>
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
                  <h3 className="text-lg font-semibold">No analysis yet</h3>
                  <p className="text-muted-foreground mb-4">Search for jobs first, then click "AI Insights" to analyze market trends</p>
                  <Button onClick={analyzeJobTrends} disabled={jobs.length === 0 || analyzingTrends}>
                    {analyzingTrends ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                    Analyze Current Jobs
                  </Button>
                </Card>
              )}
          </div>
        )}

        {/* ALERTS & PREFERENCES TAB */}
        {activeTab === "alerts" && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Alert Types */}
              <Card className="p-6">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Bell className="w-5 h-5 text-emerald-500" />Job Alert Types
                </h3>
                <p className="text-sm text-muted-foreground mb-4">Get notified about important job market changes</p>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {ALERT_TYPES.map(alert => (
                    <div key={alert.id} className="flex items-start gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
                        <alert.icon className="w-5 h-5 text-emerald-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium">{alert.label}</span>
                          <Switch 
                            checked={preferences.alerts[alert.id] || false} 
                            onCheckedChange={() => toggleAlert(alert.id)} 
                          />
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{alert.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Notification Preferences */}
              <Card className="p-6">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Settings className="w-5 h-5 text-emerald-500" />Notification Settings
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <span className="font-medium">Email Notifications</span>
                      <p className="text-sm text-muted-foreground">Receive job alerts via email</p>
                    </div>
                    <Switch 
                      checked={preferences.emailNotifications} 
                      onCheckedChange={(v) => setPreferences(p => ({ ...p, emailNotifications: v }))} 
                    />
                  </div>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <span className="font-medium">Push Notifications</span>
                      <p className="text-sm text-muted-foreground">Get instant browser notifications</p>
                    </div>
                    <Switch 
                      checked={preferences.pushNotifications} 
                      onCheckedChange={(v) => setPreferences(p => ({ ...p, pushNotifications: v }))} 
                    />
                  </div>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <span className="font-medium">Summary Frequency</span>
                      <p className="text-sm text-muted-foreground">How often to receive job summaries</p>
                    </div>
                    <Select 
                      value={preferences.summaryFrequency} 
                      onValueChange={(v) => setPreferences(p => ({ ...p, summaryFrequency: v }))}
                    >
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

              {/* Search Preferences */}
              <Card className="p-6">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Target className="w-5 h-5 text-emerald-500" />Default Search Preferences
                </h3>
                <p className="text-sm text-muted-foreground mb-4">Set your preferred location and industries for faster searching</p>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Preferred Location</label>
                    <Select value={selectedCity} onValueChange={setSelectedCity}>
                      <SelectTrigger className="bg-background">
                        <MapPin className="w-4 h-4 mr-2 text-muted-foreground" />
                        <SelectValue placeholder="Select city" />
                      </SelectTrigger>
                      <SelectContent>
                        {AU_CITIES.map(city => (
                          <SelectItem key={city.value} value={city.value}>{city.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Preferred Industry</label>
                    <Select value={selectedIndustry || "all"} onValueChange={(v) => setSelectedIndustry(v === "all" ? "" : v)}>
                      <SelectTrigger className="bg-background">
                        <Target className="w-4 h-4 mr-2 text-muted-foreground" />
                        <SelectValue placeholder="Select industry" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Industries</SelectItem>
                        {INDUSTRIES.map(ind => (
                          <SelectItem key={ind} value={ind}>{ind}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </Card>

            <Button 
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-600" 
              onClick={saveUserPreferences}
              disabled={savingPreferences}
            >
              {savingPreferences ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Settings className="w-4 h-4 mr-2" />}
              Save All Preferences
            </Button>
          </div>
        )}
      </div>
    </JobsDashboardLayout>
  );
}

// Job Card Component
function JobCard({ 
  job, 
  isSaved, 
  onToggleSave, 
  formatSalary, 
  getTimeAgo, 
  getSourceColor,
  fitsPreferences = false,
}: { 
  job: Job; 
  isSaved: boolean; 
  onToggleSave: () => void;
  formatSalary: (job: Job) => string | null;
  getTimeAgo: (date: string) => string;
  getSourceColor: (source: string) => string;
  fitsPreferences?: boolean;
}) {
  return (
    <Card className="p-5 md:p-6 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 group border-transparent hover:border-primary/20">
      <div className="flex gap-4">
        {/* Company Logo */}
        <div className="hidden sm:flex w-14 h-14 rounded-xl bg-gradient-to-br from-muted to-muted/50 items-center justify-center shrink-0 group-hover:from-primary/10 group-hover:to-primary/5 transition-colors">
          {job.logo ? (
            <img src={job.logo} alt={job.company} className="w-10 h-10 rounded-lg object-contain" />
          ) : (
            <Building2 className="w-6 h-6 text-muted-foreground" />
          )}
        </div>

        {/* Job Details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4 mb-2">
            <div>
              <h3 className="font-semibold text-lg group-hover:text-primary transition-colors line-clamp-1">
                {job.title}
              </h3>
              <p className="text-muted-foreground flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                {job.company}
              </p>
            </div>
            <button 
              onClick={onToggleSave} 
              className="shrink-0 p-2 rounded-lg hover:bg-muted transition-colors"
            >
              {isSaved ? (
                <BookmarkCheck className="w-5 h-5 text-primary" />
              ) : (
                <Bookmark className="w-5 h-5 text-muted-foreground hover:text-primary" />
              )}
            </button>
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-2 mb-3">
            {fitsPreferences && (
              <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 flex items-center gap-1">
                <Star className="w-3 h-3" />
                Fits your preferences
              </Badge>
            )}
            <Badge variant="outline" className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {job.location}
            </Badge>
            {formatSalary(job) && (
              <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 flex items-center gap-1">
                <DollarSign className="w-3 h-3" />
                {formatSalary(job)}
              </Badge>
            )}
            {job.type && (
              <Badge variant="secondary">{job.type}</Badge>
            )}
            {job.isRemote && (
              <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20 flex items-center gap-1">
                <Globe className="w-3 h-3" />
                Remote
              </Badge>
            )}
            <Badge variant="outline" className={getSourceColor(job.source)}>
              {job.source}
            </Badge>
          </div>

          {/* Description */}
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
            {job.description}
          </p>

          {/* Skills */}
          {job.skills && job.skills.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {job.skills.slice(0, 5).map((skill, i) => (
                <span key={i} className="text-xs px-2 py-1 rounded-md bg-muted text-muted-foreground">
                  {skill}
                </span>
              ))}
              {job.skills.length > 5 && (
                <span className="text-xs px-2 py-1 text-muted-foreground">
                  +{job.skills.length - 5} more
                </span>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {getTimeAgo(job.postedAt)}
            </span>
            <a 
              href={job.url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
            >
              Apply Now
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>
    </Card>
  );
}
