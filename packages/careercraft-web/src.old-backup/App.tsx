import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { HorusProvider } from "@/providers/HorusProvider";

// Lazy load all pages for code splitting
const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
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
const ContactUs = lazy(() => import("./pages/ContactUs"));
const AboutUs = lazy(() => import("./pages/AboutUs"));
const Privacy = lazy(() => import("./pages/Privacy"));
const NotFound = lazy(() => import("./pages/NotFound"));
const TryUs = lazy(() => import("./pages/TryUs"));

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

const AnimatedRoutes = () => {
  const location = useLocation();

  return (
    <div className="cc-app-shell">
      <div className="cc-ambient-lights" aria-hidden="true" />
      <AnimatePresence mode="wait">
        <motion.div
          key={location.pathname}
          className="cc-route-stage"
          initial={{ opacity: 0, y: 14, scale: 0.995 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.995 }}
          transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
        >
          <Routes location={location}>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/reset-password" element={<ResetPassword />} />
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
            <Route path="/settings" element={<Settings />} />
            <Route path="/contact" element={<ContactUs />} />
            <Route path="/about" element={<AboutUs />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/try" element={<TryUs />} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <HorusProvider>
      <TooltipProvider delayDuration={0}>
        <Toaster />
        <Sonner />
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Suspense fallback={<PageLoader />}>
            <AnimatedRoutes />
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </HorusProvider>
  </QueryClientProvider>
);

export default App;
