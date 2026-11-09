/* Fay, the assistant's character: a small quokka reading the open book
   from the Faircopy mark (mint and periwinkle pages, a golden spark above).
   What makes her a quokka and not a bear: cheeks wider than the crown, oval
   ears out to the sides, a pale lower face rather than a round muzzle, the
   grin, a thin tail and long feet.

   She bobs, blinks, sways her tail and turns a page now and then while
   idle; hops (squash and stretch) when nudged; lifts a paw off the book to
   wave; beams when hovered; and dozes when tucked away. With reduced motion
   she holds still and only her face changes. */

import { motion, useReducedMotion } from "framer-motion";

export type FayMood = "idle" | "wave" | "happy" | "sleep";

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

interface FayProps {
  mood?: FayMood;
  /** Mouth moves, as if speaking. */
  talking?: boolean;
  /** Bump to make her hop once. */
  hop?: number;
  size?: number;
  className?: string;
}

/* A four-point star like the one above the mark's doorway. */
const sparkPath = (cx: number, cy: number, r: number) => {
  const k = r * 0.28;
  return `M${cx} ${cy - r} Q${cx + k} ${cy - k} ${cx + r} ${cy} Q${cx + k} ${cy + k} ${cx} ${cy + r} Q${cx - k} ${cy + k} ${cx - r} ${cy} Q${cx - k} ${cy - k} ${cx} ${cy - r} Z`;
};

const loop = (duration: number, repeatDelay = 0) => ({
  duration,
  repeat: Infinity,
  repeatDelay,
  ease: "easeInOut" as const,
});

