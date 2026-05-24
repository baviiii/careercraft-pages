/* ───────────────────────────────────────────────────────────
   The editorial four-step progress rail.
   § 01 Cover / § 02 Compose / § 03 Template / § 04 Export
   ─────────────────────────────────────────────────────────── */

import { STEPS } from "../types";

interface StepNavigatorProps {
  currentStep: number;
  onStepClick: (index: number) => void;
}

export const StepNavigator = ({
  currentStep,
  onStepClick,
}: StepNavigatorProps) => {
  return (
    <div className="border-t border-b border-[color:var(--cc-hair-strong)] bg-[color:var(--cc-cream-2)]">
      <div className="max-w-[1400px] mx-auto px-6 md:px-10 py-5">
        <div className="grid grid-cols-4 gap-px bg-[color:var(--cc-hair-strong)] border border-[color:var(--cc-hair-strong)]">
          {STEPS.map((step, i) => {
            const isActive = i === currentStep;
            const isDone = i < currentStep;
            const isReachable = i <= currentStep;

            const state = isActive ? "active" : isDone ? "done" : "pending";

            return (
              <button
                key={step.id}
                onClick={() => isReachable && onStepClick(i)}
                disabled={!isReachable}
                className={[
                  "text-left p-5 md:p-6 transition-colors",
                  state === "active"
                    ? "bg-[color:var(--cc-cream)]"
                    : state === "done"
                    ? "bg-[color:var(--cc-cream)]"
                    : "bg-[color:var(--cc-cream-2)]",
                  isReachable ? "cursor-pointer" : "cursor-not-allowed",
                ].join(" ")}
              >
                <div
                  className={[
                    "cc-label",
                    state === "active"
                      ? "text-[color:var(--cc-rust)]"
                      : state === "done"
                      ? "text-[color:var(--cc-ink)]"
                      : "text-[color:var(--cc-ash)]",
                  ].join(" ")}
                >
                  {step.number}
                  {state === "done" && <span className="ml-2">·&nbsp;done</span>}
                  {state === "active" && <span className="ml-2">·&nbsp;current</span>}
                </div>
                <div
                  className={[
                    "mt-2 cc-font-display text-2xl md:text-3xl leading-none tracking-tight",
                    state === "active"
                      ? "text-[color:var(--cc-rust)]"
                      : state === "done"
                      ? "text-[color:var(--cc-ink)]"
                      : "text-[color:var(--cc-ash)]",
                  ].join(" ")}
                >
                  {step.title}
                </div>
                <div
                  className={[
                    "mt-2 cc-font-editorial italic text-[15px] leading-snug",
                    state === "pending"
                      ? "text-[color:var(--cc-ash)]"
                      : "text-[color:var(--cc-ink-soft)]",
                  ].join(" ")}
                >
                  {step.sub}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
