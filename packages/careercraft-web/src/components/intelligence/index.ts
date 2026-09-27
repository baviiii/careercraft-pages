// Intelligence dashboard components.
//
// This barrel is where dead components came to look alive. It re-exported
// IntelligenceLayout, CareerPulse, ChartIntelligence, RelationshipGraph,
// QueryInsightsVisualizer, MetadataDistributionCharts, IntelligenceNav and
// PDFChartVisualizer — none of which anything rendered. An import-based
// search finds the barrel and stops, so every one of them read as used.
//
// Rule for this file: a line goes here only when something imports it. If you
// export a component "for later", later never comes and the next person has
// to prove it is dead all over again.
export { SectorHeatmap } from './SectorHeatmap';
export { InvestmentHighlights } from './InvestmentHighlights';
export { BreakingNews } from './BreakingNews';
export { CareersDashboard } from './CareersDashboard';
export { SkillsDashboard } from './SkillsDashboard';
export { FundingDashboard } from './FundingDashboard';
export { AIInsightsPanel } from './AIInsightsPanel';
export { IntelligenceHero } from './IntelligenceHero';
export { CrossTabConnections } from './CrossTabConnections';
export { DataStoriesPanel, LiveDiscoveryFeed } from './NextGenInsights';
export { DocumentIntelligenceVisualizer } from './DocumentIntelligenceVisualizer';
