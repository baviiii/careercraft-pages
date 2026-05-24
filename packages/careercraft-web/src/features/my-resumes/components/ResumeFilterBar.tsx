import { Grid2X2, List, Search, SortAsc, SortDesc, Star } from "lucide-react";

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
  <div className="border border-[color:var(--cc-ink)] bg-[color:var(--cc-cream)]">
    {/* Top: search + category + tag */}
    <div className="grid grid-cols-1 md:grid-cols-[1.5fr_1fr_1fr] divide-x divide-[color:var(--cc-hair-strong)]">
      <label className="relative flex items-center px-4 py-3 border-b md:border-b-0 border-[color:var(--cc-hair-strong)]">
        <Search className="w-4 h-4 text-[color:var(--cc-ash)] mr-3" />
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search resumes…"
          className="flex-1 bg-transparent outline-none cc-font-sans text-[15px] text-[color:var(--cc-ink)] placeholder:italic placeholder:text-[color:var(--cc-ash)]"
        />
      </label>

      <select
        value={category}
        onChange={(e) => onCategoryChange(e.target.value)}
        className="cc-select border-b-0 px-4"
      >
        <option value="all">All categories</option>
        {RESUME_CATEGORIES.map((c) => (
          <option key={c.id} value={c.id}>
            {c.label}
          </option>
        ))}
      </select>

      <select
        value={tag}
        onChange={(e) => onTagChange(e.target.value)}
        className="cc-select border-b-0 px-4"
      >
        <option value="all">All tags</option>
        {allTags.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>
    </div>

    {/* Bottom: sort + favourites + view */}
    <div className="flex flex-wrap items-stretch border-t border-[color:var(--cc-hair-strong)]">
      <div className="flex items-center px-4 py-2">
        <span className="cc-label text-[color:var(--cc-ash)] mr-3">Sort</span>
        {(["updated", "date", "name"] as SortKey[]).map((k) => (
          <button
            key={k}
            onClick={() => onSortByChange(k)}
            className={`cc-label px-2 py-1 ${
              sortBy === k
                ? "text-[color:var(--cc-rust)] underline underline-offset-4"
                : "text-[color:var(--cc-ink)] hover:text-[color:var(--cc-rust)]"
            }`}
          >
            {k === "updated" ? "Updated" : k === "date" ? "Created" : "Name"}
          </button>
        ))}
        <button
          onClick={onSortOrderToggle}
          className="inline-flex h-8 w-8 items-center justify-center border border-[color:var(--cc-ink)] ml-2 text-[color:var(--cc-ink)]"
          aria-label="Toggle sort order"
        >
          {sortOrder === "asc" ? (
            <SortAsc className="w-3.5 h-3.5" />
          ) : (
            <SortDesc className="w-3.5 h-3.5" />
          )}
        </button>
      </div>

      <div className="ml-auto flex items-stretch border-l border-[color:var(--cc-hair-strong)]">
        <button
          onClick={onFavoritesOnlyToggle}
          className={`px-4 py-2 inline-flex items-center gap-2 cc-label border-r border-[color:var(--cc-hair-strong)] ${
            favoritesOnly
              ? "bg-[color:var(--cc-ink)] text-[color:var(--cc-cream)]"
              : "text-[color:var(--cc-ink)] hover:bg-[color:var(--cc-cream-2)]"
          }`}
        >
          <Star
            className={`w-3.5 h-3.5 ${favoritesOnly ? "fill-current" : ""}`}
          />
          Favourites
        </button>
        <button
          onClick={() => onViewModeChange("grid")}
          className={`w-10 inline-flex items-center justify-center ${
            viewMode === "grid"
              ? "bg-[color:var(--cc-ink)] text-[color:var(--cc-cream)]"
              : "text-[color:var(--cc-ink)] hover:bg-[color:var(--cc-cream-2)]"
          }`}
          aria-label="Grid view"
        >
          <Grid2X2 className="w-4 h-4" />
        </button>
        <button
          onClick={() => onViewModeChange("list")}
          className={`w-10 inline-flex items-center justify-center border-l border-[color:var(--cc-hair-strong)] ${
            viewMode === "list"
              ? "bg-[color:var(--cc-ink)] text-[color:var(--cc-cream)]"
              : "text-[color:var(--cc-ink)] hover:bg-[color:var(--cc-cream-2)]"
          }`}
          aria-label="List view"
        >
          <List className="w-4 h-4" />
        </button>
      </div>
    </div>
  </div>
);
