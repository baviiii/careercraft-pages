/**
 * Hook for querying impacts from graph-query Azure Function
 */

import { useState, useCallback } from 'react';

const GRAPH_QUERY_URL = import.meta.env.VITE_AZURE_GRAPH_QUERY_URL || '';
const AZURE_FUNCTION_KEY = import.meta.env.VITE_AZURE_FUNCTION_KEY || '';

export interface Impact {
  id: string;
  policyId: string;
  policyName: string;
  affectedEntity: string;
  affectedEntityType: string;
  impactType: string;
  direction: 'increase' | 'decrease' | 'constraint' | 'enable';
  severity: 'high' | 'medium' | 'low';
  confidence: number;
  evidenceText: string;
  quantitativeValue?: string;
  timeframe?: string;
  sourceDocument?: string;
  sourceChunk?: string;
  createdAt?: string;
}

export interface ImpactAggregation {
  entity: string;
  totalImpacts: number;
  policies: number;
  aggregatedByType: Record<string, {
    total: number;
    increases: number;
    decreases: number;
    constraints: number;
    enables: number;
    highSeverity: number;
    mediumSeverity: number;
    lowSeverity: number;
  }>;
  conflicts: Array<{
    type: string;
    impactType: string;
    affectedEntity: string;
    increases: Impact[];
    decreases: Impact[];
    severity: string;
  }>;
  quantitativeSummary: {
    totalFunding: number;
    totalJobs: number;
    fundingValues: Array<{ impact: string; value: number; direction: string }>;
    jobValues: Array<{ impact: string; value: number; direction: string }>;
    percentages: Array<{ impact: string; value: number }>;
  };
  bySeverity: {
    high: number;
    medium: number;
    low: number;
  };
}

export function useImpactQueries() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getImpactsForEntity = useCallback(async (
    entityName: string,
    filters: {
      impactType?: string;
      severity?: string;
      timeframe?: string;
      policyId?: string;
      limit?: number;
    } = {}
  ): Promise<Impact[]> => {
    if (!GRAPH_QUERY_URL) {
      console.warn('Graph query URL not configured');
      return [];
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(GRAPH_QUERY_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(AZURE_FUNCTION_KEY && { 'x-functions-key': AZURE_FUNCTION_KEY }),
        },
        body: JSON.stringify({
          action: 'get_impacts',
          entityName,
          ...filters,
          limit: filters.limit || 50,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch impacts: ${response.status}`);
      }

      const result = await response.json();
      return result.data || [];
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('Error fetching impacts:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const aggregateImpacts = useCallback(async (
    entityName: string,
    policyIds: string[] | null = null
  ): Promise<ImpactAggregation | null> => {
    if (!GRAPH_QUERY_URL) {
      console.warn('Graph query URL not configured');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(GRAPH_QUERY_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(AZURE_FUNCTION_KEY && { 'x-functions-key': AZURE_FUNCTION_KEY }),
        },
        body: JSON.stringify({
          action: 'aggregate_impacts',
          entityName,
          policies: policyIds,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to aggregate impacts: ${response.status}`);
      }

      const result = await response.json();
      return result.data || null;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('Error aggregating impacts:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const forecastImpacts = useCallback(async (
    entityName: string,
    forecastPeriods: number = 12
  ) => {
    if (!GRAPH_QUERY_URL) {
      console.warn('Graph query URL not configured');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(GRAPH_QUERY_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(AZURE_FUNCTION_KEY && { 'x-functions-key': AZURE_FUNCTION_KEY }),
        },
        body: JSON.stringify({
          action: 'forecast_impacts',
          entityName,
          forecastPeriods,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to forecast impacts: ${response.status}`);
      }

      const result = await response.json();
      return result.data || null;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('Error forecasting impacts:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    getImpactsForEntity,
    aggregateImpacts,
    forecastImpacts,
    loading,
    error,
  };
}
