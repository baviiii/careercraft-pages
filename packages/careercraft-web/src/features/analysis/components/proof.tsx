/* Shared pieces for the ATS check page — see "ATS CHECK — the proof
   sheet" in styles/craft.css for the matching classes. */

import type { CSSProperties, ReactNode } from "react";
import { ArrowRight, Check } from "lucide-react";

import { useArmed } from "../hooks/useProofMotion";
import { toneFor, toneVar } from "../tone";

export const SegmentMeter = ({
  value,
  max,
  segments,
  label,
  className = "",
}: {
  value: number;
  max: number;
  segments: number;
  label: string;
  className?: string;
}) => {
  const armed = useArmed();
  const clamped = Math.max(0, Math.min(max, value));
  const lit = Math.round((clamped / max) * segments);
  return (
    <div
      className={`cc-meter ${className}`}
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={clamped}
      style={{ "--m": toneVar(toneFor((clamped / max) * 100)) } as CSSProperties}
    >
      {Array.from({ length: segments }, (_, i) => (
        <span
          key={i}
          className={armed && i < lit ? "is-on" : ""}
          style={{ transitionDelay: `${i * 30}ms` }}
        />
      ))}
    </div>
  );
};

export type MarkKind = "hit" | "insert" | "thin" | "cut" | "plain";

export const Mark = ({ kind, children }: { kind: MarkKind; children: ReactNode }) => (
  <span className={`cc-mark cc-mark--${kind}`}>{children}</span>
);

export const MarkList = ({
  items,
  kind,
  limit,
}: {
  items: string[];
  kind: MarkKind;
  limit?: number;
}) => {
  if (items.length === 0) return <Empty />;
  const shown = limit ? items.slice(0, limit) : items;
  return (
    <div className="flex flex-wrap gap-2">
      {shown.map((item, i) => (
        <Mark key={i} kind={kind}>
          {item}
        </Mark>
      ))}
      {limit && items.length > limit && (
        <span className="cc-mark !text-[color:var(--cc-ash)]">
          +{items.length - limit} more
        </span>
      )}
    </div>
  );
};

export const Empty = () => (
  <p className="text-[14px] text-[color:var(--cc-ash)]">None.</p>
);

export const Panel = ({
  title,
  count,
  footer,
  className = "",
  children,
}: {
  title: ReactNode;
  count?: number;
  footer?: ReactNode;
  className?: string;
  children: ReactNode;
}) => (
  <section className={`cc-surface p-6 md:p-7 ${className}`}>
    <header className="mb-4 flex items-baseline justify-between gap-4">
      <h3 className="cc-font-display text-[19px] leading-tight text-[color:var(--cc-ink)]">
        {title}
      </h3>
      {count !== undefined && (
        <span className="cc-metric text-[26px] !text-[color:var(--cc-ash)]">{count}</span>
      )}
    </header>
    {children}
    {footer && <div className="mt-5">{footer}</div>}
  </section>
);

export const SeeAll = ({ onClick, children }: { onClick: () => void; children: ReactNode }) => (
  <button
    onClick={onClick}
    className="group inline-flex items-center gap-1.5 text-[13px] font-semibold text-[color:var(--cc-rust)] hover:text-[color:var(--cc-rust-deep)]"
  >
    {children}
    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
  </button>
);

/** An issue and its fix. The issue is a description, not résumé text,
    so it isn't struck through. */
export const FixRow = ({ issue, fix }: { issue: string; fix: string }) => (
  <div className="grid gap-1.5">
    <p className="text-[14px] leading-snug text-[color:var(--cc-ink-soft)]">{issue}</p>
    <p className="flex gap-2 text-[15px] leading-snug text-[color:var(--cc-ink)]">
      <span aria-hidden className="font-bold text-[color:var(--pf-redpen)]">
        →
      </span>
      <span>{fix}</span>
    </p>
  </div>
);

/** "This input is filled" chip for the upload cards. */
export const Ready = ({ children }: { children: ReactNode }) => (
  <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[color:var(--cc-signal-soft)] px-2.5 py-1 text-[12px] font-semibold text-[color:var(--cc-signal-deep)]">
    <Check className="h-3 w-3" strokeWidth={3} />
    {children}
  </span>
);

/* A page being marked up — the loading state. Widths are % of the line. */
const SCAN_LINES: Array<{ w: number; kind?: "head" | "gap" | "hit" | "cut"; d?: number }> = [
  { w: 52, kind: "head" },
  { w: 34 },
  { w: 0, kind: "gap" },
  { w: 94, kind: "hit", d: 0 },
  { w: 86 },
  { w: 90 },
  { w: 72, kind: "cut", d: 0.9 },
  { w: 0, kind: "gap" },
  { w: 40, kind: "head" },
  { w: 88 },
  { w: 80, kind: "hit", d: 1.7 },
  { w: 92 },
  { w: 64 },
  { w: 0, kind: "gap" },
  { w: 85, kind: "hit", d: 2.5 },
  { w: 58 },
];

export const ProofScan = ({ size = "md" }: { size?: "sm" | "md" }) => (
  <div className={`cc-proof-scan ${size === "sm" ? "cc-proof-scan--sm" : ""}`} aria-hidden>
    {SCAN_LINES.map((l, i) => (
      <span
        key={i}
        className={`cc-proof-scan__line ${l.kind ? `cc-proof-scan__line--${l.kind}` : ""}`}
        style={{ width: `${l.w || 100}%`, "--d": `${l.d ?? 0}s` } as CSSProperties}
      />
    ))}
  </div>
);
