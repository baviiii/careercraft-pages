/* ───────────────────────────────────────────────────────────
   Faircopy sidebar — the page's margin. Grouped navigation, the
   current page marked with a highlighter stroke. Shared across
   logged-in pages. Styles: "APP CHROME" in styles/craft.css.
   ─────────────────────────────────────────────────────────── */

import { memo, useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  BarChart3,
  Brain,
  Briefcase,
  FileText,
  Home,
  LogOut,
  PenLine,
  MessageSquareText,
  Newspaper,
  Plus,
  Search,
  Settings,
  TrendingUp,
  X,
} from "lucide-react";
import { FaircopyMark } from "@/components/brand/FaircopyMark";

export interface CraftSidebarLink {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  path: string;
  group?: "home" | "craft" | "market" | "account";
}

/*
 * Two core tools were missing from this list and had no other permanent way in.
 *
 * `/analysis` (the ATS check) appeared in exactly one place: the dashboard's
 * `featuredMoves`, and only in the branch that runs when a profile is NOT
 * personalized. Completing onboarding therefore *removed* the only link to it,
 * so for any established user the feature was unreachable except by typing the
 * URL. It reads as the feature having been deleted, which is what happened
 * from the user's side.
 *
 * `/builder` had the same shape — present in both dashboard branches, but
 * nowhere permanent. "My Résumés" is a library, not a way to start one.
 *
 * A tool that a finished profile hides is worse than one never shipped: the
 * user saw it once. Both live here now, where they cannot be hidden by state.
 */
export const CRAFT_SIDEBAR_LINKS: CraftSidebarLink[] = [
  { icon: Home, label: "Home", path: "/dashboard", group: "home" },
  { icon: PenLine, label: "Résumé Builder", path: "/builder", group: "craft" },
  { icon: FileText, label: "My Résumés", path: "/my-resumes", group: "craft" },
  { icon: BarChart3, label: "ATS Check", path: "/analysis", group: "craft" },
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
  const reduce = useReducedMotion();

  const grouped = useMemo(() => {
    return GROUPS.map((g) => ({
      ...g,
      items: links.filter((l) => (l.group || "craft") === g.id),
    })).filter((g) => g.items.length > 0);
  }, [links]);

  return (
    <aside
      className={`cc-side fixed top-0 left-0 z-50 h-full w-[272px] transform transition-transform duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)] lg:translate-x-0 ${
        open ? "translate-x-0" : "-translate-x-full"
      }`}
    >
      <div className="relative flex h-full flex-col px-3.5 py-5">
        {/* Brand */}
        <div className="mb-6 flex items-center justify-between px-1.5">
          <button
            onClick={() => {
              navigate("/");
              onClose();
            }}
            className="group flex items-center gap-3"
          >
            <span className="cc-side__logo h-10 w-10">
              <FaircopyMark className="h-7 w-7" title="Faircopy" />
            </span>
            <span className="cc-font-display text-[1.2rem] leading-none tracking-tight">
              Faircopy
            </span>
          </button>
          <button
            className="cc-side__icon-btn lg:hidden"
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
          className="cc-side__cta mb-6"
        >
          <span className="cc-side__cta-plus">
            <Plus className="h-4 w-4" strokeWidth={2.5} />
          </span>
          <span className="text-sm font-semibold">New résumé</span>
        </button>

        {/* Nav groups */}
        <nav className="-mr-1 flex-1 overflow-y-auto pr-1">
          {grouped.map((group) => (
            <div key={group.id || "home"} className="mb-5 last:mb-0">
              {group.label ? <div className="cc-side__group">{group.label}</div> : null}
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
                        aria-current={active ? "page" : undefined}
                        className={`cc-side__item ${active ? "is-active" : ""}`}
                      >
                        <span className="cc-side__ink">
                          {active && (
                            <motion.span
                              aria-hidden
                              className="cc-side__hilite"
                              style={{ originX: 0 }}
                              initial={reduce ? false : { scaleX: 0, rotate: -1 }}
                              animate={{ scaleX: 1, rotate: -1 }}
                              transition={{ duration: 0.5, ease: [0.65, 0, 0.25, 1], delay: 0.15 }}
                            />
                          )}
                          <l.icon className="cc-side__icon h-4 w-4" />
                          <span className="cc-side__label truncate">{l.label}</span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* User */}
        <div className="cc-side__me mt-4">
          <span className="cc-side__avatar" aria-hidden>
            {initial}
          </span>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold">{userName || "Guest"}</div>
            <div className="truncate text-[11px] text-[color:var(--cc-ash)]">{userEmail}</div>
          </div>
          <button
            onClick={onSignOut}
            className="cc-side__icon-btn"
            aria-label="Sign out"
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
});