export const Fay = ({ mood = "idle", talking = false, hop = 0, size = 64, className = "" }: FayProps) => {
  const still = useReducedMotion() ?? false;
  const awake = mood !== "sleep";
  const moving = !still && awake;

  const bob = still
    ? {}
    : mood === "wave" || mood === "happy"
      ? { y: [0, -5, 0, -2, 0], transition: { duration: 0.9, ease: "easeOut" as const } }
      : awake
        ? { y: [0, -2.5, 0], rotate: [0, -1.2, 0, 1.2, 0], transition: loop(3.2) }
        : { y: [0, 1.2, 0], transition: loop(4) };

  // Squash, leap, stretch, land, settle — from the feet.
  const hopTimes = [0, 0.15, 0.38, 0.5, 0.72, 0.86, 1];
  const jumping = hop > 0 && moving;
  const jump = jumping
    ? {
        y: [0, 2, -18, -18, 0, 1, 0],
        scaleY: [1, 0.86, 1.08, 1.03, 0.9, 1.03, 1],
        scaleX: [1, 1.1, 0.94, 0.97, 1.08, 0.98, 1],
        transition: { duration: 0.75, times: hopTimes, ease: "easeOut" as const },
      }
    : {};
  const shadow = jumping
    ? {
        scaleX: [1, 1.1, 0.55, 0.55, 1.12, 1, 1],
        opacity: [0.12, 0.14, 0.06, 0.06, 0.14, 0.12, 0.12],
        transition: { duration: 0.75, times: hopTimes },
      }
    : {};

  const blink = moving
    ? { scaleY: [1, 1, 0.1, 1, 1], transition: { duration: 4.2, times: [0, 0.9, 0.93, 0.96, 1], repeat: Infinity, ease: "linear" as const } }
    : {};

  const tail = moving ? { rotate: [0, 6, 0, -3, 0], transition: loop(2.6) } : {};

  // One ear, then the other, gives a little twitch every so often.
  const earLeft = moving ? { rotate: [0, -10, 0, -6, 0], transition: loop(0.7, 6.5) } : {};
  const earRight = moving ? { rotate: [0, 10, 0], transition: { ...loop(0.5, 9), delay: 3.4 } } : {};

  // Every so often a page turns over from the right to the left.
  const pageTurn = moving && mood === "idle"
    ? {
        scaleX: [1, 1, -1, -1],
        opacity: [0, 1, 1, 0],
        transition: { duration: 1.2, times: [0, 0.1, 0.8, 1], repeat: Infinity, repeatDelay: 8, ease: "easeInOut" as const },
      }
    : { opacity: 0 };

  // The right paw lets go of the book to wave, or lifts a little when happy.
  const paw = still
    ? {}
    : mood === "wave"
      ? {
          x: [0, 7, 7, 7, 7, 7, 0],
          y: [0, -20, -18, -20, -18, -20, 0],
          rotate: [0, -25, 20, -25, 20, -10, 0],
          transition: { duration: 1.7, ease: "easeInOut" as const, delay: 0.1 },
        }
      : mood === "happy"
        ? { x: 3, y: -9, rotate: -15, transition: { type: "spring" as const, stiffness: 260, damping: 14 } }
        : { x: 0, y: 0, rotate: 0, transition: { duration: 0.3 } };

  const twinkle = moving
    ? { scale: [1, 1.3, 1], rotate: [0, 25, 0], opacity: [0.85, 1, 0.85], transition: loop(2.4) }
    : {};

  const mouth = talking && !still
    ? { scaleY: [0.4, 1, 0.5, 1, 0.4], transition: { duration: 0.9, repeat: Infinity } }
    : { scaleY: 1 };

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

      <motion.g key={`jump-${hop}`} animate={jump} style={{ originX: "50px", originY: "113px" }}>
        <motion.g animate={bob} style={{ originX: "50px", originY: "112px" }}>
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

          {/* Long feet, pointing forward */}
          <ellipse cx="38" cy="110" rx="10" ry="3.8" fill={FUR} stroke={INK} strokeWidth="2.1" />
          <ellipse cx="62" cy="110" rx="10" ry="3.8" fill={FUR} stroke={INK} strokeWidth="2.1" />

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

          {/* Oval ears, tilted out to the sides */}
          <motion.g animate={earLeft} style={{ originX: "31px", originY: "33px" }}>
            <g transform="rotate(-28 27 27)">
              <ellipse cx="27" cy="27" rx="6.6" ry="9" fill={FUR} stroke={INK} strokeWidth="2.3" />
              <ellipse cx="27" cy="28" rx="3.3" ry="5" fill={EAR} />
            </g>
          </motion.g>
          <motion.g animate={earRight} style={{ originX: "69px", originY: "33px" }}>
            <g transform="rotate(28 73 27)">
              <ellipse cx="73" cy="27" rx="6.6" ry="9" fill={FUR} stroke={INK} strokeWidth="2.3" />
              <ellipse cx="73" cy="28" rx="3.3" ry="5" fill={EAR} />
            </g>
          </motion.g>

          {/* Head: narrow crown, chubby cheeks */}
          <path
            d="M50 21 C63 21 71 28 74 38 C81 43 82 56 75 63 C69 68.5 60 70.5 50 70.5 C40 70.5 31 68.5 25 63 C18 56 19 43 26 38 C29 28 37 21 50 21 Z"
            fill={FUR}
            stroke={INK}
            strokeWidth="2.4"
          />
          {/* The pale lower face across the cheeks */}
          <path
            d="M27 54 C31 47.5 41 47.5 50 51 C59 47.5 69 47.5 73 54 C74.5 61 66 68.5 50 68.5 C34 68.5 25.5 61 27 54 Z"
            fill={FUR_LIGHT}
          />

          {/* Eyes */}
          {mood === "happy" ? (
            <g fill="none" stroke={INK} strokeWidth="2.6" strokeLinecap="round">
              <path d="M33.5 43 Q37.5 38 41.5 43" />
              <path d="M58.5 43 Q62.5 38 66.5 43" />
            </g>
          ) : !awake ? (
            <g fill="none" stroke={INK} strokeWidth="2.4" strokeLinecap="round">
              <path d="M33.5 41 Q37.5 44.5 41.5 41" />
              <path d="M58.5 41 Q62.5 44.5 66.5 41" />
            </g>
          ) : (
            <motion.g animate={blink} style={{ originX: "50px", originY: "41px" }}>
              <ellipse cx="37.5" cy="41" rx="3.9" ry="4.8" fill={INK} />
              <ellipse cx="62.5" cy="41" rx="3.9" ry="4.8" fill={INK} />
              <circle cx="38.9" cy="39.2" r="1.4" fill="#FFFFFF" />
              <circle cx="63.9" cy="39.2" r="1.4" fill="#FFFFFF" />
            </motion.g>
          )}

          {/* Nose */}
          <path d="M45.4 50.4 Q50 47.8 54.6 50.4 Q54.2 54 50 54.8 Q45.8 54 45.4 50.4 Z" fill={NOSE} />
          <path d="M50 54.8 V56.6" stroke={INK} strokeWidth="1.7" strokeLinecap="round" />

          {/* The quokka grin, or talking, or a sleepy little mouth */}
          {talking ? (
            <motion.ellipse
              cx="50"
              cy="59.5"
              rx="3.6"
              ry="3"
              fill={INK}
              animate={mouth}
              style={{ originX: "50px", originY: "59.5px" }}
            />
          ) : !awake ? (
            <path d="M47 58 Q50 59.6 53 58" fill="none" stroke={INK} strokeWidth="1.9" strokeLinecap="round" />
          ) : (
            <>
              <path
                d={mood === "happy" ? "M41.5 55.6 Q50 66 58.5 55.6 Q50 59 41.5 55.6 Z" : "M42.5 56 Q50 64.5 57.5 56 Q50 59 42.5 56 Z"}
                fill={INK}
                stroke={INK}
                strokeWidth="1.7"
                strokeLinejoin="round"
              />
              <path d="M46.4 59.2 Q50 62.2 53.6 59.2 Q50 60.2 46.4 59.2 Z" fill={PEACH} />
            </>
          )}

          {/* Cheeks */}
          <ellipse cx="28" cy="56" rx="4.4" ry="2.7" fill={CHEEK} opacity="0.85" />
          <ellipse cx="72" cy="56" rx="4.4" ry="2.7" fill={CHEEK} opacity="0.85" />

          {/* The open book from the mark */}
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
          <g stroke="#FFFFFF" strokeWidth="1.6" strokeLinecap="round" opacity="0.85" fill="none">
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

          {/* Paws on the book; the right one waves */}
          <ellipse cx="28" cy="84" rx="5" ry="4.6" fill={FUR} stroke={INK} strokeWidth="2.2" />
          <motion.ellipse
            cx="72"
            cy="84"
            rx="5"
            ry="4.6"
            fill={FUR}
            stroke={INK}
            strokeWidth="2.2"
            animate={paw}
            style={{ originX: "72px", originY: "84px" }}
          />

          {/* The spark from the mark, twinkling above her */}
          {awake && (
            <motion.path
              d={sparkPath(84, 18, 6)}
              fill={SPARK}
              animate={twinkle}
              style={{ originX: "84px", originY: "18px" }}
            />
          )}

          {/* Zzz while tucked away */}
          {!awake && !still && (
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
    </svg>
  );
};

export default Fay;
