import { ArrowDown, ArrowUp, LayoutGrid, List, Search, Star, X } from "lucide-react";

import { RESUME_CATEGORIES } from "../types";
import type { SortKey, SortOrder, ViewMode } from "../types";

interface ResumeFilterBarProps {
  search: string;
  onSearchChange: (v: string) => void;
  category: string;
  onCategoryChange: (v: string) => void;
  tag: string;
  onTagChange: (v: string) => void;
  allTags: string[];
  favoritesOnly: boolean;
  onFavoritesOnlyToggle: () => void;
  sortBy: SortKey;
  onSortByChange: (v: SortKey) => void;
  sortOrder: SortOrder;
  onSortOrderToggle: () => void;
  viewMode: ViewMode;
  onViewModeChange: (v: ViewMode) => void;
}

const SORTS: { key: SortKey; label: string }[] = [
  { key: "updated", label: "Last edited" },
  { key: "date", label: "Created" },
  { key: "name", label: "Name" },
];

/** Search, narrow and sort the shelf. */
export const ResumeFilterBar = ({
  search,
  onSearchChange,
  category,
  onCategoryChange,
  tag,
  onTagChange,
  allTags,
  favoritesOnly,
  onFavoritesOnlyToggle,
  sortBy,
  onSortByChange,
  sortOrder,
  onSortOrderToggle,
  viewMode,
  onViewModeChange,
}: ResumeFilterBarProps) => (
  <div className="space-y-3 cc-font-sans">
    <div className="flex flex-col gap-3 md:flex-row md:items-center">
      <label className="relative flex flex-1 items-center gap-3 rounded-xl border border-[color:var(--cc-hair-strong)] bg-white px-3 py-2 transition-all focus-within:border-[color:var(--cc-ink)] focus-within:shadow-[0_0_0_3px_var(--cc-rust-soft)] md:max-w-md">
        <Search className="h-4 w-4 text-[color:var(--cc-ash)]" />
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search by name or job"
          aria-label="Search your résumés"
          className="flex-1 bg-transparent py-0.5 text-[15px] text-[color:var(--cc-ink)] outline-none placeholder:text-[color:var(--cc-ash)]"
        />
        {search && (
          <button
            type="button"
            onClick={() => onSearchChange("")}
            className="text-[color:var(--cc-ash)] hover:text-[color:var(--cc-ink)]"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </label>
      <div className="flex flex-wrap gap-2">
        <select
          value={category}
          onChange={(e) => onCategoryChange(e.target.value)}
          className="cc-rselect"
          aria-label="Category"
        >
          <option value="all">Every category</option>
          {RESUME_CATEGORIES.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
        {allTags.length > 0 && (
          <select value={tag} onChange={(e) => onTagChange(e.target.value)} className="cc-rselect" aria-label="Tag">
            <option value="all">Any tag</option>
            {allTags.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        )}
      </div>
    </div>

    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Sort">
        <span className="mr-1 text-[13px] text-[color:var(--cc-ash)]">Sort</span>
        {SORTS.map((s) => (
          <button
            key={s.key}
            type="button"
            className="cc-rfilter"
            aria-pressed={sortBy === s.key}
            onClick={() => (sortBy === s.key ? onSortOrderToggle() : onSortByChange(s.key))}
            title={sortBy === s.key ? "Tap again to flip the order" : undefined}
          >
            {s.label}
            {sortBy === s.key &&
              (sortOrder === "asc" ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />)}
          </button>
        ))}
        <button type="button" className="cc-rfilter ml-1" aria-pressed={favoritesOnly} onClick={onFavoritesOnlyToggle}>
          <Star className={`h-3.5 w-3.5 ${favoritesOnly ? "fill-current" : ""}`} />
          Favourites
        </button>
      </div>

      <div className="flex items-center gap-1" role="group" aria-label="View">
        <button
          type="button"
          className="cc-rfilter !px-2.5"
          aria-pressed={viewMode === "grid"}
          aria-label="Cards"
          title="Cards"
          onClick={() => onViewModeChange("grid")}
        >
          <LayoutGrid className="h-4 w-4" />
        </button>
        <button
          type="button"
          className="cc-rfilter !px-2.5"
          aria-pressed={viewMode === "list"}
          aria-label="List"
          title="List"
          onClick={() => onViewModeChange("list")}
        >
          <List className="h-4 w-4" />
        </button>
      </div>
    </div>
  </div>
);
