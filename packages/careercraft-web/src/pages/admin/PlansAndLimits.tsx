import { useMemo, useState } from 'react';
import { RefreshCw, Gauge, Save, Trash2, CreditCard, Users, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  usePlansAdmin,
  formatLimit,
  parseLimit,
  type PlanLimit,
} from '@/hooks/usePlansAdmin';
import { useAdminData } from '@/hooks/useAdminData';
import { toast } from 'sonner';

/**
 * A limit cell that edits in place. Kept uncontrolled-on-blur rather than
 * saving per keystroke: every edit is a network write, and "3" on the way to
 * "30" would otherwise be persisted as a real limit.
 */
function LimitCell({
  value,
  onSave,
  disabled,
}: {
  value: number | null;
  onSave: (next: number | null) => void;
  disabled?: boolean;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const shown = draft ?? formatLimit(value);

  return (
    <Input
      value={shown}
      disabled={disabled}
      className="h-8 w-24 text-sm"
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        if (draft === null) return;
        const parsed = parseLimit(draft);
        setDraft(null);
        if (parsed !== value) onSave(parsed);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
        if (e.key === 'Escape') setDraft(null);
      }}
    />
  );
}

export default function PlansAndLimits() {
  const {
    plans, limits, subscriptions, overrides,
    loading, saving, fetchAll,
    updatePlan, updateLimit, setUserPlan, removeOverride,
  } = usePlansAdmin();
  const { users } = useAdminData();

  const [activePlan, setActivePlan] = useState<string>('free');
  const [userSearch, setUserSearch] = useState('');

  const limitsForPlan = useMemo(
    () => limits.filter((l) => l.plan_key === activePlan),
    [limits, activePlan],
  );

  const planByKey = useMemo(
    () => Object.fromEntries(plans.map((p) => [p.key, p])),
    [plans],
  );

  const subByUser = useMemo(
    () => Object.fromEntries(subscriptions.map((s) => [s.user_id, s])),
    [subscriptions],
  );

  const filteredUsers = useMemo(() => {
    const q = userSearch.toLowerCase().trim();
    if (!q) return users.slice(0, 50);
    return users
      .filter((u) =>
        u.email?.toLowerCase().includes(q) || u.full_name?.toLowerCase().includes(q),
      )
      .slice(0, 50);
  }, [users, userSearch]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Plans &amp; Limits</h1>
          <p className="text-muted-foreground">
            Change what each plan allows without deploying code
          </p>
        </div>
        <Button variant="outline" onClick={fetchAll} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-lg bg-primary/10">
              <Gauge className="w-6 h-6 text-primary" />
            </div>
            <div className="space-y-1">
              <h3 className="font-semibold">How these limits are applied</h3>
              <p className="text-sm text-muted-foreground">
                Each request consumes one unit of a monthly allowance and one of an
                hourly burst window. A daily token ceiling sits behind both as the
                real cost backstop, since one analysis can make several model calls.
              </p>
              <p className="text-sm text-muted-foreground">
                <strong>Inherit</strong> takes the value from the plan;{' '}
                <strong>Unlimited</strong> (or <code>-1</code>) removes the cap.
                Windows reset in UTC, so a month rolls over mid-morning
                Australian time.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="limits">
        <TabsList>
          <TabsTrigger value="limits">
            <SlidersHorizontal className="w-4 h-4 mr-2" />
            Limits
          </TabsTrigger>
          <TabsTrigger value="plans">
            <CreditCard className="w-4 h-4 mr-2" />
            Plans
          </TabsTrigger>
          <TabsTrigger value="users">
            <Users className="w-4 h-4 mr-2" />
            Users
          </TabsTrigger>
        </TabsList>

        {/* ── Limits ─────────────────────────────────────────────────────── */}
        <TabsContent value="limits" className="mt-6">
          <Card className="border-border/50">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">Per-resource limits</CardTitle>
                <CardDescription>
                  Edit a value and press Enter, or click away, to save
                </CardDescription>
              </div>
              <Select value={activePlan} onValueChange={setActivePlan}>
                <SelectTrigger className="w-44">
                  <SelectValue placeholder="Plan" />
                </SelectTrigger>
                <SelectContent>
                  {plans.map((p) => (
                    <SelectItem key={p.key} value={p.key}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="border-border/50">
                    <TableHead>Feature</TableHead>
                    <TableHead>Enabled</TableHead>
                    <TableHead>Per month</TableHead>
                    <TableHead>Per hour</TableHead>
                    <TableHead>Model tier</TableHead>
                    <TableHead>Max tokens/call</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {limitsForPlan.map((l: PlanLimit) => (
                    <TableRow key={`${l.plan_key}-${l.resource}`} className="border-border/50">
                      <TableCell>
                        <div className="font-medium">{l.label}</div>
                        <code className="text-xs text-muted-foreground">{l.resource}</code>
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={l.is_enabled}
                          disabled={saving}
                          onCheckedChange={(checked) =>
                            updateLimit(l.plan_key, l.resource, { is_enabled: checked })
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <LimitCell
                          value={l.monthly_limit}
                          disabled={saving}
                          onSave={(next) =>
                            updateLimit(l.plan_key, l.resource, { monthly_limit: next })
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <LimitCell
                          value={l.hourly_limit}
                          disabled={saving}
                          onSave={(next) =>
                            updateLimit(l.plan_key, l.resource, { hourly_limit: next })
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Select
                          value={l.max_model_tier ?? 'inherit'}
                          onValueChange={(v) =>
                            updateLimit(l.plan_key, l.resource, {
                              max_model_tier: v === 'inherit' ? null : v,
                            })
                          }
                        >
                          <SelectTrigger className="h-8 w-28 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="inherit">Inherit</SelectItem>
                            <SelectItem value="fast">fast</SelectItem>
                            <SelectItem value="deep">deep</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <LimitCell
                          value={l.max_tokens_per_call}
                          disabled={saving}
                          onSave={(next) =>
                            updateLimit(l.plan_key, l.resource, { max_tokens_per_call: next })
                          }
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                  {limitsForPlan.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        {loading ? 'Loading…' : 'No limits defined for this plan.'}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>

              <p className="mt-4 text-xs text-muted-foreground">
                Leaving model tier on <strong>Inherit</strong> is usually right. Forcing
                the analysis features down to <code>fast</code> tends to truncate
                rewrites, which trips the completeness retry and costs two calls
                instead of one.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Plans ──────────────────────────────────────────────────────── */}
        <TabsContent value="plans" className="mt-6 space-y-4">
          {plans.map((p) => (
            <Card key={p.key} className="border-border/50">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CardTitle className="text-lg">{p.name}</CardTitle>
                    <code className="text-xs text-muted-foreground">{p.key}</code>
                    {p.is_default && <Badge variant="outline">Default</Badge>}
                    {!p.is_active && <Badge variant="secondary">Inactive</Badge>}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {p.price_cents_monthly === 0
                      ? 'Free'
                      : `$${(p.price_cents_monthly / 100).toFixed(2)} ${p.currency}/mo`}
                  </div>
                </div>
                <CardDescription>{p.description}</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label className="text-xs">Daily token ceiling</Label>
                  <LimitCell
                    value={p.daily_token_ceiling}
                    disabled={saving}
                    onSave={(next) => updatePlan(p.key, { daily_token_ceiling: next })}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Max tokens per call</Label>
                  <LimitCell
                    value={p.max_tokens_per_call}
                    disabled={saving}
                    onSave={(next) =>
                      next !== null && updatePlan(p.key, { max_tokens_per_call: next })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Max model tier</Label>
                  <Select
                    value={p.max_model_tier}
                    onValueChange={(v) => updatePlan(p.key, { max_model_tier: v })}
                  >
                    <SelectTrigger className="h-8 w-28 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fast">fast</SelectItem>
                      <SelectItem value="deep">deep</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* ── Users ──────────────────────────────────────────────────────── */}
        <TabsContent value="users" className="mt-6">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-lg">User plans</CardTitle>
              <CardDescription>
                Granting a plan here is recorded as an admin grant, so a comped
                account is never mistaken for a paying one
              </CardDescription>
              <Input
                placeholder="Search by email or name…"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="mt-2 max-w-sm"
              />
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="border-border/50">
                    <TableHead>User</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Overrides</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((u) => {
                    const sub = subByUser[u.id];
                    const userOverrides = overrides.filter((o) => o.user_id === u.id);
                    return (
                      <TableRow key={u.id} className="border-border/50">
                        <TableCell>
                          <div className="font-medium">{u.full_name || '—'}</div>
                          <div className="text-xs text-muted-foreground">{u.email}</div>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={sub?.plan_key ?? ''}
                            onValueChange={(v) => setUserPlan(u.id, v)}
                          >
                            <SelectTrigger className="h-8 w-36 text-sm">
                              <SelectValue placeholder="No plan" />
                            </SelectTrigger>
                            <SelectContent>
                              {plans.map((p) => (
                                <SelectItem key={p.key} value={p.key}>
                                  {p.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          {sub
                            ? <Badge variant={sub.source === 'admin_grant' ? 'default' : 'outline'}>
                                {sub.source}
                              </Badge>
                            : <span className="text-xs text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell>
                          {userOverrides.length === 0
                            ? <span className="text-xs text-muted-foreground">None</span>
                            : (
                              <div className="flex flex-wrap gap-1">
                                {userOverrides.map((o) => (
                                  <Badge
                                    key={o.resource}
                                    variant="secondary"
                                    className="gap-1"
                                  >
                                    {o.resource}
                                    <button
                                      type="button"
                                      aria-label={`Remove override for ${o.resource}`}
                                      onClick={() => removeOverride(u.id, o.resource)}
                                      className="ml-1 opacity-60 hover:opacity-100"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </Badge>
                                ))}
                              </div>
                            )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {filteredUsers.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        {loading ? 'Loading…' : 'No users match that search.'}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
