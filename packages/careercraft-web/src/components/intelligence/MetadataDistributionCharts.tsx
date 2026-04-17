/**
 * MetadataDistributionCharts Component
 * 
 * Shows clear, labeled distribution charts for document metadata.
 * Improved: larger labels, better colors, meaningful context in each chart.
 */

import React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { PieChart as PieIcon, BarChart3, FileText, Layers } from 'lucide-react';
import {
  MetadataDistribution,
  metadataToPieChart,
  metadataToBarChart,
} from '@/lib/intelligence/visualizationData';

interface MetadataDistributionChartsProps {
  distribution: MetadataDistribution;
  title?: string;
  className?: string;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16'];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 shadow-xl">
      <p className="text-sm font-medium text-white">{payload[0]?.payload?.name || label}</p>
      <p className="text-xs text-slate-300">{payload[0]?.value} documents</p>
    </div>
  );
};

const renderPieLabel = ({ name, percent, cx, x }: any) => {
  const isLeft = x < cx;
  return (
    <text
      x={x}
      y={undefined}
      fill="#e2e8f0"
      textAnchor={isLeft ? 'end' : 'start'}
      dominantBaseline="central"
      fontSize={12}
      fontWeight={500}
    >
      {name?.length > 16 ? name.substring(0, 14) + '…' : name} ({(percent * 100).toFixed(0)}%)
    </text>
  );
};

export const MetadataDistributionCharts: React.FC<MetadataDistributionChartsProps> = ({
  distribution,
  title = 'Source Distribution',
  className = '',
}) => {
  const categoryData = metadataToPieChart(distribution.categories, COLORS);
  const sectorData = metadataToBarChart(distribution.sectors);
  const documentTypeData = metadataToPieChart(distribution.documentTypes, COLORS);
  const chunkTypeData = metadataToBarChart(distribution.chunkTypes);

  const hasData =
    Object.keys(distribution.categories).length > 0 ||
    Object.keys(distribution.sectors).length > 0;

  if (!hasData) return null;

  const totalDocs = categoryData.reduce((sum, d) => sum + d.value, 0);

  return (
    <Card className={`bg-slate-800/60 border-slate-600 ${className}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg text-white flex items-center gap-2">
            <PieIcon className="w-5 h-5 text-blue-400" />
            {title}
          </CardTitle>
          <Badge variant="outline" className="text-xs text-slate-300 border-slate-500">
            {totalDocs} total sources
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="categories" className="w-full">
          <TabsList className="grid w-full grid-cols-4 bg-slate-900/50 border border-slate-700">
            <TabsTrigger value="categories" className="text-xs data-[state=active]:text-white data-[state=active]:bg-slate-700 text-slate-400">
              <PieIcon className="w-3 h-3 mr-1" />
              Categories
            </TabsTrigger>
            <TabsTrigger value="sectors" className="text-xs data-[state=active]:text-white data-[state=active]:bg-slate-700 text-slate-400">
              <BarChart3 className="w-3 h-3 mr-1" />
              Sectors
            </TabsTrigger>
            <TabsTrigger value="types" className="text-xs data-[state=active]:text-white data-[state=active]:bg-slate-700 text-slate-400">
              <FileText className="w-3 h-3 mr-1" />
              Doc Types
            </TabsTrigger>
            <TabsTrigger value="chunks" className="text-xs data-[state=active]:text-white data-[state=active]:bg-slate-700 text-slate-400">
              <Layers className="w-3 h-3 mr-1" />
              Chunks
            </TabsTrigger>
          </TabsList>

          <TabsContent value="categories" className="mt-4">
            {categoryData.length > 0 ? (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      labelLine={{ stroke: '#64748b' }}
                      label={renderPieLabel}
                      outerRadius={90}
                      innerRadius={35}
                      dataKey="value"
                      strokeWidth={2}
                      stroke="#0f172a"
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-slate-400 text-center py-8">No category data available</p>
            )}
          </TabsContent>

          <TabsContent value="sectors" className="mt-4">
            {sectorData.length > 0 ? (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={sectorData} layout="vertical" margin={{ left: 10, right: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis type="number" stroke="#cbd5e1" tick={{ fill: '#cbd5e1', fontSize: 11 }} />
                    <YAxis
                      dataKey="name"
                      type="category"
                      width={110}
                      stroke="#cbd5e1"
                      tick={{ fill: '#e2e8f0', fontSize: 12 }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="value" radius={[0, 6, 6, 0]} name="Documents">
                      {sectorData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-slate-400 text-center py-8">No sector data available</p>
            )}
          </TabsContent>

          <TabsContent value="types" className="mt-4">
            {documentTypeData.length > 0 ? (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={documentTypeData}
                      cx="50%"
                      cy="50%"
                      labelLine={{ stroke: '#64748b' }}
                      label={renderPieLabel}
                      outerRadius={90}
                      innerRadius={35}
                      dataKey="value"
                      strokeWidth={2}
                      stroke="#0f172a"
                    >
                      {documentTypeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-slate-400 text-center py-8">No document type data available</p>
            )}
          </TabsContent>

          <TabsContent value="chunks" className="mt-4">
            {chunkTypeData.length > 0 ? (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chunkTypeData} margin={{ bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="name" stroke="#cbd5e1" tick={{ fill: '#e2e8f0', fontSize: 12 }} />
                    <YAxis stroke="#cbd5e1" tick={{ fill: '#cbd5e1', fontSize: 11 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                      {chunkTypeData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-slate-400 text-center py-8">No chunk type data available</p>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default MetadataDistributionCharts;
