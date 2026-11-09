/* Fay, the quokka in the bottom-right corner of every signed-in page.
   Once a day she waves and says hello with the most useful next step and a
   line of encouragement (the first time, she introduces herself). Now and
   then she hops, and every few minutes says something short in a bubble.
   Any time, clicking her opens the card with "Take me to…" shortcuts. She
   can be tucked away (she dozes at the edge of the screen, and stays quiet)
   and comes back with a click. She stays off the pages that are one big
   panel of their own — the interview room, the coach chat, admin. */

import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, X } from "lucide-react";

import { CRAFT_SIDEBAR_LINKS } from "@/components/craft/CraftSidebar";

import { introFor, nextBubble } from "./brief";
import { Fay, type FayMood } from "./Fay";
import { useAssistantBrief } from "./useAssistantBrief";

const HIDDEN_ON = ["/interview-prep/room", "/career-coach", "/admin", "/try", "/playground"];
const TUCKED_KEY = "fc-assistant-tucked";
const greetedKey = (userId: string) => `fc-assistant-greeted:${userId}`;
const metKey = (userId: string) => `fc-fay-met:${userId}`;
/** The daily hello closes itself after this long unless the pointer is on it. */
const GREETING_MS = 15_000;
/** A bubble stays this long unless the pointer is on it. */
const BUBBLE_MS = 7_000;
/** First bubble after this long on the site, then one every few minutes. */
const FIRST_BUBBLE_MS = 45_000;
const BUBBLE_GAP_MS = [180_000, 300_000] as const;
/** Enough to feel alive, not enough to nag. */
const MAX_BUBBLES = 4;
/** She hops on her own every so often while idle. */
const HOP_GAP_MS = [18_000, 35_000] as const;

const today = () => new Date().toLocaleDateString("en-CA");
const between = ([lo, hi]: readonly [number, number]) => lo + Math.random() * (hi - lo);

function readStore(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStore(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    /* private mode or blocked storage: Fay just forgets */
  }
}

type CardMode = "closed" | "greeting" | "open";

