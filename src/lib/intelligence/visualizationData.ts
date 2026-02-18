/**
 * Visualization Data Utilities
 * 
 * Transforms RAG query responses into chart-ready data formats.
 * Handles PDF chart data extraction and metadata aggregation.
 */

// Types for visualization data
export interface ChartDataset {
  name: string;
  values: number[];
  color?: string;
}

export interface ExtractedChartData {
  labels: string[];
  datasets: ChartDataset[];
  axes?: {
    x: { label: string; type: 'category' | 'numeric' | 'date' };
    y: { label: string; type: 'numeric'; unit?: string };
  };
}

export interface ChartResult {
  id: string;
  documentId: string;
  pageNumber: number;
  chartType: 'bar_chart' | 'pie_chart' | 'line_graph' | 'scatter_plot' | 'area_chart' | 'diagram' | 'flowchart' | 'image' | 'table' | 'other' | string;
  chartData: ExtractedChartData | null;
  chartImageUrl: string | null;
  chartConfidence: number;
  visualDescription: string | null;
  title: string;
  score: number;
}

export interface MetadataDistribution {
  categories: Record<string, number>;
  sectors: Record<string, number>;
  documentTypes: Record<string, number>;
  chunkTypes: Record<string, number>;
}

export interface VisualizationData {
  charts: ChartResult[];
  metadataDistribution: MetadataDistribution;
  relationships: Array<{ from: string; to: string; label?: string }>;
  totalResults: number;
  chartCount: number;
  hasVisualizations: boolean;
}

// Recharts-compatible data types
export interface RechartsDataPoint {
  name: string;
  [key: string]: string | number;
}

export interface PieChartData {
  name: string;
  value: number;
  fill?: string;
}

// Transform metadata distribution to Recharts pie chart format
export function metadataToPieChart(
  distribution: Record<string, number>,
  colors?: string[]
): PieChartData[] {
  const defaultColors = [
    '#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8',
    '#82CA9D', '#FFC658', '#8DD1E1', '#A4DE6C', '#D0ED57'
  ];
  
  return Object.entries(distribution).map(([name, value], index) => ({
    name,
    value,
    fill: colors?.[index] || defaultColors[index % defaultColors.length],
  }));
}

// Transform metadata distribution to Recharts bar chart format
export function metadataToBarChart(
  distribution: Record<string, number>
): RechartsDataPoint[] {
  return Object.entries(distribution)
    .sort((a, b) => b[1] - a[1]) // Sort by value descending
    .map(([name, value]) => ({
      name: name.length > 20 ? name.substring(0, 20) + '...' : name,
      value,
      fullName: name,
    }));
}

// Transform extracted chart data to Recharts format
export function chartDataToRecharts(chartData: ExtractedChartData): RechartsDataPoint[] {
  if (!chartData?.labels || !chartData?.datasets) {
    return [];
  }
  
  return chartData.labels.map((label, index) => {
    const point: RechartsDataPoint = { name: label };
    chartData.datasets.forEach(dataset => {
      point[dataset.name] = dataset.values[index] ?? 0;
    });
    return point;
  });
}

// Transform chart data to pie chart format (for pie charts)
export function chartDataToPieChart(
  chartData: ExtractedChartData,
  colors?: string[]
): PieChartData[] {
  if (!chartData?.labels || !chartData?.datasets?.[0]?.values) {
    return [];
  }
  
  const defaultColors = [
    '#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8',
    '#82CA9D', '#FFC658', '#8DD1E1', '#A4DE6C', '#D0ED57'
  ];
  
  return chartData.labels.map((label, index) => ({
    name: label,
    value: chartData.datasets[0].values[index] ?? 0,
    fill: colors?.[index] || defaultColors[index % defaultColors.length],
  }));
}

// Get dataset colors from chart data
export function getDatasetColors(chartData: ExtractedChartData): string[] {
  const defaultColors = [
    '#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00C49F',
    '#FFBB28', '#FF8042', '#0088FE', '#8DD1E1', '#A4DE6C'
  ];
  
  return chartData.datasets.map((dataset, index) => 
    dataset.color || defaultColors[index % defaultColors.length]
  );
}

