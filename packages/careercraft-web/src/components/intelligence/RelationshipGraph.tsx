/**
 * RelationshipGraph Component - Premium Interactive Network Visualization
 * 
 * Features:
 * - Force-directed, hierarchical, radial, and grid layouts
 * - Interactive pan/zoom with mouse wheel and drag
 * - Curved edges with relationship type labels
 * - Node sizing by connection count
 * - Hover tooltips and click-to-focus
 * - Animated transitions between layouts
 * - Beautiful gradient nodes with glow effects
 */

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Network,
  ZoomIn,
  ZoomOut,
  Maximize2,
  RefreshCw,
  GitBranch,
  Circle,
  LayoutGrid,
  Target,
  Info,
  Loader2,
} from 'lucide-react';
import {
  GraphNode,
  GraphEdge,
  createDocumentGraph,
} from '@/lib/intelligence/graphDataTransform';

interface Source {
  documentId: string;
  title: string;
  score: number;
  category?: string;
  sector?: string;
}

interface GraphRelationship {
  source: string;
  target: string;
  type: string;
  weight?: number;
}

interface RelationshipGraphProps {
  sources: Source[];
  className?: string;
  graphRelationships?: GraphRelationship[];
  loadingGraph?: boolean;
}

type LayoutMode = 'force' | 'hierarchical' | 'radial' | 'grid';

// Refined color palette
const NODE_STYLES: Record<string, { fill: string; glow: string; stroke: string; icon: string }> = {
  document: { fill: '#3b82f6', glow: 'rgba(59,130,246,0.4)', stroke: '#60a5fa', icon: '📄' },
  category: { fill: '#10b981', glow: 'rgba(16,185,129,0.4)', stroke: '#34d399', icon: '📁' },
  sector:   { fill: '#8b5cf6', glow: 'rgba(139,92,246,0.4)', stroke: '#a78bfa', icon: '🏛' },
  topic:    { fill: '#f59e0b', glow: 'rgba(245,158,11,0.4)', stroke: '#fbbf24', icon: '💡' },
  entity:   { fill: '#ef4444', glow: 'rgba(239,68,68,0.4)', stroke: '#f87171',  icon: '🔗' },
  chart:    { fill: '#ec4899', glow: 'rgba(236,72,153,0.4)', stroke: '#f472b6', icon: '📊' },
};

const EDGE_COLORS: Record<string, string> = {
  related: '#475569',
  references: '#3b82f6',
  contradicts: '#ef4444',
  supports: '#10b981',
  contains: '#8b5cf6',
  funds: '#f59e0b',
  employs: '#06b6d4',
  impacts: '#f97316',
  relationship: '#6366f1',
};

// Simple force simulation
function forceLayout(
  nodes: (GraphNode & { metadata?: any })[],
  edges: GraphEdge[],
  width: number,
  height: number,
  iterations = 80
): (GraphNode & { metadata?: any })[] {
  const positioned = nodes.map((n, i) => ({
    ...n,
    position: {
      x: width / 2 + (Math.cos(i * 2.399) * width * 0.35),
      y: height / 2 + (Math.sin(i * 2.399) * height * 0.35),
    },
  }));

  const nodeMap = new Map(positioned.map(n => [n.id, n]));

  for (let iter = 0; iter < iterations; iter++) {
    const temp = 1 - iter / iterations;
    const repulsion = 8000 * temp;
    const attraction = 0.005;

    // Repulsion between all nodes
    for (let i = 0; i < positioned.length; i++) {
      for (let j = i + 1; j < positioned.length; j++) {
        const a = positioned[i];
        const b = positioned[j];
        const dx = a.position!.x - b.position!.x;
        const dy = a.position!.y - b.position!.y;
        const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
        const force = repulsion / (dist * dist);
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        a.position!.x += fx;
        a.position!.y += fy;
        b.position!.x -= fx;
        b.position!.y -= fy;
      }
    }

    // Attraction along edges
    for (const edge of edges) {
      const source = nodeMap.get(edge.source);
      const target = nodeMap.get(edge.target);
      if (!source?.position || !target?.position) continue;
      const dx = target.position.x - source.position.x;
      const dy = target.position.y - source.position.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const force = dist * attraction;
      const fx = (dx / Math.max(dist, 1)) * force;
      const fy = (dy / Math.max(dist, 1)) * force;
      source.position.x += fx;
      source.position.y += fy;
      target.position.x -= fx;
      target.position.y -= fy;
    }

    // Center gravity
    for (const node of positioned) {
      node.position!.x += (width / 2 - node.position!.x) * 0.01;
      node.position!.y += (height / 2 - node.position!.y) * 0.01;
    }
  }

  // Clamp to bounds
  const pad = 60;
  for (const node of positioned) {
    node.position!.x = Math.max(pad, Math.min(width - pad, node.position!.x));
    node.position!.y = Math.max(pad, Math.min(height - pad, node.position!.y));
  }

  return positioned;
}

