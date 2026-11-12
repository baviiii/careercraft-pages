/* Fay, the assistant's character: a small quokka reading the open book
   from the Faircopy mark (mint and periwinkle pages, a golden spark above).
   What makes her a quokka and not a bear: cheeks wider than the crown, oval
   ears out to the sides, a pale lower face rather than a round muzzle, the
   grin, a thin tail and long feet.

   Alive: her eyes follow a point (gaze) and blink at odd moments, sometimes
   twice. Her head turns toward one side (turn, -1 left … 1 right): each part
   of the face moves by its own amount — the nose most, the near eye more
   than the far one, which narrows — so it reads as a head going round, not
   a face sliding across it. She cocks her head at whatever caught her eye.
   Idle, she breathes, bobs, sniffs, sways her tail, twitches an ear and
   turns a page. She hops when nudged, squishes when clicked, waves, beams,
   celebrates with sparks, droops when sad, startles, dangles when carried,
   blushes with hearts when petted, yawns and dozes; her eyes and mouth ease
   from one expression to the next. With a scene she sits in a round window
   onto the sky for the time of day (FayScene). With reduced motion her body
   holds still; her face still changes, her eyes follow and she blinks. */

import { useCallback, useEffect, useId, useState } from "react";
import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
  type MotionValue,
} from "framer-motion";

import type { DayPart } from "./brief";
import { at, INK, PLAIN_BOX, SCENE_BOX, sparkPath } from "./fayArt";
import { FayScene } from "./FayScene";

export type FayMood =
  | "idle"
  | "wave"
  | "happy"
  | "sleep"
  | "celebrate"
  | "sad"
  | "surprised"
  | "carried"
  | "love"
  | "yawn"
  | "think";

const FUR = "#B49A83";
const FUR_LIGHT = "#E8D9CA";
const EAR = "#D9A291";
const NOSE = "#2A2220";
const MINT = "#A9E4D0";
const PERIWINKLE = "#A7BCEC";
const PAGE = "#DCE5FA";
const PEACH = "#F6A99B";
const BUTTER = "#F9D58A";
const SPARK = "#F5B95F";
const CHEEK = "#F4A3A0";
const HEART = "#F07C8A";
/* Narrow crown, chubby cheeks. The face is clipped to this, so when she
   turns her features wrap round it like a three-quarter view. */
const HEAD =
  "M50 21 C63 21 71 28 74 38 C81 43 82 56 75 63 C69 68.5 60 70.5 50 70.5 C40 70.5 31 68.5 25 63 C18 56 19 43 26 38 C29 28 37 21 50 21 Z";

interface FayProps {
  mood?: FayMood;
  /** Mouth moves, as if speaking. */
  talking?: boolean;
  /** Bump to make her hop once. */
  hop?: number;
  /** Bump to float a few hearts up. */
  hearts?: number;
  /** Where she looks, each -1 … 1 (left/up … right/down). */
  gazeX?: MotionValue<number>;
  gazeY?: MotionValue<number>;
  /** Head turn, -1 (to her left of the screen) … 1 (right). */
  turn?: MotionValue<number>;
  /** Bump when something catches her eye: a blink, ears up, a little "!". */
  notice?: number;
  /** Bump when she looks at something; she cocks her head toward glanceSide. */
  glance?: number;
  glanceSide?: number;
  /** Bump for a blink (the dock blinks her with a big shift of gaze). */
  blink?: number;
  /** Bump when she's clicked: a squish and spring back. */
  poke?: number;
  /** Sleepy, half-lidded eyes — late at night. */
  drowsy?: boolean;
  /** A nightcap — late at night. */
  nightcap?: boolean;
  /** Sit her in a round window onto the sky for this time of day. */
  scene?: DayPart;
  /** Override for reduced motion (the dock's own setting); defaults to the device's. */
  still?: boolean;
  size?: number;
  className?: string;
}

const heartPath = (cx: number, cy: number, s: number) =>
  `M${cx} ${cy + s * 0.9} C${cx - s * 1.6} ${cy - s * 0.1} ${cx - s * 0.9} ${cy - s * 1.3} ${cx} ${cy - s * 0.45} C${cx + s * 0.9} ${cy - s * 1.3} ${cx + s * 1.6} ${cy - s * 0.1} ${cx} ${cy + s * 0.9} Z`;

const loop = (duration: number, repeatDelay = 0) => ({
  duration,
  repeat: Infinity,
  repeatDelay,
  ease: "easeInOut" as const,
});

type EyeLook = "open" | "happy" | "shut";

