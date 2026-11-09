/* The assistant in the bottom-right corner of every signed-in page.
   Once a day it waves and says hello with the most useful next step and a
   line of encouragement; any time, clicking it opens the same card plus
   "Take me to…" shortcuts. It can be tucked away (it dozes at the edge of
   the screen) and comes back with a click. It stays off the pages that are
   one big panel of their own — the interview room, the coach chat, admin. */

import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, X } from "lucide-react";

import { CRAFT_SIDEBAR_LINKS } from "@/components/craft/CraftSidebar";

import { Cutie, type CutieMood } from "./Cutie";
import { useAssistantBrief } from "./useAssistantBrief";

const HIDDEN_ON = ["/interview-prep/room", "/career-coach", "/admin", "/try", "/playground"];
const TUCKED_KEY = "fc-assistant-tucked";
const greetedKey = (userId: string) => `fc-assistant-greeted:${userId}`;
/** The daily hello closes itself after this long unless the pointer is on it. */
const GREETING_MS = 15_000;

const today = () => new Date().toLocaleDateString("en-CA");

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
    /* private mode or blocked storage: the assistant just forgets */
  }
}

type CardMode = "closed" | "greeting" | "open";

export const AssistantDock = () => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { userId, brief, reload } = useAssistantBrief();

  const [mode, setMode] = useState<CardMode>("closed");
  const [tucked, setTucked] = useState(() => readStore(TUCKED_KEY) === "1");
  const [mood, setMood] = useState<CutieMood>("idle");
  const [talking, setTalking] = useState(false);
  const [hovering, setHovering] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const hidden = HIDDEN_ON.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  /* Wave and talk briefly — used for the daily hello and on opening. */
  const perk = useCallback(() => {
    setMood("wave");
    setTalking(true);
    const t1 = window.setTimeout(() => setTalking(false), 1600);
    const t2 = window.setTimeout(() => setMood("idle"), 1800);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, []);

  // The daily hello: once per person per day, and not while tucked away.
  useEffect(() => {
    if (!brief || !userId || tucked || hidden) return;
    if (readStore(greetedKey(userId)) === today()) return;
    writeStore(greetedKey(userId), today());
    const show = window.setTimeout(() => {
      // Opened by hand in the meantime: leave the full card alone.
      setMode((m) => (m === "closed" ? "greeting" : m));
      perk();
    }, 900);
    return () => window.clearTimeout(show);
  }, [brief, userId, tucked, hidden, perk]);

  // The hello steps aside on its own unless the person is reading it.
  useEffect(() => {
    if (mode !== "greeting" || hovering) return;
    const t = window.setTimeout(() => setMode("closed"), GREETING_MS);
    return () => window.clearTimeout(t);
  }, [mode, hovering]);

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
    // Opening it counts as today's hello, so the daily one won't follow.
    if (userId) writeStore(greetedKey(userId), today());
    reload();
    setMode("open");
    perk();
  };

  const onCharacter = () => {
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

  return (
    <div
      ref={rootRef}
      className="cc-font-sans pointer-events-none fixed bottom-3 right-3 z-[35] flex flex-col items-end gap-2 md:bottom-5 md:right-5"
    >
      <AnimatePresence>
        {mode !== "closed" && brief && (
          <motion.aside
            aria-label="Your assistant"
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
              <p className="cc-font-display pr-8 text-[19px] leading-snug">{brief.hello}</p>
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
              <p className="mt-3 border-l-2 border-[color:var(--cc-rust)] pl-3 text-[13.5px] italic leading-relaxed text-[color:var(--cc-ash)]">
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
                    Tuck me away
                  </button>
                </div>
              </>
            )}
          </motion.aside>
        )}
      </AnimatePresence>

      <motion.button
        type="button"
        onClick={onCharacter}
        onPointerEnter={() => !tucked && mode === "closed" && setMood("happy")}
        onPointerLeave={() => setMood((m) => (m === "happy" ? "idle" : m))}
        aria-label={tucked ? "Wake your assistant" : mode === "open" ? "Close your assistant" : "Open your assistant"}
        aria-expanded={mode === "open"}
        animate={{ y: tucked ? 34 : 0 }}
        whileHover={tucked ? { y: 22 } : { scale: 1.06 }}
        whileTap={{ scale: 0.94 }}
        transition={{ type: "spring", stiffness: 300, damping: 22 }}
        className="pointer-events-auto rounded-2xl p-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--cc-rust)]"
      >
        <Cutie mood={tucked ? "sleep" : mood} talking={talking} size={56} />
      </motion.button>
    </div>
  );
};

export default AssistantDock;