function hierarchicalLayoutFn(nodes: (GraphNode & { metadata?: any })[], width: number, height: number): (GraphNode & { metadata?: any })[] {
  const levels: Record<string, number> = { category: 0, sector: 0, document: 1, chart: 1, topic: 2, entity: 2 };
  const levelNodes: Record<number, (GraphNode & { metadata?: any })[]> = {};

  for (const node of nodes) {
    const level = levels[node.type] ?? 1;
    if (!levelNodes[level]) levelNodes[level] = [];
    levelNodes[level].push(node);
  }

  const result: (GraphNode & { metadata?: any })[] = [];
  const numLevels = Object.keys(levelNodes).length;

  Object.entries(levelNodes).forEach(([level, nodesAtLevel]) => {
    const y = (parseInt(level) + 0.5) * (height / (numLevels + 1));
    nodesAtLevel.forEach((node, index) => {
      result.push({
        ...node,
        position: {
          x: (index + 1) * (width / (nodesAtLevel.length + 1)),
          y: y + (index % 2 === 0 ? 0 : 30),
        },
      });
    });
  });

  return result;
}

function radialLayoutFn(nodes: (GraphNode & { metadata?: any })[], width: number, height: number): (GraphNode & { metadata?: any })[] {
  const cx = width / 2;
  const cy = height / 2;
  const typeGroups: Record<string, (GraphNode & { metadata?: any })[]> = {};

  for (const node of nodes) {
    if (!typeGroups[node.type]) typeGroups[node.type] = [];
    typeGroups[node.type].push(node);
  }

  const result: (GraphNode & { metadata?: any })[] = [];
  const types = Object.keys(typeGroups);

  types.forEach((type, ringIndex) => {
    const radius = 80 + ringIndex * 100;
    const nodesInRing = typeGroups[type];
    nodesInRing.forEach((node, i) => {
      const angle = (2 * Math.PI * i) / nodesInRing.length - Math.PI / 2;
      result.push({
        ...node,
        position: {
          x: cx + radius * Math.cos(angle),
          y: cy + radius * Math.sin(angle),
        },
      });
    });
  });

  return result;
}

function gridLayoutFn(nodes: (GraphNode & { metadata?: any })[], width: number, height: number): (GraphNode & { metadata?: any })[] {
  const cols = Math.ceil(Math.sqrt(nodes.length));
  const cellW = width / (cols + 1);
  const cellH = height / (Math.ceil(nodes.length / cols) + 1);

  return nodes.map((node, i) => ({
    ...node,
    position: {
      x: (i % cols + 1) * cellW,
      y: (Math.floor(i / cols) + 1) * cellH,
    },
  }));
}

