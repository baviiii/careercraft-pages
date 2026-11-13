import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, Banknote, Check, Loader2, MapPin, Plus } from "lucide-react";

import type { DispatchRole } from "../types";
import { relativeTime } from "../lib/time";
import { NameBadge } from "./Logos";

/** Posted inside this many days gets the "New" tag. */
const FRESH_DAYS = 3;

/**
 * One open role, as a ticket: who's hiring, the job, the facts, and a tear
 * line above the two things you can do with it. Saving stamps the ticket.
 */
export const RoleTicket = ({
  item,
  index,
  tracked,
  saving,
  onSave,
}: {
  item: DispatchRole;
  index: number;
  tracked: boolean;
  saving: boolean;
  onSave: () => void;
}) => {
  // Only a save made here gets the stamp landing; roles already in the
  // tracker just show it.
  const [stampNow, setStampNow] = useState(false);

  const posted = item.timestamp ? new Date(item.timestamp).getTime() : NaN;
  const days = Number.isNaN(posted) ? null : (Date.now() - posted) / 86_400_000;
  const fresh = days !== null && days < FRESH_DAYS;
  const reasons = item.relevance.reasons.filter((r) => r !== "Open now").slice(0, 2);

  return (
    <article
      className={`fc-ticket ${tracked ? "is-saved" : ""} ${tracked && stampNow ? "is-stamping" : ""}`}
      style={{ ["--i" as string]: Math.min(index, 8) }}
    >
      <div className="flex items-center gap-3">
        <NameBadge name={item.company || item.title} size={40} />
        <div className="min-w-0 flex-1">
          <p className="truncate cc-font-sans text-[13px] font-medium text-[color:var(--cc-ink-soft)]">
            {item.company || "Employer not named"}
          </p>
          <p className="mt-0.5 flex items-center gap-1.5 cc-font-sans text-[12px] text-[color:var(--cc-ash)]">
            {fresh && <span className="fc-new">New</span>}
            <span className="cc-tabular">{relativeTime(item.timestamp)}</span>
          </p>
        </div>
      </div>

      <h4 className="mt-3.5 line-clamp-2 cc-font-display text-[17px] leading-[1.2] tracking-[-0.01em] text-[color:var(--cc-ink)]">
        {item.url ? (
          <a href={item.url} target="_blank" rel="noopener noreferrer" className="fc-ticket__title">
            {item.title}
          </a>
        ) : (
          item.title
        )}
      </h4>

      <div className="mt-3 flex flex-wrap gap-1.5 cc-font-sans">
        {item.salary && (
          <span className="fc-tag fc-tag--pay cc-tabular">
            <Banknote className="h-3 w-3 flex-none" />
            {item.salary}
          </span>
        )}
        {item.isRemote && <span className="fc-tag fc-tag--remote">Remote</span>}
        {item.location && (
          <span className="fc-tag min-w-0 max-w-full">
            <MapPin className="h-3 w-3 flex-none" />
            <span className="truncate">{item.location}</span>
          </span>
        )}
      </div>

      {reasons.length > 0 && (
        <p className="mt-2.5 truncate cc-font-sans text-[12px] font-medium text-[color:var(--cc-signal-deep)]">
          {reasons.join(" · ")}
        </p>
      )}

      <div className="fc-ticket__tear" aria-hidden />

      <div className="flex items-center justify-between gap-2 cc-font-sans">
        {tracked ? (
          <Link to="/tracker" className="fc-save is-saved">
            <Check className="h-3.5 w-3.5" /> In your tracker
          </Link>
        ) : (
          <button
            type="button"
            className="fc-save"
            disabled={saving}
            onClick={() => {
              setStampNow(true);
              onSave();
            }}
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
            Save
          </button>
        )}
        {item.url && (
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-0.5 text-[13px] font-medium text-[color:var(--cc-ink)] hover:text-[color:var(--cc-rust)]"
          >
            See the ad <ArrowUpRight className="h-3.5 w-3.5" />
          </a>
        )}
      </div>

      {tracked && (
        <span className="fc-stamp" aria-hidden>
          Saved
        </span>
      )}
    </article>
  );
};

export default RoleTicket;
