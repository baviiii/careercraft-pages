import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
// Upload page removed - consolidated into ResumeBuilder
import Analysis from "./pages/Analysis";
import Editor from "./pages/Editor";
import Rewrite from "./pages/Rewrite";
import CoverLetter from "./pages/CoverLetter";
import JobTracker from "./pages/JobTracker";
import TemplateBuilder from "./pages/TemplateBuilder";
import ResumeBuilder from "./pages/ResumeBuilder";
import NotFound from "./pages/NotFound";
import AdminLayout from "./pages/admin/AdminLayout";
import AdminOverview from "./pages/admin/AdminOverview";
import UserManagement from "./pages/admin/UserManagement";
import ActivityLogs from "./pages/admin/ActivityLogs";
import SessionsManagement from "./pages/admin/SessionsManagement";
import SecurityAlerts from "./pages/admin/SecurityAlerts";
import AccessControl from "./pages/admin/AccessControl";
import AuditTrail from "./pages/admin/AuditTrail";
import AdminSettings from "./pages/admin/AdminSettings";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/dashboard" element={<Dashboard />} />
          {/* /upload redirects to /builder */}
          <Route path="/upload" element={<ResumeBuilder />} />
          <Route path="/analysis" element={<Analysis />} />
          <Route path="/editor" element={<Editor />} />
          <Route path="/rewrite" element={<Rewrite />} />
          <Route path="/cover-letter" element={<CoverLetter />} />
          <Route path="/tracker" element={<JobTracker />} />
          <Route path="/templates" element={<TemplateBuilder />} />
          <Route path="/builder" element={<ResumeBuilder />} />
          
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
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
