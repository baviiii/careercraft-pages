/**
 * QueryInsightsVisualizer Component
 * 
 * Shows meaningful data extracted from sources:
 * - Top sectors with document counts
 * - Career/occupation breakdown with growth rates
 * - Funding amounts by sector
 * - Key content highlights with context
 */

import React, { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  Legend,
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
  Briefcase,
  DollarSign,
  MapPin,
  Building2,
} from 'lucide-react';
import { VisualizationData, extractVisualizationInsights } from '@/lib/intelligence/visualizationData';

interface Source {
  documentId: string;
  title: string;
  score: number;
  category?: string;
  sector?: string;
  pageNumber?: number;
  content?: string;
}

interface QueryInsightsVisualizerProps {
  sources: Source[];
  visualizationData?: VisualizationData;
  query?: string;
  className?: string;
}

const SECTOR_COLORS: Record<string, string> = {
  'Healthcare': '#ef4444',
  'Health': '#ef4444',
  'Education': '#3b82f6',
  'Technology': '#8b5cf6',
  'Construction': '#f59e0b',
  'Energy': '#10b981',
  'Green Energy': '#10b981',
  'Transport': '#06b6d4',
  'Defence': '#6366f1',
  'Agriculture': '#84cc16',
  'Mining': '#d97706',
  'Government': '#64748b',
  'Social Services': '#ec4899',
};

const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16'];

