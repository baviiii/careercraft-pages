/* ───────────────────────────────────────────────────────────
   Faircopy — the paper every logged-in page sits on.
   Baseline grid, accent glow, grain, and (beside the sidebar)
   a red-pen margin rule. See "APP CHROME" in styles/craft.css.
   ─────────────────────────────────────────────────────────── */

import { memo } from "react";

export const CraftGround = memo(function CraftGround({
  withSidebar = false,
}: {
  /** Draw the margin rule beside the 272px sidebar (lg and up). */
  withSidebar?: boolean;
}) {
  return (
    <div aria-hidden className={`cc-ground ${withSidebar ? "cc-ground--side" : ""}`}>
      <div className="cc-grain absolute inset-0" />
      <div className="cc-ground__margin" />
    </div>
  );
});
