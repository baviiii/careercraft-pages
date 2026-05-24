import { ArrowUpRight, Loader2, Search } from "lucide-react";
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
 * The Adzuna discovery feed presented as a stack of telegram dispatches.
 * Compact, scannable, and visually distinct from the user's own ledger
 * cards above — these are *external* signals, not personal records.
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
      {/* Filter rail */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto_auto] gap-3 items-end">
        <FilterField
          label="Keyword"
          placeholder="Frontend engineer, designer…"
          value={filters.query}
          onChange={(v) => setFilters((f) => ({ ...f, query: v }))}
        />
        <FilterField
          label="Location"
          placeholder="Sydney, remote, NSW…"
          value={filters.location}
          onChange={(v) => setFilters((f) => ({ ...f, location: v }))}
        />
        <button
          type="button"
          onClick={onSearch}
          disabled={isLoading}
          className="cc-btn cc-btn-ghost"
          style={{ padding: "0.7rem 1rem" }}
        >
          {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
          Search
        </button>
        <button
          type="button"
          onClick={onRefresh}
          disabled={isIngesting}
          className="cc-btn cc-btn-primary"
          style={{ padding: "0.7rem 1rem" }}
        >
          {isIngesting ? "Refreshing…" : "Pull fresh wire"}
        </button>
      </div>

      {lastIngestSummary && (
        <p className="cc-font-sans text-sm text-[color:var(--cc-ink-soft)]">
          {lastIngestSummary}
        </p>
      )}

      {visible.length === 0 ? (
        <div className="border border-dashed border-[color:var(--cc-hair-strong)] px-6 py-10 text-center bg-[color:var(--cc-cream-2)]">
          <div className="cc-font-sans text-sm font-semibold text-[color:var(--cc-ash)]">No jobs found</div>
          <p className="mt-2 cc-font-sans text-sm text-[color:var(--cc-ink-soft)]">
            No fresh dispatches in this slice — adjust the filters or pull the wire again.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 pt-3">
          {visible.map((j) => (
            <WireCard key={j.id} job={j} onSave={() => onSave(j.id)} />
          ))}
        </div>
      )}
    </div>
  );
};

const FilterField = ({
  label,
  placeholder,
  value,
  onChange,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
}) => (
  <label className="flex flex-col gap-1.5">
    <span className="cc-font-sans text-xs font-semibold text-[color:var(--cc-ash)]">{label}</span>
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="bg-[color:var(--cc-cream)] border border-[color:var(--cc-hair-strong)] focus:border-[color:var(--cc-ink)] focus:shadow-[0_0_0_3px_var(--cc-rust-soft)] outline-none cc-font-sans text-sm py-2.5 px-3 text-[color:var(--cc-ink)] placeholder:text-[color:var(--cc-ash)] transition-all"
    />
  </label>
);

const WireCard = ({
  job,
  onSave,
}: {
  job: JobCatalogJob;
  onSave: () => void;
}) => {
  const postedAgo = job.posted_at ? humanise(job.posted_at) : null;
  const salary =
    job.salary_min && job.salary_max
      ? `${formatMoney(job.salary_min, job.currency)} – ${formatMoney(job.salary_max, job.currency)}`
      : job.salary_min
        ? `from ${formatMoney(job.salary_min, job.currency)}`
        : null;

  return (
    <article className="bg-[color:var(--cc-cream)] border border-[color:var(--cc-hair-strong)] p-4 hover:border-[color:var(--cc-ink)] transition-colors">
      <span className="cc-font-sans text-[11px] font-semibold text-[color:var(--cc-ash)] uppercase tracking-[0.08em]">
        {job.source}
      </span>

      <div className="flex flex-col h-full">
        <div className="mt-1 cc-font-sans text-xs text-[color:var(--cc-ash)] cc-tabular">
          {postedAgo ?? "—"}
        </div>
        <h3 className="mt-2 cc-font-sans font-semibold text-lg leading-tight text-[color:var(--cc-ink)]">
          {job.title}
        </h3>
        <p className="mt-1 cc-font-sans text-sm text-[color:var(--cc-ink-soft)]">
          {job.company}
          {job.location ? ` · ${job.location}` : ""}
          {job.is_remote ? " · remote" : ""}
        </p>

        {salary && (
          <p className="mt-2 cc-font-sans text-xs font-semibold text-[color:var(--cc-rust)]">
            <span className="cc-tabular">{salary}</span>
          </p>
        )}

        {job.description_snippet && (
          <p className="mt-3 cc-font-sans text-sm leading-relaxed text-[color:var(--cc-ink-soft)] line-clamp-3">
            {job.description_snippet}
          </p>
        )}

        <div className="mt-auto pt-4 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onSave}
            className="cc-btn cc-btn-ghost"
            style={{ padding: "0.5rem 0.85rem" }}
          >
            File entry
          </button>
          {job.canonical_url && (
            <a
              href={job.canonical_url}
              target="_blank"
              rel="noreferrer"
              className="cc-link cc-font-sans text-xs text-[color:var(--cc-ink-soft)] hover:text-[color:var(--cc-rust)] inline-flex items-center gap-1.5"
            >
              View source
              <ArrowUpRight className="w-3 h-3" />
            </a>
          )}
        </div>
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
