import { useState, useMemo, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { IntelligenceProvider, useIntelligence } from "@/contexts/IntelligenceContext";
import { useJobCounts } from "@/hooks/useJobCounts";
import { useAgenticRAG, type Contradiction, type GraphConnection } from "@/hooks/useAgenticRAG";
import { useRAGMetadata } from "@/hooks/useRAGMetadata";
import { DocumentIntelligenceVisualizer, AIInsightsPanel } from "@/components/intelligence";
import { transformSearchResultsToVisualizationData } from "@/lib/intelligence/visualizationData";
import { AstralShell } from "@/components/astral";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  TrendingUp,
  TrendingDown,
  Zap,
  AlertTriangle,
  ArrowUpRight,
  Briefcase,
  GraduationCap,
  DollarSign,
  MapPin,
  Sparkles,
  Target,
  Activity,
  BarChart3,
  Brain,
  MessageSquare,
  Wrench,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { LineChart as RechartsLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, BarChart, Bar } from "recharts";
import { usePersonalization } from "@/hooks/usePersonalization";
import { MatchMeter } from "@/components/craft/MatchMeter";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } }
};

const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0 }
};

function MarketTrendsContent() {
  const navigate = useNavigate();
  const [timeRange, setTimeRange] = useState("90");

  // Personalisation — rate roles & skills against the visitor's profile.
  const { hasPersonalizationData, scoreArticle, scoreSkill } = usePersonalization();

  // Connect to RAG Intelligence - FULL POWER!
  const { 
    careerOpportunities, 
    skillsDemand, 
    fundingAllocations, 
    globalLoading: dataLoading 
  } = useIntelligence();

  // Fetch live job counts for emerging roles
  const emergingSectors = useMemo(() => {
    const sectors = new Set<string>();
    careerOpportunities
      .filter(c => c.demand && (c.demand === 'high' || c.demand === 'medium'))
      .forEach(c => {
        if (c.sector) sectors.add(c.sector);
      });
    return Array.from(sectors);
  }, [careerOpportunities]);
  
  const { getJobCount, getJobUrl } = useJobCounts(emergingSectors);

  // ========================================================================
  // AGENTIC RAG - Graph connections, intersection reasoning, contradictions
  // ========================================================================
  const { sendMessage: sendMarketMsg, messages: agenticMessages, isStreaming } = useAgenticRAG('market');
  const { semanticSearch } = useRAGMetadata();
  const agenticFetchDone = useRef(false);
  
  // State for agentic data
  const [chartSources, setChartSources] = useState<any[]>([]);
  const [chartVisualizationData, setChartVisualizationData] = useState<any>(null);
  const [contradictions, setContradictions] = useState<Contradiction[]>([]);
  const [graphConnections, setGraphConnections] = useState<GraphConnection[]>([]);
  const [loadingCharts, setLoadingCharts] = useState(false);

  // Fire agentic RAG query on mount to enrich market trends with graph data
  useEffect(() => {
    if (agenticFetchDone.current || dataLoading) return;
    agenticFetchDone.current = true;
    
    const fetchAgenticData = async () => {
      setLoadingCharts(true);
      try {
        // Semantic search for market trend documents
        const searchResult = await semanticSearch(
          "market trends workforce growth declining industries skills demand South Australia employment",
          { category: "workforce" },
          { topK: 20, timeAwareRanking: true }
        );
        
        if (searchResult?.sources && searchResult.sources.length > 0) {
          setChartSources(searchResult.sources);
          
          // Transform to visualization data
          const vizData = transformSearchResultsToVisualizationData(searchResult.sources);
          setChartVisualizationData(vizData);
        }
        
        // Also send agentic query for deeper insights
        await sendMarketMsg("What are the key market trends, emerging industries, and workforce shifts in South Australia? Include any contradictions or gaps in the data.");
      } catch (error) {
        console.error("[MarketTrends] Agentic fetch error:", error);
      } finally {
        setLoadingCharts(false);
      }
    };
    
    fetchAgenticData();
  }, [dataLoading, semanticSearch, sendMarketMsg]);

  // Extract contradictions and connections from agentic messages
  useEffect(() => {
    const lastMsg = agenticMessages[agenticMessages.length - 1];
    if (lastMsg?.role === "assistant" && !lastMsg.isLoading) {
      if (lastMsg.contradictions && lastMsg.contradictions.length > 0) {
        setContradictions(lastMsg.contradictions);
      }
      if (lastMsg.graphConnections && lastMsg.graphConnections.length > 0) {
        setGraphConnections(lastMsg.graphConnections);
      }
    }
  }, [agenticMessages]);

  // Fetch intersection reasoning when sources are available
  useEffect(() => {
    const fetchIntersections = async () => {
      if (chartSources.length < 2) return;
      
      const { supabase } = await import('@/integrations/supabase/client');
      try {
        const queryResults = chartSources.slice(0, 10).map(s => ({
          query: "market trends",
          results: [{
            documentId: s.documentId || s.id,
            title: s.title,
            content: s.content || s.snippet,
            category: s.category,
          }]
        }));

        const { data, error } = await supabase.functions.invoke('azure-graph-proxy', {
          body: {
            functionName: 'intersection-reasoning',
            queryResults,
            originalQuery: "market trends analysis",
            saveFindings: false,
          },
        });

        if (error) throw error;

        if (data?.contradictions?.length > 0) {
          setContradictions(prev => [...prev, ...data.contradictions]);
        }
        if (data?.connections?.length > 0) {
          setGraphConnections(prev => [...prev, ...data.connections]);
        }
      } catch (error) {
        console.error("[MarketTrends] Intersection reasoning error:", error);
      }
    };
    
    fetchIntersections();
  }, [chartSources]);

  // Check if data is available
  const hasData = careerOpportunities.length > 0 || skillsDemand.length > 0;
  
  console.log('[MarketTrends] Data check:', {
    careersCount: careerOpportunities.length,
    skillsCount: skillsDemand.length,
    hasData,
    sampleCareer: careerOpportunities[0],
    sampleSkill: skillsDemand[0]
  });

  // Calculate real emerging roles from intelligence data
  // VERY RELAXED FILTERING: Show ANY career, even with minimal data
  const realEmergingRoles = useMemo(() => {
    if (careerOpportunities.length === 0) return [];
    
    // Filter for careers - show any career that exists, prioritize ones with data
    const filtered = careerOpportunities
      .filter(c => {
        // Include ALL careers, but prioritize those with data
        return true;
      })
      .sort((a, b) => {
        // Sort by growth first (if available), then by jobs, then alphabetically
        if (a.growth && b.growth) return (b.growth as number) - (a.growth as number);
        if (a.growth) return -1;
        if (b.growth) return 1;
        if ((a.jobs || 0) !== (b.jobs || 0)) return (b.jobs || 0) - (a.jobs || 0);
        return a.occupation.localeCompare(b.occupation);
      })
      .slice(0, 12) // Show more careers since we're including all
      .map(career => ({
        title: career.occupation,
        growth: career.growth !== undefined && typeof career.growth === 'number' 
          ? `${career.growth > 0 ? '+' : ''}${career.growth}%` 
          : 'N/A',
        demand: career.demand === 'high' ? 'High' : career.demand === 'medium' ? 'Medium' : career.demand === 'low' ? 'Low' : 'Unknown',
        salary: career.salary || "$85K",
        category: career.sector || "General",
        jobCount: career.jobs || 0
      }));
    
    console.log('[MarketTrends] Emerging roles:', filtered.length, filtered);
    return filtered;
  }, [careerOpportunities, hasData]);

  // Calculate real skills trending from intelligence data
  // VERY RELAXED FILTERING: Show ANY skill
  const realSkillsTrending = useMemo(() => {
    if (skillsDemand.length === 0) return [];
    
    const filtered = skillsDemand
      .filter(s => {
        // Include ALL skills
        return true;
      })
      .sort((a, b) => {
        // Sort by demand first, then by growth
        if (a.demand && b.demand) return (b.demand as number) - (a.demand as number);
        if (a.demand) return -1;
        if (b.demand) return 1;
        if (a.growth && b.growth) return (b.growth as number) - (a.growth as number);
        return 0;
      })
      .slice(0, 8)
      .map(skill => ({
        name: skill.name,
        growth: skill.growth !== undefined && typeof skill.growth === 'number'
          ? `${skill.growth > 0 ? '+' : ''}${skill.growth}%`
          : skill.growth !== undefined ? `${skill.growth}%` : 'N/A',
        category: skill.category || "technical",
        demandLevel: skill.demand && typeof skill.demand === 'number'
          ? skill.demand > 70 ? "High" : skill.demand > 50 ? "Medium" : "Low"
          : "Unknown"
      }));
    
    console.log('[MarketTrends] Skills trending:', filtered.length, filtered);
    return filtered;
  }, [skillsDemand, hasData]);

  // Calculate total jobs from careers
  const totalActiveJobs = useMemo(() => {
    if (careerOpportunities.length === 0) return 0;
    return careerOpportunities.reduce((sum, c) => sum + (c.jobs || 0), 0);
  }, [careerOpportunities]);

  // Calculate average growth
  const avgGrowthRate = useMemo(() => {
    if (careerOpportunities.length === 0) return "0.0";
    const growthValues = careerOpportunities
      .map(c => c.growth)
      .filter(g => typeof g === 'number')
      .map(g => g);
    return growthValues.length > 0
      ? (growthValues.reduce((a, b) => a + b, 0) / growthValues.length).toFixed(1)
      : "0.0";
  }, [careerOpportunities]);

  // Generate trend data from real data (for charts)
  const trendData = useMemo(() => {
    // Group careers by month or use aggregated data
    // For now, return empty array - charts will show maintenance message
    return [];
  }, []);

  // Calculate declining roles from real data
  const decliningRoles = useMemo(() => {
    if (careerOpportunities.length === 0) return [];
    const filtered = careerOpportunities
      .filter(c => c.growth && typeof c.growth === 'number' && c.growth < 0)
      .sort((a, b) => (a.growth || 0) - (b.growth || 0))
      .slice(0, 4)
      .map(career => ({
        title: career.occupation,
        decline: `${career.growth}%`,
        risk: Math.abs(career.growth || 0) > 20 ? "High" : "Medium",
        reason: "Market shift"
      }));
    console.log('[MarketTrends] Declining roles:', filtered.length, filtered);
    return filtered;
  }, [careerOpportunities, hasData]);

  // Calculate regional shortages from real data (if location data available)
  const regionalShortages = useMemo(() => {
    // Group by location if available, otherwise return empty
    return [];
  }, []);

  // Loading state
  if (dataLoading) {
    return (
      <AstralShell
        title={<span className="as-gradient-text">Market Trends</span>}
        subtitle="Reading the signals"
        backTo="/dashboard"
      >
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center min-h-[60vh] p-8"
        >
          <div className="rounded-2xl border border-pink-400/40 bg-gradient-to-br from-pink-500/20 via-purple-500/15 to-blue-500/20 backdrop-blur-xl shadow-xl shadow-pink-500/20 relative overflow-hidden max-w-md w-full p-8">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-pink-400/20 to-purple-400/20 rounded-full blur-2xl opacity-50 animate-pulse" />
            <div className="relative z-10 text-center">
              <div className="flex justify-center mb-4">
                <div className="p-4 rounded-full bg-gradient-to-br from-pink-500/40 to-purple-500/40 backdrop-blur-sm border border-pink-400/50 animate-spin">
                  <Activity className="w-8 h-8 text-white" />
                </div>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2 drop-shadow-lg">Loading Market Intelligence</h2>
              <p className="text-pink-100 mb-4">
                Processing workforce trends, skills demand, and market signals from government data...
              </p>
              <div className="flex items-center justify-center gap-2 text-sm text-pink-200">
                <div className="w-2 h-2 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        </motion.div>
      </AstralShell>
    );
  }

  // Debug logging
  console.log('[MarketTrends] Render state:', {
    dataLoading,
    hasData,
    careersCount: careerOpportunities.length,
    skillsCount: skillsDemand.length,
    emergingRolesCount: realEmergingRoles.length,
    skillsTrendingCount: realSkillsTrending.length,
    decliningRolesCount: decliningRoles.length,
    sampleCareer: careerOpportunities[0],
    sampleSkill: skillsDemand[0],
    allCareers: careerOpportunities.slice(0, 5).map(c => ({ 
      occupation: c.occupation, 
      growth: c.growth, 
      jobs: c.jobs, 
      demand: c.demand 
    }))
  });

  // Show maintenance message ONLY if we're not loading AND truly have no data
  // If we have data but filtered results are empty, still show the page (it will show "no data" in sections)
  if (!dataLoading && careerOpportunities.length === 0 && skillsDemand.length === 0) {
    return (
      <AstralShell
        title={<span className="as-gradient-text">Market Trends</span>}
        subtitle="Awaiting signal"
        backTo="/dashboard"
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center min-h-[60vh] p-8"
        >
          <div className="rounded-2xl border border-red-400/40 bg-gradient-to-br from-red-500/20 via-orange-500/15 to-red-500/20 backdrop-blur-xl shadow-xl shadow-red-500/20 relative overflow-hidden max-w-md w-full p-8">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-red-400/20 to-orange-400/20 rounded-full blur-2xl opacity-50" />
            <div className="relative z-10 text-center">
              <div className="flex justify-center mb-4">
                <div className="p-4 rounded-full bg-gradient-to-br from-red-500/40 to-orange-500/40 backdrop-blur-sm border border-red-400/50">
                  <Wrench className="w-8 h-8 text-white" />
                </div>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2 drop-shadow-lg">Under Maintenance</h2>
              <p className="text-red-100 mb-4">
                Market trend data is currently unavailable. Our intelligence system is being updated with the latest government workforce and market data.
              </p>
              <div className="flex items-center justify-center gap-2 text-sm text-red-200">
                <AlertCircle className="w-4 h-4" />
                <span>Please check back shortly</span>
              </div>
            </div>
          </div>
        </motion.div>
      </AstralShell>
    );
  }

  return (
    <AstralShell
      title={<span className="as-gradient-text">Market Trends</span>}
      subtitle={`${careerOpportunities.length} careers · ${skillsDemand.length} skills · RAG analytics`}
      backTo="/dashboard"
    >
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="space-y-8"
      >
        {/* Header - ULTRA VIBRANT */}
        <motion.div variants={item}>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-pink-500/40 via-purple-500/40 to-blue-500/40 backdrop-blur-sm border border-pink-400/50 shadow-lg shadow-pink-500/20 relative">
                <Activity className="w-6 h-6 text-white relative z-10" />
                <div className="absolute inset-0 bg-gradient-to-br from-pink-400/30 to-purple-400/30 rounded-xl blur-sm opacity-50"></div>
              </div>
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h1 className="font-display text-4xl font-bold bg-gradient-to-r from-pink-400 via-purple-400 to-blue-400 bg-clip-text text-transparent drop-shadow-lg">
                    Market Trends
                  </h1>
                  <Badge className="bg-emerald-500/30 text-emerald-100 border-emerald-400/50 backdrop-blur-sm shadow-md">
                    <span className="w-2 h-2 bg-emerald-400 rounded-full mr-1.5 animate-pulse" />
                    <span className="font-semibold">LIVE</span>
                  </Badge>
                </div>
                <p className="text-sm text-slate-300 flex items-center gap-2 mt-1">
                  <span className="font-semibold text-pink-300">{careerOpportunities.length}</span> careers •
                  <span className="font-semibold text-purple-300">{skillsDemand.length}</span> skills •
                  <Sparkles className="w-3.5 h-3.5 text-pink-400" />
                  <span className="font-semibold text-blue-300">RAG Analytics</span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-gradient-to-r from-pink-500/30 to-purple-500/30 text-white border-pink-400/50 gap-1 px-3 py-1.5 hover-lift backdrop-blur-sm shadow-md">
                <Brain className="w-3.5 h-3.5" />
                <span className="font-semibold">AI Forecasting</span>
              </Badge>
              <div className="flex gap-2">
                {["30", "90", "180"].map((days) => (
                  <Button
                    key={days}
                    variant={timeRange === days ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTimeRange(days)}
                    className={cn(
                      "hover-lift backdrop-blur-sm",
                      timeRange === days 
                        ? "bg-gradient-to-r from-pink-500 to-purple-600 text-white border-pink-400/50 shadow-lg shadow-pink-500/30"
                        : "glass-card border-pink-400/30 bg-pink-500/10 text-white hover:bg-pink-500/20 hover:border-pink-400/50"
                    )}
                  >
                    {days}d
                  </Button>
                ))}
              </div>
            </div>
          </div>
          <p className="text-slate-400 max-w-3xl mt-4 leading-relaxed">
            Real-time intelligence tracking job market movements, emerging skills, and workforce shifts.
            Data extracted from SA Government strategies, budget allocations, and skills frameworks using RAG analysis.
          </p>
        </motion.div>

        {/* Overview Charts - ENHANCED */}
        <motion.div variants={item} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="rounded-2xl border border-pink-400/40 bg-gradient-to-br from-pink-500/20 via-purple-500/15 to-blue-500/20 backdrop-blur-xl shadow-xl shadow-pink-500/20 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-pink-400/30 to-purple-400/25 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            <div className="p-5 relative z-10">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 rounded-lg bg-gradient-to-br from-pink-500 via-purple-500 to-blue-500 shadow-lg">
                  <Briefcase className="w-4 h-4 text-white" />
                </div>
                <h3 className="text-sm font-semibold text-white drop-shadow">Job Postings Trend</h3>
              </div>
              <div className="h-40 flex items-center justify-center">
                {trendData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trendData}>
                      <defs>
                        <linearGradient id="jobsGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ec4899" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="#ec4899" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                      <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                      <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "rgba(139, 92, 246, 0.9)",
                          border: "1px solid rgba(236, 72, 153, 0.5)",
                          borderRadius: "12px",
                          backdropFilter: "blur(10px)",
                          color: "white",
                        }}
                      />
                      <Area type="monotone" dataKey="jobs" stroke="#ec4899" fill="url(#jobsGradient)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center text-pink-200/60 text-sm">
                    <AlertCircle className="w-6 h-6 mx-auto mb-2 opacity-50" />
                    <p>Trend data unavailable</p>
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-pink-400/30">
                <span className="text-xs text-pink-100 font-medium">Total Active</span>
                <span className="font-bold text-white flex items-center gap-1.5">
                  <span className="text-lg bg-gradient-to-br from-pink-200 to-purple-200 bg-clip-text text-transparent drop-shadow">
                    {totalActiveJobs > 0 ? totalActiveJobs.toLocaleString() : '0'}
                  </span>
                  {totalActiveJobs > 0 && <TrendingUp className="w-4 h-4 text-emerald-300" />}
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-purple-400/40 bg-gradient-to-br from-purple-500/20 via-pink-500/15 to-purple-500/20 backdrop-blur-xl shadow-xl shadow-purple-500/20 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-purple-400/30 to-pink-400/25 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            <div className="p-5 relative z-10">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 via-pink-500 to-purple-500 shadow-lg">
                  <GraduationCap className="w-4 h-4 text-white" />
                </div>
                <h3 className="text-sm font-semibold text-white drop-shadow">Skills in Demand</h3>
              </div>
              <div className="h-40 flex items-center justify-center">
                {trendData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={trendData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                      <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                      <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "rgba(168, 85, 247, 0.9)",
                          border: "1px solid rgba(236, 72, 153, 0.5)",
                          borderRadius: "12px",
                          backdropFilter: "blur(10px)",
                          color: "white",
                        }}
                      />
                      <Bar dataKey="skills" fill="#a855f7" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center text-purple-200/60 text-sm">
                    <AlertCircle className="w-6 h-6 mx-auto mb-2 opacity-50" />
                    <p>Trend data unavailable</p>
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-purple-400/30">
                <span className="text-xs text-purple-100 font-medium">Trending Skills</span>
                <span className="text-lg font-bold bg-gradient-to-br from-purple-200 to-pink-200 bg-clip-text text-transparent drop-shadow">
                  {skillsDemand.length > 0 ? `${skillsDemand.length}+` : '0'}
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-blue-400/40 bg-gradient-to-br from-blue-500/20 via-indigo-500/15 to-blue-500/20 backdrop-blur-xl shadow-xl shadow-blue-500/20 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-blue-400/30 to-indigo-400/25 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            <div className="p-5 relative z-10">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 via-indigo-500 to-blue-500 shadow-lg">
                  <DollarSign className="w-4 h-4 text-white" />
                </div>
                <h3 className="text-sm font-semibold text-white drop-shadow">Average Growth Rate</h3>
              </div>
              <div className="h-40 flex items-center justify-center">
                {trendData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsLineChart data={trendData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                      <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                      <YAxis
                        tick={{ fontSize: 12 }}
                        stroke="hsl(var(--muted-foreground))"
                        tickFormatter={(val) => `$${(val/1000).toFixed(0)}k`}
                      />
                      <Tooltip
                      contentStyle={{
                        backgroundColor: "rgba(59, 130, 246, 0.9)",
                        border: "1px solid rgba(147, 51, 234, 0.5)",
                        borderRadius: "12px",
                        backdropFilter: "blur(10px)",
                        color: "white",
                      }}
                      formatter={(value) => [`$${Number(value).toLocaleString()}`, "Avg Salary"]}
                    />
                      <Line type="monotone" dataKey="salary" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4, fill: "#3b82f6" }} />
                    </RechartsLineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center text-blue-200/60 text-sm">
                    <AlertCircle className="w-6 h-6 mx-auto mb-2 opacity-50" />
                    <p>Trend data unavailable</p>
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-blue-400/30">
                <span className="text-xs text-blue-100 font-medium">Avg. Growth</span>
                <span className="font-bold flex items-center gap-1.5">
                  <span className="text-lg bg-gradient-to-br from-blue-200 to-indigo-200 bg-clip-text text-transparent drop-shadow">
                    +{avgGrowthRate}%
                  </span>
                  <TrendingUp className="w-4 h-4 text-emerald-300" />
                </span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Main Content Tabs */}
        <motion.div variants={item}>
          <Tabs defaultValue="emerging" className="w-full">
            <TabsList className="w-full max-w-lg mb-6 glass-card border-pink-400/30 bg-gradient-to-r from-pink-500/15 via-purple-500/10 to-blue-500/15 backdrop-blur-sm p-1">
              <TabsTrigger value="emerging" className="flex-1 gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-pink-500 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-lg">
                <TrendingUp className="w-4 h-4" />
                Emerging Roles
              </TabsTrigger>
              <TabsTrigger value="declining" className="flex-1 gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-red-500 data-[state=active]:to-orange-600 data-[state=active]:text-white data-[state=active]:shadow-lg">
                <TrendingDown className="w-4 h-4" />
                Declining Roles
              </TabsTrigger>
              <TabsTrigger value="skills" className="flex-1 gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-lg">
                <Zap className="w-4 h-4" />
                Skills Trending
              </TabsTrigger>
            </TabsList>

            <TabsContent value="emerging">
              {realEmergingRoles.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {realEmergingRoles.map((role, i) => (
                    <motion.div
                      key={role.title}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                    >
                      <div className="group cursor-pointer rounded-2xl border border-pink-400/30 bg-gradient-to-br from-pink-500/15 via-purple-500/10 to-blue-500/15 backdrop-blur-xl hover:border-pink-400/50 hover:from-pink-500/25 hover:via-purple-500/20 hover:to-blue-500/25 transition-all duration-300 hover:shadow-xl shadow-lg relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-pink-400/20 to-purple-400/20 rounded-full blur-2xl group-hover:opacity-100 opacity-0 transition-opacity" />
                        <div className="p-5 relative z-10">
                          <div className="flex items-start justify-between mb-3">
                            <Badge className="text-xs font-semibold bg-gradient-to-r from-pink-500/30 to-purple-500/30 text-pink-100 border-pink-400/50 backdrop-blur-sm hover:from-pink-500/40 hover:to-purple-500/40 transition-colors">
                              {role.category}
                            </Badge>
                            <Badge className="bg-gradient-to-r from-emerald-500/30 to-green-500/30 text-emerald-100 border-emerald-400/50 backdrop-blur-sm font-bold text-xs shadow-md">
                              <TrendingUp className="w-3 h-3 mr-1" />
                              {role.growth}
                            </Badge>
                          </div>
                          <h3 className="font-display font-bold text-white mb-2 text-lg group-hover:text-pink-200 transition-colors drop-shadow">
                            {role.title}
                          </h3>
                          {(() => {
                            const m = hasPersonalizationData ? scoreArticle({ title: role.title, category: role.category }) : null;
                            return m && m.match > 0 ? (
                              <div className="flex items-center gap-2 mb-3">
                                <MatchMeter match={m.match} band={m.band} reasons={m.reasons} size={34} tone="light" />
                                <span className="text-[11px] font-semibold text-emerald-200">
                                  {m.reasons[0] || "Matches your profile"}
                                </span>
                              </div>
                            ) : null;
                          })()}
                          <div className="flex items-center justify-between text-sm mb-3">
                            <div className="flex items-center gap-1.5">
                              <Target className="w-3.5 h-3.5 text-pink-200" />
                              <span className="text-pink-100 font-medium">Demand:</span>
                              <span className="font-semibold text-emerald-300">{role.demand}</span>
                            </div>
                            <span className="font-bold text-white drop-shadow">{role.salary}</span>
                          </div>
                          {role.jobCount > 0 && (
                            <div className="flex items-center gap-1.5 text-xs text-pink-100 mb-3">
                              <Briefcase className="w-3 h-3" />
                              <span>{role.jobCount.toLocaleString()} positions tracked</span>
                            </div>
                          )}
                          {/* Live Job Counts from AustralianJobs */}
                          {(() => {
                            const liveJobCount = getJobCount(role.category);
                            const jobUrl = getJobUrl(role.category);
                            if (liveJobCount > 0) {
                              return (
                                <div 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(jobUrl);
                                  }}
                                  className="mb-3 p-2.5 rounded-lg bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border border-emerald-400/30 hover:from-emerald-500/30 hover:to-teal-500/30 transition-all cursor-pointer group"
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <Zap className="w-3.5 h-3.5 text-emerald-300" />
                                      <span className="text-xs font-semibold text-emerald-200">
                                        {liveJobCount.toLocaleString()} jobs available today
                                      </span>
                                    </div>
                                    <ArrowUpRight className="w-3.5 h-3.5 text-emerald-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                                  </div>
                                </div>
                              );
                            }
                            return null;
                          })()}
                          <div className="flex items-center gap-2 pt-3 border-t border-pink-400/30 opacity-0 group-hover:opacity-100 transition-all">
                            <Sparkles className="w-4 h-4 text-pink-300" />
                            <span className="text-xs text-pink-200 font-semibold">RAG insights available</span>
                            <ArrowUpRight className="w-3.5 h-3.5 ml-auto text-pink-300" />
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center p-12 rounded-2xl border border-pink-400/30 bg-gradient-to-br from-pink-500/10 via-purple-500/5 to-blue-500/10 backdrop-blur-xl">
                  <div className="text-center">
                    <AlertCircle className="w-8 h-8 mx-auto mb-3 text-pink-300/60" />
                    <p className="text-pink-200/60 text-sm">Emerging roles data unavailable</p>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="declining">
              {decliningRoles.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {decliningRoles.map((role, i) => (
                    <motion.div
                      key={role.title}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                    >
                      <div className="rounded-2xl border border-red-400/40 bg-gradient-to-br from-red-500/20 via-orange-500/15 to-red-500/20 backdrop-blur-xl shadow-xl shadow-red-500/20 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-red-400/20 to-orange-400/20 rounded-full blur-2xl opacity-50" />
                        <div className="p-4 relative z-10">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <AlertTriangle className="w-4 h-4 text-red-300" />
                              <Badge className="border-red-400/50 text-red-200 bg-red-500/30 backdrop-blur-sm">
                                {role.risk} Risk
                              </Badge>
                            </div>
                            <Badge className="bg-red-500/30 text-red-100 border-red-400/50 backdrop-blur-sm shadow-md">
                              {role.decline}
                            </Badge>
                          </div>
                          <h3 className="font-semibold text-white mb-2 drop-shadow">{role.title}</h3>
                          <p className="text-sm text-red-100">
                            Primary factor: {role.reason}
                          </p>
                          <Button variant="link" className="p-0 h-auto mt-3 text-red-200 hover:text-red-100">
                            View transition pathways →
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center p-12 rounded-2xl border border-red-400/30 bg-gradient-to-br from-red-500/10 via-orange-500/5 to-red-500/10 backdrop-blur-xl">
                  <div className="text-center">
                    <AlertCircle className="w-8 h-8 mx-auto mb-3 text-red-300/60" />
                    <p className="text-red-200/60 text-sm">Declining roles data unavailable</p>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="skills">
              {realSkillsTrending.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {realSkillsTrending.map((skill, i) => (
                    <motion.div
                      key={skill.name}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.03 }}
                    >
                      <div className="rounded-xl border border-blue-400/30 bg-gradient-to-br from-blue-500/15 via-indigo-500/10 to-purple-500/15 backdrop-blur-xl hover:border-blue-400/50 hover:from-blue-500/25 hover:via-indigo-500/20 hover:to-purple-500/25 transition-all duration-300 cursor-pointer group relative overflow-hidden shadow-md hover:shadow-xl">
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-400/10 to-purple-400/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="p-5 text-center relative z-10">
                          <Badge className="mb-3 text-xs font-semibold border-blue-400/50 text-blue-100 bg-blue-500/30 backdrop-blur-sm">
                            {skill.category}
                          </Badge>
                          <h3 className="font-display font-bold text-white group-hover:text-blue-200 transition-colors drop-shadow">
                            {skill.name}
                          </h3>
                          <p className="text-2xl font-bold bg-gradient-to-br from-blue-200 to-purple-200 bg-clip-text text-transparent mt-2 drop-shadow">
                            {skill.growth}
                          </p>
                          {skill.demandLevel && (
                            <p className="text-xs text-blue-100 mt-2 font-medium">{skill.demandLevel} Demand</p>
                          )}
                          {hasPersonalizationData && scoreSkill(skill.name).match > 0 && (
                            <div className="mt-3 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/30 border border-emerald-400/50 text-emerald-100 text-[10px] font-bold">
                              ★ You have this
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center p-12 rounded-2xl border border-blue-400/30 bg-gradient-to-br from-blue-500/10 via-indigo-500/5 to-purple-500/10 backdrop-blur-xl">
                  <div className="text-center">
                    <AlertCircle className="w-8 h-8 mx-auto mb-3 text-blue-300/60" />
                    <p className="text-blue-200/60 text-sm">Skills trending data unavailable</p>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </motion.div>

        {/* AI Insights Panel - Agentic RAG powered */}
        <motion.div variants={item}>
          <AIInsightsPanel
            tab="overview"
            title="Market Intelligence Insights"
            maxInsights={4}
          />
        </motion.div>

        {/* Document Intelligence Visualizer - Graph connections & contradictions */}
        {(chartSources.length > 0 || loadingCharts) && (
          <motion.div variants={item}>
            <DocumentIntelligenceVisualizer
              sources={chartSources}
              visualizationData={chartVisualizationData}
              query="market trends workforce analysis"
              isLoading={loadingCharts}
              contradictions={contradictions}
            />
          </motion.div>
        )}

        {/* Regional Shortages */}
        <motion.div variants={item}>
          <div className="rounded-2xl border border-pink-400/40 bg-gradient-to-br from-pink-500/20 via-purple-500/15 to-blue-500/20 backdrop-blur-xl shadow-xl shadow-pink-500/20 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-pink-400/20 to-purple-400/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            <div className="p-6 relative z-10">
              <div className="flex items-center gap-2 mb-6">
                <div className="p-2 rounded-lg bg-gradient-to-br from-pink-500/40 to-red-500/40 backdrop-blur-sm border border-pink-400/50">
                  <MapPin className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-lg font-semibold text-white drop-shadow-lg">Regional Workforce Shortages</h2>
              </div>
              {regionalShortages.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {regionalShortages.map((region) => (
                    <div key={region.region} className="p-4 rounded-xl border border-pink-400/30 bg-gradient-to-br from-pink-500/15 to-purple-500/10 backdrop-blur-sm shadow-md">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-white drop-shadow">{region.region}</h4>
                        <Badge
                          className={cn(
                            "text-xs backdrop-blur-sm",
                            region.severity === "Critical"
                              ? "border-red-400/50 text-red-100 bg-red-500/30"
                              : region.severity === "High"
                              ? "border-amber-400/50 text-amber-100 bg-amber-500/30"
                              : "border-yellow-400/50 text-yellow-100 bg-yellow-500/30"
                          )}
                        >
                          {region.severity}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {region.roles.map((role) => (
                          <Badge key={role} className="text-xs bg-blue-500/30 text-blue-100 border-blue-400/50 backdrop-blur-sm">
                            {role}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center p-12 rounded-xl border border-pink-400/30 bg-gradient-to-br from-pink-500/10 via-purple-500/5 to-blue-500/10 backdrop-blur-xl">
                  <div className="text-center">
                    <AlertCircle className="w-8 h-8 mx-auto mb-3 text-pink-300/60" />
                    <p className="text-pink-200/60 text-sm">Regional shortage data unavailable</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AstralShell>
  );
}

export default function MarketTrends() {
  return (
    <IntelligenceProvider>
      <MarketTrendsContent />
    </IntelligenceProvider>
  );
}
