import { Fragment } from "react";

import { marks, scoreBand } from "../../lib/debriefText";

/**
 * A line of debrief text with its question numbers, scores and quoted terms
 * marked up. A question number is a link to that answer in the transcript
 * when there's a transcript on the page to go to.
 */
export function Marked({ text, onQuestion }: { text: string; onQuestion?: (n: number) => void }) {
  return (
    <>
      {marks(text).map((m, i) => {
        switch (m.t) {
          case "q":
            return onQuestion ? (
              <button
                key={i}
                type="button"
                className="dr-q"
                onClick={() => onQuestion(m.n)}
                title={`Go to question ${m.n}`}
              >
                {m.v}
              </button>
            ) : (
              <span key={i} className="dr-q">
                {m.v}
              </span>
            );
          case "score":
            return (
              <span key={i} className="dr-score" data-band={scoreBand(m.of10)}>
                {m.v}
              </span>
            );
          case "quote":
            return (
              <mark key={i} className="dr-quote">
                {m.v}
              </mark>
            );
          case "em":
            return <em key={i}>{m.v}</em>;
          default:
            return <Fragment key={i}>{m.v}</Fragment>;
        }
      })}
    </>
  );
}
