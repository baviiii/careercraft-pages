/* Fay, the quokka who lives on every signed-in page.

   - Once a day she waves and says hello with the most useful next step and
     a line of encouragement; the first time ever, she introduces herself.
   - The first time someone opens a page, she explains it a tip at a time.
   - Every few minutes she says something short in a bubble.
   - Her eyes follow the pointer; when something else on the page is
     clicked she turns to look at it.
   - She can be dragged anywhere (she dangles while carried) and remembers
     the spot. Stroke her back and forth and she blushes with hearts.
   - Idle, she hops, looks around or yawns; when nobody has touched the page
     for a few minutes she dozes off, and wakes with a yawn.
   - She celebrates interviews and offers and comforts on a rejection
     (see fayBus). Tips and bubbles can be switched off; she can be tucked
     away entirely.
   She stays off the pages that are one big panel of their own — the
   interview room, the coach chat, admin. */

import { useCallback, useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  AnimatePresence,
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  type AnimationPlaybackControls,
} from "framer-motion";
import { ArrowRight, X } from "lucide-react";

import { CRAFT_SIDEBAR_LINKS } from "@/components/craft/CraftSidebar";

import { introFor, nextBubble } from "./brief";
import { Fay, type FayMood } from "./Fay";
import { useFayEvents, type FayEvent } from "./fayBus";
import { tipsFor } from "./tips";
import { useAssistantBrief } from "./useAssistantBrief";

const HIDDEN_ON = ["/interview-prep/room", "/career-coach", "/admin", "/try", "/playground"];

const FAY_SIZE = 62;
/** The button around her: the drawing plus p-1 padding. */
const FAY_W = FAY_SIZE + 8;
const FAY_H = Math.round(FAY_SIZE * 1.2) + 8;
const EDGE = 12;

const TUCKED_KEY = "fc-assistant-tucked";
const SPOT_KEY = "fc-fay-spot";
const CHATTY_KEY = "fc-fay-chatty";
const greetedKey = (userId: string) => `fc-assistant-greeted:${userId}`;
const metKey = (userId: string) => `fc-fay-met:${userId}`;
const tipsKey = (userId: string) => `fc-fay-tips:${userId}`;

/** The daily hello closes itself after this long unless the pointer is on it. */
const GREETING_MS = 15_000;
/** First bubble after this long on the site, then one every few minutes. */
const FIRST_BUBBLE_MS = 45_000;
const BUBBLE_GAP_MS = [180_000, 300_000] as const;
/** Enough to feel alive, not enough to nag. */
const MAX_BUBBLES = 4;
/** Something idle (a hop, a look round, a yawn) every so often. */
const ACTION_GAP_MS = [16_000, 30_000] as const;
/** Nobody has touched the page for this long: she dozes off. */
const DOZE_AFTER_MS = 180_000;
/** How long she keeps looking at something that was clicked. */
const GLANCE_MS = 1_400;

const today = () => new Date().toLocaleDateString("en-CA");
const between = ([lo, hi]: readonly [number, number]) => lo + Math.random() * (hi - lo);
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

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

/* ── Where she sits ─────────────────────────────────────────────────────
   Stored as fractions of the free space (0,0 top-left … 1,1 bottom-right)
   so she keeps her corner when the window changes size. */

type Fractions = { fx: number; fy: number };
type Spot = { x: number; y: number };
const HOME: Fractions = { fx: 1, fy: 1 };

function limits() {
  return {
    minX: EDGE,
    maxX: Math.max(EDGE, window.innerWidth - FAY_W - EDGE),
    minY: EDGE,
    maxY: Math.max(EDGE, window.innerHeight - FAY_H - EDGE),
  };
}

function readFractions(): Fractions {
  try {
    const raw = JSON.parse(readStore(SPOT_KEY) ?? "null") as Partial<Fractions> | null;
    if (raw && Number.isFinite(raw.fx) && Number.isFinite(raw.fy)) {
      return { fx: clamp(raw.fx as number, 0, 1), fy: clamp(raw.fy as number, 0, 1) };
    }
  } catch {
    /* fall through to home */
  }
  return HOME;
}

function spotOf(f: Fractions): Spot {
  const l = limits();
  return { x: l.minX + f.fx * (l.maxX - l.minX), y: l.minY + f.fy * (l.maxY - l.minY) };
}

