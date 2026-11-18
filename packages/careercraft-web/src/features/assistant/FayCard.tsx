/* Fay's card: what opens beside her when she's clicked (or Ctrl/⌘ K is
   pressed), and once a day by itself as a hello.

   - The top is a wider view of the sky in her window: the same time of day,
     with the greeting and the date on it.
   - One box finds any page, the places inside pages and her own settings as
     you type (instant, free), or asks her the question ("Ask Fay"). Arrow
     keys move through the matches, Enter opens one.
   - Next up: the next steps from the person's own data, the first one open.
   - Help for the page they're on, in that page's colour: the questions
     people ask there, and "Show me around" to replay its tips.
   - An answer replaces all that until Back; a follow-up box sits under it.
   Settings stay behind the ⋯ menu. */

import { useEffect, useId, useMemo, useRef, useState, type CSSProperties } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  ArrowUp,
  BellRing,
  Bookmark,
  Check,
  ChevronLeft,
  CircleHelp,
  Compass,
  CornerDownLeft,
  FilePlus2,
  FileText,
  MessageCircle,
  MoreHorizontal,
  RotateCcw,
  Search,
  SquareKanban,
  X,
} from "lucide-react";

import { scoreBand } from "@/features/my-resumes/types";

import { pageLabel, pagesIn, parseAnswer, type FayTurn } from "./askFay";
import { parseDay, type AssistantBrief, type AssistantNudge, type DayPart } from "./brief";
import { sparkPath } from "./fayArt";
import { SkyBand } from "./FayScene";
import {
  DESTINATIONS,
  fayCommands,
  GENERAL_QUESTIONS,
  guideFor,
  IS_MAC,
  looksLikeQuestion,
  searchFay,
  type FayAct,
  type FayCommand,
  type FayIcon,
  type Tone,
} from "./guide";
import "./fay.css";

export type MotionPref = "auto" | "full" | "calm";

export interface FaySettings {
  chatty: boolean;
  motionPref: MotionPref;
  /** The device asks for reduced motion. */
  deviceStill: boolean;
  /** She's in her usual corner (no "Back to my corner"). */
  atHome: boolean;
  /** This page has tips to show round. */
  canTour: boolean;
}

interface FayCardProps {
  mode: "greeting" | "open";
  brief: AssistantBrief;
  /** The first time she meets someone: who she is. */
  intro: { hello: string; line: string } | null;
  part: DayPart;
  still: boolean;
  pathname: string;
  /** Where the card sits, beside her (see placeNear in the dock). */
  place: { style: CSSProperties; right: boolean; below: boolean };
  /** The answer on show, if a question has been asked. */
  latest?: FayTurn;
  asking: boolean;
  inputRef: React.RefObject<HTMLInputElement>;
  /** Put the cursor in the box as soon as the card opens. */
  autoFocus: boolean;
  settings: FaySettings;
  onAsk: (question: string) => void;
  onBack: () => void;
  onGo: (path: string) => void;
  onAct: (act: FayAct) => void;
  onMotion: (pref: MotionPref) => void;
  onClose: () => void;
  onHover: (hovering: boolean) => void;
}

type Row = { kind: "ask" } | { kind: "go"; cmd: FayCommand };

/** Light text on the sky from sunset on. */
const darkSky = (part: DayPart) => part === "evening" || part === "night";

/** Below this much height the sky shrinks to one line, so the rest fits. */
const ROOMY_PX = 400;

