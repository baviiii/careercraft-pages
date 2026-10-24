/* 128px: crisp up to the 56px it is shown at, on 2x screens. The 512px PNG stays for
   structured data and anywhere it is shown large. */
const MARK_SRC = "/brand/faircopy-mark-128.webp";

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

