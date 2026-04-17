/**
 * TryUs - Guest mode page for trying the Intelligence Dashboard and Career Coach
 * 
 * Allows visitors to experience core features without signing up.
 * Now features full 4-tab Intelligence Dashboard to showcase platform power.
 */

import { useState, useEffect as ReactUseEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { 
  LayoutDashboard, 
  MessageSquareText,
  Brain,
  Sparkles,
  Activity,
  Briefcase,
  DollarSign,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import TryUsLayout from "@/components/layout/TryUsLayout";

// Import the actual components (they work without auth)
import { IntelligenceProvider, useIntelligence } from "@/contexts/IntelligenceContext";
import {
  IntelligenceHero,
  SectorHeatmap,
  InvestmentHighlights,
  BreakingNews,
  AIInsightsPanel,
  CrossTabConnections,
  DataStoriesPanel,
  LiveDiscoveryFeed,
  CareersDashboard,
  SkillsDashboard,
  FundingDashboard,
  DocumentIntelligenceVisualizer,
} from "@/components/intelligence";
import { ImpactScenarioPanel } from "@/components/intelligence/NextGenInsights";
import CareerCoach from "@/components/rag/CareerCoach";
import { SAMarketIntelligence } from "@/components/interview/SAMarketIntelligence";
import { SAFundingIntelligence } from "@/components/interview/SAFundingIntelligence";
import { useAgenticRAG } from "@/hooks/useAgenticRAG";
import { useRAGMetadata } from "@/hooks/useRAGMetadata";
import { transformSearchResultsToVisualizationData } from "@/lib/intelligence/visualizationData";
import { getTabPrompt, type IntelligenceTab } from "@/lib/intelligencePrompts";

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.1 }
  }
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

/**
 * Intelligence Dashboard content for guest mode
 * Features full 4-tab structure: Overview, Careers, Skills, Funding
 */