export const RelationshipGraph: React.FC<RelationshipGraphProps> = ({
  sources,
  className = '',
  graphRelationships = [],
  loadingGraph = false,
}) => {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [layout, setLayout] = useState<LayoutMode>('force');
  const [showLabels, setShowLabels] = useState(true);
  const [showEdgeLabels, setShowEdgeLabels] = useState(true);
  const svgRef = useRef<SVGSVGElement>(null);
  const isPanning = useRef(false);
  const panStart = useRef({ x: 0, y: 0 });

  const W = 900;
  const H = 550;

  // Build graph data
  const rawGraph = useMemo(() => {
    if (sources.length === 0 && graphRelationships.length === 0) return { nodes: [] as (GraphNode & { metadata?: any })[], edges: [] as GraphEdge[] };

    const graph = sources.length > 0 ? createDocumentGraph(sources) : { nodes: [] as GraphNode[], edges: [] as GraphEdge[] };

    // Merge real graph relationships
    if (graphRelationships.length > 0) {
      const existingNodeIds = new Set(graph.nodes.map(n => n.id));
      const existingEdgeIds = new Set(graph.edges.map(e => e.id));

      for (const rel of graphRelationships) {
        if (!existingNodeIds.has(rel.source)) {
          graph.nodes.push({ id: rel.source, label: rel.source.replace(/_/g, ' '), type: 'entity' });
          existingNodeIds.add(rel.source);
        }
        if (!existingNodeIds.has(rel.target)) {
          graph.nodes.push({ id: rel.target, label: rel.target.replace(/_/g, ' '), type: 'entity' });
          existingNodeIds.add(rel.target);
        }
        const edgeId = `gr-${rel.source}-${rel.target}`;
        if (!existingEdgeIds.has(edgeId)) {
          graph.edges.push({ id: edgeId, source: rel.source, target: rel.target, type: (rel.type as any) || 'related', label: rel.type?.replace(/_/g, ' ') });
          existingEdgeIds.add(edgeId);
        }
      }
    }

    return graph as { nodes: (GraphNode & { metadata?: any })[]; edges: GraphEdge[] };
  }, [sources, graphRelationships]);

  // Apply layout
  const graphData = useMemo(() => {
    if (rawGraph.nodes.length === 0) return { nodes: [] as (GraphNode & { metadata?: any })[], edges: rawGraph.edges };

    let positioned: (GraphNode & { metadata?: any })[];
    switch (layout) {
      case 'force':
        positioned = forceLayout(rawGraph.nodes, rawGraph.edges, W, H);
        break;
      case 'hierarchical':
        positioned = hierarchicalLayoutFn(rawGraph.nodes, W, H);
        break;
      case 'radial':
        positioned = radialLayoutFn(rawGraph.nodes, W, H);
        break;
      case 'grid':
        positioned = gridLayoutFn(rawGraph.nodes, W, H);
        break;
      default:
        positioned = forceLayout(rawGraph.nodes, rawGraph.edges, W, H);
    }

    return { nodes: positioned, edges: rawGraph.edges };
  }, [rawGraph, layout]);

  // Connection count per node (for sizing)
  const connectionCount = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const edge of graphData.edges) {
      counts[edge.source] = (counts[edge.source] || 0) + 1;
      counts[edge.target] = (counts[edge.target] || 0) + 1;
    }
    return counts;
  }, [graphData.edges]);

  const getNodeRadius = (node: GraphNode) => {
    const base = node.type === 'document' ? 22 : node.type === 'category' || node.type === 'sector' ? 20 : 16;
    const connections = connectionCount[node.id] || 0;
    return base + Math.min(connections * 2, 12);
  };

  // Pan/zoom handlers
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom(prev => Math.max(0.3, Math.min(3, prev * delta)));
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    isPanning.current = true;
    panStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  }, [pan]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning.current) return;
    setPan({ x: e.clientX - panStart.current.x, y: e.clientY - panStart.current.y });
  }, []);

  const handleMouseUp = useCallback(() => {
    isPanning.current = false;
  }, []);

  const handleReset = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setSelectedNode(null);
  };

  // Curved edge path
  const getEdgePath = (sourcePos: { x: number; y: number }, targetPos: { x: number; y: number }, index: number) => {
    const dx = targetPos.x - sourcePos.x;
    const dy = targetPos.y - sourcePos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Slight curve offset for visual clarity
    const curvature = Math.min(dist * 0.15, 40) * (index % 2 === 0 ? 1 : -1);
    const midX = (sourcePos.x + targetPos.x) / 2 + (-dy / dist) * curvature;
    const midY = (sourcePos.y + targetPos.y) / 2 + (dx / dist) * curvature;

    return { path: `M ${sourcePos.x} ${sourcePos.y} Q ${midX} ${midY} ${targetPos.x} ${targetPos.y}`, midX, midY };
  };

  const focusNode = selectedNode || hoveredNode;
  const connectedNodes = useMemo(() => {
    if (!focusNode) return new Set<string>();
    const connected = new Set<string>();
    connected.add(focusNode);
    for (const edge of graphData.edges) {
      if (edge.source === focusNode) connected.add(edge.target);
      if (edge.target === focusNode) connected.add(edge.source);
    }
    return connected;
  }, [focusNode, graphData.edges]);

  // Selected node details
  const selectedNodeData = graphData.nodes.find(n => n.id === selectedNode);
  const selectedEdges = graphData.edges.filter(e => e.source === selectedNode || e.target === selectedNode);

  if (sources.length === 0 && graphRelationships.length === 0) {
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

  return (
    <Card className={`bg-slate-900/50 border-slate-700 overflow-hidden ${className}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-lg flex items-center gap-2 text-slate-100">
            <Network className="w-5 h-5 text-purple-400" />
            Knowledge Graph
            <Badge variant="outline" className="text-xs text-slate-400 border-slate-600 ml-2">
              {graphData.nodes.length} nodes · {graphData.edges.length} edges
            </Badge>
            {loadingGraph && <Loader2 className="w-4 h-4 animate-spin text-purple-400 ml-1" />}
          </CardTitle>

          <div className="flex items-center gap-1">
            {/* Layout switcher */}
            <Tabs value={layout} onValueChange={(v) => setLayout(v as LayoutMode)}>
              <TabsList className="h-8 bg-slate-800/70">
                <TabsTrigger value="force" className="h-6 px-2 text-xs" title="Force-directed layout">
                  <Target className="w-3 h-3" />
                </TabsTrigger>
                <TabsTrigger value="hierarchical" className="h-6 px-2 text-xs" title="Hierarchical layout">
                  <GitBranch className="w-3 h-3" />
                </TabsTrigger>
                <TabsTrigger value="radial" className="h-6 px-2 text-xs" title="Radial layout">
                  <Circle className="w-3 h-3" />
                </TabsTrigger>
                <TabsTrigger value="grid" className="h-6 px-2 text-xs" title="Grid layout">
                  <LayoutGrid className="w-3 h-3" />
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="flex items-center gap-0.5 ml-2">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setZoom(z => Math.min(z * 1.3, 3))}>
                <ZoomIn className="w-3.5 h-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setZoom(z => Math.max(z / 1.3, 0.3))}>
                <ZoomOut className="w-3.5 h-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleReset}>
                <Maximize2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-1.5 mt-2">
          {Object.entries(NODE_STYLES).map(([type, style]) => (
            <Badge
              key={type}
              variant="outline"
              className="text-[10px] px-1.5 py-0"
              style={{ borderColor: style.fill, color: style.fill }}
            >
              <span className="mr-1">{style.icon}</span>
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </Badge>
          ))}
          <div className="ml-auto flex gap-2">
            <button
              onClick={() => setShowLabels(v => !v)}
              className={`text-[10px] px-1.5 py-0.5 rounded border ${showLabels ? 'border-blue-500 text-blue-400' : 'border-slate-600 text-slate-500'}`}
            >
              Labels
            </button>
            <button
              onClick={() => setShowEdgeLabels(v => !v)}
              className={`text-[10px] px-1.5 py-0.5 rounded border ${showEdgeLabels ? 'border-purple-500 text-purple-400' : 'border-slate-600 text-slate-500'}`}
            >
              Edge Types
            </button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {/* SVG Canvas */}
        <div
          className="w-full bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 relative overflow-hidden"
          style={{ height: 480, cursor: isPanning.current ? 'grabbing' : 'grab' }}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {/* Background grid */}
          <svg className="absolute inset-0 w-full h-full opacity-[0.04]">
            <defs>
              <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
                <path d="M 30 0 L 0 0 0 30" fill="none" stroke="white" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>

          <svg
            ref={svgRef}
            width="100%"
            height="100%"
            viewBox={`0 0 ${W} ${H}`}
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: 'center',
              transition: isPanning.current ? 'none' : 'transform 0.1s ease-out',
            }}
          >
            <defs>
              {/* Node glow filters */}
              {Object.entries(NODE_STYLES).map(([type, style]) => (
                <filter key={type} id={`glow-${type}`} x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="4" result="blur" />
                  <feFlood floodColor={style.glow} result="color" />
                  <feComposite in="color" in2="blur" operator="in" result="glow" />
                  <feMerge>
                    <feMergeNode in="glow" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              ))}
              <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
                <polygon points="0 0, 8 3, 0 6" fill="#475569" opacity="0.6" />
              </marker>
            </defs>

            {/* Edges */}
            <g className="edges">
              {graphData.edges.map((edge, idx) => {
                const sourceNode = graphData.nodes.find(n => n.id === edge.source);
                const targetNode = graphData.nodes.find(n => n.id === edge.target);
                if (!sourceNode?.position || !targetNode?.position) return null;

                const isHighlighted = focusNode && (edge.source === focusNode || edge.target === focusNode);
                const isFaded = focusNode && !isHighlighted;
                const edgeColor = EDGE_COLORS[edge.type || 'related'] || '#475569';
                const { path, midX, midY } = getEdgePath(sourceNode.position, targetNode.position, idx);

                return (
                  <g key={edge.id} opacity={isFaded ? 0.08 : isHighlighted ? 1 : 0.5}>
                    <path
                      d={path}
                      stroke={isHighlighted ? edgeColor : '#334155'}
                      strokeWidth={isHighlighted ? 2.5 : 1.2}
                      fill="none"
                      markerEnd="url(#arrowhead)"
                      strokeDasharray={edge.type === 'contradicts' ? '6,4' : 'none'}
                    />
                    {showEdgeLabels && edge.label && !isFaded && (
                      <text
                        x={midX}
                        y={midY - 6}
                        textAnchor="middle"
                        fill={isHighlighted ? edgeColor : '#64748b'}
                        fontSize={9}
                        fontWeight={isHighlighted ? 600 : 400}
                        className="pointer-events-none select-none"
                      >
                        {edge.label}
                      </text>
                    )}
                  </g>
                );
              })}
            </g>

            {/* Nodes */}
            <g className="nodes">
              {graphData.nodes.map(node => {
                if (!node.position) return null;

                const style = NODE_STYLES[node.type] || NODE_STYLES.entity;
                const radius = getNodeRadius(node);
                const isSelected = selectedNode === node.id;
                const isHovered = hoveredNode === node.id;
                const isConnected = focusNode ? connectedNodes.has(node.id) : true;
                const isFocused = isSelected || isHovered;

                return (
                  <g
                    key={node.id}
                    transform={`translate(${node.position.x}, ${node.position.y})`}
                    onClick={(e) => { e.stopPropagation(); setSelectedNode(isSelected ? null : node.id); }}
                    onMouseEnter={() => setHoveredNode(node.id)}
                    onMouseLeave={() => setHoveredNode(null)}
                    style={{ cursor: 'pointer' }}
                    opacity={focusNode && !isConnected ? 0.12 : 1}
                  >
                    {/* Glow ring */}
                    {isFocused && (
                      <circle
                        r={radius + 6}
                        fill="none"
                        stroke={style.stroke}
                        strokeWidth={2}
                        opacity={0.5}
                        className="animate-pulse"
                      />
                    )}

                    {/* Main circle */}
                    <circle
                      r={radius}
                      fill={style.fill}
                      stroke={isFocused ? '#fff' : style.stroke}
                      strokeWidth={isFocused ? 2 : 0.5}
                      filter={isFocused ? `url(#glow-${node.type})` : undefined}
                      opacity={0.9}
                    />

                    {/* Inner gradient overlay */}
                    <circle
                      r={radius * 0.6}
                      fill="white"
                      opacity={0.08}
                    />

                    {/* Icon/type letter */}
                    <text
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill="#fff"
                      fontSize={radius > 20 ? 14 : 11}
                      className="pointer-events-none select-none"
                    >
                      {style.icon}
                    </text>

                    {/* Label */}
                    {showLabels && (
                      <g>
                        {/* Label background */}
                        <rect
                          x={-Math.min(node.label.length * 3.2, 55)}
                          y={radius + 6}
                          width={Math.min(node.label.length * 6.4, 110)}
                          height={16}
                          rx={4}
                          fill="rgba(15,23,42,0.85)"
                          stroke={isFocused ? style.stroke : 'rgba(71,85,105,0.4)'}
                          strokeWidth={0.5}
                        />
                        <text
                          y={radius + 17}
                          textAnchor="middle"
                          fill={isFocused ? '#f1f5f9' : '#94a3b8'}
                          fontSize={10}
                          fontWeight={isFocused ? 600 : 400}
                          className="pointer-events-none select-none"
                        >
                          {node.label.length > 18 ? node.label.substring(0, 16) + '…' : node.label}
                        </text>
                      </g>
                    )}

                    {/* Connection count badge */}
                    {(connectionCount[node.id] || 0) > 1 && (
                      <g transform={`translate(${radius * 0.7}, ${-radius * 0.7})`}>
                        <circle r={8} fill="#0f172a" stroke={style.stroke} strokeWidth={1} />
                        <text
                          textAnchor="middle"
                          dominantBaseline="middle"
                          fill="#e2e8f0"
                          fontSize={8}
                          fontWeight="bold"
                          className="pointer-events-none select-none"
                        >
                          {connectionCount[node.id]}
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}
            </g>
          </svg>
        </div>

        {/* Selected node info panel */}
        {selectedNodeData && (
          <div className="mx-4 mb-4 mt-2 p-3 bg-slate-800/70 rounded-lg border border-slate-700">
            <div className="flex items-center gap-2 mb-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: NODE_STYLES[selectedNodeData.type]?.fill || '#6b7280' }}
              />
              <span className="text-sm font-semibold text-slate-100">{selectedNodeData.label}</span>
              <Badge variant="outline" className="text-[10px] ml-auto" style={{ borderColor: NODE_STYLES[selectedNodeData.type]?.fill, color: NODE_STYLES[selectedNodeData.type]?.fill }}>
                {selectedNodeData.type}
              </Badge>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
              <div className="bg-slate-900/50 rounded p-2">
                <span className="text-slate-500">Connections</span>
                <p className="text-slate-200 font-medium">{connectionCount[selectedNodeData.id] || 0}</p>
              </div>
              {selectedEdges.length > 0 && (
                <div className="bg-slate-900/50 rounded p-2 col-span-1 sm:col-span-2">
                  <span className="text-slate-500">Connected to</span>
                  <p className="text-slate-200 font-medium truncate">
                    {selectedEdges
                      .map(e => {
                        const otherId = e.source === selectedNode ? e.target : e.source;
                        const other = graphData.nodes.find(n => n.id === otherId);
                        return other?.label || otherId;
                      })
                      .slice(0, 4)
                      .join(', ')}
                    {selectedEdges.length > 4 ? ` +${selectedEdges.length - 4} more` : ''}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RelationshipGraph;
