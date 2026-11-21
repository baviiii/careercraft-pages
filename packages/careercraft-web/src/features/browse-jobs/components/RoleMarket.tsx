import { ArrowDownRight, ArrowRight, ArrowUpRight, ChevronDown, ChevronUp } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";

import { relativeTime } from "@/features/dispatch/lib/time";
import { loadMarketSnapshot, MarketQuota, MarketResting } from "@/features/market-news/lib/loadSnapshot";
import {
  bandRows,
  count,
  middleBand,
  money,
  monthLabel,
  shortPlace,
  type MarketSnapshot,
} from "@/features/market-news/lib/market";

import { isStateCode, stateOfPlace, TILE_AT, type StateCode } from "../lib/states";
import "../role-market.css";

interface RoleMarketProps {
  /** What the results on screen were searched for; empty is every job. Null until the first search lands. */
  role: string | null;
  /** Where they were searched, so the band can point at its state. */
  place: string;
  /** A new search is under way: the figures dim until it lands. */
  busy: boolean;
}

/** What the last load for a role came to. */
type Outcome =
  | { role: string; data: MarketSnapshot }
  | { role: string; failure: "failed" | "resting" | "quota"; say?: string };

/** As the page heading has it. */
const sentenceCase = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

/** "1 ad", "1,204 ads". */
const ads = (n: number) => `${count(n)} ad${n === 1 ? "" : "s"}`;

/* Folded away by this person: remembered in this browser. */
const FOLD_KEY = "cc-browse-market-folded";
function readFolded(): boolean {
  try {
    return localStorage.getItem(FOLD_KEY) === "1";
  } catch {
    return false;
  }
}

/**
 * The role's market across Australia, above the ads: how many are live and
 * where, what they pay, how advertised pay has moved, and who posts the
 * most. Adzuna's own figures over every live ad, the same ones Market news'
 * "Your market" shows in full (job-news' market_snapshot). A figure that
 * didn't come back leaves its panel out. Figures are only ever shown for
 * the role searched, and once open the band keeps its height: no figures
 * is said in place, so the ads under it don't jump. Folded, it asks for
 * nothing.
 */
export const RoleMarket = ({ role, place, busy }: RoleMarketProps) => {
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [loading, setLoading] = useState(false);
  const [folded, setFolded] = useState(readFolded);
  /** Bumped by "Try again". */
  const [attempt, setAttempt] = useState(0);

  const toggle = () => {
    const next = !folded;
    setFolded(next);
    try {
      localStorage.setItem(FOLD_KEY, next ? "1" : "0");
    } catch {
      // Not remembered, but it still folds.
    }
  };

  useEffect(() => {
    if (role === null || folded) return;
    let alive = true;
    setLoading(true);
    loadMarketSnapshot(role).then(
      (data) => {
        if (!alive) return;
        setOutcome({ role, data });
        setLoading(false);
      },
      (e) => {
        if (!alive) return;
        if (e instanceof MarketResting) setOutcome({ role, failure: "resting" });
        else if (e instanceof MarketQuota) setOutcome({ role, failure: "quota", say: e.message });
        else {
          console.error("[browse-jobs] market figures failed:", e);
          setOutcome({ role, failure: "failed" });
        }
        setLoading(false);
      },
    );
    return () => {
      alive = false;
    };
  }, [role, folded, attempt]);

  const mine = outcome && outcome.role === role ? outcome : null;
  const failure = mine && "failure" in mine ? mine.failure : null;
  /* A new search landing for the same role asks again when the last ask
     failed: the role is unchanged, so nothing else would. */
  const wasBusy = useRef(busy);
  useEffect(() => {
    if (wasBusy.current && !busy && failure) setAttempt((n) => n + 1);
    wasBusy.current = busy;
  }, [busy, failure]);

  if (folded) {
    return (
      <section className="cc-rmkt" aria-labelledby="cc-rmkt-title">
        <Head role={role} open={false} onToggle={toggle} />
      </section>
    );
  }

  /* How many panels to hold room for: three for a role (no pay by month,
     which Adzuna keeps for every job only), four for every job. Before the
     first search lands, most likely a role. */
  const expected = role === "" ? 4 : 3;
  const data = mine && "data" in mine ? mine.data : null;
  const panels = data ? marketPanels(data, place) : [];

  let body: ReactNode;
  if (failure) {
    body = (
      <Unavailable
        panels={expected}
        say={
          failure === "quota" && mine && "say" in mine && mine.say
            ? mine.say
            : failure === "resting"
              ? "Market figures for new roles are paused for a while, so job search keeps working."
              : "Couldn't get the market figures just now."
        }
      >
        {failure !== "quota" && (
          <button
            type="button"
            disabled={loading}
            onClick={() => setAttempt((n) => n + 1)}
            className="cc-rmkt__act"
          >
            {loading ? "Trying…" : "Try again"}
          </button>
        )}
      </Unavailable>
    );
  } else if (data && panels.length === 0) {
    body = <Unavailable panels={expected} say="Adzuna has no market figures for this role just now." />;
  } else if (data) {
    body = (
      <div className={`cc-rmkt__panels cc-rmkt__panels--n${panels.length}`} style={{ ["--n" as string]: panels.length }}>
        {panels.map((p, i) => (
          <div key={i} className="cc-rmkt__slot" style={{ ["--i" as string]: i }}>
            {p}
          </div>
        ))}
      </div>
    );
  } else {
    body = <PanelsSkeleton panels={expected} />;
  }

  return (
    <section
      className={`cc-rmkt ${data && (busy || loading) ? "is-dim" : ""}`}
      aria-labelledby="cc-rmkt-title"
      aria-busy={busy || loading}
    >
      <Head role={role} open onToggle={toggle} />
      <div id="cc-rmkt-panels" className="cc-font-sans">
        {body}
      </div>
      {data && panels.length > 0 && (
        <p className="cc-rmkt__foot cc-font-sans">
          Every live ad in Australia on Adzuna, checked {relativeTime(data.fetchedAt)}. Pay counts only the ads that
          state it.
        </p>
      )}
    </section>
  );
};

