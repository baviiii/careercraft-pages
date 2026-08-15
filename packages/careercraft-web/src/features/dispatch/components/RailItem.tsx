import { ArrowUpRight, Building2, MapPin } from "lucide-react";

import type { DispatchItem } from "../types";
import { WhyChip } from "./WhyChip";
import { relativeTime } from "../lib/time";

/**
 * A ruled column entry. Rank ordinals are set in tabular mono so the numbers
 * form a clean vertical spine down the rail — the newspaper index device, and
 * the thing that makes the ordering feel deliberate rather than arbitrary.
 */
export const RailItem = ({ item, index }: { item: DispatchItem; index: number }) => {
  const isRole = item.kind === "role";

  return (
    <a
      href={item.url ?? undefined}
      target="_blank"
      rel="noreferrer"
      className={`group relative flex gap-3.5 border-b border-[color:var(--cc-hair)] px-1 py-4 transition-colors last:border-b-0 hover:bg-[color:var(--cc-cream-2)]/60 ${
        isRole ? "cc-tone-sage" : "cc-tone-cobalt"
      }`}
    >
      <span
        aria-hidden
        className="mt-0.5 shrink-0 cc-font-mono cc-tabular text-[11px] leading-none text-[color:var(--cc-t,var(--cc-rust))]"
      >
        {String(index + 1).padStart(2, "0")}
      </span>

      <span className="min-w-0 flex-1">
        <span className="block cc-font-sans text-[14.5px] font-semibold leading-snug text-[color:var(--cc-ink)] line-clamp-2">
          {item.title}
        </span>

        <span className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 cc-font-sans text-[12px] text-[color:var(--cc-ash)]">
          {isRole ? (
            <>
              <span className="inline-flex items-center gap-1 truncate">
                <Building2 className="h-3 w-3 shrink-0" />
                {item.company}
              </span>
              {item.location && (
                <span className="inline-flex items-center gap-1 truncate">
                  <MapPin className="h-3 w-3 shrink-0" />
                  {item.location}
                </span>
              )}
            </>
          ) : (
            <span className="truncate">{item.source}</span>
          )}
          <span aria-hidden>·</span>
          <span className="cc-tabular whitespace-nowrap">{relativeTime(item.timestamp)}</span>
        </span>

        <span className="mt-2 block">
          <WhyChip relevance={item.relevance} />
        </span>
      </span>

      <ArrowUpRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[color:var(--cc-ash)] opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100 group-hover:text-[color:var(--cc-t,var(--cc-rust))]" />
    </a>
  );
};

export default RailItem;
