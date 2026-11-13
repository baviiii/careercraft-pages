import { useState } from "react";
import { ArrowUpRight, Check } from "lucide-react";

import type { DispatchStory } from "../types";
import { categoryOf } from "../lib/brand";
import { relativeTime } from "../lib/time";
import { SourceLogo } from "./Logos";
import { WhyChip } from "./WhyChip";

/**
 * The lead. Deliberately the loudest thing in the section — one dominant column
 * carrying a display-scale headline. With no photo (or a dead one) it gets a
 * cover in its topic's colour with the publisher's logo, never a blank frame.
 */
export const LeadStory = ({
  item,
  read,
  onOpen,
}: {
  item: DispatchStory;
  read: boolean;
  onOpen: () => void;
}) => {
  const [imageFailed, setImageFailed] = useState(false);
  const topic = categoryOf(item.category);
  const showImage = Boolean(item.imageUrl) && !imageFailed;

  return (
    <a
      href={item.url ?? undefined}
      target="_blank"
      rel="noreferrer"
      onClick={onOpen}
      className={`cc-surface cc-lift group relative flex flex-col overflow-hidden ${topic.tone} ${read ? "fc-is-read" : ""}`}
    >
      {/* Accent hairline that fills on hover */}
      <span
        aria-hidden
        className="absolute inset-x-0 top-0 z-10 h-[3px] origin-left scale-x-0 bg-[color:var(--cc-t,var(--cc-rust))] transition-transform duration-500 group-hover:scale-x-100"
      />

      {showImage ? (
        <div className="relative aspect-[16/8] w-full overflow-hidden bg-[color:var(--cc-cream-2)]">
          <img
            src={item.imageUrl as string}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
            onError={() => setImageFailed(true)}
          />
          <span className="fc-topic fc-topic--on-image absolute left-4 top-4">{topic.label}</span>
        </div>
      ) : (
        <div className="fc-cover" aria-hidden>
          <span className="fc-cover__word cc-font-display">{topic.label}</span>
          <span className="fc-cover__logo">
            <SourceLogo url={item.url} name={item.source} size={52} />
          </span>
        </div>
      )}

      <div className="flex flex-1 flex-col p-5 md:p-6">
        <div className="flex items-center gap-2.5 cc-font-sans text-[13px] text-[color:var(--cc-ash)]">
          {/* The cover already carries the big logo and the topic. */}
          {showImage && <SourceLogo url={item.url} name={item.source} size={22} />}
          <span className="truncate font-semibold text-[color:var(--cc-ink-soft)]">{item.source}</span>
          <span aria-hidden>·</span>
          <span className="cc-tabular whitespace-nowrap">{relativeTime(item.timestamp)}</span>
        </div>

        <h3 className="fc-headline mt-3 cc-font-display text-[1.5rem] leading-[1.08] tracking-[-0.02em] text-[color:var(--cc-ink)] md:text-[1.9rem]">
          {item.title}
        </h3>

        {item.standfirst && (
          <p className="mt-3 line-clamp-3 cc-font-editorial text-[15px] leading-relaxed text-[color:var(--cc-ink-soft)]">
            {item.standfirst}
          </p>
        )}

        <div className="mt-auto flex items-end justify-between gap-3 pt-5">
          <WhyChip relevance={item.relevance} size="md" />
          <span className="inline-flex shrink-0 items-center gap-1 cc-font-sans text-[13px] font-medium text-[color:var(--cc-ink-soft)] transition-colors group-hover:text-[color:var(--cc-t,var(--cc-rust))]">
            {read ? (
              <>
                <Check className="h-3.5 w-3.5" /> Read
              </>
            ) : (
              <>
                Read
                <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </>
            )}
          </span>
        </div>
      </div>
    </a>
  );
};

export default LeadStory;
