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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background/95 backdrop-blur sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <button onClick={() => navigate("/dashboard")} className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center">
              <Briefcase className="w-4 h-4 text-white" />
            </div>
            <span className="text-xl font-bold">CareerCraft</span>
          </button>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Dashboard
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
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <Card className="p-4">
              <p className="text-sm text-muted-foreground mb-1">Total</p>
              <p className="text-3xl font-bold">{stats.total}</p>
            </Card>
            <Card className="p-4">
              <p className="text-sm text-muted-foreground mb-1">Applied</p>
              <p className="text-3xl font-bold text-primary">{stats.applied}</p>
            </Card>
            <Card className="p-4">
              <p className="text-sm text-muted-foreground mb-1">Interview</p>
              <p className="text-3xl font-bold text-success">{stats.interview}</p>
            </Card>
            <Card className="p-4">
              <p className="text-sm text-muted-foreground mb-1">Offers</p>
              <p className="text-3xl font-bold text-primary">{stats.offer}</p>
            </Card>
          </div>

          {/* Header with Search and Add Button */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <h1 className="text-3xl font-bold">Job Application Tracker</h1>
            <div className="flex flex-wrap gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:flex-none">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search jobs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-full sm:w-48"
                />
              </div>
              <Select value={statusFilter} onValueChange={(val: ApplicationStatus | "all") => setStatusFilter(val)}>
                <SelectTrigger className="w-32">
                  <Filter className="w-4 h-4 mr-2" />
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
                  <Button variant="hero" onClick={resetForm}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Job
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>
                      {editingApp ? "Edit Application" : "Add New Application"}
                    </DialogTitle>
                    <DialogDescription>
                      Track your job application with all the details
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
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
                        <Select value={jobType} onValueChange={(val: JobType) => setJobType(val)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
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
                          <Select value={selectedResumeId} onValueChange={setSelectedResumeId}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select resume" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="">None</SelectItem>
                              {resumes.map(r => (
                                <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-sm mb-1 block">Cover Letter</Label>
                          <Select value={selectedCoverLetterId} onValueChange={setSelectedCoverLetterId}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select cover letter" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="">None</SelectItem>
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

                    <Button type="submit" variant="hero" className="w-full">
                      {editingApp ? "Update" : "Add"} Application
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Applications List */}
          <div className="space-y-4">
            {filteredApplications.length === 0 ? (
              <Card className="p-8 sm:p-12 text-center">
                <Briefcase className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg sm:text-xl font-semibold mb-2">
                  {applications.length === 0 ? "No applications yet" : "No matching applications"}
                </h3>
                <p className="text-sm sm:text-base text-muted-foreground mb-4 px-4">
                  {applications.length === 0 
                    ? "Start tracking your job applications to stay organized"
                    : "Try adjusting your search or filters"}
                </p>
                {applications.length === 0 && (
                  <Button variant="hero" onClick={() => setDialogOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Your First Application
                  </Button>
                )}
              </Card>
            ) : (
              <AnimatePresence>
                {filteredApplications.map((app) => (
                  <motion.div
                    key={app.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    layout
                  >
                    <Card className="p-6 hover:shadow-elegant transition-all hover:border-primary/20">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          {/* Header */}
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <h3 className="text-xl font-bold">{app.job_title}</h3>
                            <Badge variant={getStatusColor(app.status)} className="capitalize">
                              {getStatusIcon(app.status)}
                              <span className="ml-1">{app.status}</span>
                            </Badge>
                            {app.job_type && (
                              <Badge variant="outline" className="capitalize">
                                {app.job_type}
                              </Badge>
                            )}
                          </div>
                          
                          {/* Company & Location */}
                          <div className="flex flex-wrap items-center gap-3 mb-3">
                            <p className="text-lg font-medium text-muted-foreground flex items-center gap-1">
                              <Building className="w-4 h-4" />
                              {app.company}
                            </p>
                            {app.location && (
                              <p className="text-sm text-muted-foreground flex items-center gap-1">
                                <MapPin className="w-4 h-4" />
                                {app.location}
                              </p>
                            )}
                            {app.salary_range && (
                              <p className="text-sm text-muted-foreground flex items-center gap-1">
                                <DollarSign className="w-4 h-4" />
                                {app.salary_range}
                              </p>
                            )}
                          </div>

                          {/* Linked Documents */}
                          {(app.resume_id || app.cover_letter_id) && (
                            <div className="flex flex-wrap gap-2 mb-3">
                              {app.resume_id && getResumeName(app.resume_id) && (
                                <Badge variant="secondary" className="text-xs">
                                  <FileText className="w-3 h-3 mr-1" />
                                  {getResumeName(app.resume_id)}
                                </Badge>
                              )}
                              {app.cover_letter_id && (
                                <Badge variant="secondary" className="text-xs">
                                  <Mail className="w-3 h-3 mr-1" />
                                  Cover Letter
                                </Badge>
                              )}
                            </div>
                          )}

                          {/* Notes preview */}
                          {app.notes && (
                            <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                              {app.notes}
                            </p>
                          )}

                          {/* Footer info */}
                          <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              Applied: {new Date(app.applied_date).toLocaleDateString()}
                            </div>
                            {app.reminder_date && (
                              <div className="flex items-center gap-1 text-primary">
                                <Clock className="w-3 h-3" />
                                Reminder: {new Date(app.reminder_date).toLocaleDateString()}
                              </div>
                            )}
                            {app.job_url && (
                              <a 
                                href={app.job_url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 hover:text-primary transition-colors"
                              >
                                <ExternalLink className="w-3 h-3" />
                                View Posting
                              </a>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="w-4 h-4" />
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
