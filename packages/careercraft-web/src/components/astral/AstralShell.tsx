/* ───────────────────────────────────────────────────────────
   AstralShell — the observatory chrome.
   - void background + drifting nebula + starfield + grid
   - cursor parallax (mousemove → CSS vars --as-mx / --as-my)
   - floating left vertical nav rail (Intelligence surfaces)
   - floating top bar with back-to-dashboard + title + actions
   - reactive hover refraction via --as-hx / --as-hy vars
   ─────────────────────────────────────────────────────────── */

import { memo, ReactNode, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";
import {
  ArrowLeft,
  Compass,
  LayoutDashboard,
  LogOut,
  MessageSquareText,
  Orbit,
  Radio,
  Satellite,
  Settings as SettingsIcon,
  Sparkles,
  TrendingUp,
} from "lucide-react";

import { AstralStarfield } from "./AstralStarfield";

/* ─────────────────────────── Rail ─────────────────────────── */

interface RailLink {
  icon: React.ElementType;
  label: string;
  path: string;
}

const RAIL_LINKS: RailLink[] = [
  { icon: Orbit,             label: "Overview",        path: "/intelligence" },
  { icon: MessageSquareText, label: "Career Coach",    path: "/career-coach" },
  { icon: Compass,           label: "Career Explorer", path: "/career-explorer" },
  { icon: TrendingUp,        label: "Market Trends",   path: "/market-trends" },
  { icon: Satellite,         label: "Policy",          path: "/policy" },
];

const AstralRail = memo(function AstralRail({ onSignOut }: { onSignOut: () => void }) {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (p: string) => location.pathname === p || location.pathname.startsWith(p + "/");

  return (
    <aside
      className="fixed left-4 top-1/2 -translate-y-1/2 z-40 hidden lg:flex flex-col items-center gap-2 px-2 py-4 rounded-3xl"
      style={{
        background: "var(--cc-cream)",
        backdropFilter: "blur(20px) saturate(140%)",
        border: "1px solid var(--as-hair-strong)",
        boxShadow: "0 18px 40px -28px rgba(20,22,26,0.35)",
      }}
    >
      {/* Logo mark */}
      <button
        onClick={() => navigate("/dashboard")}
        title="Back to dashboard"
        className="relative w-11 h-11 rounded-2xl flex items-center justify-center group"
        style={{
          background: "var(--cc-rust)",
          border: "1px solid var(--cc-rust-deep)",
        }}
      >
        <Sparkles className="w-5 h-5 text-white" />
        <span className="absolute -right-1 -bottom-1 as-pulse" aria-hidden="true" />
      </button>

      <div className="w-8 as-rule my-2" />

      {/* Primary nav */}
      <nav className="flex flex-col gap-1">
        {RAIL_LINKS.map((link) => {
          const Icon = link.icon;
          const active = isActive(link.path);
          return (
            <RailButton
              key={link.path}
              label={link.label}
              active={active}
              onClick={() => navigate(link.path)}
            >
              <Icon className="w-[18px] h-[18px]" />
            </RailButton>
          );
        })}
      </nav>

      <div className="w-8 as-rule my-2" />

      <RailButton label="Dashboard" onClick={() => navigate("/dashboard")}>
        <LayoutDashboard className="w-[18px] h-[18px]" />
      </RailButton>
      <RailButton label="Settings" onClick={() => navigate("/settings")}>
        <SettingsIcon className="w-[18px] h-[18px]" />
      </RailButton>
      <RailButton label="Sign out" onClick={onSignOut}>
        <LogOut className="w-[18px] h-[18px]" />
      </RailButton>
    </aside>
  );
});

/* Rail button with CSS-only hover tooltip. */
const RailButton = memo(function RailButton({
  label,
  active = false,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="group/rail relative w-11 h-11 rounded-xl flex items-center justify-center transition-colors"
      style={{
        background: active ? "var(--cc-rust-soft)" : "transparent",
        border: active ? "1px solid var(--cc-hair-strong)" : "1px solid transparent",
        color: active ? "var(--cc-rust)" : "var(--as-mist)",
      }}
    >
      <span className="transition-colors">{children}</span>

      {active && (
        <span
          className="absolute -left-2 top-1/2 -translate-y-1/2 w-1 h-5 rounded-full"
          style={{ background: "linear-gradient(180deg, var(--as-aurora-1), var(--as-aurora-2))" }}
          aria-hidden="true"
        />
      )}

      {/* Hover tooltip — revealed via group-hover */}
      <span
        role="tooltip"
        className="pointer-events-none absolute left-full ml-3 whitespace-nowrap px-2.5 py-1 rounded-md opacity-0 -translate-x-2 group-hover/rail:opacity-100 group-hover/rail:translate-x-0 transition-all duration-200 as-label-sm text-[10px] z-50"
        style={{
          background: "var(--cc-ink)",
          border: "1px solid var(--cc-ink)",
          color: "var(--cc-cream)",
          boxShadow: "0 8px 20px -12px rgba(20,22,26,0.5)",
        }}
      >
        {label}
      </span>
    </button>
  );
});

/* ─────────────────────────── Topbar ─────────────────────────── */

interface AstralTopbarProps {
  title?: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  backTo?: string;
  liveBadge?: boolean;
}

const AstralTopbar = memo(function AstralTopbar({
  title,
  subtitle,
  actions,
  backTo = "/dashboard",
  /* Was `true`. Nothing ever passed it, so the badge was effectively a
     decoration that always claimed a live feed. Fail quiet instead. */
  liveBadge = false,
}: AstralTopbarProps) {
  const navigate = useNavigate();

  /* A live UTC clock used to tick here, once a second, forever. It told the
     reader nothing — the corpus is a set of published documents, not a feed,
     and no figure on this page is timestamped to the second. It existed to
     make the surface feel like a mission console. Removed with the rest of
     the set dressing; the "updated N ago" line under the title is the only
     time signal that means anything. */

  return (
    <header
      className="fixed top-4 left-4 right-4 lg:left-24 lg:right-6 z-40 rounded-2xl"
      style={{
        background: "var(--cc-cream)",
        backdropFilter: "blur(22px) saturate(140%)",
        border: "1px solid var(--as-hair-strong)",
        boxShadow: "0 18px 40px -28px rgba(20,22,26,0.35)",
      }}
    >
      <div className="flex items-center gap-4 px-5 py-3">
        <button
          onClick={() => navigate(backTo)}
          className="as-btn"
          style={{ padding: "0.55rem 0.9rem" }}
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Exit</span>
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {/* "Signal active" was hardcoded and `liveBadge` defaulted to
                true with no caller ever setting it, so a pulsing "Live" ran
                permanently — including through the months the archive was
                unreachable and every figure on the page read zero. Both now
                follow the real connection state. */}
            <div className="as-label-sm" style={{ color: "var(--as-aurora-2)" }}>
              § Observatory · {liveBadge ? "Signal active" : "No signal"}
            </div>
            {liveBadge && (
              <div className="inline-flex items-center gap-2">
                <span className="as-pulse" aria-hidden="true" />
                <span className="as-label-sm" style={{ color: "var(--as-signal)" }}>
                  Live
                </span>
              </div>
            )}
          </div>
          <div className="mt-1 flex items-baseline gap-3 min-w-0">
            <h1 className="as-display text-xl md:text-2xl leading-none truncate">
              {title ?? <span className="as-gradient-text">Intelligence</span>}
            </h1>
            {subtitle && (
              <div className="as-label truncate hidden md:block">
                {subtitle}
              </div>
            )}
          </div>
        </div>

        <div className="hidden md:flex items-center gap-3">{actions}</div>

        {/* Mobile actions — compact */}
        <div className="md:hidden flex items-center gap-2">{actions}</div>
      </div>

      {subtitle && (
        <div className="md:hidden px-5 pb-3 as-label-sm truncate">
          {subtitle}
        </div>
      )}
    </header>
  );
});

/* ─────────────────────────── Shell ─────────────────────────── */

interface AstralShellProps {
  children: ReactNode;
  title?: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  backTo?: string;
  /**
   * Whether the data feed behind this page is genuinely live.
   *
   * Drives the "Signal active / Live" badge in the topbar and the receiving
   * indicator in the corner. Defaults to false: a page that has not told us
   * it has data must not claim a live feed, which is precisely how the
   * Observatory spent months pulsing "Receiving" over a corpus of zero.
   */
  liveBadge?: boolean;
  /** Optional extra class on the content <main>. */
  className?: string;
}

export const AstralShell = memo(function AstralShell({
  children,
  title,
  subtitle,
  actions,
  backTo,
  liveBadge = false,
  className = "",
}: AstralShellProps) {
  const navigate = useNavigate();
  const rootRef = useRef<HTMLDivElement>(null);

  // Auth guard + sign-out
  const [, setSession] = useState<Session | null>(null);
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (!session) navigate("/auth");
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      if (!s) navigate("/auth");
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error("Sign out failed:", err);
    }
    navigate("/auth");
  };

  // Global cursor parallax → --as-mx / --as-my on <html>
  useEffect(() => {
    let tx = 0, ty = 0, cx = 0, cy = 0;
    let raf = 0;

    const onMove = (e: MouseEvent) => {
      tx = (e.clientX / window.innerWidth - 0.5) * 2;
      ty = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    const tick = () => {
      cx += (tx - cx) * 0.08;
      cy += (ty - cy) * 0.08;
      document.documentElement.style.setProperty("--as-mx", cx.toFixed(4));
      document.documentElement.style.setProperty("--as-my", cy.toFixed(4));
      raf = requestAnimationFrame(tick);
    };

    window.addEventListener("mousemove", onMove);
    raf = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(raf);
      document.documentElement.style.removeProperty("--as-mx");
      document.documentElement.style.removeProperty("--as-my");
    };
  }, []);

  return (
    <div
      ref={rootRef}
      className="as-root min-h-screen relative overflow-hidden"
      style={{ background: "var(--as-void)" }}
    >
      {/* Ambient layers */}
      <div className="as-nebula" />
      <AstralStarfield />
      <div className="as-grid" />
      <div className="as-vignette" />

      {/* Chrome */}
      <AstralRail onSignOut={signOut} />
      <AstralTopbar title={title} subtitle={subtitle} actions={actions} backTo={backTo} liveBadge={liveBadge} />

      {/* Content */}
      <main
        className={`relative z-10 pt-28 pb-20 px-4 md:px-6 lg:pl-24 lg:pr-8 ${className}`}
      >
        <div className="max-w-[1440px] mx-auto">{children}</div>
      </main>

      {/* A floating "Receiving · SA Gov archive" pill with a radio icon and a
          pulse used to sit in the bottom-right corner on every view. It
          duplicated the connection state already shown in the topbar, in a
          more emphatic way, while covering page content at that corner.
          Deleted — the topbar is the one place that reports connection. */}
    </div>
  );
});