// Determine appropriate chart type from visualization data
export function determineChartType(chartType: string): 'bar' | 'pie' | 'line' | 'area' | 'scatter' {
  const typeMap: Record<string, 'bar' | 'pie' | 'line' | 'area' | 'scatter'> = {
    'bar_chart': 'bar',
    'bar': 'bar',
    'pie_chart': 'pie',
    'pie': 'pie',
    'line_graph': 'line',
    'line': 'line',
    'area_chart': 'area',
    'area': 'area',
    'scatter_plot': 'scatter',
    'scatter': 'scatter',
  };
  
  return typeMap[chartType.toLowerCase()] || 'bar';
}

// Extract visualization insights from query results
export function extractVisualizationInsights(visualizationData: VisualizationData): string[] {
  const insights: string[] = [];
  
  // Category insights
  const categories = Object.entries(visualizationData.metadataDistribution.categories);
  if (categories.length > 0) {
    const topCategory = categories.sort((a, b) => b[1] - a[1])[0];
    insights.push(`Most relevant category: ${topCategory[0]} (${topCategory[1]} sources)`);
  }
  
  // Sector insights
  const sectors = Object.entries(visualizationData.metadataDistribution.sectors);
  if (sectors.length > 0) {
    const topSector = sectors.sort((a, b) => b[1] - a[1])[0];
    insights.push(`Primary sector: ${topSector[0]} (${topSector[1]} sources)`);
  }
  
  // Chart insights
  if (visualizationData.chartCount > 0) {
    insights.push(`Found ${visualizationData.chartCount} chart(s) relevant to your query`);
  }
  
  return insights;
}

// Validate and parse chart data from string
export function parseChartData(chartDataString: string | object | null): ExtractedChartData | null {
  if (!chartDataString) return null;
  
  try {
    const data = typeof chartDataString === 'string' 
      ? JSON.parse(chartDataString) 
      : chartDataString;
    
    // Validate structure
    if (!data.labels || !Array.isArray(data.labels)) return null;
    if (!data.datasets || !Array.isArray(data.datasets)) return null;
    
    return data as ExtractedChartData;
  } catch {
    console.warn('Failed to parse chart data:', chartDataString);
    return null;
  }
}

// Create empty visualization data structure
export function createEmptyVisualizationData(): VisualizationData {
  return {
    charts: [],
    metadataDistribution: {
      categories: {},
      sectors: {},
      documentTypes: {},
      chunkTypes: {},
    },
    relationships: [],
    totalResults: 0,
    chartCount: 0,
    hasVisualizations: false,
  };
}

// Transform Azure AI Search results to VisualizationData
export function transformSearchResultsToVisualizationData(
  searchResults: any[],
  query?: string
): VisualizationData {
  const charts: ChartResult[] = [];
  const metadataDistribution: MetadataDistribution = {
    categories: {},
    sectors: {},
    documentTypes: {},
    chunkTypes: {},
  };
  
  // Process each search result
  searchResults.forEach((result) => {
    // Aggregate metadata
    if (result.category) {
      metadataDistribution.categories[result.category] = 
        (metadataDistribution.categories[result.category] || 0) + 1;
    }
    if (result.sector) {
      metadataDistribution.sectors[result.sector] = 
        (metadataDistribution.sectors[result.sector] || 0) + 1;
    }
    if (result.documentType) {
      metadataDistribution.documentTypes[result.documentType] = 
        (metadataDistribution.documentTypes[result.documentType] || 0) + 1;
    }
    if (result.chunkType) {
      metadataDistribution.chunkTypes[result.chunkType] = 
        (metadataDistribution.chunkTypes[result.chunkType] || 0) + 1;
    }
    
    // Extract chart data
    if (result.hasChart || result.chunkType === 'chart') {
      const chartData = parseChartData(result.chartData);
      
      charts.push({
        id: result.id,
        documentId: result.documentId,
        pageNumber: result.pageNumber || 1,
        chartType: result.chartType || 'other',
        chartData: chartData,
        chartImageUrl: result.chartImageUrl || null,
        chartConfidence: result.chartConfidence || 0,
        visualDescription: result.visualDescription || null,
        title: result.title || 'Untitled Chart',
        score: result.score || 0,
      });
    }
  });
  
  return {
    charts,
    metadataDistribution,
    relationships: [], // Relationships would come from graph queries
    totalResults: searchResults.length,
    chartCount: charts.length,
    hasVisualizations: charts.length > 0 || Object.keys(metadataDistribution.categories).length > 0,
  };
}