import { ArrowUpRight, Briefcase } from "lucide-react";
import { useState } from "react";

import { SourceLogo } from "@/features/dispatch/components/Logos";
import { relativeTime } from "@/features/dispatch/lib/time";

import { publisher, type NewsArticle, type StoryFit } from "../lib/news";
import { StoryPicture } from "./StoryPicture";

interface StoryCardProps {
  article: NewsArticle;
  fit: StoryFit | null;
  /** The first story gets more room: its picture beside the words on wide screens. */
  lead?: boolean;
  /** Position in the list, for the staggered entrance. */
  index: number;
}

/**
 * One story: its picture (or a cover in its topic's colour), the publisher
 * by logo and name, the headline, the summary, and why it sits where it
 * does. The headline is the link and covers the whole card, so anywhere on
 * it opens the publisher's page; the summary is all we have.
 */
export const StoryCard = ({ article, fit, lead = false, index }: StoryCardProps) => {
  const source = publisher(article);
  const [photoFailed, setPhotoFailed] = useState(false);
  const photo = Boolean(article.imageUrl) && !photoFailed;

  return (
    <article
      className={`cc-story ${lead ? "cc-story--lead" : ""}`}
      style={{ ["--i" as string]: Math.min(index, 10) }}
    >
      <StoryPicture article={article} lead={lead} photo={photo} onPhotoFail={() => setPhotoFailed(true)} />

      <div className="cc-story__body">
        <p className="cc-story__meta cc-font-sans">
          {/* The cover already carries the logo, big. */}
          {photo && <SourceLogo url={article.url} name={source} size={20} />}
          {source && <span className="truncate font-semibold text-[color:var(--cc-ink-soft)]">{source}</span>}
          <span aria-hidden>·</span>
          <span className="whitespace-nowrap">{relativeTime(article.publishedAt)}</span>
        </p>

        <h3 className={`cc-font-display text-[color:var(--cc-ink)] ${lead ? "cc-story__title--lead" : "cc-story__title"}`}>
          <a
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="cc-story__link rounded-sm"
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

        <span aria-hidden className="cc-story__read cc-font-sans">
          Read {source ? `at ${source}` : "the story"}
          <ArrowUpRight className="h-3.5 w-3.5" />
        </span>
      </div>
    </article>
  );
};