/** No figures to show, said over still placeholders the panels' height, so the ads under the band don't move. */
const Unavailable = ({ panels, say, children }: { panels: number; say: string; children?: ReactNode }) => (
  <div className="cc-rmkt__none">
    <PanelsSkeleton panels={panels} still />
    <div className="cc-rmkt__none-say" role="status">
      <p>{say}</p>
      {children}
    </div>
  </div>
);

/** One panel per figure that came back. */
function marketPanels(data: MarketSnapshot, place: string): ReactNode[] {
  const state = stateOfPlace(place);
  const here = state ? data.places.find((p) => shortPlace(p.name) === state) : undefined;
  const most = data.places[0];
  const bands = bandRows(data.salaryBands);
  const middle = middleBand(data.salaryBands);
  /* The bands count only ads that state pay, often a small share. */
  const listed = data.salaryBands.reduce((sum, b) => sum + b.count, 0);
  const average = data.averageSalary !== null && data.averageSalary > 0 ? data.averageSalary : null;
  const history = data.salaryHistory;
  const first = history[0];
  const last = history[history.length - 1];
  const companies = data.companies.slice(0, 3);

  const panels: ReactNode[] = [];

  if (data.total !== null || data.places.length > 0) {
    panels.push(
      <Panel key="ads" tone="cc-tone-cobalt" label="Live ads">
        <div className="cc-rmkt__split">
          <div className="min-w-0">
            {data.total !== null && <p className="cc-rmkt__figure">{count(data.total)}</p>}
            <p className="cc-rmkt__note">
              {data.total === 0 ? (
                "None across Australia use this wording. A broader title usually finds them."
              ) : here ? (
                <>
                  <strong>{count(here.count)}</strong> in {state}
                  {most && most !== here && <>, most in {shortPlace(most.name)}</>}
                </>
              ) : state && most ? (
                // Only states with ads come back, so one that's missing has none.
                <>
                  None in {state} just now, most in {shortPlace(most.name)}
                </>
              ) : most ? (
                <>Most are in {shortPlace(most.name)}</>
              ) : (
                "across Australia"
              )}
            </p>
          </div>
          {data.places.length > 0 && <StateTiles places={data.places} mark={here ? state : null} />}
        </div>
      </Panel>,
    );
  }

  if (middle !== null || average !== null) {
    panels.push(
      <Panel key="pay" tone="cc-tone-sage" label="What the ads pay">
        {middle !== null ? (
          <>
            <p className="cc-rmkt__figure">{bands[middle].label}</p>
            <p className="cc-rmkt__note">
              {listed === 1 ? "the one ad that lists pay" : `the middle of ${count(listed)} ads that list pay`}
              {average !== null && <> · average {money(average, true)}</>}
            </p>
            <PayColumns rows={bands} middle={middle} />
          </>
        ) : (
          average !== null && (
            <>
              <p className="cc-rmkt__figure">{money(average, true)}</p>
              <p className="cc-rmkt__note">the average advertised</p>
            </>
          )
        )}
      </Panel>,
    );
  }

  if (history.length >= 3 && first && last) {
    const change = (last.average - first.average) / first.average;
    const steady = Math.abs(change) < 0.005;
    panels.push(
      <Panel key="trend" tone="cc-tone-wheat" label="Advertised pay">
        <p className="cc-rmkt__figure">
          {steady ? (
            "Steady"
          ) : (
            <>
              {change > 0 ? (
                <ArrowUpRight className="cc-rmkt__arrow" aria-hidden />
              ) : (
                <ArrowDownRight className="cc-rmkt__arrow" aria-hidden />
              )}
              {`${change > 0 ? "+" : "−"}${Math.abs(change * 100).toFixed(1)}%`}
            </>
          )}
        </p>
        <p className="cc-rmkt__note">
          {money(first.average, true)} → <strong>{money(last.average, true)}</strong> since {monthLabel(first.month)}
        </p>
        <Spark points={history} />
      </Panel>,
    );
  }

  if (companies.length > 0) {
    const top = companies[0].count;
    panels.push(
      <Panel key="who" tone="cc-tone-ink" label="Advertising most">
        <ol className="cc-rmkt__who">
          {companies.map((c) => (
            <li key={c.name}>
              <span className="cc-rmkt__who-name" title={c.name}>
                {c.name}
              </span>
              <span className="cc-rmkt__who-n cc-tabular">{ads(c.count)}</span>
              <span className="cc-rmkt__who-bar" style={{ ["--w" as string]: (c.count / top).toFixed(3) }} aria-hidden />
            </li>
          ))}
        </ol>
      </Panel>,
    );
  }

  return panels;
}

