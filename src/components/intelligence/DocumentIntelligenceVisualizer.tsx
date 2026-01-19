/**
 * DocumentIntelligenceVisualizer Component
 * 
 * Main container component that orchestrates all intelligence visualizations.
 * Handles query-based regeneration and manages visualization state.
 */

import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { MetadataDistributionCharts } from './MetadataDistributionCharts';
import { PDFChartVisualizer } from './PDFChartVisualizer';
import { QueryInsightsVisualizer } from './QueryInsightsVisualizer';
import { RelationshipGraph } from './RelationshipGraph';
import { ContradictionVisualizer } from './ContradictionVisualizer';
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
  onRefresh,
  className = '',
}) => {
  const [activeTab, setActiveTab] = useState('insights');
  const [autoRegenerate, setAutoRegenerate] = useState(true);

  // Use provided visualization data or create empty
  const vizData = visualizationData || createEmptyVisualizationData();

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

            <TabsContent value="relationships" className="mt-0">
              <RelationshipGraph sources={sources} />
            </TabsContent>

            <TabsContent value="contradictions" className="mt-0">
              <ContradictionVisualizer />
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>
    </div>
  );
};

export default DocumentIntelligenceVisualizer;
