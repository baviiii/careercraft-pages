/**
 * Policy & Investment Visualizer — budget figures extracted from the corpus.
 *
 * Every number on this page is one value read out of one document in the Horus
 * corpus, shown with the document it came from and, where the extraction
 * supports it, the sentence that states it.
 *
 * ── WHY THERE IS NO TOTAL, AND NO YEAR-ON-YEAR TREND ──────────────────────
 * The obvious chart for a budget page is "spending per year", and it cannot be
 * built honestly from this data. The extracted `amount_aud` values are not a
 * homogeneous series: the same field holds discrete measures, portfolio
 * roll-ups ("Total Consolidated Account payments") and balance-sheet stocks
 * ("Total Assets"), across two budget years and two jurisdictions, with the
 * same measure frequently extracted more than once. Summing them produces a
 * large, confident number that matches nothing in any document — and no reader
 * could tell it apart from a real one.
 *
 * So the page ranks individual measures instead. A bar is a figure a document
 * states. That is a weaker claim than a total, and it is one we can actually
 * back.
 *
 * This replaces a version of this page whose charts were hardcoded arrays —
 * invented budget splits, an invented $450M allocation, an invented 12,500
 * jobs. Nothing here is a placeholder; if the corpus has no figures for a
 * period, the page says so rather than drawing something.
 */
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { AstralShell } from "@/components/astral";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart3,
  FileText,
  DollarSign,
  Building2,
  Quote,
  AlertCircle,
  RefreshCw,
  Info,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
} from "recharts";
import {
  useBudgetIntelligence,
  type BudgetSourceFilter,
} from "@/hooks/useBudgetIntelligence";
import type { HorusBudgetAllocation } from "@/lib/horusKnowledge";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0 },
};

/** Jurisdiction is the one thing colour encodes here. */
const SOURCE_COLOR: Record<string, string> = {
  federal: "hsl(var(--chart-federal))",
  state: "hsl(var(--chart-state))",
  other: "hsl(var(--muted-foreground))",
};

const SOURCE_LABEL: Record<string, string> = {
  federal: "Commonwealth",
  state: "South Australia",
  other: "Other",
};

/** Compact money, at the precision the underlying figure actually supports. */
function formatAmount(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1e9) return `$${(value / 1e9).toFixed(abs >= 1e10 ? 0 : 1)}bn`;
  if (abs >= 1e6) return `$${(value / 1e6).toFixed(abs >= 1e8 ? 0 : 1)}m`;
  if (abs >= 1e3) return `$${(value / 1e3).toFixed(0)}k`;
  return `$${Math.round(value).toLocaleString()}`;
}

