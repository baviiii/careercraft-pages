import { Search, X } from "lucide-react";

import { STATUS_META, STATUS_ORDER } from "../types";
import type { StatusFilter } from "../types";

interface JobFilterBarProps {
  search: string;
  onSearchChange: (v: string) => void;
  status: StatusFilter;
  onStatusChange: (v: StatusFilter) => void;
}

/**
 * Search plus one chip per stage. The chips take their colour from the
 * lane they filter to (tracker.css, via data-stage), so the two always match.
 */
export const JobFilterBar = ({
  search,
  onSearchChange,
  status,
  onStatusChange,
}: JobFilterBarProps) => (
  <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:gap-5">
    <label className="relative flex flex-1 items-center gap-3 rounded-xl border border-[color:var(--cc-hair-strong)] bg-white px-3 py-2 transition-all focus-within:border-[color:var(--cc-ink)] focus-within:shadow-[0_0_0_3px_var(--cc-rust-soft)] xl:max-w-md">
      <Search className="h-4 w-4 text-[color:var(--cc-ash)]" />
      <input
        type="text"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="Search by company or role"
        aria-label="Search your jobs"
        className="flex-1 bg-transparent py-0.5 cc-font-sans text-[15px] text-[color:var(--cc-ink)] outline-none placeholder:text-[color:var(--cc-ash)]"
      />
      {search && (
        <button
          type="button"
          onClick={() => onSearchChange("")}
          className="text-[color:var(--cc-ash)] transition-colors hover:text-[color:var(--cc-ink)]"
          aria-label="Clear search"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </label>

    <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Show stage">
      <button
        type="button"
        aria-pressed={status === "all"}
        onClick={() => onStatusChange("all")}
        className={`rounded-full border px-3 py-1.5 cc-font-sans text-[13px] font-medium transition-colors ${
          status === "all"
            ? "border-[color:var(--cc-ink)] bg-[color:var(--cc-ink)] text-[color:var(--cc-cream)]"
            : "border-[color:var(--cc-hair-strong)] text-[color:var(--cc-ink-soft)] hover:border-[color:var(--cc-ink-soft)]"
        }`}
      >
        All
      </button>
      {STATUS_ORDER.map((s) => {
        const active = status === s;
        return (
          <button
            key={s}
            type="button"
            data-stage={s}
            aria-pressed={active}
            onClick={() => onStatusChange(active ? "all" : s)}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 cc-font-sans text-[13px] font-medium transition-colors ${
              active
                ? "border-[color:var(--st)] bg-[color:var(--st-soft)] text-[color:var(--st)]"
                : "border-[color:var(--cc-hair-strong)] text-[color:var(--cc-ink-soft)] hover:border-[color:var(--st)]"
            }`}
          >
            <span className="cc-lane__dot !h-2 !w-2" aria-hidden />
            {STATUS_META[s].label}
          </button>
        );
      })}
    </div>
  </div>
);
