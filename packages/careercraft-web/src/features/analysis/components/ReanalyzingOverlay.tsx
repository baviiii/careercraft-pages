import { AnimatePresence, motion } from "framer-motion";

import { ProofScan } from "./proof";

interface ReanalyzingOverlayProps {
  open: boolean;
}

export const ReanalyzingOverlay = ({ open }: ReanalyzingOverlayProps) => (
  <AnimatePresence>
    {open && (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(247,247,244,0.82)] backdrop-blur-sm"
        role="status"
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
          <p className="mt-2 text-[14px] text-[color:var(--cc-ash)]">Usually 10–15 seconds</p>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);
