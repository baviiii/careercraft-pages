// Shown when a plan limit refuses a request.
//
// A spent allowance is a product state, not an error, so this reads as an
// explanation with a way forward rather than a failure message. Uses the
// cc-* tokens so it belongs to the app surfaces rather than the admin ones.

import { Lock, ArrowUpRight, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatResetsIn, quotaMessage, type QuotaDetails } from '@/lib/quota';

interface QuotaNoticeProps {
  details: QuotaDetails;
  /** Hides the upgrade path — used where an upgrade would not help. */
  hideUpgrade?: boolean;
  className?: string;
}

export function QuotaNotice({ details, hideUpgrade, className = '' }: QuotaNoticeProps) {
  const navigate = useNavigate();
  const resetsIn = formatResetsIn(details.resetsAt);

  // An hourly burst is a "wait a moment", not a "buy something" — pushing an
  // upgrade there would be both annoying and useless, since the premium plan
  // has an hourly window too.
  const showUpgrade = !hideUpgrade && details.reason !== 'hourly';

  return (
    <div
      className={`cc-surface cc-tone-wheat flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between ${className}`}
      role="status"
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[color:var(--cc-t-wash)]"
        >
          <Lock className="h-4 w-4 text-[color:var(--cc-t-deep)]" />
        </span>
        <div className="space-y-1">
          <p className="cc-font-editorial text-[15px] leading-snug text-[color:var(--cc-ink)]">
            {quotaMessage(details)}
          </p>
          {resetsIn && (
            <p className="flex items-center gap-1.5 cc-label-sm text-[color:var(--cc-ash)]">
              <Clock className="h-3 w-3" />
              Resets {resetsIn}
            </p>
          )}
        </div>
      </div>

      {showUpgrade && (
        <button
          type="button"
          onClick={() => navigate('/settings?tab=plan')}
          className="cc-action cc-action--sm shrink-0 self-start md:self-auto"
        >
          See your plan
          <ArrowUpRight className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

/**
 * The inline variant, for a control that is unavailable on this plan.
 * Uses .cc-field-locked, which has been sitting in craft.css unused.
 */
export function QuotaLockedField({ label }: { label: string }) {
  const navigate = useNavigate();
  return (
    <div className="cc-field-locked">
      <Lock className="h-4 w-4 shrink-0 text-[color:var(--cc-ash)]" aria-hidden />
      <span className="flex-1">{label} isn&rsquo;t part of your plan.</span>
      <button
        type="button"
        onClick={() => navigate('/settings?tab=plan')}
        className="cc-link shrink-0 text-[color:var(--cc-rust)]"
      >
        View plan
      </button>
    </div>
  );
}
