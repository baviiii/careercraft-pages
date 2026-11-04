// What used the user's AI tokens — one line per action, newest first.
//
// An action is one request: an ATS analysis that made four model calls is one
// line with their total, because that is what the user did.

import { useEffect, useMemo, useState } from 'react';
import { usePlanUsage } from '@/hooks/usePlanUsage';
import { activityLabel, fetchMyTokenActivity, formatTokens, type TokenActivity } from '@/lib/aiUsage';

const SHOWN = 12;

function dayHeading(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diffDays = Math.round((startOf(today) - startOf(d)) / 864e5);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  return d.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' });
}

function timeOf(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit' });
}

export function TokenActivityList() {
  const { usage } = usePlanUsage();
  const [rows, setRows] = useState<TokenActivity[] | null>(null);
  const [showAll, setShowAll] = useState(false);

  // Refetch whenever today's total moves, so a new action appears without a reload.
  const spentToday = usage?.daily_tokens_used ?? null;
  useEffect(() => {
    let cancelled = false;
    fetchMyTokenActivity(60).then((r) => {
      if (!cancelled) setRows(r);
    });
    return () => {
      cancelled = true;
    };
  }, [spentToday]);

  const groups = useMemo(() => {
    const visible = (rows ?? []).slice(0, showAll ? undefined : SHOWN);
    const out: { heading: string; items: TokenActivity[] }[] = [];
    for (const r of visible) {
      const heading = dayHeading(r.started_at);
      const last = out[out.length - 1];
      if (last && last.heading === heading) last.items.push(r);
      else out.push({ heading, items: [r] });
    }
    return out;
  }, [rows, showAll]);

  if (rows === null) {
    return <p className="cc-font-editorial text-[color:var(--cc-ash)]">Loading your activity…</p>;
  }
  if (rows.length === 0) {
    return (
      <p className="cc-font-editorial text-[15px] text-[color:var(--cc-ink-soft)]">
        Nothing yet. Run an ATS check or ask the coach something and it will show up here.
      </p>
    );
  }

  return (
    <div className="space-y-5">
      {groups.map((g) => (
        <div key={g.heading}>
          <p className="cc-label-sm text-[color:var(--cc-ash)]">{g.heading}</p>
          <ul className="mt-2 divide-y divide-[color:var(--cc-hair)]">
            {g.items.map((r) => (
              <li key={r.activity_id} className="flex items-baseline justify-between gap-4 py-2.5">
                <span className="min-w-0">
                  <span className="cc-font-editorial text-[15px] text-[color:var(--cc-ink)]">
                    {activityLabel(r)}
                  </span>
                  <span className="ml-2 cc-label-sm text-[color:var(--cc-ash)]">
                    {timeOf(r.started_at)}
                    {r.failed && ' · did not finish'}
                  </span>
                </span>
                <span className="shrink-0 text-[13px] cc-tabular text-[color:var(--cc-ink-soft)]">
                  {formatTokens(r.tokens)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}

      {rows.length > SHOWN && (
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          className="cc-link text-[color:var(--cc-rust)]"
        >
          {showAll ? 'Show less' : `Show all ${rows.length}`}
        </button>
      )}
    </div>
  );
}
