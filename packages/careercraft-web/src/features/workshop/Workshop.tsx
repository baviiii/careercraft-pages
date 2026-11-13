/* ───────────────────────────────────────────────────────────
   Workshop — every tool on Home, each with a small drawing of
   what it does, one line saying it, and the verb you'd use.
   The drawings move on hover and say the same thing as the line,
   so nobody has to guess what "Bullet Rewrite" means.
   ─────────────────────────────────────────────────────────── */

import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

import "./workshop.css";

type Picture = "sheets" | "ruler" | "rewrite" | "envelope" | "paper" | "map";

interface Tool {
  title: string;
  line: string;
  verb: string;
  path: string;
  tone: string;
  picture: Picture;
  /** Shown on the drawing and in the foot, when the tool keeps things. */
  count?: { n: number; one: string; many: string };
}

export const Workshop = ({ resumes, letters }: { resumes: number; letters: number }) => {
  const navigate = useNavigate();
  const reduce = useReducedMotion();

  const tools: Tool[] = [
    {
      title: "My Résumés",
      line: "Open, edit or download one",
      verb: "Open",
      path: "/my-resumes",
      tone: "cc-tone-cobalt",
      picture: "sheets",
      count: { n: resumes, one: "résumé", many: "résumés" },
    },
    {
      /* ATS analysis belongs in this row, which renders regardless of profile
         state. It was only in `featuredMoves`, and only in the branch for a
         profile that is NOT personalized — so finishing onboarding removed the
         one link to it. See the note in CraftSidebar. */
      title: "ATS Check",
      line: "Score a résumé against a job ad",
      verb: "Check",
      path: "/analysis",
      tone: "cc-tone-sage",
      picture: "ruler",
    },
    {
      title: "Bullet Rewrite",
      line: "Turn a weak line into a strong one",
      verb: "Rewrite",
      path: "/rewrite",
      tone: "cc-tone-wheat",
      picture: "rewrite",
    },
    {
      title: "Cover Letters",
      line: "Write one for a specific job",
      verb: "Write",
      path: "/cover-letter",
      tone: "ws-tone-pen",
      picture: "envelope",
      count: { n: letters, one: "letter", many: "letters" },
    },
    {
      title: "Market News",
      line: "Hiring, pay and layoffs in Australia",
      verb: "Read",
      path: "/job-market-news",
      tone: "cc-tone-ink",
      picture: "paper",
    },
    {
      title: "Browse Jobs",
      line: "Live job ads near you",
      verb: "Search",
      path: "/au-jobs",
      tone: "ws-tone-teal",
      picture: "map",
    },
  ];

  return (
    <div className="ws-grid mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
      {tools.map((t, i) => (
        <motion.button
          key={t.path}
          type="button"
          onClick={() => navigate(t.path)}
          initial={reduce ? false : { opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: i * 0.05, duration: 0.4, ease: [0.2, 0.8, 0.2, 1] }}
          className={`ws-card ${t.tone}`}
        >
          <span className="ws-stage" data-picture={t.picture} aria-hidden>
            <span className="ws-art">
              <Drawing picture={t.picture} count={t.count?.n} />
            </span>
          </span>
          <span className="ws-body">
            <span className="cc-font-display text-[17px] leading-tight tracking-[-0.01em] text-[color:var(--cc-ink)]">
              {t.title}
            </span>
            <span className="mt-1 cc-font-sans text-[13.5px] leading-snug text-[color:var(--cc-ink-soft)]">
              {t.line}
            </span>
            <span className="ws-foot cc-font-sans">
              <span className="whitespace-nowrap text-[13px] text-[color:var(--cc-ash)]">
                {t.count &&
                  (t.count.n > 0 ? (
                    <>
                      <b className="cc-tabular font-semibold text-[color:var(--cc-ink-soft)]">{t.count.n}</b>{" "}
                      {t.count.n === 1 ? t.count.one : t.count.many}
                    </>
                  ) : (
                    "None yet"
                  ))}
              </span>
              <span className="ws-go">
                {t.verb}
                <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </span>
          </span>
        </motion.button>
      ))}
    </div>
  );
};

/* ───────────────────────── drawings ───────────────────────── */

const Count = ({ n }: { n?: number }) => (n ? <span className="ws-count">{n > 99 ? "99+" : n}</span> : null);

const Drawing = ({ picture, count }: { picture: Picture; count?: number }) => {
  switch (picture) {
    case "sheets":
      return (
        <span className="ws-sheets">
          <span className="ws-sheet ws-sheet--back-l" />
          <span className="ws-sheet ws-sheet--back-r" />
          <span className="ws-sheet ws-sheet--front">
            <span />
            <span />
            <span />
            <span />
          </span>
          <Count n={count} />
        </span>
      );
    case "ruler":
      return (
        <span className="ws-ruler">
          <span className="ws-ruler__track">
            <span />
            <span />
            <span />
          </span>
          <span className="ws-ruler__ticks" />
          <span className="ws-ruler__pin" />
        </span>
      );
    case "rewrite":
      return (
        <span className="ws-rewrite">
          <span className="ws-rewrite__old">
            <span className="ws-rewrite__bar" />
            <span className="ws-rewrite__strike" />
          </span>
          <span className="ws-rewrite__new">
            <span className="ws-rewrite__hl" />
            <span className="ws-rewrite__bar" />
          </span>
        </span>
      );
    case "envelope":
      return (
        <span className="ws-env">
          <span className="ws-env__back" />
          <span className="ws-env__letter">
            <span />
            <span />
          </span>
          <span className="ws-env__front" />
          <Count n={count} />
        </span>
      );
    case "paper":
      return (
        <span className="ws-paper">
          <span className="ws-paper__mast" />
          <span className="ws-paper__head" />
          <span className="ws-paper__pic" />
          <span className="ws-paper__cols" />
        </span>
      );
    case "map":
      return (
        <span className="ws-map">
          <span className="ws-map__pin ws-map__pin--a" />
          <span className="ws-map__pin ws-map__pin--b" />
          <span className="ws-map__pin ws-map__pin--c" />
          <span className="ws-map__ring" />
        </span>
      );
  }
};

export default Workshop;
