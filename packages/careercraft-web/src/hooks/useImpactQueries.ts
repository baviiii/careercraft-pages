/**
 * Impact queries, served by the Horus knowledge graph.
 *
 * Previously backed by the `graph-query` Azure Function over Cosmos Gremlin.
 * That infrastructure no longer exists — the Function App and the
 * `sa-gov-documents` search service were both deleted, so every call had been
 * failing silently. This is the same interface rebuilt on Horus.
 *
 * The mapping is honest rather than clever: **an impact is a graph edge.**
 * `Government of SA --funds--> Murray Bridge Fares Expansion` is a funding
 * impact on that program, and Horus carries the sentence it was extracted
 * from, so every impact here can be traced to a source document.
 */

import { useState, useCallback } from 'react';
import { horusTraverse } from '@/lib/horusKnowledge';

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

/**
 * Relationship type → the direction of effect it represents.
 * `contradicts` is the one that genuinely opposes; `requires` gates rather
 * than reduces, so it reads as a constraint.
 */
const DIRECTION_BY_TYPE: Record<string, Impact['direction']> = {
  funds: 'increase',
  supports: 'increase',
  employs: 'increase',
  targets: 'increase',
  leads_to: 'enable',
  part_of: 'enable',
  requires: 'constraint',
  competes_with: 'decrease',
  contradicts: 'decrease',
};

/** Extraction confidence is the only severity signal the graph actually has. */
function severityOf(confidence: number): Impact['severity'] {
  if (confidence >= 0.85) return 'high';
  if (confidence >= 0.6) return 'medium';
  return 'low';
}

/** Pull a dollar or job figure out of the evidence sentence, when stated. */
function quantitativeFrom(evidence: string | undefined): string | undefined {
  if (!evidence) return undefined;
  const money = /\$[\d,.]+\s*(?:billion|million|thousand|bn|m|k)?/i.exec(evidence);
  if (money) return money[0];
  const jobs = /([\d,]+)\s+(?:new\s+)?jobs/i.exec(evidence);
  return jobs ? `${jobs[1]} jobs` : undefined;
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
      const graph = await horusTraverse(entityName, 2);
      if (graph.notFound) return [];

      // Edges pointing AT the entity are things acting on it; those are its
      // impacts. Edges pointing away are things it acts on, which belong to
      // the other entity's impact list, not this one.
      const target = entityName.toLowerCase();
      let impacts: Impact[] = (graph.edges ?? [])
        .filter((edge) => edge.to.toLowerCase().includes(target) || edge.from.toLowerCase().includes(target))
        .map((edge, i) => {
          const confidence = edge.confidence ?? 0.5;
          return {
            id: `${edge.from}:${edge.type}:${edge.to}:${i}`,
            policyId: edge.from,
            policyName: edge.from,
            affectedEntity: edge.to,
            affectedEntityType: 'entity',
            impactType: edge.type,
            direction: DIRECTION_BY_TYPE[edge.type] ?? 'enable',
            severity: severityOf(confidence),
            confidence,
            evidenceText: edge.evidence ?? '',
            quantitativeValue: quantitativeFrom(edge.evidence),
          };
        })
        // An impact with no evidence sentence cannot be shown to a user as a
        // claim about their career, so it is not worth surfacing.
        .filter((impact) => impact.evidenceText.length > 0);

      if (filters.impactType) {
        impacts = impacts.filter((i) => i.impactType === filters.impactType);
      }
      if (filters.severity) {
        impacts = impacts.filter((i) => i.severity === filters.severity);
      }
      return impacts.slice(0, filters.limit ?? 50);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      console.error('[useImpactQueries] getImpactsForEntity failed:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Rolled up from the impacts themselves. The old backend did this server
   * side; at these volumes (tens of edges) doing it here is simpler and saves
   * a round trip.
   */
  const aggregateImpacts = useCallback(async (
    entityName: string,
    _policyIds: string[] | null = null
  ): Promise<ImpactAggregation | null> => {
    const impacts = await getImpactsForEntity(entityName, { limit: 200 });
    if (impacts.length === 0) return null;

    const aggregatedByType: ImpactAggregation['aggregatedByType'] = {};
    const bySeverity = { high: 0, medium: 0, low: 0 };

    for (const impact of impacts) {
      const bucket = (aggregatedByType[impact.impactType] ??= {
        total: 0, increases: 0, decreases: 0, constraints: 0, enables: 0,
        highSeverity: 0, mediumSeverity: 0, lowSeverity: 0,
      });
      bucket.total++;
      if (impact.direction === 'increase') bucket.increases++;
      if (impact.direction === 'decrease') bucket.decreases++;
      if (impact.direction === 'constraint') bucket.constraints++;
      if (impact.direction === 'enable') bucket.enables++;
      if (impact.severity === 'high') { bucket.highSeverity++; bySeverity.high++; }
      if (impact.severity === 'medium') { bucket.mediumSeverity++; bySeverity.medium++; }
      if (impact.severity === 'low') { bucket.lowSeverity++; bySeverity.low++; }
    }

    // A conflict is the same impact type pushing both ways on one entity —
    // which is exactly what the graph's `contradicts` edges were built to find.
    const conflicts: ImpactAggregation['conflicts'] = [];
    for (const [impactType, bucket] of Object.entries(aggregatedByType)) {
      if (bucket.increases > 0 && bucket.decreases > 0) {
        conflicts.push({
          type: 'directional_conflict',
          impactType,
          affectedEntity: entityName,
          increases: impacts.filter((i) => i.impactType === impactType && i.direction === 'increase'),
          decreases: impacts.filter((i) => i.impactType === impactType && i.direction === 'decrease'),
          severity: bucket.highSeverity > 0 ? 'high' : 'medium',
        });
      }
    }

    const fundingValues: ImpactAggregation['quantitativeSummary']['fundingValues'] = [];
    const jobValues: ImpactAggregation['quantitativeSummary']['jobValues'] = [];
    for (const impact of impacts) {
      if (!impact.quantitativeValue) continue;
      const num = Number(impact.quantitativeValue.replace(/[^\d.]/g, ''));
      if (!Number.isFinite(num) || num === 0) continue;
      const scale = /billion|bn/i.test(impact.quantitativeValue) ? 1e9
        : /million|\bm\b/i.test(impact.quantitativeValue) ? 1e6 : 1;
      const entry = { impact: impact.policyName, value: num * scale, direction: impact.direction };
      (impact.quantitativeValue.includes('$') ? fundingValues : jobValues).push(entry);
    }

    return {
      entity: entityName,
      totalImpacts: impacts.length,
      policies: new Set(impacts.map((i) => i.policyId)).size,
      aggregatedByType,
      conflicts,
      quantitativeSummary: {
        totalFunding: fundingValues.reduce((s, v) => s + v.value, 0),
        totalJobs: jobValues.reduce((s, v) => s + v.value, 0),
        fundingValues,
        jobValues,
        percentages: [],
      },
      bySeverity,
    };
  }, [getImpactsForEntity]);

  // `forecastImpacts` was removed with the legacy stack. It projected impacts
  // forward from a Cosmos time series that no longer exists, and the knowledge
  // graph is not a substitute: it records what documents state, not a trend
  // that can be extrapolated. A fabricated forecast about someone's career
  // prospects is worse than no forecast.

  return {
    getImpactsForEntity,
    aggregateImpacts,
    loading,
    error,
  };
}
