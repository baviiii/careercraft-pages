/* The little world behind Fay: a round window onto the sky that keeps the
   local clock. A peach sunrise in the morning, blue sky and drifting clouds
   by day, a sunset with the first stars in the evening, and the moon, stars,
   a shooting star and fireflies at night. Drawn flat and without outlines so
   she stands out in front of it; the sky shifts a touch against her turns
   for depth, and dims while she sleeps. With reduced motion it holds still —
   only the time of day changes it.

   It draws inside Fay's own SVG, in her coordinates (see SCENE). */

import { useId, type ReactNode } from "react";
import {
  AnimatePresence,
  motion,
  useTransform,
  type MotionValue,
} from "framer-motion";

import type { DayPart } from "./brief";
import { at, INK, sparkPath } from "./fayArt";

/** The window: a circle round her, in her drawing's coordinates. */
export const SCENE = { cx: 50, cy: 64, r: 56 } as const;

type Palette = {
  sky: [string, string, string];
  back: string;
  front: string;
  tuft: string;
};

const PALETTE: Record<DayPart, Palette> = {
  morning: {
    sky: ["#FFCDBB", "#FFE2CA", "#FFF3DB"],
    back: "#C3E5C3",
    front: "#9CD4A5",
    tuft: "#72B585",
  },
  day: {
    sky: ["#8ACCF6", "#C0E5FD", "#E6F6FF"],
    back: "#A8DCAF",
    front: "#81C792",
    tuft: "#5BAA71",
  },
  evening: {
    sky: ["#7C77C6", "#E799A6", "#FFC68F"],
    back: "#9B93C8",
    front: "#6E9E89",
    tuft: "#4E826F",
  },
  night: {
    sky: ["#18214D", "#27346B", "#3E4D88"],
    back: "#2A3868",
    front: "#2A4C56",
    tuft: "#1E3A43",
  },
};

const STAR = "#FFF3CF";
const MOON = "#FFF1C7";
const FIREFLY = "#FBE47A";

const forever = (duration: number, delay = 0) => ({
  duration,
  delay,
  repeat: Infinity,
  ease: "easeInOut" as const,
});

/* A puffy cloud with a flat bottom; s scales it. */
const Cloud = ({
  x,
  y,
  s,
  fill,
}: {
  x: number;
  y: number;
  s: number;
  fill: string;
}) => (
  <g fill={fill}>
    <circle cx={x - 5 * s} cy={y} r={3.6 * s} />
    <circle cx={x} cy={y - 2.4 * s} r={5 * s} />
    <circle cx={x + 5.5 * s} cy={y - 0.6 * s} r={3.8 * s} />
    <rect
      x={x - 8.6 * s}
      y={y}
      width={17.9 * s}
      height={3.6 * s}
      rx={1.8 * s}
    />
  </g>
);

const Drift = ({
  still,
  by,
  duration,
  children,
}: {
  still: boolean;
  by: number;
  duration: number;
  children: ReactNode;
}) => (
  <motion.g
    animate={still ? undefined : { x: [0, by, 0] }}
    transition={forever(duration)}
  >
    {children}
  </motion.g>
);

const Twinkle = ({
  x,
  y,
  r,
  still,
  delay = 0,
  duration = 2.6,
}: {
  x: number;
  y: number;
  r: number;
  still: boolean;
  delay?: number;
  duration?: number;
}) => (
  <motion.path
    d={sparkPath(x, y, r)}
    fill={STAR}
    style={at(x, y)}
    animate={
      still ? undefined : { opacity: [0.35, 1, 0.35], scale: [0.75, 1.1, 0.75] }
    }
    transition={forever(duration, delay)}
  />
);

const Firefly = ({
  x,
  y,
  still,
  delay,
}: {
  x: number;
  y: number;
  still: boolean;
  delay: number;
}) => (
  <motion.g
    opacity={still ? 0.8 : undefined}
    animate={
      still
        ? undefined
        : {
            x: [0, 2.6, -1.8, 0],
            y: [0, -3.2, -1.2, 0],
            opacity: [0.15, 1, 0.55, 0.15],
          }
    }
    transition={forever(4.6 + delay, delay)}
  >
    <circle cx={x} cy={y} r={3} fill={FIREFLY} opacity={0.35} />
    <circle cx={x} cy={y} r={1.3} fill={FIREFLY} />
  </motion.g>
);