/** Long measure names have to fit an axis without pushing the plot off-screen. */
function truncate(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max - 1)}…`;
}

interface ChartDatum {
  id: string;
  label: string;
  amount: number;
  allocation: HorusBudgetAllocation;
}

function ChartTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: ChartDatum }> }) {
  if (!active || !payload?.length) return null;
  const { allocation } = payload[0].payload;
  return (
    <div className="max-w-xs rounded-lg border border-border bg-card p-3 shadow-lg">
      <p className="text-sm font-medium text-foreground">{allocation.name}</p>
      <p className="mt-1 text-lg font-semibold text-foreground">
        {formatAmount(allocation.amountAud)}
      </p>
      <p className="text-xs text-muted-foreground">
        {SOURCE_LABEL[allocation.source]}
        {allocation.period ? ` · ${allocation.period}` : ""}
      </p>
      {allocation.funders.length > 0 && (
        <p className="mt-1.5 text-xs text-muted-foreground">
          Funded by {allocation.funders.slice(0, 2).join(", ")}
          {allocation.funders.length > 2 ? ` +${allocation.funders.length - 2}` : ""}
        </p>
      )}
      <p className="mt-1.5 text-[11px] text-muted-foreground">Click for the source</p>
    </div>
  );
}

/**
 * The provenance panel — the reason this page exists in this form.
 *
 * The evidence quote hangs off the funding relationship, which means it
 * sometimes states the amount and sometimes only establishes who funds what.
 * Those are different strengths of claim, so they get different labels; the
 * backend computes which case applies.
 */
function MeasureDetail({ allocation }: { allocation: HorusBudgetAllocation }) {
  return (
    <div className="space-y-4">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            variant="outline"
            style={{
              borderColor: SOURCE_COLOR[allocation.source],
              color: SOURCE_COLOR[allocation.source],
            }}
          >
            {SOURCE_LABEL[allocation.source]}
          </Badge>
          <Badge variant="secondary" className="text-xs capitalize">
            {allocation.type}
          </Badge>
          {allocation.period && (
            <Badge variant="outline" className="font-mono text-xs">
              {allocation.period}
            </Badge>
          )}
        </div>
        <h3 className="mt-2 text-lg font-semibold text-foreground">{allocation.name}</h3>
        <p className="mt-1 text-3xl font-semibold text-foreground">
          {formatAmount(allocation.amountAud)}
        </p>
      </div>

      {allocation.funders.length > 0 && (
        <div>
          <p className="mb-1.5 text-xs uppercase tracking-wider text-muted-foreground">
            Recorded funders
          </p>
          <div className="flex flex-wrap gap-1.5">
            {allocation.funders.map((funder) => (
              <Badge key={funder} variant="secondary" className="text-xs">
                {funder}
              </Badge>
            ))}
          </div>
        </div>
      )}

      <div>
        <p className="mb-1.5 flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground">
          <Quote className="h-3 w-3" />
          {allocation.evidence
            ? allocation.evidenceStatesAmount
              ? "Source sentence — states this figure"
              : "Relationship evidence — does not state the figure"
            : "No quote recorded"}
        </p>
        {allocation.evidence ? (
          <>
            <blockquote
              className={cn(
                "border-l-2 py-1 pl-3 text-sm italic text-foreground/90",
                allocation.evidenceStatesAmount ? "border-accent-emerald" : "border-border",
              )}
            >
              “{allocation.evidence}”
            </blockquote>
            {!allocation.evidenceStatesAmount && (
              <p className="mt-1.5 text-xs text-muted-foreground">
                This quote establishes the funding relationship. The amount was read
                elsewhere in the same document — open the source to confirm it.
              </p>
            )}
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            The extraction recorded this amount without a backing sentence. Treat it as
            unverified until checked against the source document.
          </p>
        )}
      </div>

      <div>
        <p className="mb-1.5 text-xs uppercase tracking-wider text-muted-foreground">
          Source {allocation.documents.length === 1 ? "document" : "documents"}
        </p>
        <ul className="space-y-1">
          {allocation.documents.map((doc) => (
            <li key={doc.id} className="flex items-start gap-2 text-sm text-foreground/90">
              <FileText className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
              <span>{doc.title}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default function PolicyVisualizer() {
  const navigate = useNavigate();
  const [authLoading, setAuthLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const {
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
  } = useBudgetIntelligence({ limit: 22 });

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!nextSession) navigate("/auth");
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) navigate("/auth");
      setAuthLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const chartData = useMemo<ChartDatum[]>(
    () =>
      allocations.map((allocation) => ({
        id: allocation.id,
        label: truncate(allocation.name, 42),
        amount: allocation.amountAud,
        allocation,
      })),
    [allocations],
  );

  // Default the detail panel to the largest measure so the page is never a
  // chart with an empty space beside it.
  const selectedIndex = Math.max(
    0,
    allocations.findIndex((a) => a.id === selectedId),
  );
  const selected = allocations[selectedIndex] ?? null;

  const step = (delta: number) => {
    if (allocations.length === 0) return;
    const next =
      (selectedIndex + delta + allocations.length) % allocations.length;
    setSelectedId(allocations[next].id);
  };

  const periodOptions = useMemo(
    () => [...periods].sort((a, b) => b.measures - a.measures),
    [periods],
  );

  /* Scale for the funder bars. Taken from the whole list rather than assuming
     funders[0] is the largest — the payload carries no ordering guarantee, and
     a wrong assumption here renders bars past 100% and out of their track. */
  const widestFunder = useMemo(
    () => funders.reduce((max, f) => Math.max(max, f.measureCount), 0) || 1,
    [funders],
  );

  if (authLoading) {
    return (
      <AstralShell
        title={<span className="as-gradient-text">Policy & Investment</span>}
        subtitle="Loading"
        backTo="/dashboard"
      >
        <div className="flex h-64 items-center justify-center">
          <div
            className="h-8 w-8 animate-spin rounded-full border-2 border-t-transparent"
            style={{ borderColor: "var(--as-aurora-1)", borderTopColor: "transparent" }}
          />
        </div>
      </AstralShell>
    );
  }

  const chartHeight = Math.max(280, chartData.length * 30 + 40);

  return (
    <AstralShell
      title={<span className="as-gradient-text">Policy & Investment</span>}
      subtitle={
        selectedPeriod ? `Budget papers · ${selectedPeriod}` : "Budget papers"
      }
      backTo="/dashboard"
    >
      <motion.div variants={container} initial="hidden" animate="show" className="space-y-8">
        {/* Header + filters */}
        <motion.div variants={item}>
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-3">
                <BarChart3 className="h-6 w-6 text-primary" />
                <Badge variant="outline" className="border-primary/30 text-primary">
                  <FileText className="mr-1 h-3 w-3" />
                  Extracted from source documents
                </Badge>
              </div>
              <h1 className="font-display text-3xl font-bold text-foreground">
                Policy &amp; Investment Visualizer
              </h1>
              <p className="mt-2 max-w-2xl text-muted-foreground">
                Individual budget measures found in the corpus, ranked by the amount
                each document states. Select a measure to see the document and the
                sentence behind it.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Select
                value={sourceFilter}
                onValueChange={(value) => setSourceFilter(value as BudgetSourceFilter)}
              >
                <SelectTrigger className="w-44 bg-background/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All jurisdictions</SelectItem>
                  <SelectItem value="state">South Australia</SelectItem>
                  <SelectItem value="federal">Commonwealth</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={selectedPeriod ?? ""}
                onValueChange={setSelectedPeriod}
                disabled={loadingPeriods || periodOptions.length === 0}
              >
                <SelectTrigger className="w-44 bg-background/50">
                  <SelectValue placeholder={loadingPeriods ? "Loading…" : "No periods"} />
                </SelectTrigger>
                <SelectContent>
                  {periodOptions.map((p) => (
                    <SelectItem key={p.period} value={p.period}>
                      {p.period} · {p.measures}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </motion.div>

        {/* Error — distinct from "no data", because a chart cannot show the difference */}
        {error && (
          <motion.div variants={item}>
            <Card className="border-destructive/40 bg-destructive/5">
              <CardContent className="flex items-start gap-3 py-4">
                <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-destructive" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">
                    Could not load budget figures
                  </p>
                  <p className="mt-0.5 text-sm text-muted-foreground">{error}</p>
                </div>
                <Button variant="outline" size="sm" className="gap-2" onClick={reload}>
                  <RefreshCw className="h-3.5 w-3.5" />
                  Retry
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Ranked measures + provenance */}
        <motion.div variants={item} className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card className="glass border-border/50 lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-accent-gold" />
                Measures by stated amount
                {selectedPeriod ? ` (${selectedPeriod})` : ""}
              </CardTitle>
              <CardDescription>
                Each bar is one figure from one document. Amounts are not comparable as
                a total — some measures are programme line items and others are
                portfolio roll-ups.
              </CardDescription>
              {/* Legend: colour carries jurisdiction, so it is never colour-alone */}
              <div className="flex flex-wrap items-center gap-4 pt-1">
                {(["state", "federal"] as const).map((source) => (
                  <span key={source} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span
                      className="h-2.5 w-2.5 rounded-sm"
                      style={{ backgroundColor: SOURCE_COLOR[source] }}
                    />
                    {SOURCE_LABEL[source]}
                  </span>
                ))}
              </div>
            </CardHeader>
            <CardContent>
              {loadingFigures ? (
                <div className="space-y-2" aria-busy="true" aria-label="Loading measures">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-6 animate-pulse rounded bg-muted"
                      style={{ width: `${95 - i * 9}%` }}
                    />
                  ))}
                </div>
              ) : chartData.length === 0 ? (
                <div className="flex h-48 flex-col items-center justify-center text-center">
                  <Info className="mb-2 h-6 w-6 text-muted-foreground" />
                  <p className="text-sm font-medium text-foreground">
                    No figures extracted for this selection
                  </p>
                  <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                    The corpus contains no budget measures for{" "}
                    {selectedPeriod ?? "this period"}
                    {sourceFilter !== "all" ? ` from ${SOURCE_LABEL[sourceFilter]}` : ""}.
                    Try another period or jurisdiction.
                  </p>
                </div>
              ) : (
                <div style={{ height: chartHeight }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={chartData}
                      layout="vertical"
                      margin={{ top: 4, right: 64, bottom: 4, left: 4 }}
                      barCategoryGap={2}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="hsl(var(--border))"
                        horizontal={false}
                      />
                      <XAxis
                        type="number"
                        tick={{ fontSize: 11 }}
                        stroke="hsl(var(--muted-foreground))"
                        tickFormatter={formatAmount}
                      />
                      <YAxis
                        type="category"
                        dataKey="label"
                        tick={{ fontSize: 11 }}
                        stroke="hsl(var(--muted-foreground))"
                        width={220}
                        interval={0}
                      />
                      <Tooltip
                        content={<ChartTooltip />}
                        cursor={{ fill: "hsl(var(--muted))", fillOpacity: 0.4 }}
                      />
                      <Bar
                        dataKey="amount"
                        radius={[0, 4, 4, 0]}
                        // Recharts spreads the datum onto the click argument but
                        // also keeps the original under `payload`; which one is
                        // populated depends on the mark, so read both.
                        onClick={(entry: unknown) => {
                          const hit = entry as
                            | { id?: string; payload?: { id?: string } }
                            | undefined;
                          setSelectedId(hit?.id ?? hit?.payload?.id ?? null);
                        }}
                        className="cursor-pointer"
                      >
                        {chartData.map((datum) => (
                          <Cell
                            key={datum.id}
                            fill={SOURCE_COLOR[datum.allocation.source]}
                            fillOpacity={
                              selected && selected.id !== datum.id ? 0.55 : 1
                            }
                          />
                        ))}
                        <LabelList
                          dataKey="amount"
                          position="right"
                          formatter={formatAmount}
                          style={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                        />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="glass border-border/50">
            <CardHeader>
              <CardTitle className="text-base">Where this figure comes from</CardTitle>
              <CardDescription>
                {selected
                  ? `Measure ${selectedIndex + 1} of ${allocations.length}`
                  : "Select a measure"}
              </CardDescription>
              {/* Clicking a bar is mouse-only; these give the same selection a
                  keyboard path, which is the whole reason they exist. */}
              {allocations.length > 1 && (
                <div className="flex items-center gap-2 pt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => step(-1)}
                    aria-label="Previous measure"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => step(1)}
                    aria-label="Next measure"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </CardHeader>
            <CardContent>
              {loadingFigures ? (
                <div className="space-y-3" aria-busy="true">
                  <div className="h-4 w-1/3 animate-pulse rounded bg-muted" />
                  <div className="h-8 w-2/3 animate-pulse rounded bg-muted" />
                  <div className="h-20 w-full animate-pulse rounded bg-muted" />
                </div>
              ) : selected ? (
                <MeasureDetail allocation={selected} />
              ) : (
                <p className="text-sm text-muted-foreground">
                  Nothing to show for this selection.
                </p>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Funders — counts, never totals */}
        {funders.length > 0 && (
          <motion.div variants={item}>
            <Card className="glass border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  Bodies recorded as funding measures
                </CardTitle>
                <CardDescription>
                  How many distinct measures each body is linked to in the knowledge
                  graph for {selectedPeriod}. These are counts of measures, not spending
                  totals.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {funders.map((funder) => {
                    return (
                      <li key={funder.name} className="flex items-center gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-foreground">
                            {funder.name}
                          </p>
                          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{
                                width: `${(funder.measureCount / widestFunder) * 100}%`,
                              }}
                              transition={{ duration: 0.6 }}
                              className="h-full rounded-full"
                              style={{ backgroundColor: "hsl(var(--primary))" }}
                            />
                          </div>
                        </div>
                        <div className="w-28 flex-shrink-0 text-right">
                          <p className="font-mono text-sm text-foreground">
                            {funder.measureCount}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {funder.measureCount === 1 ? "measure" : "measures"}
                          </p>
                        </div>
                        {funder.largestMeasure && (
                          <div className="hidden w-40 flex-shrink-0 text-right md:block">
                            <p className="truncate text-xs text-muted-foreground">
                              largest
                            </p>
                            <p className="font-mono text-sm text-foreground">
                              {formatAmount(funder.largestMeasure.amountAud)}
                            </p>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Provenance */}
        <motion.div variants={item}>
          <Card className="glass border-border/50 bg-muted/30">
            <CardContent className="py-4">
              <div className="flex items-start gap-3 text-sm text-muted-foreground">
                <FileText className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <p>
                  Figures are extracted from the budget papers held in the Horus corpus
                  and shown individually, with the document and — where the extraction
                  records one — the sentence stating them. They are deliberately never
                  summed: the corpus mixes programme measures, portfolio roll-ups and
                  balance-sheet totals across two budget years and two jurisdictions, so
                  a total would be misleading. Where a quote evidences a funding
                  relationship but not the amount, the panel says so.
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </AstralShell>
  );
}
