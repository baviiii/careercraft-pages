// /admin/usage/:userId — one account's AI spend, allowances and history.
//
// Everything needed to answer "what did this person do, what did it cost,
// and why are they on the plan they're on" without leaving the page — and to
// change it: plan, daily token budget, and per-feature overrides.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, RefreshCw, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { TokensByDayChart } from '@/components/admin/usage/TokensByDayChart';
import { CallLog } from '@/components/admin/usage/CallLog';
import { AuditLogTable } from '@/components/admin/usage/AuditLogTable';
import { BudgetMeter, PlanBadge, StatTile } from '@/components/admin/usage/UsageBits';
import { formatDay, formatWhen, relativeTime } from '@/components/admin/usage/usageHelpers';
import { parseLimit } from '@/hooks/usePlansAdmin';
import {
  RANGE_OPTIONS,
  budgetTone,
  fetchUserUsage,
  formatTokens,
  formatTokensExact,
  formatUsd,
  rangeFor,
  resourceLabel,
  setDailyTokenOverride,
  taskLabel,
  type RangeKey,
  type UserUsageDetail as Detail,
} from '@/lib/aiUsage';
import { formatResetsIn, isUnlimited, usageLabel, usagePercent } from '@/lib/quota';

interface PlanOption {
  key: string;
  name: string;
}

function planAllowance(limit: number | null): string {
  return isUnlimited(limit) ? 'no monthly cap' : `${limit} a month`;
}

