import { ArrowUpRight, Banknote, Building2, Clock, MapPin } from "lucide-react";

import type { DispatchItem } from "../types";
import { WhyChip } from "./WhyChip";
import { relativeTime } from "../lib/time";

/**
 * The lead. Deliberately the loudest thing in the section — one dominant column
 * carrying a display-scale headline against mono meta, so the jump in type size
 * does the hierarchy rather than boxes and borders.
 */
export const LeadStory = ({ item }: { item: DispatchItem }) => {
  const tone = item.kind === "role" ? "cc-tone-sage" : "cc-tone-cobalt";

  return (
    <a
      href={item.url ?? undefined}
      target="_blank"
      rel="noreferrer"
      className={`cc-surface cc-lift group relative flex flex-col overflow-hidden ${tone}`}
    >
      {/* Accent hairline that fills on hover */}
      <span
        aria-hidden
        className="absolute inset-x-0 top-0 z-10 h-[3px] origin-left scale-x-0 bg-[color:var(--cc-t,var(--cc-rust))] transition-transform duration-500 group-hover:scale-x-100"
      />

      {item.kind === "story" && item.imageUrl && (
        <div className="relative aspect-[16/8] w-full overflow-hidden bg-[color:var(--cc-cream-2)]">
          <img
            src={item.imageUrl}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
            onError={(e) => {
              // Dead image hosts are common in syndicated feeds — collapse the
              // frame rather than showing a broken-image glyph.
              (e.currentTarget.parentElement as HTMLElement).style.display = "none";
            }}
          />
        </div>
      )}

      <div className="flex flex-1 flex-col p-5 md:p-6">
        <div className="flex items-center gap-2 cc-font-mono text-[10px] uppercase tracking-[0.14em] text-[color:var(--cc-ash)]">
          <span className="text-[color:var(--cc-t-deep,var(--cc-rust-deep))]">
            {item.kind === "role" ? "Open role" : item.category || "Dispatch"}
          </span>
          <span className="h-2.5 w-px bg-[color:var(--cc-hair-strong)]" aria-hidden />
          <span className="inline-flex items-center gap-1 cc-tabular">
            <Clock className="h-3 w-3" />
            {relativeTime(item.timestamp)}
          </span>
        </div>

        <h3 className="mt-3 cc-font-display text-[1.5rem] leading-[1.08] tracking-[-0.02em] text-[color:var(--cc-ink)] md:text-[1.9rem]">
          {item.title}
        </h3>

        {item.kind === "story" ? (
          <>
            {item.standfirst && (
              <p className="mt-3 line-clamp-3 cc-font-editorial text-[15px] leading-relaxed text-[color:var(--cc-ink-soft)]">
                {item.standfirst}
              </p>
            )}
            <p className="mt-3 cc-font-sans text-[13px] text-[color:var(--cc-ash)]">
              {item.source}
              {item.readTime ? ` · ${item.readTime}` : ""}
            </p>
          </>
        ) : (
          <>
            <p className="mt-2.5 inline-flex items-center gap-2 cc-font-sans text-[15px] text-[color:var(--cc-ink-soft)]">
              <Building2 className="h-4 w-4 shrink-0 text-[color:var(--cc-ash)]" />
              {item.company}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              {item.location && (
                <span className="inline-flex items-center gap-1 rounded-lg border border-[color:var(--cc-hair)] px-2 py-1 cc-font-sans text-[11.5px] text-[color:var(--cc-ink-soft)]">
                  <MapPin className="h-3 w-3 text-[color:var(--cc-ash)]" />
                  {item.location}
                </span>
              )}
              {item.isRemote && (
                <span className="rounded-lg bg-[color:var(--cc-signal-soft)] px-2 py-1 cc-font-sans text-[11.5px] font-medium text-[color:var(--cc-signal-deep)]">
                  Remote
                </span>
              )}
              {item.salary && (
                <span className="inline-flex items-center gap-1 rounded-lg bg-[color:var(--cc-rust-soft)] px-2 py-1 cc-font-sans text-[11.5px] font-semibold text-[color:var(--cc-rust-deep)] cc-tabular">
                  <Banknote className="h-3 w-3" />
                  {item.salary}
                </span>
              )}
            </div>
          </>
        )}

        <div className="mt-auto flex items-end justify-between gap-3 pt-5">
          <WhyChip relevance={item.relevance} size="md" />
          <span className="inline-flex shrink-0 items-center gap-1 cc-font-sans text-[13px] font-medium text-[color:var(--cc-ink-soft)] transition-colors group-hover:text-[color:var(--cc-t,var(--cc-rust))]">
            Read
            <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </span>
        </div>
      </div>
    </a>
  );
};

export default LeadStory;