/** The title, a link to the full figures on Market news, and the fold. */
const Head = ({ role, open, onToggle }: { role: string | null; open: boolean; onToggle: () => void }) => {
  const what = role ? sentenceCase(role) : "";
  return (
    <div className="cc-rmkt__head">
      <h2 id="cc-rmkt-title" className="cc-rmkt__title cc-font-display">
        {role === null ? (
          "The market"
        ) : what ? (
          <>
            The market for <span className="cc-rmkt__role">{what}</span>
          </>
        ) : (
          "The whole job market"
        )}
      </h2>
      <div className="cc-rmkt__acts cc-font-sans">
        {role !== null && (
          // role= even when empty: that's every job, where none would mean the profile's role.
          <Link
            to={`/job-market-news?tab=market&role=${encodeURIComponent(role)}`}
            className="cc-rmkt__act"
            aria-label="Full picture, on Market news"
          >
            <span className="hidden sm:inline">Full picture</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        )}
        <button
          type="button"
          onClick={onToggle}
          className="cc-rmkt__act"
          aria-expanded={open}
          aria-controls={open ? "cc-rmkt-panels" : undefined}
          aria-label={open ? "Hide the market figures" : "Show the market figures"}
        >
          <span className="hidden sm:inline">{open ? "Hide" : "Show"}</span>
          {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>
      </div>
    </div>
  );
};

const Panel = ({ tone, label, children }: { tone: string; label: string; children: ReactNode }) => (
  <div className={`cc-rmkt__panel ${tone}`}>
    <h3 className="cc-rmkt__label">{label}</h3>
    {children}
  </div>
);

/** A small tile map of Australia, each state shaded by its share of the ads. */
const StateTiles = ({ places, mark }: { places: MarketSnapshot["places"]; mark: StateCode | null }) => {
  const byState = new Map<StateCode, number>();
  for (const p of places) {
    const code = shortPlace(p.name);
    if (isStateCode(code)) byState.set(code, (byState.get(code) ?? 0) + p.count);
  }
  if (byState.size === 0) return null;
  const max = Math.max(...byState.values());
  const said = [...byState.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([code, n]) => `${code} ${count(n)}`)
    .join(", ");

  return (
    <div className="cc-rmkt__map" role="img" aria-label={`Live ads by state: ${said}`}>
      {(Object.keys(TILE_AT) as StateCode[]).map((code) => {
        const [col, row, tall = 1] = TILE_AT[code];
        const n = byState.get(code) ?? 0;
        return (
          <span
            key={code}
            className={`cc-rmkt__state ${code === mark ? "is-here" : ""}`}
            style={{
              gridColumn: col + 1,
              gridRow: `${row + 1} / span ${tall}`,
              ["--share" as string]: (n / max).toFixed(3),
            }}
            title={`${code}: ${ads(n)}`}
          >
            {code}
          </span>
        );
      })}
    </div>
  );
};

/** Ads per pay band as columns, the middle ad's band in full colour. Empty
    bands at either end are left off, so the columns start where ads do. */
const PayColumns = ({ rows: all, middle }: { rows: Array<{ label: string; value: number }>; middle: number }) => {
  const from = all.findIndex((r) => r.value > 0);
  const to = all.length - [...all].reverse().findIndex((r) => r.value > 0);
  const rows = all.slice(from, to);
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <div>
      <ul className="cc-rmkt__cols" aria-label="Ads per pay band">
        {rows.map((r, i) => (
          <li
            key={r.label}
            className={from + i === middle ? "is-mid" : ""}
            style={{ ["--h" as string]: Math.max(0.04, r.value / max).toFixed(3) }}
            title={`${r.label}: ${ads(r.value)}`}
          >
            <span className="sr-only">
              {r.label}: {ads(r.value)}
            </span>
          </li>
        ))}
      </ul>
      {rows.length > 1 && (
        <div className="cc-rmkt__axis cc-tabular" aria-hidden>
          <span>{rows[0].label.split("–")[0]}</span>
          <span>{rows[rows.length - 1].label}</span>
        </div>
      )}
    </div>
  );
};

