const MARK_SRC = "/brand/faircopy-mark.png";

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

