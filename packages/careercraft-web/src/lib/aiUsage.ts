// Reading AI token spend: the user's own activity, and the admin audit views.
//
// token_usage_ledger is service-role only. Everything here goes through
// SECURITY DEFINER RPCs (20261104000000_ai_usage_audit.sql): the admin ones
// refuse anyone who is not a whitelisted admin, and get_my_token_activity only
// ever returns the caller's own rows.

import { supabase } from '@/integrations/supabase/client';
import type { PlanUsage } from '@/lib/quota';

// ── Labels ─────────────────────────────────────────────────────────────────
// The ledger stores machine keys. Resource keys are the edge function names;
// task keys are the Horus routing keys each call was made under.

const RESOURCE_LABELS: Record<string, string> = {
  'ats-analyze': 'ATS analysis',
  'rewrite-resume': 'AI rewriting',
  'parse-resume': 'Résumé import',
  'parse-resume-guest': 'Résumé import (guest)',
  'onboard-analyze': 'Onboarding analysis',
  infer: 'Interview coach',
  // coach-chat spends under this key too, so "search" alone undersells it.
  'horus-rag-search': 'Career coach & search',
  'horus-rag': 'Career graph lookups',
  'job-news': 'Job & market data',
  'job-news-trends': 'Market trends',
  'job-search': 'Job search',
  'generate-prompt': 'Admin prompt tools',
  'voice-session': 'Voice practice',
  'horus-keepalive': 'Keep-alive ping',
};

const TASK_LABELS: Record<string, string> = {
  'careercraft.ats_full_analysis': 'ATS analysis',
  'careercraft.ats_rewrite_structured': 'ATS rewrite',
  'careercraft.ats_rewrite_retry': 'ATS rewrite (retry)',
  'careercraft.ats_imperfection_pass': 'ATS polish pass',
  'careercraft.parse_resume_text': 'Résumé import',
  'careercraft.parse_resume_vision': 'Résumé import (scanned)',
  'careercraft.onboard_analyze': 'Onboarding analysis',
  'careercraft.coach_chat': 'Career coach chat',
  'careercraft.job_news_trends': 'Market trends',
  'careercraft.prompt_improve': 'Prompt improvement',
  'careercraft.keepalive': 'Keep-alive ping',
  'interview.generate_questions': 'Interview questions',
  'interview.evaluate_answer': 'Answer feedback',
  'interview.final_evaluation': 'Interview debrief',
  'interview.hint': 'Interview hint',
  'interview.build_plan': 'Interview prep plan',
  'study.explain_concept': 'Concept explainer',
  'study.evaluate_drill': 'Drill marking',
  'study.next_drill': 'Next drill',
  'study.rank_resources': 'Resource ranking',
  'study.build_plan': 'Study plan',
  'study.suggest_resources': 'Resource suggestions',
  'career.guidance': 'Career guidance',
  'career.roadmap': 'Career roadmap',
  'career.analyze_certifications': 'Certification check',
  'career.recommend_certifications': 'Certification ideas',
  'analytics.weekly_insight': 'Weekly insight',
  'field.profile': 'Field lookup',
  'proof.draft_tips': 'Proof tips',
  'latency.probe': 'System check',
};

function humanize(key: string): string {
  const last = key.split('.').pop() ?? key;
  const words = last.replace(/[_-]+/g, ' ').trim();
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : key;
}

/** `sqlLabel` is plan_limits.label, which an admin may have renamed. */
export function resourceLabel(resource: string, sqlLabel?: string | null): string {
  return RESOURCE_LABELS[resource] ?? sqlLabel ?? humanize(resource);
}

export function taskLabel(task: string | null | undefined): string {
  if (!task) return 'Unlabelled call';
  if (TASK_LABELS[task]) return TASK_LABELS[task];
  if (task.startsWith('test.')) return 'System test';
  return humanize(task);
}

// ── Formatting ─────────────────────────────────────────────────────────────

const compact = new Intl.NumberFormat('en-AU', { notation: 'compact', maximumFractionDigits: 1 });
const whole = new Intl.NumberFormat('en-AU');

/** 640 · 12.4K · 1.2M */
export function formatTokens(n: number | null | undefined): string {
  const v = Number(n ?? 0);
  return Math.abs(v) < 1000 ? whole.format(v) : compact.format(v);
}

