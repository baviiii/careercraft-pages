import { ArrowUpRight, Banknote, BookmarkPlus, Clock, Loader2, MapPin, RefreshCw, Search } from "lucide-react";
import type { Dispatch, SetStateAction } from "react";

import { avatarTone, initials } from "../lib/cardBits";
import type { JobCatalogJob } from "../types";

interface DiscoveryFilters {
  query: string;
  location: string;
}

interface WireDispatchProps {
  jobs: JobCatalogJob[];
  filters: DiscoveryFilters;
  setFilters: Dispatch<SetStateAction<DiscoveryFilters>>;
  isLoading: boolean;
  isIngesting: boolean;
  lastIngestSummary: string;
  onSearch: () => void;
  onRefresh: () => void;
  onSave: (id: string) => void;
}

/**
 * "Find more jobs": a search over the Adzuna feed, then the top six matches.
 * Saving one drops it in the Saved lane above. Adzuna's terms ask for a
 * "Jobs by Adzuna" credit wherever their listings appear; it sits under the
 * results.
 */
export const WireDispatch = ({
  jobs,
  filters,
  setFilters,
  isLoading,
  isIngesting,
  lastIngestSummary,
  onSearch,
  onRefresh,
  onSave,
}: WireDispatchProps) => {
  const visible = jobs.slice(0, 6);

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-[color:var(--cc-hair)] bg-white p-5 md:p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <p className="cc-font-sans text-[15px] text-[color:var(--cc-ink-soft)]">
            {filters.query || filters.location ? (
              <>
                Showing{" "}
                <span className="font-semibold text-[color:var(--cc-ink)]">{filters.query || "all roles"}</span>
                {filters.location ? ` in ${filters.location}` : ""}
              </>
            ) : (
              "New jobs from across Australia."
            )}
          </p>
          {jobs.length > 0 && (
            <span className="cc-tabular cc-font-sans text-xs text-[color:var(--cc-ash)]">
              {jobs.length} job{jobs.length === 1 ? "" : "s"}
            </span>
          )}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSearch();
          }}
          className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-[1fr_1fr_auto]"
        >
          <FilterField
            icon={<Search className="h-4 w-4" />}
            label="Role"
            placeholder="Nurse, data analyst, chef…"
            value={filters.query}
            onChange={(v) => setFilters((f) => ({ ...f, query: v }))}
          />
          <FilterField
            icon={<MapPin className="h-4 w-4" />}
            label="Where"
            placeholder="Adelaide, Sydney, remote…"
            value={filters.location}
            onChange={(v) => setFilters((f) => ({ ...f, location: v }))}
          />

          <div className="flex items-end gap-2">
            <button
              type="submit"
              disabled={isLoading}
              className="cc-action cc-action--sm h-[46px] flex-1 md:flex-none"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin motion-reduce:[animation-duration:1.8s]" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              Search
            </button>
            <button
              type="button"
              onClick={onRefresh}
              disabled={isIngesting}
              className="cc-action cc-action--ghost cc-action--sm h-[46px] flex-1 md:flex-none"
              title="Fetch the newest ads"
            >
              <RefreshCw
                className={`h-4 w-4 ${isIngesting ? "animate-spin motion-reduce:[animation-duration:1.8s]" : ""}`}
              />
              <span className="hidden sm:inline">{isIngesting ? "Refreshing…" : "Refresh"}</span>
            </button>
          </div>
        </form>

        {lastIngestSummary && (
          <p className="mt-3 cc-font-sans text-xs text-[color:var(--cc-ink-soft)]">{lastIngestSummary}</p>
        )}
      </div>

      {visible.length === 0 ? (
        <div className="rounded-2xl border border-[color:var(--cc-hair)] bg-white px-6 py-10 text-center">
          <div className="cc-font-display text-xl tracking-tight text-[color:var(--cc-ink)]">No jobs match that</div>
          <p className="mx-auto mt-2 max-w-sm cc-font-sans text-sm text-[color:var(--cc-ink-soft)]">
            Try a broader role or another city, or refresh for the newest ads.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((j) => (
            <JobAdCard key={j.id} job={j} onSave={() => onSave(j.id)} />
          ))}
        </div>
      )}

      <p className="cc-font-sans text-xs text-[color:var(--cc-ash)]">
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

