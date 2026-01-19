/**
 * ContradictionVisualizer Component
 * 
 * Visualizes detected contradictions between documents.
 * Shows conflict relationships and highlights conflicting policy sections.
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  AlertTriangle,
  ArrowLeftRight,
  FileText,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Info,
} from 'lucide-react';

interface ContradictionPair {
  id: string;
  documentA: {
    id: string;
    title: string;
    excerpt: string;
    pageNumber?: number;
  };
  documentB: {
    id: string;
    title: string;
    excerpt: string;
    pageNumber?: number;
  };
  type: 'policy' | 'data' | 'definition' | 'procedure' | 'other';
  severity: 'high' | 'medium' | 'low';
  description: string;
  confidence: number;
}

interface ContradictionVisualizerProps {
  contradictions?: ContradictionPair[];
  className?: string;
}

const SEVERITY_COLORS = {
  high: 'bg-red-500/20 border-red-500 text-red-400',
  medium: 'bg-amber-500/20 border-amber-500 text-amber-400',
  low: 'bg-blue-500/20 border-blue-500 text-blue-400',
};

const TYPE_LABELS = {
  policy: 'Policy Conflict',
  data: 'Data Discrepancy',
  definition: 'Definition Mismatch',
  procedure: 'Procedural Conflict',
  other: 'General Contradiction',
};

// Sample contradictions for demo (would come from RAG in production)
const SAMPLE_CONTRADICTIONS: ContradictionPair[] = [
  {
    id: '1',
    documentA: {
      id: 'budget-2024.pdf',
      title: 'Budget Statement 2024',
      excerpt: 'The government will increase education spending by 15% in the next fiscal year.',
      pageNumber: 12,
    },
    documentB: {
      id: 'fiscal-review.pdf',
      title: 'Fiscal Review Report',
      excerpt: 'Education department budget to remain frozen at current levels for efficiency.',
      pageNumber: 8,
    },
    type: 'policy',
    severity: 'high',
    description: 'Conflicting statements about education budget allocation for 2024.',
    confidence: 0.87,
  },
  {
    id: '2',
    documentA: {
      id: 'skills-report.pdf',
      title: 'Skills Gap Analysis',
      excerpt: 'Critical shortage of 5,000 healthcare workers expected by 2025.',
      pageNumber: 23,
    },
    documentB: {
      id: 'workforce-plan.pdf',
      title: 'Workforce Planning Document',
      excerpt: 'Healthcare sector is adequately staffed with minimal gaps projected.',
      pageNumber: 15,
    },
    type: 'data',
    severity: 'medium',
    description: 'Contradicting assessments of healthcare workforce needs.',
    confidence: 0.72,
  },
];

const ContradictionCard: React.FC<{ contradiction: ContradictionPair }> = ({ 
  contradiction 
}) => {
  const [expanded, setExpanded] = useState(false);
  
  return (
    <Card className={`border ${SEVERITY_COLORS[contradiction.severity]} bg-slate-800/50`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className={`w-4 h-4 ${
              contradiction.severity === 'high' ? 'text-red-400' :
              contradiction.severity === 'medium' ? 'text-amber-400' : 'text-blue-400'
            }`} />
            <CardTitle className="text-sm text-slate-200">
              {TYPE_LABELS[contradiction.type]}
            </CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Badge 
              variant={contradiction.severity === 'high' ? 'destructive' : 'secondary'}
              className="text-xs"
            >
              {contradiction.severity.toUpperCase()}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {(contradiction.confidence * 100).toFixed(0)}% conf
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-slate-300 mb-4">{contradiction.description}</p>
        
        {/* Documents comparison */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Document A */}
          <div className="p-3 bg-slate-900/50 rounded-lg border border-slate-700">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-4 h-4 text-slate-400" />
              <span className="text-xs text-slate-400 truncate">
                {contradiction.documentA.title}
              </span>
              {contradiction.documentA.pageNumber && (
                <Badge variant="outline" className="text-xs ml-auto">
                  p.{contradiction.documentA.pageNumber}
                </Badge>
              )}
            </div>
            {expanded && (
              <p className="text-xs text-slate-300 italic">
                "{contradiction.documentA.excerpt}"
              </p>
            )}
          </div>
          
          {/* Arrow indicator */}
          <div className="hidden md:flex items-center justify-center absolute left-1/2 transform -translate-x-1/2">
            <ArrowLeftRight className="w-5 h-5 text-slate-500" />
          </div>
          
          {/* Document B */}
          <div className="p-3 bg-slate-900/50 rounded-lg border border-slate-700">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-4 h-4 text-slate-400" />
              <span className="text-xs text-slate-400 truncate">
                {contradiction.documentB.title}
              </span>
              {contradiction.documentB.pageNumber && (
                <Badge variant="outline" className="text-xs ml-auto">
                  p.{contradiction.documentB.pageNumber}
                </Badge>
              )}
            </div>
            {expanded && (
              <p className="text-xs text-slate-300 italic">
                "{contradiction.documentB.excerpt}"
              </p>
            )}
          </div>
        </div>
        
        {/* Expand/collapse button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setExpanded(!expanded)}
          className="w-full mt-3 text-xs"
        >
          {expanded ? (
            <>
              <ChevronUp className="w-3 h-3 mr-1" /> Hide Details
            </>
          ) : (
            <>
              <ChevronDown className="w-3 h-3 mr-1" /> Show Details
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};

export const ContradictionVisualizer: React.FC<ContradictionVisualizerProps> = ({
  contradictions,
  className = '',
}) => {
  // Use provided contradictions or sample data for demo
  const displayContradictions = contradictions || SAMPLE_CONTRADICTIONS;
  
  const highSeverity = displayContradictions.filter(c => c.severity === 'high').length;
  const mediumSeverity = displayContradictions.filter(c => c.severity === 'medium').length;
  const lowSeverity = displayContradictions.filter(c => c.severity === 'low').length;

  if (displayContradictions.length === 0) {
    return (
      <Card className={`bg-slate-900/50 border-slate-700 ${className}`}>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <AlertTriangle className="w-12 h-12 text-slate-600 mb-4" />
          <p className="text-slate-400 text-center">
            No contradictions detected.<br />
            Run a query to analyze document consistency.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Summary */}
      <Card className="bg-slate-900/50 border-slate-700">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2 text-slate-100">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            Contradiction Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-slate-200">
                {displayContradictions.length}
              </p>
              <p className="text-xs text-slate-400">Total Found</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-red-400">{highSeverity}</p>
              <p className="text-xs text-slate-400">High Severity</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-amber-400">{mediumSeverity}</p>
              <p className="text-xs text-slate-400">Medium</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-400">{lowSeverity}</p>
              <p className="text-xs text-slate-400">Low</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Info alert */}
      <Alert className="bg-slate-800/50 border-slate-700">
        <Info className="h-4 w-4" />
        <AlertTitle className="text-slate-200">About Contradiction Detection</AlertTitle>
        <AlertDescription className="text-slate-400 text-sm">
          Contradictions are identified using semantic analysis across documents. 
          High confidence scores indicate clear conflicts; lower scores may need manual review.
        </AlertDescription>
      </Alert>

      {/* Contradiction cards */}
      <div className="space-y-4">
        {displayContradictions.map(contradiction => (
          <ContradictionCard key={contradiction.id} contradiction={contradiction} />
        ))}
      </div>
    </div>
  );
};

export default ContradictionVisualizer;
