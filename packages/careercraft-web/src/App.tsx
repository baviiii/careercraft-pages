import { lazy, Suspense, useEffect, useState, type ReactNode } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { applyStoredAccent } from "@/lib/personaTheme";

// Re-apply the persona accent before first paint so returning users see
// their palette immediately instead of a rust flash.
applyStoredAccent();

// Lazy load all pages for code splitting
const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Onboarding = lazy(() => import("./features/onboarding/OnboardingPage"));
const Analysis = lazy(() => import("./features/analysis/AnalysisPage"));
const Rewrite = lazy(() => import("./pages/Rewrite"));
const CoverLetter = lazy(() => import("./pages/CoverLetter"));
const JobTracker = lazy(() => import("./features/job-tracker/JobTrackerPage"));
const ResumeBuilder = lazy(() => import("./features/resume-builder/ResumeBuilderPage"));
const MyResumes = lazy(() => import("./features/my-resumes/MyResumesPage"));
const InterviewPrep = lazy(() => import("./pages/InterviewPrep"));
const AustralianJobs = lazy(() => import("./pages/AustralianJobs"));
const JobMarketNews = lazy(() => import("./pages/JobMarketNews"));
const Settings = lazy(() => import("./pages/Settings"));
const Playground = lazy(() => import("./pages/Playground"));
const IntelligenceOverview = lazy(() => import("./pages/IntelligenceOverview"));
const CareerExplorer = lazy(() => import("./pages/CareerExplorer"));
const MarketTrends = lazy(() => import("./pages/MarketTrends"));
const PolicyVisualizer = lazy(() => import("./pages/PolicyVisualizer"));
const CareerCoachPage = lazy(() => import("./pages/CareerCoachPage"));
const ContactUs = lazy(() => import("./pages/ContactUs"));
const AboutUs = lazy(() => import("./pages/AboutUs"));
const Privacy = lazy(() => import("./pages/Privacy"));
const NotFound = lazy(() => import("./pages/NotFound"));
const TryUs = lazy(() => import("./pages/TryUs"));
const AdminLayout = lazy(() => import("./pages/admin/AdminLayout"));
const AdminOverview = lazy(() => import("./pages/admin/AdminOverview"));
const UserManagement = lazy(() => import("./pages/admin/UserManagement"));
const ActivityLogs = lazy(() => import("./pages/admin/ActivityLogs"));
const SessionsManagement = lazy(() => import("./pages/admin/SessionsManagement"));
const SecurityAlerts = lazy(() => import("./pages/admin/SecurityAlerts"));
const AccessControl = lazy(() => import("./pages/admin/AccessControl"));
const AuditTrail = lazy(() => import("./pages/admin/AuditTrail"));
const AdminSettings = lazy(() => import("./pages/admin/AdminSettings"));
const ChatPrompts = lazy(() => import("./pages/admin/ChatPrompts"));
const AdminDocuments = lazy(() => import("./pages/admin/AdminDocuments"));

// Optimized QueryClient with better caching
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes (formerly cacheTime)
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Minimal loading spinner
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

function RequireAuthAndOnboarding({ children }: { children: ReactNode }) {
  const [state, setState] = useState<"loading" | "allow" | "auth">("loading");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.auth.getSession();
      const session = data?.session;
      if (!session?.user) {
        if (!cancelled) setState("auth");
        return;
      }

      if (cancelled) return;
      setState("allow");
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (state === "loading") return <PageLoader />;
  if (state === "auth") return <Navigate to="/auth" replace />;
  return <>{children}</>;
}

function ProtectedLayout() {
  return (
    <RequireAuthAndOnboarding>
      <Outlet />
    </RequireAuthAndOnboarding>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider delayDuration={0}>
      <Toaster />
      <Sonner />
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/sa-career-hub" element={<Navigate to="/career-coach" replace />} />
            <Route path="/contact" element={<ContactUs />} />
            <Route path="/about" element={<AboutUs />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/try" element={<TryUs />} />

            <Route element={<ProtectedLayout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/upload" element={<ResumeBuilder />} />
              <Route path="/analysis" element={<Analysis />} />
              <Route path="/rewrite" element={<Rewrite />} />
              <Route path="/cover-letter" element={<CoverLetter />} />
              <Route path="/tracker" element={<JobTracker />} />
              {/* Legacy second builder — folded into /builder */}
              <Route path="/templates" element={<Navigate to="/builder" replace />} />
              <Route path="/editor" element={<Navigate to="/builder" replace />} />
              <Route path="/builder" element={<ResumeBuilder />} />
              <Route path="/my-resumes" element={<MyResumes />} />
              <Route path="/interview-prep" element={<InterviewPrep />} />
              <Route path="/au-jobs" element={<AustralianJobs />} />
              <Route path="/job-market-news" element={<JobMarketNews />} />
              <Route path="/playground" element={<Playground />} />
              <Route path="/intelligence" element={<IntelligenceOverview />} />
              <Route path="/career-coach" element={<CareerCoachPage />} />
              <Route path="/career-explorer" element={<CareerExplorer />} />
              <Route path="/market-trends" element={<MarketTrends />} />
              <Route path="/policy" element={<PolicyVisualizer />} />
              <Route path="/settings" element={<Settings />} />

              {/* Admin Routes */}
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<AdminOverview />} />
                <Route path="documents" element={<AdminDocuments />} />
                <Route path="users" element={<UserManagement />} />
                <Route path="activity" element={<ActivityLogs />} />
                <Route path="sessions" element={<SessionsManagement />} />
                <Route path="security" element={<SecurityAlerts />} />
                <Route path="access" element={<AccessControl />} />
                <Route path="audit" element={<AuditTrail />} />
                <Route path="settings" element={<AdminSettings />} />
                <Route path="prompts" element={<ChatPrompts />} />
              </Route>
            </Route>
            
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