const FilterField = ({
  icon,
  label,
  placeholder,
  value,
  onChange,
}: {
  icon: React.ReactNode;
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
}) => (
  <label className="flex flex-col gap-1.5">
    <span className="cc-label-sm text-[color:var(--cc-ash)]">{label}</span>
    <div className="group relative flex items-center">
      <span className="pointer-events-none absolute left-3 text-[color:var(--cc-ash)] transition-colors group-focus-within:text-[color:var(--cc-rust)]">
        {icon}
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-[46px] w-full rounded-xl border border-[color:var(--cc-hair-strong)] bg-white pl-9 pr-3 cc-font-sans text-sm text-[color:var(--cc-ink)] outline-none transition-all placeholder:text-[color:var(--cc-ash)] focus:border-[color:var(--cc-rust)] focus:shadow-[0_0_0_3px_var(--cc-rust-soft)]"
      />
    </div>
  </label>
);

const JobAdCard = ({ job, onSave }: { job: JobCatalogJob; onSave: () => void }) => {
  const postedAgo = job.posted_at ? humanise(job.posted_at) : null;
  const salary =
    job.salary_min && job.salary_max
      ? `${formatMoney(job.salary_min, job.currency)} – ${formatMoney(job.salary_max, job.currency)}`
      : job.salary_min
        ? `from ${formatMoney(job.salary_min, job.currency)}`
        : null;
  const tone = avatarTone(job.company || job.title);

  return (
    <article className="flex flex-col rounded-2xl border border-[color:var(--cc-hair)] bg-white p-5 transition-shadow hover:shadow-[0_14px_30px_-22px_rgba(20,22,26,0.5)]">
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className="grid h-10 w-10 flex-none place-items-center rounded-[10px] cc-font-display text-sm font-bold"
          style={{ background: tone.bg, color: tone.fg }}
        >
          {initials(job.company || job.title)}
        </span>
        <div className="min-w-0">
          <h3 className="cc-font-display text-[16px] font-semibold leading-snug text-[color:var(--cc-ink)] line-clamp-2">
            {job.title}
          </h3>
          <p className="mt-0.5 truncate cc-font-sans text-sm text-[color:var(--cc-ink-soft)]">{job.company}</p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5 cc-font-sans text-[12px]">
        {job.location && (
          <span className="inline-flex items-center gap-1 rounded-full bg-[color:var(--cc-cream-2)] px-2.5 py-1 text-[color:var(--cc-ink-soft)]">
            <MapPin className="h-3 w-3 text-[color:var(--cc-ash)]" />
            {job.location}
          </span>
        )}
        {job.is_remote && (
          <span className="rounded-full bg-[color:var(--cc-signal-soft)] px-2.5 py-1 font-medium text-[color:var(--cc-signal-deep)]">
            Remote
          </span>
        )}
        {salary && (
          <span
            className="inline-flex items-center gap-1 rounded-full bg-[color:var(--cc-rust-soft)] px-2.5 py-1 font-semibold text-[color:var(--cc-rust-deep)] cc-tabular"
            title={job.salary_is_predicted ? "Adzuna's estimate; the ad didn't say" : undefined}
          >
            <Banknote className="h-3 w-3" />
            {salary}
            {job.salary_is_predicted ? " (est.)" : ""}
          </span>
        )}
        {postedAgo && (
          <span className="inline-flex items-center gap-1 px-1 text-[color:var(--cc-ash)] cc-tabular">
            <Clock className="h-3 w-3" />
            {postedAgo}
          </span>
        )}
      </div>

      {job.description_snippet && (
        <p className="mt-3 cc-font-sans text-sm leading-relaxed text-[color:var(--cc-ink-soft)] line-clamp-3">
          {job.description_snippet}
        </p>
      )}

      <div className="mt-auto flex items-center justify-between gap-2 pt-4">
        <button type="button" onClick={onSave} className="cc-action cc-action--sm">
          <BookmarkPlus className="h-4 w-4" />
          Save to board
        </button>
        {job.canonical_url && (
          <a
            href={job.canonical_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 cc-font-sans text-[13px] font-medium text-[color:var(--cc-ink-soft)] transition-colors hover:text-[color:var(--cc-rust)]"
          >
            See the ad
            <ArrowUpRight className="h-3.5 w-3.5" />
          </a>
        )}
      </div>
    </article>
  );
};

function humanise(iso: string): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "";
  const diff = (Date.now() - t) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)}d ago`;
  return new Intl.DateTimeFormat("en-AU", { month: "short", day: "numeric" }).format(new Date(iso));
}

function formatMoney(n: number, currency: string | null): string {
  try {
    return new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency: currency || "AUD",
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return `$${Math.round(n).toLocaleString("en-AU")}`;
  }
}
