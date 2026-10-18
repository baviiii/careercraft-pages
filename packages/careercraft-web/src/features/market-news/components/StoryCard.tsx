import { ArrowUpRight, Briefcase } from "lucide-react";
import { useState } from "react";

import { relativeTime } from "@/features/dispatch/lib/time";

import { publisher, topicLabel, type NewsArticle, type StoryFit } from "../lib/news";

interface StoryCardProps {
  article: NewsArticle;
  fit: StoryFit | null;
  /** The first story gets more room, and its picture if the feed sent one. */
  lead?: boolean;
  /** Position in the list, for the staggered entrance. */
  index: number;
}

/**
 * One story. The headline is the link; it opens the publisher's page, since
 * the summary is all we have. Why it sits where it does is said in words
 * under it, and a company from your tracker gets named outright.
 */
export const StoryCard = ({ article, fit, lead = false, index }: StoryCardProps) => {
  const [imageOk, setImageOk] = useState(true);
  const source = publisher(article);
  const topic = topicLabel(article.category);
  const showImage = lead && article.imageUrl && imageOk;

  return (
    <article
      className={`cc-story ${lead ? "cc-story--lead" : ""} ${showImage ? "has-image" : ""}`}
      style={{ ["--i" as string]: Math.min(index, 10) }}
    >
      <div className="min-w-0">
        <p className="cc-story__meta cc-font-sans">
          {source && <span className="font-semibold text-[color:var(--cc-ink-soft)]">{source}</span>}
          <span>{relativeTime(article.publishedAt)}</span>
          {topic && <span>{topic}</span>}
        </p>

        <h3 className={`cc-font-display text-[color:var(--cc-ink)] ${lead ? "cc-story__title--lead" : "cc-story__title"}`}>
          <a
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="cc-story__link rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--cc-rust)]"
          >
            {article.title}
          </a>
        </h3>

        {article.description && (
          <p
            className={`mt-2 cc-font-sans leading-relaxed text-[color:var(--cc-ink-soft)] ${
              lead ? "line-clamp-4 text-[15.5px]" : "line-clamp-3 text-[14px]"
            }`}
          >
            {article.description}
          </p>
        )}

        {(fit?.trackedCompany || (fit && fit.reasons.length > 0)) && (
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 cc-font-sans">
            {fit.trackedCompany && (
              <span className="cc-tracked">
                <Briefcase className="h-3 w-3" />
                {fit.trackedCompany} is in your tracker
              </span>
            )}
            {fit.reasons.length > 0 && (
              <span className="text-[12.5px] text-[color:var(--cc-signal-deep)]">{fit.reasons.slice(0, 2).join(" · ")}</span>
            )}
          </div>
        )}

        <a
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
          tabIndex={-1}
          aria-hidden
          className="mt-4 inline-flex items-center gap-0.5 cc-font-sans text-[13px] font-medium text-[color:var(--cc-ink)] hover:text-[color:var(--cc-rust)]"
        >
          Read {source ? `at ${source}` : "the story"}
          <ArrowUpRight className="h-3.5 w-3.5" />
        </a>
      </div>

      {showImage && (
        <img
          src={article.imageUrl ?? undefined}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setImageOk(false)}
          className="cc-story__image"
        />
      )}
    </article>
  );
};