interface EyeProps {
  cx: number;
  look: EyeLook;
  /** Bigger and rounder: startled. */
  wide: boolean;
  /** Where this eye sits as the head turns (each eye moves its own amount). */
  layerX: MotionValue<number>;
  layerY: MotionValue<number>;
  /** Narrower as it turns away. */
  squeeze: MotionValue<number>;
  /** The eyelid: 1 open … 0 shut (a little lower when she's sleepy). */
  lid: MotionValue<number>;
  /** Where the eye points, and the catchlight lagging it. */
  ballX: MotionValue<number>;
  ballY: MotionValue<number>;
  glintX: MotionValue<number>;
  glintY: MotionValue<number>;
}

/* One eye. Open, a happy arc or shut; each change is a quick squint into the
   next look instead of a swap. */
const Eye = ({
  cx,
  look,
  wide,
  layerX,
  layerY,
  squeeze,
  lid,
  ballX,
  ballY,
  glintX,
  glintY,
}: EyeProps) => {
  const arcX = useTransform(ballX, (v) => v * 0.4);
  const ease = { duration: 0.12, ease: "easeOut" as const };
  const shown = (on: boolean) => ({
    opacity: on ? 1 : 0,
    scaleY: on ? 1 : 0.2,
    transition: { ...ease, delay: on ? 0.06 : 0 },
  });

  return (
    <motion.g style={{ x: layerX, y: layerY }}>
      <motion.g style={{ ...at(cx, 41), scaleX: squeeze }}>
        <motion.g
          initial={false}
          animate={shown(look === "open")}
          style={at(cx, 42)}
        >
          <motion.g style={{ ...at(cx, 42), scaleY: lid }}>
            <motion.g style={{ x: ballX, y: ballY }}>
              <motion.ellipse
                cx={cx}
                cy={41}
                rx={3.9}
                ry={4.8}
                fill={INK}
                initial={false}
                animate={wide ? { rx: 4.6, ry: 5.8 } : { rx: 3.9, ry: 4.8 }}
                transition={{ type: "spring", stiffness: 500, damping: 22 }}
              />
              <motion.circle
                cx={cx + 1.4}
                cy={39.2}
                r={1.4}
                fill="#FFFFFF"
                style={{ x: glintX, y: glintY }}
              />
            </motion.g>
          </motion.g>
        </motion.g>
        <motion.path
          d={`M${cx - 4} 43 Q${cx} 38 ${cx + 4} 43`}
          fill="none"
          stroke={INK}
          strokeWidth="2.6"
          strokeLinecap="round"
          initial={false}
          animate={shown(look === "happy")}
          style={{ ...at(cx, 41), x: arcX }}
        />
        <motion.path
          d={`M${cx - 4} 41 Q${cx} 44.5 ${cx + 4} 41`}
          fill="none"
          stroke={INK}
          strokeWidth="2.4"
          strokeLinecap="round"
          initial={false}
          animate={shown(look === "shut")}
          style={at(cx, 42)}
        />
      </motion.g>
    </motion.g>
  );
};

