/**
 * RelationshipGraph Component
 * 
 * Network visualization showing document relationships.
 * Uses SVG-based rendering for compatibility (no React Flow dependency).
 * Shows connections between documents, categories, and sectors.
 */

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Network,
  ZoomIn,
  ZoomOut,
  Maximize2,
  RefreshCw,
} from 'lucide-react';
import {
  GraphNode,
  GraphEdge,
  createDocumentGraph,
  hierarchicalLayout,
} from '@/lib/intelligence/graphDataTransform';

interface Source {
  documentId: string;
  title: string;
  score: number;
  category?: string;
  sector?: string;
}

interface RelationshipGraphProps {
  sources: Source[];
  className?: string;
}

const NODE_COLORS: Record<string, string> = {
  document: '#3b82f6',
  category: '#10b981',
  sector: '#8b5cf6',
  topic: '#f59e0b',
  entity: '#ef4444',
  chart: '#ec4899',
};

const NODE_RADIUS: Record<string, number> = {
  document: 30,
  category: 25,
  sector: 25,
  topic: 20,
  entity: 20,
  chart: 20,
};

export const RelationshipGraph: React.FC<RelationshipGraphProps> = ({
  sources,
  className = '',
}) => {
  const [zoom, setZoom] = useState(1);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  // Generate graph data
  const graphData = useMemo(() => {
    if (sources.length === 0) return { nodes: [], edges: [] };
    
    const graph = createDocumentGraph(sources);
    const layoutNodes = hierarchicalLayout(graph.nodes);
    
    return {
      nodes: layoutNodes,
      edges: graph.edges,
    };
  }, [sources]);

  const handleZoomIn = () => setZoom(prev => Math.min(prev * 1.2, 2));
  const handleZoomOut = () => setZoom(prev => Math.max(prev / 1.2, 0.5));
  const handleReset = () => {
    setZoom(1);
    setSelectedNode(null);
  };

  if (sources.length === 0) {
    return (
      <Card className={`bg-slate-900/50 border-slate-700 ${className}`}>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Network className="w-12 h-12 text-slate-600 mb-4" />
          <p className="text-slate-400 text-center">
            No relationship data available.<br />
            Run a query to see document connections.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Calculate SVG viewBox based on nodes
  const padding = 50;
  const minX = Math.min(...graphData.nodes.map(n => n.position?.x || 0)) - padding;
  const maxX = Math.max(...graphData.nodes.map(n => n.position?.x || 0)) + padding;
  const minY = Math.min(...graphData.nodes.map(n => n.position?.y || 0)) - padding;
  const maxY = Math.max(...graphData.nodes.map(n => n.position?.y || 0)) + padding;
  const width = Math.max(maxX - minX, 800);
  const height = Math.max(maxY - minY, 400);

  return (
    <Card className={`bg-slate-900/50 border-slate-700 ${className}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2 text-slate-100">
            <Network className="w-5 h-5 text-purple-400" />
            Document Relationships
          </CardTitle>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={handleZoomOut}>
              <ZoomOut className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={handleZoomIn}>
              <ZoomIn className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={handleReset}>
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>
        {/* Legend */}
        <div className="flex flex-wrap gap-2 mt-2">
          {Object.entries(NODE_COLORS).slice(0, 4).map(([type, color]) => (
            <Badge 
              key={type}
              variant="outline" 
              className="text-xs"
              style={{ borderColor: color, color }}
            >
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </Badge>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        <div 
          className="w-full h-96 overflow-hidden bg-slate-950/50 rounded-lg relative"
          style={{ cursor: 'grab' }}
        >
          <svg
            width="100%"
            height="100%"
            viewBox={`${minX} ${minY} ${width} ${height}`}
            style={{ transform: `scale(${zoom})`, transformOrigin: 'center' }}
          >
            {/* Render edges */}
            <g className="edges">
              {graphData.edges.map(edge => {
                const sourceNode = graphData.nodes.find(n => n.id === edge.source);
                const targetNode = graphData.nodes.find(n => n.id === edge.target);
                
                if (!sourceNode?.position || !targetNode?.position) return null;
                
                return (
                  <line
                    key={edge.id}
                    x1={sourceNode.position.x}
                    y1={sourceNode.position.y}
                    x2={targetNode.position.x}
                    y2={targetNode.position.y}
                    stroke={edge.type === 'contradicts' ? '#ef4444' : '#475569'}
                    strokeWidth={edge.type === 'contradicts' ? 2 : 1}
                    strokeDasharray={edge.type === 'contradicts' ? '5,5' : 'none'}
                    opacity={selectedNode ? 
                      (edge.source === selectedNode || edge.target === selectedNode ? 1 : 0.2) 
                      : 0.6
                    }
                  />
                );
              })}
            </g>
            
            {/* Render nodes */}
            <g className="nodes">
              {graphData.nodes.map(node => {
                if (!node.position) return null;
                
                const radius = NODE_RADIUS[node.type] || 25;
                const color = NODE_COLORS[node.type] || '#6b7280';
                const isSelected = selectedNode === node.id;
                const isConnected = selectedNode ? 
                  graphData.edges.some(e => 
                    (e.source === selectedNode && e.target === node.id) ||
                    (e.target === selectedNode && e.source === node.id)
                  ) : true;
                
                return (
                  <g
                    key={node.id}
                    transform={`translate(${node.position.x}, ${node.position.y})`}
                    onClick={() => setSelectedNode(isSelected ? null : node.id)}
                    style={{ cursor: 'pointer' }}
                    opacity={selectedNode && !isSelected && !isConnected ? 0.3 : 1}
                  >
                    {/* Node circle */}
                    <circle
                      r={radius}
                      fill={color}
                      stroke={isSelected ? '#fff' : 'transparent'}
                      strokeWidth={2}
                      className="transition-all duration-200"
                    />
                    
                    {/* Node label */}
                    <text
                      y={radius + 15}
                      textAnchor="middle"
                      fill="#94a3b8"
                      fontSize={10}
                      className="pointer-events-none"
                    >
                      {node.label.length > 20 
                        ? node.label.substring(0, 20) + '...' 
                        : node.label}
                    </text>
                    
                    {/* Type indicator */}
                    <text
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill="#fff"
                      fontSize={9}
                      fontWeight="bold"
                      className="pointer-events-none"
                    >
                      {node.type.charAt(0).toUpperCase()}
                    </text>
                  </g>
                );
              })}
            </g>
          </svg>
        </div>
        
        {/* Selected node info */}
        {selectedNode && (
          <div className="mt-4 p-3 bg-slate-800/50 rounded-lg">
            <p className="text-sm text-slate-300">
              <strong>Selected:</strong> {graphData.nodes.find(n => n.id === selectedNode)?.label}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Connected to {graphData.edges.filter(e => 
                e.source === selectedNode || e.target === selectedNode
              ).length} other nodes
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RelationshipGraph;
