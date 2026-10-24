/* ───────────────────────────────────────────────────────────
   The four steps: Start · Edit · Design · Download.
   Steps you've reached can be tapped to go back; later ones wait.
   ─────────────────────────────────────────────────────────── */

import { Check, ChevronRight } from "lucide-react";
import { Fragment } from "react";

import { STEPS } from "../types";

interface StepNavigatorProps {
  currentStep: number;
  onStepClick: (index: number) => void;
}

export const StepNavigator = ({ currentStep, onStepClick }: StepNavigatorProps) => (
  <nav aria-label="Steps" className="mx-auto max-w-[1400px] px-6 md:px-10">
    <ol className="flex flex-wrap items-center gap-1 rounded-2xl border border-[color:var(--cc-hair)] bg-white p-1.5">
      {STEPS.map((step, i) => {
        const isActive = i === currentStep;
        const isDone = i < currentStep;
        const isReachable = i <= currentStep;

        return (
          <Fragment key={step.id}>
            {i > 0 && (
              <ChevronRight className="hidden h-4 w-4 shrink-0 text-[color:var(--cc-hair-strong)] sm:block" aria-hidden />
            )}
            {/* On a phone four names don't fit, so only the current step
                shows its name; the others keep theirs for screen readers. */}
            <li className={`min-w-0 sm:flex-1 ${isActive ? "flex-[3]" : "flex-1"}`}>
              <button
                type="button"
                onClick={() => isReachable && onStepClick(i)}
                disabled={!isReachable}
                aria-current={isActive ? "step" : undefined}
                className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left transition-colors ${
                  isActive ? "bg-[color:var(--cc-cream-2)]" : isReachable ? "hover:bg-[color:var(--cc-cream-2)]" : "cursor-default"
                }`}
              >
                <span
                  className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-[13px] font-semibold ${
                    isActive
                      ? "bg-[color:var(--cc-rust)] text-white"
                      : isDone
                        ? "bg-[rgba(63,122,92,0.14)] text-[color:var(--cc-signal-deep)]"
                        : "border border-[color:var(--cc-hair-strong)] text-[color:var(--cc-ash)]"
                  }`}
                  aria-hidden
                >
                  {isDone ? <Check className="h-3.5 w-3.5" /> : step.number}
                </span>
                <span className="min-w-0">
                  <span
                    className={`cc-font-display text-[15px] font-semibold leading-tight ${
                      isActive ? "block truncate" : "sr-only sm:not-sr-only sm:block"
                    } ${isReachable ? "text-[color:var(--cc-ink)]" : "text-[color:var(--cc-ash)]"}`}
                  >
                    {step.title}
                  </span>
                  <span className="hidden truncate text-[12.5px] text-[color:var(--cc-ash)] lg:block">{step.sub}</span>
                </span>
              </button>
            </li>
          </Fragment>
        );
      })}
    </ol>
  </nav>
);
