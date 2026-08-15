/* ───────────────────────────────────────────────────────────
   CareerCoachPage — Horus Career Coach inside the main Craft
   app layout (shared CraftSidebar). No Astral rail / masthead.
   ─────────────────────────────────────────────────────────── */

import { motion } from "framer-motion";
import CraftAppLayout from "@/components/craft/CraftAppLayout";
import CareerCoach from "@/components/rag/CareerCoach";

const ease = [0.2, 0.8, 0.2, 1] as const;

export default function CareerCoachPage() {
  return (
    <CraftAppLayout
      topBarLeft={
        <div className="cc-label-sm text-[color:var(--cc-ash)]">Career Coach</div>
      }
      className="!py-6 md:!py-8"
      fill
    >
      <motion.section
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease }}
        className="mb-5 shrink-0"
      >
        <div className="cc-eyebrow cc-tone-cobalt">Private line</div>
        <h1 className="mt-3 max-w-2xl cc-font-display text-[1.85rem] leading-[0.98] tracking-[-0.03em] md:text-[2.35rem]">
          Ask about your{" "}
          <span className="cc-italic-wonk text-[color:var(--cc-rust)]">next move.</span>
        </h1>
        <p className="mt-2 max-w-xl cc-font-editorial text-base leading-snug text-[color:var(--cc-ink-soft)]">
          Careers, skills, funding, and policy — grounded in SA Government documents.
        </p>
      </motion.section>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.05, ease }}
        className="flex min-h-0 flex-1 flex-col"
      >
        <CareerCoach />
      </motion.div>
    </CraftAppLayout>
  );
}
