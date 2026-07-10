import {
  ArrowUpRight,
  Banknote,
  BookmarkPlus,
  Building2,
  Clock,
  Loader2,
  MapPin,
  RefreshCw,
  Search,
  Signal,
  Sparkles,
} from "lucide-react";
import type { Dispatch, SetStateAction } from "react";

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
 * The Adzuna discovery feed — a live "wire" of external roles. A polished
 * search console up top, then a responsive gallery of job cards, styled on
 * the shared atelier surface system so it sits beside the pipeline cleanly.
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
    <div className="space-y-6">
      {/* ── Search console ─────────────────────────────────────── */}
      <div className="cc-surface cc-tone-cobalt relative overflow-hidden p-5 md:p-6">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full opacity-70 blur-3xl"
          style={{ background: "var(--cc-t-wash)" }}
        />

        <div className="relative flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="cc-icon-chip h-10 w-10">
              <Signal className="h-4 w-4" />
            </span>
            <div>
              <div className="cc-kicker">Live wire</div>
              <p className="mt-0.5 cc-font-sans text-sm text-[color:var(--cc-ink-soft)]">
                {filters.query || filters.location ? (
                  <>
                    Tuned to{" "}
                    <span className="font-semibold text-[color:var(--cc-ink)]">
                      {filters.query || "all roles"}
                    </span>
                    {filters.location ? ` · ${filters.location}` : ""}
                  </>
                ) : (
                  "Fresh roles pulled from across the market."
                )}
              </p>
            </div>
          </div>
          {jobs.length > 0 && (
            <span className="cc-font-sans text-xs text-[color:var(--cc-ash)] cc-tabular">
              {jobs.length} on the wire
            </span>
          )}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSearch();
          }}
          className="relative mt-5 grid grid-cols-1 gap-3 md:grid-cols-[1fr_1fr_auto]"
        >
          <FilterField
            icon={<Search className="h-4 w-4" />}
            label="Keyword"
            placeholder="Frontend engineer, designer…"
            value={filters.query}
            onChange={(v) => setFilters((f) => ({ ...f, query: v }))}
          />
          <FilterField
            icon={<MapPin className="h-4 w-4" />}
            label="Location"
            placeholder="Sydney, remote, NSW…"
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
                <Loader2 className="h-4 w-4 animate-spin" />
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
              title="Pull the latest roles from the source"
            >
              <RefreshCw className={`h-4 w-4 ${isIngesting ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">
                {isIngesting ? "Refreshing…" : "Pull wire"}
              </span>
            </button>
          </div>
        </form>

        {lastIngestSummary && (
          <p className="relative mt-3 inline-flex items-center gap-1.5 cc-font-sans text-xs text-[color:var(--cc-ink-soft)]">
            <Sparkles className="h-3 w-3 text-[color:var(--cc-rust)]" />
            {lastIngestSummary}
          </p>
        )}
      </div>

      {/* ── Results ────────────────────────────────────────────── */}
      {visible.length === 0 ? (
        <div className="cc-surface flex flex-col items-center px-6 py-12 text-center">
          <span className="cc-icon-chip cc-tone-cobalt h-12 w-12">
            <Signal className="h-5 w-5" />
          </span>
          <div className="mt-4 cc-font-display text-xl tracking-tight text-[color:var(--cc-ink)]">
            The wire is quiet
          </div>
          <p className="mt-2 max-w-sm cc-font-sans text-sm text-[color:var(--cc-ink-soft)]">
            No fresh dispatches in this slice — adjust the filters or pull the wire again.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((j, i) => (
            <WireCard key={j.id} job={j} index={i} onSave={() => onSave(j.id)} />
          ))}
        </div>
      )}
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
    <span className="cc-font-sans text-[11px] font-semibold uppercase tracking-[0.12em] text-[color:var(--cc-ash)]">
      {label}
    </span>
    <div className="group relative flex items-center">
      <span className="pointer-events-none absolute left-3 text-[color:var(--cc-ash)] transition-colors group-focus-within:text-[color:var(--cc-rust)]">
        {icon}
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-[46px] w-full rounded-xl border border-[color:var(--cc-hair-strong)] bg-white/80 pl-9 pr-3 cc-font-sans text-sm text-[color:var(--cc-ink)] outline-none transition-all placeholder:text-[color:var(--cc-ash)] focus:border-[color:var(--cc-rust)] focus:bg-white focus:shadow-[0_0_0_3px_var(--cc-rust-soft)]"
      />
    </div>
  </label>
);

const WireCard = ({
  job,
  index,
  onSave,
}: {
  job: JobCatalogJob;
  index: number;
  onSave: () => void;
}) => {
  const postedAgo = job.posted_at ? humanise(job.posted_at) : null;
  const salary =
    job.salary_min && job.salary_max
      ? `${formatMoney(job.salary_min, job.currency)} – ${formatMoney(job.salary_max, job.currency)}`
      : job.salary_min
        ? `from ${formatMoney(job.salary_min, job.currency)}`
        : null;
  const initial = (job.company || job.title || "·").charAt(0).toUpperCase();

  return (
    <article
      className="cc-surface cc-lift cc-tone-cobalt group relative flex flex-col overflow-hidden p-5"
      style={{ animationDelay: `${index * 40}ms` }}
    >
      <span
        aria-hidden
        className="absolute inset-x-0 top-0 h-[3px] opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{ background: "linear-gradient(90deg, var(--cc-rust), transparent)" }}
      />

      {/* Header: source + posted */}
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[color:var(--cc-rust-soft)] px-2.5 py-1 cc-font-sans text-[10px] font-semibold uppercase tracking-[0.1em] text-[color:var(--cc-rust-deep)]">
          {job.source}
        </span>
        <span className="inline-flex items-center gap-1.5 cc-font-sans text-xs text-[color:var(--cc-ash)] cc-tabular">
          <Clock className="h-3 w-3" />
          {postedAgo ?? "—"}
        </span>
      </div>

      {/* Company row */}
      <div className="mt-4 flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[color:var(--cc-ink)] cc-font-display text-sm text-[color:var(--cc-cream)]">
          {initial}
        </span>
        <div className="min-w-0">
          <h3 className="cc-font-sans text-[17px] font-semibold leading-snug text-[color:var(--cc-ink)] line-clamp-2">
            {job.title}
          </h3>
          <p className="mt-1 inline-flex items-center gap-1.5 cc-font-sans text-sm text-[color:var(--cc-ink-soft)]">
            <Building2 className="h-3.5 w-3.5 shrink-0 text-[color:var(--cc-ash)]" />
            <span className="truncate">{job.company}</span>
          </p>
        </div>
      </div>

      {/* Meta chips */}
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {job.location && (
          <span className="inline-flex items-center gap-1 rounded-lg border border-[color:var(--cc-hair)] bg-white/70 px-2 py-1 cc-font-sans text-[11px] text-[color:var(--cc-ink-soft)]">
            <MapPin className="h-3 w-3 text-[color:var(--cc-ash)]" />
            {job.location}
          </span>
        )}
        {job.is_remote && (
          <span className="inline-flex items-center gap-1 rounded-lg bg-[color:var(--cc-signal-soft)] px-2 py-1 cc-font-sans text-[11px] font-medium text-[color:var(--cc-signal-deep)]">
            Remote
          </span>
        )}
        {salary && (
          <span className="inline-flex items-center gap-1 rounded-lg bg-[color:var(--cc-rust-soft)] px-2 py-1 cc-font-sans text-[11px] font-semibold text-[color:var(--cc-rust-deep)] cc-tabular">
            <Banknote className="h-3 w-3" />
            {salary}
          </span>
        )}
      </div>

      {job.description_snippet && (
        <p className="mt-3 cc-font-sans text-sm leading-relaxed text-[color:var(--cc-ink-soft)] line-clamp-3">
          {job.description_snippet}
        </p>
      )}

      {/* Footer */}
      <div className="mt-auto flex items-center justify-between gap-2 border-t border-[color:var(--cc-hair)] pt-4">
        <button
          type="button"
          onClick={() => {
            if (job.canonical_url) {
              window.open(job.canonical_url, "_blank", "noopener,noreferrer");
            }
            onSave();
          }}
          className="cc-action cc-action--sm"
          title="Save to your tracker and open the posting"
        >
          <BookmarkPlus className="h-4 w-4" />
          File &amp; open
        </button>
        {job.canonical_url && (
          <a
            href={job.canonical_url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 cc-font-sans text-xs font-medium text-[color:var(--cc-ink-soft)] transition-colors hover:text-[color:var(--cc-rust)]"
          >
            Source
            <ArrowUpRight className="h-3.5 w-3.5" />
          </a>
        )}
      </div>
    </article>
  );
};

function humanise(iso: string): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "—";
  const diff = (Date.now() - t) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)}d ago`;
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(iso));
}

function formatMoney(n: number, currency: string | null): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "AUD",
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return `$${Math.round(n).toLocaleString()}`;
  }
}
