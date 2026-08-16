/**
 * DocumentIntelligenceVisualizer Component
 *
 * Collapsible panel showing exactly which PDFs and page numbers were used,
 * plus PDF charts.
 */

import React, { useState, useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import {
  FileText,
  Image as ImageIcon,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  BookOpen,
} from 'lucide-react';
import { PDFChartVisualizer } from './PDFChartVisualizer';
import {
  VisualizationData,
  createEmptyVisualizationData,
} from '@/lib/intelligence/visualizationData';

interface Source {
  id: string;
  documentId: string;
  title: string;
  score: number;
  category?: string;
  sector?: string;
  pageNumber?: number;
  content?: string;
  hasChart?: boolean;
  chartType?: string;
  visualDescription?: string;
  chunkType?: string;
}


interface DocumentIntelligenceVisualizerProps {
  sources: Source[];
  visualizationData?: VisualizationData;
  query?: string;
  isLoading?: boolean;
  onRefresh?: () => void;
  className?: string;
}

export const DocumentIntelligenceVisualizer: React.FC<DocumentIntelligenceVisualizerProps> = ({
  sources,
  visualizationData,
  query,
  isLoading = false,
  className = '',
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState('sources');

  const vizData = visualizationData || createEmptyVisualizationData();
  const totalCharts = vizData.charts.length;
  const hasCharts = totalCharts > 0;

  const typeMap: Record<string, 'policy' | 'data' | 'definition' | 'procedure' | 'other'> = {
    policy_conflict: 'policy',
    funding_mismatch: 'data',
    data_inconsistency: 'data',
    timeline_conflict: 'procedure',
    priority_conflict: 'policy',
  };

  // Contradiction detection was removed with the legacy Azure stack; Horus
  // `intelligence.contradictions` will replace it. The tab is gone rather
  // than left permanently empty.

  // Group sources by document, collecting all page numbers used
  const groupedDocs = useMemo(() => {
    const map = new Map<string, {
      title: string;
      documentId: string;
      pages: Set<number>;
      maxScore: number;
      category?: string;
      sector?: string;
      chunkCount: number;
    }>();
    const maxScore = sources.length > 0 ? Math.max(...sources.map(s => s.score)) : 1;
    for (const s of sources) {
      const key = s.documentId || s.title;
      if (!map.has(key)) {
        map.set(key, {
          title: s.title || s.documentId,
          documentId: s.documentId,
          pages: new Set(),
          maxScore: 0,
          category: s.category,
          sector: s.sector,
          chunkCount: 0,
        });
      }
      const doc = map.get(key)!;
      if (s.pageNumber) doc.pages.add(s.pageNumber);
      if (s.score > doc.maxScore) doc.maxScore = s.score;
      doc.chunkCount++;
    }
    const globalMax = maxScore > 0 ? maxScore : 1;
    return Array.from(map.values())
      .map(d => ({ ...d, relevance: Math.round((d.maxScore / globalMax) * 100) }))
      .sort((a, b) => b.relevance - a.relevance);
  }, [sources]);

  const uniqueDocCount = groupedDocs.length;
  const totalChunkCount = sources.length;

  if (isLoading) {
    return (
      <div className={`${className}`}>
        <div className="rounded-2xl border border-slate-700/50 bg-slate-900/50 p-4 space-y-3">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  if (sources.length === 0 && !hasCharts) return null;

  return (
    <div className={`${className}`}>
      <div className="rounded-2xl border border-slate-700/50 bg-slate-900/60 backdrop-blur-sm overflow-hidden">

        {/* ── Collapsible Header ── */}
        <button
          onClick={() => setCollapsed(c => !c)}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/4 transition-colors text-left"
        >
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <BookOpen className="w-3.5 h-3.5 text-blue-400" />
            </div>
            <span className="text-sm font-semibold text-white">Source Intelligence</span>
            <Badge className="text-[10px] bg-slate-700/60 text-slate-300 border-slate-600/50">
              {uniqueDocCount} PDF{uniqueDocCount !== 1 ? 's' : ''} · {totalChunkCount} chunks
            </Badge>
            {hasCharts && (
              <Badge className="text-[10px] bg-purple-500/20 text-purple-300 border-purple-500/40">
                <ImageIcon className="w-2.5 h-2.5 mr-1" />
                {totalCharts} chart{totalCharts !== 1 ? 's' : ''}
              </Badge>
            )}
          </div>
          {collapsed
            ? <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
            : <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" />
          }
        </button>

        {/* ── Body ── */}
        {!collapsed && (
          <div className="border-t border-slate-700/50">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              {/* Tab bar */}
              <div className="px-4 pt-3 pb-0">
                <TabsList className="bg-slate-800/60 border border-slate-700/50 h-9 gap-1 p-1">
                  <TabsTrigger
                    value="sources"
                    className="flex items-center gap-1.5 text-xs data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-300"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    Sources
                    <span className="ml-0.5 text-[10px] opacity-70">({uniqueDocCount})</span>
                  </TabsTrigger>
                  {hasCharts && (
                    <TabsTrigger
                      value="charts"
                      className="flex items-center gap-1.5 text-xs data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-300"
                    >
                      <ImageIcon className="w-3.5 h-3.5" />
                      PDF Charts
                      <span className="ml-0.5 text-[10px] opacity-70">({totalCharts})</span>
                    </TabsTrigger>
                  )}
                </TabsList>
              </div>

              {/* Sources tab — exact PDFs + page numbers */}
              <TabsContent value="sources" className="mt-0 p-4">
                {groupedDocs.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-6">No source documents available.</p>
                ) : (
                  <div className="space-y-2">
                    {groupedDocs.map((doc, i) => {
                      const sortedPages = Array.from(doc.pages).sort((a, b) => a - b);
                      return (
                        <div
                          key={doc.documentId + i}
                          className="flex items-start gap-3 p-3 rounded-xl bg-slate-800/50 border border-slate-700/40 hover:border-slate-600/60 transition-colors"
                        >
                          {/* Rank */}
                          <span className="text-[11px] font-bold text-slate-500 w-5 shrink-0 mt-0.5">
                            {i + 1}
                          </span>

                          {/* Doc info */}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white leading-snug">
                              {doc.title}
                            </p>
                            <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                              {/* Page numbers */}
                              {sortedPages.length > 0 ? (
                                <div className="flex items-center gap-1 flex-wrap">
                                  <span className="text-[10px] text-slate-400">Pages:</span>
                                  {sortedPages.map(pg => (
                                    <span
                                      key={pg}
                                      className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-300 border border-blue-500/25"
                                    >
                                      {pg}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-[10px] text-slate-500">Page not specified</span>
                              )}
                              {/* Chunk count */}
                              <span className="text-[10px] text-slate-500">
                                · {doc.chunkCount} chunk{doc.chunkCount !== 1 ? 's' : ''}
                              </span>
                              {/* Sector */}
                              {doc.sector && doc.sector !== 'General' && (
                                <Badge className="text-[10px] px-1.5 py-0 bg-purple-500/15 text-purple-300 border-purple-500/30">
                                  {doc.sector}
                                </Badge>
                              )}
                              {/* Category */}
                              {doc.category && (
                                <Badge className="text-[10px] px-1.5 py-0 bg-slate-700/60 text-slate-300 border-slate-600/40">
                                  {doc.category}
                                </Badge>
                              )}
                            </div>
                            {/* Relevance bar */}
                            <div className="flex items-center gap-2 mt-2">
                              <Progress value={doc.relevance} className="h-1 flex-1" />
                              <span className="text-[10px] text-slate-400 shrink-0 w-8 text-right">
                                {doc.relevance}%
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </TabsContent>

              {/* PDF Charts tab */}
              {hasCharts && (
                <TabsContent value="charts" className="mt-0 p-4">
                  <PDFChartVisualizer charts={vizData.charts} />
                </TabsContent>
              )}

            </Tabs>
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentIntelligenceVisualizer;