export const QueryInsightsVisualizer: React.FC<QueryInsightsVisualizerProps> = ({
  sources,
  visualizationData,
  query,
  className = '',
}) => {
  // Extract meaningful data from sources
  const sectorBreakdown = useMemo(() => {
    const sectors: Record<string, { count: number; avgScore: number; totalScore: number }> = {};
    for (const s of sources) {
      const sector = s.sector || 'General';
      if (!sectors[sector]) sectors[sector] = { count: 0, avgScore: 0, totalScore: 0 };
      sectors[sector].count++;
      sectors[sector].totalScore += s.score;
    }
    return Object.entries(sectors)
      .map(([name, data]) => ({
        name,
        count: data.count,
        avgRelevance: Math.round((data.totalScore / data.count) * 100),
        fill: SECTOR_COLORS[name] || '#6366f1',
      }))
      .sort((a, b) => b.count - a.count);
  }, [sources]);

  const categoryBreakdown = useMemo(() => {
    const cats: Record<string, number> = {};
    for (const s of sources) {
      const cat = s.category || 'Other';
      cats[cat] = (cats[cat] || 0) + 1;
    }
    return Object.entries(cats)
      .map(([name, value], i) => ({ name, value, fill: PIE_COLORS[i % PIE_COLORS.length] }))
      .sort((a, b) => b.value - a.value);
  }, [sources]);

  // Extract content highlights (key topics/entities from source content)
  const contentHighlights = useMemo(() => {
    const highlights: { text: string; source: string; sector: string; score: number }[] = [];
    const seen = new Set<string>();

    for (const source of sources.slice(0, 15)) {
      if (!source.content) continue;
      const content = source.content;

      // Extract dollar amounts with context
      const dollarMatches = content.match(/\$[\d,.]+\s*(million|billion|[MB])/gi);
      if (dollarMatches) {
        for (const match of dollarMatches.slice(0, 2)) {
          const idx = content.indexOf(match);
          const context = content.substring(Math.max(0, idx - 40), Math.min(content.length, idx + match.length + 60)).trim();
          const key = match.toLowerCase();
          if (!seen.has(key)) {
            seen.add(key);
            highlights.push({ text: context, source: source.title, sector: source.sector || '', score: source.score });
          }
        }
      }

      // Extract percentage growth with context
      const growthMatches = content.match(/[\d.]+%\s*(growth|increase|rise|decline|decrease)/gi);
      if (growthMatches) {
        for (const match of growthMatches.slice(0, 1)) {
          const idx = content.indexOf(match);
          const context = content.substring(Math.max(0, idx - 40), Math.min(content.length, idx + match.length + 60)).trim();
          const key = match.toLowerCase();
          if (!seen.has(key)) {
            seen.add(key);
            highlights.push({ text: context, source: source.title, sector: source.sector || '', score: source.score });
          }
        }
      }
    }

    return highlights.slice(0, 6);
  }, [sources]);

  // Extract insights
  const insights = visualizationData
    ? extractVisualizationInsights(visualizationData)
    : [];

  const uniqueDocuments = new Set(sources.map(s => s.documentId)).size;
  const avgScore = sources.length > 0
    ? (sources.reduce((acc, s) => acc + s.score, 0) / sources.length)
    : 0;

  if (sources.length === 0) return null;

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-slate-800/60 border-slate-600">
          <CardContent className="p-4 text-center">
            <FileText className="w-5 h-5 text-blue-400 mx-auto mb-1" />
            <p className="text-2xl font-bold text-white">{uniqueDocuments}</p>
            <p className="text-xs text-slate-300">Documents Analyzed</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-800/60 border-slate-600">
          <CardContent className="p-4 text-center">
            <Building2 className="w-5 h-5 text-purple-400 mx-auto mb-1" />
            <p className="text-2xl font-bold text-white">{sectorBreakdown.length}</p>
            <p className="text-xs text-slate-300">Sectors Covered</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-800/60 border-slate-600">
          <CardContent className="p-4 text-center">
            <Target className="w-5 h-5 text-green-400 mx-auto mb-1" />
            <p className="text-2xl font-bold text-white">{Math.round(avgScore * 100)}%</p>
            <p className="text-xs text-slate-300">Avg Relevance</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-800/60 border-slate-600">
          <CardContent className="p-4 text-center">
            <BarChart3 className="w-5 h-5 text-amber-400 mx-auto mb-1" />
            <p className="text-2xl font-bold text-white">{sources.length}</p>
            <p className="text-xs text-slate-300">Source Chunks</p>
          </CardContent>
        </Card>
      </div>

      {/* Two column layout: Sector bar chart + Category pie */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Sector Distribution */}
        {sectorBreakdown.length > 0 && (
          <Card className="bg-slate-800/60 border-slate-600">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2 text-white">
                <Building2 className="w-4 h-4 text-purple-400" />
                Sources by Sector
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={sectorBreakdown} layout="vertical" margin={{ left: 10, right: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis type="number" stroke="#cbd5e1" tick={{ fill: '#cbd5e1', fontSize: 11 }} />
                    <YAxis
                      dataKey="name"
                      type="category"
                      width={100}
                      stroke="#cbd5e1"
                      tick={{ fill: '#e2e8f0', fontSize: 12 }}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px', color: '#f1f5f9' }}
                      formatter={(value: number, name: string) => [value, name === 'count' ? 'Documents' : 'Avg Relevance']}
                    />
                    <Bar dataKey="count" radius={[0, 6, 6, 0]} name="Documents">
                      {sectorBreakdown.map((entry, i) => (
                        <Cell key={i} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Category Breakdown Pie */}
        {categoryBreakdown.length > 0 && (
          <Card className="bg-slate-800/60 border-slate-600">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2 text-white">
                <Briefcase className="w-4 h-4 text-blue-400" />
                Document Categories
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryBreakdown}
                      cx="50%"
                      cy="50%"
                      outerRadius={85}
                      innerRadius={40}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      labelLine={{ stroke: '#94a3b8' }}
                    >
                      {categoryBreakdown.map((entry, i) => (
                        <Cell key={i} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px', color: '#f1f5f9' }}
                      formatter={(value: number) => [`${value} documents`, 'Count']}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Content Highlights - Key data extracted from documents */}
      {contentHighlights.length > 0 && (
        <Card className="bg-slate-800/60 border-slate-600">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-white">
              <Lightbulb className="w-4 h-4 text-amber-400" />
              Key Data Points from Documents
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {contentHighlights.map((highlight, i) => (
                <div key={i} className="p-3 bg-slate-900/60 rounded-lg border border-slate-700">
                  <p className="text-sm text-slate-100 leading-relaxed">
                    "...{highlight.text}..."
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="outline" className="text-[10px] text-slate-300 border-slate-500">
                      {highlight.source.length > 30 ? highlight.source.substring(0, 28) + '…' : highlight.source}
                    </Badge>
                    {highlight.sector && (
                      <Badge className="text-[10px] bg-purple-500/20 text-purple-300 border-purple-500/40">
                        {highlight.sector}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI Insights */}
      {insights.length > 0 && (
        <Card className="bg-slate-800/60 border-slate-600">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-white">
              <TrendingUp className="w-4 h-4 text-green-400" />
              AI-Generated Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {insights.map((insight, index) => (
                <li key={index} className="flex items-start gap-2 text-sm text-slate-200">
                  <span className="text-green-400 mt-0.5 font-bold">→</span>
                  {insight}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Top Sources with sector/category context */}
      <Card className="bg-slate-800/60 border-slate-600">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2 text-white">
            <FileText className="w-4 h-4 text-blue-400" />
            Top Matching Sources
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {sources.slice(0, 6).map((source, index) => (
              <div key={source.documentId + index} className="p-3 bg-slate-900/40 rounded-lg border border-slate-700/50">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {source.title || source.documentId}
                    </p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {source.sector && (
                        <Badge className="text-[10px] px-1.5 py-0" style={{ backgroundColor: (SECTOR_COLORS[source.sector] || '#6366f1') + '33', color: SECTOR_COLORS[source.sector] || '#a5b4fc', borderColor: (SECTOR_COLORS[source.sector] || '#6366f1') + '55' }}>
                          {source.sector}
                        </Badge>
                      )}
                      {source.category && (
                        <span className="text-[11px] text-slate-300">{source.category}</span>
                      )}
                      {source.pageNumber && (
                        <span className="text-[10px] text-slate-400">Page {source.pageNumber}</span>
                      )}
                    </div>
                  </div>
                  <Badge
                    className={`text-xs shrink-0 ${source.score > 0.7 ? 'bg-green-500/20 text-green-300 border-green-500/40' : source.score > 0.4 ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' : 'bg-slate-500/20 text-slate-300 border-slate-500/40'}`}
                  >
                    {Math.round(source.score * 100)}%
                  </Badge>
                </div>
                <Progress value={source.score * 100} className="h-1 mt-2" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default QueryInsightsVisualizer;
