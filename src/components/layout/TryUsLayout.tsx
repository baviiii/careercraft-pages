/**
 * TryUsLayout - Guest-mode layout for "Try Us" feature
 * 
 * Similar to UnifiedLayout but WITHOUT authentication requirements.
 * Shows a promotional banner encouraging sign-up.
 */

import { useEffect, useRef, ReactNode } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { gsap } from "gsap";
import {
  Home,
  Brain,
  LayoutDashboard,
  MessageSquareText,
  ArrowRight,
  Sparkles,
  Eye,
  Crown,
  Menu,
  X,
  LogIn,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";

export interface TryUsLayoutProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  activeTab?: "intelligence" | "chat";
  onTabChange?: (tab: "intelligence" | "chat") => void;
}

export function TryUsLayout({
  children,
  title,
  subtitle,
  activeTab = "intelligence",
  onTabChange,
}: TryUsLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const mainContentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mainContentRef.current) return;
    
    const ctx = gsap.context(() => {
      if (mainContentRef.current) {
        gsap.fromTo(
          mainContentRef.current,
          { opacity: 0, y: 20 },
          { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" }
        );
      }
    });

    return () => ctx.revert();
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-[#0a0f1a] relative overflow-hidden">
      {/* Premium Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0a0f1a] via-[#0d1526] to-[#0f172a]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(168,85,247,0.12),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(236,72,153,0.08),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(139,92,246,0.05),transparent_60%)]" />
        
        {/* Morphing Orbs */}
        <div className="absolute -top-40 right-[10%] w-[800px] h-[800px] rounded-full opacity-60"
          style={{ 
            background: "radial-gradient(circle, rgba(168,85,247,0.15) 0%, rgba(236,72,153,0.08) 50%, transparent 70%)", 
            animation: "morph 15s ease-in-out infinite, float-slow 12s ease-in-out infinite" 
          }} 
        />
        <div className="absolute top-[40%] -left-40 w-[700px] h-[700px] rounded-full opacity-50"
          style={{ 
            background: "radial-gradient(circle, rgba(59,130,246,0.12) 0%, rgba(168,85,247,0.06) 50%, transparent 70%)", 
            animation: "morph 18s ease-in-out infinite reverse, float-slower 15s ease-in-out infinite" 
          }} 
        />

        {/* Grid */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(168,85,247,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(168,85,247,0.03)_1px,transparent_1px)] bg-[size:80px_80px]" />
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden" 
          onClick={() => setSidebarOpen(false)} 
        />
      )}

      {/* Simplified Sidebar */}
      <aside className={cn(
        "fixed top-0 left-0 h-full w-[280px] z-50 transform transition-all duration-500 ease-out lg:translate-x-0",
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900/95 via-slate-900/90 to-slate-900/95 backdrop-blur-2xl" />
        <div className="absolute inset-0 bg-gradient-to-b from-purple-500/5 via-transparent to-pink-500/5" />
        <div className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-purple-500/30 to-transparent" />
        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-purple-500/10 to-transparent" />

        <div className="relative p-6 h-full flex flex-col">
          {/* Logo */}
          <div className="flex items-center justify-between mb-8">
            <button 
              onClick={() => navigate("/")} 
              className="flex items-center gap-3 group"
            >
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-pink-400 rounded-2xl blur-lg opacity-50 group-hover:opacity-80 transition-opacity" />
                <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-400 flex items-center justify-center shadow-lg group-hover:scale-110 transition-all duration-300">
                  <Eye className="w-6 h-6 text-white" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-gradient-to-br from-orange-400 to-pink-500 rounded-full border-2 border-slate-900 flex items-center justify-center animate-bounce-subtle">
                  <Crown className="w-2.5 h-2.5 text-white" />
                </div>
              </div>
              <div>
                <span className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400">HORUS</span>
                <p className="text-xs text-slate-400">Try Us Mode</p>
              </div>
            </button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="lg:hidden text-slate-400 hover:text-white hover:bg-white/10" 
              onClick={() => setSidebarOpen(false)}
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Demo Navigation */}
          <nav className="space-y-4 flex-1">
            <div>
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-[0.2em] mb-3 px-3">
                Try Our Features
              </p>
              <div className="space-y-1">
                <button
                  onClick={() => onTabChange?.("intelligence")}
                  className={cn(
                    "group w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300",
                    activeTab === "intelligence"
                      ? "bg-gradient-to-r from-purple-500/20 via-purple-500/10 to-transparent text-white border-l-2 border-purple-400"
                      : "text-slate-400 hover:text-white hover:bg-white/5"
                  )}
                >
                  <div className={cn(
                    "w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-300",
                    activeTab === "intelligence"
                      ? "bg-gradient-to-br from-purple-500 to-pink-600 shadow-lg shadow-purple-500/25" 
                      : "bg-slate-800/80 group-hover:bg-slate-700/80"
                  )}>
                    <LayoutDashboard className={cn("w-4 h-4", activeTab === "intelligence" ? "text-white" : "text-slate-400 group-hover:text-white")} />
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <span className={cn(
                      "text-sm",
                      activeTab === "intelligence" ? "font-semibold text-white" : "font-medium text-slate-400 group-hover:text-white"
                    )}>
                      Intelligence Dashboard
                    </span>
                    <p className="text-xs text-slate-500 mt-0.5">AI-powered insights</p>
                  </div>
                </button>

                <button
                  onClick={() => onTabChange?.("chat")}
                  className={cn(
                    "group w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300",
                    activeTab === "chat"
                      ? "bg-gradient-to-r from-purple-500/20 via-purple-500/10 to-transparent text-white border-l-2 border-purple-400"
                      : "text-slate-400 hover:text-white hover:bg-white/5"
                  )}
                >
                  <div className={cn(
                    "w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-300",
                    activeTab === "chat"
                      ? "bg-gradient-to-br from-purple-500 to-pink-600 shadow-lg shadow-purple-500/25" 
                      : "bg-slate-800/80 group-hover:bg-slate-700/80"
                  )}>
                    <MessageSquareText className={cn("w-4 h-4", activeTab === "chat" ? "text-white" : "text-slate-400 group-hover:text-white")} />
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <span className={cn(
                      "text-sm",
                      activeTab === "chat" ? "font-semibold text-white" : "font-medium text-slate-400 group-hover:text-white"
                    )}>
                      Horus Chat
                    </span>
                    <p className="text-xs text-slate-500 mt-0.5">AI career assistant</p>
                  </div>
                </button>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800/50">
              <button
                onClick={() => navigate("/")}
                className="group w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all duration-300"
              >
                <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-slate-800/80 group-hover:bg-slate-700/80 transition-all">
                  <Home className="w-4 h-4 text-slate-400 group-hover:text-white" />
                </div>
                <span className="text-sm font-medium">Back to Home</span>
              </button>
            </div>
          </nav>

          {/* Sign Up CTA */}
          <div className="relative overflow-hidden p-4 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-pink-500/10" />
            <div className="relative">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <span className="text-sm font-semibold text-white">Love what you see?</span>
              </div>
              <p className="text-xs text-slate-400 mb-3">Sign up for free to unlock all features</p>
              <Button 
                onClick={() => navigate("/auth")}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold"
                size="sm"
              >
                <LogIn className="w-4 h-4 mr-2" />
                Sign Up Free
              </Button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="lg:pl-[280px] relative min-h-screen">
        {/* Promotional Banner */}
        <div className="sticky top-0 z-40 bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 text-white">
          <div className="container mx-auto px-4 py-2.5 flex items-center justify-center gap-3 text-sm">
            <Sparkles className="w-4 h-4 animate-pulse" />
            <span className="font-medium">You're exploring in guest mode</span>
            <span className="hidden sm:inline text-white/80">—</span>
            <span className="hidden sm:inline text-white/80">Sign up to save your work and unlock all features</span>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => navigate("/auth")}
              className="ml-2 bg-white/20 hover:bg-white/30 text-white border-0 font-semibold"
            >
              Sign Up
              <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          </div>
        </div>

        {/* Header */}
        <header className="sticky top-[44px] z-30 mx-4 mt-4 lg:mx-6">
          <div className="relative rounded-2xl overflow-hidden">
            <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-2xl" />
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 via-transparent to-pink-500/5" />
            <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-purple-500/30 to-transparent" />
            
            <div className="relative flex items-center justify-between px-6 py-4">
              <div className="flex items-center gap-4">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="lg:hidden text-slate-400 hover:text-white hover:bg-white/10" 
                  onClick={() => setSidebarOpen(true)}
                >
                  <Menu className="w-5 h-5" />
                </Button>
                <div>
                  <h1 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
                    {title || "Try Horus Intelligence"}
                    <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 gap-1">
                      <Eye className="w-3 h-3" />
                      Demo
                    </Badge>
                  </h1>
                  <p className="text-sm text-slate-400">
                    {subtitle || "Experience AI-powered career intelligence"}
                  </p>
                </div>
              </div>
              
              <Button
                onClick={() => navigate("/auth")}
                className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold shadow-lg shadow-purple-500/25"
              >
                <LogIn className="w-4 h-4 mr-2" />
                Sign Up Free
              </Button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main 
          ref={mainContentRef} 
          className="p-4 md:p-6 lg:p-8 relative"
        >
          {children}
        </main>
      </div>
    </div>
  );
}

export default TryUsLayout;