/* A sun with soft rays that turn slowly. */
const Sun = ({
  x,
  y,
  r,
  fill,
  glow,
  ray,
  still,
}: {
  x: number;
  y: number;
  r: number;
  fill: string;
  glow: string;
  ray: string | null;
  still: boolean;
}) => (
  <g>
    <motion.circle
      cx={x}
      cy={y}
      r={r * 1.6}
      fill={glow}
      opacity={0.75}
      style={at(x, y)}
      animate={still ? undefined : { scale: [1, 1.1, 1] }}
      transition={forever(4.5)}
    />
    {ray && (
      <motion.g
        style={at(x, y)}
        animate={still ? undefined : { rotate: 360 }}
        transition={{ duration: 48, repeat: Infinity, ease: "linear" }}
        stroke={ray}
        strokeWidth="2"
        strokeLinecap="round"
      >
        {Array.from({ length: 8 }, (_, i) => {
          const a = (i * Math.PI) / 4;
          return (
            <line
              key={i}
              x1={x + Math.cos(a) * (r + 3)}
              y1={y + Math.sin(a) * (r + 3)}
              x2={x + Math.cos(a) * (r + 6.5)}
              y2={y + Math.sin(a) * (r + 6.5)}
            />
          );
        })}
      </motion.g>
    )}
    <circle cx={x} cy={y} r={r} fill={fill} />
  </g>
);

/* Three blades of grass growing up from (x, y). */
const tuft = (x: number, y: number) =>
  `M${x} ${y} l-1.6 -3.6 M${x} ${y} l0 -4.6 M${x} ${y} l1.6 -3.6`;

interface SkyProps {
  part: DayPart;
  id: string;
  still: boolean;
  skyX: MotionValue<number>;
  hillX: MotionValue<number>;
}

/* What's up in the sky, behind the far hills. */
const SkyThings = ({ part, id, still }: Omit<SkyProps, "skyX" | "hillX">) => {
  if (part === "morning")
    return (
      <>
        <Sun
          x={10}
          y={88}
          r={9.5}
          fill="#FFBC62"
          glow="#FFE3AA"
          ray="#FFC978"
          still={still}
        />
        <Drift still={still} by={-4} duration={16}>
          <Cloud x={89} y={50} s={1.1} fill="#FFF7F1" />
        </Drift>
        <Drift still={still} by={3} duration={20}>
          <Cloud x={1} y={64} s={0.8} fill="#FFF7F1" />
        </Drift>
      </>
    );
  if (part === "day")
    return (
      <>
        <Sun
          x={9}
          y={42}
          r={8}
          fill="#FFD35C"
          glow="#FFF1B8"
          ray="#FFD86B"
          still={still}
        />
        <Drift still={still} by={-5} duration={18}>
          <Cloud x={91} y={47} s={1.15} fill="#FFFFFF" />
        </Drift>
        <Drift still={still} by={4} duration={22}>
          <Cloud x={0} y={70} s={0.85} fill="#FFFFFF" />
        </Drift>
        <Drift still={still} by={3} duration={14}>
          <Cloud x={57} y={13} s={0.6} fill="#FFFFFF" />
        </Drift>
      </>
    );
  if (part === "evening")
    return (
      <>
        <Sun
          x={92}
          y={90}
          r={11}
          fill="#FF9A6B"
          glow="#FFC28F"
          ray={null}
          still={still}
        />
        <Drift still={still} by={-3} duration={20}>
          <g fill="#C9A3D6" opacity={0.85}>
            <rect x={76} y={62} width={22} height={3.6} rx={1.8} />
            <rect x={84} y={55} width={13} height={3} rx={1.5} />
            <rect x={-5} y={58} width={19} height={3.2} rx={1.6} />
          </g>
        </Drift>
        <Twinkle x={12} y={27} r={2.3} still={still} />
        <Twinkle x={44} y={12} r={1.8} still={still} delay={1.1} />
      </>
    );
  return (
    <>
      <defs>
        <mask id={`${id}-moon`}>
          <circle cx={8} cy={42} r={8.5} fill="#FFFFFF" />
          <circle cx={12.5} cy={38.5} r={7.4} fill="#000000" />
        </mask>
      </defs>
      <motion.circle
        cx={8}
        cy={42}
        r={15}
        fill={MOON}
        opacity={0.16}
        style={at(8, 42)}
        animate={still ? undefined : { scale: [1, 1.12, 1] }}
        transition={forever(5)}
      />
      <circle cx={8} cy={42} r={8.5} fill={MOON} mask={`url(#${id}-moon)`} />
      <Twinkle x={14} y={25} r={2.4} still={still} />
      <Twinkle x={44} y={13} r={2} still={still} delay={0.8} duration={3.1} />
      <Twinkle x={90} y={33} r={2.2} still={still} delay={1.6} />
      <Twinkle x={100} y={60} r={1.8} still={still} delay={0.4} duration={3.4} />
      <Twinkle x={-1} y={72} r={1.6} still={still} delay={2.1} />
      <g fill={STAR} opacity={0.75}>
        <circle cx={30} cy={15} r={0.9} />
        <circle cx={70} cy={13} r={0.9} />
        <circle cx={101} cy={47} r={0.8} />
        <circle cx={2} cy={56} r={0.8} />
        <circle cx={95} cy={74} r={0.8} />
      </g>
      {/* Now and then a shooting star, across the gap between her ears */}
      {!still && (
        <motion.line
          x1={66}
          y1={10}
          x2={60}
          y2={12.4}
          stroke={STAR}
          strokeWidth="1.5"
          strokeLinecap="round"
          initial={{ opacity: 0 }}
          animate={{ x: [0, -26], y: [0, 10.5], opacity: [0, 1, 1, 0] }}
          transition={{
            duration: 0.9,
            times: [0, 0.15, 0.7, 1],
            repeat: Infinity,
            repeatDelay: 11,
            delay: 4,
            ease: "easeIn",
          }}
        />
      )}
    </>
  );
};

