import type { ReactNode } from "react";

import type { RefineKey } from "../lib/refine";
import { k, type SearchSummary as Summary } from "../lib/summary";

interface SearchSummaryProps {
  summary: Summary;
  /** Turns a refine chip on, so a fact here doubles as a shortcut. */
  onRefine: (key: RefineKey) => void;
}

const pct = (n: number, total: number) => (total ? Math.round((n / total) * 100) : 0);

/**
 * A few plain facts about the jobs on screen. Every line is counted from the
 * loaded results; nothing here is a forecast or a model's opinion.
 */
export const SearchSummary = ({ summary: s, onRefine }: SearchSummaryProps) => (
  <section className="cc-summary cc-font-sans" aria-labelledby="in-this-search">
    <h2 id="in-this-search" className="cc-label-sm text-[color:var(--cc-ash)]">
      In this search
    </h2>

    <Fact label="Pay">
      {s.typicalPay ? (
        <>
          <span className="cc-font-display text-2xl font-semibold tracking-tight text-[color:var(--cc-ink)]">
            {k(s.typicalPay[0])}–{k(s.typicalPay[1])}
          </span>
          <span className="mt-0.5 block text-[12.5px] text-[color:var(--cc-ash)]">
            typical, from the {s.payStated} ads that list pay
          </span>
        </>
      ) : (
        <span className="text-[14px] text-[color:var(--cc-ink-soft)]">
          {s.payStated === 0 ? "None of these ads list pay." : "Too few ads list pay to say."}
        </span>
      )}
    </Fact>

    <Fact label="Hours">
      <Split label="Full-time" n={s.fullTime} total={s.total} onClick={() => onRefine("full-time")} />
      <Split label="Part-time" n={s.partTime} total={s.total} onClick={() => onRefine("part-time")} />
      <Split label="Remote" n={s.remote} total={s.total} sage onClick={() => onRefine("remote")} />
    </Fact>

    <Fact label="Fresh">
      <button
        type="button"
        onClick={() => onRefine("week")}
        className="text-left text-[14px] text-[color:var(--cc-ink-soft)] hover:text-[color:var(--cc-ink)]"
      >
        <strong className="font-semibold text-[color:var(--cc-ink)]">{s.thisWeek}</strong> posted this week
      </button>
    </Fact>

    {s.topCompanies.length > 0 && (
      <Fact label="Hiring more than once">
        <ul className="space-y-1">
          {s.topCompanies.map((c) => (
            <li key={c.name} className="flex items-baseline justify-between gap-3 text-[14px]">
              <span className="truncate text-[color:var(--cc-ink)]">{c.name}</span>
              <span className="cc-tabular text-[12.5px] text-[color:var(--cc-ash)]">{c.count} ads</span>
            </li>
          ))}
        </ul>
      </Fact>
    )}

    <p className="mt-4 border-t border-[color:var(--cc-hair)] pt-3 text-[12px] leading-snug text-[color:var(--cc-ash)]">
      Counted from the {s.total} jobs loaded. Estimated pay is Adzuna's guess, so it isn't included.
    </p>
  </section>
);

const Fact = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="mt-4">
    <div className="mb-1.5 text-[12.5px] font-medium text-[color:var(--cc-ash)]">{label}</div>
    {children}
  </div>
);

const Split = ({
  label,
  n,
  total,
  sage,
  onClick,
}: {
  label: string;
  n: number;
  total: number;
  sage?: boolean;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={n === 0}
    className="group mb-2 block w-full text-left disabled:cursor-default"
  >
    <span className="flex items-baseline justify-between text-[13.5px]">
      <span className="text-[color:var(--cc-ink-soft)] group-hover:text-[color:var(--cc-ink)] group-disabled:group-hover:text-[color:var(--cc-ink-soft)]">
        {label}
      </span>
      <span className="cc-tabular text-[12.5px] text-[color:var(--cc-ash)]">{n}</span>
    </span>
    <span className={`cc-tally mt-1 ${sage ? "cc-tally--sage" : ""}`}>
      <span style={{ width: `${pct(n, total)}%` }} />
    </span>
  </button>
);
