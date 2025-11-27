import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Session } from "@supabase/supabase-js";

type ApplicationStatus = "applied" | "interview" | "offer" | "rejected";

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
}

export default function JobTracker() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [session, setSession] = useState<Session | null>(null);
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingApp, setEditingApp] = useState<JobApplication | null>(null);

  // Form state
  const [jobTitle, setJobTitle] = useState("");
  const [company, setCompany] = useState("");
  const [status, setStatus] = useState<ApplicationStatus>("applied");
  const [notes, setNotes] = useState("");
  const [reminderDate, setReminderDate] = useState("");

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
    }
  }, [session]);

  const fetchApplications = async () => {
    try {
      const { data, error } = await supabase
        .from("job_applications")
        .select("*")
        .order("applied_date", { ascending: false });

      if (error) throw error;
      setApplications((data || []) as JobApplication[]);
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

  const resetForm = () => {
    setJobTitle("");
    setCompany("");
    setStatus("applied");
    setNotes("");
    setReminderDate("");
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
      if (editingApp) {
        const { error } = await supabase
          .from("job_applications")
          .update({
            job_title: jobTitle,
            company,
            status,
            notes: notes || null,
            reminder_date: reminderDate || null,
          })
          .eq("id", editingApp.id);

        if (error) throw error;
        toast({
          title: "✓ Updated",
          description: "Application updated successfully",
        });
      } else {
        const { error } = await supabase.from("job_applications").insert({
          user_id: session?.user?.id,
          job_title: jobTitle,
          company,
          status,
          notes: notes || null,
          reminder_date: reminderDate || null,
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
    setDialogOpen(true);
  };

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

  const getStatusColor = (status: ApplicationStatus) => {
    switch (status) {
      case "applied":
        return "default";
      case "interview":
        return "default";
      case "offer":
        return "default";
      case "rejected":
        return "secondary";
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
          <button
            onClick={() => navigate("/")}
            className="text-2xl font-bold bg-gradient-hero bg-clip-text text-transparent"
          >
            ResumeAI
          </button>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => navigate("/")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Home
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

          {/* Header with Add Button */}
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold">Job Application Tracker</h1>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="hero" onClick={resetForm}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Application
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingApp ? "Edit Application" : "Add New Application"}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Input
                      placeholder="Job Title"
                      value={jobTitle}
                      onChange={(e) => setJobTitle(e.target.value)}
                    />
                  </div>
                  <div>
                    <Input
                      placeholder="Company"
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                    />
                  </div>
                  <div>
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
                    <Input
                      type="date"
                      placeholder="Reminder Date"
                      value={reminderDate}
                      onChange={(e) => setReminderDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <Textarea
                      placeholder="Notes (optional)"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="min-h-[100px]"
                    />
                  </div>
                  <Button type="submit" variant="hero" className="w-full">
                    {editingApp ? "Update" : "Add"} Application
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {/* Applications List */}
          <div className="space-y-4">
            {applications.length === 0 ? (
              <Card className="p-12 text-center">
                <Briefcase className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-xl font-semibold mb-2">No applications yet</h3>
                <p className="text-muted-foreground mb-4">
                  Start tracking your job applications to stay organized
                </p>
                <Button variant="hero" onClick={() => setDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Your First Application
                </Button>
              </Card>
            ) : (
              applications.map((app) => (
                <motion.div
                  key={app.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Card className="p-6 hover:shadow-elegant transition-shadow">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-xl font-bold">{app.job_title}</h3>
                          <Badge variant={getStatusColor(app.status)} className="capitalize">
                            {getStatusIcon(app.status)}
                            <span className="ml-1">{app.status}</span>
                          </Badge>
                        </div>
                        <p className="text-lg text-muted-foreground mb-3">{app.company}</p>
                        {app.notes && (
                          <p className="text-sm text-muted-foreground mb-3">{app.notes}</p>
                        )}
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            Applied: {new Date(app.applied_date).toLocaleDateString()}
                          </div>
                          {app.reminder_date && (
                            <div className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              Reminder: {new Date(app.reminder_date).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(app)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(app.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
