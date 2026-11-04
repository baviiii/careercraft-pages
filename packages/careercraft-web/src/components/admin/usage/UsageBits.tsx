// Small pieces shared by the admin AI usage screens.

import type { ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { formatTokens, formatTokensExact } from '@/lib/aiUsage';
import { budgetToneFor } from './usageHelpers';
import './usage.css';

export function StatTile({
  label,
  value,
  detail,
}: {
  label: string;
  value: ReactNode;
  detail?: ReactNode;
}) {
  return (
    <Card className="border-border/50">
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
        {detail && <p className="mt-1 text-xs text-muted-foreground">{detail}</p>}
      </CardContent>
    </Card>
  );
}

/** Today's tokens against the daily ceiling. */
export function BudgetMeter({
  used,
  limit,
  compact,
}: {
  used: number;
  limit: number | null;
  compact?: boolean;
}) {
  const pct = limit ? Math.min(100, (used / limit) * 100) : 0;
  return (
    <div className={`usage-viz ${compact ? 'w-28' : 'w-full'}`}>
      <div className="flex items-baseline justify-between gap-2 text-xs tabular-nums">
        <span>{formatTokens(used)}</span>
        <span className="text-muted-foreground">
          {limit === null ? 'no ceiling' : `of ${formatTokens(limit)}`}
        </span>
      </div>
      {limit !== null && (
        <div
          className="usage-meter mt-1"
          data-tone={budgetToneFor(used, limit)}
          role="progressbar"
          aria-valuenow={Math.round(pct)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${formatTokensExact(used)} of ${formatTokensExact(limit)} tokens used today`}
        >
          <span style={{ width: `${pct}%` }} />
        </div>
      )}
    </div>
  );
}

export function PlanBadge({ planKey, source }: { planKey: string | null; source?: string | null }) {
  if (!planKey) return <span className="text-xs text-muted-foreground">No plan</span>;
  return (
    <span className="inline-flex items-center gap-1.5">
      <Badge variant={planKey === 'free' ? 'outline' : 'default'} className="capitalize">
        {planKey}
      </Badge>
      {source && source !== 'default' && (
        <span className="text-[11px] text-muted-foreground">{source.replace('_', ' ')}</span>
      )}
    </span>
  );
}
