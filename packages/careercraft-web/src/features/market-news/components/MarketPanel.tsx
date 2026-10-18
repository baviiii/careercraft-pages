import { AlertCircle, ArrowRight, Briefcase, Search } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";

import { relativeTime } from "@/features/dispatch/lib/time";
import { supabase } from "@/integrations/supabase/client";
import { sanitize } from "@/lib/security/sanitizers";

import { bandRows, count, middleBand, money, monthLabel, shortPlace, type MarketSnapshot } from "../lib/market";
import { trackedCompanyIn } from "../lib/news";
import { BarList } from "./BarList";
import { SalaryLine } from "./SalaryLine";

/** For someone with no role saved: a spread of common Australian jobs. */
const STARTERS = ["Registered Nurse", "Electrician", "Accountant", "Software Engineer", "Teacher", "Retail Assistant"];

type Status = "idle" | "loading" | "ready" | "error";

interface MarketPanelProps {
  /** The profile's role, searched first. Empty means every job in Australia. */
  profileRole: string;
  suggestions: string[];
  trackedCompanies: string[];
}

/**
 * One role's market across Australia, in Adzuna's own figures: how many ads
 * are live, what they advertise, where they are, who posts the most, and how
 * advertised pay has moved month to month. Each block says where its number
 * comes from, and a block whose figure didn't come back is left out rather
 * than filled in.
 */
