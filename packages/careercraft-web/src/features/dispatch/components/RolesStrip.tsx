import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";

import type { DispatchRole } from "../types";
import { useTrackerSaves } from "../hooks/useTrackerSaves";
import { RoleTicket } from "./RoleTicket";

/**
 * The open roles, side by side in a strip you can swipe or step through,
 * best fit first. A row of them says "there's work out there" in a way one
 * card can't.
 */
export const RolesStrip = ({
  roles,
  query,
  place,
  widened,
  canFit,
}: {
  roles: DispatchRole[];
  query: string;
  place: string | null;
  /** Local roles ran short and Australia-wide ones filled the strip. */
  widened: boolean;
  /** Ranked by fit to the profile, best first. */
  canFit: boolean;
}) => {
  const { isTracked, save, savingId } = useTrackerSaves();
  const track = useRef<HTMLDivElement>(null);
  const [edge, setEdge] = useState({ start: true, end: true });

  const measure = useCallback(() => {
    const el = track.current;
    if (!el) return;
    setEdge({
      start: el.scrollLeft <= 4,
      end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4,
    });
  }, []);

  useEffect(() => {
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [measure, roles.length]);

  const step = (dir: -1 | 1) => {
    const el = track.current;
    if (!el) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: reduce ? "auto" : "smooth" });
  };

  const n = roles.length;
  const what = query ? `${query} role${n === 1 ? "" : "s"}` : `open role${n === 1 ? "" : "s"}`;
  const where = place ? (widened ? `near ${place} and further afield` : `near ${place}`) : "across Australia";
  const strong = roles.filter((r) => r.fit?.band === "strong").length;

  return (
    <div className="mt-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h3 className="flex items-center gap-2 cc-font-display text-[19px] tracking-tight text-[color:var(--cc-ink)]">
            <span className="fc-live" aria-hidden />
            Hiring now
          </h3>
          <p className="mt-0.5 cc-font-sans text-sm text-[color:var(--cc-ash)]">
            <span className="cc-tabular font-semibold text-[color:var(--cc-ink-soft)]">{n}</span> {what} {where}
            {canFit && (
              <>
                {" · "}
                {strong > 0 ? (
                  <span className="font-medium text-[color:var(--cc-signal-deep)]">
                    {strong} strong fit{strong === 1 ? "" : "s"}
                  </span>
                ) : (
                  "best fit first"
                )}
              </>
            )}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          {!(edge.start && edge.end) && (
            <>
              <button
                type="button"
                className="fc-step"
                onClick={() => step(-1)}
                disabled={edge.start}
                aria-label="Earlier roles"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                className="fc-step"
                onClick={() => step(1)}
                disabled={edge.end}
                aria-label="More roles"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </>
          )}
          <Link to="/au-jobs" className="fc-seeall cc-font-sans">
            See all <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      <div ref={track} onScroll={measure} className="fc-roles" role="list">
        {roles.map((item, i) => (
          <div key={item.key} role="listitem" className="fc-roles__slot">
            <RoleTicket
              item={item}
              index={i}
              tracked={isTracked(item.job)}
              saving={savingId === item.job.id}
              onSave={() => void save(item.job)}
            />
          </div>
        ))}
      </div>

      {/* Adzuna's terms ask for this wherever their listings appear. */}
      <p className="mt-2 cc-font-sans text-xs text-[color:var(--cc-ash)]">
        Jobs by{" "}
        <a
          href="https://www.adzuna.com.au"
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2 hover:text-[color:var(--cc-ink)]"
        >
          Adzuna
        </a>
      </p>
    </div>
  );
};

export default RolesStrip;
