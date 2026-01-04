import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Compass,
  TrendingUp,
  MessageSquareText,
  FileText,
  BarChart3,
  Settings,
  Menu,
  X,
  ChevronRight,
  Sparkles,
  Building2,
  Sun,
  Moon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: string;
  description?: string;
}

const primaryNav: NavItem[] = [
  {
    label: "Intelligence Overview",
    href: "/intelligence",
    icon: <LayoutDashboard className="w-5 h-5" />,
    description: "Live SA Career Pulse & insights",
  },
  {
    label: "Career Explorer",
    href: "/career-explorer",
    icon: <Compass className="w-5 h-5" />,
    description: "Interactive sector & region analysis",
  },
  {
    label: "Market Trends",
    href: "/market-trends",
    icon: <TrendingUp className="w-5 h-5" />,
    badge: "Live",
    description: "Real-time job & skills trends",
  },
  {
    label: "Horus Chat",
    href: "/sa-career-hub",
    icon: <MessageSquareText className="w-5 h-5" />,
    description: "RAG-powered career guidance",
  },
];

const secondaryNav: NavItem[] = [
  {
    label: "Resume Intelligence",
    href: "/builder",
    icon: <FileText className="w-5 h-5" />,
    description: "ATS analysis & optimization",
  },
  {
    label: "Policy Insights",
    href: "/policy",
    icon: <BarChart3 className="w-5 h-5" />,
    description: "Government investment data",
  },
];

export function IntelligenceNav() {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);

  const toggleTheme = () => {
    setIsDark(!isDark);
    document.documentElement.classList.toggle('dark');
  };

  const isActive = (href: string) => {
    if (href === "/dashboard") {
      return location.pathname === "/" || location.pathname === "/dashboard";
    }
    return location.pathname.startsWith(href);
  };

  return (
    <>
      {/* Desktop Navigation */}
      <nav className="hidden lg:flex fixed left-0 top-0 h-screen w-72 flex-col bg-card border-r border-border z-50">
        {/* Logo & Brand */}
        <div className="p-6 border-b border-border">
          <Link to="/" className="flex items-center gap-3 group">
            <img 
              src="/logo.png" 
              alt="Horus Intelligence" 
              className="w-10 h-10 rounded-xl shadow-lg object-contain"
            />
            <div className="flex flex-col">
              <span className="font-display font-bold text-lg text-foreground leading-tight">
                Horus Intelligence
              </span>
              <span className="text-xs text-muted-foreground">
                Intelligence Platform
              </span>
            </div>
          </Link>
        </div>

        {/* Primary Navigation */}
        <div className="flex-1 overflow-y-auto py-4 px-3">
          <div className="mb-6">
            <p className="px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Intelligence
            </p>
            <div className="space-y-1">
              {primaryNav.map((item) => (
                <Link
                  key={item.href}
                  to={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-premium group relative",
                    isActive(item.href)
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  {isActive(item.href) && (
                    <motion.div
                      layoutId="activeNav"
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-r-full"
                    />
                  )}
                  <span className={cn(
                    "flex-shrink-0 transition-colors",
                    isActive(item.href) ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                  )}>
                    {item.icon}
                  </span>
                  <span className="font-medium text-sm flex-1">{item.label}</span>
                  {item.badge && (
                    <span className="px-1.5 py-0.5 text-[10px] font-semibold uppercase bg-accent-emerald/20 text-accent-emerald rounded-full flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-accent-emerald rounded-full animate-pulse-subtle" />
                      {item.badge}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          </div>

          <div>
            <p className="px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Tools
            </p>
            <div className="space-y-1">
              {secondaryNav.map((item) => (
                <Link
                  key={item.href}
                  to={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-premium group relative",
                    isActive(item.href)
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  {isActive(item.href) && (
                    <motion.div
                      layoutId="activeNavSecondary"
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-r-full"
                    />
                  )}
                  <span className={cn(
                    "flex-shrink-0 transition-colors",
                    isActive(item.href) ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                  )}>
                    {item.icon}
                  </span>
                  <span className="font-medium text-sm">{item.label}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border">
          <div className="flex items-center justify-between mb-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleTheme}
              className="text-muted-foreground hover:text-foreground"
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
            <Link to="/settings">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                <Settings className="w-4 h-4" />
              </Button>
            </Link>
          </div>
          <div className="glass rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-4 h-4 text-accent-gold" />
              <span className="text-xs font-semibold text-foreground">AI-Powered</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Backed by SA Government data & verified sources
            </p>
          </div>
        </div>
      </nav>

      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-xl border-b border-border">
        <div className="flex items-center justify-between px-4 h-16">
          <Link to="/" className="flex items-center gap-2">
            <img 
              src="/logo.png" 
              alt="Horus Intelligence" 
              className="w-8 h-8 rounded-lg object-contain"
            />
            <span className="font-display font-bold text-foreground">Horus Intelligence</span>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileMenuOpen(true)}
            className="text-foreground"
          >
            <Menu className="w-5 h-5" />
          </Button>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-50 lg:hidden"
              onClick={() => setMobileMenuOpen(false)}
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 w-80 bg-card z-50 lg:hidden shadow-xl"
            >
              <div className="flex items-center justify-between p-4 border-b border-border">
                <span className="font-display font-bold text-foreground">Menu</span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
              <div className="p-4 space-y-1 overflow-y-auto">
                {[...primaryNav, ...secondaryNav].map((item) => (
                  <Link
                    key={item.href}
                    to={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-lg transition-premium",
                      isActive(item.href)
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    {item.icon}
                    <div className="flex-1">
                      <div className="font-medium text-sm">{item.label}</div>
                      {item.description && (
                        <div className="text-xs text-muted-foreground">{item.description}</div>
                      )}
                    </div>
                    <ChevronRight className="w-4 h-4 opacity-50" />
                  </Link>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
