/* ───────────────────────────────────────────────────────────
   Faircopy — editorial primitives for the logged-in app.
   Thin, opinionated wrappers over shadcn / raw JSX so toolkit
   pages can stay skinny (just layout + logic).
   ─────────────────────────────────────────────────────────── */

import { memo, ReactNode, type HTMLAttributes, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, useInView } from "framer-motion";
import { ArrowLeft, ArrowUpRight } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { CraftGround } from "./CraftGround";

/* ─────────────────────────── AppShell ────────────────────────── */

interface CraftAppShellProps {
  children: ReactNode;
  /** Optional extra classes on <main>. */
  className?: string;
}

/**
 * Paper ground (CraftGround), antialiased, the root wrapper for every
 * logged-in toolkit page (MyResumes, ResumeBuilder, Analysis, JobTracker, …).
 * Matches `CraftPageShell` in feel, but skips the public-nav + footer.
 */
export const CraftAppShell = memo(function CraftAppShell({
  children,
  className = "",
}: CraftAppShellProps) {
  return (
    <main
      className={`cc-root cc-font-sans min-h-screen bg-[color:var(--cc-cream)] text-[color:var(--cc-ink)] antialiased ${className}`}
    >
      <CraftGround />
      <div className="relative z-10">{children}</div>
    </main>
  );
});

/* ─────────────────────────── AppHeader ──────────────────────── */

interface CraftAppHeaderProps {
  kicker?: string; // e.g. "§ 01 · Cabinet"
  /** Page title. Leave out for a bar-only header (the page leads with its own hero). */
  title?: ReactNode;
  sub?: ReactNode;
  /** Text for the primary CTA shown at the top-right. */
  ctaLabel?: string;
  onCta?: () => void;
  /** Where the back-button goes. Defaults to /dashboard. */
  backTo?: string;
  backLabel?: string;
  /** Extra nodes to the right of the CTA (filters, toggles, etc.). */
  rightSlot?: ReactNode;
}