/* Little things down on the ground, in front of the far hills. */
const GroundThings = ({ part, still }: { part: DayPart; still: boolean }) =>
  part === "evening" ? (
    <>
      <Firefly x={8} y={85} still={still} delay={0} />
      <Firefly x={95} y={81} still={still} delay={1.4} />
    </>
  ) : part === "night" ? (
    <>
      <Firefly x={6} y={86} still={still} delay={0} />
      <Firefly x={94} y={84} still={still} delay={1.2} />
      <Firefly x={86} y={95} still={still} delay={2.3} />
    </>
  ) : null;

const Sky = ({ part, id, still, skyX, hillX }: SkyProps) => {
  const p = PALETTE[part];
  const sky = `${id}-${part}-sky`;
  return (
    <>
      <defs>
        <linearGradient id={sky} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={p.sky[0]} />
          <stop offset="0.55" stopColor={p.sky[1]} />
          <stop offset="1" stopColor={p.sky[2]} />
        </linearGradient>
      </defs>
      <rect
        x={SCENE.cx - SCENE.r}
        y={SCENE.cy - SCENE.r}
        width={SCENE.r * 2}
        height={SCENE.r * 2}
        fill={`url(#${sky})`}
      />
      <motion.g style={{ x: skyX }}>
        <SkyThings part={part} id={id} still={still} />
      </motion.g>
      {/* Far hills, then the near ground she sits on */}
      <motion.g style={{ x: hillX }}>
        <path
          d="M-10 97 C2 88 16 87 27 93 C38 86 60 84 74 91 C86 85 99 86 110 93 V124 H-10 Z"
          fill={p.back}
        />
      </motion.g>
      <GroundThings part={part} still={still} />
      <path
        d="M-10 103 C10 97 32 97 50 100 C68 97 90 96 110 101 V124 H-10 Z"
        fill={p.front}
      />
      <path
        d={`${tuft(14, 101)} ${tuft(86, 100)} ${tuft(80, 106)}`}
        stroke={p.tuft}
        strokeWidth="1.6"
        strokeLinecap="round"
        fill="none"
      />
    </>
  );
};

interface FaySceneProps {
  part: DayPart;
  still: boolean;
  /** Fay's head turn; the sky shifts a little against it. */
  turn: MotionValue<number>;
  /** Dim the lights while she sleeps. */
  dim: boolean;
  /** Id for the window's clip, so Fay can keep her shadow inside it too. */
  clipId: string;
}

export const FayScene = ({ part, still, turn, dim, clipId }: FaySceneProps) => {
  const id = `fay-scene-${useId().replace(/:/g, "")}`;
  const skyX = useTransform(turn, (t) => -t * 2.5);
  const hillX = useTransform(turn, (t) => -t * 1.2);
  const { cx, cy, r } = SCENE;

  return (
    <g>
      {/* A soft shadow under the window */}
      <circle cx={cx} cy={cy + 2.5} r={r} fill={INK} opacity={0.1} />
      <defs>
        <clipPath id={clipId}>
          <circle cx={cx} cy={cy} r={r} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clipId})`}>
        {/* Under the crossfade, so the page never shows through it */}
        <motion.circle
          cx={cx}
          cy={cy}
          r={r}
          initial={false}
          animate={{ fill: PALETTE[part].sky[1] }}
          transition={{ duration: still ? 0 : 1.6 }}
        />
        <AnimatePresence initial={false}>
          <motion.g
            key={part}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: still ? 0 : 1.6 }}
          >
            <Sky part={part} id={id} still={still} skyX={skyX} hillX={hillX} />
          </motion.g>
        </AnimatePresence>
        <motion.circle
          cx={cx}
          cy={cy}
          r={r}
          fill="#141A3A"
          initial={false}
          animate={{ opacity: dim ? 0.22 : 0 }}
          transition={{ duration: still ? 0 : 1.2 }}
        />
      </g>
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke={INK}
        strokeWidth="2.2"
      />
    </g>
  );
};

export default FayScene;
