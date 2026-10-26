import { useState } from "react";

import type { Tool } from "../data/tools";

type Note = NonNullable<Tool["callouts"]>[number];

/**
 * A screenshot in a plain browser frame, captioned. Screenshots use sample
 * data (an invented person and employers), and the caption says so.
 *
 * With notes, numbered pins sit on the image at the thing each note is
 * about, and the notes are listed underneath. The pins are decoration for
 * sighted readers; the list carries the words for everyone.
 */
export const ToolShot = ({
  src,
  alt,
  caption,
  path,
  notes = [],
  eager = false,
  float = false,
}: {
  src: string;
  alt: string;
  caption?: string;
  /** Shown in the frame's address bar, e.g. "faircopy.au/tracker". */
  path: string;
  notes?: Note[];
  /** The first screenshot on a page is likely its largest paint. */
  eager?: boolean;
  /** Bob gently in the light (the opening screenshot). */
  float?: boolean;
}) => {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return (
    <div className="cc-tl-plate">
      <figure className={`cc-tl-shot ${float ? "cc-tl-shot--float" : ""}`}>
        <div className="cc-tl-shot__frame">
          <div className="cc-tl-shot__bar" aria-hidden>
            <span className="cc-tl-shot__dots">
              <i />
              <i />
              <i />
            </span>
            <span className="cc-tl-shot__url">{path}</span>
          </div>
          <div className="cc-tl-shot__canvas">
            <img
              src={src}
              srcSet={`${src} 1440w, ${src.replace(/\.webp$/, "@2x.webp")} 2560w`}
              sizes="(min-width: 1400px) 1320px, 94vw"
              alt={alt}
              width={1440}
              height={900}
              loading={eager ? "eager" : "lazy"}
              decoding="async"
              {...(eager ? { fetchpriority: "high" } : {})}
              onError={() => setFailed(true)}
              className="cc-tl-shot__img"
            />
            {notes.map((n, i) => (
              <span key={n.title} className="cc-tl-pin" style={{ left: `${n.x}%`, top: `${n.y}%` }} aria-hidden>
                {i + 1}
              </span>
            ))}
          </div>
        </div>
        {caption && (
          <figcaption className="cc-tl-shot__caption">
            <span className="cc-tl-shot__sample">Sample data</span>
            {caption}
          </figcaption>
        )}
      </figure>
      {notes.length > 0 && (
        <ol className="cc-tl-notes" data-count={notes.length} aria-label="What the screenshot shows">
          {notes.map((n, i) => (
            <li key={n.title} className="cc-tl-note">
              <span className="cc-tl-note__n" aria-hidden>
                {i + 1}
              </span>
              <span>
                <span className="cc-tl-note__title">{n.title}</span>
                <span className="cc-tl-note__body">{n.body}</span>
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
};
