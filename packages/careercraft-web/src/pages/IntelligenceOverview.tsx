/**
 * IntelligenceOverview - Main intelligence dashboard page
 * 
 * Features:
 * - Centralized IntelligenceContext for cost-efficient data fetching
 * - AI-powered insights with cross-tab connections
 * - Stunning hero section with real-time metrics
 * - Tab-based navigation with lazy loading
 */

import { useState, useEffect as ReactUseEffect, useRef, useMemo } from "react";
import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CareerPulse,
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
import { ImpactScenarioPanel } from "@/components/intelligence/NextGenInsights";
import { IntelligenceProvider, useIntelligence } from "@/contexts/IntelligenceContext";
import { useRAGMetadata } from "@/hooks/useRAGMetadata";
import { useAgenticRAG } from "@/hooks/useAgenticRAG";
import { transformSearchResultsToVisualizationData } from "@/lib/intelligence/visualizationData";
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
  const [contradictions, setContradictions] = useState<any[]>([]);
  const hasSetDefaultQuery = useRef(false);
  const agenticFetchDone = useRef(false);
  const tabAgenticDone = useRef<Set<string>>(new Set());
  const [tabSources, setTabSources] = useState<Record<string, any[]>>({});
  const [tabVizData, setTabVizData] = useState<Record<string, any>>({});
  const [tabContradictions, setTabContradictions] = useState<Record<string, any[]>>({});

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
    const agenticContradictions = lastAssistant.contradictions || [];

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

    // Use agentic contradictions (richer than raw intersection-reasoning)
    if (agenticContradictions.length > 0) {
      setContradictions(agenticContradictions);
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

      const contras = last.contradictions || [];
      if (contras.length > 0 && !tabContradictions[tab]?.length) {
        setTabContradictions(prev => ({ ...prev, [tab]: contras }));
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

  // Fetch contradictions via intersection-reasoning when chart sources are available
  ReactUseEffect(() => {
    const fetchContradictions = async () => {
      if (chartSources.length < 2) {
        setContradictions([]);
        return;
      }

      const intersectionUrl = import.meta.env.VITE_AZURE_INTERSECTION_REASONING_URL || '';
      const functionKey = import.meta.env.VITE_AZURE_FUNCTION_KEY || '';
      if (!intersectionUrl) return;

      try {
        const queryResults = chartSources.map(s => ({
          query: searchQuery || '',
          results: [{
            id: s.id || s.documentId,
            title: s.title,
            content: s.content || '',
            score: s.score || 0,
            category: s.category,
            sector: s.sector,
          }]
        }));

        const response = await fetch(intersectionUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(functionKey ? { 'x-functions-key': functionKey } : {}),
          },
          body: JSON.stringify({
            queryResults: queryResults.slice(0, 10),
            originalQuery: searchQuery || 'intelligence overview',
          }),
        });

        if (response.ok) {
          const analysis = await response.json();
          if (analysis.contradictions && analysis.contradictions.length > 0) {
            setContradictions(analysis.contradictions);
          }
        }
      } catch (err) {
        console.error('Failed to fetch contradictions:', err);
      }
    };

    fetchContradictions();
  }, [chartSources, searchQuery]);

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
  const tabItems: AstralTabItem[] = [
    { id: "overview", label: "Overview", icon: <LayoutDashboard className="w-3.5 h-3.5" /> },
    { id: "careers",  label: "Careers",  icon: <Briefcase      className="w-3.5 h-3.5" /> },
    { id: "skills",   label: "Skills",   icon: <Brain          className="w-3.5 h-3.5" /> },
    { id: "funding",  label: "Funding",  icon: <DollarSign     className="w-3.5 h-3.5" /> },
  ];

  /* Orbital nodes for the masthead hero — derived from live metrics. */
  const orbitalNodes: OrbitalNode[] = useMemo(() => {
    const docs = metrics?.totalDocuments ?? 0;
    const chunks = metrics?.totalChunks ?? 0;
    const cats = metrics?.categories?.length ?? 0;
    const sectors = metrics?.topSectors?.length ?? 0;
    const topSector = metrics?.topSectors?.[0];
    const hottestCat = metrics?.categories?.[0];

    return [
      { label: "Documents",    value: docs.toLocaleString(),        ring: 0, angle: 20,  color: "rgba(124,92,255,1)"  },
      { label: "Chunks",       value: chunks.toLocaleString(),      ring: 1, angle: 85,  color: "rgba(34,211,238,1)"  },
      { label: "Categories",   value: String(cats),                 ring: 0, angle: 160, color: "rgba(244,114,182,1)" },
      { label: "Sectors",      value: String(sectors),              ring: 2, angle: 220, color: "rgba(94,234,212,1)"  },
      { label: "Top sector",   value: topSector?.name ?? "—",       ring: 1, angle: 305, color: "rgba(252,211,77,1)"  },
      { label: "Hot category", value: hottestCat?.name ?? "—",      ring: 2, angle: 40,  color: "rgba(167,139,250,1)" },
    ];
  }, [metrics]);

  return (
    <AstralShell
      title={<span className="as-gradient-text">Intelligence</span>}
      subtitle={`${(metrics?.totalDocuments ?? 0).toLocaleString()} docs · ${formatTimeAgo(lastRefresh)}`}
      actions={headerActions}
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
            kicker="§ Observatory · Live telemetry"
            title={
              <>
                A sky of evidence,
                <br />
                <span className="as-italic">charted in real time.</span>
              </>
            }
            subtitle="Cross-referencing policy, funding, careers and skills across the South Australian archive."
            nodes={orbitalNodes}
          />
        </motion.div>

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
                  sources={chartSources}
                  visualizationData={chartVisualizationData}
                  query={searchQuery}
                  isLoading={loadingCharts}
                  contradictions={contradictions}
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
                    contradictions={tabContradictions.careers || []}
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
                    contradictions={tabContradictions.skills || []}
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
                    contradictions={tabContradictions.funding || []}
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
