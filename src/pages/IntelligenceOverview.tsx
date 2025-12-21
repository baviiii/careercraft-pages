import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import {
  IntelligenceLayout,
  CareerPulse,
  SectorHeatmap,
  InvestmentHighlights,
  BreakingNews,
} from "@/components/intelligence";
import { Skeleton } from "@/components/ui/skeleton";

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.1 }
  }
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

export default function IntelligenceOverview() {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        if (!session) {
          navigate("/auth");
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (!session) {
        navigate("/auth");
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  if (loading) {
    return (
      <IntelligenceLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-64" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Skeleton className="h-96 lg:col-span-2" />
            <Skeleton className="h-96" />
          </div>
        </div>
      </IntelligenceLayout>
    );
  }

  const userName = session?.user?.user_metadata?.full_name || 
                   session?.user?.email?.split('@')[0] || 'there';

  return (
    <IntelligenceLayout>
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="space-y-8"
      >
        {/* Header */}
        <motion.div variants={item}>
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">
                Welcome back, {userName}
              </p>
              <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground">
                Intelligence Overview
              </h1>
              <p className="text-muted-foreground mt-2 max-w-xl">
                Real-time insights into South Australia's job market, government investments, 
                and career opportunities.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="w-2 h-2 bg-accent-emerald rounded-full animate-pulse" />
              <span>Live data • Last updated just now</span>
            </div>
          </div>
        </motion.div>

        {/* Career Pulse - Key Metrics */}
        <motion.div variants={item}>
          <CareerPulse />
        </motion.div>

        {/* Main Grid: Heatmap + Investment Highlights */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <motion.div variants={item} className="lg:col-span-2">
            <SectorHeatmap />
          </motion.div>
          <motion.div variants={item}>
            <InvestmentHighlights />
          </motion.div>
        </div>

        {/* Breaking News */}
        <motion.div variants={item}>
          <BreakingNews />
        </motion.div>
      </motion.div>
    </IntelligenceLayout>
  );
}