function GuestIntelligenceDashboard() {
  const {
    setSearchQuery,
    searchQuery,
    metrics,
    ingestAgenticResult,
  } = useIntelligence();

  // Tab state
  const [intelligenceTab, setIntelligenceTab] = useState<IntelligenceTab>("overview");
  // Careers showcase sector picker
  const [careersSector, setCareersSector] = useState("Healthcare / Nursing");
  
  // Agentic RAG hooks for each focus area — pass HORUS tab prompts so final answers are structured/parseable for dashboard metrics
  const { sendMessage: sendOverviewMsg, messages: overviewMsgs } = useAgenticRAG('overview', { finalSystemPrompt: getTabPrompt('overview') });
  const { sendMessage: sendCareersMsg, messages: careersMsgs } = useAgenticRAG('careers', { finalSystemPrompt: getTabPrompt('careers') });
  const { sendMessage: sendSkillsMsg, messages: skillsMsgs } = useAgenticRAG('skills', { finalSystemPrompt: getTabPrompt('skills') });
  const { sendMessage: sendFundingMsg, messages: fundingMsgs } = useAgenticRAG('funding', { finalSystemPrompt: getTabPrompt('funding') });
  
  // RAG metadata for semantic search
  const { semanticSearch } = useRAGMetadata();
  
  // Chart/visualization state
  const [chartSources, setChartSources] = useState<any[]>([]);
  const [chartVisualizationData, setChartVisualizationData] = useState<any>(null);
  const [loadingCharts, setLoadingCharts] = useState(false);
  const [contradictions, setContradictions] = useState<any[]>([]);
  
  // Tab-specific sources and contradictions
  const [tabSources, setTabSources] = useState<Record<string, any[]>>({});
  const [tabVizData, setTabVizData] = useState<Record<string, any>>({});
  const [tabContradictions, setTabContradictions] = useState<Record<string, any[]>>({});
  
  // Refs to track one-time fetches
  const agenticFetchDone = useRef(false);
  const tabAgenticDone = useRef<Set<string>>(new Set());
  const hasSetDefaultQuery = useRef(false);

  // Track which tabs have had agentic RAG fire (to show visualizer even with 0 sources)
  const [tabAgenticFired, setTabAgenticFired] = useState<Record<string, boolean>>({});

  // Track which agentic messages have already been ingested (by content length + source count) to avoid redundant calls
  const ingestedMsgs = useRef<Set<string>>(new Set());

  // Set default search query on first load
  ReactUseEffect(() => {
    if (hasSetDefaultQuery.current) return;
    if (!searchQuery || !searchQuery.trim()) {
      hasSetDefaultQuery.current = true;
      setSearchQuery("South Australia government budget careers funding");
    }
  }, [searchQuery, setSearchQuery]);

  // Fire agentic RAG once for overview enrichment
  ReactUseEffect(() => {
    if (agenticFetchDone.current || !searchQuery || !searchQuery.trim()) return;
    agenticFetchDone.current = true;

    console.log('[TryUs] 🚀 Firing agentic RAG for overview enrichment...');
    sendOverviewMsg(
      `Analyze the South Australian government budget: key funding allocations, career opportunities, skills demand, and any contradictions or notable trends across sectors.`
    ).then(() => {
      console.log('[TryUs] ✅ Overview agentic enrichment completed');
      setTabAgenticFired(prev => ({ ...prev, overview: true }));
    }).catch((err: Error) => {
      console.warn('[TryUs] ⚠️ Overview agentic enrichment failed (non-fatal):', err.message);
      setTabAgenticFired(prev => ({ ...prev, overview: true }));
    });
  }, [searchQuery, sendOverviewMsg]);

  // Fire per-tab agentic queries when user switches tabs
  ReactUseEffect(() => {
    if (intelligenceTab === 'overview' || tabAgenticDone.current.has(intelligenceTab)) return;
    tabAgenticDone.current.add(intelligenceTab);

    const tabQueries: Record<string, { msg: string; send: typeof sendCareersMsg }> = {
      careers: {
        msg: 'Analyze career opportunities in South Australia: top growing occupations, salary trends, sector demand, workforce gaps, and which government-funded programs are creating the most jobs.',
        send: sendCareersMsg,
      },
      skills: {
        msg: 'Analyze skills demand in South Australia: most in-demand technical skills, emerging skills, training gaps, and how government investment is driving skill requirements across sectors.',
        send: sendSkillsMsg,
      },
      funding: {
        msg: 'Analyze government budget allocations in South Australia: largest sector investments, fastest growing budgets, program funding breakdown, and any contradictions between stated priorities and actual funding.',
        send: sendFundingMsg,
      },
    };

    const q = tabQueries[intelligenceTab];
    if (q) {
      console.log(`[TryUs] 🚀 Firing agentic RAG for ${intelligenceTab} tab...`);
      q.send(q.msg).then(() => {
        console.log(`[TryUs] ✅ ${intelligenceTab} agentic enrichment completed`);
        setTabAgenticFired(prev => ({ ...prev, [intelligenceTab]: true }));
      }).catch((err: Error) => {
        console.warn(`[TryUs] ⚠️ ${intelligenceTab} agentic enrichment failed:`, err.message);
        setTabAgenticFired(prev => ({ ...prev, [intelligenceTab]: true }));
      });
    }
  }, [intelligenceTab, sendCareersMsg, sendSkillsMsg, sendFundingMsg]);

  // Extract sources and contradictions from agentic messages (tabs + overview fallback)
  // Also ingest agentic result into IntelligenceContext so dashboard cards show agentic+graph data
  ReactUseEffect(() => {
    const msgSets: [any[], string][] = [
      [overviewMsgs, 'overview'],
      [careersMsgs, 'careers'],
      [skillsMsgs, 'skills'],
      [fundingMsgs, 'funding'],
    ];

    for (const [msgs, tab] of msgSets) {
      const last = [...msgs].reverse().find((m: any) => m.role === 'assistant' && !m.isLoading);
      if (!last) continue;

      const sources = (last.sources || []).map((s: any) => ({
        id: s.documentId || s.title,
        documentId: s.documentId || s.title,
        title: s.title || 'Document',
        score: (s.relevance || 70) / 100,
        category: s.category || 'Other',
        sector: s.sector || 'General',
        pageNumber: s.pageNumber || s.metadata?.pageNumber || undefined,
        content: s.snippet || '',
        // Preserve chart metadata so PDF Charts tab populates
        hasChart: s.hasChart || false,
        chartType: s.chartType,
        chartData: s.chartData,
        chartImageUrl: s.chartImageUrl,
        visualDescription: s.visualDescription,
        chunkType: s.chunkType,
      }));

      if (sources.length > 0) {
        setTabSources(prev => ({ ...prev, [tab]: sources }));
        setTabVizData(prev => ({
          ...prev,
          [tab]: transformSearchResultsToVisualizationData(sources, tab),
        }));
      }

      const contras = last.contradictions || [];
      if (contras.length > 0) {
        setTabContradictions(prev => ({ ...prev, [tab]: contras }));
        if (tab === 'overview') {
          setContradictions(contras);
        }
      }

      // Ingest agentic answer + sources into context — deduplicate by content fingerprint
      // The ingestAgenticResult merge logic handles inflation prevention:
      //   - Same confidence: keeps existing value (no inflation)
      //   - Higher confidence: upgrades (table data replacing text data)
      const answer = typeof last.content === 'string' ? last.content : '';
      const rawSources = last.sources || [];
      const contentKey = `${tab}:${answer.substring(0, 200)}:${rawSources.length}`;
      if ((answer || rawSources.length > 0) && !ingestedMsgs.current.has(contentKey)) {
        ingestedMsgs.current.add(contentKey);
        ingestAgenticResult(tab as IntelligenceTab, { answer, sources: rawSources });
      }
    }
  }, [overviewMsgs, careersMsgs, skillsMsgs, fundingMsgs, ingestAgenticResult]);

  // Fetch chart chunks when search query changes
  ReactUseEffect(() => {
    const fetchChartChunks = async () => {
      if (!searchQuery || searchQuery.trim().length === 0) {
        setChartSources([]);
        setChartVisualizationData(null);
        return;
      }

      setLoadingCharts(true);
      try {
        const results = await semanticSearch(searchQuery, {}, { topK: 30 });

        if (results && results.sources && results.sources.length > 0) {
          const sources = results.sources.map((result: any) => ({
            id: result.id,
            documentId: result.documentId,
            title: result.title || 'Untitled',
            score: result.score || 0,
            category: result.category,
            sector: result.sector,
            content: result.content,
            hasChart: result.hasChart || result.metadata?.hasChart || false,
            chartType: result.chartType || result.metadata?.chartType,
            chartData: result.chartData || result.metadata?.chartData,
            chartImageUrl: result.chartImageUrl || result.metadata?.chartImageUrl,
            chartConfidence: result.chartConfidence || result.metadata?.chartConfidence,
            visualDescription: result.visualDescription || result.metadata?.visualDescription,
            chunkType: result.chunkType,
          }));

          setChartSources(sources);
          // Use visualizationData from backend if available (has pre-built charts array)
          // otherwise fall back to client-side transform
          if (results.visualizationData && results.visualizationData.chartCount > 0) {
            setChartVisualizationData(results.visualizationData);
          } else {
            const vizData = transformSearchResultsToVisualizationData(sources, searchQuery);
            setChartVisualizationData(vizData);
          }
        }
      } catch (error) {
        console.error('[TryUs] Failed to fetch chart chunks:', error);
      }
      setLoadingCharts(false);
    };

    const debounceTimer = setTimeout(fetchChartChunks, 500);
    return () => clearTimeout(debounceTimer);
  }, [searchQuery, semanticSearch]);

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      {/* 4-Tab Intelligence Navigation */}
      <motion.div variants={item}>
        <Tabs value={intelligenceTab} onValueChange={(v) => setIntelligenceTab(v as IntelligenceTab)} className="w-full">
          <TabsList className="grid w-full grid-cols-4 p-2.5 h-auto rounded-2xl bg-gradient-to-r from-pink-500/20 via-purple-500/20 to-pink-500/20 backdrop-blur-xl border-2 border-pink-400/50 shadow-2xl shadow-pink-500/20">
            <TabsTrigger 
              value="overview" 
              className={cn(
                "flex items-center gap-2 px-4 py-3 rounded-xl transition-all duration-300 font-semibold text-sm",
                "data-[state=active]:bg-gradient-to-r data-[state=active]:from-pink-500 data-[state=active]:via-purple-500 data-[state=active]:to-pink-500",
                "data-[state=active]:text-white data-[state=active]:shadow-xl data-[state=active]:shadow-pink-500/50 data-[state=active]:scale-105",
                "data-[state=inactive]:text-white/90 data-[state=inactive]:hover:text-white data-[state=inactive]:hover:bg-pink-500/30"
              )}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span className="hidden sm:inline">Overview</span>
            </TabsTrigger>
            <TabsTrigger 
              value="careers"
              className={cn(
                "flex items-center gap-2 px-4 py-3 rounded-xl transition-all duration-300 font-semibold text-sm",
                "data-[state=active]:bg-gradient-to-r data-[state=active]:from-pink-500 data-[state=active]:via-rose-500 data-[state=active]:to-pink-500",
                "data-[state=active]:text-white data-[state=active]:shadow-xl data-[state=active]:shadow-pink-500/50 data-[state=active]:scale-105",
                "data-[state=inactive]:text-white/90 data-[state=inactive]:hover:text-white data-[state=inactive]:hover:bg-pink-500/30"
              )}
            >
              <Briefcase className="w-4 h-4" />
              <span className="hidden sm:inline">Careers</span>
            </TabsTrigger>
            <TabsTrigger 
              value="skills"
              className={cn(
                "flex items-center gap-2 px-4 py-3 rounded-xl transition-all duration-300 font-semibold text-sm",
                "data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:via-pink-500 data-[state=active]:to-purple-500",
                "data-[state=active]:text-white data-[state=active]:shadow-xl data-[state=active]:shadow-purple-500/50 data-[state=active]:scale-105",
                "data-[state=inactive]:text-white/90 data-[state=inactive]:hover:text-white data-[state=inactive]:hover:bg-purple-500/30"
              )}
            >
              <Brain className="w-4 h-4" />
              <span className="hidden sm:inline">Skills</span>
            </TabsTrigger>
            <TabsTrigger 
              value="funding"
              className={cn(
                "flex items-center gap-2 px-4 py-3 rounded-xl transition-all duration-300 font-semibold text-sm",
                "data-[state=active]:bg-gradient-to-r data-[state=active]:from-pink-500 data-[state=active]:via-fuchsia-500 data-[state=active]:to-pink-500",
                "data-[state=active]:text-white data-[state=active]:shadow-xl data-[state=active]:shadow-pink-500/50 data-[state=active]:scale-105",
                "data-[state=inactive]:text-white/90 data-[state=inactive]:hover:text-white data-[state=inactive]:hover:bg-fuchsia-500/30"
              )}
            >
              <DollarSign className="w-4 h-4" />
              <span className="hidden sm:inline">Funding</span>
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="mt-6 space-y-6">
            <AnimatePresence mode="wait">
              <motion.div
                key="overview"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                {intelligenceTab === "overview" && (
                  <>
                    <IntelligenceHero />
                    <DataStoriesPanel />
                    <ImpactScenarioPanel />
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <LiveDiscoveryFeed />
                      <AIInsightsPanel
                        tab="overview"
                        title="Strategic Intelligence"
                        maxInsights={4}
                      />
                    </div>

                    <CrossTabConnections />

                    <DocumentIntelligenceVisualizer 
                      sources={tabSources.overview?.length ? tabSources.overview : chartSources}
                      visualizationData={tabVizData.overview || chartVisualizationData}
                      query={searchQuery}
                      isLoading={loadingCharts && !tabSources.overview?.length}
                      contradictions={tabContradictions.overview?.length > 0 ? tabContradictions.overview : contradictions}
                    />

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      <div className="lg:col-span-2">
                        <SectorHeatmap />
                      </div>
                      <div>
                        <InvestmentHighlights />
                      </div>
                    </div>

                    <BreakingNews />
                  </>
                )}
              </motion.div>
            </AnimatePresence>
          </TabsContent>

          {/* Careers Tab */}
          <TabsContent value="careers" className="mt-6 space-y-6">
            {intelligenceTab === "careers" && (
              <AnimatePresence mode="wait">
                <motion.div
                  key="careers"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-6"
                >
                  <AIInsightsPanel 
                    tab="careers" 
                    maxInsights={3}
                  />

                  {/* ── SA Career Intelligence Showcase ── */}
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    className="rounded-2xl border border-pink-500/30 bg-gradient-to-br from-pink-950/60 via-purple-950/50 to-fuchsia-950/40 backdrop-blur-sm overflow-hidden shadow-xl shadow-pink-500/10"
                  >
                    {/* Header */}
                    <div className="px-5 pt-5 pb-4 border-b border-pink-500/20">
                      <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center shadow-md shadow-pink-500/30">
                              <Sparkles className="w-3.5 h-3.5 text-white" />
                            </div>
                            <h3 className="text-sm font-bold text-white">SA Career Intelligence</h3>
                            <Badge className="text-[10px] bg-pink-500/20 text-pink-200 border-pink-400/40">
                              Real SA government documents
                            </Badge>
                          </div>
                          <p className="text-xs text-white/60 ml-9">
                            Select a sector — live skills, employers, salary signals &amp; interview tips
                          </p>
                        </div>
                      </div>

                      {/* Sector pill picker */}
                      <div className="flex flex-wrap gap-2 mt-4">
                        {[
                          { label: "Healthcare", field: "Healthcare / Nursing", emoji: "🏥" },
                          { label: "Technology", field: "Software Engineering", emoji: "💻" },
                          { label: "Data & AI", field: "Data Science", emoji: "📊" },
                          { label: "Finance", field: "Finance", emoji: "💰" },
                          { label: "Operations", field: "Operations", emoji: "⚙️" },
                          { label: "Human Resources", field: "Human Resources", emoji: "👥" },
                        ].map(({ label, field, emoji }) => (
                          <button
                            key={field}
                            onClick={() => setCareersSector(field)}
                            className={cn(
                              "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 border",
                              careersSector === field
                                ? "bg-gradient-to-r from-pink-500 to-purple-600 text-white border-pink-400/60 shadow-lg shadow-pink-500/30 scale-105"
                                : "bg-white/8 text-white/70 border-white/15 hover:bg-pink-500/20 hover:text-white hover:border-pink-400/40"
                            )}
                          >
                            <span>{emoji}</span>
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Intelligence panel */}
                    <div className="p-5">
                      <SAMarketIntelligence field={careersSector} variant="dark" />
                    </div>
                  </motion.div>

                  <CareersDashboard searchQuery={searchQuery} />
                  {tabAgenticFired.careers && (
                    <DocumentIntelligenceVisualizer
                      sources={tabSources.careers || []}
                      visualizationData={tabVizData.careers}
                      query={searchQuery || 'careers'}
                      isLoading={false}
                      contradictions={tabContradictions.careers?.length > 0 ? tabContradictions.careers : contradictions}
                    />
                  )}
                </motion.div>
              </AnimatePresence>
            )}
          </TabsContent>

          {/* Skills Tab */}
          <TabsContent value="skills" className="mt-6 space-y-6">
            {intelligenceTab === "skills" && (
              <AnimatePresence mode="wait">
                <motion.div
                  key="skills"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-6"
                >
                  <AIInsightsPanel 
                    tab="skills" 
                    maxInsights={3}
                  />
                  <SkillsDashboard searchQuery={searchQuery} />
                  {tabAgenticFired.skills && (
                    <DocumentIntelligenceVisualizer
                      sources={tabSources.skills || []}
                      visualizationData={tabVizData.skills}
                      query={searchQuery || 'skills'}
                      isLoading={false}
                      contradictions={tabContradictions.skills?.length > 0 ? tabContradictions.skills : contradictions}
                    />
                  )}
                </motion.div>
              </AnimatePresence>
            )}
          </TabsContent>

          {/* Funding Tab */}
          <TabsContent value="funding" className="mt-6 space-y-6">
            {intelligenceTab === "funding" && (
              <AnimatePresence mode="wait">
                <motion.div
                  key="funding"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-6"
                >
                  <AIInsightsPanel 
                    tab="funding" 
                    maxInsights={3}
                  />

                  {/* SA Funding Intelligence — Where the Money Goes */}
                  <SAFundingIntelligence />

                  <FundingDashboard searchQuery={searchQuery} />
                  {tabAgenticFired.funding && (
                    <DocumentIntelligenceVisualizer
                      sources={tabSources.funding || []}
                      visualizationData={tabVizData.funding}
                      query={searchQuery || 'funding'}
                      isLoading={false}
                      contradictions={tabContradictions.funding?.length > 0 ? tabContradictions.funding : contradictions}
                    />
                  )}
                </motion.div>
              </AnimatePresence>
            )}
          </TabsContent>
        </Tabs>
      </motion.div>
    </motion.div>
  );
}

/**
 * Career Coach content for guest mode
 */
function GuestCareerCoach() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="max-w-4xl mx-auto"
    >
      <CareerCoach />
    </motion.div>
  );
}

