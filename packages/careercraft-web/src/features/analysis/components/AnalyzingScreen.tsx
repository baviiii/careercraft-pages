import { motion } from "framer-motion";

import { CraftAppShell } from "@/components/craft/AppPrimitives";

import { ProofScan } from "./proof";

export const AnalyzingScreen = () => (
  <CraftAppShell className="cc-proof">
    <div className="grid min-h-screen place-items-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
        role="status"
        aria-live="polite"
      >
        <ProofScan />
        <h2 className="mt-12 cc-font-display text-[30px] leading-tight text-[color:var(--cc-ink)]">
          Checking your résumé
        </h2>
        <p className="mt-3 cc-label-sm text-[color:var(--cc-ash)]">
          Keywords · Experience · Format · Writing
        </p>
      </motion.div>
    </div>
  </CraftAppShell>
);
