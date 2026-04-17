/* ───────────────────────────────────────────────────────────
   CareerCraft — editorial primitives for the logged-in app.
   Thin, opinionated wrappers over shadcn / raw JSX so toolkit
   pages can stay skinny (just layout + logic).
   ─────────────────────────────────────────────────────────── */

import { memo, ReactNode, useEffect, useRef, useState } from "react";
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

/* ─────────────────────────── AppShell ────────────────────────── */

interface CraftAppShellProps {
  children: ReactNode;
  /** Optional extra classes on <main>. */
  className?: string;
}

/**
 * Cream background + grain, antialiased, the root wrapper for every
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
      <div className="cc-grain pointer-events-none fixed inset-0 z-0" />
      <div className="relative z-10">{children}</div>
    </main>
  );
});

/* ─────────────────────────── AppHeader ──────────────────────── */

interface CraftAppHeaderProps {
  kicker: string; // e.g. "§ 01 · Cabinet"
  title: ReactNode; // Fraunces-set page title
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
  backLabel = "Back to the atelier",
  rightSlot,
}: CraftAppHeaderProps) {
  const navigate = useNavigate();

  return (
    <>
      {/* Thin sticky bar — only back + CTA; never eats more than ~56px of viewport */}
      <div className="sticky top-0 z-30 bg-[color:var(--cc-cream)]/85 backdrop-blur-md border-b border-[color:var(--cc-hair)]">
        <div className="max-w-[1400px] mx-auto px-6 md:px-10 h-14 flex items-center justify-between gap-4">
          <button
            onClick={() => navigate(backTo)}
            className="inline-flex items-center gap-2 cc-label text-[color:var(--cc-ink)] cc-link"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">{backLabel}</span>
          </button>

          <div className="flex items-center gap-3">
            {rightSlot}
            {ctaLabel && onCta && (
              <button
                onClick={onCta}
                className="cc-btn cc-btn-primary"
                style={{ padding: "0.6rem 1rem" }}
              >
                <span className="hidden sm:inline">{ctaLabel}</span>
                <ArrowUpRight className="w-4 h-4 cc-arrow-up" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Editorial masthead — scrolls away naturally so reading space isn't pinched */}
      <header className="max-w-[1400px] mx-auto px-6 md:px-10 pt-8 md:pt-10 pb-10 md:pb-12">
        <div className="cc-label text-[color:var(--cc-rust)]">{kicker}</div>
        <h1 className="mt-4 cc-font-display text-4xl md:text-6xl lg:text-7xl leading-[0.92] tracking-tight">
          {title}
        </h1>
        {sub && (
          <p className="mt-6 cc-font-editorial text-xl md:text-2xl leading-[1.35] text-[color:var(--cc-ink-soft)] max-w-2xl">
            {sub}
          </p>
        )}
      </header>
    </>
  );
});

/* ─────────────────────────── Page frame ─────────────────────── */

interface CraftAppBodyProps {
  children: ReactNode;
  className?: string;
}

/** Constrained content wrapper; 1400px max, editorial padding. */
export const CraftAppBody = ({ children, className = "" }: CraftAppBodyProps) => (
  <div className={`max-w-[1400px] mx-auto px-6 md:px-10 py-10 md:py-12 ${className}`}>
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
  kicker?: string; // § label
  title: ReactNode;
  body?: ReactNode;
  ctaLabel?: string;
  onCta?: () => void;
}

export const CraftEmpty = ({
  kicker = "§ Empty cabinet",
  title,
  body,
  ctaLabel,
  onCta,
}: CraftEmptyProps) => (
  <div className="border-2 border-[color:var(--cc-ink)] bg-[color:var(--cc-cream)] p-12 md:p-16 text-center">
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
      <button
        onClick={onCta}
        className="mt-10 cc-btn cc-btn-primary"
      >
        {ctaLabel}
        <ArrowUpRight className="w-4 h-4 cc-arrow-up" />
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
  kicker?: string; // § label
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
      className={`cc-root ${maxWidth} w-[95vw] gap-0 p-0 border-2 border-[color:var(--cc-ink)] bg-[color:var(--cc-cream)] text-[color:var(--cc-ink)] rounded-none shadow-[0_20px_60px_-20px_rgba(14,12,10,0.35)]`}
    >
      <DialogHeader className="p-7 md:p-8 pb-5 space-y-3 text-left">
        {kicker && (
          <div className="cc-label text-[color:var(--cc-rust)]">{kicker}</div>
        )}
        <DialogTitle className="cc-font-display text-3xl md:text-4xl leading-[1] tracking-tight text-[color:var(--cc-ink)]">
          {title}
        </DialogTitle>
        {description && (
          <DialogDescription className="cc-font-editorial text-lg leading-snug text-[color:var(--cc-ink-soft)]">
            {description}
          </DialogDescription>
        )}
      </DialogHeader>

      {children && (
        <div className="px-7 md:px-8 pb-6 cc-font-sans text-[color:var(--cc-ink)]">
          {children}
        </div>
      )}

      {footer && (
        <DialogFooter className="p-6 md:p-7 border-t border-[color:var(--cc-hair-strong)] bg-[color:var(--cc-cream-2)] sm:justify-end gap-3 flex-col-reverse sm:flex-row">
          {footer}
        </DialogFooter>
      )}
    </DialogContent>
  </Dialog>
);

/* ─────────────────────────── Ink button ─────────────────────── */

interface CraftButtonProps {
  children: ReactNode;
  onClick?: (e: React.MouseEvent) => void;
  variant?: "primary" | "ghost" | "danger";
  type?: "button" | "submit";
  disabled?: boolean;
  className?: string;
  size?: "sm" | "md";
}

/** Thin convenience wrapper — picks cc-btn variants so pages don't inline. */
export const CraftButton = ({
  children,
  onClick,
  variant = "primary",
  type = "button",
  disabled,
  className = "",
  size = "md",
}: CraftButtonProps) => {
  const base = "cc-btn";
  const v =
    variant === "primary"
      ? "cc-btn-primary"
      : variant === "danger"
      ? "cc-btn-danger"
      : "cc-btn-ghost";
  const padding =
    size === "sm" ? { padding: "0.65rem 0.95rem" } : { padding: "1rem 1.3rem" };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${v} ${className}`}
      style={padding}
    >
      {children}
    </button>
  );
};

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
