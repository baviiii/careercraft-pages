/* Shared form pieces for the builder's sections: a labelled field, inputs,
   and the white card each section sits in. Same look as the rest of the app. */

import type { ReactNode } from "react";

interface LabelledFieldProps {
  label: string;
  required?: boolean;
  hint?: ReactNode;
  children: ReactNode;
  className?: string;
}

export const LabelledField = ({
  label,
  required,
  hint,
  children,
  className = "",
}: LabelledFieldProps) => (
  <label className={`block ${className}`}>
    <span className="flex items-baseline gap-1.5 text-[13px] font-medium text-[color:var(--cc-ink-soft)]">
      {label}
      {required && <span className="font-normal text-[color:var(--cc-ash)]">(needed)</span>}
    </span>
    <div className="mt-1.5">{children}</div>
    {hint && <p className="mt-1.5 text-[12.5px] text-[color:var(--cc-ash)]">{hint}</p>}
  </label>
);

interface CraftInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Optional leading icon slot. */
  leading?: ReactNode;
}

export const CraftInput = ({
  leading,
  className = "",
  ...rest
}: CraftInputProps) => (
  <div className="flex items-center gap-2">
    {leading && (
      <span className="text-[color:var(--cc-ash)] flex-shrink-0">{leading}</span>
    )}
    <input
      {...rest}
      className={`cc-field ${className}`}
    />
  </div>
);

type CraftTextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export const CraftTextarea = ({ className = "", ...rest }: CraftTextareaProps) => (
  <textarea {...rest} className={`cc-field cc-field-textarea ${className}`} />
);

interface CraftSectionProps {
  /** Kept for callers; no longer shown (the title says it). */
  kicker?: string;
  title: ReactNode;
  sub?: ReactNode;
  right?: ReactNode;
  children: ReactNode;
}

/** The white card one résumé section sits in: a plain title, a line on what goes here, the fields. */
export const CraftSection = ({ title, sub, right, children }: CraftSectionProps) => (
  <section className="rounded-2xl border border-[color:var(--cc-hair)] bg-white p-5 md:p-7">
    <header className="flex items-start justify-between gap-4 border-b border-[color:var(--cc-hair)] pb-4">
      <div>
        <h3 className="cc-font-display text-2xl font-semibold leading-tight tracking-tight">{title}</h3>
        {sub && <p className="mt-1 text-[14.5px] text-[color:var(--cc-ink-soft)]">{sub}</p>}
      </div>
      {right && <div className="flex-shrink-0">{right}</div>}
    </header>
    <div className="pt-5">{children}</div>
  </section>
);
