/**
 * ScenarioModeler - Interactive what-if impact analysis
 * 
 * Beautiful, dark-themed scenario simulator with:
 * - Entity dropdown populated from real intelligence data
 * - Policy selector from known policies
 * - Animated results with in-depth analysis
 */

import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import {
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Calculator,
  Loader2,
  Zap,
  Users,
  DollarSign,
  ArrowRight,
  ChevronRight,
  BarChart3,
  Shield,
  Lightbulb,
  Target,
  Building2,
  Briefcase,
  Activity,
  Minus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useIntelligence } from "@/contexts/IntelligenceContext";
import { supabase } from "@/integrations/supabase/client";

// Graph queries are proxied through Supabase Edge Functions
// No client-side keys or URLs required

interface Scenario {
  entity: string;
  policy?: string;
  changePercent: number;
  affectedSectors?: string[];
}

interface ScenarioResult {
  scenario: Scenario;
  current: any[];
  simulated: any[];
  currentAggregation: any;
  simulatedAggregation: any;
  comparison: {
    totalImpacts: { current: number; simulated: number; change: number };
    quantitative: {
      funding: { current: number; simulated: number; change: number; changePercent: string };
      jobs: { current: number; simulated: number; change: number; changePercent: string };
    };
    bySeverity: {
      high: { current: number; simulated: number; change: number };
      medium: { current: number; simulated: number; change: number };
      low: { current: number; simulated: number; change: number };
    };
  };
  recommendations: Array<{
    type: string;
    severity: string;
    message: string;
    action: string;
  }>;
  generatedAt: string;
}

interface ScenarioModelerProps {
  defaultEntity?: string;
  onScenarioComplete?: (result: ScenarioResult) => void;
}

const KNOWN_POLICIES = [
  'Budget 2025',
  'Skills SA',
  'SA Health Plan',
  'Defence Industry Strategy',
  'Hydrogen Jobs Plan',
  'Green Industries SA',
  'Digital Transformation',
  'Regional Development',
];

