import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import {
  Navbar,
  Hero,
  Features,
  Stats,
  HowItWorks,
  Pricing,
  CTA,
  Footer,
  SplashCursor,
} from "@/components/landing";

const Index = () => {
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <main className="min-h-screen overflow-x-hidden">
      <SplashCursor />
      <Navbar session={session} />
      <Hero session={session} />
      <Stats />
      <Features />
      <section id="how-it-works">
        <HowItWorks />
      </section>
      <Pricing />
      <CTA />
      <Footer />
    </main>
  );
};

export default Index;