export default function UserUsageDetail() {
  const { userId = '' } = useParams<{ userId: string }>();
  const [rangeKey, setRangeKey] = useState<RangeKey>('30d');
  const [now, setNow] = useState(() => new Date());
  const range = useMemo(() => rangeFor(rangeKey, now), [rangeKey, now]);
  const [detail, setDetail] = useState<Detail | null | undefined>(undefined);
  const [plans, setPlans] = useState<PlanOption[]>([]);
  const [reloadKey, setReloadKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [planDraft, setPlanDraft] = useState('');
  const [planNote, setPlanNote] = useState('');
  const [budgetDraft, setBudgetDraft] = useState('');
  const [override, setOverride] = useState({ resource: '', monthly: '', hourly: '', enabled: 'inherit', expires: '', reason: '' });

  // Only the latest load may write (quick range switches overlap).
  const ticket = useRef(0);

  const load = useCallback(async () => {
    const mine = ++ticket.current;
    setLoading(true);
    try {
      const d = await fetchUserUsage(userId, range);
      if (mine !== ticket.current) return;
      setDetail(d);
      setPlanDraft(d?.subscription?.plan_key ?? '');
      const ov = d?.subscription?.daily_token_ceiling_override;
      setBudgetDraft(ov ? String(ov) : '');
    } catch (err) {
      if (mine !== ticket.current) return;
      console.error('Error loading user usage:', err);
      toast.error('Failed to load this user');
      setDetail(null);
    } finally {
      if (mine === ticket.current) setLoading(false);
    }
  }, [userId, range]);

  useEffect(() => {
    void load();
  }, [load, reloadKey]);

  useEffect(() => {
    supabase
      .from('plans')
      .select('key,name')
      .order('sort_order')
      .then(({ data }) => setPlans((data ?? []) as PlanOption[]));
  }, []);

  const refresh = () => {
    setNow(new Date());
    setReloadKey((k) => k + 1);
  };

  const run = async (label: string, fn: () => Promise<{ error: unknown } | void>) => {
    setSaving(true);
    try {
      const res = await fn();
      if (res && res.error) throw res.error;
      toast.success(label);
      refresh();
    } catch (err) {
      console.error(`${label} failed:`, err);
      // PostgrestError carries a message but isn't always an Error instance.
      const message = (err as { message?: string } | null)?.message;
      toast.error(message ? `${label} failed: ${message}` : `${label} failed`);
    } finally {
      setSaving(false);
    }
  };

  const savePlan = () =>
    run('Plan updated', async () =>
      supabase.rpc('admin_set_user_plan', {
        p_user_id: userId,
        p_plan_key: planDraft,
        p_note: planNote.trim() || null,
      }).then((r) => {
        if (!r.error) setPlanNote('');
        return r;
      }),
    );

  const saveBudget = (ceiling: number | null) =>
    run(ceiling === null ? 'Daily budget back to the plan’s' : 'Daily budget updated', () =>
      setDailyTokenOverride(userId, ceiling),
    );

  const saveOverride = () => {
    if (!override.resource) {
      toast.error('Pick a feature');
      return;
    }
    return run('Override saved', async () =>
      supabase.rpc('admin_set_limit_override', {
        p_user_id: userId,
        p_resource: override.resource,
        p_is_enabled: override.enabled === 'inherit' ? null : override.enabled === 'on',
        p_monthly_limit: parseLimit(override.monthly),
        p_hourly_limit: parseLimit(override.hourly),
        p_expires_at: override.expires ? new Date(`${override.expires}T23:59:59`).toISOString() : null,
        p_reason: override.reason.trim() || null,
      }).then((r) => {
        if (!r.error) setOverride({ resource: '', monthly: '', hourly: '', enabled: 'inherit', expires: '', reason: '' });
        return r;
      }),
    );
  };

  const removeOverride = (resource: string) =>
    run('Override removed', async () =>
      supabase.rpc('admin_remove_limit_override', { p_user_id: userId, p_resource: resource }),
    );

  if (detail === null) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" asChild>
          <Link to="/admin/usage">
            <ArrowLeft className="mr-2 h-4 w-4" />
            AI Usage
          </Link>
        </Button>
        <p className="text-muted-foreground">That account doesn&rsquo;t exist, or couldn&rsquo;t be loaded.</p>
      </div>
    );
  }

  const u = detail?.user;
  const sub = detail?.subscription;
  const resources = detail?.plan_usage?.resources ?? [];
  const overrideFor = new Map((detail?.overrides ?? []).map((o) => [o.resource, o]));
  const dailyOverride = sub?.daily_token_ceiling_override ?? null;

  // Saving replaces the feature's whole override, so start from what is there
  // now. A blank form over an existing "switched off" override would quietly
  // switch the feature back on.
  const pickOverrideFeature = (resource: string) => {
    const existing = overrideFor.get(resource);
    const asText = (n: number | null) => (n === null ? '' : n === -1 ? 'unlimited' : String(n));
    setOverride({
      resource,
      monthly: asText(existing?.monthly_limit ?? null),
      hourly: asText(existing?.hourly_limit ?? null),
      enabled: existing?.is_enabled === true ? 'on' : existing?.is_enabled === false ? 'off' : 'inherit',
      expires: existing?.expires_at ? existing.expires_at.slice(0, 10) : '',
      reason: existing?.reason ?? '',
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <Button variant="ghost" size="sm" className="-ml-2" asChild>
            <Link to="/admin/usage">
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              AI Usage
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">{u?.full_name || u?.email || 'Loading…'}</h1>
          {u && (
            <p className="text-sm text-muted-foreground">
              {u.email} · joined {formatDay(u.signed_up_at)} · last signed in {relativeTime(u.last_sign_in_at)}
              {u.roles.includes('admin') && <Badge className="ml-2">admin</Badge>}
            </p>
          )}
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

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile
          label="Tokens"
          value={formatTokens(detail?.totals.tokens)}
          detail={detail ? `${formatTokens(detail.totals.prompt_tokens)} in · ${formatTokens(detail.totals.completion_tokens)} out` : undefined}
        />
        <StatTile label="Estimated cost" value={formatUsd(detail?.totals.cost_usd)} detail="US$" />
        <StatTile
          label="Actions"
          value={formatTokensExact(detail?.totals.requests)}
          detail={
            detail
              ? `${detail.totals.calls} calls · ${detail.totals.retries} retries · ${detail.totals.errors} failed`
              : undefined
          }
        />
        <StatTile
          label="Lifetime"
          value={formatUsd(detail?.lifetime.cost_usd)}
          detail={
            detail
              ? `${formatTokens(detail.lifetime.tokens)} tokens since ${formatDay(detail.lifetime.first_call_at)}`
              : undefined
          }
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-lg">Plan</CardTitle>
            {/* A div, not CardDescription's <p>: the badge renders a <div>. */}
            <div className="text-sm text-muted-foreground">
              {sub ? (
                <>
                  <PlanBadge planKey={sub.plan_key} source={sub.source} /> · {sub.status}
                  {sub.granted_by_email && <> · set by {sub.granted_by_email}</>}
                  {sub.grant_note && <> · &ldquo;{sub.grant_note}&rdquo;</>}
                </>
              ) : (
                'No subscription row'
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap items-end gap-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Move to</Label>
                <Select value={planDraft} onValueChange={setPlanDraft}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Plan" />
                  </SelectTrigger>
                  <SelectContent>
                    {plans.map((p) => (
                      <SelectItem key={p.key} value={p.key}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="min-w-48 flex-1 space-y-1.5">
                <Label className="text-xs">Why (kept in the history)</Label>
                <Input value={planNote} onChange={(e) => setPlanNote(e.target.value)} placeholder="e.g. uni pilot" />
              </div>
              <Button onClick={savePlan} disabled={saving || !planDraft || planDraft === sub?.plan_key}>
                Save plan
              </Button>
            </div>
            {dailyOverride && (
              <p className="text-xs text-muted-foreground">
                Their custom daily budget ({formatTokensExact(dailyOverride)} tokens) stays after a plan change
                and still wins over the new plan&rsquo;s. Use &ldquo;Use plan&rsquo;s&rdquo; on the budget card to drop it.
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-lg">Today&rsquo;s AI budget</CardTitle>
            <CardDescription>
              {dailyOverride
                ? `Custom budget of ${formatTokensExact(dailyOverride)} a day`
                : 'Using the plan’s daily budget'}
              {detail?.daily.resets_at && <> · refills {formatResetsIn(detail.daily.resets_at)}</>}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {detail && <BudgetMeter used={detail.daily.used} limit={detail.daily.limit} />}
            <div className="flex flex-wrap items-end gap-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Daily tokens for this user</Label>
                <Input
                  inputMode="numeric"
                  value={budgetDraft}
                  onChange={(e) => setBudgetDraft(e.target.value.replace(/[^\d]/g, ''))}
                  placeholder="plan default"
                  className="w-40"
                />
              </div>
              <Button
                onClick={() => saveBudget(Number(budgetDraft))}
                disabled={saving || !budgetDraft || Number(budgetDraft) <= 0 || Number(budgetDraft) === dailyOverride}
              >
                Set budget
              </Button>
              {dailyOverride && (
                <Button variant="outline" onClick={() => saveBudget(null)} disabled={saving}>
                  Use plan&rsquo;s
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-lg">Tokens per day, by feature</CardTitle>
        </CardHeader>
        <CardContent>
          <TokensByDayChart rows={detail?.by_day ?? []} range={range} height={220} />
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-lg">This month&rsquo;s allowances</CardTitle>
            <CardDescription>
              Per-feature counts on the {detail?.plan_usage?.plan_key ?? '—'} plan. Overridden ones are marked.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <ul className="space-y-3">
              {resources.map((r) => {
                const ov = overrideFor.get(r.resource);
                const p = usagePercent(r.monthly_used, r.monthly_limit);
                return (
                  <li key={r.resource} className="space-y-1">
                    <div className="flex items-baseline justify-between gap-3 text-sm">
                      <span className={r.is_enabled ? '' : 'text-muted-foreground line-through'}>
                        {r.label}
                        {ov && (
                          <Badge variant="secondary" className="ml-2 gap-1">
                            override
                            <button
                              type="button"
                              aria-label={`Remove override for ${r.label}`}
                              onClick={() => removeOverride(r.resource)}
                              className="opacity-60 hover:opacity-100"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </Badge>
                        )}
                      </span>
                      <span className="tabular-nums text-muted-foreground">
                        {usageLabel(r.monthly_used, r.monthly_limit)}
                        {r.hourly_limit !== null && r.hourly_limit >= 0 && ` · ${r.hourly_used}/${r.hourly_limit} this hour`}
                      </span>
                    </div>
                    {!isUnlimited(r.monthly_limit) && (
                      <div className="usage-viz">
                        <div
                          className="usage-meter"
                          data-tone={budgetTone(p)}
                          role="progressbar"
                          aria-valuenow={p}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-label={`${r.label} this month`}
                        >
                          <span style={{ width: `${p}%` }} />
                        </div>
                      </div>
                    )}
                    {ov?.reason && (
                      <p className="text-xs text-muted-foreground">
                        &ldquo;{ov.reason}&rdquo;
                        {ov.granted_by_email && ` — ${ov.granted_by_email}`}
                        {ov.expires_at && ` · until ${formatDay(ov.expires_at)}`}
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>

            <div className="space-y-3 rounded-md border border-border/50 p-4">
              <p className="text-sm font-medium">Override a feature for this user</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">Feature</Label>
                  <Select value={override.resource} onValueChange={pickOverrideFeature}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pick a feature" />
                    </SelectTrigger>
                    <SelectContent>
                      {resources.map((r) => (
                        <SelectItem key={r.resource} value={r.resource}>
                          {r.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Available</Label>
                  <Select value={override.enabled} onValueChange={(v) => setOverride({ ...override, enabled: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="inherit">As the plan says</SelectItem>
                      <SelectItem value="on">Always on</SelectItem>
                      <SelectItem value="off">Switched off</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Per month</Label>
                  <Input
                    value={override.monthly}
                    onChange={(e) => setOverride({ ...override, monthly: e.target.value })}
                    placeholder="inherit, a number, or unlimited"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Per hour</Label>
                  <Input
                    value={override.hourly}
                    onChange={(e) => setOverride({ ...override, hourly: e.target.value })}
                    placeholder="inherit, a number, or unlimited"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Expires (optional)</Label>
                  <Input
                    type="date"
                    value={override.expires}
                    onChange={(e) => setOverride({ ...override, expires: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Reason</Label>
                  <Input
                    value={override.reason}
                    onChange={(e) => setOverride({ ...override, reason: e.target.value })}
                    placeholder="e.g. support ticket"
                  />
                </div>
              </div>
              {override.resource && (
                <p className="text-xs text-muted-foreground">
                  Currently {planAllowance(resources.find((r) => r.resource === override.resource)?.monthly_limit ?? null)}.
                  {overrideFor.has(override.resource)
                    ? ' Showing the existing override; saving replaces it.'
                    : ' Leave a field blank to keep what the plan says.'}
                </p>
              )}
              <Button size="sm" onClick={saveOverride} disabled={saving}>
                Save override
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-lg">What they ran</CardTitle>
            <CardDescription>Each kind of model call in this period</CardDescription>
          </CardHeader>
          <CardContent className="usage-scroll">
            <Table>
              <TableHeader>
                <TableRow className="border-border/50">
                  <TableHead>Task</TableHead>
                  <TableHead className="text-right">Calls</TableHead>
                  <TableHead className="text-right">Tokens</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                  <TableHead className="text-right">Retries</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(detail?.by_task ?? []).map((t) => (
                  <TableRow key={`${t.resource}|${t.task}`} className="border-border/50">
                    <TableCell>
                      <span className="block text-sm">{taskLabel(t.task)}</span>
                      <span className="text-[11px] text-muted-foreground">{resourceLabel(t.resource)}</span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{t.calls}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatTokens(t.tokens)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatUsd(t.cost_usd)}</TableCell>
                    <TableCell className="text-right tabular-nums">{t.retries || '—'}</TableCell>
                  </TableRow>
                ))}
                {!detail?.by_task.length && (
                  <TableRow>
                    <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                      {loading ? 'Loading…' : 'No AI calls in this period.'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-lg">Call log</CardTitle>
          <CardDescription>Every action, and every model call behind it</CardDescription>
        </CardHeader>
        <CardContent>
          <CallLog
            range={range}
            userId={userId}
            resources={resources.map((r) => r.resource)}
            reloadKey={reloadKey}
          />
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-lg">Plan history</CardTitle>
          </CardHeader>
          <CardContent className="usage-scroll">
            <Table>
              <TableHeader>
                <TableRow className="border-border/50">
                  <TableHead>When</TableHead>
                  <TableHead>Change</TableHead>
                  <TableHead>By</TableHead>
                  <TableHead>Note</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(detail?.events ?? []).map((e) => (
                  <TableRow key={e.id} className="border-border/50">
                    <TableCell className="whitespace-nowrap text-sm">{formatWhen(e.created_at)}</TableCell>
                    <TableCell className="text-sm">
                      {e.from_plan_key ?? '—'} → <strong>{e.to_plan_key}</strong>
                      <span className="ml-1.5 text-xs text-muted-foreground">{e.source.replace('_', ' ')}</span>
                    </TableCell>
                    <TableCell className="text-sm">{e.actor_email ?? 'system'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{e.note ?? '—'}</TableCell>
                  </TableRow>
                ))}
                {!detail?.events.length && (
                  <TableRow>
                    <TableCell colSpan={4} className="py-6 text-center text-muted-foreground">
                      Never changed plan.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            {!!detail?.upgrade_requests.length && (
              <div className="mt-4 space-y-1 text-sm">
                <p className="font-medium">Asked for more</p>
                {detail.upgrade_requests.map((q) => (
                  <p key={q.id} className="text-muted-foreground">
                    {formatWhen(q.created_at)} · on {q.from_plan_key ?? '—'}
                    {q.resource && ` · ran out of ${resourceLabel(q.resource)}`}
                    {q.note && ` · “${q.note}”`}
                  </p>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-lg">Admin changes to this account</CardTitle>
          </CardHeader>
          <CardContent>
            <AuditLogTable userId={userId} reloadKey={reloadKey} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
