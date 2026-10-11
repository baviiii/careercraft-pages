import { AnimatePresence, motion } from "framer-motion";

import { CraftSpinner, useElapsedSeconds } from "@/components/craft/CraftSpinner";

import { ProofScan } from "./proof";

interface ReanalyzingOverlayProps {
  open: boolean;
}

/* ProofScan stops under "reduce motion"; the spinner and seconds keep going. */
export const ReanalyzingOverlay = ({ open }: ReanalyzingOverlayProps) => {
  const seconds = useElapsedSeconds(open);
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(247,247,244,0.82)] backdrop-blur-sm"
          aria-live="polite"
        >
          <motion.div
            initial={{ scale: 0.96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.96, opacity: 0 }}
            className="cc-surface mx-4 max-w-sm px-10 py-10 text-center"
          >
            <ProofScan size="sm" />
            <h3 className="mt-9 cc-font-display text-[22px] leading-tight text-[color:var(--cc-ink)]">
              Re-scoring your résumé
            </h3>
            <div className="mt-3 inline-flex items-center gap-2 text-[14px] text-[color:var(--cc-ash)]">
              <CraftSpinner size="sm" label="Re-scoring your résumé" />
              <span className="cc-tabular text-[color:var(--cc-ink-soft)]">{seconds}s</span>
              <span>· usually 10–15 seconds</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
