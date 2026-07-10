/* ───────────────────────────────────────────────────────────
   CareerCraft sidebar — grouped navigation, living accents,
   clear active state. Shared across logged-in pages.
   ─────────────────────────────────────────────────────────── */

import { memo, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Brain,
  Briefcase,
  FileText,
  Home,
  LogOut,
  MessageSquareText,
  Newspaper,
  Plus,
  Search,
  Settings,
  TrendingUp,
  X,
  Sparkles,
} from "lucide-react";

export interface CraftSidebarLink {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  path: string;
  group?: "home" | "craft" | "market" | "account";
}

export const CRAFT_SIDEBAR_LINKS: CraftSidebarLink[] = [
  { icon: Home, label: "Home", path: "/dashboard", group: "home" },
  { icon: FileText, label: "My Résumés", path: "/my-resumes", group: "craft" },
  { icon: Briefcase, label: "Job Tracker", path: "/tracker", group: "craft" },
  { icon: MessageSquareText, label: "Interview Prep", path: "/interview-prep", group: "craft" },
  { icon: Brain, label: "Career Coach", path: "/career-coach", group: "craft" },
  { icon: TrendingUp, label: "Career Insights", path: "/intelligence", group: "market" },
  { icon: Search, label: "Browse Jobs", path: "/au-jobs", group: "market" },
  { icon: Newspaper, label: "Market News", path: "/job-market-news", group: "market" },
  { icon: Settings, label: "Settings", path: "/settings", group: "account" },
];

const GROUPS: { id: CraftSidebarLink["group"]; label: string }[] = [
  { id: "home", label: "" },
  { id: "craft", label: "Craft" },
  { id: "market", label: "Market" },
  { id: "account", label: "Account" },
];

interface CraftSidebarProps {
  open: boolean;
  onClose: () => void;
  links?: CraftSidebarLink[];
  currentPath: string;
  userName: string;
  userEmail: string;
  onSignOut: () => void;
  navigate: (path: string) => void;
}

