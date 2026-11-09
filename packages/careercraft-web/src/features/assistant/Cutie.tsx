/* The assistant's character: a small sheet of paper with a face — a fair
   copy. It bobs and blinks while idle, waves hello, beams when it has good
   news and dozes when tucked away. The folded corner takes the person's
   accent colour (--cc-rust follows the persona theme), so it's theirs.
   With reduced motion it holds still and only the face changes. */

import { motion, useReducedMotion } from "framer-motion";

export type CutieMood = "idle" | "wave" | "happy" | "sleep";

const INK = "var(--cc-ink)";
const CHEEK = "#F2A0A0";

interface CutieProps {
  mood?: CutieMood;
  /** Mouth moves, as if speaking. */
  talking?: boolean;
  size?: number;
  className?: string;
}

export const Cutie = ({ mood = "idle", talking = false, size = 64, className = "" }: CutieProps) => {
  const still = useReducedMotion() ?? false;
  const awake = mood !== "sleep";

  const bob = still
    ? {}
    : mood === "wave" || mood === "happy"
      ? { y: [0, -6, 0, -3, 0], transition: { duration: 0.9, ease: "easeOut" as const } }
      : awake
        ? {
            y: [0, -2.5, 0],
            rotate: [0, -1.2, 0, 1.2, 0],
            transition: { duration: 3.2, repeat: Infinity, ease: "easeInOut" as const },
          }
        : { y: [0, 1, 0], transition: { duration: 4, repeat: Infinity, ease: "easeInOut" as const } };

  const blink = still || !awake
    ? {}
    : {
        scaleY: [1, 1, 0.1, 1, 1],
        transition: {
          duration: 4.2,
          times: [0, 0.9, 0.93, 0.96, 1],
          repeat: Infinity,
          ease: "linear" as const,
        },
      };

  // The right arm rests down like the left; it swings up to wave and lifts
  // halfway when happy.
  const wave = still
    ? {}
    : mood === "wave"
      ? {
          rotate: [0, -100, -62, -100, -62, -100, 0],
          transition: { duration: 1.7, ease: "easeInOut" as const, delay: 0.1 },
        }
      : mood === "happy"
        ? { rotate: -70, transition: { type: "spring" as const, stiffness: 260, damping: 14 } }
        : { rotate: 0, transition: { duration: 0.3 } };

  const mouth = talking && !still
    ? { scaleY: [0.4, 1, 0.5, 1, 0.4], transition: { duration: 0.9, repeat: Infinity } }
    : { scaleY: 1 };

  return (
    <svg
      width={size}
      height={size * 1.2}
      viewBox="0 0 80 96"
      className={className}
      aria-hidden="true"
      style={{ overflow: "visible" }}
    >
      {/* Shadow on the ground */}
      <ellipse cx="40" cy="91" rx="19" ry="3.6" fill={INK} opacity="0.12" />

      <motion.g animate={bob} style={{ originX: "40px", originY: "84px" }}>
        {/* Arms sit behind the sheet */}
        <path
          d="M11 54 Q4 57 3 64"
          fill="none"
          stroke={INK}
          strokeWidth="2.6"
          strokeLinecap="round"
        />
        <motion.path
          d="M69 54 Q76 57 77 64"
          fill="none"
          stroke={INK}
          strokeWidth="2.6"
          strokeLinecap="round"
          animate={wave}
          style={{ originX: "69px", originY: "54px" }}
        />

        {/* Feet */}
        <ellipse cx="29" cy="84" rx="5.5" ry="3" fill={INK} />
        <ellipse cx="51" cy="84" rx="5.5" ry="3" fill={INK} />

        {/* The sheet, with its folded corner */}
        <path
          d="M17 8 H56 L70 22 V75 Q70 81 64 81 H17 Q11 81 11 75 V14 Q11 8 17 8 Z"
          fill="#FFFFFF"
          stroke={INK}
          strokeWidth="2.4"
          strokeLinejoin="round"
        />
        <path
          d="M56 8 V18 Q56 22 60 22 H70 Z"
          fill="var(--cc-rust)"
          stroke={INK}
          strokeWidth="2.4"
          strokeLinejoin="round"
        />

        {/* A few lines of writing */}
        <g stroke={INK} strokeWidth="2" strokeLinecap="round" opacity="0.16">
          <line x1="20" y1="64" x2="56" y2="64" />
          <line x1="20" y1="70.5" x2="46" y2="70.5" />
        </g>

        {/* Eyes */}
        {mood === "happy" ? (
          <g fill="none" stroke={INK} strokeWidth="2.6" strokeLinecap="round">
            <path d="M25.5 41 Q29 36.5 32.5 41" />
            <path d="M47.5 41 Q51 36.5 54.5 41" />
          </g>
        ) : !awake ? (
          <g fill="none" stroke={INK} strokeWidth="2.4" strokeLinecap="round">
            <path d="M25.5 39.5 Q29 42.5 32.5 39.5" />
            <path d="M47.5 39.5 Q51 42.5 54.5 39.5" />
          </g>
        ) : (
          <motion.g animate={blink} style={{ originX: "40px", originY: "39px" }}>
            <ellipse cx="29" cy="39" rx="3.8" ry="4.8" fill={INK} />
            <ellipse cx="51" cy="39" rx="3.8" ry="4.8" fill={INK} />
            <circle cx="30.4" cy="37.2" r="1.35" fill="#FFFFFF" />
            <circle cx="52.4" cy="37.2" r="1.35" fill="#FFFFFF" />
          </motion.g>
        )}

        {/* Cheeks */}
        <ellipse cx="22.5" cy="47.5" rx="4.2" ry="2.6" fill={CHEEK} opacity="0.75" />
        <ellipse cx="57.5" cy="47.5" rx="4.2" ry="2.6" fill={CHEEK} opacity="0.75" />

        {/* Mouth */}
        {talking ? (
          <motion.ellipse
            cx="40"
            cy="48.5"
            rx="3.2"
            ry="2.8"
            fill={INK}
            animate={mouth}
            style={{ originX: "40px", originY: "48.5px" }}
          />
        ) : !awake ? (
          <path d="M37.5 48.5 Q40 49.8 42.5 48.5" fill="none" stroke={INK} strokeWidth="2" strokeLinecap="round" />
        ) : (
          <path
            d={mood === "happy" ? "M35 46.5 Q40 53 45 46.5" : "M36 47 Q40 51 44 47"}
            fill={mood === "happy" ? INK : "none"}
            stroke={INK}
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* Zzz while tucked away */}
        {!awake && !still && (
          <motion.text
            x="62"
            y="6"
            fontSize="11"
            fontWeight="700"
            fill={INK}
            fontFamily="Inter, system-ui, sans-serif"
            animate={{ opacity: [0, 0.7, 0], y: [6, -4, -10] }}
            transition={{ duration: 2.6, repeat: Infinity, ease: "easeOut" }}
          >
            z
          </motion.text>
        )}
      </motion.g>
    </svg>
  );
};

export default Cutie;
