/**
 * Hook for querying impacts from graph-query Azure Function via Supabase proxy
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Graph queries are proxied through Supabase Edge Functions
// No client-side keys or URLs required

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
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.functions.invoke('azure-graph-proxy', {
        body: {
          functionName: 'graph-query',
          action: 'get_impacts',
          entityName,
          ...filters,
          limit: filters.limit || 50,
        },
      });

      if (error) throw new Error(error.message || 'Failed to fetch impacts');
      return data?.data || [];
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
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.functions.invoke('azure-graph-proxy', {
        body: {
          functionName: 'graph-query',
          action: 'aggregate_impacts',
          entityName,
          policies: policyIds,
        },
      });

      if (error) throw new Error(error.message || 'Failed to aggregate impacts');
      return data?.data || null;
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
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.functions.invoke('azure-graph-proxy', {
        body: {
          functionName: 'graph-query',
          action: 'forecast_impacts',
          entityName,
          forecastPeriods,
        },
      });

      if (error) throw new Error(error.message || 'Failed to forecast impacts');
      return data?.data || null;
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
