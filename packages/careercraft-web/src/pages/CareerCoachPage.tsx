/* ───────────────────────────────────────────────────────────
   CareerCoachPage — Horus Career Coach, as a first-class
   Intelligence destination inside the Astral observatory shell.
   ─────────────────────────────────────────────────────────── */

import { motion } from "framer-motion";
import { Download } from "lucide-react";
import { AstralShell, AstralMasthead, AstralButton } from "@/components/astral";
import CareerCoach from "@/components/rag/CareerCoach";

export default function CareerCoachPage() {
  const headerActions = (
    <AstralButton title="Download a past conversation">
      <Download className="w-3.5 h-3.5" />
      <span className="hidden sm:inline">Export</span>
    </AstralButton>
  );

  return (
    <AstralShell
      title={<span className="as-gradient-text">Career Coach</span>}
      subtitle="Horus · personalised reasoning"
      actions={headerActions}
      backTo="/intelligence"
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="space-y-10"
      >
        {/* Observatory masthead — tuned to the coaching context */}
        <AstralMasthead
          kicker="§ Transmission · Private line"
          title={
            <>
              A private line to
              <br />
              <span className="as-italic">your next move.</span>
            </>
          }
          subtitle="Six specialists. One conversation. Grounded in 54+ SA Government documents — budgets, workforce plans, policy, skills, funding and startup programs."
          nodes={[
            { label: "Careers",       value: "Jobs · pathways",    ring: 0, angle: 20,  color: "rgba(124,92,255,1)"  },
            { label: "Funding",       value: "Grants · budget",    ring: 1, angle: 90,  color: "rgba(94,234,212,1)"  },
            { label: "Skills",        value: "Training · credentials", ring: 0, angle: 160, color: "rgba(252,211,77,1)" },
            { label: "Policies",      value: "Regulation · reform",ring: 2, angle: 225, color: "rgba(167,139,250,1)" },
            { label: "Analyst",       value: "Cross-sector signal",ring: 1, angle: 305, color: "rgba(34,211,238,1)"  },
            { label: "Entrepreneurs", value: "Startup · innovation", ring: 2, angle: 45,  color: "rgba(244,114,182,1)" },
          ]}
        />

        {/* The coach — rendered full-bleed inside a glass frame so the
            observatory nebula continues to feel live behind the chat. */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="as-panel"
        >
          <div className="as-panel-inner p-2 md:p-3">
            <CareerCoach />
          </div>
        </motion.div>
      </motion.div>
    </AstralShell>
  );
}
