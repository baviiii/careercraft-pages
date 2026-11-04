// Today's AI budget — how much the user has left, going down as they spend.
//
// Every AI feature draws from the same daily token ceiling (plans.
// daily_token_ceiling, or a per-user override). Two shapes: a compact one for
// the sidebar, and the full one for Settings › Plan & usage.

import { useNavigate } from 'react-router-dom';
import { dailyBudget, usePlanUsage } from '@/hooks/usePlanUsage';
import { budgetTone, formatTokens, formatTokensExact } from '@/lib/aiUsage';
import { formatResetsIn } from '@/lib/quota';

function Bar({ percentUsed, label }: { percentUsed: number; label: string }) {
  return (
    <div
      className="cc-score"
      role="progressbar"
      aria-valuenow={percentUsed}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <div
        className={`cc-score-fill cc-score-${budgetTone(percentUsed)}`}
        style={{ width: `${percentUsed}%` }}
      />
    </div>
  );
}

/** Compact, above the account card in the sidebar. Renders nothing until it knows. */
export function SidebarTokenBudget({ onNavigate }: { onNavigate?: () => void }) {
  const navigate = useNavigate();
  const { usage } = usePlanUsage();
  const budget = dailyBudget(usage);
  if (!budget) return null;

  return (
    <button
      type="button"
      className="cc-side__budget"
      onClick={() => {
        navigate('/settings?tab=plan');
        onNavigate?.();
      }}
      title={
        budget.limit === null
          ? `${formatTokensExact(budget.used)} AI tokens used today`
          : `${formatTokensExact(budget.remaining)} of ${formatTokensExact(budget.limit)} AI tokens left today`
      }
    >
      <span className="cc-side__budget-row">
        <span className="cc-side__budget-label">AI today</span>
        <span className="cc-side__budget-value cc-tabular">
          {budget.limit === null
            ? `${formatTokens(budget.used)} used`
            : `${formatTokens(budget.remaining)} left`}
        </span>
      </span>
      {budget.limit !== null && <Bar percentUsed={budget.percentUsed} label="AI tokens used today" />}
    </button>
  );
}

/** The full meter, for Settings. */
export function TokenBudgetPanel() {
  const { usage, loading } = usePlanUsage();
  const budget = dailyBudget(usage);

  if (loading && !budget) {
    return <p className="cc-font-editorial text-[color:var(--cc-ash)]">Loading today&rsquo;s budget…</p>;
  }
  if (!budget) {
    return (
      <p className="cc-font-editorial text-[color:var(--cc-ash)]">
        Your AI budget isn&rsquo;t available right now.
      </p>
    );
  }

  const refills = formatResetsIn(budget.resetsAt);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <p className="cc-font-display text-3xl tracking-tight cc-tabular text-[color:var(--cc-ink)]">
          {budget.limit === null ? formatTokens(budget.used) : formatTokens(budget.remaining)}
          <span className="ml-2 cc-font-editorial text-[15px] tracking-normal text-[color:var(--cc-ink-soft)]">
            {budget.limit === null
              ? 'tokens used today'
              : `of ${formatTokens(budget.limit)} tokens left today`}
          </span>
        </p>
        <span className="cc-label-sm cc-tabular text-[color:var(--cc-ash)]">
          {formatTokensExact(budget.used)} used
        </span>
      </div>

      {budget.limit !== null && <Bar percentUsed={budget.percentUsed} label="AI tokens used today" />}

      <p className="cc-font-editorial text-[14px] text-[color:var(--cc-ink-soft)]">
        Every AI feature draws from this. Bigger jobs use more: an ATS analysis
        takes far more than one interview answer.
        {refills && <> It refills {refills}, at midnight UTC.</>}
      </p>
    </div>
  );
}
