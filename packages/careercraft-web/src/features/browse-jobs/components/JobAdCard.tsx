import { ArrowUpRight, Check, Clock, Loader2, MapPin, Plus } from "lucide-react";
import { useRef } from "react";

import type { MatchBand } from "@/hooks/usePersonalization";
import { avatarTone, initials } from "@/features/job-tracker/lib/cardBits";
import type { JobCatalogJob } from "@/features/job-tracker/types";

import { payLabel, postedLabel, typeLabel } from "../lib/summary";

export interface Fit {
  match: number;
  band: MatchBand;
  reasons: string[];
}

interface JobAdCardProps {
  job: JobCatalogJob;
  /** Position in the list, for the staggered entrance. */
  index: number;
  fit: Fit | null;
  tracked: boolean;
  saving: boolean;
  onSave: (job: JobCatalogJob, from: HTMLElement | null) => void;
  onOpenTracker: () => void;
}

const FIT_WORDS: Record<MatchBand, string> = {
  strong: "Strong fit",
  good: "Good fit",
  fair: "Worth a look",
  low: "",
};
const FIT_DOTS: Record<MatchBand, number> = { strong: 3, good: 2, fair: 1, low: 0 };

/**
 * One ad. Who and what first, then the facts that decide whether to bother
 * (pay, hours, remote, how fresh), then why it might suit you, in words.
 * Saving drops it in the tracker's Saved lane.
 */
export const JobAdCard = ({ job, index, fit, tracked, saving, onSave, onOpenTracker }: JobAdCardProps) => {
  const saveRef = useRef<HTMLButtonElement>(null);
  const tone = avatarTone(job.company || job.title);
  const pay = payLabel(job);
  const posted = postedLabel(job.posted_at);
  const showFit = fit && fit.band !== "low" && fit.match > 0;

  return (
    <article
      className={`cc-jobad ${tracked ? "is-tracked" : ""}`}
      style={{ ["--i" as string]: Math.min(index, 10) }}
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className="grid h-10 w-10 flex-none place-items-center rounded-[11px] cc-font-display text-sm font-bold"
          style={{ background: tone.bg, color: tone.fg }}
        >
          {initials(job.company || job.title)}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="cc-font-display text-[17px] font-semibold leading-snug text-[color:var(--cc-ink)]">
            {job.canonical_url ? (
              <a
                href={job.canonical_url}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-sm hover:text-[color:var(--cc-rust)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--cc-rust)]"
              >
                {job.title}
              </a>
            ) : (
              job.title
            )}
          </h3>
          <p className="mt-0.5 truncate cc-font-sans text-[13.5px] text-[color:var(--cc-ink-soft)]">
            {job.company}
          </p>
        </div>
        {showFit && (
          <span className="cc-fit cc-font-sans" data-band={fit.band} title={fit.reasons.join(" · ") || undefined}>
            <span className="cc-fit__dots" aria-hidden>
              {[1, 2, 3].map((d) => (
                <i key={d} className={d <= FIT_DOTS[fit.band] ? "on" : ""} />
              ))}
            </span>
            {FIT_WORDS[fit.band]}
          </span>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5 cc-font-sans">
        {pay && (
          <span
            className={`cc-jobad__chip ${job.salary_is_predicted ? "cc-jobad__chip--est" : "cc-jobad__chip--pay"}`}
            title={job.salary_is_predicted ? "Adzuna's estimate. The ad doesn't list pay." : "Listed in the ad"}
          >
            {pay}
            {job.salary_is_predicted ? " est." : ""}
          </span>
        )}
        {job.job_type && (
          <span className="cc-jobad__chip">{typeLabel(job.job_type)}</span>
        )}
        {job.is_remote && <span className="cc-jobad__chip cc-jobad__chip--remote">Remote</span>}
        {job.location && (
          <span className="cc-jobad__chip min-w-0 max-w-full">
            <MapPin className="h-3 w-3 flex-none" />
            <span className="truncate">{job.location}</span>
          </span>
        )}
      </div>

      {job.description_snippet && (
        <p className="mt-3 line-clamp-2 cc-font-sans text-[14px] leading-relaxed text-[color:var(--cc-ink-soft)]">
          {job.description_snippet}
        </p>
      )}

      {showFit && fit.reasons.length > 0 && (
        <p className="mt-2.5 cc-font-sans text-[12.5px] text-[color:var(--cc-signal-deep)]">
          {fit.reasons.slice(0, 2).join(" · ")}
        </p>
      )}

      <div className="mt-auto flex flex-wrap items-center justify-between gap-x-3 gap-y-2 pt-4">
        {tracked ? (
          <button type="button" className="cc-save is-saved" onClick={onOpenTracker}>
            <Check className="h-3.5 w-3.5" /> In your tracker
          </button>
        ) : (
          <button
            ref={saveRef}
            type="button"
            className="cc-save"
            disabled={saving}
            onClick={() => onSave(job, saveRef.current)}
          >
            {saving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin motion-reduce:[animation-duration:1.8s]" />
            ) : (
              <Plus className="h-3.5 w-3.5" />
            )}
            Save to tracker
          </button>
        )}
        <div className="flex items-center gap-3 cc-font-sans text-[13px]">
          {posted && (
            <span className="inline-flex items-center gap-1 text-[color:var(--cc-ash)]">
              <Clock className="h-3 w-3" />
              {posted}
            </span>
          )}
          {job.canonical_url && (
            <a
              href={job.canonical_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-0.5 font-medium text-[color:var(--cc-ink)] hover:text-[color:var(--cc-rust)]"
            >
              See the ad
              <ArrowUpRight className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
      </div>
    </article>
  );
};
