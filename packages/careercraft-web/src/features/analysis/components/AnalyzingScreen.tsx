import { motion } from "framer-motion";

import { CraftAppShell } from "@/components/craft/AppPrimitives";

export const AnalyzingScreen = () => {
  const stages = [
    { label: "Extracting the brief", done: true },
    { label: "Parsing the draft", done: true },
    { label: "Running the audit", done: false, active: true },
    { label: "Drafting recommendations", done: false },
  ];

  return (
    <CraftAppShell>
      <div className="min-h-screen grid place-items-center">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-md mx-auto px-6"
        >
          <div className="cc-label text-[color:var(--cc-rust)] mb-6">
            § The reading
          </div>

          <div className="relative w-32 h-32 mx-auto mb-10">
            <svg className="w-full h-full" viewBox="0 0 100 100">
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
                strokeDasharray="60 289"
                strokeLinecap="butt"
                className="origin-center animate-spin"
                style={{ animationDuration: "2s" }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="cc-font-display italic text-4xl text-[color:var(--cc-ink)]">
                ¶
              </span>
            </div>
          </div>

          <h2 className="cc-font-display text-3xl leading-tight mb-6">
            Reading the <span className="cc-italic-wonk">draft</span>.
          </h2>

          <ul className="text-left space-y-3 border-t border-[color:var(--cc-hair-strong)] pt-5">
            {stages.map((s) => (
              <li
                key={s.label}
                className="flex items-center gap-3 cc-font-editorial italic text-[17px]"
              >
                <span
                  className={`inline-block w-2 h-2 rounded-full ${
                    s.done
                      ? "bg-[color:var(--cc-rust)]"
                      : s.active
                      ? "bg-[color:var(--cc-ink)] animate-pulse"
                      : "bg-[color:var(--cc-hair-strong)]"
                  }`}
                />
                <span
                  className={
                    s.done
                      ? "text-[color:var(--cc-ink)]"
                      : "text-[color:var(--cc-ink-soft)]"
                  }
                >
                  {s.label}
                </span>
              </li>
            ))}
          </ul>
        </motion.div>
      </div>
    </CraftAppShell>
  );
};
