import { ArrowUpRight, Check } from "lucide-react";

import type { DispatchStory } from "../types";
import { categoryOf } from "../lib/brand";
import { relativeTime } from "../lib/time";
import { SourceLogo } from "./Logos";
import { WhyChip } from "./WhyChip";

/**
 * A story in the rail: the publisher's logo leads, so you can tell ABC from
 * HCAMag at a glance, and the topic tag carries the colour.
 */
export const RailItem = ({
  item,
  read,
  onOpen,
}: {
  item: DispatchStory;
  read: boolean;
  onOpen: () => void;
}) => {
  const topic = categoryOf(item.category);

  return (
    <a
      href={item.url ?? undefined}
      target="_blank"
      rel="noreferrer"
      onClick={onOpen}
      className={`fc-rail group relative flex gap-3.5 border-b border-[color:var(--cc-hair)] px-1 py-4 last:border-b-0 ${topic.tone} ${
        read ? "fc-is-read" : ""
      }`}
    >
      <span className="fc-rail__logo mt-0.5 shrink-0">
        <SourceLogo url={item.url} name={item.source} size={36} />
        {read && (
          <span className="fc-rail__tick" aria-hidden>
            <Check className="h-2.5 w-2.5" />
          </span>
        )}
      </span>

      <span className="min-w-0 flex-1">
        <span className="fc-headline block cc-font-sans text-[14.5px] font-semibold leading-snug text-[color:var(--cc-ink)] line-clamp-2">
          {item.title}
        </span>

        <span className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 cc-font-sans text-[12px] text-[color:var(--cc-ash)]">
          <span className="fc-topic">{topic.label}</span>
          <span className="truncate font-medium text-[color:var(--cc-ink-soft)]">{item.source}</span>
          <span aria-hidden>·</span>
          <span className="cc-tabular whitespace-nowrap">{relativeTime(item.timestamp)}</span>
          {read && <span className="sr-only">(read)</span>}
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
