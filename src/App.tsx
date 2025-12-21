import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";

// Lazy load all pages for code splitting
const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Analysis = lazy(() => import("./pages/Analysis"));
const Editor = lazy(() => import("./pages/Editor"));
const Rewrite = lazy(() => import("./pages/Rewrite"));
const CoverLetter = lazy(() => import("./pages/CoverLetter"));
const JobTracker = lazy(() => import("./pages/JobTracker"));
const TemplateBuilder = lazy(() => import("./pages/TemplateBuilder"));
const ResumeBuilder = lazy(() => import("./pages/ResumeBuilder"));
const MyResumes = lazy(() => import("./pages/MyResumes"));
const InterviewPrep = lazy(() => import("./pages/InterviewPrep"));
const AustralianJobs = lazy(() => import("./pages/AustralianJobs"));
const JobMarketNews = lazy(() => import("./pages/JobMarketNews"));
const Settings = lazy(() => import("./pages/Settings"));
const SACareerHub = lazy(() => import("./pages/SACareerHub"));
const NotFound = lazy(() => import("./pages/NotFound"));
const AdminLayout = lazy(() => import("./pages/admin/AdminLayout"));
const AdminOverview = lazy(() => import("./pages/admin/AdminOverview"));
const UserManagement = lazy(() => import("./pages/admin/UserManagement"));
const ActivityLogs = lazy(() => import("./pages/admin/ActivityLogs"));
const SessionsManagement = lazy(() => import("./pages/admin/SessionsManagement"));
const SecurityAlerts = lazy(() => import("./pages/admin/SecurityAlerts"));
const AccessControl = lazy(() => import("./pages/admin/AccessControl"));
const AuditTrail = lazy(() => import("./pages/admin/AuditTrail"));
const AdminSettings = lazy(() => import("./pages/admin/AdminSettings"));

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

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider delayDuration={0}>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/upload" element={<ResumeBuilder />} />
            <Route path="/analysis" element={<Analysis />} />
            <Route path="/editor" element={<Editor />} />
            <Route path="/rewrite" element={<Rewrite />} />
            <Route path="/cover-letter" element={<CoverLetter />} />
            <Route path="/tracker" element={<JobTracker />} />
            <Route path="/templates" element={<TemplateBuilder />} />
            <Route path="/builder" element={<ResumeBuilder />} />
            <Route path="/my-resumes" element={<MyResumes />} />
            <Route path="/interview-prep" element={<InterviewPrep />} />
            <Route path="/job-news" element={<AustralianJobs />} />
            <Route path="/au-jobs" element={<AustralianJobs />} />
            <Route path="/job-market-news" element={<JobMarketNews />} />
            <Route path="/sa-career-hub" element={<SACareerHub />} />
            <Route path="/settings" element={<Settings />} />
            
            {/* Admin Routes */}
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminOverview />} />
              <Route path="users" element={<UserManagement />} />
              <Route path="activity" element={<ActivityLogs />} />
              <Route path="sessions" element={<SessionsManagement />} />
              <Route path="security" element={<SecurityAlerts />} />
              <Route path="access" element={<AccessControl />} />
              <Route path="audit" element={<AuditTrail />} />
              <Route path="settings" element={<AdminSettings />} />
            </Route>
            
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
