/* ───────────────────────────────────────────────────────────
   CareerCraft — cream editorial sidebar for every logged-in page.
   Matches the dashboard aesthetic: ink border, rust active rail,
   Fraunces branding, hand-set nav labels.
   ─────────────────────────────────────────────────────────── */

import { memo } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Brain,
  Briefcase,
  FileText,
  Home,
  LogOut,
  Newspaper,
  Search,
  Settings,
  TrendingUp,
  X,
} from "lucide-react";

export interface CraftSidebarLink {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  path: string;
}

/**
 * The shared sidebar link list. Add new pages here once and every
 * logged-in screen picks them up.
 */
export const CRAFT_SIDEBAR_LINKS: CraftSidebarLink[] = [
  { icon: Home, label: "Atelier", path: "/dashboard" },
  { icon: TrendingUp, label: "Intelligence", path: "/intelligence" },
  { icon: Brain, label: "Career Hub", path: "/sa-career-hub" },
  { icon: FileText, label: "My Résumés", path: "/my-resumes" },
  { icon: Briefcase, label: "Job Tracker", path: "/tracker" },
  { icon: Search, label: "AU Jobs", path: "/au-jobs" },
  { icon: Newspaper, label: "Market News", path: "/job-market-news" },
  { icon: Settings, label: "Settings", path: "/settings" },
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

  return (
    <aside
      className={`fixed top-0 left-0 h-full w-[300px] z-50 bg-[color:var(--cc-cream)] border-r border-[color:var(--cc-hair-strong)] transform transition-transform duration-400 ease-out lg:translate-x-0 ${
        open ? "translate-x-0" : "-translate-x-full"
      }`}
    >
      <div className="relative h-full flex flex-col p-6">
        {/* Masthead */}
        <div className="flex items-center justify-between pb-6 border-b border-[color:var(--cc-hair)]">
          <button
            onClick={() => {
              navigate("/");
              onClose();
            }}
            className="flex items-center gap-3"
          >
            <div className="w-10 h-10 rounded-full border border-[color:var(--cc-ink)] flex items-center justify-center">
              <span
                className="cc-font-display cc-italic-wonk text-xl leading-none translate-y-[-1px]"
                style={{ color: "var(--cc-rust)" }}
              >
                c
              </span>
            </div>
            <div className="text-left">
              <div className="cc-font-display italic text-xl tracking-tight">
                CareerCraft
              </div>
              <div className="cc-label-sm text-[color:var(--cc-ash)] mt-0.5">
                Atelier · Vol. I
              </div>
            </div>
          </button>
          <button
            className="lg:hidden"
            onClick={onClose}
            aria-label="Close navigation"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="mt-8 flex-1 overflow-y-auto -mx-2">
          <div className="px-2 cc-label-sm text-[color:var(--cc-ash)] mb-4">
            The pages
          </div>
          <ul className="space-y-1">
            {links.map((l) => {
              const active = currentPath === l.path;
              return (
                <li key={l.path}>
                  <button
                    onClick={() => {
                      navigate(l.path);
                      onClose();
                    }}
                    className={`relative w-full flex items-center gap-3 px-4 py-3 cc-label transition-colors ${
                      active
                        ? "text-[color:var(--cc-ink)]"
                        : "text-[color:var(--cc-ash)] hover:text-[color:var(--cc-ink)]"
                    }`}
                  >
                    {active && (
                      <motion.span
                        layoutId="cc-side-active"
                        className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 bg-[color:var(--cc-rust)]"
                        transition={{
                          type: "spring",
                          stiffness: 380,
                          damping: 30,
                        }}
                      />
                    )}
                    <l.icon className="w-4 h-4" />
                    <span>{l.label}</span>
                    {active && (
                      <ArrowRight className="w-3.5 h-3.5 ml-auto text-[color:var(--cc-rust)]" />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* User card */}
        <div className="mt-6 pt-6 border-t border-[color:var(--cc-hair)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full border border-[color:var(--cc-ink)] bg-[color:var(--cc-cream-2)] flex items-center justify-center">
              <span className="cc-font-display italic text-lg text-[color:var(--cc-ink)]">
                {initial}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="cc-font-display italic text-lg text-[color:var(--cc-ink)] truncate">
                {userName || "Guest"}
              </div>
              <div className="cc-label-sm text-[color:var(--cc-ash)] truncate">
                {userEmail}
              </div>
            </div>
          </div>

          <button
            onClick={onSignOut}
            className="mt-4 w-full cc-btn cc-btn-ghost"
            style={{ padding: "0.8rem 1rem" }}
          >
            <LogOut className="w-3.5 h-3.5" /> Sign out
          </button>
        </div>
      </div>
    </aside>
  );
});
