import { Search } from "lucide-react";

import { STATUS_ORDER } from "../types";
import type { StatusFilter } from "../types";

interface JobFilterBarProps {
  search: string;
  onSearchChange: (v: string) => void;
  status: StatusFilter;
  onStatusChange: (v: StatusFilter) => void;
}

/**
 * Editorial filter bar: full-width ink-bordered strip with a search field
 * on the left and a native status select on the right.
 */
export const JobFilterBar = ({
  search,
  onSearchChange,
  status,
  onStatusChange,
}: JobFilterBarProps) => (
  <div className="border border-[color:var(--cc-ink)] bg-[color:var(--cc-cream)] grid grid-cols-1 md:grid-cols-[1.5fr_1fr] divide-y md:divide-y-0 md:divide-x divide-[color:var(--cc-hair-strong)]">
    <label className="relative flex items-center px-4 py-3">
      <Search className="w-4 h-4 text-[color:var(--cc-ash)] mr-3" />
      <input
        type="text"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="Search company or role…"
        className="flex-1 bg-transparent outline-none cc-font-sans text-[15px] text-[color:var(--cc-ink)] placeholder:italic placeholder:text-[color:var(--cc-ash)]"
      />
    </label>

    <select
      value={status}
      onChange={(e) => onStatusChange(e.target.value as StatusFilter)}
      className="cc-select border-b-0 px-4"
    >
      <option value="all">All statuses</option>
      {STATUS_ORDER.map((s) => (
        <option key={s} value={s}>
          {s[0].toUpperCase() + s.slice(1)}
        </option>
      ))}
    </select>
  </div>
);
