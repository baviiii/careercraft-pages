import type { LetterTone } from "../types";

interface PostageStampProps {
  tone: LetterTone;
  /** Big line, e.g. the role. */
  primary: string;
  /** Small mono line under it, e.g. the company. */
  secondary?: string;
  size?: "lg" | "sm";
  className?: string;
}

/* A perforated stamp in the tone's colour. The perforation is drawn in CSS
   (.cc-desk-stamp in ../cover-letter.css) so it costs no image. */
export const PostageStamp = ({
  tone,
  primary,
  secondary,
  size = "lg",
  className = "",
}: PostageStampProps) => (
  <div
    data-tone={tone}
    className={`cc-desk-stamp ${size === "sm" ? "cc-desk-stamp--sm" : ""} ${className}`}
    aria-hidden={size === "sm" ? true : undefined}
  >
    <div className="cc-desk-stamp-face">
      <div className="cc-desk-stamp-primary">{primary}</div>
      {secondary && <div className="cc-desk-stamp-secondary">{secondary}</div>}
    </div>
  </div>
);
