import type { ButtonHTMLAttributes } from "react";

interface TrackerButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "ghost" | "danger";
  size?: "sm" | "md";
}

const VARIANT = { primary: "", ghost: "cc-action--ghost", danger: "cc-action--danger" };

/**
 * The tracker's dialog buttons: the same cobalt pill as "Add a job" on the
 * board. CraftButton isn't used here because its primary picks up the
 * design-system gradient (see CONCERNS.md).
 */
export const TrackerButton = ({
  variant = "primary",
  size = "md",
  type = "button",
  className = "",
  ...props
}: TrackerButtonProps) => (
  <button
    type={type}
    className={`cc-action ${size === "sm" ? "cc-action--sm" : ""} ${VARIANT[variant]} ${className}`}
    {...props}
  />
);
