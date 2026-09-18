/* ───────────────────────────────────────────────────────────
   CareerCoachPage — the briefing desk fills the craft column.
   No competing hero: the coach is the page.
   ─────────────────────────────────────────────────────────── */

import CraftAppLayout from "@/components/craft/CraftAppLayout";
import CareerCoach from "@/components/rag/CareerCoach";

export default function CareerCoachPage() {
  return (
    <CraftAppLayout
      topBarLeft={
        <div className="cc-label-sm text-[color:var(--cc-ash)]">Career Coach</div>
      }
      className="!py-4 md:!py-5"
      fill
    >
      <CareerCoach />
    </CraftAppLayout>
  );
}