export const Fay = ({
  mood = "idle",
  talking = false,
  hop = 0,
  hearts = 0,
  gazeX,
  gazeY,
  turn,
  notice = 0,
  glance = 0,
  glanceSide = 1,
  blink = 0,
  poke = 0,
  drowsy = false,
  nightcap = false,
  scene,
  still: stillProp,
  size = 64,
  className = "",
}: FayProps) => {
  const deviceStill = useReducedMotion() ?? false;
  const still = stillProp ?? deviceStill;
  const uid = useId().replace(/:/g, "");
  const clipId = `fay-head-${uid}`;
  const sceneClip = `fay-window-${uid}`;
  const zero = useMotionValue(0);
  const gx = gazeX ?? zero;
  const gy = gazeY ?? zero;
  const tn = turn ?? zero;

  const asleep = mood === "sleep";
  const eyesShut = asleep || mood === "yawn";
  const moving = !still && !asleep;
  const beaming =
    mood === "happy" ||
    mood === "celebrate" ||
    mood === "love" ||
    mood === "wave";
  const startled = mood === "surprised" || mood === "carried";
  const look: EyeLook = eyesShut ? "shut" : beaming ? "happy" : "open";

  // ── The face as she turns: each layer moves its own amount ──
  // For a turn to the right (t > 0) the left eye and cheek are the near ones.
  const layer = (nearBy: number, farBy: number, gazeBy: number, left: boolean) =>
    ([t, g]: number[]) =>
      (left === t > 0 ? t * nearBy : t * farBy) + g * gazeBy;
  const tg = [tn, gx] as MotionValue<number>[];
  const patchX = useTransform(tg, ([t, g]: number[]) => t * 3 + g * 0.4);
  const cheekLX = useTransform(tg, layer(3.6, 1.4, 0.3, true));
  const cheekRX = useTransform(tg, layer(3.6, 1.4, 0.3, false));
  const eyeLX = useTransform(tg, layer(4.8, 3.4, 0.6, true));
  const eyeRX = useTransform(tg, layer(4.8, 3.4, 0.6, false));
  const eyeLSqueeze = useTransform(tn, (t) => 1 - Math.max(0, -t) * 0.24);
  const eyeRSqueeze = useTransform(tn, (t) => 1 - Math.max(0, t) * 0.24);
  const browX = useTransform(tg, ([t, g]: number[]) => t * 4.1 + g * 0.6);
  const noseX = useTransform(tg, ([t, g]: number[]) => t * 6 + g * 0.8);
  const mouthX = useTransform(tg, ([t, g]: number[]) => t * 5.4 + g * 0.7);
  const faceY = useTransform(gy, (v) => v * 0.5);
  const earLeftX = useTransform(tn, (t) => t * (t > 0 ? 4.2 : 1.8));
  const earRightX = useTransform(tn, (t) => t * (t < 0 ? 4.2 : 1.8));
  const bodyX = useTransform(tn, (t) => t * 1.5);

  // ── Where the eyes point: the gaze, or a set look while she thinks or droops ──
  const fixW = useSpring(0, { stiffness: 220, damping: 26 });
  const fixX = useSpring(0, { stiffness: 220, damping: 26 });
  const fixY = useSpring(0, { stiffness: 220, damping: 26 });
  useEffect(() => {
    const fix = mood === "think" ? [1.6, -1.8] : mood === "sad" ? [0, 1.8] : null;
    fixW.set(fix ? 1 : 0);
    if (fix) {
      fixX.set(fix[0]);
      fixY.set(fix[1]);
    }
  }, [mood, fixW, fixX, fixY]);
  const ballX = useTransform(
    [gx, fixX, fixW] as MotionValue<number>[],
    ([g, f, w]: number[]) => g * 1.5 * (1 - w) + f * w,
  );
  const ballY = useTransform(
    [gy, fixY, fixW] as MotionValue<number>[],
    ([g, f, w]: number[]) => g * 1.2 * (1 - w) + f * w,
  );
  // The catchlight lags the eye a little, so the eye reads round and glossy.
  const glintX = useTransform(ballX, (v) => -v * 0.45);
  const glintY = useTransform(ballY, (v) => -v * 0.45);

  // ── Blinks: at odd moments, sometimes twice; small enough for calm mode.
  // Late at night her eyes rest half-lidded and blink slower. ──
  const rest = drowsy ? 0.6 : 1;
  const lid = useMotionValue(rest);
  useEffect(() => {
    animate(lid, rest, { duration: 0.6 });
  }, [lid, rest]);
  const blinkNow = useCallback(
    (twice = false) => {
      animate(lid, twice ? [rest, 0.08, rest, 0.08, rest] : [rest, 0.08, rest], {
        duration: (twice ? 0.42 : 0.17) * (rest < 1 ? 1.5 : 1),
        ease: "easeInOut",
      });
    },
    [lid, rest],
  );
  useEffect(() => {
    if (eyesShut) return;
    let t: number;
    const next = () => {
      t = window.setTimeout(
        () => {
          blinkNow(Math.random() < 0.2);
          next();
        },
        (drowsy ? 1_600 : 2_200) + Math.random() * 4_400,
      );
    };
    next();
    return () => window.clearTimeout(t);
  }, [eyesShut, drowsy, blinkNow]);
  useEffect(() => {
    if (blink || notice) blinkNow();
  }, [blink, notice, blinkNow]);

  // ── A curious tilt of the head toward whatever she glanced at ──
  const cock = useSpring(0, { stiffness: 140, damping: 11 });
  useEffect(() => {
    if (!glance || still) return;
    cock.set(Math.sign(glanceSide || 1) * 6);
    const t = window.setTimeout(() => cock.set(0), 850);
    return () => window.clearTimeout(t);
  }, [glance, glanceSide, still, cock]);
  const tilt = useTransform(
    [tn, cock] as MotionValue<number>[],
    ([t, c]: number[]) => t * 4 + c,
  );

  // ── Clicked: squash, stretch, settle — and a squint as she squishes ──
  const squashX = useMotionValue(1);
  const squashY = useMotionValue(1);
  useEffect(() => {
    if (!poke) return;
    blinkNow();
    if (still) return;
    const o = {
      duration: 0.55,
      times: [0, 0.18, 0.42, 0.64, 0.82, 1],
      ease: "easeOut" as const,
    };
    const a = animate(squashY, [1, 0.84, 1.1, 0.96, 1.02, 1], o);
    const b = animate(squashX, [1, 1.12, 0.94, 1.03, 0.99, 1], o);
    return () => {
      a.stop();
      b.stop();
    };
  }, [poke, still, squashX, squashY, blinkNow]);

  // ── A quick sniff now and then while she's idle ──
  const [sniff, setSniff] = useState(0);
  useEffect(() => {
    if (!moving || mood !== "idle") return;
    const t = window.setTimeout(
      () => setSniff((n) => n + 1),
      5_000 + Math.random() * 9_000,
    );
    return () => window.clearTimeout(t);
  }, [moving, mood, sniff]);

  const bob = still
    ? {}
    : mood === "carried"
      ? { y: 0, rotate: [-5, 5, -5], transition: loop(0.9) }
      : mood === "wave" || mood === "happy" || mood === "celebrate"
        ? {
            y: [0, -5, 0, -2, 0],
            rotate: 0,
            transition: { duration: 0.9, ease: "easeOut" as const },
          }
        : mood === "sad"
          ? { y: 2, rotate: 0, transition: { duration: 0.5 } }
          : !asleep
            ? {
                y: [0, -2.5, 0],
                rotate: [0, -1.2, 0, 1.2, 0],
                transition: loop(3.2),
              }
            : { y: [0, 1.2, 0], rotate: 0, transition: loop(4) };

  // A slow breath in the body (not while she dangles).
  const breathe =
    moving && mood !== "carried"
      ? {
          scaleY: [1, 1.025, 1],
          scaleX: [1, 1.012, 1],
          transition: loop(asleep ? 4.4 : 3.6),
        }
      : { scaleY: 1, scaleX: 1 };

  // Squash, leap, stretch, land, settle — from the feet.
  const hopTimes = [0, 0.15, 0.38, 0.5, 0.72, 0.86, 1];
  const jumping = hop > 0 && moving && mood !== "carried";
  const big = mood === "celebrate";
  const jump = jumping
    ? {
        y: [0, 2, big ? -26 : -18, big ? -26 : -18, 0, 1, 0],
        scaleY: [1, 0.86, 1.08, 1.03, 0.9, 1.03, 1],
        scaleX: [1, 1.1, 0.94, 0.97, 1.08, 0.98, 1],
        transition: {
          duration: big ? 0.9 : 0.75,
          times: hopTimes,
          ease: "easeOut" as const,
        },
      }
    : {};
  const shadowAt = scene ? { cy: 113.5, rx: 21 } : { cy: 115, rx: 24 };
  const shadowRest = scene ? 0.16 : 0.12;
  const shadow = jumping
    ? {
        scaleX: [1, 1.1, 0.55, 0.55, 1.12, 1, 1],
        opacity: [
          shadowRest,
          shadowRest + 0.02,
          0.06,
          0.06,
          shadowRest + 0.02,
          shadowRest,
          shadowRest,
        ],
        transition: { duration: big ? 0.9 : 0.75, times: hopTimes },
      }
    : mood === "carried"
      ? { scaleX: 0.6, opacity: 0.05 }
      : { scaleX: 1, opacity: shadowRest };

  const tail = moving
    ? {
        rotate: [0, 6, 0, -3, 0],
        transition: loop(mood === "carried" ? 0.6 : 2.6),
      }
    : {};

  // Ears: a twitch now and then; droop when sad; prick up when startled.
  const earLeft = still
    ? {}
    : mood === "sad"
      ? { rotate: -22, transition: { duration: 0.5 } }
      : startled
        ? {
            rotate: 10,
            transition: {
              type: "spring" as const,
              stiffness: 400,
              damping: 12,
            },
          }
        : moving
          ? { rotate: [0, -10, 0, -6, 0], transition: loop(0.7, 6.5) }
          : { rotate: 0 };
  const earRight = still
    ? {}
    : mood === "sad"
      ? { rotate: 22, transition: { duration: 0.5 } }
      : startled
        ? {
            rotate: -10,
            transition: {
              type: "spring" as const,
              stiffness: 400,
              damping: 12,
            },
          }
        : moving
          ? { rotate: [0, 10, 0], transition: { ...loop(0.5, 9), delay: 3.4 } }
          : { rotate: 0 };

  // Every so often a page turns over from the right to the left, round the spine.
  const pageTurn =
    moving && mood === "idle"
      ? {
          scaleX: [1, 1, -1, -1],
          opacity: [0, 1, 1, 0],
          transition: {
            duration: 1.2,
            times: [0, 0.1, 0.8, 1],
            repeat: Infinity,
            repeatDelay: 8,
            ease: "easeInOut" as const,
          },
        }
      : { opacity: 0 };

  // Paws: the right one waves; both go up to celebrate or stretch.
  const pawRight = still
    ? {}
    : mood === "wave"
      ? {
          x: [0, 7, 7, 7, 7, 7, 0],
          y: [0, -20, -18, -20, -18, -20, 0],
          rotate: [0, -25, 20, -25, 20, -10, 0],
          transition: { duration: 1.7, ease: "easeInOut" as const, delay: 0.1 },
        }
      : mood === "celebrate" || mood === "yawn"
        ? {
            x: 6,
            y: -24,
            rotate: 0,
            transition: {
              type: "spring" as const,
              stiffness: 300,
              damping: 12,
            },
          }
        : mood === "happy" || mood === "love"
          ? {
              x: 3,
              y: -9,
              rotate: -15,
              transition: {
                type: "spring" as const,
                stiffness: 260,
                damping: 14,
              },
            }
          : { x: 0, y: 0, rotate: 0, transition: { duration: 0.3 } };
  const pawLeft = still
    ? {}
    : mood === "celebrate" || mood === "yawn"
      ? {
          x: -6,
          y: -24,
          transition: { type: "spring" as const, stiffness: 300, damping: 12 },
        }
      : { x: 0, y: 0, transition: { duration: 0.3 } };

  const feet =
    mood === "carried" && !still
      ? { y: 3, rotate: [-8, 8, -8], transition: loop(0.7) }
      : { y: 0, rotate: 0 };

  const twinkle = moving
    ? {
        scale: [1, 1.3, 1],
        rotate: [0, 25, 0],
        opacity: [0.85, 1, 0.85],
        transition: loop(mood === "celebrate" ? 0.6 : 2.4),
      }
    : {};

  // Ears prick up for a moment when something catches her eye.
  const perk = (dir: 1 | -1) =>
    notice > 0 && !still
      ? {
          rotate: [0, 12 * dir, 0],
          transition: { duration: 0.5, ease: "easeOut" as const },
        }
      : {};

  const mouthTalk =
    talking && !still
      ? {
          scaleY: [0.4, 1, 0.5, 1, 0.4],
          transition: { duration: 0.9, repeat: Infinity },
        }
      : { scaleY: 1 };

  const mouthKind = talking
    ? "talk"
    : mood === "yawn"
      ? "yawn"
      : startled
        ? "oh"
        : mood === "sad"
          ? "sad"
          : asleep
            ? "sleep"
            : beaming
              ? "beam"
              : "grin";
  const love = mood === "love";
  const cheek = {
    rx: love ? 5.4 : 4.4,
    ry: love ? 3.3 : 2.7,
    opacity: love ? 1 : 0.85,
  };

  const box = scene ? SCENE_BOX : PLAIN_BOX;
  const unit = size / 100;

  return (
    <svg
      width={box.w * unit}
      height={box.h * unit}
      viewBox={`${box.x} ${box.y} ${box.w} ${box.h}`}
      className={className}
      aria-hidden="true"
      style={{ overflow: "visible" }}
    >
      {scene && (
        <FayScene
          part={scene}
          still={still}
          turn={tn}
          dim={asleep}
          clipId={sceneClip}
        />
      )}

      <g clipPath={scene ? `url(#${sceneClip})` : undefined}>
        <motion.ellipse
          key={`shadow-${hop}`}
          cx="50"
          cy={shadowAt.cy}
          rx={shadowAt.rx}
          ry="4"
          fill={INK}
          opacity={shadowRest}
          animate={shadow}
          style={at(50, shadowAt.cy)}
        />
      </g>

      <motion.g style={{ ...at(50, 113), scaleX: squashX, scaleY: squashY }}>
        <motion.g key={`jump-${hop}`} animate={jump} style={at(50, 113)}>
          <motion.g
            animate={bob}
            style={at(50, mood === "carried" ? 20 : 112)}
          >
            <motion.g style={{ x: bodyX }}>
              {/* Thin tail, curling out behind */}
              <motion.path
                d="M33 98 C22 100 14 104 9 110 C8 111.5 9.5 112.6 11 111.6 C16 107.5 24 105 34 104 Z"
                fill={FUR}
                stroke={INK}
                strokeWidth="2.1"
                strokeLinejoin="round"
                animate={tail}
                style={at(33, 101)}
              />

              {/* Long feet, pointing forward (they dangle when she's carried) */}
              <motion.g animate={feet} style={at(50, 104)}>
                <ellipse
                  cx="38"
                  cy="110"
                  rx="10"
                  ry="3.8"
                  fill={FUR}
                  stroke={INK}
                  strokeWidth="2.1"
                />
                <ellipse
                  cx="62"
                  cy="110"
                  rx="10"
                  ry="3.8"
                  fill={FUR}
                  stroke={INK}
                  strokeWidth="2.1"
                />
              </motion.g>

              {/* Pear-shaped body with a pale tummy, breathing */}
              <motion.g animate={breathe} style={at(50, 109)}>
                <path
                  d="M50 62 C64 62 72 78 72 92 C72 104 63 109 50 109 C37 109 28 104 28 92 C28 78 36 62 50 62 Z"
                  fill={FUR}
                  stroke={INK}
                  strokeWidth="2.4"
                />
                <path
                  d="M50 84 C58 84 62 92 62 98 C62 104 57 106.5 50 106.5 C43 106.5 38 104 38 98 C38 92 42 84 50 84 Z"
                  fill={FUR_LIGHT}
                />
              </motion.g>
            </motion.g>

            {/* Head, ears and face turn and tilt together */}
            <motion.g style={{ ...at(50, 68), rotate: tilt }}>
              <motion.g style={{ x: earLeftX }}>
                <motion.g animate={earLeft} style={at(31, 33)}>
                  <motion.g
                    key={`perk-left-${notice}`}
                    animate={perk(1)}
                    style={at(31, 33)}
                  >
                    <g transform="rotate(-28 27 27)">
                      <ellipse
                        cx="27"
                        cy="27"
                        rx="6.6"
                        ry="9"
                        fill={FUR}
                        stroke={INK}
                        strokeWidth="2.3"
                      />
                      <ellipse cx="27" cy="28" rx="3.3" ry="5" fill={EAR} />
                    </g>
                  </motion.g>
                </motion.g>
              </motion.g>
              <motion.g style={{ x: earRightX }}>
                <motion.g animate={earRight} style={at(69, 33)}>
                  <motion.g
                    key={`perk-right-${notice}`}
                    animate={perk(-1)}
                    style={at(69, 33)}
                  >
                    <g transform="rotate(28 73 27)">
                      <ellipse
                        cx="73"
                        cy="27"
                        rx="6.6"
                        ry="9"
                        fill={FUR}
                        stroke={INK}
                        strokeWidth="2.3"
                      />
                      <ellipse cx="73" cy="28" rx="3.3" ry="5" fill={EAR} />
                    </g>
                  </motion.g>
                </motion.g>
              </motion.g>

              {/* Head */}
              <defs>
                <clipPath id={clipId}>
                  <path d={HEAD} />
                </clipPath>
              </defs>
              <path d={HEAD} fill={FUR} />

              <g clipPath={`url(#${clipId})`}>
                {/* The pale lower face across the cheeks */}
                <motion.path
                  d="M27 54 C31 47.5 41 47.5 50 51 C59 47.5 69 47.5 73 54 C74.5 61 66 68.5 50 68.5 C34 68.5 25.5 61 27 54 Z"
                  fill={FUR_LIGHT}
                  style={{ x: patchX }}
                />

                {/* Cheeks — rosier when she's loved */}
                <motion.ellipse
                  cx="28"
                  cy="56"
                  {...cheek}
                  fill={CHEEK}
                  initial={false}
                  animate={cheek}
                  style={{ x: cheekLX }}
                />
                <motion.ellipse
                  cx="72"
                  cy="56"
                  {...cheek}
                  fill={CHEEK}
                  initial={false}
                  animate={cheek}
                  style={{ x: cheekRX }}
                />

                {/* Eyes */}
                {(
                  [
                    [37.5, eyeLX, eyeLSqueeze],
                    [62.5, eyeRX, eyeRSqueeze],
                  ] as const
                ).map(([cx, layerX, squeeze]) => (
                  <Eye
                    key={cx}
                    cx={cx}
                    look={look}
                    wide={startled}
                    layerX={layerX}
                    layerY={faceY}
                    squeeze={squeeze}
                    lid={lid}
                    ballX={ballX}
                    ballY={ballY}
                    glintX={glintX}
                    glintY={glintY}
                  />
                ))}

                {/* Worried brows when sad */}
                {mood === "sad" && (
                  <motion.g
                    fill="none"
                    stroke={INK}
                    strokeWidth="2"
                    strokeLinecap="round"
                    style={{ x: browX, y: faceY }}
                  >
                    <path d="M33 33.5 L41 31.5" />
                    <path d="M67 33.5 L59 31.5" />
                  </motion.g>
                )}

                {/* Nose, which twitches when she sniffs */}
                <motion.g style={{ x: noseX, y: faceY }}>
                  <motion.g
                    key={`sniff-${sniff}`}
                    animate={
                      sniff
                        ? {
                            y: [0, -0.9, 0, -0.9, 0],
                            scaleX: [1, 1.12, 1, 1.12, 1],
                          }
                        : {}
                    }
                    transition={{ duration: 0.6, ease: "easeInOut" }}
                    style={at(50, 52)}
                  >
                    <path
                      d="M45.4 50.4 Q50 47.8 54.6 50.4 Q54.2 54 50 54.8 Q45.8 54 45.4 50.4 Z"
                      fill={NOSE}
                    />
                    <circle cx="48.3" cy="50" r="0.9" fill="#FFFFFF" opacity="0.5" />
                  </motion.g>
                  <path
                    d="M50 54.8 V56.6"
                    stroke={INK}
                    strokeWidth="1.7"
                    strokeLinecap="round"
                  />
                </motion.g>

                {/* Mouth — each new shape pops in */}
                <motion.g style={{ x: mouthX, y: faceY }}>
                  <motion.g
                    key={mouthKind}
                    initial={still ? false : { scale: 0.6, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 520, damping: 26 }}
                    style={at(50, 58)}
                  >
                    {mouthKind === "talk" ? (
                      <motion.ellipse
                        cx="50"
                        cy="59.5"
                        rx="3.6"
                        ry="3"
                        fill={INK}
                        animate={mouthTalk}
                        style={at(50, 59.5)}
                      />
                    ) : mouthKind === "yawn" ? (
                      <ellipse cx="50" cy="60" rx="4.4" ry="5" fill={INK} />
                    ) : mouthKind === "oh" ? (
                      <ellipse cx="50" cy="59.6" rx="2.6" ry="2.9" fill={INK} />
                    ) : mouthKind === "sad" ? (
                      <path
                        d="M45 61 Q50 57 55 61"
                        fill="none"
                        stroke={INK}
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                    ) : mouthKind === "sleep" ? (
                      <path
                        d="M47 58 Q50 59.6 53 58"
                        fill="none"
                        stroke={INK}
                        strokeWidth="1.9"
                        strokeLinecap="round"
                      />
                    ) : (
                      <>
                        <path
                          d={
                            mouthKind === "beam"
                              ? "M41.5 55.6 Q50 66 58.5 55.6 Q50 59 41.5 55.6 Z"
                              : "M42.5 56 Q50 64.5 57.5 56 Q50 59 42.5 56 Z"
                          }
                          fill={INK}
                          stroke={INK}
                          strokeWidth="1.7"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M46.4 59.2 Q50 62.2 53.6 59.2 Q50 60.2 46.4 59.2 Z"
                          fill={PEACH}
                        />
                      </>
                    )}
                  </motion.g>
                </motion.g>
              </g>
              {/* The outline goes on top, so the clipped face sits inside it */}
              <path d={HEAD} fill="none" stroke={INK} strokeWidth="2.4" />

              {/* A nightcap, late at night */}
              {nightcap && (
                <g>
                  <path
                    d="M31 28 Q50 15 69 28 Q72 14 76 5 Q60 4 45 13 Q36 18 31 28 Z"
                    fill={PERIWINKLE}
                    stroke={INK}
                    strokeWidth="2.2"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M29 31 Q50 18 71 31 L69.5 26.5 Q50 13.5 30.5 26.5 Z"
                    fill="#FFF8EC"
                    stroke={INK}
                    strokeWidth="2"
                    strokeLinejoin="round"
                  />
                  <circle
                    cx="77"
                    cy="5"
                    r="4.2"
                    fill={BUTTER}
                    stroke={INK}
                    strokeWidth="2"
                  />
                </g>
              )}

              {/* Something caught her eye */}
              {notice > 0 && (
                <motion.text
                  key={`notice-mark-${notice}`}
                  x="70"
                  y="16"
                  fontSize="15"
                  fontWeight="800"
                  fill={SPARK}
                  stroke={INK}
                  strokeWidth="0.6"
                  fontFamily="Inter, system-ui, sans-serif"
                  initial={{ opacity: 0, scale: still ? 1 : 0.4 }}
                  animate={{
                    opacity: [0, 1, 1, 0],
                    scale: still ? 1 : [0.4, 1.15, 1, 1],
                  }}
                  transition={{ duration: 1.1, times: [0, 0.2, 0.75, 1] }}
                  style={at(73, 12)}
                >
                  !
                </motion.text>
              )}

              {/* Thinking dots while she works out an answer */}
              {mood === "think" && (
                <g fill={INK}>
                  {[0, 1, 2].map((i) => (
                    <motion.circle
                      key={i}
                      cx={70 + i * 6}
                      cy={12 - i * 3}
                      r={1.6 + i * 0.5}
                      animate={{ opacity: [0.2, 1, 0.2] }}
                      transition={{
                        duration: 1.2,
                        repeat: Infinity,
                        delay: i * 0.2,
                      }}
                    />
                  ))}
                </g>
              )}
            </motion.g>

            {/* The open book from the mark */}
            <motion.g style={{ x: bodyX }}>
              <path
                d="M50 78 Q39 71 26 74 L28.5 95 Q40 92 50 97 Z"
                fill={MINT}
                stroke={INK}
                strokeWidth="2.3"
                strokeLinejoin="round"
              />
              <path
                d="M50 78 Q61 71 74 74 L71.5 95 Q60 92 50 97 Z"
                fill={PERIWINKLE}
                stroke={INK}
                strokeWidth="2.3"
                strokeLinejoin="round"
              />
              <g
                stroke="#FFFFFF"
                strokeWidth="1.6"
                strokeLinecap="round"
                opacity="0.85"
                fill="none"
              >
                <path d="M32 81 Q40 79 46 82" />
                <path d="M32.5 86 Q40 84 46 87" />
                <path d="M54 82 Q60 79 68 81" />
                <path d="M54 87 Q60 84 67.5 86" />
              </g>
              {/* A page turning over */}
              <motion.path
                d="M50 78 Q60 72 72 74.5 L70 94 Q60 91.5 50 96 Z"
                fill={PAGE}
                stroke={INK}
                strokeWidth="1.6"
                strokeLinejoin="round"
                initial={{ opacity: 0 }}
                animate={pageTurn}
                style={at(50, 86)}
              />

              {/* Paws on the book */}
              <motion.ellipse
                cx="28"
                cy="84"
                rx="5"
                ry="4.6"
                fill={FUR}
                stroke={INK}
                strokeWidth="2.2"
                animate={pawLeft}
                style={at(28, 84)}
              />
              <motion.ellipse
                cx="72"
                cy="84"
                rx="5"
                ry="4.6"
                fill={FUR}
                stroke={INK}
                strokeWidth="2.2"
                animate={pawRight}
                style={at(72, 84)}
              />
            </motion.g>

            {/* The spark from the mark, twinkling above her */}
            {!asleep && !nightcap && mood !== "think" && (
              <motion.path
                d={sparkPath(84, 18, 6)}
                fill={SPARK}
                animate={twinkle}
                style={at(84, 18)}
              />
            )}

            {/* A burst of sparks to celebrate */}
            {mood === "celebrate" && !still && (
              <g>
                {[
                  [18, 30, -8, -10],
                  [84, 40, 8, -8],
                  [14, 62, -10, 2],
                  [88, 66, 10, 4],
                ].map(([x, y, dx, dy], i) => (
                  <motion.path
                    key={i}
                    d={sparkPath(x, y, 5)}
                    fill={SPARK}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{
                      scale: [0, 1.3, 0],
                      opacity: [0, 1, 0],
                      x: [0, dx],
                      y: [0, dy],
                    }}
                    transition={{
                      duration: 1.1,
                      delay: i * 0.12,
                      repeat: 1,
                      repeatDelay: 0.2,
                    }}
                    style={at(x, y)}
                  />
                ))}
              </g>
            )}

            {/* Zzz while she dozes */}
            {asleep && !still && (
              <motion.text
                x="78"
                y="14"
                fontSize="13"
                fontWeight="700"
                fill={INK}
                fontFamily="Inter, system-ui, sans-serif"
                animate={{ opacity: [0, 0.8, 0], y: [14, 2, -6] }}
                transition={{ duration: 2.6, repeat: Infinity, ease: "easeOut" }}
              >
                z
              </motion.text>
            )}
          </motion.g>
        </motion.g>
      </motion.g>

      {/* Hearts float up when she's petted */}
      {hearts > 0 && !still && (
        <g key={`hearts-${hearts}`}>
          {[
            [40, 22, -6, 0],
            [56, 18, 4, 0.18],
            [48, 26, 0, 0.36],
          ].map(([x, y, dx, delay], i) => (
            <motion.path
              key={i}
              d={heartPath(x, y, 4.2)}
              fill={HEART}
              initial={{ opacity: 0, y: 0, x: 0, scale: 0.6 }}
              animate={{ opacity: [0, 1, 0], y: -26, x: dx, scale: 1 }}
              transition={{ duration: 1.3, delay, ease: "easeOut" }}
              style={at(x, y)}
            />
          ))}
        </g>
      )}
    </svg>
  );
};

export default Fay;
