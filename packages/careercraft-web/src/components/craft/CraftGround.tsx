/* ───────────────────────────────────────────────────────────
   Faircopy — the paper every logged-in page sits on.
   Baseline grid, accent glow and grain. The sidebar draws the
   same grid, so the two read as one sheet. See "APP CHROME"
   in styles/craft.css.
   ─────────────────────────────────────────────────────────── */

import { memo } from "react";

export const CraftGround = memo(function CraftGround() {
  return (
    <div aria-hidden className="cc-ground">
      <div className="cc-grain absolute inset-0" />
    </div>
  );
});
