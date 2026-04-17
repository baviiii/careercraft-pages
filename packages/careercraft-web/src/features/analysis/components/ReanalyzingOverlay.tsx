import { AnimatePresence, motion } from "framer-motion";

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
        className="fixed inset-0 z-50 bg-[color:var(--cc-cream)]/85 backdrop-blur-sm flex items-center justify-center"
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="border-2 border-[color:var(--cc-ink)] bg-[color:var(--cc-cream)] p-8 md:p-10 text-center max-w-md mx-4"
        >
          <div className="cc-label text-[color:var(--cc-rust)] mb-4">
            § Re-reading
          </div>

          <div className="relative w-20 h-20 mx-auto mb-6">
            <svg viewBox="0 0 100 100" className="w-full h-full">
              <circle
                cx="50"
                cy="50"
                r="46"
                fill="none"
                stroke="var(--cc-hair-strong)"
                strokeWidth="2"
              />
              <circle
                cx="50"
                cy="50"
                r="46"
                fill="none"
                stroke="var(--cc-rust)"
                strokeWidth="2"
                strokeDasharray="80 289"
                className="origin-center animate-spin"
                style={{ animationDuration: "1.8s" }}
              />
            </svg>
          </div>

          <h3 className="cc-font-display text-2xl leading-tight mb-3">
            Setting the new <span className="cc-italic-wonk">reading</span>.
          </h3>
          <p className="cc-font-editorial italic text-[color:var(--cc-ink-soft)]">
            Calculating the refreshed score with the edited draft.
          </p>
          <p className="mt-4 cc-label text-[color:var(--cc-ash)]">
            usually 10 – 15 seconds
          </p>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);
