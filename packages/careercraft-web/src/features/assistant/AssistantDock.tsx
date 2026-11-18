/* Fay, the quokka who lives on every signed-in page.

   - Once a day she waves and says hello with the most useful next step and
     a line of encouragement; the first time ever, she introduces herself.
   - The first time someone opens a page, she explains it a tip at a time.
   - Every few minutes she says something short in a bubble.
   - She sits in a little round window onto the sky that keeps the local
     clock: sunrise, blue sky, sunset, then moon, stars and fireflies.
   - Her eyes follow the pointer in quick darts, as eyes do, and wander a
     little when it rests; after a while she looks back out at you. When
     something else on the page is clicked (or a field takes focus) she
     turns to look at it and cocks her head; a big look comes with a blink.
   - She can be dragged anywhere (she dangles while carried) and remembers
     the spot. Stroke her back and forth and she blushes with hearts.
   - Idle, she hops, looks around or yawns; when nobody has touched the page
     for a few minutes she dozes off, and wakes with a yawn. She keeps the
     local clock: lively in the morning, heavy-eyed in a nightcap late at
     night (when she dozes off sooner).
   - Her card (FayCard) finds any page as you type and takes a question
     ("ask me anything"), streaming her answer through coach-chat with her
     own persona and allowance (focusArea fay); the question says which page
     it was asked on. It helps with the page you're on, and Ctrl/⌘ K opens
     it from anywhere.
   - She has her own motion setting (device / full / calm), so someone whose
     device asks for reduced motion can still choose to see her move.
   - She celebrates interviews and offers and comforts on a rejection
     (see fayBus). Tips and bubbles can be switched off; she can be tucked
     away entirely.
   She stays off the pages that are one big panel of their own — the
   interview room, the coach chat, admin. */

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  AnimatePresence,
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
} from "framer-motion";
import { ArrowRight } from "lucide-react";

import { CoachSessionExpiredError, streamCoachChat } from "@/lib/coachChat";
import { QuotaExceededError } from "@/lib/quota";

import type { FayTurn } from "./askFay";
import { dayPart, introFor, nextBubble, type DayPart } from "./brief";
import { Fay, type FayMood } from "./Fay";
import { FayCard, type MotionPref } from "./FayCard";
import { fayFrame } from "./fayArt";
import { useFayEvents, type FayEvent } from "./fayBus";
import { guideFor, IS_MAC, type FayAct } from "./guide";
import { tipsFor } from "./tips";
import { useAssistantBrief } from "./useAssistantBrief";

const HIDDEN_ON = [
  "/interview-prep/room",
  "/career-coach",
  "/admin",
  "/try",
  "/playground",
];

const FAY_SIZE = 62;
/** Her drawing in its window onto the sky, and where her eyes are in it. */
const FRAME = fayFrame(FAY_SIZE, true);
/** The button around her: the drawing plus p-1 padding. */
const FAY_W = Math.round(FRAME.width) + 8;
const FAY_H = Math.round(FRAME.height) + 8;
const EDGE = 12;

const TUCKED_KEY = "fc-assistant-tucked";
const SPOT_KEY = "fc-fay-spot";
const CHATTY_KEY = "fc-fay-chatty";
const MOTION_KEY = "fc-fay-motion";
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
/** Nobody has touched the page for this long: she dozes off (sooner at night). */
const DOZE_AFTER_MS = 180_000;
const DOZE_AFTER_NIGHT_MS = 60_000;
/** A click only makes her start ("!", ears up) if she's been calm this long. */
const NOTICE_GAP_MS = 8_000;
/** How long she keeps looking at something that was clicked. */
const GLANCE_MS = 1_400;
/** Her eyes jump to a new spot at most this often while following the pointer. */
const SACCADE_MS = 140;
/** While the pointer rests, a small dart of the eyes every so often. */
const WANDER_GAP_MS = [1_200, 3_400] as const;
/** The pointer has rested this long: she looks back out at you. */
const LOOK_BACK_MS = 9_000;

const today = () => new Date().toLocaleDateString("en-CA");
const between = ([lo, hi]: readonly [number, number]) =>
  lo + Math.random() * (hi - lo);
const clamp = (v: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, v));

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
    const raw = JSON.parse(
      readStore(SPOT_KEY) ?? "null",
    ) as Partial<Fractions> | null;
    if (raw && Number.isFinite(raw.fx) && Number.isFinite(raw.fy)) {
      return {
        fx: clamp(raw.fx as number, 0, 1),
        fy: clamp(raw.fy as number, 0, 1),
      };
    }
  } catch {
    /* fall through to home */
  }
  return HOME;
}

