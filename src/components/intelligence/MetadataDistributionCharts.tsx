/**
 * MetadataDistributionCharts Component
 * 
 * Displays pie charts and bar charts for document metadata distributions.
 * Shows category breakdown, sector distribution, document types, etc.
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

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

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

  if (!hasData) {
    return null;
  }

  return (
    <Card className={`bg-slate-900/50 border-slate-700 ${className}`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg text-slate-100">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="categories" className="w-full">
          <TabsList className="grid w-full grid-cols-4 bg-slate-800/50">
            <TabsTrigger value="categories" className="text-xs">Categories</TabsTrigger>
            <TabsTrigger value="sectors" className="text-xs">Sectors</TabsTrigger>
            <TabsTrigger value="types" className="text-xs">Doc Types</TabsTrigger>
            <TabsTrigger value="chunks" className="text-xs">Chunk Types</TabsTrigger>
          </TabsList>

          <TabsContent value="categories" className="mt-4">
            {categoryData.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => 
                        `${name} (${(percent * 100).toFixed(0)}%)`
                      }
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#1e293b', 
                        border: '1px solid #475569',
                        borderRadius: '8px',
                      }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-slate-400 text-center py-8">No category data available</p>
            )}
          </TabsContent>

          <TabsContent value="sectors" className="mt-4">
            {sectorData.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={sectorData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                    <XAxis type="number" stroke="#94a3b8" />
                    <YAxis 
                      dataKey="name" 
                      type="category" 
                      width={100} 
                      stroke="#94a3b8"
                      tick={{ fontSize: 11 }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#1e293b', 
                        border: '1px solid #475569',
                        borderRadius: '8px',
                      }}
                    />
                    <Bar dataKey="value" fill="#8884d8" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-slate-400 text-center py-8">No sector data available</p>
            )}
          </TabsContent>

          <TabsContent value="types" className="mt-4">
            {documentTypeData.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={documentTypeData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => 
                        `${name} (${(percent * 100).toFixed(0)}%)`
                      }
                      outerRadius={80}
                      fill="#82ca9d"
                      dataKey="value"
                    >
                      {documentTypeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#1e293b', 
                        border: '1px solid #475569',
                        borderRadius: '8px',
                      }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-slate-400 text-center py-8">No document type data available</p>
            )}
          </TabsContent>

          <TabsContent value="chunks" className="mt-4">
            {chunkTypeData.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chunkTypeData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                    <XAxis dataKey="name" stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#1e293b', 
                        border: '1px solid #475569',
                        borderRadius: '8px',
                      }}
                    />
                    <Bar dataKey="value" fill="#ffc658" radius={[4, 4, 0, 0]} />
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