export function ScenarioModeler({ defaultEntity = "", onScenarioComplete }: ScenarioModelerProps) {
  const { careerOpportunities, skillsDemand, fundingAllocations } = useIntelligence();

  const [entity, setEntity] = useState(defaultEntity);
  const [policy, setPolicy] = useState("");
  const [changePercent, setChangePercent] = useState(10);
  const [direction, setDirection] = useState<'increase' | 'decrease'>('increase');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScenarioResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Build entity list from real intelligence data
  const entityOptions = useMemo(() => {
    const entities: { value: string; label: string; type: string; icon: string }[] = [];
    const seen = new Set<string>();

    // Sectors from funding
    for (const f of fundingAllocations) {
      const key = f.sector.toLowerCase().replace(/\s+/g, '_');
      if (!seen.has(key)) {
        seen.add(key);
        entities.push({ value: key, label: f.sector, type: 'Sector', icon: '🏛' });
      }
    }

    // Careers/occupations
    for (const c of careerOpportunities) {
      const key = c.occupation.toLowerCase().replace(/\s+/g, '_');
      if (!seen.has(key)) {
        seen.add(key);
        entities.push({ value: key, label: c.occupation, type: 'Career', icon: '💼' });
      }
    }

    // Skills
    for (const s of skillsDemand.slice(0, 15)) {
      const key = s.name.toLowerCase().replace(/\s+/g, '_');
      if (!seen.has(key)) {
        seen.add(key);
        entities.push({ value: key, label: s.name, type: 'Skill', icon: '🧠' });
      }
    }

    return entities;
  }, [fundingAllocations, careerOpportunities, skillsDemand]);

  const effectiveChange = direction === 'decrease' ? -changePercent : changePercent;

  const runScenario = async () => {
    if (!entity.trim()) {
      setError("Please select an entity");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const scenario: Scenario = {
        entity: entity.trim(),
        policy: policy.trim() || undefined,
        changePercent: effectiveChange,
      };

      const { data, error } = await supabase.functions.invoke('azure-graph-proxy', {
        body: {
          functionName: 'graph-query',
          action: 'simulate_scenario',
          scenario,
        },
      });

      if (error) throw new Error(error.message || 'Scenario simulation failed');

      const scenarioResult = data?.data;

      if (scenarioResult?.error) {
        throw new Error(scenarioResult.error);
      }

      setResult(scenarioResult);
      if (onScenarioComplete) {
        onScenarioComplete(scenarioResult);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('Error running scenario:', err);
    } finally {
      setLoading(false);
    }
  };

  const selectedEntityLabel = entityOptions.find(e => e.value === entity)?.label || entity;

  return (
    <div className="space-y-5">
      {/* Input Form */}
      <Card className="overflow-hidden border-slate-700 bg-slate-900/80 backdrop-blur-xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-700/60 bg-gradient-to-r from-blue-500/10 via-purple-500/8 to-cyan-500/10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg shadow-blue-500/20">
              <Calculator className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Impact Scenario Modeling</h3>
              <p className="text-xs text-slate-400">Simulate &quot;what-if&quot; policy changes and their cascading impacts</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* Entity Selection */}
          <div>
            <label className="text-sm font-medium text-slate-200 mb-2 block flex items-center gap-2">
              <Target className="w-3.5 h-3.5 text-blue-400" />
              Entity to Simulate
            </label>
            {entityOptions.length > 0 ? (
              <Select value={entity} onValueChange={setEntity}>
                <SelectTrigger className="w-full bg-slate-800/60 border-slate-600 text-white hover:bg-slate-800 focus:ring-blue-500/30">
                  <SelectValue placeholder="Select a sector, career, or skill..." />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-600 max-h-72">
                  {/* Group by type */}
                  {['Sector', 'Career', 'Skill'].map(type => {
                    const filtered = entityOptions.filter(e => e.type === type);
                    if (filtered.length === 0) return null;
                    return (
                      <div key={type}>
                        <div className="px-2 py-1.5 text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
                          {type === 'Sector' ? '🏛 Sectors' : type === 'Career' ? '💼 Careers' : '🧠 Skills'}
                        </div>
                        {filtered.map(e => (
                          <SelectItem key={e.value} value={e.value} className="text-slate-200 hover:text-white focus:text-white focus:bg-slate-700">
                            <span className="flex items-center gap-2">
                              <span>{e.icon}</span>
                              <span>{e.label}</span>
                              <Badge className="text-[9px] px-1 py-0 bg-slate-700/50 text-slate-400 border-slate-600 ml-auto">
                                {e.type}
                              </Badge>
                            </span>
                          </SelectItem>
                        ))}
                      </div>
                    );
                  })}
                </SelectContent>
              </Select>
            ) : (
              <Input
                value={entity}
                onChange={(e) => setEntity(e.target.value)}
                placeholder="e.g., healthcare, registered_nurse, digital_skills"
                className="bg-slate-800/60 border-slate-600 text-white placeholder:text-slate-500"
              />
            )}
          </div>

          {/* Policy Selection */}
          <div>
            <label className="text-sm font-medium text-slate-200 mb-2 block flex items-center gap-2">
              <Shield className="w-3.5 h-3.5 text-purple-400" />
              Policy Context
              <span className="text-[10px] text-slate-500 font-normal">(optional)</span>
            </label>
            <Select value={policy} onValueChange={setPolicy}>
              <SelectTrigger className="w-full bg-slate-800/60 border-slate-600 text-white hover:bg-slate-800 focus:ring-purple-500/30">
                <SelectValue placeholder="Select a policy or leave blank for general..." />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-600">
                <SelectItem value="general" className="text-slate-200 focus:text-white focus:bg-slate-700">
                  General (no specific policy)
                </SelectItem>
                {KNOWN_POLICIES.map(p => (
                  <SelectItem key={p} value={p} className="text-slate-200 focus:text-white focus:bg-slate-700">
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Change Magnitude + Direction */}
          <div>
            <label className="text-sm font-medium text-slate-200 mb-3 block flex items-center gap-2">
              <Activity className="w-3.5 h-3.5 text-cyan-400" />
              Impact Change
            </label>

            {/* Direction Toggle */}
            <div className="flex items-center gap-2 mb-4">
              <button
                onClick={() => setDirection('increase')}
                className={cn(
                  "flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 border",
                  direction === 'increase'
                    ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/40 shadow-inner shadow-emerald-500/10"
                    : "bg-slate-800/50 text-slate-400 border-slate-700 hover:bg-slate-800 hover:text-slate-300"
                )}
              >
                <TrendingUp className="w-4 h-4" />
                Increase
              </button>
              <button
                onClick={() => setDirection('decrease')}
                className={cn(
                  "flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 border",
                  direction === 'decrease'
                    ? "bg-red-500/15 text-red-300 border-red-500/40 shadow-inner shadow-red-500/10"
                    : "bg-slate-800/50 text-slate-400 border-slate-700 hover:bg-slate-800 hover:text-slate-300"
                )}
              >
                <TrendingDown className="w-4 h-4" />
                Decrease
              </button>
            </div>

            {/* Slider */}
            <div className="px-1">
              <Slider
                value={[changePercent]}
                onValueChange={(v) => setChangePercent(v[0])}
                min={1}
                max={50}
                step={1}
                className="mb-2"
              />
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">1%</span>
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "text-2xl font-bold tabular-nums",
                    direction === 'increase' ? "text-emerald-400" : "text-red-400"
                  )}>
                    {direction === 'decrease' ? '-' : '+'}{changePercent}%
                  </span>
                </div>
                <span className="text-xs text-slate-500">50%</span>
              </div>
            </div>

            {/* Summary line */}
            <div className="mt-3 p-3 rounded-lg bg-slate-800/40 border border-slate-700/50">
              <p className="text-sm text-slate-300">
                Simulate a{' '}
                <span className={cn("font-semibold", direction === 'increase' ? "text-emerald-400" : "text-red-400")}>
                  {changePercent}% {direction}
                </span>
                {' '}in{' '}
                <span className="font-semibold text-white">
                  {selectedEntityLabel || 'selected entity'}
                </span>
                {policy && policy !== 'general' ? (
                  <>
                    {' '}under <span className="font-semibold text-purple-300">{policy}</span>
                  </>
                ) : null}
              </p>
            </div>
          </div>

          {/* Run Button */}
          <Button
            onClick={runScenario}
            disabled={loading || !entity.trim()}
            className={cn(
              "w-full py-6 text-base font-semibold transition-all",
              loading
                ? "bg-slate-700 text-slate-400"
                : "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40"
            )}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                Running Scenario Simulation...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Zap className="w-5 h-5" />
                Run Scenario
                <ArrowRight className="w-4 h-4" />
              </span>
            )}
          </Button>

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="p-4 rounded-lg bg-red-500/10 border border-red-500/30"
              >
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-red-300">Scenario Failed</p>
                    <p className="text-xs text-red-400/80 mt-1">{error}</p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </Card>

      {/* Results */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="space-y-4"
          >
            {/* Results Header */}
            <Card className="overflow-hidden border-slate-700 bg-slate-900/80 backdrop-blur-xl">
              <div className="px-6 py-4 border-b border-slate-700/60 bg-gradient-to-r from-purple-500/10 via-pink-500/8 to-amber-500/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 shadow-lg shadow-purple-500/20">
                      <BarChart3 className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h4 className="text-lg font-semibold text-white">Scenario Results</h4>
                      <p className="text-xs text-slate-400">
                        {effectiveChange > 0 ? '+' : ''}{effectiveChange}% impact on <span className="text-slate-200 font-medium">{selectedEntityLabel}</span>
                      </p>
                    </div>
                  </div>
                  <Badge className="bg-slate-700/50 text-slate-300 border-slate-600 text-xs">
                    {new Date(result.generatedAt).toLocaleTimeString()}
                  </Badge>
                </div>
              </div>

              <div className="p-6">
                {/* Key Metrics Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  {/* Total Impacts */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1 }}
                    className="p-5 rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/25"
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <Target className="w-4 h-4 text-blue-400" />
                      <p className="text-xs font-medium text-slate-300 uppercase tracking-wide">Total Impacts</p>
                    </div>
                    <div className="flex items-baseline gap-3">
                      <p className="text-3xl font-bold text-white tabular-nums">
                        {result.comparison.totalImpacts.simulated}
                      </p>
                      {result.comparison.totalImpacts.change !== 0 && (
                        <Badge className={cn(
                          "text-xs font-semibold",
                          result.comparison.totalImpacts.change > 0
                            ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                            : "bg-red-500/15 text-red-300 border-red-500/30"
                        )}>
                          {result.comparison.totalImpacts.change > 0 ? '+' : ''}{result.comparison.totalImpacts.change}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-2 text-xs text-slate-400">
                      <span>Was: {result.comparison.totalImpacts.current}</span>
                      <ChevronRight className="w-3 h-3" />
                      <span>Now: {result.comparison.totalImpacts.simulated}</span>
                    </div>
                  </motion.div>

                  {/* Jobs */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2 }}
                    className="p-5 rounded-xl bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border border-emerald-500/25"
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <Users className="w-4 h-4 text-emerald-400" />
                      <p className="text-xs font-medium text-slate-300 uppercase tracking-wide">Jobs Affected</p>
                    </div>
                    <div className="flex items-baseline gap-3">
                      <p className="text-3xl font-bold text-white tabular-nums">
                        {result.comparison.quantitative.jobs.simulated.toLocaleString()}
                      </p>
                      {result.comparison.quantitative.jobs.change !== 0 && (
                        <Badge className={cn(
                          "text-xs font-semibold",
                          result.comparison.quantitative.jobs.change > 0
                            ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                            : "bg-red-500/15 text-red-300 border-red-500/30"
                        )}>
                          {result.comparison.quantitative.jobs.change > 0 ? '+' : ''}{result.comparison.quantitative.jobs.change.toLocaleString()}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-2 text-xs text-slate-400">
                      <span>{result.comparison.quantitative.jobs.changePercent}% change</span>
                      <span className="text-slate-600">|</span>
                      <span>From {result.comparison.quantitative.jobs.current.toLocaleString()}</span>
                    </div>
                  </motion.div>

                  {/* Funding */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3 }}
                    className="p-5 rounded-xl bg-gradient-to-br from-amber-500/10 to-amber-600/5 border border-amber-500/25"
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <DollarSign className="w-4 h-4 text-amber-400" />
                      <p className="text-xs font-medium text-slate-300 uppercase tracking-wide">Funding Impact</p>
                    </div>
                    <div className="flex items-baseline gap-3">
                      <p className="text-3xl font-bold text-white tabular-nums">
                        ${Math.abs(result.comparison.quantitative.funding.simulated / 1000000).toFixed(1)}M
                      </p>
                      {result.comparison.quantitative.funding.change !== 0 && (
                        <Badge className={cn(
                          "text-xs font-semibold",
                          result.comparison.quantitative.funding.change > 0
                            ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                            : "bg-red-500/15 text-red-300 border-red-500/30"
                        )}>
                          {result.comparison.quantitative.funding.changePercent}%
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-2 text-xs text-slate-400">
                      <span>Net change: ${(result.comparison.quantitative.funding.change / 1000000).toFixed(1)}M</span>
                    </div>
                  </motion.div>
                </div>

                {/* Severity Breakdown */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35 }}
                  className="p-5 rounded-xl bg-slate-800/40 border border-slate-700/50 mb-6"
                >
                  <h5 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-slate-400" />
                    Impact Severity Breakdown
                  </h5>
                  <div className="space-y-3">
                    {(['high', 'medium', 'low'] as const).map((sev) => {
                      const data = result.comparison.bySeverity[sev];
                      const maxVal = Math.max(
                        result.comparison.bySeverity.high.simulated,
                        result.comparison.bySeverity.medium.simulated,
                        result.comparison.bySeverity.low.simulated,
                        1
                      );
                      const barWidth = (data.simulated / maxVal) * 100;
                      const colors = {
                        high: { bg: 'bg-red-500/20', bar: 'bg-red-500', text: 'text-red-300', label: 'text-red-400' },
                        medium: { bg: 'bg-amber-500/20', bar: 'bg-amber-500', text: 'text-amber-300', label: 'text-amber-400' },
                        low: { bg: 'bg-blue-500/20', bar: 'bg-blue-500', text: 'text-blue-300', label: 'text-blue-400' },
                      };
                      const c = colors[sev];

                      return (
                        <div key={sev} className="flex items-center gap-3">
                          <span className={cn("text-xs font-semibold uppercase w-16 text-right", c.label)}>
                            {sev}
                          </span>
                          <div className={cn("flex-1 h-7 rounded-lg overflow-hidden relative", c.bg)}>
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${barWidth}%` }}
                              transition={{ duration: 0.6, delay: 0.4 }}
                              className={cn("h-full rounded-lg", c.bar)}
                            />
                            <span className="absolute inset-y-0 right-3 flex items-center text-xs font-medium text-white">
                              {data.simulated}
                            </span>
                          </div>
                          {data.change !== 0 && (
                            <Badge className={cn(
                              "text-[10px] w-12 justify-center",
                              data.change > 0 ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                                : data.change < 0 ? "bg-red-500/15 text-red-300 border-red-500/30"
                                : "bg-slate-500/15 text-slate-300 border-slate-500/30"
                            )}>
                              {data.change > 0 ? '+' : ''}{data.change}
                            </Badge>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </motion.div>

                {/* Scenario Narrative */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="p-5 rounded-xl bg-gradient-to-br from-blue-500/5 via-purple-500/5 to-cyan-500/5 border border-slate-700/50 mb-6"
                >
                  <h5 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                    <Lightbulb className="w-4 h-4 text-amber-400" />
                    Scenario Analysis
                  </h5>
                  <div className="space-y-3 text-sm text-slate-300 leading-relaxed">
                    <p>
                      A <span className={cn("font-semibold", effectiveChange > 0 ? "text-emerald-400" : "text-red-400")}>
                        {Math.abs(effectiveChange)}% {effectiveChange > 0 ? 'increase' : 'decrease'}
                      </span> in <span className="font-semibold text-white">{selectedEntityLabel}</span>
                      {policy && policy !== 'general' ? <> under the <span className="font-semibold text-purple-300">{policy}</span> policy</> : ''}
                      {' '}would result in{' '}
                      <span className="font-semibold text-white">
                        {result.comparison.totalImpacts.simulated} total impacts
                      </span>
                      {' '}({result.comparison.totalImpacts.change > 0 ? 'up' : 'down'} from {result.comparison.totalImpacts.current}).
                    </p>
                    <p>
                      This would affect approximately{' '}
                      <span className="font-semibold text-emerald-300">
                        {result.comparison.quantitative.jobs.simulated.toLocaleString()} jobs
                      </span>
                      {result.comparison.quantitative.jobs.change !== 0 && (
                        <> ({result.comparison.quantitative.jobs.change > 0 ? 'creating' : 'reducing by'}{' '}
                        <span className={cn("font-semibold", result.comparison.quantitative.jobs.change > 0 ? "text-emerald-300" : "text-red-300")}>
                          {Math.abs(result.comparison.quantitative.jobs.change).toLocaleString()}
                        </span> positions)</>
                      )}
                      {' '}and shift funding by{' '}
                      <span className="font-semibold text-amber-300">
                        ${Math.abs(result.comparison.quantitative.funding.change / 1000000).toFixed(1)}M
                      </span>
                      {' '}({result.comparison.quantitative.funding.changePercent}%).
                    </p>
                    {result.comparison.bySeverity.high.change !== 0 && (
                      <p>
                        Notably, high-severity impacts would{' '}
                        <span className={cn("font-semibold", result.comparison.bySeverity.high.change > 0 ? "text-red-300" : "text-emerald-300")}>
                          {result.comparison.bySeverity.high.change > 0 ? 'increase' : 'decrease'} by {Math.abs(result.comparison.bySeverity.high.change)}
                        </span>, which {result.comparison.bySeverity.high.change > 0
                          ? 'warrants close monitoring and risk mitigation strategies'
                          : 'indicates improved stability in the affected areas'
                        }.
                      </p>
                    )}
                  </div>
                </motion.div>

                {/* Recommendations */}
                {result.recommendations && result.recommendations.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                  >
                    <h5 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                      <Shield className="w-4 h-4 text-amber-400" />
                      Strategic Recommendations
                    </h5>
                    <div className="space-y-3">
                      {result.recommendations.map((rec, idx) => (
                        <motion.div
                          key={idx}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.65 + idx * 0.1 }}
                          className={cn(
                            "p-4 rounded-xl border",
                            rec.severity === 'high'
                              ? "bg-red-500/8 border-red-500/25"
                              : rec.severity === 'medium'
                              ? "bg-amber-500/8 border-amber-500/25"
                              : "bg-blue-500/8 border-blue-500/25"
                          )}
                        >
                          <div className="flex items-start gap-3">
                            <div className={cn(
                              "mt-0.5 p-1.5 rounded-lg",
                              rec.severity === 'high' ? "bg-red-500/20" :
                              rec.severity === 'medium' ? "bg-amber-500/20" : "bg-blue-500/20"
                            )}>
                              {rec.severity === 'high' ? <AlertTriangle className="w-3.5 h-3.5 text-red-400" /> :
                               rec.severity === 'medium' ? <Lightbulb className="w-3.5 h-3.5 text-amber-400" /> :
                               <Target className="w-3.5 h-3.5 text-blue-400" />}
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-medium text-white">{rec.message}</p>
                              <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
                                <ArrowRight className="w-3 h-3 text-slate-500" />
                                {rec.action}
                              </p>
                            </div>
                            <Badge className={cn(
                              "text-[10px] uppercase shrink-0",
                              rec.severity === 'high' ? "bg-red-500/15 text-red-300 border-red-500/30" :
                              rec.severity === 'medium' ? "bg-amber-500/15 text-amber-300 border-amber-500/30" :
                              "bg-blue-500/15 text-blue-300 border-blue-500/30"
                            )}>
                              {rec.severity}
                            </Badge>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
