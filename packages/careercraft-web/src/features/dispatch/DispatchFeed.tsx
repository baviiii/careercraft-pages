/* ───────────────────────────────────────────────────────────
   Dispatch — the personalized feed on Home.

   Laid out as a front page rather than a card grid: one dominant
   lead against a ruled index rail, display type playing off mono
   meta, and the ranking stated out loud instead of hidden.
   ─────────────────────────────────────────────────────────── */

import { motion } from "framer-motion";
import { Compass, Radio } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { LeadStory } from "./components/LeadStory";
import { RailItem } from "./components/RailItem";
import { TuningBar } from "./components/TuningBar";
import { useDispatchFeed } from "./hooks/useDispatchFeed";
import { dateline } from "./lib/time";

const ease = [0.2, 0.8, 0.2, 1] as const;

export const DispatchFeed = () => {
  const navigate = useNavigate();
  const {
    lead,
    rail,
    itemCount,
    signals,
    mutedIds,
    toggleSignal,
    isLoading,
    error,
    hasPersonalizationData,
    refresh,
  } = useDispatchFeed();

  const activeCount = signals.length - mutedIds.size;

  return (
    <section className="mt-12">
      {/* ── Masthead ─────────────────────────────────────────── */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="cc-kicker">Dispatch</div>
          <h2 className="mt-1.5 cc-font-display text-2xl tracking-tight md:text-[1.85rem]">
            {hasPersonalizationData ? "Tailored to you" : "The wider market"}
          </h2>
          <p className="mt-1 text-sm text-[color:var(--cc-ash)]">
            {hasPersonalizationData
              ? "Ranked against your profile — and it shows its working."
              : "Add your target role to start tuning this feed."}
          </p>
        </div>

        <div className="flex items-center gap-2 cc-font-mono text-[10px] uppercase tracking-[0.14em] text-[color:var(--cc-ash)]">
          <span className="cc-tabular">{dateline()}</span>
          {itemCount > 0 && (
            <>
              <span className="h-2.5 w-px bg-[color:var(--cc-hair-strong)]" aria-hidden />
              <span className="cc-tabular">
                {itemCount} matched
                {activeCount > 0 ? ` · ${activeCount} signal${activeCount > 1 ? "s" : ""}` : ""}
              </span>
            </>
          )}
        </div>
      </div>

      {/* ── Body ─────────────────────────────────────────────── */}
      {isLoading ? (
        <FeedSkeleton />
      ) : error ? (
        <EmptyState
          icon={<Radio className="h-5 w-5" />}
          title="The wire is down"
          body={error}
          actionLabel="Try again"
          onAction={refresh}
        />
      ) : !lead ? (
        <EmptyState
          icon={<Compass className="h-5 w-5" />}
          title={hasPersonalizationData ? "Nothing cleared the bar" : "Nothing to tune yet"}
          body={
            hasPersonalizationData
              ? "No stories or roles matched your profile this time. Loosen a signal below, or pull the wire again."
              : "Tell us the role you're chasing and this feed starts ranking against it."
          }
          actionLabel={hasPersonalizationData ? "Refresh" : "Complete your profile"}
          onAction={hasPersonalizationData ? refresh : () => navigate("/settings")}
        />
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease }}
          className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-[1.15fr_0.85fr] lg:items-start"
        >
          <LeadStory item={lead} />

          {rail.length > 0 && (
            <div className="cc-surface overflow-hidden px-4 py-1 md:px-5">
              {rail.map((item, i) => (
                <motion.div
                  key={item.key}
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: 0.08 + i * 0.06, ease }}
                >
                  <RailItem item={item} index={i + 1} />
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      )}

      <TuningBar
        signals={signals}
        mutedIds={mutedIds}
        onToggle={toggleSignal}
        onRefresh={refresh}
        isLoading={isLoading}
      />
    </section>
  );
};

/* ───────────────────────── states ───────────────────────── */

const FeedSkeleton = () => (
  <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
    <div className="cc-surface overflow-hidden">
      <div className="aspect-[16/8] w-full animate-pulse bg-[color:var(--cc-cream-2)]" />
      <div className="space-y-3 p-6">
        <div className="h-3 w-24 animate-pulse rounded bg-[color:var(--cc-cream-2)]" />
        <div className="h-7 w-4/5 animate-pulse rounded bg-[color:var(--cc-cream-2)]" />
        <div className="h-4 w-full animate-pulse rounded bg-[color:var(--cc-cream-2)]" />
      </div>
    </div>
    <div className="cc-surface px-5 py-1">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="space-y-2 border-b border-[color:var(--cc-hair)] py-4 last:border-b-0">
          <div className="h-4 w-full animate-pulse rounded bg-[color:var(--cc-cream-2)]" />
          <div className="h-3 w-1/2 animate-pulse rounded bg-[color:var(--cc-cream-2)]" />
        </div>
      ))}
    </div>
  </div>
);

const EmptyState = ({
  icon,
  title,
  body,
  actionLabel,
  onAction,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  actionLabel: string;
  onAction: () => void;
}) => (
  <div className="cc-surface cc-tone-cobalt mt-5 flex flex-col items-center px-6 py-12 text-center">
    <span className="cc-icon-chip h-12 w-12">{icon}</span>
    <div className="mt-4 cc-font-display text-xl tracking-tight text-[color:var(--cc-ink)]">
      {title}
    </div>
    <p className="mt-2 max-w-sm cc-font-sans text-sm leading-relaxed text-[color:var(--cc-ink-soft)]">
      {body}
    </p>
    <button type="button" onClick={onAction} className="cc-action cc-action--sm mt-5">
      {actionLabel}
    </button>
  </div>
);

export default DispatchFeed;
