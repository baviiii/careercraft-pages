import { Search, X } from "lucide-react";

import { STATUS_ACCENT, STATUS_META, STATUS_ORDER } from "../types";
import type { StatusFilter } from "../types";

interface JobFilterBarProps {
  search: string;
  onSearchChange: (v: string) => void;
  status: StatusFilter;
  onStatusChange: (v: StatusFilter) => void;
}

/**
 * A slim filter rail — search + colour-coded status chips. The native select
 * is gone; the chip selection mirrors the lane palette so the filter state
 * matches the pipeline below at a glance.
 */
export const JobFilterBar = ({
  search,
  onSearchChange,
  status,
  onStatusChange,
}: JobFilterBarProps) => (
  <div className="space-y-3">
    <p className="cc-font-sans text-sm text-[color:var(--cc-ink-soft)]">
      Search by company or role, then focus on the status you want to action.
    </p>
    <div className="flex flex-col xl:flex-row xl:items-center gap-4 xl:gap-5">
      <label className="relative flex items-center gap-3 xl:max-w-lg flex-1 border border-[color:var(--cc-hair-strong)] bg-[color:var(--cc-cream)] px-3 py-2.5 focus-within:border-[color:var(--cc-ink)] focus-within:shadow-[0_0_0_3px_var(--cc-rust-soft)] transition-all">
        <Search className="w-4 h-4 text-[color:var(--cc-ash)]" />
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search company or role..."
          className="flex-1 bg-transparent outline-none cc-font-sans text-base py-0.5 text-[color:var(--cc-ink)] placeholder:text-[color:var(--cc-ash)]"
        />
        {search && (
          <button
            type="button"
            onClick={() => onSearchChange("")}
            className="text-[color:var(--cc-ash)] hover:text-[color:var(--cc-ink)] transition-colors"
            aria-label="Clear search"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </label>

      <div className="flex flex-wrap items-center gap-2">
        <span className="cc-font-sans text-sm text-[color:var(--cc-ink-soft)] mr-1">
          Status:
        </span>
        <StatusChip
          label="All"
          active={status === "all"}
          onClick={() => onStatusChange("all")}
        />
        {STATUS_ORDER.map((s) => {
          const accent = STATUS_ACCENT[s];
          const active = status === s;
          return (
            <button
              key={s}
              type="button"
              onClick={() => onStatusChange(s)}
              className="inline-flex items-center gap-2 px-3 py-2 border cc-font-sans text-xs font-medium transition-all duration-200"
              style={{
                borderColor: active ? accent.deep : "var(--cc-hair-strong)",
                background: active ? accent.soft : "transparent",
                color: active ? accent.deep : "var(--cc-ink-soft)",
              }}
            >
              <span
                className="inline-block w-2 h-2 rounded-full"
                style={{ background: accent.deep }}
                aria-hidden
              />
              {STATUS_META[s].label}
            </button>
          );
        })}
      </div>
    </div>
  </div>
);

const StatusChip = ({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className="px-3 py-2 border cc-font-sans text-xs font-medium transition-all duration-200"
    style={{
      borderColor: active ? "var(--cc-ink)" : "var(--cc-hair-strong)",
      background: active ? "var(--cc-ink)" : "transparent",
      color: active ? "var(--cc-cream)" : "var(--cc-ink-soft)",
    }}
  >
    {label}
  </button>
);
