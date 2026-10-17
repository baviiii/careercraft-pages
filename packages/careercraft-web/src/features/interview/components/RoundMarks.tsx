/**
 * The round-type marks used everywhere a session appears. Colour never stands
 * alone: the tag always says the type's name, and a bare dot is only used
 * beside text that names it. Also the three-dot meter that grades things
 * (a story's strength, a debrief verdict) in ink, so a grade never borrows a
 * round's colour.
 */
import { roundClass, roundMeta, type RoundType } from "../lib/roundTypes";

export function RoundDot({ type, className = "" }: { type: RoundType; className?: string }) {
  return <span aria-hidden className={`cc-iv-dot ${roundClass(type)} ${className}`} />;
}

export function RoundTag({ type, className = "" }: { type: RoundType; className?: string }) {
  return (
    <span className={`cc-iv-tag ${roundClass(type)} ${className}`}>
      <span aria-hidden className="cc-iv-dot" />
      {roundMeta(type).label}
    </span>
  );
}

/** A word and 0–3 filled dots, in ink: "strong ●●●", "shaky ●●○". */
export function LevelMeter({ level, label }: { level: number; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      <span aria-hidden className="inline-flex gap-[3px]">
        {[1, 2, 3].map((i) => (
          <span
            key={i}
            className={`h-1.5 w-1.5 rounded-full ${
              i <= level ? "bg-[color:var(--cc-ink)]" : "border border-[color:var(--cc-hair-strong)]"
            }`}
          />
        ))}
      </span>
      <span className="cc-label-sm text-[color:var(--cc-ink)]">{label}</span>
    </span>
  );
}
