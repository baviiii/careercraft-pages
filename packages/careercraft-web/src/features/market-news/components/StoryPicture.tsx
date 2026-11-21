import { SourceLogo } from "@/features/dispatch/components/Logos";
import { categoryOf } from "@/features/dispatch/lib/brand";

import { coverWord, publisher, topicLabel, type NewsArticle } from "../lib/news";

/** Narrower than this and it's an icon or a spacer, not a photo worth showing. */
const MIN_PHOTO_PX = 120;

/**
 * The top of a story: the publisher's photo with its topic pinned on, or,
 * when there's no photo to show (iTnews never sends one, or it won't load),
 * a cover in the topic's colour with the publisher's logo, the same cover
 * Home uses. Decorative either way: the headline under it says what the
 * story is. The card decides which (`photo`), so it can leave its own logo
 * off when the cover already shows it.
 */
export const StoryPicture = ({
  article,
  lead,
  photo,
  onPhotoFail,
}: {
  article: NewsArticle;
  lead: boolean;
  photo: boolean;
  onPhotoFail: () => void;
}) => {
  const tone = categoryOf(article.category).tone;
  const topic = topicLabel(article.category);

  if (photo && article.imageUrl) {
    return (
      <div className={`cc-story__pic ${tone}`}>
        <img
          src={article.imageUrl}
          alt=""
          // The lead is in view as the page opens; the rest load as they near it.
          loading={lead ? "eager" : "lazy"}
          decoding="async"
          referrerPolicy="no-referrer"
          onLoad={(e) => {
            if (e.currentTarget.naturalWidth < MIN_PHOTO_PX) onPhotoFail();
          }}
          onError={onPhotoFail}
        />
        {topic && <span className="cc-story__topic cc-font-sans">{topic}</span>}
      </div>
    );
  }

  const word = coverWord(article.category);
  return (
    <div className={`cc-story__pic cc-cover ${tone}`} aria-hidden>
      <span className="cc-cover__word cc-font-display" style={{ ["--len" as string]: word.length }}>
        {word}
      </span>
      <span className="cc-cover__logo">
        <SourceLogo url={article.url} name={publisher(article)} size={lead ? 56 : 44} />
      </span>
    </div>
  );
};
