// /admin/usage — what AI is costing, who is spending it, and on what.
//
// Reads token_usage_ledger through the admin RPCs in
// 20261104000000_ai_usage_audit.sql. Costs are estimates from model_prices.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, RefreshCw, Search } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TokensByDayChart } from '@/components/admin/usage/TokensByDayChart';
import { CallLog } from '@/components/admin/usage/CallLog';
import { AuditLogTable } from '@/components/admin/usage/AuditLogTable';
import { ModelPricesEditor } from '@/components/admin/usage/ModelPricesEditor';
import { BudgetMeter, PlanBadge, StatTile } from '@/components/admin/usage/UsageBits';
import { relativeTime, seriesColor, seriesKey } from '@/components/admin/usage/usageHelpers';
import {
  RANGE_OPTIONS,
  downloadCsv,
  fetchUsageByUser,
  fetchUsageOverview,
  fileDate,
  formatTokens,
  formatTokensExact,
  formatUsd,
  rangeFor,
  resourceLabel,
  taskLabel,
  toCsv,
  type RangeKey,
  type UsageOverview,
  type UserUsageRow,
} from '@/lib/aiUsage';

type UserSort = 'tokens' | 'cost' | 'recent' | 'today';

const TASKS_SHOWN = 12;

const pct = (part: number, whole: number) => (whole > 0 ? `${Math.round((part / whole) * 100)}%` : '—');

