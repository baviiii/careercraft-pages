import { useState } from "react";
import { Sparkles } from "lucide-react";

import type { RelevanceNote } from "../types";

/**
 * The transparency cue. Feeds normally hide their ranking; this one states it.
 *
 * Current algorithmic-transparency guidance says a "why am I seeing this" cue
 * needs three parts — a reason, a path to more detail, and a way to act on it.
 * This supplies the first two: the leading reason inline, and the rest on
 * expansion. The third lives in the tuning bar, where the same signals can be
 * switched off.
 */
export const WhyChip = ({
  relevance,
  size = "sm",
}: {
  relevance: RelevanceNote;
  size?: "sm" | "md";
}) => {
  const [open, setOpen] = useState(false);
  const { reasons, score } = relevance;

  if (reasons.length === 0) return null;

  const more = reasons.length - 1;

  return (
    <button
      type="button"
      onClick={(e) => {
        // The chip sits inside a link-like card; don't navigate on expand.
        e.preventDefault();
        e.stopPropagation();
        setOpen((v) => !v);
      }}
      aria-expanded={open}
      className={[
        "group/why inline-flex max-w-full items-center gap-1.5 rounded-full border text-left transition-colors",
        "border-[color:var(--cc-t-border,var(--cc-hair))] bg-[color:var(--cc-t-soft,var(--cc-rust-soft))]",
        "text-[color:var(--cc-t-deep,var(--cc-rust-deep))] hover:border-[color:var(--cc-t,var(--cc-rust))]",
        size === "md" ? "px-2.5 py-1.5 text-[11.5px]" : "px-2 py-1 text-[11px]",
      ].join(" ")}
      title={open ? "Hide reasons" : "Why you're seeing this"}
    >
      <Sparkles className="h-3 w-3 shrink-0" />
      {open ? (
        <span className="cc-font-sans font-medium">
          {reasons.join(" · ")}
          <span className="ml-1.5 cc-font-mono cc-tabular opacity-60">{Math.round(score)}</span>
        </span>
      ) : (
        <span className="cc-font-sans truncate font-medium">
          {reasons[0]}
          {more > 0 && <span className="ml-1 opacity-60">+{more}</span>}
        </span>
      )}
    </button>
  );
};

export default WhyChip;