function fractionsOf(s: Spot): Fractions {
  const l = limits();
  return {
    fx: l.maxX > l.minX ? clamp((s.x - l.minX) / (l.maxX - l.minX), 0, 1) : 1,
    fy: l.maxY > l.minY ? clamp((s.y - l.minY) / (l.maxY - l.minY), 0, 1) : 1,
  };
}

/** Half of her peeks up from the bottom edge while tucked away. */
const tuckedY = () => window.innerHeight - FAY_H * 0.5;

/* The card and bubbles open on whichever side of her has room. */
function placeNear(spot: Spot) {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const right = spot.x + FAY_W / 2 > w / 2;
  const below = spot.y + FAY_H / 2 < h / 2;
  const style: CSSProperties = {};
  if (right) style.right = Math.max(EDGE, w - (spot.x + FAY_W));
  else style.left = Math.max(EDGE, spot.x);
  if (below) {
    style.top = spot.y + FAY_H + 4;
    style.maxHeight = h - (spot.y + FAY_H + 4) - EDGE;
  } else {
    style.bottom = h - spot.y + 4;
    style.maxHeight = spot.y - 4 - EDGE;
  }
  return { style, right, below };
}

function seenTips(userId: string): string[] {
  try {
    const raw = JSON.parse(readStore(tipsKey(userId)) ?? "[]");
    return Array.isArray(raw) ? raw.filter((p): p is string => typeof p === "string") : [];
  } catch {
    return [];
  }
}

type CardMode = "closed" | "greeting" | "open";

type Bubble = {
  kind: "cheer" | "tip" | "event" | "pet";
  text: string;
  /** For page tips: which tip of how many. */
  tip?: { path: string; index: number; total: number };
  action?: { label: string; path: string };
};