export const CraftSidebar = memo(function CraftSidebar({
  open,
  onClose,
  links = CRAFT_SIDEBAR_LINKS,
  currentPath,
  userName,
  userEmail,
  onSignOut,
  navigate,
}: CraftSidebarProps) {
  const initial = (userName || "·").charAt(0).toUpperCase();

  const grouped = useMemo(() => {
    return GROUPS.map((g) => ({
      ...g,
      items: links.filter((l) => (l.group || "craft") === g.id),
    })).filter((g) => g.items.length > 0);
  }, [links]);

  return (
    <aside
      className={`fixed top-0 left-0 z-50 h-full w-[272px] border-r border-[color:var(--cc-hair)] bg-[color:var(--cc-cream)] transform transition-transform duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)] lg:translate-x-0 ${
        open ? "translate-x-0" : "-translate-x-full"
      }`}
    >
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute -top-24 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full blur-3xl"
          style={{ background: "radial-gradient(circle, rgba(42,82,204,0.14), transparent 70%)" }}
        />
        <div
          className="absolute bottom-28 -left-16 h-44 w-44 rounded-full blur-3xl"
          style={{ background: "radial-gradient(circle, rgba(63,122,92,0.1), transparent 70%)" }}
        />
      </div>

      <div className="relative flex h-full flex-col px-3.5 py-5">
        {/* Brand */}
        <div className="mb-5 flex items-center justify-between px-1.5">
          <button
            onClick={() => {
              navigate("/");
              onClose();
            }}
            className="group flex items-center gap-3"
          >
            <div className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-2xl bg-[color:var(--cc-ink)] shadow-[0_10px_24px_-12px_rgba(20,22,26,0.55)] transition-transform duration-300 group-hover:scale-[1.04]">
              <span
                aria-hidden
                className="absolute inset-0 opacity-90"
                style={{
                  background:
                    "linear-gradient(135deg, rgba(42,82,204,0.6), transparent 55%), linear-gradient(225deg, rgba(63,122,92,0.4), transparent 50%)",
                }}
              />
              <span className="relative cc-font-display text-xl leading-none text-[color:var(--cc-cream)]">
                c
              </span>
            </div>
            <div className="text-left">
              <div className="cc-font-display text-[1.15rem] leading-none tracking-tight">
                CareerCraft
              </div>
              <div className="mt-1 flex items-center gap-1.5 text-[11px] text-[color:var(--cc-ash)]">
                <Sparkles className="h-3 w-3 text-[color:var(--cc-rust)]" />
                Atelier
              </div>
            </div>
          </button>
          <button
            className="rounded-xl p-2 text-[color:var(--cc-ash)] transition-colors hover:bg-[color:var(--cc-cream-2)] hover:text-[color:var(--cc-ink)] lg:hidden"
            onClick={onClose}
            aria-label="Close navigation"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Primary CTA */}
        <button
          onClick={() => {
            navigate("/builder");
            onClose();
          }}
          className="group mb-5 flex w-full items-center gap-3 overflow-hidden rounded-2xl border border-[color:var(--cc-rust)]/25 bg-[color:var(--cc-rust)] px-3.5 py-3 text-left shadow-[0_14px_28px_-16px_rgba(42,82,204,0.55)] transition-all hover:bg-[color:var(--cc-rust-deep)]"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/15 text-white transition-transform group-hover:scale-105">
            <Plus className="h-4 w-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-white">New résumé</span>
            <span className="block text-[11px] text-white/70">Builder · templates · PDF</span>
          </span>
        </button>

        {/* Nav groups */}
        <nav className="-mr-1 flex-1 overflow-y-auto pr-1">
          {grouped.map((group) => (
            <div key={group.id || "home"} className="mb-4 last:mb-0">
              {group.label ? (
                <div className="mb-1.5 px-2.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--cc-ash)]">
                  {group.label}
                </div>
              ) : null}
              <ul className="space-y-0.5">
                {group.items.map((l) => {
                  const active =
                    currentPath === l.path ||
                    (l.path !== "/dashboard" && currentPath.startsWith(l.path));
                  return (
                    <li key={l.path}>
                      <button
                        onClick={() => {
                          navigate(l.path);
                          onClose();
                        }}
                        className={`cc-nav-item ${active ? "is-active" : ""}`}
                      >
                        {active && (
                          <motion.span
                            layoutId="cc-side-glow"
                            className="absolute inset-y-1.5 left-1 w-1 rounded-full bg-[color:var(--cc-rust)]"
                            transition={{ type: "spring", stiffness: 380, damping: 32 }}
                          />
                        )}
                        <span className="cc-nav-item__icon relative">
                          <l.icon className="h-3.5 w-3.5" />
                        </span>
                        <span className="relative truncate">{l.label}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* User */}
        <div className="mt-3 rounded-2xl border border-[color:var(--cc-hair)] bg-gradient-to-br from-[color:var(--cc-cream-2)] to-[color:var(--cc-cream)] p-3">
          <div className="flex items-center gap-3">
            <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[color:var(--cc-ink)]">
              <span
                aria-hidden
                className="absolute inset-0"
                style={{
                  background:
                    "linear-gradient(145deg, rgba(42,82,204,0.75), transparent 55%), linear-gradient(320deg, rgba(63,122,92,0.55), transparent 50%)",
                }}
              />
              <span className="relative text-sm font-semibold text-white">{initial}</span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold text-[color:var(--cc-ink)]">
                {userName || "Guest"}
              </div>
              <div className="truncate text-[11px] text-[color:var(--cc-ash)]">{userEmail}</div>
            </div>
          </div>
          <button
            onClick={onSignOut}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-[color:var(--cc-hair-strong)] bg-[color:var(--cc-cream)]/90 px-3 py-2 text-xs font-medium text-[color:var(--cc-ink-soft)] transition-colors hover:border-[color:var(--cc-ink)] hover:text-[color:var(--cc-ink)]"
          >
            <LogOut className="h-3.5 w-3.5" /> Sign out
          </button>
        </div>
      </div>
    </aside>
  );
});