/**
 * Main TryUs Page
 */
export default function TryUs() {
  const [activeTab, setActiveTab] = useState<"intelligence" | "chat">("intelligence");

  const handleTabChange = (tab: "intelligence" | "chat") => {
    setActiveTab(tab);
  };

  return (
    <IntelligenceProvider>
      <TryUsLayout
        title={activeTab === "intelligence" ? "Intelligence Dashboard" : "Horus Chat"}
        subtitle={activeTab === "intelligence" 
          ? "AI-powered career & workforce insights" 
          : "Your AI career assistant"}
        activeTab={activeTab}
        onTabChange={handleTabChange}
      >
        {/* Tab Switcher */}
        <div className="mb-6">
          <Tabs value={activeTab} onValueChange={(v) => handleTabChange(v as "intelligence" | "chat")}>
            <TabsList className="grid w-full max-w-lg mx-auto grid-cols-2 p-1.5 h-auto rounded-2xl bg-slate-800/50 border border-slate-700/50">
              <TabsTrigger 
                value="intelligence"
                className={cn(
                  "flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl transition-all duration-300 font-semibold",
                  "data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-500",
                  "data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-purple-500/30",
                  "data-[state=inactive]:text-slate-400 data-[state=inactive]:hover:text-white data-[state=inactive]:hover:bg-slate-700/50"
                )}
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Intelligence</span>
                <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px] px-1.5">
                  <Activity className="w-2.5 h-2.5 mr-0.5 animate-pulse" />
                  Live
                </Badge>
              </TabsTrigger>
              <TabsTrigger 
                value="chat"
                className={cn(
                  "flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl transition-all duration-300 font-semibold",
                  "data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-500",
                  "data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-purple-500/30",
                  "data-[state=inactive]:text-slate-400 data-[state=inactive]:hover:text-white data-[state=inactive]:hover:bg-slate-700/50"
                )}
              >
                <MessageSquareText className="w-4 h-4" />
                <span>Horus Chat</span>
                <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 text-[10px] px-1.5">
                  <Sparkles className="w-2.5 h-2.5 mr-0.5" />
                  AI
                </Badge>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="intelligence" className="mt-6">
              <AnimatePresence mode="wait">
                {activeTab === "intelligence" && (
                  <motion.div
                    key="intelligence"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.3 }}
                  >
                    <GuestIntelligenceDashboard />
                  </motion.div>
                )}
              </AnimatePresence>
            </TabsContent>

            <TabsContent value="chat" className="mt-6">
              <AnimatePresence mode="wait">
                {activeTab === "chat" && (
                  <motion.div
                    key="chat"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                  >
                    <GuestCareerCoach />
                  </motion.div>
                )}
              </AnimatePresence>
            </TabsContent>
          </Tabs>
        </div>
      </TryUsLayout>
    </IntelligenceProvider>
  );
}
