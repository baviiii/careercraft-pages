// Tokens per day, stacked by feature.
//
// Days come back from SQL already bucketed in the admin's time zone. Missing
// days are filled with zero so a quiet week reads as quiet rather than being
// squeezed out of the axis.

import { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatTokens, formatTokensExact, formatUsd, resourceLabel, type DateRange, type UsageDayRow } from '@/lib/aiUsage';
import { SERIES_ORDER, seriesColor, seriesKey } from './usageHelpers';
import './usage.css';

function localDayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function shortDay(key: string): string {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
}

function seriesName(key: string): string {
  return key === 'other' ? 'Other' : resourceLabel(key);
}

interface DayDatum {
  day: string;
  total: number;
  cost: number;
  [series: string]: number | string;
}

function DayTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { dataKey: string; value: number; payload: DayDatum }[];
  label?: string;
}) {
  if (!active || !payload?.length || !label) return null;
  const datum = payload[0].payload;
  const rows = payload.filter((p) => Number(p.value) > 0).reverse();
  return (
    <div className="rounded-md border border-border bg-[color:var(--ds-surface)] px-3 py-2 text-xs shadow-md">
      <p className="font-medium text-foreground">{shortDay(label)}</p>
      <p className="mb-1.5 text-muted-foreground tabular-nums">
        {formatTokensExact(datum.total)} tokens · {formatUsd(datum.cost)}
      </p>
      {rows.length === 0 && <p className="text-muted-foreground">No AI calls</p>}
      {rows.map((p) => (
        <p key={p.dataKey} className="flex items-center justify-between gap-4 tabular-nums">
          <span className="flex items-center gap-1.5 text-foreground">
            <span className="usage-swatch" style={{ background: seriesColor(p.dataKey) }} />
            {seriesName(p.dataKey)}
          </span>
          <span className="text-muted-foreground">{formatTokens(Number(p.value))}</span>
        </p>
      ))}
    </div>
  );
}

export function TokensByDayChart({ rows, range, height = 260 }: { rows: UsageDayRow[]; range: DateRange; height?: number }) {
  const { data, series } = useMemo(() => {
    const byDay = new Map<string, DayDatum>();
    const present = new Set<string>();

    for (const r of rows) {
      const key = seriesKey(r.resource);
      present.add(key);
      const d = byDay.get(r.day) ?? { day: r.day, total: 0, cost: 0 };
      d[key] = Number(d[key] ?? 0) + Number(r.tokens);
      d.total += Number(r.tokens);
      d.cost += Number(r.cost_usd);
      byDay.set(r.day, d);
    }

    // Continuous axis from the range start through today. A long range ("all
    // time") starts at the first day with data instead of months of nothing.
    const firstData = rows.length ? rows.reduce((a, r) => (r.day < a ? r.day : a), rows[0].day) : null;
    const rangeStart = localDayKey(new Date(range.from));
    const spanDays = (new Date(range.to).getTime() - new Date(range.from).getTime()) / 864e5;
    let cursorKey = spanDays > 62 && firstData && firstData > rangeStart ? firstData : rangeStart;
    const end = localDayKey(new Date(Math.min(Date.now(), new Date(range.to).getTime())));
    const out: DayDatum[] = [];
    for (let guard = 0; cursorKey <= end && guard < 400; guard++) {
      out.push(byDay.get(cursorKey) ?? { day: cursorKey, total: 0, cost: 0 });
      const [y, m, d] = cursorKey.split('-').map(Number);
      cursorKey = localDayKey(new Date(y, m - 1, d + 1));
    }

    return { data: out, series: [...SERIES_ORDER, 'other'].filter((k) => present.has(k)) };
  }, [rows, range]);

  if (series.length === 0) {
    return (
      <div className="flex items-center justify-center text-sm text-muted-foreground" style={{ height }}>
        No AI calls in this period.
      </div>
    );
  }

  return (
    <div className="usage-viz">
      {series.length > 1 && (
        <ul className="mb-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs" aria-label="Legend">
          {series.map((s) => (
            <li key={s} className="flex items-center gap-1.5 text-muted-foreground">
              <span className="usage-swatch" style={{ background: seriesColor(s) }} />
              {seriesName(s)}
            </li>
          ))}
        </ul>
      )}
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} barCategoryGap="22%">
          <CartesianGrid vertical={false} stroke="var(--viz-grid)" />
          <XAxis
            dataKey="day"
            tickFormatter={shortDay}
            tickLine={false}
            axisLine={false}
            stroke="var(--viz-axis)"
            fontSize={11}
            minTickGap={18}
          />
          <YAxis
            tickFormatter={(v: number) => formatTokens(v)}
            width={44}
            tickLine={false}
            axisLine={false}
            stroke="var(--viz-axis)"
            fontSize={11}
            allowDecimals={false}
          />
          <Tooltip cursor={{ fill: 'var(--viz-grid)' }} content={<DayTooltip />} />
          {series.map((s) => (
            <Bar
              key={s}
              dataKey={s}
              stackId="tokens"
              fill={seriesColor(s)}
              // A 1px surface-coloured edge on each segment is the 2px gap
              // between stacked segments.
              stroke="var(--viz-surface)"
              strokeWidth={1}
              maxBarSize={24}
              isAnimationActive={false}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
