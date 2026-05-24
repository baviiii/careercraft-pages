/* ───────────────────────────────────────────────────────────
   AstralButton — glass pill with aurora hover.
   Thin wrapper around .as-btn / .as-btn-primary.
   ─────────────────────────────────────────────────────────── */

import { memo, ReactNode, MouseEvent } from "react";

interface AstralButtonProps {
  children: ReactNode;
  onClick?: (e: MouseEvent<HTMLButtonElement>) => void;
  variant?: "primary" | "ghost";
  disabled?: boolean;
  type?: "button" | "submit";
  className?: string;
  title?: string;
}

export const AstralButton = memo(function AstralButton({
  children,
  onClick,
  variant = "ghost",
  disabled,
  type = "button",
  className = "",
  title,
}: AstralButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`as-btn ds-btn ${variant === "primary" ? "as-btn-primary ds-btn-primary" : ""} ${
        disabled ? "opacity-50 cursor-not-allowed" : ""
      } ${className}`}
    >
      {children}
    </button>
  );
});
