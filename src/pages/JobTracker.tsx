import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Plus,
  Briefcase,
  Calendar,
  ArrowLeft,
  Trash2,
  Edit,
  CheckCircle2,
  Clock,
  TrendingUp,
  XCircle,
  FileText,
  Mail,
  Link as LinkIcon,
  MapPin,
  DollarSign,
  Building,
  ExternalLink,
  Search,
  Filter,
  MoreVertical,
  Eye,
  ChevronDown,
  Sparkles,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Session } from "@supabase/supabase-js";

type ApplicationStatus = "applied" | "interview" | "offer" | "rejected";
type JobType = "full-time" | "part-time" | "contract" | "remote" | "hybrid";

interface JobApplication {
  id: string;
  job_title: string;
  company: string;
  status: ApplicationStatus;
  notes: string | null;
  reminder_date: string | null;
  applied_date: string;
  created_at: string;
  updated_at: string;
  // New fields
  resume_id: string | null;
  cover_letter_id: string | null;
  job_description: string | null;
  job_url: string | null;
  salary_range: string | null;
  location: string | null;
  job_type: string | null;
}

interface Resume {
  id: string;
  name: string;
}

interface CoverLetter {
  id: string;
  content: string;
  created_at: string;
}

export default function JobTracker() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [session, setSession] = useState<Session | null>(null);
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingApp, setEditingApp] = useState<JobApplication | null>(null);
  const [viewingApp, setViewingApp] = useState<JobApplication | null>(null);

  // Form state
  const [jobTitle, setJobTitle] = useState("");
  const [company, setCompany] = useState("");
  const [status, setStatus] = useState<ApplicationStatus>("applied");
  const [notes, setNotes] = useState("");
  const [reminderDate, setReminderDate] = useState("");
  
  // New form fields
  const [jobDescription, setJobDescription] = useState("");
  const [jobUrl, setJobUrl] = useState("");
  const [salaryRange, setSalaryRange] = useState("");
  const [jobLocation, setJobLocation] = useState("");
  const [jobType, setJobType] = useState<JobType | "">("");
  const [selectedResumeId, setSelectedResumeId] = useState<string>("");
  const [selectedCoverLetterId, setSelectedCoverLetterId] = useState<string>("");
  
  // Data for dropdowns
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [coverLetters, setCoverLetters] = useState<CoverLetter[]>([]);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | "all">("all");
  const [activeTab, setActiveTab] = useState("all");

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        if (!session) {
          navigate("/auth");
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (!session) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (session) {
      fetchApplications();
      fetchResumes();
      fetchCoverLetters();
    }
  }, [session]);

  const fetchApplications = async () => {
    try {
      const { data, error } = await supabase
        .from("job_applications")
        .select("*")
        .order("applied_date", { ascending: false });

      if (error) throw error;
      setApplications((data || []) as unknown as JobApplication[]);
    } catch (error) {
      toast({
        title: "Error loading applications",
        description: error instanceof Error ? error.message : "Failed to load data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchResumes = async () => {
    try {
      const { data, error } = await supabase
        .from("resumes")
        .select("id, name")
        .order("updated_at", { ascending: false });
      if (!error && data) setResumes(data);
    } catch (e) {
      console.error("Error fetching resumes:", e);
    }
  };

  const fetchCoverLetters = async () => {
    try {
      const { data, error } = await supabase
        .from("cover_letters")
        .select("id, content, created_at")
        .order("created_at", { ascending: false });
      if (!error && data) setCoverLetters(data);
    } catch (e) {
      console.error("Error fetching cover letters:", e);
    }
  };

  const resetForm = () => {
    setJobTitle("");
    setCompany("");
    setStatus("applied");
    setNotes("");
    setReminderDate("");
    setJobDescription("");
    setJobUrl("");
    setSalaryRange("");
    setJobLocation("");
    setJobType("");
    setSelectedResumeId("");
    setSelectedCoverLetterId("");
    setEditingApp(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!jobTitle || !company) {
      toast({
        title: "Missing fields",
        description: "Please fill in job title and company",
        variant: "destructive",
      });
      return;
    }

    try {
      const applicationData = {
        job_title: jobTitle,
        company,
        status,
        notes: notes || null,
        reminder_date: reminderDate || null,
        job_description: jobDescription || null,
        job_url: jobUrl || null,
        salary_range: salaryRange || null,
        location: jobLocation || null,
        job_type: jobType || null,
        resume_id: selectedResumeId || null,
        cover_letter_id: selectedCoverLetterId || null,
      };

      if (editingApp) {
        const { error } = await supabase
          .from("job_applications")
          .update(applicationData)
          .eq("id", editingApp.id);

        if (error) throw error;
        toast({
          title: "✓ Updated",
          description: "Application updated successfully",
        });
      } else {
        const { error } = await supabase.from("job_applications").insert({
          user_id: session?.user?.id,
          ...applicationData,
        });

        if (error) throw error;
        toast({
          title: "✓ Added",
          description: "Application added to tracker",
        });
      }

      fetchApplications();
      setDialogOpen(false);
      resetForm();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("job_applications")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast({
        title: "✓ Deleted",
        description: "Application removed from tracker",
      });
      fetchApplications();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (app: JobApplication) => {
    setEditingApp(app);
    setJobTitle(app.job_title);
    setCompany(app.company);
    setStatus(app.status);
    setNotes(app.notes || "");
    setReminderDate(app.reminder_date ? app.reminder_date.split("T")[0] : "");
    setJobDescription(app.job_description || "");
    setJobUrl(app.job_url || "");
    setSalaryRange(app.salary_range || "");
    setJobLocation(app.location || "");
    setJobType((app.job_type as JobType) || "");
    setSelectedResumeId(app.resume_id || "");
    setSelectedCoverLetterId(app.cover_letter_id || "");
    setDialogOpen(true);
  };

  // Get linked resume name
  const getResumeName = (resumeId: string | null) => {
    if (!resumeId) return null;
    return resumes.find(r => r.id === resumeId)?.name;
  };

  // Get linked cover letter preview
  const getCoverLetterPreview = (clId: string | null) => {
    if (!clId) return null;
    const cl = coverLetters.find(c => c.id === clId);
    return cl ? cl.content.substring(0, 50) + "..." : null;
  };

  // Filter applications
  const filteredApplications = applications.filter(app => {
    const matchesSearch = searchQuery === "" || 
      app.job_title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.company.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || app.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusIcon = (status: ApplicationStatus) => {
    switch (status) {
      case "applied":
        return <Clock className="w-4 h-4" />;
      case "interview":
        return <TrendingUp className="w-4 h-4" />;
      case "offer":
        return <CheckCircle2 className="w-4 h-4" />;
      case "rejected":
        return <XCircle className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status: ApplicationStatus): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case "applied":
        return "secondary";
      case "interview":
        return "default";
      case "offer":
        return "default";
      case "rejected":
        return "destructive";
    }
  };

  const stats = {
    total: applications.length,
    applied: applications.filter((a) => a.status === "applied").length,
    interview: applications.filter((a) => a.status === "interview").length,
    offer: applications.filter((a) => a.status === "offer").length,
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-lg text-muted-foreground">Loading tracker...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Premium Header */}
      <header className="border-b border-slate-200/60 bg-white/95 backdrop-blur-xl sticky top-0 z-50 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
        <div className="container mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <button onClick={() => navigate("/dashboard")} className="flex items-center gap-3 group cursor-pointer">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:shadow-xl group-hover:shadow-blue-500/30 transition-all duration-300 group-hover:scale-105">
              <Briefcase className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div className="hidden sm:block">
              <span className="font-display text-xl font-semibold text-slate-900 tracking-tight">Horus</span>
              <p className="text-xs text-slate-500 font-medium">Intelligence</p>
            </div>
          </button>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => navigate("/dashboard")} className="hover:bg-slate-50 cursor-pointer">
              <ArrowLeft className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Dashboard</span>
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-6xl mx-auto"
        >
          {/* Premium Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-5 mb-10 sm:mb-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0 }}
              whileHover={{ y: -4 }}
              className="group cursor-default"
            >
              <Card className="relative p-5 sm:p-6 bg-white border border-slate-200/60 hover:border-slate-300 rounded-2xl sm:rounded-3xl transition-all duration-500 shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)]">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-slate-500 to-slate-600 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-t-2xl sm:rounded-t-3xl" />
                <p className="text-xs sm:text-sm text-slate-500 font-semibold uppercase tracking-widest mb-2">Total</p>
                <p className="font-display text-4xl sm:text-5xl font-semibold text-slate-900 tabular-nums tracking-tight">{stats.total}</p>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              whileHover={{ y: -4 }}
              className="group cursor-default"
            >
              <Card className="relative p-5 sm:p-6 bg-white border border-slate-200/60 hover:border-blue-300 rounded-2xl sm:rounded-3xl transition-all duration-500 shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgba(59,130,246,0.12)]">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-cyan-500 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-t-2xl sm:rounded-t-3xl" />
                <p className="text-xs sm:text-sm text-slate-500 font-semibold uppercase tracking-widest mb-2">Applied</p>
                <p className="font-display text-4xl sm:text-5xl font-semibold text-blue-600 tabular-nums tracking-tight group-hover:text-blue-700 transition-colors duration-300">{stats.applied}</p>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              whileHover={{ y: -4 }}
              className="group cursor-default"
            >
              <Card className="relative p-5 sm:p-6 bg-white border border-slate-200/60 hover:border-emerald-300 rounded-2xl sm:rounded-3xl transition-all duration-500 shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgba(16,185,129,0.12)]">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-t-2xl sm:rounded-t-3xl" />
                <p className="text-xs sm:text-sm text-slate-500 font-semibold uppercase tracking-widest mb-2">Interview</p>
                <p className="font-display text-4xl sm:text-5xl font-semibold text-emerald-600 tabular-nums tracking-tight group-hover:text-emerald-700 transition-colors duration-300">{stats.interview}</p>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              whileHover={{ y: -4 }}
              className="group cursor-default"
            >
              <Card className="relative p-5 sm:p-6 bg-white border border-slate-200/60 hover:border-violet-300 rounded-2xl sm:rounded-3xl transition-all duration-500 shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgba(139,92,246,0.12)]">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-violet-500 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-t-2xl sm:rounded-t-3xl" />
                <p className="text-xs sm:text-sm text-slate-500 font-semibold uppercase tracking-widest mb-2">Offers</p>
                <p className="font-display text-4xl sm:text-5xl font-semibold text-violet-600 tabular-nums tracking-tight group-hover:text-violet-700 transition-colors duration-300">{stats.offer}</p>
              </Card>
            </motion.div>
          </div>

          {/* Premium Header Section */}
          <div className="flex flex-col gap-6 mb-8 sm:mb-10">
            <div className="flex items-center gap-4">
              <h1 className="font-display text-4xl sm:text-5xl font-semibold text-slate-900 tracking-tight">
                Applications
              </h1>
              <div className="flex-1 h-[1px] bg-gradient-to-r from-slate-300 via-slate-200 to-transparent" />
            </div>

            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
              <div className="relative flex-1 sm:max-w-xs">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search jobs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-11 border-slate-200/60 hover:border-slate-300 focus:border-blue-500 rounded-xl transition-colors"
                />
              </div>
              <Select value={statusFilter} onValueChange={(val: ApplicationStatus | "all") => setStatusFilter(val)}>
                <SelectTrigger className="w-full sm:w-40 h-11 border-slate-200/60 hover:border-slate-300 rounded-xl">
                  <Filter className="w-4 h-4 mr-2 text-slate-500" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="applied">Applied</SelectItem>
                  <SelectItem value="interview">Interview</SelectItem>
                  <SelectItem value="offer">Offer</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    onClick={resetForm}
                    className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 h-11 rounded-xl shadow-[0_8px_30px_rgb(37,99,235,0.2)] hover:shadow-[0_20px_60px_rgb(37,99,235,0.3)] transition-all duration-500 cursor-pointer"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Application
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl">
                  <DialogHeader>
                    <DialogTitle className="font-display text-2xl sm:text-3xl font-semibold tracking-tight">
                      {editingApp ? "Edit Application" : "Add New Application"}
                    </DialogTitle>
                    <DialogDescription className="text-base text-slate-600">
                      Track your job application with all the details
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
                    {/* Basic Info */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm mb-1 block">Job Title *</Label>
                        <Input
                          placeholder="e.g., Software Engineer"
                          value={jobTitle}
                          onChange={(e) => setJobTitle(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label className="text-sm mb-1 block">Company *</Label>
                        <Input
                          placeholder="e.g., Google"
                          value={company}
                          onChange={(e) => setCompany(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm mb-1 block">Status</Label>
                        <Select value={status} onValueChange={(val: ApplicationStatus) => setStatus(val)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="applied">Applied</SelectItem>
                            <SelectItem value="interview">Interview</SelectItem>
                            <SelectItem value="offer">Offer</SelectItem>
                            <SelectItem value="rejected">Rejected</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-sm mb-1 block">Job Type</Label>
                        <Select value={jobType || "none"} onValueChange={(val) => setJobType(val === "none" ? "" : val as JobType)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            <SelectItem value="full-time">Full-time</SelectItem>
                            <SelectItem value="part-time">Part-time</SelectItem>
                            <SelectItem value="contract">Contract</SelectItem>
                            <SelectItem value="remote">Remote</SelectItem>
                            <SelectItem value="hybrid">Hybrid</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm mb-1 block">Location</Label>
                        <Input
                          placeholder="e.g., San Francisco, CA"
                          value={jobLocation}
                          onChange={(e) => setJobLocation(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label className="text-sm mb-1 block">Salary Range</Label>
                        <Input
                          placeholder="e.g., $100k - $150k"
                          value={salaryRange}
                          onChange={(e) => setSalaryRange(e.target.value)}
                        />
                      </div>
                    </div>

                    <div>
                      <Label className="text-sm mb-1 block">Job URL</Label>
                      <Input
                        placeholder="https://..."
                        value={jobUrl}
                        onChange={(e) => setJobUrl(e.target.value)}
                      />
                    </div>

                    {/* Linked Documents */}
                    <div className="border-t pt-4">
                      <p className="text-sm font-medium mb-3 flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        Linked Documents
                      </p>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-sm mb-1 block">Resume Used</Label>
                          <Select value={selectedResumeId || "none"} onValueChange={(val) => setSelectedResumeId(val === "none" ? "" : val)}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select resume" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">None</SelectItem>
                              {resumes.map(r => (
                                <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-sm mb-1 block">Cover Letter</Label>
                          <Select value={selectedCoverLetterId || "none"} onValueChange={(val) => setSelectedCoverLetterId(val === "none" ? "" : val)}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select cover letter" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">None</SelectItem>
                              {coverLetters.map(cl => (
                                <SelectItem key={cl.id} value={cl.id}>
                                  {new Date(cl.created_at).toLocaleDateString()} - {cl.content.substring(0, 30)}...
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    {/* Dates */}
                    <div>
                      <Label className="text-sm mb-1 block">Follow-up Reminder</Label>
                      <Input
                        type="date"
                        value={reminderDate}
                        onChange={(e) => setReminderDate(e.target.value)}
                      />
                    </div>

                    {/* Job Description */}
                    <div>
                      <Label className="text-sm mb-1 block">Job Description</Label>
                      <Textarea
                        placeholder="Paste the job description here..."
                        value={jobDescription}
                        onChange={(e) => setJobDescription(e.target.value)}
                        className="min-h-[100px]"
                      />
                    </div>

                    {/* Notes */}
                    <div>
                      <Label className="text-sm mb-1 block">Notes</Label>
                      <Textarea
                        placeholder="Any additional notes..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="min-h-[80px]"
                      />
                    </div>

                    <Button
                      type="submit"
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-6 h-auto rounded-xl shadow-[0_8px_30px_rgb(37,99,235,0.2)] hover:shadow-[0_20px_60px_rgb(37,99,235,0.3)] transition-all duration-500"
                    >
                      {editingApp ? "Update Application" : "Add Application"}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Premium Applications List */}
          <div className="space-y-4 sm:space-y-5">
            {filteredApplications.length === 0 ? (
              <Card className="p-10 sm:p-16 text-center border border-slate-200/60 rounded-3xl shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
                  <Briefcase className="w-10 h-10 text-slate-400" />
                </div>
                <h3 className="font-display text-2xl sm:text-3xl font-semibold text-slate-900 mb-3">
                  {applications.length === 0 ? "No applications yet" : "No matching applications"}
                </h3>
                <p className="text-base sm:text-lg text-slate-600 mb-8 max-w-md mx-auto">
                  {applications.length === 0
                    ? "Start tracking your job applications to stay organized and never miss a follow-up"
                    : "Try adjusting your search or filters to find what you're looking for"}
                </p>
                {applications.length === 0 && (
                  <Button
                    onClick={() => setDialogOpen(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-6 h-auto rounded-xl shadow-[0_8px_30px_rgb(37,99,235,0.2)] hover:shadow-[0_20px_60px_rgb(37,99,235,0.3)] transition-all duration-500"
                  >
                    <Plus className="w-5 h-5 mr-2" />
                    Add Your First Application
                  </Button>
                )}
              </Card>
            ) : (
              <AnimatePresence>
                {filteredApplications.map((app, index) => (
                  <motion.div
                    key={app.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ delay: index * 0.05 }}
                    layout
                    whileHover={{ y: -2 }}
                  >
                    <Card className="p-5 sm:p-7 border border-slate-200/60 hover:border-slate-300 rounded-2xl sm:rounded-3xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)] transition-all duration-500 group cursor-pointer">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          {/* Header */}
                          <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                            <h3 className="font-display text-xl sm:text-2xl font-semibold text-slate-900 tracking-tight">{app.job_title}</h3>
                            <Badge
                              variant={getStatusColor(app.status)}
                              className="capitalize font-semibold text-xs px-2.5 py-1 rounded-lg"
                            >
                              {getStatusIcon(app.status)}
                              <span className="ml-1.5">{app.status}</span>
                            </Badge>
                            {app.job_type && (
                              <Badge variant="outline" className="capitalize font-medium text-xs px-2.5 py-1 rounded-lg border-slate-300">
                                {app.job_type}
                              </Badge>
                            )}
                          </div>
                          
                          {/* Company & Location */}
                          <div className="flex flex-wrap items-center gap-3 sm:gap-4 mb-4">
                            <p className="text-base sm:text-lg font-semibold text-slate-700 flex items-center gap-2">
                              <Building className="w-4 h-4 sm:w-5 sm:h-5 text-slate-500" />
                              {app.company}
                            </p>
                            {app.location && (
                              <p className="text-sm sm:text-base text-slate-600 flex items-center gap-1.5">
                                <MapPin className="w-4 h-4 text-slate-400" />
                                {app.location}
                              </p>
                            )}
                            {app.salary_range && (
                              <p className="text-sm sm:text-base text-emerald-600 font-medium flex items-center gap-1.5">
                                <DollarSign className="w-4 h-4" />
                                {app.salary_range}
                              </p>
                            )}
                          </div>

                          {/* Linked Documents */}
                          {(app.resume_id || app.cover_letter_id) && (
                            <div className="flex flex-wrap gap-2 mb-4">
                              {app.resume_id && getResumeName(app.resume_id) && (
                                <Badge variant="secondary" className="text-xs font-medium px-2.5 py-1 rounded-lg">
                                  <FileText className="w-3 h-3 mr-1.5" />
                                  {getResumeName(app.resume_id)}
                                </Badge>
                              )}
                              {app.cover_letter_id && (
                                <Badge variant="secondary" className="text-xs font-medium px-2.5 py-1 rounded-lg">
                                  <Mail className="w-3 h-3 mr-1.5" />
                                  Cover Letter
                                </Badge>
                              )}
                            </div>
                          )}

                          {/* Notes preview */}
                          {app.notes && (
                            <p className="text-sm sm:text-base text-slate-600 mb-4 line-clamp-2 leading-relaxed">
                              {app.notes}
                            </p>
                          )}

                          {/* Footer info */}
                          <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs sm:text-sm text-slate-500">
                            <div className="flex items-center gap-1.5 font-medium">
                              <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                              {new Date(app.applied_date).toLocaleDateString()}
                            </div>
                            {app.reminder_date && (
                              <div className="flex items-center gap-1.5 text-blue-600 font-medium">
                                <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                {new Date(app.reminder_date).toLocaleDateString()}
                              </div>
                            )}
                            {app.job_url && (
                              <a
                                href={app.job_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1.5 hover:text-blue-600 transition-colors font-medium"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <ExternalLink className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                View Posting
                              </a>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-9 w-9 p-0 rounded-xl hover:bg-slate-100">
                              <MoreVertical className="w-5 h-5 text-slate-600" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setViewingApp(app)}>
                              <Eye className="w-4 h-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEdit(app)}>
                              <Edit className="w-4 h-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            {app.job_url && (
                              <DropdownMenuItem onClick={() => window.open(app.job_url!, '_blank')}>
                                <ExternalLink className="w-4 h-4 mr-2" />
                                Open Job URL
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem 
                              onClick={() => handleDelete(app.id)}
                              className="text-destructive"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>
        </motion.div>
      </div>

      {/* View Details Dialog */}
      <Dialog open={!!viewingApp} onOpenChange={() => setViewingApp(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          {viewingApp && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  {viewingApp.job_title}
                  <Badge variant={getStatusColor(viewingApp.status)} className="capitalize">
                    {viewingApp.status}
                  </Badge>
                </DialogTitle>
                <DialogDescription className="flex items-center gap-2">
                  <Building className="w-4 h-4" />
                  {viewingApp.company}
                  {viewingApp.location && (
                    <>
                      <span>•</span>
                      <MapPin className="w-4 h-4" />
                      {viewingApp.location}
                    </>
                  )}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {/* Quick Info */}
                <div className="grid grid-cols-2 gap-4">
                  {viewingApp.job_type && (
                    <div>
                      <p className="text-sm text-muted-foreground">Job Type</p>
                      <p className="font-medium capitalize">{viewingApp.job_type}</p>
                    </div>
                  )}
                  {viewingApp.salary_range && (
                    <div>
                      <p className="text-sm text-muted-foreground">Salary Range</p>
                      <p className="font-medium">{viewingApp.salary_range}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-muted-foreground">Applied Date</p>
                    <p className="font-medium">{new Date(viewingApp.applied_date).toLocaleDateString()}</p>
                  </div>
                  {viewingApp.reminder_date && (
                    <div>
                      <p className="text-sm text-muted-foreground">Reminder</p>
                      <p className="font-medium">{new Date(viewingApp.reminder_date).toLocaleDateString()}</p>
                    </div>
                  )}
                </div>

                {/* Linked Documents */}
                {(viewingApp.resume_id || viewingApp.cover_letter_id) && (
                  <div className="border-t pt-4">
                    <p className="text-sm font-medium mb-2">Linked Documents</p>
                    <div className="flex gap-2">
                      {viewingApp.resume_id && getResumeName(viewingApp.resume_id) && (
                        <Badge variant="secondary">
                          <FileText className="w-3 h-3 mr-1" />
                          {getResumeName(viewingApp.resume_id)}
                        </Badge>
                      )}
                      {viewingApp.cover_letter_id && (
                        <Badge variant="secondary">
                          <Mail className="w-3 h-3 mr-1" />
                          Cover Letter Attached
                        </Badge>
                      )}
                    </div>
                  </div>
                )}

                {/* Job Description */}
                {viewingApp.job_description && (
                  <div className="border-t pt-4">
                    <p className="text-sm font-medium mb-2">Job Description</p>
                    <ScrollArea className="h-[200px]">
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {viewingApp.job_description}
                      </p>
                    </ScrollArea>
                  </div>
                )}

                {/* Notes */}
                {viewingApp.notes && (
                  <div className="border-t pt-4">
                    <p className="text-sm font-medium mb-2">Notes</p>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {viewingApp.notes}
                    </p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-4 border-t">
                  {viewingApp.job_url && (
                    <Button variant="outline" onClick={() => window.open(viewingApp.job_url!, '_blank')}>
                      <ExternalLink className="w-4 h-4 mr-2" />
                      View Job Posting
                    </Button>
                  )}
                  <Button variant="outline" onClick={() => {
                    setViewingApp(null);
                    handleEdit(viewingApp);
                  }}>
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
