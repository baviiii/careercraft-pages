/* ───────────────────────────────────────────────────────────
   CareerCraft — logged-in app layout.
   Cream ground, grain, editorial sidebar, sticky top bar.
   Wrap any toolkit page that wants the dashboard feel.
   ─────────────────────────────────────────────────────────── */

import { memo, ReactNode, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Menu } from "lucide-react";
import { Session } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";
import { CraftSidebar, CraftSidebarLink } from "./CraftSidebar";

interface CraftAppLayoutProps {
  children: ReactNode;
  /** Optional override of the full sidebar link list. Defaults to shared list. */
  sidebarLinks?: CraftSidebarLink[];
  /** Content rendered on the right of the top bar (e.g. Refresh button). */
  headerActions?: ReactNode;
  /** Content rendered on the left of the top bar — defaults to today's stamp. */
  topBarLeft?: ReactNode;
  /** Extra classes on the main content container. */
  className?: string;
}

export const CraftAppLayout = memo(function CraftAppLayout({
  children,
  sidebarLinks,
  headerActions,
  topBarLeft,
  className = "",
}: CraftAppLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      if (!active) return;
      setSession(s);
      setLoading(false);
      if (!s) navigate("/auth");
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_, s) => {
      if (!active) return;
      setSession(s);
      if (!s) navigate("/auth");
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [navigate]);

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error("Sign out error:", error);
    }
    navigate("/auth");
  };

  const todayStamp = useMemo(() => {
    const d = new Date();
    return d
      .toLocaleDateString("en-GB", {
        weekday: "long",
        day: "2-digit",
        month: "long",
        year: "numeric",
      })
      .toUpperCase();
  }, []);

  const userName =
    session?.user?.user_metadata?.full_name ||
    session?.user?.email?.split("@")[0] ||
    "";

  if (loading) {
    return (
      <div className="cc-root cc-font-sans min-h-screen bg-[color:var(--cc-cream)] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-full border border-[color:var(--cc-ink)] border-t-[color:var(--cc-rust)] animate-spin" />
          <div className="cc-label-sm text-[color:var(--cc-ash)]">
            Loading…
          </div>
        </div>
      </div>
    );
  }

  return (
    <main className="cc-root cc-font-sans min-h-screen bg-[color:var(--cc-cream)] text-[color:var(--cc-ink)] overflow-x-hidden antialiased">
      {/* Grain backdrop */}
      <div className="cc-grain pointer-events-none fixed inset-0 z-0" />

      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 bg-[color:var(--cc-ink)]/40 z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      <CraftSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        links={sidebarLinks}
        currentPath={location.pathname}
        userName={userName}
        userEmail={session?.user?.email || ""}
        onSignOut={handleSignOut}
        navigate={navigate}
      />

      {/* Main column */}
      <div className="lg:pl-[272px] relative z-10 min-h-screen flex flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-[color:var(--cc-cream)]/90 backdrop-blur-sm border-b border-[color:var(--cc-hair)]">
          <div className="flex items-center justify-between px-6 md:px-10 h-16">
            <div className="flex items-center gap-4">
              <button
                className="lg:hidden -ml-2 p-2"
                onClick={() => setSidebarOpen(true)}
                aria-label="Open navigation"
              >
                <Menu className="w-5 h-5" />
              </button>
              {topBarLeft ?? (
                <div className="cc-label-sm text-[color:var(--cc-ash)]">
                  <span className="cc-tabular">{todayStamp}</span>
                </div>
              )}
            </div>
            {headerActions && (
              <div className="flex items-center gap-3">{headerActions}</div>
            )}
          </div>
        </header>

        <div className={`flex-1 px-6 md:px-10 py-10 md:py-14 ${className}`}>
          <div className="max-w-[1400px] mx-auto">{children}</div>
        </div>
      </div>
    </main>
  );
});

export default CraftAppLayout;