function spotOf(f: Fractions): Spot {
  const l = limits();
  return {
    x: l.minX + f.fx * (l.maxX - l.minX),
    y: l.minY + f.fy * (l.maxY - l.minY),
  };
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
    return Array.isArray(raw)
      ? raw.filter((p): p is string => typeof p === "string")
      : [];
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
  const deviceStill = useReducedMotion() ?? false;

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
  const [motionPref, setMotionPref] = useState<MotionPref>(() => {
    const v = readStore(MOTION_KEY);
    return v === "full" || v === "calm" ? v : "auto";
  });
  const [part, setPart] = useState<DayPart>(() => dayPart(new Date()));
  const [notice, setNotice] = useState(0);
  const [glance, setGlance] = useState({ n: 0, side: 1 });
  const [blink, setBlink] = useState(0);
  const [poke, setPoke] = useState(0);
  const [turns, setTurns] = useState<FayTurn[]>([]);
  /** The card opened from the keyboard or "Ask me anything": cursor in the box. */
  const [focusOnOpen, setFocusOnOpen] = useState(false);
  const still = motionPref === "calm" || (motionPref === "auto" && deviceStill);

  // Position (dragged directly) and where she looks (sprung, so it's soft).
  const x = useMotionValue(spot.x);
  const y = useMotionValue(tucked ? tuckedY() : spot.y);
  const gazeRawX = useMotionValue(0);
  const gazeRawY = useMotionValue(0);
  const turnRaw = useMotionValue(0);
  // The eyes dart and settle fast (a hint of overshoot keeps them lively);
  // the head follows slower, so her eyes lead and her head comes after.
  const gazeX = useSpring(gazeRawX, { stiffness: 520, damping: 36 });
  const gazeY = useSpring(gazeRawY, { stiffness: 520, damping: 36 });
  const turn = useSpring(turnRaw, { stiffness: 70, damping: 14 });

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
  /** Where her eyes are pointed (gaze units) and when they last moved. */
  const aim = useRef({ x: 0, y: 0, at: 0 });
  /** Where the pointer is, in the same units. */
  const pointer = useRef({ x: 0, y: 0 });
  const settle = useRef<number>();
  const lastBlink = useRef(0);
  const lastDown = useRef(0);
  const lookTimers = useRef<number[]>([]);
  const petted = useRef({
    lastX: 0,
    dir: 0,
    flips: [] as number[],
    last: 0,
    said: false,
  });
  const lastNotice = useRef(0);
  const partRef = useRef(part);
  partRef.current = part;
  const sessionRef = useRef<string | undefined>();
  const askAbort = useRef<AbortController | null>(null);
  const askInput = useRef<HTMLInputElement>(null);
  const asking = turns.some(
    (t) => t.status === "thinking" || t.status === "streaming",
  );
  const thinking = turns.some((t) => t.status === "thinking");

  const hidden = HIDDEN_ON.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
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

  /* Point her eyes somewhere. A big shift comes with a blink, as ours do. */
  const lookAt = useCallback(
    (gx: number, gy: number) => {
      const jump = Math.hypot(gx - aim.current.x, gy - aim.current.y);
      aim.current = { x: gx, y: gy, at: Date.now() };
      gazeRawX.set(gx);
      gazeRawY.set(gy);
      if (jump > 0.9 && Date.now() - lastBlink.current > 1_500) {
        lastBlink.current = Date.now();
        setBlink((b) => b + 1);
      }
    },
    [gazeRawX, gazeRawY],
  );

  const stopLookRound = useCallback(() => {
    lookTimers.current.forEach((t) => window.clearTimeout(t));
    lookTimers.current = [];
  }, []);

  /* A look round: to one side, the other, then back to you. */
  const lookRound = useCallback(() => {
    stopLookRound();
    const steps = [
      [0, -0.9, -0.05, -0.55],
      [1_000, 0.9, -0.05, 0.55],
      [2_000, 0, 0.05, 0],
    ] as const;
    lookTimers.current = steps.map(([ms, gx, gy, t], i) =>
      window.setTimeout(() => {
        lookAt(gx, gy);
        turnRaw.set(t);
        if (i === steps.length - 1) lookTimers.current = [];
      }, ms),
    );
  }, [lookAt, stopLookRound, turnRaw]);

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
      speak({
        kind: "tip",
        text: tips[index],
        tip: { path, index, total: tips.length },
      });
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
    const controls = animate(y, tucked ? tuckedY() : spot.y, {
      type: "spring",
      stiffness: 260,
      damping: 26,
    });
    return () => controls.stop();
  }, [tucked, spot.y, y]);

  // ── Her eyes follow the pointer; a click elsewhere makes her look ──
  // With reduced motion only her eyes move — no head turns or tilts.
  useEffect(() => {
    const centre = () => ({
      cx: x.get() + 4 + FRAME.eyeX,
      cy: y.get() + 4 + FRAME.eyeY,
    });
    // Head turn while just following the pointer: a little, toward it.
    const easyTurn = () => clamp(pointer.current.x * 0.37, -0.3, 0.3);

    const onMove = (e: PointerEvent) => {
      lastPointerMove.current = Date.now();
      stopLookRound();
      const { cx, cy } = centre();
      const tx = clamp((e.clientX - cx) / 260, -1, 1);
      const ty = clamp((e.clientY - cy) / 280, -1, 1);
      pointer.current = { x: tx, y: ty };
      // Eyes jump to a new spot and hold there, rather than gliding after
      // the pointer like a painting's; they land where it stops.
      window.clearTimeout(settle.current);
      const a = aim.current;
      if (
        Date.now() - a.at > SACCADE_MS &&
        Math.hypot(tx - a.x, ty - a.y) > 0.12
      )
        lookAt(tx, ty);
      else settle.current = window.setTimeout(() => lookAt(tx, ty), SACCADE_MS);
      if (!still && Date.now() > glanceUntil.current) turnRaw.set(easyTurn());
    };

    /* Look at a point on the page for a moment, head turned and cocked. */
    const glanceAt = (px: number, py: number) => {
      const { cx, cy } = centre();
      const dx = px - cx;
      lookAt(clamp(dx / 200, -1, 1), clamp((py - cy) / 260, -1, 1));
      if (!still) {
        // As far round as it's worth: a little for something close, more
        // for something across the page, never so far her face slides off.
        const t = clamp(dx / 420, -0.8, 0.8);
        turnRaw.set(
          Math.abs(dx) > 40 ? Math.sign(t) * Math.max(0.3, Math.abs(t)) : t,
        );
      }
      setGlance((g) => ({ n: g.n + 1, side: dx < 0 ? -1 : 1 }));
      glanceUntil.current = Date.now() + GLANCE_MS;
      // Only the latest glance's timer turns her back (a timer can fire a
      // touch early, so comparing clock times isn't reliable).
      const seq = ++glanceSeq.current;
      window.setTimeout(() => {
        if (seq !== glanceSeq.current) return;
        glanceUntil.current = 0;
        turnRaw.set(still ? 0 : easyTurn());
      }, GLANCE_MS);
    };

    const onDown = (e: PointerEvent) => {
      if (rootRef.current?.contains(e.target as Node)) return;
      lastDown.current = Date.now();
      stopLookRound();
      glanceAt(e.clientX, e.clientY);
      // After a calm spell, a click makes her start: a blink, ears up, a "!".
      if (Date.now() - lastNotice.current > NOTICE_GAP_MS)
        setNotice((n) => n + 1);
      lastNotice.current = Date.now();
    };

    // Tabbing into a field makes her look at it too (a click already did).
    const onFocus = (e: FocusEvent) => {
      const el = e.target;
      if (!(el instanceof HTMLElement) || rootRef.current?.contains(el)) return;
      if (Date.now() - lastDown.current < 400) return;
      if (!el.matches("input, textarea, select, [contenteditable='true']"))
        return;
      const r = el.getBoundingClientRect();
      glanceAt(r.left + r.width / 2, r.top + r.height / 2);
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown, {
      passive: true,
      capture: true,
    });
    window.addEventListener("focusin", onFocus);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown, { capture: true });
      window.removeEventListener("focusin", onFocus);
      window.clearTimeout(settle.current);
    };
  }, [still, x, y, turnRaw, lookAt, stopLookRound]);

  // ── While the pointer rests her eyes wander a little; after a while she
  // looks back out at you ──
  useEffect(() => {
    if (hidden || tucked) return;
    let t: number;
    const next = () => {
      t = window.setTimeout(() => {
        const now = Date.now();
        const resting = now - lastPointerMove.current;
        if (
          document.visibilityState === "visible" &&
          !dozingRef.current &&
          now > glanceUntil.current &&
          !lookTimers.current.length &&
          resting > 2_500
        ) {
          const base =
            resting > LOOK_BACK_MS ? { x: 0, y: 0 } : pointer.current;
          lookAt(
            clamp(base.x + (Math.random() - 0.5) * 0.3, -1, 1),
            clamp(base.y + (Math.random() - 0.5) * 0.2, -1, 1),
          );
        }
        next();
      }, between(WANDER_GAP_MS));
    };
    next();
    return () => {
      window.clearTimeout(t);
      stopLookRound();
    };
  }, [hidden, tucked, lookAt, stopLookRound]);

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
    events.forEach((ev) =>
      window.addEventListener(ev, wake, { passive: true }),
    );
    const check = window.setInterval(() => {
      const after =
        partRef.current === "night" ? DOZE_AFTER_NIGHT_MS : DOZE_AFTER_MS;
      if (
        Date.now() - lastActivity.current > after &&
        modeRef.current === "closed"
      )
        setDozing(true);
    }, 10_000);
    return () => {
      events.forEach((ev) => window.removeEventListener(ev, wake));
      window.clearInterval(check);
    };
  }, [flash]);

  // ── She keeps the local clock ──
  useEffect(() => {
    const t = window.setInterval(() => setPart(dayPart(new Date())), 60_000);
    return () => window.clearInterval(t);
  }, []);

  // A question in flight is dropped if she goes away entirely.
  useEffect(() => () => askAbort.current?.abort(), []);

  /* Open her card: it counts as today's hello, and she wakes and waves. */
  const open = useCallback(
    (focus = false) => {
      // Opening her counts as today's hello, so the daily one won't follow.
      if (userId) writeStore(greetedKey(userId), today());
      meet();
      reload();
      setBubble(null);
      dozingRef.current = false;
      setDozing(false);
      setFocusOnOpen(focus);
      setMode("open");
      perk();
    },
    [userId, meet, reload, perk],
  );

  // ── Ctrl K (⌘ K on a Mac): her card from anywhere, the cursor in its box;
  // again to close. Only the platform's own key: Ctrl K in a Mac text field
  // deletes to the end of the line. The key's place on the keyboard counts as
  // well as its letter, so it works on any layout. ──
  useEffect(() => {
    if (hidden) return;
    const onKey = (e: KeyboardEvent) => {
      if (!(IS_MAC ? e.metaKey : e.ctrlKey)) return;
      if (e.code !== "KeyK" && e.key.toLowerCase() !== "k") return;
      if (e.altKey || e.shiftKey || e.repeat) return;
      if ((e.target as HTMLElement | null)?.isContentEditable) return;
      e.preventDefault();
      if (modeRef.current === "open") {
        if (document.activeElement === askInput.current) setMode("closed");
        else askInput.current?.focus();
        return;
      }
      if (tuckedRef.current) {
        setTucked(false);
        writeStore(TUCKED_KEY, null);
      }
      open(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [hidden, open]);

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
        // Lively in the morning (mostly hops), yawny late at night.
        const [look, yawn] =
          part === "morning"
            ? [0.2, 0.28]
            : part === "night"
              ? [0.15, 0.6]
              : [0.25, 0.45];
        const roll = Math.random();
        const pointerResting = Date.now() - lastPointerMove.current > 3_000;
        if (roll < look && pointerResting) {
          lookRound();
        } else if (roll < yawn) {
          flash("yawn", 1500);
        } else {
          setHop((h) => h + 1);
        }
      }
      setIdleTick((n) => n + 1);
    }, between(ACTION_GAP_MS));
    return () => window.clearTimeout(t);
  }, [quiet, dozing, still, idleTick, part, flash, lookRound]);

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
      writeStore(
        tipsKey(userId),
        JSON.stringify([...seenTips(userId), tipRoute]),
      );
      setTipRoute(null);
      showTip(tipRoute, 0);
    }, 1_400);
    return () => window.clearTimeout(t);
  }, [
    tipRoute,
    pathname,
    userId,
    chatty,
    tucked,
    dozing,
    mode,
    bubble,
    showTip,
  ]);

  // ── Every few minutes a short bubble, a handful per visit at most ──
  useEffect(() => {
    if (
      quiet ||
      dozing ||
      bubble ||
      !brief ||
      !chatty ||
      bubblesShown.current >= MAX_BUBBLES
    )
      return;
    const wait =
      bubblesShown.current === 0 ? FIRST_BUBBLE_MS : between(BUBBLE_GAP_MS);
    const t = window.setTimeout(() => {
      if (document.visibilityState !== "visible") return;
      const line = nextBubble(lastBubble.current, Math.random, part);
      lastBubble.current = line;
      bubblesShown.current += 1;
      speak({ kind: "cheer", text: line });
      setHop((h) => h + 1);
    }, wait);
    return () => window.clearTimeout(t);
  }, [quiet, dozing, bubble, brief, chatty, part, speak]);

  // A card or bubble that closes under the pointer never hears it leave, so
  // whenever what's shown changes, nothing is being read until it's pointed at.
  useEffect(() => setHovering(false), [mode, bubble]);

  // Bubbles go on their own (tips wait for a button), and whenever the card
  // opens, she's carried or tucked away.
  useEffect(() => {
    if (!bubble) return;
    if (quiet) {
      setBubble(null);
      return;
    }
    if (bubble.kind === "tip" || hovering) return;
    const t = window.setTimeout(
      () => setBubble(null),
      bubble.kind === "event" ? 9_000 : 7_000,
    );
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
        line = {
          kind: "event",
          text: `An offer from ${company}! That's huge. Well done!`,
        };
      } else if (ev.status === "rejected") {
        flash("sad", 2_600);
        line = {
          kind: "event",
          text: `Sorry about ${company}. Their loss, and every no gets you closer to a yes.`,
        };
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
      if (rootRef.current && !rootRef.current.contains(e.target as Node))
        setMode("closed");
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

  /* Ask Fay something; her answer streams into the card. The page it was
     asked on goes with it, in the person's own voice so it needs no rule in
     her persona: "how do I add one?" then means the page in view. Only the
     question itself is shown in the card. */
  const ask = async (raw: string) => {
    const q = raw.trim().slice(0, 500);
    if (!q || asking) return;
    const id = Date.now();
    const where = guideFor(pathname)?.label;
    const message = where ? `(I'm on the ${where} page.) ${q}` : q;
    setTurns((ts) => [
      ...ts.slice(-4),
      { id, question: q, answer: "", status: "thinking" },
    ]);
    const update = (patch: Partial<FayTurn>) =>
      setTurns((ts) => ts.map((t) => (t.id === id ? { ...t, ...patch } : t)));
    const controller = new AbortController();
    askAbort.current = controller;

    const run = async () => {
      let text = "";
      for await (const ev of streamCoachChat({
        message,
        sessionId: sessionRef.current,
        focusArea: "fay",
        personaName: "Fay",
        signal: controller.signal,
      })) {
        if (ev.kind === "session") sessionRef.current = ev.id;
        else if (ev.kind === "token") {
          if (!text) setTalking(true);
          text += ev.text;
          update({ answer: text, status: "streaming" });
        } else if (ev.kind === "citations") {
          const sources = ev.citations
            .filter(
              (c): c is typeof c & { url: string } =>
                typeof c.url === "string" && /^https:\/\//.test(c.url),
            )
            .slice(0, 3)
            .map((c) => ({ n: c.n, title: c.title, url: c.url }));
          if (sources.length) update({ sources });
        } else if (ev.kind === "error") throw new Error(ev.message);
      }
      return text;
    };

    try {
      let text: string;
      try {
        text = await run();
      } catch (err) {
        // Horus forgot the conversation: start a fresh one and ask again.
        if (!(err instanceof CoachSessionExpiredError)) throw err;
        sessionRef.current = undefined;
        text = await run();
      }
      update({
        status: "done",
        answer:
          text.trim() ||
          "Sorry, I didn't catch that. Could you ask it another way?",
      });
      flash("happy", 900);
    } catch (err) {
      if (controller.signal.aborted) return;
      // A spent allowance won't come back by asking again; a hiccup might.
      update(
        err instanceof QuotaExceededError
          ? { status: "error", answer: err.message }
          : {
              status: "error",
              canRetry: true,
              answer: "Sorry, I couldn't answer just now. Try again in a moment.",
            },
      );
      flash("sad", 1_200);
    } finally {
      setTalking(false);
    }
  };

  /* Back from an answer to her home view; the next question starts afresh. */
  const startOver = () => {
    askAbort.current?.abort();
    sessionRef.current = undefined;
    setTurns([]);
  };

  const chooseMotion = (pref: MotionPref) => {
    setMotionPref(pref);
    writeStore(MOTION_KEY, pref === "auto" ? null : pref);
  };

  const go = (path: string) => {
    setMode("closed");
    setBubble(null);
    navigate(path);
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

  /* "Show me around": this page's tips again, from the first. */
  const tour = () => {
    if (!tipsFor(pathname).length) return;
    setMode("closed");
    setTipRoute(null);
    if (userId && !seenTips(userId).includes(pathname))
      writeStore(tipsKey(userId), JSON.stringify([...seenTips(userId), pathname]));
    showTip(pathname, 0);
  };

  /* Something she does herself, from her card's search or menu. */
  const act = (what: FayAct) => {
    if (what === "tour") tour();
    else if (what === "chatty") toggleChatty();
    else if (what === "tuck") tuckAway();
    else if (what === "corner") goHome();
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

  const met = intro && brief ? introFor(brief.firstName) : null;
  const place = placeNear(spot);
  const home = spotOf(HOME);
  const atHome = Math.abs(spot.x - home.x) < 2 && Math.abs(spot.y - home.y) < 2;
  // Her card shows one answer at a time: the latest.
  const latest = mode === "open" ? turns[turns.length - 1] : undefined;
  const shownMood: FayMood =
    tucked || dozing
      ? "sleep"
      : carried
        ? "carried"
        : thinking
          ? "think"
          : mood;

  return (
    <div ref={rootRef} className="cc-font-sans">
      <AnimatePresence mode="wait">
        {mode !== "closed" && brief ? (
          <FayCard
            key="card"
            mode={mode}
            brief={brief}
            intro={met}
            part={part}
            still={still}
            pathname={pathname}
            place={place}
            latest={latest}
            asking={asking}
            inputRef={askInput}
            autoFocus={focusOnOpen}
            settings={{
              chatty,
              motionPref,
              deviceStill,
              atHome,
              canTour: tipsFor(pathname).length > 0,
            }}
            onAsk={(q) => void ask(q)}
            onBack={startOver}
            onGo={go}
            onAct={act}
            onMotion={chooseMotion}
            onClose={() => setMode("closed")}
            onHover={setHovering}
          />
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
              bubble.kind === "tip"
                ? "w-[min(280px,calc(100vw-24px))] p-3.5"
                : "max-w-[240px] px-3.5 py-2.5"
            }`}
          >
            {bubble.kind === "tip" && bubble.tip && (
              <p className="mb-1.5 flex items-center gap-2 text-[12px] font-medium text-[color:var(--cc-ash)]">
                Tip {bubble.tip.index + 1} of {bubble.tip.total}
                <span className="flex gap-1" aria-hidden="true">
                  {Array.from({ length: bubble.tip.total }, (_, k) => (
                    <span
                      key={k}
                      className={`h-1.5 w-1.5 rounded-full ${
                        k <= bubble.tip!.index
                          ? "bg-[color:var(--cc-rust)]"
                          : "bg-[color:var(--cc-cream-3)]"
                      }`}
                    />
                  ))}
                </span>
              </p>
            )}
            {bubble.kind === "tip" ? (
              <p className="text-[13.5px] leading-snug">{bubble.text}</p>
            ) : (
              <button
                type="button"
                // "Ask me anything" opens with the cursor in her box.
                onClick={() => open(/^Ask me anything/.test(bubble.text))}
                className="text-left text-[13.5px] font-medium leading-snug"
              >
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
                    onClick={() =>
                      showTip(bubble.tip!.path, bubble.tip!.index + 1)
                    }
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
        dragConstraints={{
          left: lim.minX,
          right: lim.maxX,
          top: lim.minY,
          bottom: lim.maxY,
        }}
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
          setPoke((p) => p + 1);
          onFay();
        }}
        onPointerMove={onStroke}
        onPointerEnter={() =>
          !tucked && mode === "closed" && mood === "idle" && setMood("happy")
        }
        onPointerLeave={() => setMood((m) => (m === "happy" ? "idle" : m))}
        aria-label={
          tucked
            ? "Wake Fay"
            : mode === "open"
              ? "Close Fay"
              : "Open Fay, your Faircopy helper. You can drag her anywhere."
        }
        aria-expanded={mode === "open"}
        whileHover={tucked ? undefined : { scale: 1.05 }}
        whileTap={{ scale: 0.96 }}
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
          notice={notice}
          glance={glance.n}
          glanceSide={glance.side}
          blink={blink}
          poke={poke}
          drowsy={part === "night"}
          nightcap={part === "night"}
          scene={part}
          still={still}
          size={FAY_SIZE}
        />
      </motion.button>
    </div>
  );
};

export default AssistantDock;
