/**
 * DocumentIntelligenceVisualizer Component
 * 
 * Main container component that orchestrates all intelligence visualizations.
 * Handles query-based regeneration and manages visualization state.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  BarChart3,
  PieChart,
  Network,
  AlertTriangle,
  Download,
  RefreshCw,
  Image as ImageIcon,
  Layers,
  Table2,
} from 'lucide-react';
import { MetadataDistributionCharts } from './MetadataDistributionCharts';
import { PDFChartVisualizer } from './PDFChartVisualizer';
import { QueryInsightsVisualizer } from './QueryInsightsVisualizer';
import { RelationshipGraph } from './RelationshipGraph';
import { ContradictionVisualizer } from './ContradictionVisualizer';
import { DataTableVisualizer } from './DataTableVisualizer';
import {
  VisualizationData,
  ChartResult,
  MetadataDistribution,
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
}

interface AgenticContradiction {
  type: string;
  source1Document: string;
  source1Text?: string;
  source2Document: string;
  source2Text?: string;
  description: string;
  severity: "high" | "medium" | "low";
  possibleResolution?: string;
}

interface DocumentIntelligenceVisualizerProps {
  sources: Source[];
  visualizationData?: VisualizationData;
  query?: string;
  isLoading?: boolean;
  onRefresh?: () => void;
  className?: string;
  contradictions?: AgenticContradiction[];
}

export const DocumentIntelligenceVisualizer: React.FC<DocumentIntelligenceVisualizerProps> = ({
  sources,
  visualizationData,
  query,
  isLoading = false,
  onRefresh,
  className = '',
  contradictions,
}) => {
  const [activeTab, setActiveTab] = useState('insights');
  const [autoRegenerate, setAutoRegenerate] = useState(true);

  // Use provided visualization data or create empty
  const vizData = visualizationData || createEmptyVisualizationData();

  // Map agentic contradictions to ContradictionPair format
  const mappedContradictions = useMemo(() => {
    if (!contradictions || contradictions.length === 0) return undefined;
    
    const typeMap: Record<string, 'policy' | 'data' | 'definition' | 'procedure' | 'other'> = {
      'policy_conflict': 'policy',
      'funding_mismatch': 'data',
      'data_inconsistency': 'data',
      'timeline_conflict': 'procedure',
      'priority_conflict': 'policy',
    };

    return contradictions.map((c, idx) => ({
      id: `contradiction-${idx}`,
      documentA: {
        id: c.source1Document,
        title: c.source1Document,
        excerpt: c.source1Text || 'No excerpt available',
      },
      documentB: {
        id: c.source2Document,
        title: c.source2Document,
        excerpt: c.source2Text || 'No excerpt available',
      },
      type: typeMap[c.type] || 'other' as const,
      severity: c.severity,
      description: c.description,
      confidence: c.severity === 'high' ? 0.85 : c.severity === 'medium' ? 0.65 : 0.45,
    }));
  }, [contradictions]);

  // Fetch graph relationships from graph-query API
  const [graphRelationships, setGraphRelationships] = useState<Array<{ source: string; target: string; type: string; weight?: number }>>([]);
  const [loadingGraph, setLoadingGraph] = useState(false);

  useEffect(() => {
    const fetchGraphRelationships = async () => {
      const graphUrl = import.meta.env.VITE_AZURE_GRAPH_QUERY_URL || '';
      const functionKey = import.meta.env.VITE_AZURE_FUNCTION_KEY || '';
      if (!graphUrl || sources.length === 0) return;

      setLoadingGraph(true);
      try {
        // Extract unique sectors/categories from sources to query for related entities
        const sectors = [...new Set(sources.map(s => s.sector).filter(Boolean))];
        const categories = [...new Set(sources.map(s => s.category).filter(Boolean))];
        const entities = [...sectors, ...categories].slice(0, 5);

        const allRelationships: Array<{ source: string; target: string; type: string; weight?: number }> = [];

        for (const entity of entities) {
          try {
            const response = await fetch(graphUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...(functionKey ? { 'x-functions-key': functionKey } : {}),
              },
              body: JSON.stringify({
                action: 'search',
                query: entity,
                limit: 10,
              }),
            });

            if (response.ok) {
              const data = await response.json();
              const raw = Array.isArray(data) ? data : data.data || data.result || data.results || [];
              // Flatten paths (arrays of arrays) into flat entity objects
              const flat: any[] = [];
              for (const item of raw) {
                if (Array.isArray(item)) {
                  for (const step of item) {
                    if (step && typeof step === 'object' && !Array.isArray(step)) flat.push(step);
                  }
                } else if (item && typeof item === 'object') {
                  flat.push(item);
                }
              }
              for (const item of flat) {
                const targetName = item.name || item.canonical_name || item.canonicalName || item.id;
                if (targetName && typeof targetName === 'string') {
                  allRelationships.push({
                    source: entity!,
                    target: targetName,
                    type: item.relationship_type || item.entity_type || item.type || 'related',
                    weight: item.weight || item.similarity || 0.7,
                  });
                }
              }
            }
          } catch {
            // Silently continue if a single entity lookup fails
          }
        }

        setGraphRelationships(allRelationships);
      } catch (err) {
        console.error('Failed to fetch graph relationships:', err);
      } finally {
        setLoadingGraph(false);
      }
    };

    fetchGraphRelationships();
  }, [sources]);

  // Auto-regenerate when query changes
  useEffect(() => {
    if (autoRegenerate && query && onRefresh) {
      // Visualizations auto-update when new data comes in
      // This is handled by the parent component passing new props
    }
  }, [query, autoRegenerate, onRefresh]);

  // Calculate stats
  const totalCharts = vizData.charts.length;
  const hasCharts = totalCharts > 0;
  const hasMetadata = Object.keys(vizData.metadataDistribution.categories).length > 0;

  // Loading skeleton
  if (isLoading) {
    return (
      <div className={`space-y-4 ${className}`}>
        <Card className="bg-slate-900/50 border-slate-700">
          <CardHeader className="pb-2">
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Skeleton className="h-64 w-full" />
              <div className="grid grid-cols-4 gap-4">
                <Skeleton className="h-20" />
                <Skeleton className="h-20" />
                <Skeleton className="h-20" />
                <Skeleton className="h-20" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // No data state
  if (sources.length === 0 && !hasCharts && !hasMetadata) {
    return (
      <Card className={`bg-slate-900/50 border-slate-700 ${className}`}>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Layers className="w-12 h-12 text-slate-600 mb-4" />
          <p className="text-slate-400 text-center">
            No visualization data available.<br />
            Run a query to see insights and charts.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header with controls */}
      <Card className="bg-slate-900/50 border-slate-700">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2 text-slate-100">
              <BarChart3 className="w-5 h-5 text-blue-400" />
              Intelligence Visualizations
            </CardTitle>
            <div className="flex items-center gap-2">
              {totalCharts > 0 && (
                <Badge variant="secondary" className="text-xs">
                  <ImageIcon className="w-3 h-3 mr-1" />
                  {totalCharts} Chart{totalCharts !== 1 ? 's' : ''}
                </Badge>
              )}
              {onRefresh && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onRefresh}
                  disabled={isLoading}
                >
                  <RefreshCw className={`w-4 h-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              )}
              <Button variant="ghost" size="sm">
                <Download className="w-4 h-4 mr-1" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Visualization Tabs */}
      <Card className="bg-slate-900/50 border-slate-700">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full justify-start bg-slate-800/50 border-b border-slate-700 rounded-b-none">
            <TabsTrigger value="insights" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Query Insights
            </TabsTrigger>
            <TabsTrigger value="distribution" className="flex items-center gap-2">
              <PieChart className="w-4 h-4" />
              Distribution
            </TabsTrigger>
            {hasCharts && (
              <TabsTrigger value="charts" className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4" />
                PDF Charts
                <Badge variant="secondary" className="text-xs ml-1">
                  {totalCharts}
                </Badge>
              </TabsTrigger>
            )}
            <TabsTrigger value="tables" className="flex items-center gap-2">
              <Table2 className="w-4 h-4" />
              Tables
            </TabsTrigger>
            <TabsTrigger value="relationships" className="flex items-center gap-2">
              <Network className="w-4 h-4" />
              Relationships
            </TabsTrigger>
            <TabsTrigger value="contradictions" className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Contradictions
            </TabsTrigger>
          </TabsList>

          <CardContent className="pt-4">
            <TabsContent value="insights" className="mt-0">
              <QueryInsightsVisualizer
                sources={sources}
                visualizationData={vizData}
                query={query}
              />
            </TabsContent>

            <TabsContent value="distribution" className="mt-0">
              <MetadataDistributionCharts
                distribution={vizData.metadataDistribution}
                title="Source Distribution Analysis"
              />
            </TabsContent>

            {hasCharts && (
              <TabsContent value="charts" className="mt-0">
                <PDFChartVisualizer charts={vizData.charts} />
              </TabsContent>
            )}

            <TabsContent value="tables" className="mt-0">
              <DataTableVisualizer
                query={query}
                sector={sources[0]?.sector}
                category={sources[0]?.category}
                maxTables={30}
              />
            </TabsContent>

            <TabsContent value="relationships" className="mt-0">
              <RelationshipGraph sources={sources} graphRelationships={graphRelationships} loadingGraph={loadingGraph} />
            </TabsContent>

            <TabsContent value="contradictions" className="mt-0">
              <ContradictionVisualizer contradictions={mappedContradictions} />
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>
    </div>
  );
};

export default DocumentIntelligenceVisualizer;
