/* Fay, the assistant's character: a small quokka reading the open book
   from the Faircopy mark (mint and periwinkle pages, a golden spark above).
   What makes her a quokka and not a bear: cheeks wider than the crown, oval
   ears out to the sides, a pale lower face rather than a round muzzle, the
   grin, a thin tail and long feet.

   Alive: her eyes follow a point (gaze), her head turns toward one side
   (turn, -1 left … 1 right: a three-quarter view) and tilts with it. Idle,
   she bobs, blinks, sways her tail, twitches an ear and turns a page. She
   hops when nudged, waves, beams, celebrates with sparks, droops when sad,
   startles, dangles when carried, blushes with hearts when petted, yawns
   and dozes. With reduced motion her body holds still; only her face
   changes, her eyes follow and she blinks. */

import { useId } from "react";
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
  type MotionValue,
} from "framer-motion";

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
  | "yawn";

const INK = "var(--cc-ink)";
const FUR = "#B49A83";
const FUR_LIGHT = "#E8D9CA";
const EAR = "#D9A291";
const NOSE = "#2A2220";
const MINT = "#A9E4D0";
const PERIWINKLE = "#A7BCEC";
const PAGE = "#DCE5FA";
const PEACH = "#F6A99B";
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
  size?: number;
  className?: string;
}

/* A four-point star like the one above the mark's doorway. */
const sparkPath = (cx: number, cy: number, r: number) => {
  const k = r * 0.28;
  return `M${cx} ${cy - r} Q${cx + k} ${cy - k} ${cx + r} ${cy} Q${cx + k} ${cy + k} ${cx} ${cy + r} Q${cx - k} ${cy + k} ${cx - r} ${cy} Q${cx - k} ${cy - k} ${cx} ${cy - r} Z`;
};

const heartPath = (cx: number, cy: number, s: number) =>
  `M${cx} ${cy + s * 0.9} C${cx - s * 1.6} ${cy - s * 0.1} ${cx - s * 0.9} ${cy - s * 1.3} ${cx} ${cy - s * 0.45} C${cx + s * 0.9} ${cy - s * 1.3} ${cx + s * 1.6} ${cy - s * 0.1} ${cx} ${cy + s * 0.9} Z`;

const loop = (duration: number, repeatDelay = 0) => ({
  duration,
  repeat: Infinity,
  repeatDelay,
  ease: "easeInOut" as const,
});