export default function AiUsage() {
  const navigate = useNavigate();
  const [rangeKey, setRangeKey] = useState<RangeKey>('30d');
  const [overview, setOverview] = useState<UsageOverview | null>(null);
  const [users, setUsers] = useState<UserUsageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<UserSort>('tokens');
  const [allTasks, setAllTasks] = useState(false);

  // Re-stamped on Refresh so "today" keeps meaning today in a tab left open.
  const [now, setNow] = useState(() => new Date());
  const range = useMemo(() => rangeFor(rangeKey, now), [rangeKey, now]);
  const refresh = () => {
    setNow(new Date());
    setReloadKey((k) => k + 1);
  };

  // Switching range quickly fires overlapping loads; only the latest may write.
  const ticket = useRef(0);

  const load = useCallback(async () => {
    const mine = ++ticket.current;
    setLoading(true);
    try {
      const [o, u] = await Promise.all([fetchUsageOverview(range), fetchUsageByUser(range)]);
      if (mine !== ticket.current) return;
      setOverview(o);
      setUsers(u);
    } catch (err) {
      if (mine !== ticket.current) return;
      console.error('Error loading AI usage:', err);
      toast.error('Failed to load AI usage');
    } finally {
      if (mine === ticket.current) setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    void load();
  }, [load]);

  const totals = overview?.totals;
  const resources = useMemo(() => (overview?.by_resource ?? []).map((r) => r.resource), [overview]);

  const shownUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = q
      ? users.filter((u) => u.email?.toLowerCase().includes(q) || u.full_name?.toLowerCase().includes(q))
      : users;
    const sorted = [...filtered];
    sorted.sort((a, b) => {
      switch (sort) {
        case 'cost':
          return Number(b.cost_usd) - Number(a.cost_usd);
        case 'recent':
          return (b.last_call_at ?? '').localeCompare(a.last_call_at ?? '');
        case 'today':
          return b.tokens_today - a.tokens_today;
        default:
          return b.tokens - a.tokens;
      }
    });
    return sorted;
  }, [users, search, sort]);

  const activeUsers = users.filter((u) => u.calls > 0).length;
  const rangeLabel = RANGE_OPTIONS.find((r) => r.key === rangeKey)?.label.toLowerCase() ?? '';

  const exportUsers = () => {
    downloadCsv(
      `ai-usage-by-user-${rangeKey}-${fileDate()}.csv`,
      toCsv(shownUsers, [
        { header: 'user_id', value: (u) => u.user_id },
        { header: 'email', value: (u) => u.email },
        { header: 'name', value: (u) => u.full_name },
        { header: 'role', value: (u) => u.role },
        { header: 'plan', value: (u) => u.plan_key },
        { header: 'plan_source', value: (u) => u.plan_source },
        { header: 'tokens', value: (u) => u.tokens },
        { header: 'prompt_tokens', value: (u) => u.prompt_tokens },
        { header: 'completion_tokens', value: (u) => u.completion_tokens },
        { header: 'est_cost_usd', value: (u) => Number(u.cost_usd).toFixed(4) },
        { header: 'requests', value: (u) => u.requests },
        { header: 'calls', value: (u) => u.calls },
        { header: 'retries', value: (u) => u.retries },
        { header: 'errors', value: (u) => u.errors },
        { header: 'top_feature', value: (u) => u.top_resource },
        { header: 'tokens_today', value: (u) => u.tokens_today },
        { header: 'daily_limit', value: (u) => u.daily_limit },
        { header: 'last_call_utc', value: (u) => u.last_call_at },
        { header: 'signed_up_utc', value: (u) => u.signed_up_at },
      ]),
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">AI Usage</h1>
          <p className="text-muted-foreground">
            Every model call: who made it, what it was for, and what it cost
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={rangeKey} onValueChange={(v) => setRangeKey(v as RangeKey)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RANGE_OPTIONS.map((r) => (
                <SelectItem key={r.key} value={r.key}>
                  {r.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={refresh} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="calls">Call log</TabsTrigger>
          <TabsTrigger value="changes">Change log</TabsTrigger>
          <TabsTrigger value="prices">Prices</TabsTrigger>
        </TabsList>

        {/* ── Overview ─────────────────────────────────────────────────── */}
        <TabsContent value="overview" className="mt-6 space-y-6">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 xl:grid-cols-6">
            <StatTile
              label="Tokens"
              value={formatTokens(totals?.tokens)}
              detail={totals ? `${formatTokens(totals.prompt_tokens)} in · ${formatTokens(totals.completion_tokens)} out` : undefined}
            />
            <StatTile label="Estimated cost" value={formatUsd(totals?.cost_usd)} detail="US$, from the Prices tab" />
            <StatTile
              label="User actions"
              value={formatTokensExact(totals?.requests)}
              detail={totals ? `${formatTokensExact(totals.calls)} model calls` : undefined}
            />
            <StatTile
              label="Active users"
              value={formatTokensExact(activeUsers)}
              detail={`of ${users.length} accounts`}
            />
            <StatTile
              label="Retries"
              value={formatTokensExact(totals?.retries)}
              detail={totals ? `${formatTokens(totals.retry_tokens)} tokens, ${pct(totals.retry_tokens, totals.tokens)} of spend` : undefined}
            />
            <StatTile
              label="Failed calls"
              value={formatTokensExact(totals?.errors)}
              detail={totals ? `${pct(totals.errors, totals.calls)} of calls` : undefined}
            />
          </div>

          {totals && totals.unattributed_calls > 0 && (
            <Card className="border-border/50">
              <CardContent className="p-4 text-sm text-muted-foreground">
                <strong className="text-foreground">
                  {formatTokensExact(totals.unattributed_calls)} calls ({formatTokens(totals.unattributed_tokens)} tokens,{' '}
                  {formatUsd(totals.unattributed_cost_usd)})
                </strong>{' '}
                had no signed-in user: test scripts using the coach&rsquo;s shared secret, guest résumé imports, and
                system pings. They count toward cost but toward nobody&rsquo;s budget. See them in the Call log under
                &ldquo;No user&rdquo;.
              </CardContent>
            </Card>
          )}

          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-lg">Tokens per day, by feature</CardTitle>
              <CardDescription>
                Days in {overview?.timezone ?? 'your time zone'}. Budgets themselves reset at midnight UTC.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TokensByDayChart rows={overview?.by_day ?? []} range={range} />
            </CardContent>
          </Card>

          <div className="grid gap-6 xl:grid-cols-2">
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="text-lg">By feature</CardTitle>
              </CardHeader>
              <CardContent className="usage-scroll">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/50">
                      <TableHead>Feature</TableHead>
                      <TableHead className="text-right">Tokens</TableHead>
                      <TableHead className="text-right">Cost</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                      <TableHead className="text-right">Users</TableHead>
                      <TableHead className="text-right">Retries</TableHead>
                      <TableHead className="text-right">Failed</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(overview?.by_resource ?? []).map((r) => (
                      <TableRow key={r.resource} className="border-border/50">
                        <TableCell>
                          <span className="inline-flex items-center gap-2 usage-viz">
                            <span className="usage-swatch" style={{ background: seriesColor(seriesKey(r.resource)) }} />
                            <span className="whitespace-nowrap">
                              <span className="block text-sm">{resourceLabel(r.resource, r.label)}</span>
                              <code className="text-[11px] text-muted-foreground">{r.resource}</code>
                            </span>
                          </span>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatTokens(r.tokens)}
                          <span className="ml-1 text-xs text-muted-foreground">{pct(r.tokens, totals?.tokens ?? 0)}</span>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{formatUsd(r.cost_usd)}</TableCell>
                        <TableCell className="text-right tabular-nums">{r.requests}</TableCell>
                        <TableCell className="text-right tabular-nums">{r.users}</TableCell>
                        <TableCell className="text-right tabular-nums">{r.retries || '—'}</TableCell>
                        <TableCell className="text-right tabular-nums">{r.errors || '—'}</TableCell>
                      </TableRow>
                    ))}
                    {!overview?.by_resource.length && (
                      <TableRow>
                        <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                          {loading ? 'Loading…' : 'No AI calls in this period.'}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="text-lg">By model</CardTitle>
                <CardDescription>Which price row each model was costed at</CardDescription>
              </CardHeader>
              <CardContent className="usage-scroll">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/50">
                      <TableHead>Model</TableHead>
                      <TableHead className="text-right">In</TableHead>
                      <TableHead className="text-right">Out</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">Cost</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(overview?.by_model ?? []).map((m) => (
                      <TableRow key={`${m.provider}|${m.model}`} className="border-border/50">
                        <TableCell>
                          <span className="block text-sm">{m.model ?? 'not reported'}</span>
                          <span className="text-[11px] text-muted-foreground">
                            {m.provider} · priced as {m.price_label ?? '—'}
                          </span>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{formatTokens(m.prompt_tokens)}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatTokens(m.completion_tokens)}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatTokens(m.tokens)}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatUsd(m.cost_usd)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 xl:grid-cols-3">
            <Card className="border-border/50 xl:col-span-2">
              <CardHeader>
                <CardTitle className="text-lg">What ran</CardTitle>
                <CardDescription>Each kind of model call, most expensive first</CardDescription>
              </CardHeader>
              <CardContent className="usage-scroll">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/50">
                      <TableHead>Task</TableHead>
                      <TableHead>Feature</TableHead>
                      <TableHead className="text-right">Calls</TableHead>
                      <TableHead className="text-right">Avg tokens</TableHead>
                      <TableHead className="text-right">Tokens</TableHead>
                      <TableHead className="text-right">Cost</TableHead>
                      <TableHead className="text-right">Retries</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(overview?.by_task ?? []).slice(0, allTasks ? undefined : TASKS_SHOWN).map((t) => (
                      <TableRow key={`${t.resource}|${t.task}`} className="border-border/50">
                        <TableCell>
                          <span className="block text-sm">{taskLabel(t.task)}</span>
                          <code className="text-[11px] text-muted-foreground">{t.task ?? '—'}</code>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{resourceLabel(t.resource)}</TableCell>
                        <TableCell className="text-right tabular-nums">{t.calls}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatTokens(t.avg_tokens)}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatTokens(t.tokens)}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatUsd(t.cost_usd)}</TableCell>
                        <TableCell className="text-right tabular-nums">{t.retries || '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {(overview?.by_task.length ?? 0) > TASKS_SHOWN && (
                  <Button variant="ghost" size="sm" className="mt-2" onClick={() => setAllTasks((v) => !v)}>
                    {allTasks ? 'Show fewer' : `Show all ${overview?.by_task.length}`}
                  </Button>
                )}
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="text-lg">By plan</CardTitle>
                <CardDescription>The plan each call was made on</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/50">
                      <TableHead>Plan</TableHead>
                      <TableHead className="text-right">Users</TableHead>
                      <TableHead className="text-right">Tokens</TableHead>
                      <TableHead className="text-right">Cost</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(overview?.by_plan ?? []).map((p) => (
                      <TableRow key={p.plan_key ?? 'none'} className="border-border/50">
                        <TableCell>
                          {p.plan_key ? (
                            <PlanBadge planKey={p.plan_key} />
                          ) : (
                            <span className="text-xs text-muted-foreground">No user</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{p.users || '—'}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatTokens(p.tokens)}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatUsd(p.cost_usd)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── Users ────────────────────────────────────────────────────── */}
        <TabsContent value="users" className="mt-6">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-lg">Spend by user</CardTitle>
              <CardDescription>
                Every account, including ones that spent nothing {rangeLabel}. Click a row for the full audit trail.
              </CardDescription>
              <div className="flex flex-wrap items-center gap-2 pt-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by email or name…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-72 pl-8"
                  />
                </div>
                <Select value={sort} onValueChange={(v) => setSort(v as UserSort)}>
                  <SelectTrigger className="w-44">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tokens">Most tokens</SelectItem>
                    <SelectItem value="cost">Highest cost</SelectItem>
                    <SelectItem value="today">Most used today</SelectItem>
                    <SelectItem value="recent">Most recent</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm" className="ml-auto" onClick={exportUsers}>
                  <Download className="mr-2 h-4 w-4" />
                  Export CSV
                </Button>
              </div>
            </CardHeader>
            <CardContent className="usage-scroll">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/50">
                    <TableHead>User</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead className="text-right">Tokens</TableHead>
                    <TableHead className="text-right">Est. cost</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                    <TableHead>Today&rsquo;s budget</TableHead>
                    <TableHead>Mostly</TableHead>
                    <TableHead>Last AI call</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {shownUsers.map((u) => (
                    <TableRow
                      key={u.user_id}
                      className="cursor-pointer border-border/50"
                      onClick={() => navigate(`/admin/usage/${u.user_id}`)}
                    >
                      <TableCell>
                        <div className="font-medium">{u.full_name || '—'}</div>
                        <div className="text-xs text-muted-foreground">
                          {u.email}
                          {u.role === 'admin' && <span className="ml-1.5 uppercase">· admin</span>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <PlanBadge planKey={u.plan_key} source={u.plan_source} />
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{u.tokens ? formatTokens(u.tokens) : '—'}</TableCell>
                      <TableCell className="text-right tabular-nums">{u.tokens ? formatUsd(u.cost_usd) : '—'}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {u.requests || '—'}
                        {u.errors > 0 && <span className="ml-1 text-xs text-red-600">{u.errors} failed</span>}
                      </TableCell>
                      <TableCell>
                        <BudgetMeter used={u.tokens_today} limit={u.daily_limit} compact />
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {u.top_resource ? resourceLabel(u.top_resource) : '—'}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                        {relativeTime(u.last_call_at)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {shownUsers.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                        {loading ? 'Loading…' : 'No users match that search.'}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Call log ─────────────────────────────────────────────────── */}
        <TabsContent value="calls" className="mt-6">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-lg">Call log</CardTitle>
              <CardDescription>
                One row per user action, {rangeLabel}. Expand a row to see each model call behind it.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CallLog range={range} resources={resources} reloadKey={reloadKey} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Change log ───────────────────────────────────────────────── */}
        <TabsContent value="changes" className="mt-6">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-lg">Change log</CardTitle>
              <CardDescription>
                Every change to plans, limits, prices, user plans, overrides, roles and the admin whitelist,
                including ones made outside this screen
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AuditLogTable reloadKey={reloadKey} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Prices ───────────────────────────────────────────────────── */}
        <TabsContent value="prices" className="mt-6">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-lg">Model prices</CardTitle>
            </CardHeader>
            <CardContent>
              <ModelPricesEditor onChanged={refresh} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
