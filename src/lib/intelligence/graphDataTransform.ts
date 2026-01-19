/**
 * Graph Data Transformation Utilities
 * 
 * Transforms relationship data into formats suitable for
 * network graph visualization (React Flow, vis-network, etc.)
 */

// Node types for graph visualization
export interface GraphNode {
  id: string;
  label: string;
  type: 'document' | 'category' | 'sector' | 'topic' | 'entity' | 'chart';
  data?: Record<string, unknown>;
  position?: { x: number; y: number };
  style?: Record<string, unknown>;
}

// Edge types for graph visualization
export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  type?: 'related' | 'references' | 'contradicts' | 'supports' | 'contains';
  animated?: boolean;
  style?: Record<string, unknown>;
}

// Complete graph data structure
export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

// React Flow compatible node
export interface ReactFlowNode {
  id: string;
  type?: string;
  position: { x: number; y: number };
  data: {
    label: string;
    [key: string]: unknown;
  };
  style?: Record<string, unknown>;
}

// React Flow compatible edge
export interface ReactFlowEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  type?: string;
  animated?: boolean;
  style?: Record<string, unknown>;
  markerEnd?: {
    type: string;
  };
}

// Transform sources into graph nodes
export function sourcesToGraphNodes(
  sources: Array<{
    documentId: string;
    title: string;
    category?: string;
    sector?: string;
    score: number;
  }>
): GraphNode[] {
  const nodes: GraphNode[] = [];
  const seenDocuments = new Set<string>();
  const seenCategories = new Set<string>();
  const seenSectors = new Set<string>();
  
  sources.forEach((source, index) => {
    // Add document node
    if (!seenDocuments.has(source.documentId)) {
      seenDocuments.add(source.documentId);
      nodes.push({
        id: `doc-${source.documentId}`,
        label: source.title || source.documentId,
        type: 'document',
        data: {
          documentId: source.documentId,
          score: source.score,
        },
        position: {
          x: 200 + (index % 4) * 200,
          y: 100 + Math.floor(index / 4) * 150,
        },
      });
    }
    
    // Add category node
    if (source.category && !seenCategories.has(source.category)) {
      seenCategories.add(source.category);
      nodes.push({
        id: `cat-${source.category}`,
        label: source.category,
        type: 'category',
        position: {
          x: 50,
          y: 100 + nodes.filter(n => n.type === 'category').length * 80,
        },
      });
    }
    
    // Add sector node
    if (source.sector && !seenSectors.has(source.sector)) {
      seenSectors.add(source.sector);
      nodes.push({
        id: `sec-${source.sector}`,
        label: source.sector,
        type: 'sector',
        position: {
          x: 700,
          y: 100 + nodes.filter(n => n.type === 'sector').length * 80,
        },
      });
    }
  });
  
  return nodes;
}

// Create edges between documents and their categories/sectors
export function createRelationshipEdges(
  sources: Array<{
    documentId: string;
    category?: string;
    sector?: string;
  }>
): GraphEdge[] {
  const edges: GraphEdge[] = [];
  const seenEdges = new Set<string>();
  
  sources.forEach(source => {
    // Document to category edge
    if (source.category) {
      const edgeId = `doc-${source.documentId}-cat-${source.category}`;
      if (!seenEdges.has(edgeId)) {
        seenEdges.add(edgeId);
        edges.push({
          id: edgeId,
          source: `doc-${source.documentId}`,
          target: `cat-${source.category}`,
          type: 'related',
        });
      }
    }
    
    // Document to sector edge
    if (source.sector) {
      const edgeId = `doc-${source.documentId}-sec-${source.sector}`;
      if (!seenEdges.has(edgeId)) {
        seenEdges.add(edgeId);
        edges.push({
          id: edgeId,
          source: `doc-${source.documentId}`,
          target: `sec-${source.sector}`,
          type: 'related',
        });
      }
    }
  });
  
  return edges;
}

// Transform graph data to React Flow format
export function toReactFlowFormat(graphData: GraphData): {
  nodes: ReactFlowNode[];
  edges: ReactFlowEdge[];
} {
  const nodeColors: Record<string, string> = {
    document: '#3b82f6',
    category: '#10b981',
    sector: '#8b5cf6',
    topic: '#f59e0b',
    entity: '#ef4444',
    chart: '#ec4899',
  };
  
  const nodes: ReactFlowNode[] = graphData.nodes.map(node => ({
    id: node.id,
    type: 'default',
    position: node.position || { x: 0, y: 0 },
    data: {
      label: node.label,
      nodeType: node.type,
      ...node.data,
    },
    style: {
      background: nodeColors[node.type] || '#6b7280',
      color: '#fff',
      padding: '10px',
      borderRadius: '8px',
      border: 'none',
      fontSize: '12px',
      ...node.style,
    },
  }));
  
  const edges: ReactFlowEdge[] = graphData.edges.map(edge => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    label: edge.label,
    type: 'smoothstep',
    animated: edge.type === 'contradicts',
    style: {
      stroke: edge.type === 'contradicts' ? '#ef4444' : '#6b7280',
      ...edge.style,
    },
    markerEnd: {
      type: 'arrowclosed',
    },
  }));
  
  return { nodes, edges };
}

// Create a simple document relationship graph
export function createDocumentGraph(
  sources: Array<{
    documentId: string;
    title: string;
    category?: string;
    sector?: string;
    score: number;
  }>
): GraphData {
  const nodes = sourcesToGraphNodes(sources);
  const edges = createRelationshipEdges(sources);
  
  return { nodes, edges };
}

// Auto-layout nodes in a circular pattern
export function circularLayout(nodes: GraphNode[], centerX = 400, centerY = 300, radius = 200): GraphNode[] {
  return nodes.map((node, index) => {
    const angle = (2 * Math.PI * index) / nodes.length;
    return {
      ...node,
      position: {
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle),
      },
    };
  });
}

// Auto-layout nodes in a hierarchical pattern
export function hierarchicalLayout(nodes: GraphNode[]): GraphNode[] {
  const levels: Record<string, number> = {
    category: 0,
    sector: 0,
    document: 1,
    topic: 2,
    entity: 2,
    chart: 1,
  };
  
  const levelNodes: Record<number, GraphNode[]> = {};
  
  nodes.forEach(node => {
    const level = levels[node.type] ?? 1;
    if (!levelNodes[level]) levelNodes[level] = [];
    levelNodes[level].push(node);
  });
  
  const layoutNodes: GraphNode[] = [];
  
  Object.entries(levelNodes).forEach(([level, nodesAtLevel]) => {
    const y = parseInt(level) * 150 + 100;
    nodesAtLevel.forEach((node, index) => {
      layoutNodes.push({
        ...node,
        position: {
          x: (index + 1) * (800 / (nodesAtLevel.length + 1)),
          y,
        },
      });
    });
  });
  
  return layoutNodes;
}