export const Fay = ({
  mood = "idle",
  talking = false,
  hop = 0,
  hearts = 0,
  gazeX,
  gazeY,
  turn,
  size = 64,
  className = "",
}: FayProps) => {
  const still = useReducedMotion() ?? false;
  const clipId = `fay-head-${useId().replace(/:/g, "")}`;
  const zero = useMotionValue(0);
  const gx = gazeX ?? zero;
  const gy = gazeY ?? zero;
  const tn = turn ?? zero;

  // Pupils follow the gaze; the face slides toward the turn (clipped to the
  // head, so it wraps round), the head tilts and the ears shift.
  const pupilX = useTransform(gx, (v) => v * 2.4);
  const pupilY = useTransform(gy, (v) => v * 2);
  const faceX = useTransform(
    [tn, gx] as MotionValue<number>[],
    ([t, g]: number[]) => t * 5 + g * 1,
  );
  const tilt = useTransform(tn, (t) => t * 5);
  const earLeftX = useTransform(tn, (t) => t * 4.5);
  const earRightX = useTransform(tn, (t) => t * 2.5);
  const bodyX = useTransform(tn, (t) => t * 1.5);

  const asleep = mood === "sleep";
  const eyesShut = asleep || mood === "yawn";
  const moving = !still && !asleep;
  const beaming = mood === "happy" || mood === "celebrate" || mood === "love";
  const startled = mood === "surprised" || mood === "carried";

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
  const shadow = jumping
    ? {
        scaleX: [1, 1.1, 0.55, 0.55, 1.12, 1, 1],
        opacity: [0.12, 0.14, 0.06, 0.06, 0.14, 0.12, 0.12],
        transition: { duration: big ? 0.9 : 0.75, times: hopTimes },
      }
    : mood === "carried"
      ? { scaleX: 0.6, opacity: 0.05 }
      : { scaleX: 1, opacity: 0.12 };

  // A blink is small enough to keep even with reduced motion.
  const blink =
    !asleep && !eyesShut
      ? {
          scaleY: [1, 1, 0.1, 1, 1],
          transition: {
            duration: 4.2,
            times: [0, 0.9, 0.93, 0.96, 1],
            repeat: Infinity,
            ease: "linear" as const,
          },
        }
      : {};

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

  // Every so often a page turns over from the right to the left.
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

  const mouthTalk =
    talking && !still
      ? {
          scaleY: [0.4, 1, 0.5, 1, 0.4],
          transition: { duration: 0.9, repeat: Infinity },
        }
      : { scaleY: 1 };

  const eyeR = startled ? { rx: 4.6, ry: 5.8 } : { rx: 3.9, ry: 4.8 };

  return (
    <svg
      width={size}
      height={size * 1.2}
      viewBox="0 0 100 120"
      className={className}
      aria-hidden="true"
      style={{ overflow: "visible" }}
    >
      <motion.ellipse
        key={`shadow-${hop}`}
        cx="50"
        cy="115"
        rx="24"
        ry="4"
        fill={INK}
        opacity="0.12"
        animate={shadow}
        style={{ originX: "50px", originY: "115px" }}
      />

      <motion.g
        key={`jump-${hop}`}
        animate={jump}
        style={{ originX: "50px", originY: "113px" }}
      >
        <motion.g
          animate={bob}
          style={{
            originX: "50px",
            originY: mood === "carried" ? "20px" : "112px",
          }}
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
              style={{ originX: "33px", originY: "101px" }}
            />

            {/* Long feet, pointing forward (they dangle when she's carried) */}
            <motion.g
              animate={feet}
              style={{ originX: "50px", originY: "104px" }}
            >
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

            {/* Pear-shaped body with a pale tummy */}
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

          {/* Head, ears and face turn and tilt together */}
          <motion.g style={{ rotate: tilt, originX: "50px", originY: "68px" }}>
            <motion.g style={{ x: earLeftX }}>
              <motion.g
                animate={earLeft}
                style={{ originX: "31px", originY: "33px" }}
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
            <motion.g style={{ x: earRightX }}>
              <motion.g
                animate={earRight}
                style={{ originX: "69px", originY: "33px" }}
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

            {/* Head */}
            <defs>
              <clipPath id={clipId}>
                <path d={HEAD} />
              </clipPath>
            </defs>
            <path d={HEAD} fill={FUR} />

            <g clipPath={`url(#${clipId})`}>
              <motion.g style={{ x: faceX }}>
                {/* The pale lower face across the cheeks */}
                <path
                  d="M27 54 C31 47.5 41 47.5 50 51 C59 47.5 69 47.5 73 54 C74.5 61 66 68.5 50 68.5 C34 68.5 25.5 61 27 54 Z"
                  fill={FUR_LIGHT}
                />

                {/* Eyes */}
                {beaming ? (
                  <g
                    fill="none"
                    stroke={INK}
                    strokeWidth="2.6"
                    strokeLinecap="round"
                  >
                    <path d="M33.5 43 Q37.5 38 41.5 43" />
                    <path d="M58.5 43 Q62.5 38 66.5 43" />
                  </g>
                ) : eyesShut ? (
                  <g
                    fill="none"
                    stroke={INK}
                    strokeWidth="2.4"
                    strokeLinecap="round"
                  >
                    <path d="M33.5 41 Q37.5 44.5 41.5 41" />
                    <path d="M58.5 41 Q62.5 44.5 66.5 41" />
                  </g>
                ) : (
                  <motion.g
                    animate={blink}
                    style={{ originX: "50px", originY: "41px" }}
                  >
                    <motion.g
                      style={{ x: pupilX, y: mood === "sad" ? 1.8 : pupilY }}
                    >
                      <ellipse cx="37.5" cy="41" {...eyeR} fill={INK} />
                      <ellipse cx="62.5" cy="41" {...eyeR} fill={INK} />
                      <circle cx="38.9" cy="39.2" r="1.4" fill="#FFFFFF" />
                      <circle cx="63.9" cy="39.2" r="1.4" fill="#FFFFFF" />
                    </motion.g>
                  </motion.g>
                )}
                {/* Worried brows when sad */}
                {mood === "sad" && (
                  <g
                    fill="none"
                    stroke={INK}
                    strokeWidth="2"
                    strokeLinecap="round"
                  >
                    <path d="M33 33.5 L41 31.5" />
                    <path d="M67 33.5 L59 31.5" />
                  </g>
                )}

                {/* Nose */}
                <path
                  d="M45.4 50.4 Q50 47.8 54.6 50.4 Q54.2 54 50 54.8 Q45.8 54 45.4 50.4 Z"
                  fill={NOSE}
                />
                <path
                  d="M50 54.8 V56.6"
                  stroke={INK}
                  strokeWidth="1.7"
                  strokeLinecap="round"
                />

                {/* Mouth */}
                {talking ? (
                  <motion.ellipse
                    cx="50"
                    cy="59.5"
                    rx="3.6"
                    ry="3"
                    fill={INK}
                    animate={mouthTalk}
                    style={{ originX: "50px", originY: "59.5px" }}
                  />
                ) : mood === "yawn" ? (
                  <ellipse cx="50" cy="60" rx="4.4" ry="5" fill={INK} />
                ) : startled ? (
                  <ellipse cx="50" cy="59.6" rx="2.6" ry="2.9" fill={INK} />
                ) : mood === "sad" ? (
                  <path
                    d="M45 61 Q50 57 55 61"
                    fill="none"
                    stroke={INK}
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                ) : asleep ? (
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
                        beaming
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

                {/* Cheeks — rosier when she's loved */}
                <ellipse
                  cx="28"
                  cy="56"
                  rx={mood === "love" ? 5.4 : 4.4}
                  ry={mood === "love" ? 3.3 : 2.7}
                  fill={CHEEK}
                  opacity={mood === "love" ? 1 : 0.85}
                />
                <ellipse
                  cx="72"
                  cy="56"
                  rx={mood === "love" ? 5.4 : 4.4}
                  ry={mood === "love" ? 3.3 : 2.7}
                  fill={CHEEK}
                  opacity={mood === "love" ? 1 : 0.85}
                />
              </motion.g>
            </g>
            {/* The outline goes on top, so the clipped face sits inside it */}
            <path d={HEAD} fill="none" stroke={INK} strokeWidth="2.4" />
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
              style={{ originX: "50px", originY: "86px" }}
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
              style={{ originX: "28px", originY: "84px" }}
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
              style={{ originX: "72px", originY: "84px" }}
            />
          </motion.g>

          {/* The spark from the mark, twinkling above her */}
          {!asleep && (
            <motion.path
              d={sparkPath(84, 18, 6)}
              fill={SPARK}
              animate={twinkle}
              style={{ originX: "84px", originY: "18px" }}
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
                  style={{ originX: `${x}px`, originY: `${y}px` }}
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
              animate={{ opacity: [0, 0.7, 0], y: [14, 2, -6] }}
              transition={{ duration: 2.6, repeat: Infinity, ease: "easeOut" }}
            >
              z
            </motion.text>
          )}
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
              style={{ originX: `${x}px`, originY: `${y}px` }}
            />
          ))}
        </g>
      )}
    </svg>
  );
};

export default Fay;
