/**
 * PDFChartVisualizer Component
 * 
 * Recreates charts from extracted PDF chart data.
 * Supports bar, pie, line, area, and scatter charts.
 * Shows original chart image option.
 */

import React, { useState } from 'react';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  LineChart,
  Line,
  AreaChart,
  Area,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart3, 
  PieChartIcon, 
  TrendingUp, 
  Image as ImageIcon,
  FileText,
  ExternalLink,
} from 'lucide-react';
import {
  ChartResult,
  ExtractedChartData,
  chartDataToRecharts,
  chartDataToPieChart,
  determineChartType,
  getDatasetColors,
  parseChartData,
} from '@/lib/intelligence/visualizationData';

interface PDFChartVisualizerProps {
  charts: ChartResult[];
  className?: string;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

const ChartTypeIcon: React.FC<{ type: string }> = ({ type }) => {
  switch (determineChartType(type)) {
    case 'pie':
      return <PieChartIcon className="w-4 h-4" />;
    case 'line':
    case 'area':
      return <TrendingUp className="w-4 h-4" />;
    default:
      return <BarChart3 className="w-4 h-4" />;
  }
};

interface SingleChartProps {
  chart: ChartResult;
}

const SingleChart: React.FC<SingleChartProps> = ({ chart }) => {
  const [showOriginal, setShowOriginal] = useState(false);
  
  const chartData = parseChartData(chart.chartData);
  const chartType = determineChartType(chart.chartType);
  
  if (!chartData && !chart.chartImageUrl) {
    return (
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <FileText className="w-4 h-4 text-slate-400" />
            <span className="text-slate-300">{chart.title || 'Chart'}</span>
            <Badge variant="outline" className="text-xs ml-auto">
              Page {chart.pageNumber}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {chart.visualDescription ? (
            <p className="text-slate-400 text-sm">{chart.visualDescription}</p>
          ) : (
            <p className="text-slate-500 text-sm">Chart data not available</p>
          )}
        </CardContent>
      </Card>
    );
  }

  const rechartsData = chartData ? chartDataToRecharts(chartData) : [];
  const pieData = chartData ? chartDataToPieChart(chartData, COLORS) : [];
  const colors = chartData ? getDatasetColors(chartData) : COLORS;

  const renderChart = () => {
    if (showOriginal && chart.chartImageUrl) {
      return (
        <div className="flex items-center justify-center h-64 bg-slate-900/50 rounded-lg">
          <img 
            src={chart.chartImageUrl} 
            alt={chart.title || 'Original chart'} 
            className="max-h-full max-w-full object-contain"
          />
        </div>
      );
    }

    if (!chartData || rechartsData.length === 0) {
      return (
        <div className="flex items-center justify-center h-64 bg-slate-900/50 rounded-lg">
          <p className="text-slate-500">Unable to recreate chart</p>
        </div>
      );
    }

    switch (chartType) {
      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                outerRadius={80}
                dataKey="value"
              >
                {pieData.map((entry, index) => (
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
        );

      case 'line':
        return (
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={rechartsData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
              <XAxis dataKey="name" stroke="#94a3b8" tick={{ fontSize: 11 }} />
              <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1e293b', 
                  border: '1px solid #475569',
                  borderRadius: '8px',
                }}
              />
              <Legend />
              {chartData.datasets.map((dataset, index) => (
                <Line
                  key={dataset.name}
                  type="monotone"
                  dataKey={dataset.name}
                  stroke={colors[index]}
                  strokeWidth={2}
                  dot={{ fill: colors[index] }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        );

      case 'area':
        return (
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={rechartsData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
              <XAxis dataKey="name" stroke="#94a3b8" tick={{ fontSize: 11 }} />
              <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1e293b', 
                  border: '1px solid #475569',
                  borderRadius: '8px',
                }}
              />
              <Legend />
              {chartData.datasets.map((dataset, index) => (
                <Area
                  key={dataset.name}
                  type="monotone"
                  dataKey={dataset.name}
                  stroke={colors[index]}
                  fill={colors[index]}
                  fillOpacity={0.3}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        );

      case 'scatter':
        return (
          <ResponsiveContainer width="100%" height={250}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
              <XAxis 
                dataKey="name" 
                stroke="#94a3b8" 
                tick={{ fontSize: 11 }} 
                name={chartData.axes?.x?.label || 'X'}
              />
              <YAxis 
                stroke="#94a3b8" 
                tick={{ fontSize: 11 }}
                name={chartData.axes?.y?.label || 'Y'}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1e293b', 
                  border: '1px solid #475569',
                  borderRadius: '8px',
                }}
              />
              <Legend />
              {chartData.datasets.map((dataset, index) => (
                <Scatter
                  key={dataset.name}
                  name={dataset.name}
                  data={rechartsData}
                  fill={colors[index]}
                />
              ))}
            </ScatterChart>
          </ResponsiveContainer>
        );

      default: // bar chart
        return (
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={rechartsData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
              <XAxis dataKey="name" stroke="#94a3b8" tick={{ fontSize: 11 }} />
              <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1e293b', 
                  border: '1px solid #475569',
                  borderRadius: '8px',
                }}
              />
              <Legend />
              {chartData.datasets.map((dataset, index) => (
                <Bar
                  key={dataset.name}
                  dataKey={dataset.name}
                  fill={colors[index]}
                  radius={[4, 4, 0, 0]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        );
    }
  };

  return (
    <Card className="bg-slate-800/50 border-slate-700">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <ChartTypeIcon type={chart.chartType} />
            <span className="text-slate-300">{chart.title || 'Extracted Chart'}</span>
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              Page {chart.pageNumber}
            </Badge>
            {chart.chartConfidence && (
              <Badge 
                variant={chart.chartConfidence > 0.8 ? 'default' : 'secondary'}
                className="text-xs"
              >
                {(chart.chartConfidence * 100).toFixed(0)}% conf
              </Badge>
            )}
            {chart.chartImageUrl && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowOriginal(!showOriginal)}
                className="text-xs"
              >
                {showOriginal ? <BarChart3 className="w-3 h-3 mr-1" /> : <ImageIcon className="w-3 h-3 mr-1" />}
                {showOriginal ? 'Recreated' : 'Original'}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {renderChart()}
        {chart.visualDescription && (
          <p className="text-slate-400 text-xs mt-2">{chart.visualDescription}</p>
        )}
        <div className="flex items-center justify-between mt-2 text-xs text-slate-500">
          <span>Source: {chart.documentId}</span>
          <Button variant="ghost" size="sm" className="text-xs h-6 px-2">
            <ExternalLink className="w-3 h-3 mr-1" />
            View Document
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export const PDFChartVisualizer: React.FC<PDFChartVisualizerProps> = ({
  charts,
  className = '',
}) => {
  if (!charts || charts.length === 0) {
    return null;
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center gap-2 text-slate-300">
        <BarChart3 className="w-5 h-5" />
        <h3 className="font-medium">Extracted Charts ({charts.length})</h3>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {charts.map((chart, index) => (
          <SingleChart key={chart.id || index} chart={chart} />
        ))}
      </div>
    </div>
  );
};

export default PDFChartVisualizer;
