const MARK_SRC = "/brand/faircopy-mark.png";
const LOCKUP_SRC = "/brand/faircopy-logo.png";

type MarkProps = {
  className?: string;
  title?: string;
};

/** Faircopy mark — open book, path, doorway, spark. */
export function FaircopyMark({ className = "h-8 w-8", title }: MarkProps) {
  return (
    <img
      src={MARK_SRC}
      alt={title ?? ""}
      className={`object-contain select-none ${className}`}
      draggable={false}
      aria-hidden={title ? undefined : true}
    />
  );
}

type LockupProps = {
  className?: string;
  /** Prefer stacked lockup with tagline for auth / splash. */
  size?: "sm" | "md" | "lg";
};

const LOCKUP_SIZE = {
  sm: "h-16 w-auto",
  md: "h-28 w-auto max-w-[220px]",
  lg: "h-40 w-auto max-w-[280px]",
} as const;

/** Full Faircopy lockup — mark + wordmark + tagline. */
export function FaircopyLockup({ className, size = "md" }: LockupProps) {
  return (
    <img
      src={LOCKUP_SRC}
      alt="Faircopy — One stop. Every step. Your career."
      className={`object-contain object-left select-none ${LOCKUP_SIZE[size]} ${className ?? ""}`}
      draggable={false}
    />
  );
}
