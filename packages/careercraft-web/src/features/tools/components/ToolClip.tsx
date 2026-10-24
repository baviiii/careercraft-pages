import { useInView } from "framer-motion";
import { RotateCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";

/**
 * A short recording of the tool in use, as an animated WebP that plays once
 * and stops on its last frame (no endless loop to distract from reading).
 * It starts when half of it is on screen: a lazy image is fetched well
 * before it's visible, so the one playthrough used to end off-screen.
 * People who've asked their device for less motion get the still image
 * instead; the browser picks, so it works before JavaScript runs too.
 */
export const ToolClip = ({
  src,
  still,
  alt,
  caption,
  path,
}: {
  src: string;
  /** Shown instead of the clip when reduced motion is on. */
  still: string;
  alt: string;
  caption: string;
  path: string;
}) => {
  const frame = useRef<HTMLDivElement>(null);
  const seen = useInView(frame, { once: true, amount: 0.5 });
  const [run, setRun] = useState(0);
  const [replay, setReplay] = useState<string | null>(null);
  const blobUrl = useRef<string | null>(null);
  const playing = seen || run > 0;
  const clip = replay ?? src;

  useEffect(() => () => {
    if (blobUrl.current) URL.revokeObjectURL(blobUrl.current);
  }, []);

  /* A new URL makes the browser start the animation from the top. A blob URL
     made from the cached file gives one without downloading it again (a
     ?query would miss the cache and re-download the whole clip). */
  const playAgain = async () => {
    try {
      const blob = await (await fetch(src)).blob();
      if (blobUrl.current) URL.revokeObjectURL(blobUrl.current);
      blobUrl.current = URL.createObjectURL(blob);
      setReplay(blobUrl.current);
    } catch {
      /* the remount below still shows the clip */
    }
    setRun((n) => n + 1);
  };

  return (
    <figure className="cc-tl-shot">
      <div className="cc-tl-shot__frame" ref={frame}>
        <div className="cc-tl-shot__bar" aria-hidden>
          <span className="cc-tl-shot__dots">
            <i />
            <i />
            <i />
          </span>
          <span className="cc-tl-shot__url">{path}</span>
        </div>
        <picture key={`${run}-${playing}`}>
          {playing && <source media="(prefers-reduced-motion: no-preference)" srcSet={clip} type="image/webp" />}
          <img
            src={still}
            alt={alt}
            width={1200}
            height={750}
            loading="lazy"
            decoding="async"
            className="cc-tl-shot__img"
          />
        </picture>
      </div>
      <figcaption className="cc-tl-shot__caption">
        <span className="cc-tl-shot__sample">Sample data</span>
        <span>{caption}</span>
        {playing && (
          <button type="button" onClick={() => void playAgain()} className="cc-tl-replay">
            <RotateCcw className="h-3.5 w-3.5" aria-hidden /> Play again
          </button>
        )}
      </figcaption>
    </figure>
  );
};