/** Average advertised pay per month, as a line. The note above says where
    it starts and ends. The scale spans at least ±4% of the level, so a
    change too small to call isn't drawn as a swing. */
const Spark = ({ points }: { points: MarketSnapshot["salaryHistory"] }) => {
  const W = 240;
  const H = 50;
  const P = 5;
  const values = points.map((p) => p.average);
  const mid = (Math.min(...values) + Math.max(...values)) / 2;
  const half = Math.max((Math.max(...values) - Math.min(...values)) / 2, mid * 0.04);
  const x = (i: number) => P + (i / (points.length - 1)) * (W - 2 * P);
  const y = (v: number) => P + (0.5 - (v - mid) / (2 * half)) * (H - 2 * P);
  const line = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.average).toFixed(1)}`).join(" ");
  const end = points.length - 1;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="cc-rmkt__spark" aria-hidden>
      <path d={`${line} L${x(end).toFixed(1)},${H} L${x(0).toFixed(1)},${H} Z`} className="cc-rmkt__spark-area" />
      <path d={line} className="cc-rmkt__spark-line" />
      <circle cx={x(end)} cy={y(values[end])} r={4} className="cc-rmkt__spark-dot" />
    </svg>
  );
};

const PanelsSkeleton = ({ panels, still = false }: { panels: number; still?: boolean }) => (
  <div
    className={`cc-rmkt__panels cc-rmkt__panels--n${panels} ${still ? "is-still" : ""}`}
    style={{ ["--n" as string]: panels }}
    aria-hidden
  >
    {Array.from({ length: panels }).map((_, i) => (
      <div key={i} className="cc-rmkt__slot">
        <div className="cc-rmkt__panel">
          <div className="cc-skel h-3 w-24" />
          <div className="cc-skel mt-3 h-8 w-32" />
          <div className="cc-skel mt-2 h-3 w-36 max-w-full" />
          <div className="cc-skel mt-4 h-[84px]" />
        </div>
      </div>
    ))}
  </div>
);
