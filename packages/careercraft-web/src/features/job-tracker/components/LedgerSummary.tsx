import { motion } from "framer-motion";

import { STATUS_ACCENT, STATUS_META, STATUS_ORDER, toRoman } from "../types";
import type { ApplicationStatus, JobApplication } from "../types";

interface LedgerSummaryProps {
  applications: JobApplication[];
  stats: Record<ApplicationStatus, number> & { total: number };
}

/**
 * Editorial ledger banner that replaces the generic four-plate stats strip.
 * One typeset row of status glyphs in their own colours, plus a second line
 * of warm calculated metrics (reply rate, turnaround, last filed).
 */
export const LedgerSummary = ({ applications, stats }: LedgerSummaryProps) => {
  const lastApplied = applications[0]?.applied_date
    ? new Date(applications[0].applied_date)
    : null;
  const lastFiled = lastApplied
    ? new Intl.DateTimeFormat("en-AU", { month: "short", day: "numeric" }).format(lastApplied)
    : "—";

  // Saved jobs haven't been sent anywhere, so they can't have been replied to.
  const replied = stats.interview + stats.offer + stats.rejected;
  const sent = stats.total - stats.saved;
  const replyRate = sent > 0 ? Math.round((replied / sent) * 100) : 0;

  const turnaround = (() => {
    const dated = applications
      .map((a) => {
        const filed = new Date(a.applied_date).getTime();
        const moved = a.last_status_change_at ? new Date(a.last_status_change_at).getTime() : null;
        return moved && moved > filed ? (moved - filed) / 86400000 : null;
      })
      .filter((d): d is number => d !== null);
    if (!dated.length) return "—";
    const avg = dated.reduce((acc, d) => acc + d, 0) / dated.length;
    return `${avg.toFixed(1)}d`;
  })();

  return (
    <section
      aria-label="Ledger summary"
      className="border border-[color:var(--cc-hair-strong)] bg-[color:var(--cc-cream)]"
    >
      <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 divide-[color:var(--cc-hair-strong)]">
        {STATUS_ORDER.map((status, i) => {
          const accent = STATUS_ACCENT[status];
          const value = stats[status];
          const meta = STATUS_META[status];
          return (
            <motion.div
              key={status}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.4, ease: [0.2, 0.8, 0.2, 1] }}
              className="px-4 md:px-5 py-4 md:py-5 flex items-start gap-3"
              style={{
                background:
                  value > 0
                    ? `linear-gradient(180deg, ${accent.soft} 0%, transparent 80%)`
                    : "transparent",
              }}
            >
              <div
                className="cc-font-sans flex-shrink-0 grid place-items-center w-9 h-9 rounded-full"
                style={{
                  background: accent.soft,
                  color: accent.deep,
                }}
              >
                <span className="text-xs font-semibold leading-none">{accent.mark}</span>
              </div>

              <div className="min-w-0">
                <div className="cc-font-sans text-xs font-semibold" style={{ color: accent.deep }}>
                  {meta.label}
                </div>
                <div className="mt-1 flex items-baseline gap-3">
                  <span
                    className="cc-font-sans cc-tabular text-3xl md:text-4xl font-semibold leading-none"
                    style={{ color: "var(--cc-ink)" }}
                  >
                    {String(value).padStart(2, "0")}
                  </span>
                  <span className="cc-font-sans text-xs text-[color:var(--cc-ash)] lowercase">
                    {toRoman(value)}
                  </span>
                </div>
                <div className="mt-1 cc-font-sans text-xs text-[color:var(--cc-ink-soft)]">
                  {accent.note}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="border-t border-[color:var(--cc-hair-strong)] px-4 md:px-5 py-3 flex flex-wrap items-center gap-x-6 gap-y-1.5">
        <RailMetric label="Ledger total" value={String(stats.total).padStart(2, "0")} suffix="entries" />
        <RailMetric label="Reply rate" value={`${replyRate}%`} suffix={`of ${sent} sent`} />
        <RailMetric label="Avg. turnaround" value={turnaround} suffix="to first reply" />
        <div className="ml-auto flex items-center gap-2 cc-font-sans text-xs text-[color:var(--cc-ash)]">
          <span className="cc-font-sans text-xs text-[color:var(--cc-ink-soft)]">
            last filed
          </span>
          <span className="cc-tabular text-[color:var(--cc-ink)]">{lastFiled}</span>
        </div>
      </div>
    </section>
  );
};

const RailMetric = ({
  label,
  value,
  suffix,
}: {
  label: string;
  value: string;
  suffix?: string;
}) => (
  <div className="inline-flex items-baseline gap-2">
    <span className="cc-font-sans text-xs text-[color:var(--cc-ash)]">{label}</span>
    <span className="cc-font-sans cc-tabular text-sm font-semibold text-[color:var(--cc-ink)]">
      {value}
    </span>
    {suffix && (
      <span className="cc-font-sans text-xs text-[color:var(--cc-ash)]">{suffix}</span>
    )}
  </div>
);
