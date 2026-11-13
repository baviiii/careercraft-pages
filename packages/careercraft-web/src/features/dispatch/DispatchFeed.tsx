/* ───────────────────────────────────────────────────────────
   Dispatch — the personalized feed on Home.

   Two lanes. Open roles first, as a strip of tickets you can save
   straight to the tracker. Then the news as a front page: one lead
   against a rail, every story under its publisher's logo and a
   topic colour, and the ranking stated out loud instead of hidden.
   ─────────────────────────────────────────────────────────── */

import { motion } from "framer-motion";
import { Compass, Radio } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { LeadStory } from "./components/LeadStory";
import { RailItem } from "./components/RailItem";
import { RolesStrip } from "./components/RolesStrip";
import { TuningBar } from "./components/TuningBar";
import { useDispatchFeed } from "./hooks/useDispatchFeed";
import { useReadMarks } from "./hooks/useReadMarks";
import "./dispatch.css";

const ease = [0.2, 0.8, 0.2, 1] as const;

const today = () =>
  new Intl.DateTimeFormat("en-AU", { weekday: "short", day: "numeric", month: "short" })
    .format(new Date())
    .replace(/,/g, "");

export const DispatchFeed = () => {
  const navigate = useNavigate();
  const {
    stories,
    roles,
    roleQuery,
    rolePlace,
    roleWidened,
    canFit,
    itemCount,
    signals,
    mutedIds,
    toggleSignal,
    isLoading,
    error,
    hasPersonalizationData,
    refresh,
  } = useDispatchFeed();
  const { read, markRead } = useReadMarks();

  const [lead, ...rail] = stories;
  const readCount = stories.filter((s) => read.has(s.key)).length;

  return (
    <section className="fc-dispatch mt-12">
      {/* ── Masthead ─────────────────────────────────────────── */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="cc-kicker">Dispatch</div>
          <h2 className="mt-1.5 cc-font-display text-2xl tracking-tight md:text-[1.85rem]">
            {hasPersonalizationData ? "Tailored to you" : "The wider market"}
          </h2>
          <p className="mt-1 text-sm text-[color:var(--cc-ash)]">
            {hasPersonalizationData
              ? "Ranked against your profile, with the reasons shown."
              : "Add your target role to start tuning this feed."}
          </p>
        </div>

        <div className="flex items-center gap-2 cc-font-sans text-[12.5px] text-[color:var(--cc-ash)]">
          <span className="cc-tabular font-medium text-[color:var(--cc-ink-soft)]">{today()}</span>
          {!isLoading && itemCount > 0 && (
            <span className="cc-tabular">
              {[
                roles.length > 0 && `${roles.length} role${roles.length === 1 ? "" : "s"}`,
                stories.length > 0 && `${stories.length} stor${stories.length === 1 ? "y" : "ies"}`,
              ]
                .filter(Boolean)
                .map((s) => ` · ${s}`)
                .join("")}
            </span>
          )}
        </div>
      </div>

      {/* ── Body ─────────────────────────────────────────────── */}
      {isLoading ? (
        <FeedSkeleton />
      ) : error ? (
        <EmptyState
          icon={<Radio className="h-5 w-5" />}
          title="We couldn't load your feed"
          body={error}
          actionLabel="Try again"
          onAction={refresh}
        />
      ) : itemCount === 0 ? (
        <EmptyState
          icon={<Compass className="h-5 w-5" />}
          title={hasPersonalizationData ? "Nothing cleared the bar" : "Nothing to tune yet"}
          body={
            hasPersonalizationData
              ? "No stories or roles matched your profile this time. Turn a filter off below, or refresh."
              : "Tell us the role you're chasing and this feed starts ranking against it."
          }
          actionLabel={hasPersonalizationData ? "Refresh" : "Complete your profile"}
          onAction={hasPersonalizationData ? refresh : () => navigate("/settings")}
        />
      ) : (
        <>
          {roles.length > 0 && (
            <RolesStrip
              roles={roles}
              query={roleQuery}
              place={rolePlace}
              widened={roleWidened}
              canFit={canFit}
            />
          )}

          {lead && (
            <div className="mt-9">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <h3 className="cc-font-display text-[19px] tracking-tight text-[color:var(--cc-ink)]">
                  In the news
                </h3>
                <div
                  className="flex items-center gap-2 cc-font-sans text-[12.5px] text-[color:var(--cc-ash)]"
                  aria-label={`${readCount} of ${stories.length} stories read`}
                >
                  <span className="flex gap-1" aria-hidden>
                    {stories.map((s) => (
                      <span key={s.key} className={`fc-pip ${read.has(s.key) ? "is-on" : ""}`} />
                    ))}
                  </span>
                  <span className="cc-tabular">
                    {readCount === stories.length ? "All read" : `${readCount} of ${stories.length} read`}
                  </span>
                </div>
              </div>

              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, ease }}
                className="mt-4 grid grid-cols-1 gap-5 lg:grid-cols-[1.15fr_0.85fr] lg:items-start"
              >
                {/* Keyed so a new lead starts fresh rather than inheriting the
                    last one's broken-photo or missing-logo state. */}
                <LeadStory
                  key={lead.key}
                  item={lead}
                  read={read.has(lead.key)}
                  onOpen={() => markRead(lead.key)}
                />

                {rail.length > 0 && (
                  <div className="cc-surface overflow-hidden px-4 py-1 md:px-5">
                    {rail.map((item, i) => (
                      <motion.div
                        key={item.key}
                        initial={{ opacity: 0, x: 8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.4, delay: 0.08 + i * 0.06, ease }}
                      >
                        <RailItem item={item} read={read.has(item.key)} onOpen={() => markRead(item.key)} />
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>
            </div>
          )}
        </>
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
  <>
    <div className="mt-6 flex gap-3 overflow-hidden">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="cc-surface w-[264px] shrink-0 space-y-3 p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 animate-pulse rounded-xl bg-[color:var(--cc-cream-2)]" />
            <div className="h-3 w-24 animate-pulse rounded bg-[color:var(--cc-cream-2)]" />
          </div>
          <div className="h-5 w-4/5 animate-pulse rounded bg-[color:var(--cc-cream-2)]" />
          <div className="h-4 w-1/2 animate-pulse rounded bg-[color:var(--cc-cream-2)]" />
        </div>
      ))}
    </div>
    <div className="mt-9 grid grid-cols-1 gap-5 lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
      <div className="cc-surface overflow-hidden">
        <div className="h-36 w-full animate-pulse bg-[color:var(--cc-cream-2)]" />
        <div className="space-y-3 p-6">
          <div className="h-3 w-24 animate-pulse rounded bg-[color:var(--cc-cream-2)]" />
          <div className="h-7 w-4/5 animate-pulse rounded bg-[color:var(--cc-cream-2)]" />
          <div className="h-4 w-full animate-pulse rounded bg-[color:var(--cc-cream-2)]" />
        </div>
      </div>
      <div className="cc-surface px-5 py-1">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex gap-3.5 border-b border-[color:var(--cc-hair)] py-4 last:border-b-0">
            <div className="h-9 w-9 shrink-0 animate-pulse rounded-xl bg-[color:var(--cc-cream-2)]" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-full animate-pulse rounded bg-[color:var(--cc-cream-2)]" />
              <div className="h-3 w-1/2 animate-pulse rounded bg-[color:var(--cc-cream-2)]" />
            </div>
          </div>
        ))}
      </div>
    </div>
  </>
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
