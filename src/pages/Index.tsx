import { useEffect, useState, memo, lazy, Suspense } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import { Navbar, Hero, Footer } from "@/components/landing";

// Lazy load below-the-fold components
const Features = lazy(() => import("@/components/landing/Features").then(m => ({ default: m.Features })));
const Stats = lazy(() => import("@/components/landing/Stats").then(m => ({ default: m.Stats })));
const HowItWorks = lazy(() => import("@/components/landing/HowItWorks").then(m => ({ default: m.HowItWorks })));
const Pricing = lazy(() => import("@/components/landing/Pricing").then(m => ({ default: m.Pricing })));
const CTA = lazy(() => import("@/components/landing/CTA").then(m => ({ default: m.CTA })));
const SplashCursor = lazy(() => import("@/components/landing/SplashCursor"));

// Section loader placeholder
const SectionLoader = memo(() => (
  <div className="py-20 flex justify-center">
    <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
  </div>
));

const Index = memo(() => {
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_, session) => setSession(session)
    );

    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));

    // Force light mode for landing page
    document.documentElement.classList.remove('dark');
    document.documentElement.style.colorScheme = 'light';

    return () => subscription.unsubscribe();
  }, []);


  return (
    <main className="min-h-screen overflow-x-hidden bg-gradient-to-br from-blue-50 via-blue-100/50 to-sky-50">
      <Suspense fallback={null}>
        <SplashCursor />
      </Suspense>
      <Navbar session={session} />
      <Hero session={session} />
      <Suspense fallback={<SectionLoader />}>
        <Stats />
      </Suspense>
      <Suspense fallback={<SectionLoader />}>
        <Features />
      </Suspense>
      <Suspense fallback={<SectionLoader />}>
        <section id="how-it-works">
          <HowItWorks />
        </section>
      </Suspense>
      <Suspense fallback={<SectionLoader />}>
        <Pricing />
      </Suspense>
      <Suspense fallback={<SectionLoader />}>
        <CTA />
      </Suspense>
      <Footer />
    </main>
  );
});

Index.displayName = "Index";

export default Index;
