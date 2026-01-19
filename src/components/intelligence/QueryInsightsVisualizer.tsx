/**
 * QueryInsightsVisualizer Component
 * 
 * Visualizes insights from intelligence queries.
 * Shows source distribution, relevance scoring, and query analysis.
 */

import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Lightbulb, 
  FileText, 
  TrendingUp,
  BarChart3,
  Target,
} from 'lucide-react';
import { VisualizationData, extractVisualizationInsights } from '@/lib/intelligence/visualizationData';

interface Source {
  documentId: string;
  title: string;
  score: number;
  category?: string;
  sector?: string;
  pageNumber?: number;
}

interface QueryInsightsVisualizerProps {
  sources: Source[];
  visualizationData?: VisualizationData;
  query?: string;
  className?: string;
}

export const QueryInsightsVisualizer: React.FC<QueryInsightsVisualizerProps> = ({
  sources,
  visualizationData,
  query,
  className = '',
}) => {
  // Prepare relevance score data for chart
  const relevanceData = sources
    .slice(0, 10)
    .map(source => ({
      name: source.title?.length > 25 
        ? source.title.substring(0, 25) + '...' 
        : source.title || source.documentId,
      score: (source.score * 100).toFixed(1),
      fullTitle: source.title || source.documentId,
    }));

  // Get max score for normalization
  const maxScore = Math.max(...sources.map(s => s.score), 0.01);

  // Extract insights if visualization data is available
  const insights = visualizationData 
    ? extractVisualizationInsights(visualizationData) 
    : [];

  // Calculate source coverage stats
  const uniqueDocuments = new Set(sources.map(s => s.documentId)).size;
  const avgScore = sources.length > 0 
    ? (sources.reduce((acc, s) => acc + s.score, 0) / sources.length) 
    : 0;

  const getScoreColor = (score: number): string => {
    const normalized = score / maxScore;
    if (normalized > 0.8) return '#10b981';
    if (normalized > 0.5) return '#f59e0b';
    return '#6b7280';
  };

  if (sources.length === 0) {
    return null;
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Query Stats Summary */}
      <Card className="bg-slate-900/50 border-slate-700">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2 text-slate-100">
            <Target className="w-5 h-5 text-blue-400" />
            Query Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-400">{sources.length}</p>
              <p className="text-xs text-slate-400">Sources Found</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-400">{uniqueDocuments}</p>
              <p className="text-xs text-slate-400">Documents</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-amber-400">
                {(avgScore * 100).toFixed(0)}%
              </p>
              <p className="text-xs text-slate-400">Avg Relevance</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-400">
                {visualizationData?.chartCount || 0}
              </p>
              <p className="text-xs text-slate-400">Charts Found</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI Insights */}
      {insights.length > 0 && (
        <Card className="bg-slate-900/50 border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-slate-100">
              <Lightbulb className="w-4 h-4 text-amber-400" />
              Key Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {insights.map((insight, index) => (
                <li key={index} className="flex items-start gap-2 text-sm text-slate-300">
                  <span className="text-amber-400 mt-0.5">•</span>
                  {insight}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Relevance Score Chart */}
      <Card className="bg-slate-900/50 border-slate-700">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2 text-slate-100">
            <BarChart3 className="w-4 h-4 text-blue-400" />
            Source Relevance Scores
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={relevanceData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                <XAxis 
                  type="number" 
                  stroke="#94a3b8" 
                  domain={[0, 100]}
                  tickFormatter={(value) => `${value}%`}
                />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  width={150} 
                  stroke="#94a3b8"
                  tick={{ fontSize: 11 }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1e293b', 
                    border: '1px solid #475569',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number) => [`${value}%`, 'Relevance']}
                  labelFormatter={(label) => {
                    const item = relevanceData.find(d => d.name === label);
                    return item?.fullTitle || label;
                  }}
                />
                <Bar dataKey="score" radius={[0, 4, 4, 0]}>
                  {relevanceData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={getScoreColor(parseFloat(entry.score))} 
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Top Sources List */}
      <Card className="bg-slate-900/50 border-slate-700">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2 text-slate-100">
            <FileText className="w-4 h-4 text-green-400" />
            Top Sources
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {sources.slice(0, 5).map((source, index) => (
              <div key={source.documentId + index} className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-300 truncate max-w-[200px]">
                    {source.title || source.documentId}
                  </span>
                  <div className="flex items-center gap-2">
                    {source.pageNumber && (
                      <Badge variant="outline" className="text-xs">
                        p.{source.pageNumber}
                      </Badge>
                    )}
                    <Badge 
                      variant={source.score > 0.7 ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      {(source.score * 100).toFixed(0)}%
                    </Badge>
                  </div>
                </div>
                <Progress 
                  value={(source.score / maxScore) * 100} 
                  className="h-1"
                />
                <div className="flex gap-2">
                  {source.category && (
                    <span className="text-xs text-slate-500">{source.category}</span>
                  )}
                  {source.sector && (
                    <span className="text-xs text-slate-500">• {source.sector}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default QueryInsightsVisualizer;