export const CraftAppHeader = memo(function CraftAppHeader({
  kicker,
  title,
  sub,
  ctaLabel,
  onCta,
  backTo = "/dashboard",
  backLabel = "Back to dashboard",
  rightSlot,
}: CraftAppHeaderProps) {
  const navigate = useNavigate();

  return (
    <>
      {/* Thin sticky bar — only back + CTA; never eats more than ~56px of viewport */}
      <div className="cc-bar sticky top-0 z-30">
        <div className="max-w-[1400px] mx-auto px-6 md:px-10 h-14 flex items-center justify-between gap-4">
          <button
            onClick={() => navigate(backTo)}
            aria-label={backLabel}
            className="inline-flex items-center gap-2 rounded-full px-2 py-1 -ml-2 cc-font-sans text-[14px] font-medium text-[color:var(--cc-ink-soft)] transition-colors hover:bg-[color:var(--cc-cream-2)] hover:text-[color:var(--cc-ink)]"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">{backLabel}</span>
          </button>

          <div className="flex items-center gap-3">
            {rightSlot}
            {ctaLabel && onCta && (
              <button type="button" onClick={onCta} aria-label={ctaLabel} className="cc-action cc-action--sm">
                <span className="hidden sm:inline">{ctaLabel}</span>
                <ArrowUpRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Editorial masthead — scrolls away naturally so reading space isn't pinched */}
      {title && (
        <header className="max-w-[1400px] mx-auto px-6 md:px-10 pt-8 md:pt-10 pb-8">
          {kicker && <div className="cc-kicker">{kicker}</div>}
          <h1 className="mt-3 cc-font-display text-4xl md:text-5xl leading-[0.95] tracking-tight">
            {title}
          </h1>
          {sub && (
            <p className="mt-3 cc-font-sans text-base md:text-lg text-[color:var(--cc-ink-soft)] max-w-2xl">
              {sub}
            </p>
          )}
        </header>
      )}
    </>
  );
});

/* ─────────────────────────── Page frame ─────────────────────── */

interface CraftAppBodyProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

/** Constrained content wrapper; 1400px max, editorial padding. */
export const CraftAppBody = ({ children, className = "", ...rest }: CraftAppBodyProps) => (
  <div className={`max-w-[1400px] mx-auto px-6 md:px-10 py-10 md:py-12 ${className}`} {...rest}>
    {children}
  </div>
);

/* ─────────────────────────── Stats strip ─────────────────────── */

export interface CraftStat {
  label: string;
  value: number | string;
  /** Small italic caption below the value. */
  note?: string;
  /** If supplied, the whole plate becomes a button. */
  onClick?: () => void;
}

interface CraftAppStatsProps {
  stats: CraftStat[];
  /** Animate numeric values with a count-up (ints only). Default: true. */
  countUp?: boolean;
}

export const CraftAppStats = ({ stats, countUp = true }: CraftAppStatsProps) => {
  const romans = ["i.", "ii.", "iii.", "iv.", "v.", "vi."];
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-[color:var(--cc-hair-strong)] border border-[color:var(--cc-hair-strong)]">
      {stats.map((s, i) => {
        const Comp = (s.onClick ? "button" : "div") as any;
        return (
          <Comp
            key={s.label}
            onClick={s.onClick}
            className={`bg-[color:var(--cc-cream)] p-6 md:p-8 text-left group ${
              s.onClick
                ? "hover:bg-[color:var(--cc-cream-2)] transition-colors"
                : ""
            }`}
          >
            <div className="cc-font-display italic text-2xl text-[color:var(--cc-rust)] leading-none">
              {romans[i] || `${i + 1}.`}
            </div>
            <div className="mt-6">
              <StatValue value={s.value} countUp={countUp} delay={i * 80} />
              <div className="mt-3 cc-label text-[color:var(--cc-ink)]">{s.label}</div>
              {s.note && (
                <div className="mt-1 cc-font-editorial italic text-[15px] text-[color:var(--cc-ink-soft)]">
                  {s.note}
                </div>
              )}
            </div>
          </Comp>
        );
      })}
    </div>
  );
};

const StatValue = ({
  value,
  countUp,
  delay,
}: {
  value: number | string;
  countUp: boolean;
  delay: number;
}) => {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-20%" });
  const isNumber = typeof value === "number";
  const [n, setN] = useState(isNumber && countUp ? 0 : value);

  useEffect(() => {
    if (!isNumber || !countUp || !inView) return;
    const to = value as number;
    const start = performance.now() + delay;
    const dur = 900;
    let raf = 0;
    const tick = (now: number) => {
      if (now < start) {
        raf = requestAnimationFrame(tick);
        return;
      }
      const t = Math.min((now - start) / dur, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setN(Math.round(to * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isNumber, countUp, inView, value, delay]);

  return (
    <span
      ref={ref}
      className="cc-font-display text-5xl md:text-6xl leading-none tracking-tight cc-tabular text-[color:var(--cc-ink)] block"
    >
      {isNumber ? String(n).padStart(2, "0") : value}
    </span>
  );
};

/* ─────────────────────────── Empty state ─────────────────────── */

interface CraftEmptyProps {
  kicker?: string;
  title: ReactNode;
  body?: ReactNode;
  ctaLabel?: string;
  onCta?: () => void;
}

export const CraftEmpty = ({
  kicker = "Nothing here yet",
  title,
  body,
  ctaLabel,
  onCta,
}: CraftEmptyProps) => (
  <div className="ds-panel p-12 md:p-16 text-center">
    <div className="cc-label text-[color:var(--cc-rust)]">{kicker}</div>
    <h2 className="mt-5 cc-font-display text-3xl md:text-5xl leading-[0.95] tracking-tight">
      {title}
    </h2>
    {body && (
      <p className="mt-6 cc-font-editorial text-xl text-[color:var(--cc-ink-soft)] max-w-xl mx-auto">
        {body}
      </p>
    )}
    {ctaLabel && onCta && (
      <button type="button" onClick={onCta} className="mt-8 cc-action">
        {ctaLabel}
        <ArrowUpRight className="h-4 w-4" />
      </button>
    )}
  </div>
);

/* ─────────────────────────── Section head ────────────────────── */

interface CraftAppSectionProps {
  kicker: string;
  title: ReactNode;
  sub?: ReactNode;
  right?: ReactNode;
  children?: ReactNode;
}

/** Lightweight section header for within a toolkit page. */
export const CraftAppSection = ({
  kicker,
  title,
  sub,
  right,
  children,
}: CraftAppSectionProps) => (
  <section className="mt-12 md:mt-16">
    <div className="flex items-end justify-between gap-6 border-b border-[color:var(--cc-hair-strong)] pb-6 mb-8">
      <div>
        <div className="cc-label text-[color:var(--cc-rust)]">{kicker}</div>
        <h2 className="mt-3 cc-font-display text-2xl md:text-4xl leading-[0.95] tracking-tight">
          {title}
        </h2>
        {sub && (
          <p className="mt-3 cc-font-editorial text-lg text-[color:var(--cc-ink-soft)] max-w-xl">
            {sub}
          </p>
        )}
      </div>
      {right && <div className="flex-shrink-0">{right}</div>}
    </div>
    {children}
  </section>
);

/* ─────────────────────────── Dialog ──────────────────────────── */

interface CraftDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kicker?: string;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  /** Width class, e.g. "max-w-md" (default) or "max-w-2xl". */
  maxWidth?: string;
}

/**
 * Editorial dialog: ink border, cream body, Fraunces title, § kicker.
 * Uses shadcn Dialog primitives under the hood so a11y/focus/overlay are free.
 */
export const CraftDialog = ({
  open,
  onOpenChange,
  kicker,
  title,
  description,
  children,
  footer,
  maxWidth = "max-w-md",
}: CraftDialogProps) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent
      className={`cc-root ds-surface ${maxWidth} w-[95vw] max-h-[min(90vh,920px)] gap-0 p-0 flex flex-col overflow-hidden text-[color:var(--cc-ink)] rounded-2xl shadow-[0_20px_60px_-20px_rgba(14,12,10,0.35)]`}
    >
      <DialogHeader className="px-6 md:px-8 pt-6 md:pt-7 pb-4 md:pb-5 space-y-2.5 text-left flex-shrink-0 border-b border-[color:var(--cc-hair)]">
        {kicker && (
          <div className="cc-label text-[color:var(--cc-rust)]">{kicker}</div>
        )}
        <DialogTitle className="cc-font-display text-2xl md:text-3xl leading-[1.05] tracking-tight text-[color:var(--cc-ink)]">
          {title}
        </DialogTitle>
        {description && (
          <DialogDescription className="cc-font-editorial text-base md:text-lg leading-snug text-[color:var(--cc-ink-soft)]">
            {description}
          </DialogDescription>
        )}
      </DialogHeader>

      {children && (
        <div className="px-6 md:px-8 py-5 md:py-6 cc-font-sans text-[color:var(--cc-ink)] flex-1 overflow-y-auto min-h-0 overscroll-contain">
          {children}
        </div>
      )}

      {footer && (
        <DialogFooter className="p-5 md:p-6 border-t border-[color:var(--cc-hair-strong)] bg-[color:var(--cc-cream-2)] sm:justify-end gap-3 flex-col-reverse sm:flex-row flex-shrink-0 rounded-b-2xl">
          {footer}
        </DialogFooter>
      )}
    </DialogContent>
  </Dialog>
);

/* ─────────────────────────── Button ─────────────────────────── */

interface CraftButtonProps {
  children: ReactNode;
  onClick?: (e: React.MouseEvent) => void;
  variant?: "primary" | "ghost" | "danger";
  type?: "button" | "submit";
  disabled?: boolean;
  className?: string;
  size?: "sm" | "md";
}

/**
 * The app's button: a cobalt pill in Inter, sentence case. It used to add
 * ds-btn / ds-btn-primary, and design-system.css (loaded after craft.css)
 * painted those as a purple-to-cyan gradient with spaced mono capitals, the
 * Stripe-era look, in every dialog. Now it's the cc-action pill the board,
 * Browse Jobs and the homepage use.
 */
const VARIANT: Record<NonNullable<CraftButtonProps["variant"]>, string> = {
  primary: "",
  ghost: "cc-action--ghost",
  danger: "cc-action--danger",
};

export const CraftButton = ({
  children,
  onClick,
  variant = "primary",
  type = "button",
  disabled,
  className = "",
  size = "md",
}: CraftButtonProps) => (
  <button
    type={type}
    onClick={onClick}
    disabled={disabled}
    className={`cc-action ${size === "sm" ? "cc-action--sm" : ""} ${VARIANT[variant]} ${className}`}
  >
    {children}
  </button>
);

/* ─────────────────────────── Row animator ────────────────────── */

/** Thin wrapper that fades+slides children into view once. */
export const FadeIn = ({
  children,
  delay = 0,
  y = 10,
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
}) => (
  <motion.div
    initial={{ opacity: 0, y }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: "-10%" }}
    transition={{ delay, duration: 0.5 }}
  >
    {children}
  </motion.div>
);