export const MarketPanel = ({ profileRole, suggestions, trackedCompanies }: MarketPanelProps) => {
  const navigate = useNavigate();
  const [role, setRole] = useState(profileRole);
  const [data, setData] = useState<MarketSnapshot | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const latest = useRef(0);

  const load = useCallback(async (asked: string) => {
    const run = ++latest.current;
    setStatus("loading");
    try {
      const query = sanitize(asked.trim(), { maxLength: 120, sqlSafe: false });
      const { data: body, error } = await supabase.functions.invoke("job-news", {
        body: { action: "market_snapshot", query },
      });
      if (run !== latest.current) return;
      if (error) throw error;
      setData(body as MarketSnapshot);
      setStatus("ready");
    } catch (e) {
      if (run !== latest.current) return;
      console.error("[market-news] snapshot failed:", e);
      setStatus("error");
    }
  }, []);

  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    setRole(profileRole);
    void load(profileRole);
  }, [profileRole, load]);

  const submit = (e?: FormEvent) => {
    e?.preventDefault();
    void load(role);
  };
  const pick = (r: string) => {
    setRole(r);
    void load(r);
  };

  const shown = data?.role ?? "";
  const what = shown ? shown : "all jobs";
  const refetching = status === "loading" && data !== null;
  const middle = data ? middleBand(data.salaryBands) : null;
  const bands = data ? bandRows(data.salaryBands) : [];
  const history = data?.salaryHistory ?? [];
  const first = history[0];
  const last = history[history.length - 1];

  return (
    <section aria-label="Your market" className="space-y-6">
      <form onSubmit={submit} className="cc-surface flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:p-5">
        <label htmlFor="mn-role" className="cc-font-sans text-[15px] text-[color:var(--cc-ink-soft)] sm:shrink-0">
          The market for
        </label>
        <input
          id="mn-role"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          placeholder="any job"
          list="mn-role-suggestions"
          autoComplete="off"
          className="cc-role-input cc-font-display min-w-0 flex-1"
        />
        <datalist id="mn-role-suggestions">
          {suggestions.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
        <span className="hidden cc-font-sans text-[15px] text-[color:var(--cc-ink-soft)] sm:inline">across Australia</span>
        <button type="submit" disabled={status === "loading"} className="cc-action cc-action--sm shrink-0">
          <Search className="h-3.5 w-3.5" /> Show
        </button>
      </form>

      {!profileRole && (
        <div className="flex flex-wrap items-center gap-2 cc-font-sans text-[13px]">
          <span className="text-[color:var(--cc-ash)]">Try</span>
          {STARTERS.map((s) => (
            <button key={s} type="button" className="cc-topic" onClick={() => pick(s)}>
              {s}
            </button>
          ))}
        </div>
      )}

      {status === "loading" && !data && (
        <div className="space-y-4" aria-hidden>
          <div className="cc-skel h-14 w-64" />
          <div className="grid gap-4 lg:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="cc-surface h-56 p-5">
                <div className="cc-skel h-4 w-40" />
                <div className="mt-5 space-y-3">
                  {Array.from({ length: 5 }).map((__, j) => (
                    <div key={j} className="cc-skel h-3" style={{ width: `${90 - j * 12}%` }} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {status === "error" && (
        <div className="rounded-2xl border border-[color:var(--cc-hair)] bg-white px-6 py-10 text-center">
          <div className="cc-font-display text-xl tracking-tight">We couldn't reach the job board</div>
          <p className="mx-auto mt-2 max-w-sm cc-font-sans text-[14px] text-[color:var(--cc-ink-soft)]">
            It's usually a blip on Adzuna's side. Give it another go.
          </p>
          <button type="button" onClick={() => submit()} className="cc-action cc-action--sm mt-5">
            Try again
          </button>
        </div>
      )}

      {data && status !== "error" && (
        <div className={`space-y-6 transition-opacity ${refetching ? "opacity-50" : ""}`} aria-busy={refetching}>
          {data.total !== null && (
            <div>
              <p className="cc-hero-figure cc-font-sans">{count(data.total)}</p>
              <p className="mt-1 cc-font-sans text-[15px] text-[color:var(--cc-ink-soft)]">
                live ads for <strong className="font-semibold text-[color:var(--cc-ink)]">{what}</strong> across Australia
                {data.averageSalary !== null && data.averageSalary > 0 && (
                  <> · they advertise {money(data.averageSalary, true)} a year on average</>
                )}
              </p>
            </div>
          )}

          {data.total === 0 && (
            <p className="cc-font-sans text-[15px] text-[color:var(--cc-ink-soft)]">
              No live ads match that wording. A broader title usually finds them.
            </p>
          )}

          {data.partial && (
            <p className="flex items-center gap-2 cc-font-sans text-[13.5px] text-[color:var(--cc-wheat-deep)]">
              <AlertCircle className="h-4 w-4 flex-none" />
              Some of these figures didn't come back from Adzuna this time, so those parts are missing.
            </p>
          )}

          <div className="grid gap-4 lg:grid-cols-2">
            {bands.length > 0 && (
              <div className="cc-surface p-5">
                <h3 className="cc-font-display text-lg tracking-tight">What the ads pay</h3>
                <p className="mt-1 cc-font-sans text-[13.5px] text-[color:var(--cc-ink-soft)]">
                  {middle !== null ? `The middle ad sits in the ${bands[middle].label} band.` : ""} Only ads that state pay are
                  counted.
                </p>
                <div className="mt-4">
                  <BarList
                    label="Ads per salary band"
                    format={count}
                    rows={bands.map((b, i) => ({ ...b, marked: i === middle }))}
                  />
                </div>
              </div>
            )}

            {data.places.length > 0 && (
              <div className="cc-surface p-5">
                <h3 className="cc-font-display text-lg tracking-tight">Where the ads are</h3>
                <p className="mt-1 cc-font-sans text-[13.5px] text-[color:var(--cc-ink-soft)]">
                  Live ads by state and territory.
                </p>
                <div className="mt-4">
                  <BarList
                    label="Ads per state"
                    format={count}
                    rows={data.places.map((p) => ({ label: shortPlace(p.name), value: p.count }))}
                  />
                </div>
              </div>
            )}

            {data.companies.length > 0 && (
              <div className="cc-surface p-5">
                <h3 className="cc-font-display text-lg tracking-tight">Who's advertising most</h3>
                <p className="mt-1 cc-font-sans text-[13.5px] text-[color:var(--cc-ink-soft)]">
                  Employers with the most live ads. Recruiters advertising for clients count under their own name.
                </p>
                <div className="mt-4">
                  <BarList
                    label="Ads per employer"
                    format={count}
                    rows={data.companies.map((c) => ({
                      label: c.name,
                      value: c.count,
                      tag: trackedCompanyIn(c.name, trackedCompanies) ? (
                        <span className="cc-tracked cc-tracked--sm">
                          <Briefcase className="h-3 w-3" /> tracked
                        </span>
                      ) : undefined,
                    }))}
                  />
                </div>
              </div>
            )}

            {history.length >= 3 && first && last && (
              <div className="cc-surface p-5">
                <h3 className="cc-font-display text-lg tracking-tight">Advertised pay, month by month</h3>
                <p className="mt-1 cc-font-sans text-[13.5px] text-[color:var(--cc-ink-soft)]">
                  The average across ads that state pay: {money(first.average, true)} in {monthLabel(first.month)},{" "}
                  {money(last.average, true)} in {monthLabel(last.month)}.
                </p>
                <div className="mt-4">
                  <SalaryLine points={history} />
                </div>
                <details className="mt-3 cc-font-sans text-[13px]">
                  <summary className="cursor-pointer text-[color:var(--cc-ink-soft)] hover:text-[color:var(--cc-ink)]">
                    Show as a table
                  </summary>
                  <table className="mt-2 w-full text-left">
                    <thead>
                      <tr className="text-[color:var(--cc-ash)]">
                        <th className="py-1 font-medium">Month</th>
                        <th className="py-1 text-right font-medium">Average advertised</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.map((h) => (
                        <tr key={h.month} className="border-t border-[color:var(--cc-hair)]">
                          <td className="py-1">{monthLabel(h.month)}</td>
                          <td className="py-1 text-right cc-tabular">{money(h.average, true)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </details>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3 border-t border-[color:var(--cc-hair)] pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="cc-font-sans text-xs leading-relaxed text-[color:var(--cc-ash)]">
              Figures from live Australian ads on{" "}
              <a
                href="https://www.adzuna.com.au"
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2 hover:text-[color:var(--cc-ink)]"
              >
                Adzuna
              </a>
              , checked {relativeTime(data.fetchedAt)}. Pay is what ads advertise, and many don't list it.
            </p>
            <button
              type="button"
              onClick={() => navigate(shown ? `/au-jobs?query=${encodeURIComponent(shown)}` : "/au-jobs")}
              className="cc-action cc-action--ghost cc-action--sm shrink-0"
            >
              See these jobs <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </section>
  );
};
