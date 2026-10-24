import { lazy, Suspense, useEffect, useState, type ReactNode } from "react";
import { AboutUs, ContactUs, Index, Privacy, ResumeBuilder, Terms, ToolRoute, ToolsIndex } from "./publicPages";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation, useNavigationType } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { applyStoredAccent } from "@/lib/personaTheme";

// Re-apply the persona accent before first paint so returning users see
// their palette immediately instead of a rust flash.
applyStoredAccent();

// Lazy load all pages for code splitting
const Auth = lazy(() => import("./pages/Auth"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Onboarding = lazy(() => import("./features/onboarding/OnboardingPage"));
const Analysis = lazy(() => import("./features/analysis/AnalysisPage"));
const Rewrite = lazy(() => import("./pages/Rewrite"));
const CoverLetter = lazy(() => import("./features/cover-letter/CoverLetterPage"));
const JobTracker = lazy(() => import("./features/job-tracker/JobTrackerPage"));
const MyResumes = lazy(() => import("./features/my-resumes/MyResumesPage"));
const InterviewPrep = lazy(() => import("./pages/InterviewPrep"));
const InterviewRoom = lazy(() => import("./features/interview/InterviewRoomPage"));
const BrowseJobs = lazy(() => import("./features/browse-jobs/BrowseJobsPage"));
const MarketNews = lazy(() => import("./features/market-news/MarketNewsPage"));
const Settings = lazy(() => import("./pages/Settings"));
const Playground = lazy(() => import("./pages/Playground"));
const IntelligenceOverview = lazy(() => import("./pages/IntelligenceOverview"));
const CareerExplorer = lazy(() => import("./pages/CareerExplorer"));
const MarketTrends = lazy(() => import("./pages/MarketTrends"));
const PolicyVisualizer = lazy(() => import("./pages/PolicyVisualizer"));
const CareerCoachPage = lazy(() => import("./pages/CareerCoachPage"));
const NotFound = lazy(() => import("./pages/NotFound"));
const SaveJob = lazy(() => import("./pages/SaveJob"));
const TryUs = lazy(() => import("./pages/TryUs"));
const AdminLayout = lazy(() => import("./pages/admin/AdminLayout"));
const AdminOverview = lazy(() => import("./pages/admin/AdminOverview"));
const UserManagement = lazy(() => import("./pages/admin/UserManagement"));
const ActivityLogs = lazy(() => import("./pages/admin/ActivityLogs"));
const SessionsManagement = lazy(() => import("./pages/admin/SessionsManagement"));
const SecurityAlerts = lazy(() => import("./pages/admin/SecurityAlerts"));
const AccessControl = lazy(() => import("./pages/admin/AccessControl"));
const ChatPrompts = lazy(() => import("./pages/admin/ChatPrompts"));
const PlansAndLimits = lazy(() => import("./pages/admin/PlansAndLimits"));

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

/* A link to another page starts at its top. Without this the window kept its
   old scroll position, so a link at the bottom of a long page landed at the
   bottom of the next one. Back and forward (POP) are left to the browser, and
   links to an #anchor scroll themselves. */
function ScrollToTop() {
  const { pathname, hash } = useLocation();
  const type = useNavigationType();
  useEffect(() => {
    if (type !== "POP" && !hash) window.scrollTo(0, 0);
  }, [pathname, hash, type]);
  return null;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider delayDuration={0}>
      <Toaster />
      <Sonner />
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <ScrollToTop />
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
            <Route path="/terms" element={<Terms />} />
            <Route path="/tools" element={<ToolsIndex />} />
            <Route path="/tools/:slug" element={<ToolRoute />} />
            {/* Where the "Save to Faircopy" extension lands. Public so a signed-out
                user keeps the job through sign-in; see pages/SaveJob.tsx. */}
            <Route path="/save-job" element={<SaveJob />} />

            {/* The résumé builder is deliberately public. Guests can build and
                preview a real résumé; the gate is on export and save, handled
                inside the builder itself. Legacy /templates and /editor point
                here too, so those stay public for the same reason. */}
            <Route path="/builder" element={<ResumeBuilder />} />
            <Route path="/upload" element={<ResumeBuilder />} />
            <Route path="/templates" element={<Navigate to="/builder" replace />} />
            <Route path="/editor" element={<Navigate to="/builder" replace />} />

            <Route element={<ProtectedLayout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/analysis" element={<Analysis />} />
              <Route path="/rewrite" element={<Rewrite />} />
              <Route path="/cover-letter" element={<CoverLetter />} />
              <Route path="/tracker" element={<JobTracker />} />
              {/* /try runs an uncapped chat for whoever opens it, so it sits
                  behind auth until there is a server-side rate limit. */}
              <Route path="/try" element={<TryUs />} />
              <Route path="/my-resumes" element={<MyResumes />} />
              <Route path="/interview-prep" element={<InterviewPrep />} />
              <Route path="/interview-prep/room" element={<InterviewRoom />} />
              <Route path="/au-jobs" element={<BrowseJobs />} />
              <Route path="/job-market-news" element={<MarketNews />} />
              <Route path="/playground" element={<Playground />} />
              <Route path="/intelligence" element={<IntelligenceOverview />} />
              <Route path="/career-coach" element={<CareerCoachPage />} />
              {/* Career/study now live as tabs on /interview-prep. */}
              <Route path="/career-dev" element={<Navigate to="/interview-prep?tab=profile" replace />} />
              <Route path="/career-explorer" element={<CareerExplorer />} />
              <Route path="/market-trends" element={<MarketTrends />} />
              <Route path="/policy" element={<PolicyVisualizer />} />
              <Route path="/settings" element={<Settings />} />

              {/* Admin Routes */}
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<AdminOverview />} />
                <Route path="users" element={<UserManagement />} />
                <Route path="activity" element={<ActivityLogs />} />
                <Route path="sessions" element={<SessionsManagement />} />
                <Route path="security" element={<SecurityAlerts />} />
                <Route path="access" element={<AccessControl />} />
                <Route path="prompts" element={<ChatPrompts />} />
                <Route path="plans" element={<PlansAndLimits />} />
                {/* Retired pages — keep bookmarks working */}
                <Route path="documents" element={<Navigate to="/admin" replace />} />
                <Route path="settings" element={<Navigate to="/admin" replace />} />
                <Route path="audit" element={<Navigate to="/admin/activity" replace />} />
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