export const AssistantDock = () => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { userId, brief, reload } = useAssistantBrief();

  const [mode, setMode] = useState<CardMode>("closed");
  const [tucked, setTucked] = useState(() => readStore(TUCKED_KEY) === "1");
  const [mood, setMood] = useState<FayMood>("idle");
  const [talking, setTalking] = useState(false);
  const [hop, setHop] = useState(0);
  const [hovering, setHovering] = useState(false);
  const [intro, setIntro] = useState(false);
  const [bubble, setBubble] = useState<string | null>(null);
  const bubblesShown = useRef(0);
  const lastBubble = useRef<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const modeRef = useRef<CardMode>(mode);
  modeRef.current = mode;

  const hidden = HIDDEN_ON.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  const quiet = hidden || tucked || mode !== "closed";

  /* Wave and talk briefly — for the hello and on opening. */
  const perk = useCallback(() => {
    setMood("wave");
    setTalking(true);
    window.setTimeout(() => setTalking(false), 1600);
    window.setTimeout(() => setMood((m) => (m === "wave" ? "idle" : m)), 1800);
  }, []);

  /* The first time she shows her card to someone, she introduces herself. */
  const meet = useCallback(() => {
    if (!userId) return;
    setIntro(readStore(metKey(userId)) !== "1");
    writeStore(metKey(userId), "1");
  }, [userId]);

  // The daily hello: once per person per day, and not while tucked away.
  useEffect(() => {
    if (!brief || !userId || tucked || hidden) return;
    if (readStore(greetedKey(userId)) === today()) return;
    const show = window.setTimeout(() => {
      // Opened by hand in the meantime: leave the full card alone.
      if (modeRef.current !== "closed") return;
      // Marked only once it shows, so a hello cut short by leaving the page
      // still comes on the next one.
      writeStore(greetedKey(userId), today());
      meet();
      setMode("greeting");
      perk();
    }, 900);
    return () => window.clearTimeout(show);
  }, [brief, userId, tucked, hidden, perk, meet]);

  // The hello steps aside on its own unless the person is reading it.
  useEffect(() => {
    if (mode !== "greeting" || hovering) return;
    const t = window.setTimeout(() => setMode("closed"), GREETING_MS);
    return () => window.clearTimeout(t);
  }, [mode, hovering]);

  // A little hop now and then while she's idle and the tab is in view.
  useEffect(() => {
    if (quiet) return;
    const t = window.setTimeout(() => {
      if (document.visibilityState === "visible") setHop((h) => h + 1);
    }, between(HOP_GAP_MS));
    return () => window.clearTimeout(t);
  }, [quiet, hop]);

  // Every few minutes a short bubble, a handful per visit at most.
  useEffect(() => {
    if (quiet || bubble || !brief || bubblesShown.current >= MAX_BUBBLES) return;
    const wait = bubblesShown.current === 0 ? FIRST_BUBBLE_MS : between(BUBBLE_GAP_MS);
    const t = window.setTimeout(() => {
      if (document.visibilityState !== "visible") return;
      const line = nextBubble(lastBubble.current);
      lastBubble.current = line;
      bubblesShown.current += 1;
      setBubble(line);
      setHop((h) => h + 1);
      setTalking(true);
      window.setTimeout(() => setTalking(false), 1200);
    }, wait);
    return () => window.clearTimeout(t);
  }, [quiet, bubble, brief]);

  // The bubble goes on its own, and whenever the card opens or she's tucked.
  useEffect(() => {
    if (!bubble) return;
    if (quiet) {
      setBubble(null);
      return;
    }
    if (hovering) return;
    const t = window.setTimeout(() => setBubble(null), BUBBLE_MS);
    return () => window.clearTimeout(t);
  }, [bubble, quiet, hovering]);

  // Escape or a click elsewhere closes the card.
  useEffect(() => {
    if (mode === "closed") return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMode("closed");
    const onDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setMode("closed");
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onDown);
    };
  }, [mode]);

  // Moving to another page closes the card.
  useEffect(() => setMode("closed"), [pathname]);

  if (hidden) return null;

  const go = (path: string) => {
    setMode("closed");
    navigate(path);
  };

  const open = () => {
    // Opening her counts as today's hello, so the daily one won't follow.
    if (userId) writeStore(greetedKey(userId), today());
    meet();
    reload();
    setBubble(null);
    setMode("open");
    perk();
  };

  const onFay = () => {
    if (tucked) {
      setTucked(false);
      writeStore(TUCKED_KEY, null);
      open();
      return;
    }
    if (mode === "open") setMode("closed");
    else open();
  };

  const tuckAway = () => {
    setMode("closed");
    setTucked(true);
    writeStore(TUCKED_KEY, "1");
  };

  const shortcuts = CRAFT_SIDEBAR_LINKS.filter((l) => l.path !== pathname);
  const met = intro && brief ? introFor(brief.firstName) : null;

  return (
    <div
      ref={rootRef}
      className="cc-font-sans pointer-events-none fixed bottom-3 right-3 z-[35] flex flex-col items-end gap-2 md:bottom-5 md:right-5"
    >
      <AnimatePresence mode="wait">
        {mode !== "closed" && brief ? (
          <motion.aside
            key="card"
            aria-label="Fay, your Faircopy helper"
            initial={{ opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
            style={{ originX: 1, originY: 1 }}
            onPointerEnter={() => setHovering(true)}
            onPointerLeave={() => setHovering(false)}
            className="pointer-events-auto relative max-h-[calc(100dvh-110px)] w-[min(340px,calc(100vw-24px))] overflow-y-auto rounded-2xl border border-[color:var(--cc-hair)] bg-white p-4 text-[color:var(--cc-ink)] shadow-[0_18px_50px_-18px_rgba(20,22,26,0.35)]"
          >
            <button
              type="button"
              onClick={() => setMode("closed")}
              aria-label="Close"
              className="absolute right-2.5 top-2.5 rounded-full p-1.5 text-[color:var(--cc-ash)] transition-colors hover:bg-[color:var(--cc-cream-2)] hover:text-[color:var(--cc-ink)]"
            >
              <X className="h-4 w-4" />
            </button>

            <div aria-live="polite">
              <p className="cc-font-display pr-8 text-[19px] leading-snug">{met ? met.hello : brief.hello}</p>
              {met && (
                <p className="mt-1.5 text-[14px] leading-relaxed text-[color:var(--cc-ink-soft)]">{met.line}</p>
              )}
              {brief.nudge && (
                <p className="mt-2 text-[14.5px] leading-relaxed text-[color:var(--cc-ink-soft)]">
                  {brief.nudge.text}
                </p>
              )}
              {brief.nudge?.action && (
                <button
                  type="button"
                  onClick={() => go(brief.nudge!.action!.path)}
                  className="cc-action cc-action--sm mt-3"
                >
                  {brief.nudge.action.label}
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              )}
              <p className="mt-3 border-l-2 border-[#F5B95F] pl-3 text-[13.5px] italic leading-relaxed text-[color:var(--cc-ash)]">
                {brief.cheer}
              </p>
            </div>

            {mode === "open" && (
              <>
                <div className="mt-4 border-t border-[color:var(--cc-hair)] pt-3">
                  <p className="cc-label-sm mb-2 text-[color:var(--cc-ash)]">Take me to</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {shortcuts.map(({ icon: Icon, label, path }) => (
                      <button
                        key={path}
                        type="button"
                        onClick={() => go(path)}
                        className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[13px] font-medium transition-colors hover:bg-[color:var(--cc-cream-2)]"
                      >
                        <Icon className="h-3.5 w-3.5 flex-shrink-0 text-[color:var(--cc-rust)]" />
                        <span className="truncate">{label}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="mt-3 flex justify-end">
                  <button
                    type="button"
                    onClick={tuckAway}
                    className="text-[12.5px] text-[color:var(--cc-ash)] underline-offset-2 hover:text-[color:var(--cc-ink)] hover:underline"
                  >
                    Tuck Fay away
                  </button>
                </div>
              </>
            )}
          </motion.aside>
        ) : bubble ? (
          <motion.button
            key="bubble"
            type="button"
            onClick={open}
            onPointerEnter={() => setHovering(true)}
            onPointerLeave={() => setHovering(false)}
            initial={{ opacity: 0, y: 8, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 420, damping: 24 }}
            style={{ originX: 0.85, originY: 1 }}
            aria-live="polite"
            className="pointer-events-auto relative mr-6 max-w-[220px] rounded-2xl border border-[color:var(--cc-hair)] bg-white px-3.5 py-2.5 text-left text-[13.5px] font-medium leading-snug text-[color:var(--cc-ink)] shadow-[0_12px_30px_-14px_rgba(20,22,26,0.4)]"
          >
            {bubble}
            {/* The little tail pointing down at Fay */}
            <span
              aria-hidden="true"
              className="absolute -bottom-[6px] right-5 h-3 w-3 rotate-45 border-b border-r border-[color:var(--cc-hair)] bg-white"
            />
          </motion.button>
        ) : null}
      </AnimatePresence>

      <motion.button
        type="button"
        onClick={onFay}
        onPointerEnter={() => !tucked && mode === "closed" && setMood("happy")}
        onPointerLeave={() => setMood((m) => (m === "happy" ? "idle" : m))}
        aria-label={tucked ? "Wake Fay" : mode === "open" ? "Close Fay" : "Open Fay, your Faircopy helper"}
        aria-expanded={mode === "open"}
        animate={{ y: tucked ? 38 : 0 }}
        whileHover={tucked ? { y: 25 } : { scale: 1.06 }}
        whileTap={{ scale: 0.94 }}
        transition={{ type: "spring", stiffness: 300, damping: 22 }}
        className="pointer-events-auto rounded-2xl p-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--cc-rust)]"
      >
        <Fay mood={tucked ? "sleep" : mood} talking={talking} hop={hop} size={62} />
      </motion.button>
    </div>
  );
};

export default AssistantDock;
