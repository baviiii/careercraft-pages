// Helpers shared by the admin AI usage screens. Kept apart from the
// components in UsageBits.tsx so fast refresh keeps working on those.

import { budgetTone } from '@/lib/aiUsage';

// Features get a fixed colour slot so a feature keeps its colour across every
// chart and every date range. Anything past the seventh folds into "Other".
export const SERIES_ORDER = [
  'infer',
  'ats-analyze',
  'horus-rag-search',
  'onboard-analyze',
  'parse-resume',
  'rewrite-resume',
  'job-news-trends',
];

export function seriesKey(resource: string): string {
  return SERIES_ORDER.includes(resource) ? resource : 'other';
}

export function seriesColor(key: string): string {
  const i = SERIES_ORDER.indexOf(key);
  return i >= 0 ? `var(--viz-${i + 1})` : 'var(--viz-other)';
}

export function budgetToneFor(used: number, limit: number | null): 'good' | 'warn' | 'poor' {
  return limit ? budgetTone((used / limit) * 100) : 'good';
}

export function formatWhen(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-AU', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatDay(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function relativeTime(iso: string | null | undefined): string {
  if (!iso) return 'never';
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.round(ms / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  if (d < 30) return `${d}d ago`;
  return formatDay(iso);
}