export function formatTokensExact(n: number | null | undefined): string {
  return whole.format(Number(n ?? 0));
}

/**
 * Dollars, with enough precision that a single call isn't rounded to zero.
 * Totals read as $12.34; one Haiku call reads as $0.0035.
 */
export function formatUsd(n: number | null | undefined, precise = false): string {
  const v = Number(n ?? 0);
  if (v === 0) return '$0.00';
  if (precise || Math.abs(v) < 0.01) {
    return `$${v.toFixed(Math.abs(v) < 0.0001 ? 6 : 4)}`;
  }
  return `$${v.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ── Date ranges ────────────────────────────────────────────────────────────

export type RangeKey = 'today' | '7d' | '30d' | 'month' | 'all';

/** Same grading as the monthly feature bars in Settings: 70% warns, 90% is poor. */
export function budgetTone(percentUsed: number): 'good' | 'warn' | 'poor' {
  if (percentUsed >= 90) return 'poor';
  if (percentUsed >= 70) return 'warn';
  return 'good';
}

export const RANGE_OPTIONS: { key: RangeKey; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: '7d', label: 'Last 7 days' },
  { key: '30d', label: 'Last 30 days' },
  { key: 'month', label: 'This month' },
  { key: 'all', label: 'All time' },
];

export interface DateRange {
  from: string;
  to: string;
}

/**
 * Local-calendar ranges. `to` is open-ended an hour ahead so in-flight calls land.
 *
 * Days are stepped with the Date constructor, not by subtracting 24h: across
 * a daylight-saving change a day is 23 or 25 hours long, and "30 days" would
 * start an hour off midnight.
 */
export function rangeFor(key: RangeKey, now = new Date()): DateRange {
  const to = new Date(now.getTime() + 60 * 60 * 1000).toISOString();
  const daysAgo = (n: number) => new Date(now.getFullYear(), now.getMonth(), now.getDate() - n);
  switch (key) {
    case 'today':
      return { from: daysAgo(0).toISOString(), to };
    case '7d':
      return { from: daysAgo(6).toISOString(), to };
    case '30d':
      return { from: daysAgo(29).toISOString(), to };
    case 'month':
      return { from: new Date(now.getFullYear(), now.getMonth(), 1).toISOString(), to };
    case 'all':
    default:
      // Before the ledger existed (20260821); nothing earlier can be in it.
      return { from: '2026-01-01T00:00:00Z', to };
  }
}

export function browserTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

// ── The user's own activity ────────────────────────────────────────────────

export interface TokenActivity {
  activity_id: string;
  started_at: string;
  resource: string;
  label: string | null;
  tasks: string[];
  tokens: number;
  calls: number;
  failed: boolean;
}

export async function fetchMyTokenActivity(limit = 30): Promise<TokenActivity[]> {
  const { data, error } = await supabase.rpc('get_my_token_activity', { p_limit: limit });
  if (error) {
    console.error('Error loading token activity:', error);
    return [];
  }
  return (data ?? []) as TokenActivity[];
}

/** One request can fan out to several calls; name it by its one task when it has one. */
export function activityLabel(a: Pick<TokenActivity, 'tasks' | 'resource' | 'label'>): string {
  if (a.tasks.length === 1) return taskLabel(a.tasks[0]);
  return resourceLabel(a.resource, a.label);
}

// ── Admin: overview ────────────────────────────────────────────────────────

export interface UsageTotals {
  tokens: number;
  prompt_tokens: number;
  completion_tokens: number;
  cost_usd: number;
  calls: number;
  requests: number;
  users: number;
  retries: number;
  retry_tokens: number;
  errors: number;
  unattributed_tokens: number;
  unattributed_cost_usd: number;
  unattributed_calls: number;
}

export interface UsageDayRow {
  day: string;
  resource: string;
  tokens: number;
  cost_usd: number;
  calls: number;
}

export interface UsageResourceRow {
  resource: string;
  label: string | null;
  tokens: number;
  cost_usd: number;
  calls: number;
  requests: number;
  users: number;
  retries: number;
  errors: number;
  avg_duration_ms: number | null;
}

export interface UsageTaskRow {
  resource: string;
  task: string | null;
  tokens: number;
  cost_usd: number;
  calls: number;
  avg_tokens?: number;
  retries: number;
  errors: number;
}

export interface UsageModelRow {
  provider: string;
  model: string | null;
  price_label: string | null;
  prompt_tokens: number;
  completion_tokens: number;
  tokens: number;
  cost_usd: number;
  calls: number;
}

export interface UsagePlanRow {
  /** null = calls with no user (scripts, guests, system). */
  plan_key: string | null;
  tokens: number;
  cost_usd: number;
  calls: number;
  users: number;
}

export interface UsageOverview {
  timezone: string;
  totals: UsageTotals;
  by_day: UsageDayRow[];
  by_resource: UsageResourceRow[];
  by_task: UsageTaskRow[];
  by_model: UsageModelRow[];
  by_plan: UsagePlanRow[];
}

export async function fetchUsageOverview(range: DateRange): Promise<UsageOverview> {
  const { data, error } = await supabase.rpc('admin_usage_overview', {
    p_from: range.from,
    p_to: range.to,
    p_tz: browserTimeZone(),
  });
  if (error) throw error;
  return data as unknown as UsageOverview;
}

// ── Admin: per user ────────────────────────────────────────────────────────

export interface UserUsageRow {
  user_id: string;
  email: string | null;
  full_name: string | null;
  role: string | null;
  signed_up_at: string;
  last_sign_in_at: string | null;
  plan_key: string | null;
  plan_source: string | null;
  plan_status: string | null;
  tokens: number;
  prompt_tokens: number;
  completion_tokens: number;
  cost_usd: number;
  calls: number;
  requests: number;
  errors: number;
  retries: number;
  last_call_at: string | null;
  top_resource: string | null;
  tokens_today: number;
  daily_limit: number | null;
}

export async function fetchUsageByUser(range: DateRange): Promise<UserUsageRow[]> {
  const { data, error } = await supabase.rpc('admin_usage_by_user', {
    p_from: range.from,
    p_to: range.to,
  });
  if (error) throw error;
  return (data ?? []) as UserUsageRow[];
}

// ── Admin: the call log ────────────────────────────────────────────────────

export interface UsageCall {
  id: number;
  created_at: string;
  user_id: string | null;
  email: string | null;
  plan_key: string | null;
  resource: string;
  task: string | null;
  provider: string;
  model: string | null;
  model_tier: string | null;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  cost_usd: number;
  request_id: string | null;
  attempt: number;
  error_code: string | null;
  duration_ms: number | null;
  metadata: Record<string, unknown> | null;
}

export type CallScope = 'all' | 'users' | 'unattributed';

export interface CallQuery {
  range: DateRange;
  userId?: string | null;
  scope?: CallScope;
  resource?: string | null;
  limit?: number;
  beforeId?: number | null;
}

export async function fetchUsageCalls(q: CallQuery): Promise<UsageCall[]> {
  const { data, error } = await supabase.rpc('admin_usage_calls', {
    p_from: q.range.from,
    p_to: q.range.to,
    p_user_id: q.userId ?? undefined,
    p_scope: q.scope ?? 'all',
    p_resource: q.resource ?? undefined,
    p_limit: q.limit ?? 200,
    p_before_id: q.beforeId ?? undefined,
  });
  if (error) throw error;
  return (data ?? []) as unknown as UsageCall[];
}

/**
 * Every call in the query, walked page by page, for exports. Capped so a
 * mistaken "all time" export can't hang the tab — and when the cap cuts it
 * short, `truncated` says so, because a silently partial audit file is worse
 * than a slow one.
 */
export async function fetchAllUsageCalls(
  q: Omit<CallQuery, 'beforeId' | 'limit'>,
  cap = 20000,
): Promise<{ calls: UsageCall[]; truncated: boolean }> {
  const out: UsageCall[] = [];
  let beforeId: number | null = null;
  let more = true;
  while (more && out.length < cap) {
    const page = await fetchUsageCalls({ ...q, limit: 1000, beforeId });
    out.push(...page);
    more = page.length === 1000;
    if (more) beforeId = page[page.length - 1].id;
  }
  return { calls: out.slice(0, cap), truncated: more || out.length > cap };
}

/** One row per user action: the calls that served one HTTP request. */
export interface UsageRequestGroup {
  key: string;
  startedAt: string;
  resource: string;
  email: string | null;
  userId: string | null;
  planKey: string | null;
  calls: UsageCall[];
  tokens: number;
  costUsd: number;
  retries: number;
  errors: number;
}

export function groupCallsByRequest(calls: UsageCall[]): UsageRequestGroup[] {
  const groups = new Map<string, UsageRequestGroup>();
  for (const c of calls) {
    const key = c.request_id ?? `call-${c.id}`;
    let g = groups.get(key);
    if (!g) {
      g = {
        key,
        startedAt: c.created_at,
        resource: c.resource,
        email: c.email,
        userId: c.user_id,
        planKey: c.plan_key,
        calls: [],
        tokens: 0,
        costUsd: 0,
        retries: 0,
        errors: 0,
      };
      groups.set(key, g);
    }
    g.calls.push(c);
    g.tokens += c.total_tokens;
    g.costUsd += Number(c.cost_usd);
    if (c.attempt > 1) g.retries += 1;
    if (c.error_code) g.errors += 1;
    if (c.created_at < g.startedAt) g.startedAt = c.created_at;
  }
  for (const g of groups.values()) g.calls.sort((a, b) => a.id - b.id);
  return [...groups.values()].sort((a, b) => (a.startedAt < b.startedAt ? 1 : -1));
}

// ── Admin: one user ────────────────────────────────────────────────────────

export interface SubscriptionEvent {
  id: string;
  from_plan_key: string | null;
  to_plan_key: string;
  from_status: string | null;
  to_status: string;
  source: string;
  actor_id: string | null;
  actor_email: string | null;
  note: string | null;
  created_at: string;
}

export interface LimitOverrideRow {
  resource: string;
  is_enabled: boolean | null;
  monthly_limit: number | null;
  hourly_limit: number | null;
  expires_at: string | null;
  reason: string | null;
  granted_by_email: string | null;
  updated_at: string;
}

export interface UserUsageDetail {
  timezone: string;
  user: {
    id: string;
    email: string | null;
    full_name: string | null;
    signed_up_at: string;
    last_sign_in_at: string | null;
    roles: string[];
  };
  subscription: {
    plan_key: string;
    status: string;
    source: string;
    grant_note: string | null;
    granted_by_email: string | null;
    daily_token_ceiling_override: number | null;
    current_period_end: string | null;
    updated_at: string;
  } | null;
  daily: { used: number; limit: number | null; resets_at: string };
  plan_usage: PlanUsage;
  totals: Omit<UsageTotals, 'users' | 'retry_tokens' | 'unattributed_tokens' | 'unattributed_cost_usd' | 'unattributed_calls'>;
  lifetime: { tokens: number; cost_usd: number; calls: number; first_call_at: string | null; last_call_at: string | null };
  by_day: UsageDayRow[];
  by_task: UsageTaskRow[];
  events: SubscriptionEvent[];
  overrides: LimitOverrideRow[];
  upgrade_requests: {
    id: string;
    from_plan_key: string | null;
    resource: string | null;
    reason: string | null;
    note: string | null;
    created_at: string;
  }[];
}

export async function fetchUserUsage(userId: string, range: DateRange): Promise<UserUsageDetail | null> {
  const { data, error } = await supabase.rpc('admin_user_usage', {
    p_user_id: userId,
    p_from: range.from,
    p_to: range.to,
    p_tz: browserTimeZone(),
  });
  if (error) throw error;
  return (data as unknown as UserUsageDetail) ?? null;
}

// ── Admin: change log ──────────────────────────────────────────────────────

export interface AuditEntry {
  id: number;
  created_at: string;
  actor_id: string | null;
  actor_email: string | null;
  table_name: string;
  action: 'INSERT' | 'UPDATE' | 'DELETE';
  row_key: Record<string, unknown>;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  target_user_id: string | null;
  target_email: string | null;
}

export async function fetchAuditLog(opts: { limit?: number; beforeId?: number | null; userId?: string | null } = {}): Promise<AuditEntry[]> {
  const { data, error } = await supabase.rpc('admin_list_audit_log', {
    p_limit: opts.limit ?? 200,
    p_before_id: opts.beforeId ?? undefined,
    p_user_id: opts.userId ?? undefined,
  });
  if (error) throw error;
  return (data ?? []) as unknown as AuditEntry[];
}

const TABLE_LABELS: Record<string, string> = {
  plans: 'Plan',
  plan_limits: 'Plan limit',
  model_prices: 'Model price',
  user_subscriptions: 'User plan',
  user_limit_overrides: 'User limit override',
  user_roles: 'User role',
  admin_whitelist: 'Admin whitelist',
  // Written by the admin-users edge function: bans, sign-outs, deletions, invites.
  account: 'Account',
  blocked_ips: 'Blocked IP',
};

export function auditTableLabel(table: string): string {
  return TABLE_LABELS[table] ?? table;
}

// ── Admin: prices ──────────────────────────────────────────────────────────

export interface ModelPrice {
  pattern: string;
  label: string;
  input_usd_per_mtok: number;
  output_usd_per_mtok: number;
  notes: string | null;
  updated_at: string;
}

export async function fetchModelPrices(): Promise<ModelPrice[]> {
  const { data, error } = await supabase
    .from('model_prices')
    .select('pattern,label,input_usd_per_mtok,output_usd_per_mtok,notes,updated_at')
    .order('label');
  if (error) throw error;
  return (data ?? []) as ModelPrice[];
}

export async function updateModelPrice(
  pattern: string,
  patch: Partial<Pick<ModelPrice, 'label' | 'input_usd_per_mtok' | 'output_usd_per_mtok' | 'notes'>>,
): Promise<void> {
  const { error } = await supabase.from('model_prices').update(patch).eq('pattern', pattern);
  if (error) throw error;
}

export async function addModelPrice(row: Omit<ModelPrice, 'updated_at'>): Promise<void> {
  const { error } = await supabase.from('model_prices').insert(row);
  if (error) throw error;
}

export async function deleteModelPrice(pattern: string): Promise<void> {
  const { error } = await supabase.from('model_prices').delete().eq('pattern', pattern);
  if (error) throw error;
}

// ── Admin: per-user controls ───────────────────────────────────────────────

export async function setDailyTokenOverride(userId: string, ceiling: number | null): Promise<void> {
  const { error } = await supabase.rpc('admin_set_daily_token_override', {
    p_user_id: userId,
    p_ceiling: ceiling,
  });
  if (error) throw error;
}

// ── CSV ────────────────────────────────────────────────────────────────────

export interface CsvColumn<T> {
  header: string;
  value: (row: T) => unknown;
}

function csvCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  let s = typeof value === 'object' ? JSON.stringify(value) : String(value);
  // A cell starting with = + - @ runs as a formula when the file is opened in
  // a spreadsheet. Emails and task names are user-influenced, so neutralise it.
  if (/^[=+\-@\t\r]/.test(s) && !/^-?\d+(\.\d+)?$/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv<T>(rows: T[], columns: CsvColumn<T>[]): string {
  const lines = [columns.map((c) => csvCell(c.header)).join(',')];
  for (const row of rows) lines.push(columns.map((c) => csvCell(c.value(row))).join(','));
  return lines.join('\r\n');
}

export function downloadCsv(filename: string, csv: string): void {
  // BOM so Excel reads the é in "Résumé" as UTF-8.
  const blob = new Blob(['﻿', csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const CALL_CSV_COLUMNS: CsvColumn<UsageCall>[] = [
  { header: 'id', value: (c) => c.id },
  { header: 'time_utc', value: (c) => c.created_at },
  { header: 'user_id', value: (c) => c.user_id },
  { header: 'email', value: (c) => c.email },
  { header: 'plan', value: (c) => c.plan_key },
  { header: 'feature', value: (c) => c.resource },
  { header: 'task', value: (c) => c.task },
  { header: 'provider', value: (c) => c.provider },
  { header: 'model', value: (c) => c.model },
  { header: 'tier', value: (c) => c.model_tier },
  { header: 'prompt_tokens', value: (c) => c.prompt_tokens },
  { header: 'completion_tokens', value: (c) => c.completion_tokens },
  { header: 'total_tokens', value: (c) => c.total_tokens },
  { header: 'est_cost_usd', value: (c) => Number(c.cost_usd).toFixed(6) },
  { header: 'request_id', value: (c) => c.request_id },
  { header: 'attempt', value: (c) => c.attempt },
  { header: 'error_code', value: (c) => c.error_code },
  { header: 'duration_ms', value: (c) => c.duration_ms },
  { header: 'metadata', value: (c) => c.metadata },
];

/** "2026-11-04" — for export filenames. */
export function fileDate(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}
