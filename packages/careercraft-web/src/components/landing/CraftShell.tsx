import { memo, ReactNode, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, useScroll, useTransform, useMotionValueEvent } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import { ArrowUpRight } from "lucide-react";
import { FaircopyMark } from "@/components/brand/FaircopyMark";

/* ───────────────────────────────────────────────────────────
   Faircopy — shared shell (Nav + Footer).
   Used by public pages: /, /auth, /about, /contact, /privacy.
   ─────────────────────────────────────────────────────────── */

type NavVariant = "cream" | "ink";

interface CraftNavProps {
  variant?: NavVariant;
  session?: Session | null;
  hideAuthCtas?: boolean;
}

export const CraftNav = memo(({ variant = "cream", session = null, hideAuthCtas = false }: CraftNavProps) => {
  const navigate = useNavigate();
  const { scrollY } = useScroll();

  const bgFrom = variant === "cream" ? "rgba(248,250,252,0)" : "rgba(11,18,32,0)";
  const bgTo = variant === "cream" ? "rgba(248,250,252,0.92)" : "rgba(11,18,32,0.92)";
  const borderTo = variant === "cream" ? "rgba(15,23,42,0.14)" : "rgba(148,163,184,0.2)";
  const bg = useTransform(scrollY, [0, 90], [bgFrom, bgTo]);
  const border = useTransform(scrollY, [0, 90], ["rgba(0,0,0,0)", borderTo]);

  const textColor = variant === "cream" ? "var(--cc-ink)" : "var(--cc-cream)";
  const btnClasses =
    variant === "cream"
      ? "cc-btn cc-btn-primary"
      : "cc-btn cc-btn-onrust";

  return (
    <motion.nav
      style={{ backgroundColor: bg, borderBottomColor: border, color: textColor }}
      className="fixed top-0 left-0 right-0 z-50 backdrop-blur-sm border-b border-transparent"
    >
      <div className="max-w-[1400px] mx-auto px-6 md:px-10 h-16 flex items-center justify-between">
        <button onClick={() => navigate("/")} className="flex shrink-0 items-center gap-2.5" aria-label="Faircopy home">
          <FaircopyMark className="h-9 w-9 drop-shadow-[0_6px_14px_rgba(42,82,204,0.22)]" title="Faircopy" />
          {/* The wordmark is the first thing to go on a narrow screen. The mark
              alone still reads as Faircopy, and this row also has to fit the
              auth CTAs — which are the reason someone is here. The button keeps
              its aria-label, so the accessible name survives the text being
              hidden. Matches the auth header, which already does this. */}
          <span className="hidden sm:inline cc-font-display italic text-[22px] tracking-tight">Faircopy</span>
        </button>

        <div className="hidden md:flex items-center gap-10 cc-label">
          <a className="cc-link" href="/#toolkit" onClick={(e) => { e.preventDefault(); navigate("/#toolkit"); }}>Toolkit</a>
          <a className="cc-link" href="/about" onClick={(e) => { e.preventDefault(); navigate("/about"); }}>About</a>
          <a className="cc-link" href="/contact" onClick={(e) => { e.preventDefault(); navigate("/contact"); }}>Contact</a>
        </div>

        {!hideAuthCtas && (
          /* shrink-0 so the CTAs never get compressed into a wrapped,
             overlapping mess by a long brand block beside them. */
          <div className="flex shrink-0 items-center gap-3">
            {session ? (
              <button onClick={() => navigate("/dashboard")} className={btnClasses}>
                Dashboard <ArrowUpRight className="w-4 h-4 cc-arrow-up" />
              </button>
            ) : (
              <>
                <button
                  onClick={() => navigate("/auth")}
                  className="hidden sm:inline-flex cc-label px-2 py-3 cc-link"
                >
                  Sign&nbsp;in
                </button>
                <button onClick={() => navigate("/auth")} className={btnClasses}>
                  Get started <ArrowUpRight className="w-4 h-4 cc-arrow-up" />
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </motion.nav>
  );
});
CraftNav.displayName = "CraftNav";

/* Footer ---------------------------------------------------- */

export const CraftFooter = memo(() => {
  const navigate = useNavigate();
  return (
    <footer className="bg-[color:var(--ds-surface)] text-[color:var(--ds-fg)] border-t border-[color:var(--ds-border)]">
      <div className="max-w-[1400px] mx-auto px-6 md:px-10 pt-20 pb-10">
        <div className="grid grid-cols-12 gap-8 items-start">
          <div className="col-span-12 md:col-span-6">
            <div className="flex items-center gap-3">
              <FaircopyMark className="h-11 w-11" title="Faircopy" />
              <div>
                <div className="cc-font-display italic text-2xl leading-none">Faircopy</div>
                <p className="mt-2 text-[13px] tracking-wide text-[color:var(--ds-fg-muted)]">
                  One stop. Every step. Your career.
                </p>
              </div>
            </div>
            <p className="mt-6 cc-font-editorial text-xl text-[color:var(--ds-fg-muted)] leading-snug max-w-md">
              A workspace for your career — built in Adelaide.
            </p>
          </div>

          <div className="col-span-6 md:col-span-3">
            <div className="cc-label-sm text-[color:var(--ds-fg-muted)] mb-5">Product</div>
            <ul className="space-y-3 cc-font-editorial text-lg">
              <li><a onClick={(e) => { e.preventDefault(); navigate("/auth"); }} href="/auth" className="cc-link">Get started</a></li>
              <li><a onClick={(e) => { e.preventDefault(); navigate("/playground"); }} href="/playground" className="cc-link">Playground</a></li>
              <li><a onClick={(e) => { e.preventDefault(); navigate("/intelligence"); }} href="/intelligence" className="cc-link">Dashboard</a></li>
            </ul>
          </div>

          <div className="col-span-6 md:col-span-3">
            <div className="cc-label-sm text-[color:var(--ds-fg-muted)] mb-5">Company</div>
            <ul className="space-y-3 cc-font-editorial text-lg">
              <li><a onClick={(e) => { e.preventDefault(); navigate("/about"); }} href="/about" className="cc-link">About</a></li>
              <li><a onClick={(e) => { e.preventDefault(); navigate("/contact"); }} href="/contact" className="cc-link">Contact</a></li>
              <li><a onClick={(e) => { e.preventDefault(); navigate("/privacy"); }} href="/privacy" className="cc-link">Privacy</a></li>
              <li><a onClick={(e) => { e.preventDefault(); navigate("/terms"); }} href="/terms" className="cc-link">Terms</a></li>
            </ul>
          </div>
        </div>

        <div className="mt-16 pt-6 border-t border-[color:var(--ds-border)] flex flex-col md:flex-row items-center justify-between gap-3 cc-label-sm text-[color:var(--ds-fg-muted)]">
          <div>© 2026 Faircopy — Adelaide, SA</div>
          <div className="flex items-center gap-2">
            <span className="cc-blink text-[color:var(--cc-rust)]">●</span>
            <span>Live · Updated often</span>
          </div>
        </div>
      </div>
    </footer>
  );
});
CraftFooter.displayName = "CraftFooter";

/* Scroll progress rail ------------------------------------- */
/* A thin vertical rule in the right margin that fills with rust as the
   reader moves through the page. A tiny percentage label floats beside it. */
export const CraftScrollProgress = memo(() => {
  const { scrollYProgress } = useScroll();
  const [pct, setPct] = useState(0);

  useMotionValueEvent(scrollYProgress, "change", (v) => {
    const percent = Math.round(v * 100);
    document.documentElement.style.setProperty("--cc-progress", `${percent}%`);
    setPct(percent);
  });

  return (
    <>
      <div className="cc-progress-rail hidden md:block" aria-hidden="true" />
      <div className="cc-progress-label hidden md:block cc-label-sm">
        <span className="cc-tabular">{String(pct).padStart(2, "0")}</span>
        <span> / 100</span>
      </div>
    </>
  );
});
CraftScrollProgress.displayName = "CraftScrollProgress";

/* Fleuron separator — a flanked ornament, centered, used between sections */
export const CraftFleuron = memo(({ mark = "✻" }: { mark?: string }) => (
  <div className="cc-fleuron">
    <span className="cc-fleuron-mark">{mark}</span>
  </div>
));
CraftFleuron.displayName = "CraftFleuron";

/* Shell — convenience wrapper for simple content pages ------- */

interface CraftPageShellProps {
  children: ReactNode;
  navVariant?: NavVariant;
}

export const CraftPageShell = ({ children, navVariant = "cream" }: CraftPageShellProps) => {
  const [session, setSession] = useState<Session | null>(null);
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => setSession(s));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  return (
    <main className="cc-root ds-shell cc-font-sans min-h-screen overflow-x-hidden antialiased">
      <CraftNav variant={navVariant} session={session} />
      {children}
      <CraftFooter />
    </main>
  );
};

/* Reusable section header --------------------------------- */

interface CraftSectionHeadProps {
  section: string; // e.g. "§ 01 · The Ledger"
  title: ReactNode;
  sub?: ReactNode;
  align?: "left" | "center";
}

export const CraftSectionHead = ({ section, title, sub, align = "left" }: CraftSectionHeadProps) => (
  <div className={align === "center" ? "max-w-2xl mx-auto text-center" : "max-w-2xl"}>
    <div className="cc-label text-[color:var(--cc-rust)]">{section}</div>
    <h2 className="mt-4 cc-font-display text-4xl md:text-6xl leading-[0.95] tracking-tight text-[color:var(--cc-ink)]">
      {title}
    </h2>
    {sub && <p className="mt-6 cc-font-editorial text-xl text-[color:var(--cc-ink-soft)]">{sub}</p>}
  </div>
);
