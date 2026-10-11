import { motion } from "framer-motion";

import { CraftAppShell } from "@/components/craft/AppPrimitives";
import { CraftSpinner, useElapsedSeconds } from "@/components/craft/CraftSpinner";

import { ProofScan } from "./proof";

/* ProofScan is decoration and stops under "reduce motion". The spinner and
   the seconds counter are what say it's still working. */
export const AnalyzingScreen = () => {
  const seconds = useElapsedSeconds(true);
  return (
    <CraftAppShell className="cc-proof">
      <div className="grid min-h-screen place-items-center px-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
          aria-live="polite"
        >
          <ProofScan />
          <h2 className="mt-12 cc-font-display text-[30px] leading-tight text-[color:var(--cc-ink)]">
            Checking your résumé
          </h2>
          <p className="mt-3 cc-label-sm text-[color:var(--cc-ash)]">
            Keywords · Experience · Format · Writing
          </p>
          <div className="mt-6 inline-flex items-center gap-2.5 text-[14px] text-[color:var(--cc-ink-soft)]">
            <CraftSpinner size="sm" label="Checking your résumé" />
            <span className="cc-tabular">Working · {seconds}s</span>
          </div>
        </motion.div>
      </div>
    </CraftAppShell>
  );
};