export const AssistantDock = () => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { userId, brief, reload } = useAssistantBrief();
  const still = useReducedMotion() ?? false;

  const [mode, setMode] = useState<CardMode>("closed");
  const [tucked, setTucked] = useState(() => readStore(TUCKED_KEY) === "1");
  const [chatty, setChatty] = useState(() => readStore(CHATTY_KEY) !== "0");
  const [mood, setMood] = useState<FayMood>("idle");
  const [talking, setTalking] = useState(false);
  const [hop, setHop] = useState(0);
  const [hearts, setHearts] = useState(0);
  const [carried, setCarried] = useState(false);
  const [dozing, setDozing] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [intro, setIntro] = useState(false);
  const [bubble, setBubble] = useState<Bubble | null>(null);
  const [tipRoute, setTipRoute] = useState<string | null>(null);
  const [idleTick, setIdleTick] = useState(0);
  const [spot, setSpot] = useState<Spot>(() => spotOf(readFractions()));
  const [lim, setLim] = useState(limits);

  // Position (dragged directly) and where she looks (sprung, so it's soft).
  const x = useMotionValue(spot.x);
  const y = useMotionValue(tucked ? tuckedY() : spot.y);
  const gazeRawX = useMotionValue(0);
  const gazeRawY = useMotionValue(0);
  const turnRaw = useMotionValue(0);
  const gazeX = useSpring(gazeRawX, { stiffness: 140, damping: 18 });
  const gazeY = useSpring(gazeRawY, { stiffness: 140, damping: 18 });
  const turn = useSpring(turnRaw, { stiffness: 120, damping: 16 });

  const rootRef = useRef<HTMLDivElement>(null);
  const modeRef = useRef<CardMode>(mode);
  modeRef.current = mode;
  const tuckedRef = useRef(tucked);
  tuckedRef.current = tucked;
  const chattyRef = useRef(chatty);
  chattyRef.current = chatty;
  const dozingRef = useRef(dozing);
  dozingRef.current = dozing;
  const bubblesShown = useRef(0);
  const lastBubble = useRef<string | null>(null);
  const justDragged = useRef(false);
  const glanceUntil = useRef(0);
  const glanceSeq = useRef(0);
  const lastActivity = useRef(Date.now());
  const lastPointerMove = useRef(0);
  const moodTimer = useRef<number>();
  const lookAround = useRef<AnimationPlaybackControls[]>([]);
  const petted = useRef({ lastX: 0, dir: 0, flips: [] as number[], last: 0, said: false });

  const hidden = HIDDEN_ON.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  const quiet = hidden || tucked || carried || mode !== "closed";

  /* A mood for a moment, then back to idle. */
  const flash = useCallback((m: FayMood, ms: number) => {
    window.clearTimeout(moodTimer.current);
    setMood(m);
    moodTimer.current = window.setTimeout(() => setMood("idle"), ms);
  }, []);

  /* Wave and talk briefly — for the hello and on opening. */
  const perk = useCallback(() => {
    flash("wave", 1800);
    setTalking(true);
    window.setTimeout(() => setTalking(false), 1600);
  }, [flash]);

  const speak = useCallback((b: Bubble) => {
    setBubble(b);
    setTalking(true);
    window.setTimeout(() => setTalking(false), 1200);
  }, []);

  /* The first time she shows her card to someone, she introduces herself. */
  const meet = useCallback(() => {
    if (!userId) return;
    setIntro(readStore(metKey(userId)) !== "1");
    writeStore(metKey(userId), "1");
  }, [userId]);

  const showTip = useCallback(
    (path: string, index: number) => {
      const tips = tipsFor(path);
      if (!tips[index]) return;
      speak({ kind: "tip", text: tips[index], tip: { path, index, total: tips.length } });
      if (index === 0) setHop((h) => h + 1);
    },
    [speak],
  );

  // ── Where she sits: follow window resizes, tuck to the bottom edge ──
  useEffect(() => {
    const place = () => {
      const s = spotOf(readFractions());
      setSpot(s);
      setLim(limits());
      x.set(s.x);
      y.set(tuckedRef.current ? tuckedY() : s.y);
    };
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [x, y]);

  useEffect(() => {
    const controls = animate(y, tucked ? tuckedY() : spot.y, { type: "spring", stiffness: 260, damping: 26 });
    return () => controls.stop();
  }, [tucked, spot.y, y]);

  // ── Her eyes follow the pointer; a click elsewhere makes her look ──
  // With reduced motion only her eyes move — no head turns.
  useEffect(() => {
    const centre = () => ({ cx: x.get() + FAY_W / 2, cy: y.get() + FAY_H * 0.36 });

    const onMove = (e: PointerEvent) => {
      lastPointerMove.current = Date.now();
      lookAround.current.forEach((c) => c.stop());
      lookAround.current = [];
      const { cx, cy } = centre();
      gazeRawX.set(clamp((e.clientX - cx) / 260, -1, 1));
      gazeRawY.set(clamp((e.clientY - cy) / 220, -1, 1));
      if (!still && Date.now() > glanceUntil.current) turnRaw.set(clamp((e.clientX - cx) / 700, -0.3, 0.3));
    };

    const onDown = (e: PointerEvent) => {
      if (rootRef.current?.contains(e.target as Node)) return;
      const { cx, cy } = centre();
      const dx = e.clientX - cx;
      if (!still) turnRaw.set(dx < 0 ? -1 : 1);
      gazeRawX.set(clamp(dx / 200, -1, 1));
      gazeRawY.set(clamp((e.clientY - cy) / 200, -1, 1));
      glanceUntil.current = Date.now() + GLANCE_MS;
      // Only the latest click's timer turns her back (a timer can fire a
      // touch early, so comparing clock times isn't reliable).
      const glance = ++glanceSeq.current;
      window.setTimeout(() => {
        if (glance === glanceSeq.current) {
          glanceUntil.current = 0;
          turnRaw.set(0);
        }
      }, GLANCE_MS);
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true, capture: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown, { capture: true });
    };
  }, [still, x, y, gazeRawX, gazeRawY, turnRaw]);

  // ── Dozing off when nobody's around, waking with a yawn ──
  useEffect(() => {
    const wake = () => {
      lastActivity.current = Date.now();
      if (dozingRef.current) {
        dozingRef.current = false;
        setDozing(false);
        flash("yawn", 1600);
      }
    };
    const events = ["pointermove", "pointerdown", "keydown", "scroll"] as const;
    events.forEach((ev) => window.addEventListener(ev, wake, { passive: true }));
    const check = window.setInterval(() => {
      if (Date.now() - lastActivity.current > DOZE_AFTER_MS && modeRef.current === "closed") setDozing(true);
    }, 10_000);
    return () => {
      events.forEach((ev) => window.removeEventListener(ev, wake));
      window.clearInterval(check);
    };
  }, [flash]);

  // ── The daily hello: once per person per day, not while tucked away ──
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

  // ── Something idle now and then: a hop, a look round, a yawn ──
  useEffect(() => {
    if (quiet || dozing || still) return;
    const t = window.setTimeout(() => {
      if (document.visibilityState === "visible") {
        const roll = Math.random();
        const pointerResting = Date.now() - lastPointerMove.current > 3_000;
        if (roll < 0.25 && pointerResting) {
          lookAround.current = [
            animate(gazeRawX, [0, -1, -1, 1, 1, 0], { duration: 2.6 }),
            animate(turnRaw, [0, -0.6, -0.6, 0.6, 0.6, 0], { duration: 2.6 }),
          ];
        } else if (roll < 0.45) {
          flash("yawn", 1500);
        } else {
          setHop((h) => h + 1);
        }
      }
      setIdleTick((n) => n + 1);
    }, between(ACTION_GAP_MS));
    return () => window.clearTimeout(t);
  }, [quiet, dozing, still, idleTick, flash, gazeRawX, turnRaw]);

  // ── Page tips: the first visit to each page, one tip at a time ──
  useEffect(() => {
    if (!userId || hidden || !tipsFor(pathname).length) return;
    if (seenTips(userId).includes(pathname)) return;
    setTipRoute(pathname);
  }, [pathname, userId, hidden]);

  useEffect(() => {
    if (!tipRoute || tipRoute !== pathname || !userId) return;
    if (!chatty || tucked || dozing || mode !== "closed") return;
    if (bubble && bubble.kind !== "cheer") return;
    const t = window.setTimeout(() => {
      writeStore(tipsKey(userId), JSON.stringify([...seenTips(userId), tipRoute]));
      setTipRoute(null);
      showTip(tipRoute, 0);
    }, 1_400);
    return () => window.clearTimeout(t);
  }, [tipRoute, pathname, userId, chatty, tucked, dozing, mode, bubble, showTip]);

  // ── Every few minutes a short bubble, a handful per visit at most ──
  useEffect(() => {
    if (quiet || dozing || bubble || !brief || !chatty || bubblesShown.current >= MAX_BUBBLES) return;
    const wait = bubblesShown.current === 0 ? FIRST_BUBBLE_MS : between(BUBBLE_GAP_MS);
    const t = window.setTimeout(() => {
      if (document.visibilityState !== "visible") return;
      const line = nextBubble(lastBubble.current);
      lastBubble.current = line;
      bubblesShown.current += 1;
      speak({ kind: "cheer", text: line });
      setHop((h) => h + 1);
    }, wait);
    return () => window.clearTimeout(t);
  }, [quiet, dozing, bubble, brief, chatty, speak]);

  // Bubbles go on their own (tips wait for a button), and whenever the card
  // opens, she's carried or tucked away.
  useEffect(() => {
    if (!bubble) return;
    if (quiet) {
      setBubble(null);
      return;
    }
    if (bubble.kind === "tip" || hovering) return;
    const t = window.setTimeout(() => setBubble(null), bubble.kind === "event" ? 9_000 : 7_000);
    return () => window.clearTimeout(t);
  }, [bubble, quiet, hovering]);

  // ── Reactions to what happens elsewhere in the app ──
  const onEvent = useCallback(
    (ev: FayEvent) => {
      if (ev.kind !== "status" || tuckedRef.current) return;
      dozingRef.current = false;
      setDozing(false);
      const company = ev.company?.trim() || "them";
      let line: Bubble | null = null;
      if (ev.status === "interview") {
        flash("celebrate", 2_200);
        setHop((h) => h + 1);
        line = {
          kind: "event",
          text: `An interview with ${company}! Proud of you.`,
          action: { label: "Practise for it", path: "/interview-prep" },
        };
      } else if (ev.status === "offer") {
        flash("celebrate", 2_400);
        setHop((h) => h + 1);
        line = { kind: "event", text: `An offer from ${company}! That's huge. Well done!` };
      } else if (ev.status === "rejected") {
        flash("sad", 2_600);
        line = { kind: "event", text: `Sorry about ${company}. Their loss, and every no gets you closer to a yes.` };
      } else if (ev.status === "applied") {
        flash("happy", 1_400);
        setHop((h) => h + 1);
        line = { kind: "event", text: `Applied to ${company}. Nice one!` };
      }
      if (line && chattyRef.current && modeRef.current === "closed") {
        const said = line;
        setBubble((b) => (b?.kind === "tip" ? b : said));
        setTalking(true);
        window.setTimeout(() => setTalking(false), 1200);
      }
    },
    [flash],
  );
  useFayEvents(onEvent);

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

  // Moving to another page closes the card and any tip from the last page.
  useEffect(() => {
    setMode("closed");
    setBubble((b) => (b?.kind === "tip" ? null : b));
  }, [pathname]);

  if (hidden) return null;

  const go = (path: string) => {
    setMode("closed");
    setBubble(null);
    navigate(path);
  };

  const open = () => {
    // Opening her counts as today's hello, so the daily one won't follow.
    if (userId) writeStore(greetedKey(userId), today());
    meet();
    reload();
    setBubble(null);
    dozingRef.current = false;
    setDozing(false);
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

  const toggleChatty = () => {
    const next = !chatty;
    setChatty(next);
    writeStore(CHATTY_KEY, next ? null : "0");
    if (!next) setBubble(null);
  };

  const goHome = () => {
    writeStore(SPOT_KEY, null);
    const s = spotOf(HOME);
    setSpot(s);
    animate(x, s.x, { type: "spring", stiffness: 260, damping: 26 });
    setHop((h) => h + 1);
  };

  /* Stroking her back and forth: hearts and a blush. */
  const onStroke = (e: ReactPointerEvent) => {
    if (e.pointerType !== "mouse" || carried || tucked) return;
    const p = petted.current;
    const dx = e.clientX - p.lastX;
    p.lastX = e.clientX;
    if (Math.abs(dx) < 2) return;
    const dir = Math.sign(dx);
    if (p.dir && dir !== p.dir) {
      const now = performance.now();
      p.flips = [...p.flips.filter((t) => now - t < 1_200), now];
      if (p.flips.length >= 4 && now - p.last > 2_500) {
        p.last = now;
        p.flips = [];
        flash("love", 1_700);
        setHearts((h) => h + 1);
        if (!p.said && chatty && mode === "closed") {
          p.said = true;
          speak({ kind: "pet", text: "Hehe, that tickles!" });
        }
      }
    }
    p.dir = dir;
  };

  const shortcuts = CRAFT_SIDEBAR_LINKS.filter((l) => l.path !== pathname);
  const met = intro && brief ? introFor(brief.firstName) : null;
  const place = placeNear(spot);
  const home = spotOf(HOME);
  const atHome = Math.abs(spot.x - home.x) < 2 && Math.abs(spot.y - home.y) < 2;
  const shownMood: FayMood = tucked || dozing ? "sleep" : carried ? "carried" : mood;

  return (
    <div ref={rootRef} className="cc-font-sans">
      <AnimatePresence mode="wait">
        {mode !== "closed" && brief ? (
          <motion.aside
            key="card"
            aria-label="Fay, your Faircopy helper"
            initial={{ opacity: 0, y: place.below ? -12 : 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: place.below ? -8 : 8, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
            style={{ ...place.style, originX: place.right ? 1 : 0, originY: place.below ? 0 : 1 }}
            onPointerEnter={() => setHovering(true)}
            onPointerLeave={() => setHovering(false)}
            className="fixed z-[35] w-[min(340px,calc(100vw-24px))] overflow-y-auto rounded-2xl border border-[color:var(--cc-hair)] bg-white p-4 text-[color:var(--cc-ink)] shadow-[0_18px_50px_-18px_rgba(20,22,26,0.35)]"
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
                <div className="mt-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 border-t border-[color:var(--cc-hair)] pt-3 text-[12.5px] text-[color:var(--cc-ash)]">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={chatty}
                    onClick={toggleChatty}
                    className="inline-flex items-center gap-2 hover:text-[color:var(--cc-ink)]"
                  >
                    <span
                      aria-hidden="true"
                      className={`relative h-4 w-7 rounded-full transition-colors ${chatty ? "bg-[color:var(--cc-rust)]" : "bg-[color:var(--cc-cream-3)]"}`}
                    >
                      <span
                        className={`absolute top-0.5 h-3 w-3 rounded-full bg-white shadow transition-[left] ${chatty ? "left-3.5" : "left-0.5"}`}
                      />
                    </span>
                    Tips and bubbles
                  </button>
                  <span className="flex items-center gap-3">
                    {!atHome && (
                      <button
                        type="button"
                        onClick={goHome}
                        className="underline-offset-2 hover:text-[color:var(--cc-ink)] hover:underline"
                      >
                        Back to my corner
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={tuckAway}
                      className="underline-offset-2 hover:text-[color:var(--cc-ink)] hover:underline"
                    >
                      Tuck Fay away
                    </button>
                  </span>
                </div>
              </>
            )}
          </motion.aside>
        ) : bubble ? (
          <motion.div
            key={`bubble-${bubble.kind}-${bubble.text}`}
            role="status"
            initial={{ opacity: 0, y: place.below ? -8 : 8, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 420, damping: 24 }}
            style={{
              ...place.style,
              maxHeight: undefined,
              originX: place.right ? 0.85 : 0.15,
              originY: place.below ? 0 : 1,
            }}
            onPointerEnter={() => setHovering(true)}
            onPointerLeave={() => setHovering(false)}
            className={`fixed z-[35] rounded-2xl border border-[color:var(--cc-hair)] bg-white text-[color:var(--cc-ink)] shadow-[0_12px_30px_-14px_rgba(20,22,26,0.4)] ${
              bubble.kind === "tip" ? "w-[min(280px,calc(100vw-24px))] p-3.5" : "max-w-[240px] px-3.5 py-2.5"
            }`}
          >
            {bubble.kind === "tip" && bubble.tip && (
              <p className="cc-label-sm mb-1 text-[color:var(--cc-ash)]">
                Fay's tip {bubble.tip.index + 1} of {bubble.tip.total}
              </p>
            )}
            {bubble.kind === "tip" ? (
              <p className="text-[13.5px] leading-snug">{bubble.text}</p>
            ) : (
              <button type="button" onClick={open} className="text-left text-[13.5px] font-medium leading-snug">
                {bubble.text}
              </button>
            )}
            {bubble.action && (
              <button
                type="button"
                onClick={() => go(bubble.action!.path)}
                className="cc-action cc-action--sm mt-2"
              >
                {bubble.action.label}
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            )}
            {bubble.kind === "tip" && bubble.tip && (
              <div className="mt-2.5 flex items-center justify-end gap-3 text-[12.5px]">
                <button
                  type="button"
                  onClick={() => setBubble(null)}
                  className="text-[color:var(--cc-ash)] hover:text-[color:var(--cc-ink)]"
                >
                  Got it
                </button>
                {bubble.tip.index + 1 < bubble.tip.total && (
                  <button
                    type="button"
                    onClick={() => showTip(bubble.tip!.path, bubble.tip!.index + 1)}
                    className="cc-action cc-action--sm"
                  >
                    Tell me more
                  </button>
                )}
              </div>
            )}
            {/* The little tail pointing at Fay */}
            <span
              aria-hidden="true"
              className={`absolute h-3 w-3 rotate-45 bg-white ${place.right ? "right-6" : "left-6"} ${
                place.below
                  ? "-top-[6px] border-l border-t border-[color:var(--cc-hair)]"
                  : "-bottom-[6px] border-b border-r border-[color:var(--cc-hair)]"
              }`}
            />
          </motion.div>
        ) : null}
      </AnimatePresence>

      <motion.button
        type="button"
        drag={!tucked}
        dragMomentum={false}
        dragElastic={0.08}
        dragConstraints={{ left: lim.minX, right: lim.maxX, top: lim.minY, bottom: lim.maxY }}
        onDragStart={() => {
          justDragged.current = true;
          setCarried(true);
          setMode("closed");
          setBubble(null);
        }}
        onDragEnd={() => {
          setCarried(false);
          const s = { x: x.get(), y: y.get() };
          setSpot(s);
          writeStore(SPOT_KEY, JSON.stringify(fractionsOf(s)));
          setHop((h) => h + 1);
          // The click that ends a drag isn't a click on her.
          window.setTimeout(() => {
            justDragged.current = false;
          }, 0);
        }}
        onClick={() => {
          if (justDragged.current) return;
          onFay();
        }}
        onPointerMove={onStroke}
        onPointerEnter={() => !tucked && mode === "closed" && mood === "idle" && setMood("happy")}
        onPointerLeave={() => setMood((m) => (m === "happy" ? "idle" : m))}
        aria-label={tucked ? "Wake Fay" : mode === "open" ? "Close Fay" : "Open Fay, your Faircopy helper. You can drag her anywhere."}
        aria-expanded={mode === "open"}
        whileHover={tucked ? undefined : { scale: 1.06 }}
        whileTap={{ scale: 0.94 }}
        whileDrag={{ scale: 1.08, cursor: "grabbing" }}
        style={{ x, y, touchAction: "none" }}
        className="fixed left-0 top-0 z-[35] cursor-grab rounded-2xl p-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--cc-rust)]"
      >
        <Fay
          mood={shownMood}
          talking={talking}
          hop={hop}
          hearts={hearts}
          gazeX={gazeX}
          gazeY={gazeY}
          turn={turn}
          size={FAY_SIZE}
        />
      </motion.button>
    </div>
  );
};

export default AssistantDock;
