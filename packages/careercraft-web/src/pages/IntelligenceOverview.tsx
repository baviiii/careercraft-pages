/**
 * IntelligenceOverview - Main intelligence dashboard page
 * 
 * - IntelligenceContext owns the fetching; four standing queries, one per
 *   tab, each taking 20-50 seconds and each painting the moment it lands.
 * - A stored snapshot fills the page before any request returns, labelled
 *   with its age, and is discarded if the corpus size has changed.
 * - Tabs are questions, not categories. The ids still key the fetches.
 *
 * Nothing on this page is real-time — the docblock used to claim it was. The
 * source is South Australia's published budget papers, workforce plans and
 * skills reporting.
 */

import { useState, useEffect as ReactUseEffect, useRef, useMemo } from "react";
import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  SectorHeatmap,
  InvestmentHighlights,
  BreakingNews,
  CareersDashboard,
  SkillsDashboard,
  FundingDashboard,
  AIInsightsPanel,
  IntelligenceHero,
  CrossTabConnections,
  DataStoriesPanel,
  LiveDiscoveryFeed,
  DocumentIntelligenceVisualizer,  // NEW: Dynamic visualizations
} from "@/components/intelligence";

import { IntelligenceProvider, useIntelligence } from "@/contexts/IntelligenceContext";
import { useRAGMetadata } from "@/hooks/useRAGMetadata";
import { useAgenticRAG } from "@/hooks/useAgenticRAG";
import { transformSearchResultsToVisualizationData } from "@/lib/intelligence/visualizationData";
import { describeAge } from "@/lib/intelligence/snapshotCache";
import {
  Briefcase,
  Brain,
  DollarSign,
  LayoutDashboard,
  Download,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { IntelligenceTab } from "@/lib/intelligencePrompts";
import {
  AstralShell,
  AstralMasthead,
  AstralTabs,
  AstralButton,
  type AstralTabItem,
  type OrbitalNode,
} from "@/components/astral";

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

// Sector keyword map for extracting sector from document content/titles
// Infrastructure first (includes transport) so it matches budget sector; Construction is building/housing only
const SECTOR_KEYWORDS: Record<string, string[]> = {
  'Infrastructure': ['infrastructure', 'transport', 'roads', 'rail', 'capital works', 'corridor', 'logistics', 'aviation', 'shipping'],
  'Healthcare': ['health', 'hospital', 'medical', 'nursing', 'pharmaceutical', 'clinical', 'doctor'],
  'Education': ['education', 'school', 'university', 'teacher', 'training', 'learning', 'academic', 'student'],
  'Technology': ['technology', 'software', 'digital', 'IT', 'cyber', 'data science', 'artificial intelligence', 'tech'],
  'Construction': ['construction', 'building', 'housing', 'property'],
  'Energy': ['energy', 'renewable', 'solar', 'wind', 'electricity', 'mining', 'oil', 'gas'],
  'Agriculture': ['agriculture', 'farming', 'agri', 'food production', 'livestock'],
  'Defence': ['defence', 'defense', 'military', 'security', 'naval'],
  'Government': ['government', 'public service', 'administration', 'budget', 'policy', 'treasury'],
  'Social Services': ['social', 'welfare', 'community', 'disability', 'aged care', 'childcare'],
  'Manufacturing': ['manufacturing', 'factory', 'production', 'industrial'],
  'Finance': ['finance', 'banking', 'insurance', 'investment', 'financial'],
};

function extractSectorFromContent(text: string): string {
  if (!text) return 'General';
  const lower = text.toLowerCase();
  for (const [sector, keywords] of Object.entries(SECTOR_KEYWORDS)) {
    for (const kw of keywords) {
      if (lower.includes(kw.toLowerCase())) return sector;
    }
  }
  return 'General';
}

function extractCategoryFromTitle(title: string): string {
  if (!title) return 'Other';
  const lower = title.toLowerCase();
  if (lower.includes('budget') || lower.includes('financial') || lower.includes('appropriation')) return 'Budget';
  if (lower.includes('plan') || lower.includes('strategy') || lower.includes('framework')) return 'Strategy';
  if (lower.includes('report') || lower.includes('review') || lower.includes('assessment')) return 'Report';
  if (lower.includes('skills') || lower.includes('workforce') || lower.includes('employment')) return 'Workforce';
  if (lower.includes('act') || lower.includes('legislation') || lower.includes('regulation')) return 'Legislation';
  return 'Policy';
}

/**
 * Inner dashboard component that uses the intelligence context
 */
function IntelligenceDashboardContent() {
  const {
    activeTab,
    setActiveTab,
    searchQuery,
    setSearchQuery,
    refreshAll,
    globalLoading,
    metrics,
    snapshotAge,
    totalBudget,
    fundingAllocations,
    careerOpportunities,
    skillsDemand,
    crossTabInsights,
  } = useIntelligence();

  const { semanticSearch } = useRAGMetadata();
  const { sendMessage: sendOverviewMsg, messages: agenticMessages, isStreaming } = useAgenticRAG('overview');
  const { sendMessage: sendCareersMsg, messages: careersAgenticMsgs } = useAgenticRAG('careers');
  const { sendMessage: sendSkillsMsg, messages: skillsAgenticMsgs } = useAgenticRAG('skills');
  const { sendMessage: sendFundingMsg, messages: fundingAgenticMsgs } = useAgenticRAG('funding');
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [chartSources, setChartSources] = useState<any[]>([]);
  const [chartVisualizationData, setChartVisualizationData] = useState<any>(null);
  const [loadingCharts, setLoadingCharts] = useState(false);
  const hasSetDefaultQuery = useRef(false);
  const agenticFetchDone = useRef(false);
  const tabAgenticDone = useRef<Set<string>>(new Set());
  const [tabSources, setTabSources] = useState<Record<string, any[]>>({});
  const [tabVizData, setTabVizData] = useState<Record<string, any>>({});

  // Set a default search query on first load so Overview shows visualization data immediately
  ReactUseEffect(() => {
    if (hasSetDefaultQuery.current) return;
    if (!searchQuery || !searchQuery.trim()) {
      hasSetDefaultQuery.current = true;
      setSearchQuery("South Australia government budget careers funding");
    }
  }, [searchQuery, setSearchQuery]);

  // Fire agentic RAG once to enrich overview with graph data, intersections, and contradictions
  ReactUseEffect(() => {
    if (agenticFetchDone.current || !searchQuery || !searchQuery.trim()) return;
    agenticFetchDone.current = true;

    console.log('[IntelligenceOverview] 🚀 Firing agentic RAG for overview enrichment...');
    sendOverviewMsg(
      `Analyze the South Australian government budget: key funding allocations, career opportunities, skills demand, and any contradictions or notable trends across sectors.`
    ).then(() => {
      console.log('[IntelligenceOverview] ✅ Agentic enrichment completed');
    }).catch((err: Error) => {
      console.warn('[IntelligenceOverview] ⚠️ Agentic enrichment failed (non-fatal):', err.message);
    });
  }, [searchQuery, sendOverviewMsg]);

  // Fire per-tab agentic queries when user switches tabs (lazy, one-time per tab)
  ReactUseEffect(() => {
    if (activeTab === 'overview' || tabAgenticDone.current.has(activeTab)) return;
    tabAgenticDone.current.add(activeTab);

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

    const q = tabQueries[activeTab];
    if (q) {
      console.log(`[IntelligenceOverview] 🚀 Firing agentic RAG for ${activeTab} tab...`);
      q.send(q.msg).then(() => {
        console.log(`[IntelligenceOverview] ✅ ${activeTab} agentic enrichment completed`);
      }).catch((err: Error) => {
        console.warn(`[IntelligenceOverview] ⚠️ ${activeTab} agentic enrichment failed:`, err.message);
      });
    }
  }, [activeTab, sendCareersMsg, sendSkillsMsg, sendFundingMsg]);

  // When agentic RAG returns messages with sources/contradictions, merge into chart data
  ReactUseEffect(() => {
    const lastAssistant = [...agenticMessages].reverse().find(m => m.role === 'assistant' && !m.isLoading);
    if (!lastAssistant) return;

    const agenticSources = lastAssistant.sources || [];

    if (agenticSources.length > 0) {
      const existingIds = new Set(chartSources.map(s => s.id));
      const newSources = agenticSources
        .filter(s => !existingIds.has(s.documentId))
        .map(s => ({
          id: s.documentId || s.title,
          documentId: s.documentId || s.title,
          title: s.title || 'Agentic Discovery',
          score: (s.relevance || 70) / 100,
          category: s.category || extractCategoryFromTitle(s.title),
          sector: extractSectorFromContent(s.snippet || s.title),
          pageNumber: s.pageNumber,
          content: s.snippet || '',
          hasChart: false,
          chartType: undefined as string | undefined,
          chartData: undefined,
          visualDescription: undefined as string | undefined,
        }));

      if (newSources.length > 0) {
        const merged = [...chartSources, ...newSources];
        setChartSources(merged);
        const vizData = transformSearchResultsToVisualizationData(merged, searchQuery || '');
        setChartVisualizationData(vizData);
      }
    }

  }, [agenticMessages]);

  // Extract per-tab agentic data into viz sources
  ReactUseEffect(() => {
    const tabMsgMap: Record<string, typeof careersAgenticMsgs> = {
      careers: careersAgenticMsgs,
      skills: skillsAgenticMsgs,
      funding: fundingAgenticMsgs,
    };

    for (const [tab, msgs] of Object.entries(tabMsgMap)) {
      const last = [...msgs].reverse().find(m => m.role === 'assistant' && !m.isLoading);
      if (!last) continue;

      const sources = (last.sources || []).map(s => ({
        id: s.documentId || s.title,
        documentId: s.documentId || s.title,
        title: s.title || 'Document',
        score: (s.relevance || 70) / 100,
        category: s.category || extractCategoryFromTitle(s.title),
        sector: extractSectorFromContent(s.snippet || s.title),
        pageNumber: s.pageNumber,
        content: s.snippet || '',
        hasChart: false,
        chartType: undefined as string | undefined,
        chartData: undefined,
        visualDescription: undefined as string | undefined,
      }));

      if (sources.length > 0 && !tabSources[tab]?.length) {
        setTabSources(prev => ({ ...prev, [tab]: sources }));
        setTabVizData(prev => ({
          ...prev,
          [tab]: transformSearchResultsToVisualizationData(sources, tab),
        }));
      }

    }
  }, [careersAgenticMsgs, skillsAgenticMsgs, fundingAgenticMsgs]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshAll();
    setLastRefresh(new Date());
    setIsRefreshing(false);
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab as IntelligenceTab);
  };

  // Fetch chart chunks when search query changes
  const fetchChartChunks = async (query: string, forceRefresh = false) => {
    if (!query || query.trim().length === 0) {
      setChartSources([]);
      setChartVisualizationData(null);
      return;
    }

    // Check cache first (10-minute TTL, invalidate on query change)
    const cacheKey = `chart-chunks-${query}`;
    if (!forceRefresh) {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        try {
          const cachedData = JSON.parse(cached);
          const cacheAge = Date.now() - cachedData.timestamp;
          const cacheTTL = 10 * 60 * 1000; // 10 minutes
          
          if (cacheAge < cacheTTL) {
            setChartSources(cachedData.sources || []);
            setChartVisualizationData(cachedData.vizData || null);
            setLoadingCharts(false);
            return;
          }
        } catch (e) {
          // Invalid cache, continue to fetch
        }
      }
    }

    setLoadingCharts(true);
    let retryCount = 0;
    const maxRetries = 2;
    
    while (retryCount < maxRetries) {
      try {
        // Use semantic search to find document chunks (including charts)
        const results = await semanticSearch(
          query,
          {},  // filters (arg2)
          { topK: 30 }  // options (arg3) — fetch more to increase chart hit rate
        );

        if (results && results.sources && results.sources.length > 0) {
          // Transform results to sources format
          const sources = results.sources.map((result: any) => ({
            id: result.id,
            documentId: result.documentId,
            title: result.title || 'Untitled',
            score: result.score || 0,
            category: result.category,
            sector: result.sector,
            pageNumber: result.pageNumber,
            content: result.content,
            hasChart: result.metadata?.hasChart || result.hasChart || result.metadata?.chunkType === 'chart',
            chartType: result.metadata?.chartType || result.chartType,
            chartData: result.metadata?.chartData || result.chartData,
            chartImageUrl: result.metadata?.chartImageUrl || result.chartImageUrl,
            visualDescription: result.metadata?.visualDescription || result.visualDescription
          }));

          setChartSources(sources);

          // Transform to visualization data
          const vizData = transformSearchResultsToVisualizationData(results.sources, query);
          setChartVisualizationData(vizData);
          
          // Cache the result
          sessionStorage.setItem(cacheKey, JSON.stringify({
            sources,
            vizData,
            timestamp: Date.now()
          }));
          
          break; // Success, exit retry loop
        } else {
          setChartSources([]);
          setChartVisualizationData(null);
          break;
        }
      } catch (error) {
        retryCount++;
        if (retryCount >= maxRetries) {
          console.error('Failed to fetch chart chunks after retries:', error);
          setChartSources([]);
          setChartVisualizationData(null);
        } else {
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
        }
      }
    }
    
    setLoadingCharts(false);
  };

  // Fetch charts when search query changes
  ReactUseEffect(() => {
    if (searchQuery) {
      const debounceTimer = setTimeout(() => {
        fetchChartChunks(searchQuery);
      }, 500); // Debounce to avoid too many requests

      return () => clearTimeout(debounceTimer);
    } else {
      setChartSources([]);
      setChartVisualizationData(null);
    }
  }, [searchQuery]);


  const formatTimeAgo = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (seconds < 60) return "just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  const headerActions = (
    <>
      <AstralButton
        onClick={handleRefresh}
        disabled={isRefreshing || globalLoading}
        title="Refresh all data"
      >
        <RefreshCw className={cn("w-3.5 h-3.5", (isRefreshing || globalLoading) && "animate-spin")} />
        <span className="hidden sm:inline">Refresh</span>
      </AstralButton>
      <AstralButton title="Export dashboard data">
        <Download className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Export</span>
      </AstralButton>
    </>
  );

  /* Tab items for AstralTabs */
  /* Labels are questions, not filing-cabinet categories.
     "Overview / Careers / Skills / Funding" told the reader how the data is
     stored; it never told them what they could find out. The ids stay —
     they key the fetches and the prompts — only the wording changes. */
  const tabItems: AstralTabItem[] = [
    { id: "overview", label: "What's changing", icon: <LayoutDashboard className="w-3.5 h-3.5" /> },
    { id: "careers",  label: "Who's hiring",    icon: <Briefcase      className="w-3.5 h-3.5" /> },
    { id: "skills",   label: "What to learn",   icon: <Brain          className="w-3.5 h-3.5" /> },
    { id: "funding",  label: "Where money goes", icon: <DollarSign    className="w-3.5 h-3.5" /> },
  ];

  /* One definition of "connected", used by the masthead and the shell
     subtitle so they can never disagree. Documents are the only honest
     proof: the page can render, poll and animate perfectly while the corpus
     is unreachable, and for months it did exactly that. */
  const isConnected = (metrics?.totalDocuments ?? 0) > 0;

  /* Masthead figures.
     These used to describe the CORPUS — Documents, Chunks, Categories, Hot
     category. "Chunks 2,416" is a retrieval implementation detail; it tells
     a job seeker nothing and told them so in the most prominent position on
     the page. They now describe the FINDINGS: money, roles, skills, and the
     sector leading the spend. */
  const orbitalNodes: OrbitalNode[] = useMemo(() => {
    const topSector = metrics?.topSectors?.[0];
    const budgetB = totalBudget > 0 ? `$${(totalBudget / 1000).toFixed(1)}B` : "—";

    return [
      { label: "Committed",   value: budgetB,                                   ring: 0, angle: 20,  color: "rgba(124,92,255,1)"  },
      { label: "Biggest spend", value: topSector?.name ?? "—",                  ring: 1, angle: 85,  color: "rgba(252,211,77,1)"  },
      { label: "Sectors",     value: String(metrics?.topSectors?.length ?? 0),  ring: 0, angle: 160, color: "rgba(244,114,182,1)" },
      { label: "Roles named", value: String(careerOpportunities.length),        ring: 2, angle: 220, color: "rgba(94,234,212,1)"  },
      { label: "Skills in demand", value: String(skillsDemand.length),          ring: 1, angle: 305, color: "rgba(34,211,238,1)"  },
      { label: "Sources",     value: String(metrics?.totalDocuments ?? 0),      ring: 2, angle: 40,  color: "rgba(167,139,250,1)" },
    ];
  }, [metrics, totalBudget, careerOpportunities.length, skillsDemand.length]);

  /* The one sentence the page leads with.
     There was no entry point before: the reader arrived to four tabs and a
     wall of panels with nothing telling them what the page had actually
     found. This states the strongest thing known, in plain words, and only
     when it is genuinely known — no data means no claim. */
  const leadFinding = useMemo(() => {
    const topSector = metrics?.topSectors?.[0];
    if (!topSector || totalBudget <= 0) return null;

    const roles = careerOpportunities.length;
    const skills = skillsDemand.length;
    const share = Math.round(
      (fundingAllocations.find(f => f.sector === topSector.name)?.amount ?? 0) /
        Math.max(totalBudget, 1) * 100,
    );

    const parts: string[] = [
      `${topSector.name} takes the largest share of South Australia's committed spending`,
    ];
    if (share > 0) parts.push(`about ${share}% of $${(totalBudget / 1000).toFixed(1)}B`);

    const tail: string[] = [];
    if (roles > 0) tail.push(`${roles} occupation${roles === 1 ? "" : "s"}`);
    if (skills > 0) tail.push(`${skills} skill${skills === 1 ? "" : "s"}`);

    return {
      headline: `${parts.join(" — ")}.`,
      support: tail.length
        ? `The same documents name ${tail.join(" and ")} the state expects to need.`
        : null,
    };
  }, [metrics, totalBudget, fundingAllocations, careerOpportunities.length, skillsDemand.length]);

  return (
    <AstralShell
      className="ds-shell"
      title={<span className="as-gradient-text">Intelligence</span>}
      /* Three distinct states, and the reader must be able to tell them
         apart. Showing hours-old figures under a "just now" timestamp would
         undo the entire point of caching them. */
      subtitle={
        snapshotAge
          ? `Readings from ${describeAge(snapshotAge)} · refreshing…`
          : isConnected
            ? `${(metrics?.totalDocuments ?? 0).toLocaleString()} docs · ${formatTimeAgo(lastRefresh)}`
            : "Archive not connected"
      }
      actions={headerActions}
      liveBadge={isConnected}
      backTo="/dashboard"
    >
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="space-y-10"
      >
        {/* Observatory masthead */}
        <motion.div variants={item}>
          <AstralMasthead
            /* Was "§ Observatory · Live telemetry" over "A sky of evidence,
               charted in real time." Neither survived contact with a page
               reading zero: nothing was live, nothing was being charted, and
               "a sky of evidence" describes nothing a reader can check. The
               kicker now reflects the actual connection state. */
            /* "§ Observatory" framed the page as a surveillance console.
               The reader is a job seeker, not an analyst — the kicker now
               names the source they are reading from. */
            kicker={
              isConnected
                ? `§ South Australian public record · ${(metrics?.totalDocuments ?? 0).toLocaleString()} documents`
                : "§ South Australian public record · not connected"
            }
            title={
              <>
                Where the work
                <br />
                <span className="as-italic">is going next.</span>
              </>
            }
            subtitle="South Australia publishes its budget, workforce plans and skills reporting. This reads them together, so you can see which sectors are being funded and which roles that creates."
            nodes={orbitalNodes}
          />
        </motion.div>

        {/* The lead finding — the page's entry point.
            Rendered only when there is something real to say. A placeholder
            here would be the exact failure the honesty pass removed. */}
        {leadFinding && (
          <motion.div variants={item}>
            <div className="as-panel px-6 py-7 md:px-10 md:py-9">
              <div className="flex items-center gap-3">
                <span className="as-label-sm whitespace-nowrap" style={{ color: "var(--as-aurora-2)" }}>
                  § The short version
                </span>
                <span className="h-px flex-1" style={{ background: "var(--as-hair-strong)" }} />
              </div>
              <p
                className="as-display mt-5 text-2xl leading-[1.25] tracking-[-0.02em] md:text-[32px] md:leading-[1.2]"
                style={{ color: "var(--as-ion)" }}
              >
                {leadFinding.headline}
              </p>
              {leadFinding.support && (
                <p className="mt-3 max-w-2xl text-[15px] leading-relaxed" style={{ color: "var(--as-mist)" }}>
                  {leadFinding.support}
                </p>
              )}
            </div>
          </motion.div>
        )}

        {/* Constellation tabs */}
        <motion.div variants={item} className="flex justify-center">
          <AstralTabs
            value={activeTab}
            onChange={(id) => handleTabChange(id as IntelligenceTab)}
            items={tabItems}
          />
        </motion.div>

        {/* Tab content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.35 }}
            className="space-y-6"
          >
            {activeTab === "overview" && (
              <>
                <IntelligenceHero />
                <DataStoriesPanel />
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <LiveDiscoveryFeed />
                  <AIInsightsPanel
                    tab="overview"
                    title="What's changing"
                    maxInsights={4}
                  />
                </div>
                <CrossTabConnections />
                <DocumentIntelligenceVisualizer
                  sources={chartSources}
                  visualizationData={chartVisualizationData}
                  query={searchQuery}
                  isLoading={loadingCharts}
                />
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2"><SectorHeatmap /></div>
                  <div><InvestmentHighlights /></div>
                </div>
                <BreakingNews />
              </>
            )}

            {activeTab === "careers" && (
              <>
                <AIInsightsPanel tab="careers" maxInsights={3} />
                <CareersDashboard searchQuery={searchQuery} />
                {(tabSources.careers?.length > 0) && (
                  <DocumentIntelligenceVisualizer
                    sources={tabSources.careers || []}
                    visualizationData={tabVizData.careers}
                    query={searchQuery || 'careers'}
                    isLoading={false}
                  />
                )}
              </>
            )}

            {activeTab === "skills" && (
              <>
                <AIInsightsPanel tab="skills" maxInsights={3} />
                <SkillsDashboard searchQuery={searchQuery} />
                {(tabSources.skills?.length > 0) && (
                  <DocumentIntelligenceVisualizer
                    sources={tabSources.skills || []}
                    visualizationData={tabVizData.skills}
                    query={searchQuery || 'skills'}
                    isLoading={false}
                  />
                )}
              </>
            )}

            {activeTab === "funding" && (
              <>
                <AIInsightsPanel tab="funding" maxInsights={3} />
                <FundingDashboard searchQuery={searchQuery} />
                {(tabSources.funding?.length > 0) && (
                  <DocumentIntelligenceVisualizer
                    sources={tabSources.funding || []}
                    visualizationData={tabVizData.funding}
                    query={searchQuery || 'funding'}
                    isLoading={false}
                  />
                )}
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </AstralShell>
  );
}

/**
 * Main page component with provider wrapper
 */
export default function IntelligenceOverview() {
  return (
    <IntelligenceProvider>
      <IntelligenceDashboardContent />
    </IntelligenceProvider>
  );
}