export const FayCard = ({
  mode,
  brief,
  intro,
  part,
  still,
  pathname,
  place,
  latest,
  asking,
  inputRef,
  autoFocus,
  settings,
  onAsk,
  onBack,
  onGo,
  onAct,
  onMotion,
  onClose,
  onHover,
}: FayCardProps) => {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const uid = useId().replace(/:/g, "");
  const guide = guideFor(pathname);
  const open = mode === "open";
  const showingAnswer = Boolean(latest);
  const roomy =
    typeof place.style.maxHeight !== "number" || place.style.maxHeight >= ROOMY_PX;
  /** Put the cursor back in the box once it has moved (see ask and Back). */
  const keepFocus = useRef(false);

  const { canTour, chatty, atHome } = settings;
  const commands = useMemo(
    () => [...DESTINATIONS, ...fayCommands({ canTour, chatty, atHome })],
    [canTour, chatty, atHome],
  );
  const q = query.trim();
  const searching = open && !latest && q.length > 0;
  const matches = useMemo(() => (searching ? searchFay(q, commands) : []), [searching, q, commands]);
  // A question asks Fay first; a place name opens the place first.
  const rows: Row[] = !searching
    ? []
    : looksLikeQuestion(q) || !matches.length
      ? [{ kind: "ask" }, ...matches.map((cmd): Row => ({ kind: "go", cmd }))]
      : [...matches.map((cmd): Row => ({ kind: "go", cmd })), { kind: "ask" }];

  useEffect(() => setActive(0), [q]);

  // The cursor goes in the box as the card opens (or the hello becomes the
  // full card) when asked; focusing it later is the dock's (Ctrl/⌘ K).
  useEffect(() => {
    if (open && autoFocus) inputRef.current?.focus();
  }, [open, autoFocus, inputRef]);

  // Asking moves the box from the top of the card to its foot, and Back moves
  // it up again: a new box, so the cursor is carried over when it was in use.
  useEffect(() => {
    if (keepFocus.current) inputRef.current?.focus();
    keepFocus.current = false;
  }, [showingAnswer, inputRef]);

  // A switch flipped from the search box says so for a moment.
  useEffect(() => {
    if (!note) return;
    const t = window.setTimeout(() => setNote(null), 2_600);
    return () => window.clearTimeout(t);
  }, [note]);

  // Her menu closes on a click outside it.
  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: PointerEvent) => {
      const t = e.target as Element | null;
      if (menuRef.current?.contains(t) || t?.closest?.('[aria-label="Fay settings"]')) return;
      setMenuOpen(false);
    };
    window.addEventListener("pointerdown", onDown);
    return () => window.removeEventListener("pointerdown", onDown);
  }, [menuOpen]);

  /** `keep`: carry the cursor to the follow-up box (typed, or chosen by key). */
  const ask = (question: string, keep = document.activeElement === inputRef.current) => {
    if (!question.trim() || asking) return;
    // A follow-up is asked from the box at the foot, which stays put.
    keepFocus.current = keep && !showingAnswer;
    setQuery("");
    onAsk(question);
  };

  const run = (row: Row) => {
    if (row.kind === "ask") return ask(q, true);
    setQuery("");
    const r = row.cmd.run;
    if ("go" in r) return onGo(r.go);
    if (r.fay === "chatty") setNote(chatty ? "Tips and bubbles are off" : "Tips and bubbles are on");
    onAct(r.fay);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape" && query) {
      // Clear the box first; a second Escape closes the card.
      e.stopPropagation();
      setQuery("");
    } else if (rows.length && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      e.preventDefault();
      const step = e.key === "ArrowDown" ? 1 : -1;
      setActive((a) => (a + step + rows.length) % rows.length);
    }
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (latest) return ask(q, true);
    const row = rows[Math.min(active, rows.length - 1)];
    if (row) run(row);
  };

  const askBox = (docked: boolean) => (
    <form
      onSubmit={submit}
      className="fay-ask"
      data-docked={docked || undefined}
      role={docked ? undefined : "search"}
    >
      {docked ? (
        <MessageCircle className="fay-ask__icon" aria-hidden="true" />
      ) : (
        <Search className="fay-ask__icon" aria-hidden="true" />
      )}
      <input
        ref={inputRef}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={onKeyDown}
        maxLength={500}
        enterKeyHint={docked ? "send" : "go"}
        aria-label={docked ? "Ask Fay a follow-up" : "Find a page or ask Fay"}
        placeholder={docked ? "Ask a follow-up" : "Find a page or ask Fay"}
        {...(!docked && {
          role: "combobox",
          "aria-expanded": rows.length > 0,
          "aria-controls": `${uid}-results`,
          "aria-autocomplete": "list" as const,
          "aria-activedescendant": rows.length ? `${uid}-row-${active}` : undefined,
        })}
      />
      {docked ? (
        <button
          type="submit"
          aria-label="Ask"
          disabled={asking || !q}
          className="fay-send"
        >
          <ArrowUp className="h-4 w-4" />
        </button>
      ) : (
        !query && (
          <kbd className="fay-kbd" aria-label={IS_MAC ? "Command K" : "Control K"}>
            {IS_MAC ? "⌘ K" : "Ctrl K"}
          </kbd>
        )
      )}
    </form>
  );

  return (
    <motion.aside
      aria-label="Fay, your Faircopy helper"
      initial={{ opacity: 0, y: place.below ? -12 : 12, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: place.below ? -8 : 8, scale: 0.97 }}
      transition={{ type: "spring", stiffness: 380, damping: 30 }}
      style={{
        ...place.style,
        originX: place.right ? 1 : 0,
        originY: place.below ? 0 : 1,
      }}
      onPointerEnter={() => onHover(true)}
      onPointerLeave={() => onHover(false)}
      className="fay-card cc-font-sans fixed z-[35]"
      data-still={still || undefined}
    >
      {/* Her sky, with the greeting on it (or the way back from an answer) */}
      <header
        className="fay-sky"
        data-part={part}
        data-dark={darkSky(part) || undefined}
        data-slim={latest || !roomy ? true : undefined}
        data-under-ask={(open && !latest) || undefined}
      >
        <SkyBand part={part} still={still} />
        {latest ? (
          <button
            type="button"
            onClick={(e) => {
              // A half-typed follow-up isn't a search on the way back. From
              // the keyboard (no pointer, detail 0) the cursor goes back up.
              keepFocus.current = e.detail === 0 || document.activeElement === inputRef.current;
              setQuery("");
              onBack();
            }}
            className="fay-glass fay-back"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            Back
          </button>
        ) : (
          <div className="fay-sky__words">
            <h2 className="cc-font-display fay-hello">{intro ? intro.hello : brief.hello}</h2>
            {roomy && (
              <p className="fay-date">
                {new Date().toLocaleDateString("en-AU", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                })}
              </p>
            )}
          </div>
        )}
        <div className="fay-sky__tools">
          {open && (
            <button
              type="button"
              aria-label="Fay settings"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((v) => !v)}
              className="fay-glass fay-round"
              data-on={menuOpen || undefined}
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
          )}
          <button type="button" onClick={onClose} aria-label="Close" className="fay-glass fay-round">
            <X className="h-4 w-4" />
          </button>
        </div>
      </header>

      {menuOpen && open && (
        <FayMenu
          menuRef={menuRef}
          settings={settings}
          onMotion={onMotion}
          onAct={(act) => {
            setMenuOpen(false);
            onAct(act);
          }}
          onChatty={() => onAct("chatty")}
        />
      )}

      {open && !latest && askBox(false)}

      <div className="fay-body" data-under-ask={(open && !latest) || undefined}>
        {note && (
          <p className="fay-note" role="status">
            <Check className="h-3.5 w-3.5" aria-hidden="true" />
            {note}
          </p>
        )}

        {latest ? (
          <Answer turn={latest} still={still} onGo={onGo} onRetry={() => ask(latest.question)} />
        ) : searching ? (
          <ul id={`${uid}-results`} role="listbox" aria-label="Pages and answers" className="fay-results">
            {rows.map((row, i) => (
              <li
                key={row.kind === "ask" ? "ask" : row.cmd.id}
                id={`${uid}-row-${i}`}
                role="option"
                aria-selected={i === active}
                aria-disabled={(row.kind === "ask" && asking) || undefined}
                onPointerMove={() => setActive(i)}
                onClick={() => run(row)}
                className="fay-result"
              >
                {row.kind === "ask" ? (
                  <>
                    <Tile icon={MessageCircle} tone="cobalt" />
                    <span className="fay-result__text">
                      <span className="fay-result__label">Ask Fay</span>
                      <span className="fay-result__hint fay-result__quote">“{q}”</span>
                    </span>
                  </>
                ) : (
                  <>
                    <Tile icon={row.cmd.icon} tone={row.cmd.tone} />
                    <span className="fay-result__text">
                      <span className="fay-result__label">{row.cmd.label}</span>
                      {row.cmd.hint && <span className="fay-result__hint">{row.cmd.hint}</span>}
                    </span>
                  </>
                )}
                <CornerDownLeft className="fay-result__enter" aria-hidden="true" />
              </li>
            ))}
          </ul>
        ) : (
          <>
            {intro && <p className="fay-intro">{intro.line}</p>}

            {brief.nudges.length > 0 && (
              <section className="fay-section" aria-label="Next up">
                <h3 className="fay-h">Next up</h3>
                <NextStep nudge={brief.nudges[0]} onGo={onGo} />
                {open &&
                  brief.nudges.slice(1).map((n) => (
                    <button
                      key={n.kind}
                      type="button"
                      onClick={() => n.action && onGo(n.action.path)}
                      className="fay-row"
                    >
                      <NudgeArt nudge={n} small />
                      <span className="fay-row__text">{n.short}</span>
                      <ArrowRight className="fay-row__go" aria-hidden="true" />
                    </button>
                  ))}
              </section>
            )}

            {open && (
              <section className="fay-section" data-fay-tone={guide?.tone ?? "cobalt"}>
                <div className="fay-page">
                  {guide ? (
                    <Tile icon={guide.icon} tone={guide.tone} />
                  ) : (
                    <Tile icon={CircleHelp} tone="cobalt" />
                  )}
                  <h3 className="fay-page__name cc-font-display">
                    {guide ? guide.label : "Common questions"}
                  </h3>
                  {canTour && (
                    <button type="button" onClick={() => onAct("tour")} className="fay-tour">
                      <Compass className="h-3.5 w-3.5" aria-hidden="true" />
                      Show me around
                    </button>
                  )}
                </div>
                <ul className="fay-questions">
                  {(guide?.questions ?? GENERAL_QUESTIONS).map((question) => (
                    <li key={question}>
                      <button
                        type="button"
                        // Chosen with the keyboard (detail 0): the cursor
                        // follows to the follow-up box.
                        onClick={(e) => ask(question, e.detail === 0)}
                        disabled={asking}
                        className="fay-row"
                      >
                        <span className="fay-row__text">{question}</span>
                        <ArrowRight className="fay-row__go" aria-hidden="true" />
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {mode === "greeting" && (
              <p className="fay-cheer">
                <svg viewBox="0 0 16 16" aria-hidden="true">
                  <path d={sparkPath(8, 8, 7)} fill="#F5B95F" />
                </svg>
                {brief.cheer}
              </p>
            )}
          </>
        )}
      </div>

      {open && latest && <div className="fay-foot">{askBox(true)}</div>}
    </motion.aside>
  );
};

/* ── Pieces ─────────────────────────────────────────────────────────── */

const Tile = ({
  icon: Icon,
  tone,
  size,
  count,
}: {
  icon: FayIcon;
  tone: Tone;
  size?: "lg";
  count?: number;
}) => (
  <span className="fay-tile" data-fay-tone={tone} data-size={size} aria-hidden="true">
    <Icon />
    {count !== undefined && count > 1 && <span className="fay-count">{count > 9 ? "9+" : count}</span>}
  </span>
);

/** A score out of 100 as a ring, in the same bands as the score chips on
    My Résumés. */
const ScoreDial = ({ score, small }: { score: number; small?: boolean }) => {
  const r = 18;
  const round = 2 * Math.PI * r;
  const band = scoreBand(score)?.tone;
  const tone: Tone = band === "good" ? "sage" : band === "fair" ? "wheat" : "pen";
  return (
    <span
      className="fay-dial"
      data-fay-tone={tone}
      data-small={small || undefined}
      role="img"
      aria-label={`ATS score ${score} out of 100`}
    >
      <svg viewBox="0 0 44 44">
        <circle cx="22" cy="22" r={r} className="fay-dial__track" />
        <circle
          cx="22"
          cy="22"
          r={r}
          className="fay-dial__arc"
          strokeDasharray={round}
          strokeDashoffset={round * (1 - Math.min(100, Math.max(0, score)) / 100)}
          transform="rotate(-90 22 22)"
        />
      </svg>
      <span className="fay-dial__n">{score}</span>
    </span>
  );
};

/** A page off a desk calendar for the interview's day. */
const CalendarPage = ({ day, small }: { day: string; small?: boolean }) => {
  const d = parseDay(day);
  return (
    <span className="fay-cal" data-small={small || undefined} aria-hidden="true">
      <span className="fay-cal__top">{d.toLocaleDateString("en-AU", { weekday: "short" })}</span>
      <span className="fay-cal__day">{d.getDate()}</span>
    </span>
  );
};

const NudgeArt = ({ nudge, small }: { nudge: AssistantNudge; small?: boolean }) => {
  const size = small ? undefined : ("lg" as const);
  switch (nudge.kind) {
    case "ats":
      return <ScoreDial score={nudge.score ?? 0} small={small} />;
    case "interview":
      return nudge.day ? (
        <CalendarPage day={nudge.day} small={small} />
      ) : (
        <Tile icon={BellRing} tone="pen" size={size} />
      );
    case "follow-up":
      return <Tile icon={BellRing} tone="wheat" size={size} count={nudge.count} />;
    case "saved":
      return <Tile icon={Bookmark} tone="cobalt" size={size} count={nudge.count} />;
    case "resume":
      return <Tile icon={FilePlus2} tone="cobalt" size={size} />;
    case "track":
      return <Tile icon={SquareKanban} tone="wheat" size={size} />;
  }
};

const NextStep = ({ nudge, onGo }: { nudge: AssistantNudge; onGo: (path: string) => void }) => (
  <div className="fay-next">
    <NudgeArt nudge={nudge} />
    <div className="fay-next__body">
      <p className="fay-next__text">{nudge.text}</p>
      {nudge.resume && (
        <p className="fay-file" title={nudge.resume}>
          <FileText aria-hidden="true" />
          <span>{nudge.resume}</span>
        </p>
      )}
      {nudge.action && (
        <button
          type="button"
          onClick={() => onGo(nudge.action!.path)}
          className="cc-action cc-action--sm fay-next__go"
        >
          {nudge.action.label}
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  </div>
);

/** One question and her answer, the pages it mentions as buttons. */
const Answer = ({
  turn,
  still,
  onGo,
  onRetry,
}: {
  turn: FayTurn;
  still: boolean;
  onGo: (path: string) => void;
  onRetry: () => void;
}) => {
  const blocks = parseAnswer(turn.answer);
  const pages = turn.status === "done" ? pagesIn(blocks).slice(0, 2) : [];
  return (
    <div aria-live="polite">
      <h2 className="cc-font-display fay-q">{turn.question}</h2>
      {turn.status === "thinking" ? (
        <div className="fay-thinking" role="status" aria-label="Fay is thinking" data-still={still || undefined}>
          <span />
          <span />
          <span />
        </div>
      ) : (
        <div className="fay-answer" data-error={turn.status === "error" || undefined}>
          {blocks.map((block, bi) => (
            <p key={bi} className={block.kind === "item" ? "fay-answer__item" : undefined}>
              {block.kind === "item" && <span aria-hidden="true">•</span>}
              <span>
                {block.pieces.map((piece, pi) =>
                  piece.kind === "link" ? (
                    <button key={pi} type="button" onClick={() => onGo(piece.path)} className="fay-answer__link">
                      {piece.label}
                    </button>
                  ) : (
                    <span key={pi}>{piece.text}</span>
                  ),
                )}
              </span>
            </p>
          ))}
        </div>
      )}
      {turn.status === "error" && turn.canRetry && (
        <button type="button" onClick={onRetry} className="fay-retry">
          <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
          Try again
        </button>
      )}
      {pages.length > 0 && (
        <div className="fay-pages">
          {pages.map((path, i) => (
            <button
              key={path}
              type="button"
              onClick={() => onGo(path)}
              className={i === 0 ? "cc-action cc-action--sm" : "fay-pill"}
            >
              Open {pageLabel(path)}
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          ))}
        </div>
      )}
      {turn.sources && turn.status === "done" && (
        <p className="fay-sources">
          Sources:{" "}
          {turn.sources.map((src, si) => (
            <a key={src.n} href={src.url} target="_blank" rel="noopener noreferrer">
              {src.title || `Source ${si + 1}`}
              {si < turn.sources!.length - 1 ? ", " : ""}
            </a>
          ))}
        </p>
      )}
    </div>
  );
};

/** Her settings, out of the way until wanted. */
const FayMenu = ({
  menuRef,
  settings,
  onMotion,
  onAct,
  onChatty,
}: {
  menuRef: React.RefObject<HTMLDivElement>;
  settings: FaySettings;
  onMotion: (pref: MotionPref) => void;
  onAct: (act: FayAct) => void;
  onChatty: () => void;
}) => (
  <div ref={menuRef} role="menu" aria-label="Fay's settings" className="fay-menu">
    <button
      type="button"
      role="menuitemcheckbox"
      aria-checked={settings.chatty}
      onClick={onChatty}
      className="fay-menu__item"
    >
      Tips and bubbles
      <span aria-hidden="true" className="fay-switch" data-on={settings.chatty || undefined}>
        <span />
      </span>
    </button>
    <div className="fay-menu__group">
      <p>Movement</p>
      <div role="group" aria-label="Fay's movement" className="fay-segment">
        {(
          [
            ["auto", "Device"],
            ["full", "Full"],
            ["calm", "Calm"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            aria-pressed={settings.motionPref === key}
            onClick={() => onMotion(key)}
          >
            {label}
          </button>
        ))}
      </div>
      {settings.motionPref === "auto" && settings.deviceStill && (
        <p className="fay-menu__fine">Your device asks for less motion, so Fay keeps still.</p>
      )}
    </div>
    <div className="fay-menu__rule" />
    {!settings.atHome && (
      <button type="button" role="menuitem" onClick={() => onAct("corner")} className="fay-menu__item">
        Back to my corner
      </button>
    )}
    <button type="button" role="menuitem" onClick={() => onAct("tuck")} className="fay-menu__item">
      Tuck Fay away
    </button>
  </div>
);

export default FayCard;
