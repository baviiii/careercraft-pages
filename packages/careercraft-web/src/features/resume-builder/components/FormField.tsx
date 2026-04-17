/* Shared form atoms for the builder forms — editorial styling, no shadcn. */

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
    <span className="cc-label text-[color:var(--cc-ash)] flex items-baseline gap-2">
      {label}
      {required && (
        <span className="text-[color:var(--cc-rust)] lowercase tracking-normal">
          req'd
        </span>
      )}
    </span>
    <div className="mt-1">{children}</div>
    {hint && (
      <p className="mt-2 cc-font-editorial italic text-sm text-[color:var(--cc-ink-soft)]">
        {hint}
      </p>
    )}
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
      <span className="text-[color:var(--cc-ash)] pb-3">{leading}</span>
    )}
    <input
      {...rest}
      className={`cc-input text-base md:text-[17px] ${className}`}
    />
  </div>
);

interface CraftTextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

export const CraftTextarea = ({ className = "", ...rest }: CraftTextareaProps) => (
  <textarea {...rest} className={`cc-textarea ${className}`} />
);

interface CraftSectionProps {
  kicker: string;
  title: ReactNode;
  sub?: ReactNode;
  right?: ReactNode;
  children: ReactNode;
}

/** Big editorial card with § kicker + display title. Used for each form section. */
export const CraftSection = ({
  kicker,
  title,
  sub,
  right,
  children,
}: CraftSectionProps) => (
  <section className="cc-card p-6 md:p-8">
    <header className="flex items-start justify-between gap-4 pb-5 border-b border-[color:var(--cc-hair-strong)]">
      <div>
        <div className="cc-label text-[color:var(--cc-rust)]">{kicker}</div>
        <h3 className="mt-2 cc-font-display text-2xl md:text-3xl leading-[1.02] tracking-tight">
          {title}
        </h3>
        {sub && (
          <p className="mt-2 cc-font-editorial italic text-[color:var(--cc-ink-soft)]">
            {sub}
          </p>
        )}
      </div>
      {right && <div className="flex-shrink-0">{right}</div>}
    </header>
    <div className="pt-6">{children}</div>
  </section>
);
