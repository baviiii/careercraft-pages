/**
 * Budget intelligence — extracted figures from the budget papers in the Horus
 * corpus, for the Policy Visualizer.
 *
 * Shape of the data flow:
 *   periods      loaded once, drives the period selector
 *   allocations  reloaded whenever the period / jurisdiction filter changes
 *   funders      reloaded with the period
 *
 * Periods load first because the selector cannot have a sensible default until
 * we know which years the corpus actually covers. Hard-coding "2025-26" would
 * silently show an empty chart the moment the corpus moves on.
 *
 * Errors surface. They are not swallowed into an empty state, because "no
 * budget data" and "the backend is down" look identical on a chart and only
 * one of them is a fact about the budget.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  horusBudgetAllocations,
  horusBudgetFunders,
  horusBudgetPeriods,
  type HorusBudgetAllocation,
  type HorusBudgetFunder,
  type HorusBudgetPeriod,
} from "@/lib/horusKnowledge";

export type BudgetSourceFilter = "all" | "federal" | "state";

interface UseBudgetIntelligenceOptions {
  /** Measures to request per period. */
  limit?: number;
}

export interface BudgetIntelligence {
  periods: HorusBudgetPeriod[];
  selectedPeriod: string | null;
  setSelectedPeriod: (period: string) => void;

  sourceFilter: BudgetSourceFilter;
  setSourceFilter: (filter: BudgetSourceFilter) => void;

  allocations: HorusBudgetAllocation[];
  funders: HorusBudgetFunder[];

  /** True until the period list resolves — nothing can render before that. */
  loadingPeriods: boolean;
  /** True while the selected period's figures are in flight. */
  loadingFigures: boolean;
  error: string | null;
  reload: () => void;
}

/**
 * Prefer the period with the most extracted measures rather than the newest.
 *
 * The newest period in the corpus is often a forward estimate carrying a
 * handful of figures, which makes for a thin first impression. The best-covered
 * year is the one the documents actually say the most about.
 */
export function defaultPeriod(periods: HorusBudgetPeriod[]): string | null {
  if (periods.length === 0) return null;
  return periods.reduce((best, p) => (p.measures > best.measures ? p : best)).period;
}

export function useBudgetIntelligence(
  options: UseBudgetIntelligenceOptions = {},
): BudgetIntelligence {
  const limit = options.limit ?? 24;

  const [periods, setPeriods] = useState<HorusBudgetPeriod[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<string | null>(null);
  const [sourceFilter, setSourceFilter] = useState<BudgetSourceFilter>("all");

  const [allocations, setAllocations] = useState<HorusBudgetAllocation[]>([]);
  const [funders, setFunders] = useState<HorusBudgetFunder[]>([]);

  const [loadingPeriods, setLoadingPeriods] = useState(true);
  const [loadingFigures, setLoadingFigures] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const reload = useCallback(() => setReloadToken((n) => n + 1), []);

  /**
   * Guards against a slow earlier request resolving after a newer one and
   * overwriting it — easy to hit here, because changing the period fires a new
   * pair of requests while the previous pair is still open.
   */
  const requestSeq = useRef(0);

  useEffect(() => {
    let cancelled = false;
    setLoadingPeriods(true);
    setError(null);

    horusBudgetPeriods()
      .then(({ periods: loaded }) => {
        if (cancelled) return;
        setPeriods(loaded);
        /* Keep the user's choice only if the refreshed corpus still covers it.
           A period that has since been dropped would leave the selector blank
           and the figures query asking for a year that returns nothing —
           indistinguishable, on screen, from a period with no measures. */
        setSelectedPeriod((current) =>
          current && loaded.some((p) => p.period === current)
            ? current
            : defaultPeriod(loaded),
        );
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Could not load budget periods");
      })
      .finally(() => {
        if (!cancelled) setLoadingPeriods(false);
      });

    return () => {
      cancelled = true;
    };
  }, [reloadToken]);

  useEffect(() => {
    if (!selectedPeriod) return;

    const seq = ++requestSeq.current;
    setLoadingFigures(true);
    setError(null);

    Promise.all([
      horusBudgetAllocations({
        period: selectedPeriod,
        ...(sourceFilter !== "all" && { source: sourceFilter }),
        limit,
      }),
      horusBudgetFunders({ period: selectedPeriod, limit: 10 }),
    ])
      .then(([allocationResult, funderResult]) => {
        if (seq !== requestSeq.current) return;
        setAllocations(allocationResult.allocations);
        setFunders(funderResult.funders);
      })
      .catch((err: unknown) => {
        if (seq !== requestSeq.current) return;
        setAllocations([]);
        setFunders([]);
        setError(err instanceof Error ? err.message : "Could not load budget figures");
      })
      .finally(() => {
        if (seq === requestSeq.current) setLoadingFigures(false);
      });
  }, [selectedPeriod, sourceFilter, limit, reloadToken]);

  return useMemo(
    () => ({
      periods,
      selectedPeriod,
      setSelectedPeriod,
      sourceFilter,
      setSourceFilter,
      allocations,
      funders,
      loadingPeriods,
      loadingFigures,
      error,
      reload,
    }),
    [
      periods,
      selectedPeriod,
      sourceFilter,
      allocations,
      funders,
      loadingPeriods,
      loadingFigures,
      error,
      reload,
    ],
  );
}
