import { useState } from "react";

/**
 * A screenshot in a plain browser frame, captioned. Screenshots use sample
 * data (an invented person and employers), and the caption says so.
 */
export const ToolShot = ({
  src,
  alt,
  caption,
  path,
  eager = false,
}: {
  src: string;
  alt: string;
  caption?: string;
  /** Shown in the frame's address bar, e.g. "faircopy.au/tracker". */
  path: string;
  /** The first screenshot on a page is likely its largest paint. */
  eager?: boolean;
}) => {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return (
    <figure className="cc-tl-shot">
      <div className="cc-tl-shot__frame">
        <div className="cc-tl-shot__bar" aria-hidden>
          <span className="cc-tl-shot__dots">
            <i />
            <i />
            <i />
          </span>
          <span className="cc-tl-shot__url">{path}</span>
        </div>
        <img
          src={src}
          srcSet={`${src} 1440w, ${src.replace(/\.webp$/, "@2x.webp")} 2560w`}
          sizes="(min-width: 1280px) 1100px, 92vw"
          alt={alt}
          width={1440}
          height={900}
          loading={eager ? "eager" : "lazy"}
          decoding="async"
          {...(eager ? { fetchpriority: "high" } : {})}
          onError={() => setFailed(true)}
          className="cc-tl-shot__img"
        />
      </div>
      {caption && (
        <figcaption className="cc-tl-shot__caption">
          <span className="cc-tl-shot__sample">Sample data</span>
          {caption}
        </figcaption>
      )}
    </figure>
  );
};
