import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  useUserProfile,
  INDUSTRIES,
  CAREER_LEVELS,
  YEARS_OF_EXPERIENCE,
  EMPLOYMENT_STATUS,
  WORK_ARRANGEMENTS,
  JOB_CHANGE_TIMELINE,
  SKILL_PROFICIENCY,
  SKILL_CATEGORIES,
  COMPANY_SIZES,
  JOB_TYPES,
  TIMEZONES,
  UserSkill,
} from "@/hooks/useUserProfile";
import {
  User,
  Briefcase,
  Bell,
  Lock,
  ChevronLeft,
  Save,
  Loader2,
  Camera,
  Plus,
  X,
  Trash2,
  Download,
  Mail,
  Building,
  Target,
  Award,
  GraduationCap,
  Menu,
  LogOut,
  AlertTriangle,
  ExternalLink,
} from "lucide-react";
import { Session } from "@supabase/supabase-js";

const APP_BASE_URL =
  (import.meta.env.VITE_PUBLIC_APP_URL as string | undefined)?.trim().replace(/\/+$/, "") ||
  window.location.origin;

// Sidebar navigation items - simplified to what we actually support
const SETTINGS_SECTIONS = [
  { id: "profile", label: "Profile", icon: User, description: "Personal info" },
  { id: "career", label: "Career", icon: Briefcase, description: "Job & skills" },
  { id: "notifications", label: "Notifications", icon: Bell, description: "Email alerts" },
  { id: "security", label: "Account", icon: Lock, description: "Password & data" },
];

export default function Settings() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [session, setSession] = useState<Session | null>(null);
  const [activeSection, setActiveSection] = useState("profile");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Profile hook
  const {
    loading,
    saving,
    profile,
    preferences,
    skills,
    certifications,
    completeness,
    updateProfile,
    updatePreferences,
    addSkill,
    updateSkill,
    deleteSkill,
    addCertification,
    deleteCertification,
    deleteAccount,
    exportData,
    defaults,
  } = useUserProfile();

  // Local form states
  const [profileForm, setProfileForm] = useState({
    full_name: "",
    headline: "",
    bio: "",
    phone: "",
    location_city: "",
    location_country: "",
    timezone: "Australia/Sydney",
  });

  const [careerForm, setCareerForm] = useState({
    current_job_title: "",
    current_company: "",
    years_of_experience: "",
    industry: "",
    career_level: "",
    employment_status: "employed",
    target_job_titles: [] as string[],
    target_companies: [] as string[],
    desired_salary_min: "",
    desired_salary_max: "",
    work_arrangement: [] as string[],
    preferred_locations: [] as string[],
    job_change_timeline: "",
  });

  const [newSkill, setNewSkill] = useState({
    skill_name: "",
    skill_id: null as string | null,
    proficiency: "intermediate" as string,
    category: "technical" as string,
    is_primary: false,
  });

  const [newCert, setNewCert] = useState({
    name: "",
    issuer: "",
    issue_date: "",
    expiry_date: "",
    credential_url: "",
  });

  const [newTargetTitle, setNewTargetTitle] = useState("");
  const [newTargetCompany, setNewTargetCompany] = useState("");
  const [newLocation, setNewLocation] = useState("");
  const [showSkillDialog, setShowSkillDialog] = useState(false);
  const [showCertDialog, setShowCertDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  // Auth check
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setSession(session);
      if (!session) navigate("/auth");
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (!session) navigate("/auth");
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  // Sync profile data to form
  useEffect(() => {
    if (profile) {
      setProfileForm({
        full_name: profile.full_name || "",
        headline: profile.headline || "",
        bio: profile.bio || "",
        phone: profile.phone || "",
        location_city: profile.location_city || "",
        location_country: profile.location_country || "",
        timezone: profile.timezone || "Australia/Sydney",
      });
      setCareerForm({
        current_job_title: profile.current_job_title || "",
        current_company: profile.current_company || "",
        years_of_experience: profile.years_of_experience || "",
        industry: profile.industry || "",
        career_level: profile.career_level || "",
        employment_status: profile.employment_status || "employed",
        target_job_titles: profile.target_job_titles || [],
        target_companies: profile.target_companies || [],
        desired_salary_min: profile.desired_salary_min?.toString() || "",
        desired_salary_max: profile.desired_salary_max?.toString() || "",
        work_arrangement: profile.work_arrangement || [],
        preferred_locations: profile.preferred_locations || [],
        job_change_timeline: profile.job_change_timeline || "",
      });
    }
  }, [profile]);

  // Save profile with feedback
  const handleSaveProfile = async () => {
    await updateProfile({
      full_name: profileForm.full_name || null,
      headline: profileForm.headline || null,
      bio: profileForm.bio || null,
      phone: profileForm.phone || null,
      location_city: profileForm.location_city || null,
      location_country: profileForm.location_country || null,
      timezone: profileForm.timezone,
    });
    toast({
      title: "✓ Profile saved",
      description: "Your changes have been saved successfully.",
    });
  };

  // Save career info with feedback
  const handleSaveCareer = async () => {
    await updateProfile({
      current_job_title: careerForm.current_job_title || null,
      current_company: careerForm.current_company || null,
      years_of_experience: careerForm.years_of_experience || null,
      industry: careerForm.industry || null,
      career_level: careerForm.career_level || null,
      employment_status: careerForm.employment_status,
      target_job_titles: careerForm.target_job_titles.length > 0 ? careerForm.target_job_titles : null,
      target_companies: careerForm.target_companies.length > 0 ? careerForm.target_companies : null,
      desired_salary_min: careerForm.desired_salary_min ? parseInt(careerForm.desired_salary_min) : null,
      desired_salary_max: careerForm.desired_salary_max ? parseInt(careerForm.desired_salary_max) : null,
      work_arrangement: careerForm.work_arrangement.length > 0 ? careerForm.work_arrangement : null,
      preferred_locations: careerForm.preferred_locations.length > 0 ? careerForm.preferred_locations : null,
      job_change_timeline: careerForm.job_change_timeline || null,
    });
    toast({
      title: "✓ Career info saved",
      description: "Your career details have been updated.",
    });
  };

  // Add skill handler with feedback
  const handleAddSkill = async () => {
    if (!newSkill.skill_name.trim()) return;
    
    await addSkill({
      skill_id: newSkill.skill_name.trim(), // Use skill_name as skill_id for now
      skill_name: newSkill.skill_name.trim(),
      proficiency: newSkill.proficiency,
      category: newSkill.category,
      is_primary: newSkill.is_primary,
      years_experience: null,
    } as any);
    
    toast({
      title: "✓ Skill added",
      description: `"${newSkill.skill_name}" has been added to your profile.`,
    });
    
    setNewSkill({
      skill_name: "",
      skill_id: null,
      proficiency: "intermediate",
      category: "technical",
      is_primary: false,
    });
    setShowSkillDialog(false);
  };

  // Add certification handler with feedback
  const handleAddCert = async () => {
    if (!newCert.name.trim()) return;
    
    await addCertification({
      name: newCert.name.trim(),
      issuer: newCert.issuer || null,
      issue_date: newCert.issue_date || null,
      expiry_date: newCert.expiry_date || null,
      credential_id: null,
      credential_url: newCert.credential_url || null,
    });
    
    toast({
      title: "✓ Certification added",
      description: `"${newCert.name}" has been added to your profile.`,
    });
    
    setNewCert({
      name: "",
      issuer: "",
      issue_date: "",
      expiry_date: "",
      credential_url: "",
    });
    setShowCertDialog(false);
  };

  // Handle sign out
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  // Handle account deletion
  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== "DELETE") return;
    await deleteAccount();
    navigate("/");
  };

  const userName = session?.user?.user_metadata?.full_name || profile?.full_name || session?.user?.email?.split('@')[0] || 'User';

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-12 h-12 border-3 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/40 to-sky-50/30 dark:from-slate-950 dark:via-blue-950/20 dark:to-slate-900 relative overflow-hidden">
      {/* Beautiful Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/80 via-white/50 to-sky-50/60 dark:from-blue-950/30 dark:via-slate-900/50 dark:to-slate-950" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(59,130,246,0.12),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(14,165,233,0.08),transparent_50%)]" />
        <div className="absolute top-20 right-[20%] w-[500px] h-[500px] bg-gradient-to-br from-blue-400/15 to-sky-300/10 rounded-full blur-[100px]" style={{ animation: "float-slow 10s ease-in-out infinite" }} />
        <div className="absolute bottom-20 left-[10%] w-[400px] h-[400px] bg-gradient-to-br from-sky-400/10 to-blue-300/10 rounded-full blur-[80px]" style={{ animation: "float-slower 12s ease-in-out infinite" }} />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(59,130,246,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.02)_1px,transparent_1px)] bg-[size:60px_60px]" />
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 h-full w-72 z-50 transform transition-transform duration-300 lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="absolute inset-0 bg-gradient-to-b from-white via-blue-50/60 to-sky-50/50 dark:from-slate-900 dark:via-blue-950/40 dark:to-slate-900 backdrop-blur-xl border-r border-blue-100/80 dark:border-blue-900/50" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(59,130,246,0.08),transparent_60%)]" />
        <div className="relative p-6 h-full flex flex-col">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")} className="hover:bg-blue-50 dark:hover:bg-blue-900/30">
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-blue-500 bg-clip-text text-transparent">Settings</h1>
              <p className="text-sm text-muted-foreground">Manage your account</p>
            </div>
          </div>

          {/* Profile Completeness */}
          <Card className="p-4 mb-6 bg-gradient-to-br from-blue-500/10 to-sky-500/10 border-blue-200/50 dark:border-blue-800/50 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <Avatar className="w-12 h-12">
                <AvatarImage src={profile?.avatar_url || undefined} />
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {userName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{userName}</p>
                <p className="text-xs text-muted-foreground truncate">{session?.user?.email}</p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Profile Completeness</span>
                <span className="font-medium">{completeness}%</span>
              </div>
              <Progress value={completeness} className="h-2" />
              {completeness < 100 && (
                <p className="text-xs text-muted-foreground">
                  Complete your profile for better recommendations
                </p>
              )}
            </div>
          </Card>

          {/* Navigation */}
          <nav className="flex-1 space-y-1">
            {SETTINGS_SECTIONS.map((section) => (
              <button
                key={section.id}
                onClick={() => {
                  setActiveSection(section.id);
                  setSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                  activeSection === section.id
                    ? 'bg-gradient-to-r from-blue-500/10 to-sky-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 shadow-sm'
                    : 'text-muted-foreground hover:bg-blue-50/50 dark:hover:bg-slate-800/50'
                }`}
              >
                <section.icon className="w-5 h-5" />
                <div className="text-left">
                  <p className="text-sm">{section.label}</p>
                  <p className="text-xs opacity-70">{section.description}</p>
                </div>
              </button>
            ))}
          </nav>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-blue-100/50 dark:border-blue-900/30 space-y-2">
            <Button variant="ghost" className="w-full justify-start hover:bg-blue-50/50 dark:hover:bg-blue-900/30" onClick={exportData}>
              <Download className="w-4 h-4 mr-2" />
              Export My Data
            </Button>
            <Button variant="ghost" className="w-full justify-start text-destructive hover:text-destructive hover:bg-red-50 dark:hover:bg-red-900/20" onClick={handleSignOut}>
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="lg:pl-72 relative z-10">
        {/* Top Header */}
        <header className="sticky top-0 z-30 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border-b border-blue-100/50 dark:border-blue-900/30">
          <div className="flex items-center justify-between px-4 sm:px-6 md:px-8 py-3 sm:py-4">
            <div className="flex items-center gap-3 sm:gap-4">
              <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSidebarOpen(true)}>
                <Menu className="w-5 h-5" />
              </Button>
              <div>
                <h2 className="text-lg sm:text-xl font-bold capitalize">{activeSection}</h2>
                <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">
                  {SETTINGS_SECTIONS.find(s => s.id === activeSection)?.description}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {saving && (
                <Badge variant="outline" className="flex items-center gap-2">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Saving...
                </Badge>
              )}
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="p-4 sm:p-6 md:p-8 max-w-4xl">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeSection}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {/* Profile Section */}
              {activeSection === "profile" && (
                <div className="space-y-6">
                  {/* Avatar */}
                  <Card className="p-6">
                    <h3 className="font-semibold mb-4">Profile Photo</h3>
                    <div className="flex items-center gap-6">
                      <Avatar className="w-24 h-24">
                        <AvatarImage src={profile?.avatar_url || undefined} />
                        <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                          {userName.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="space-y-2">
                        <Button variant="outline" size="sm">
                          <Camera className="w-4 h-4 mr-2" />
                          Upload Photo
                        </Button>
                        <p className="text-xs text-muted-foreground">
                          JPG, PNG or GIF. Max 2MB.
                        </p>
                      </div>
                    </div>
                  </Card>

                  {/* Basic Info */}
                  <Card className="p-6">
                    <h3 className="font-semibold mb-4">Basic Information</h3>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="full_name">Full Name</Label>
                        <Input
                          id="full_name"
                          value={profileForm.full_name}
                          onChange={(e) => setProfileForm(p => ({ ...p, full_name: e.target.value }))}
                          placeholder="John Doe"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          value={session?.user?.email || ""}
                          disabled
                          className="bg-muted"
                        />
                      </div>
                      <div className="space-y-2 sm:col-span-2">
                        <Label htmlFor="headline">Professional Headline</Label>
                        <Input
                          id="headline"
                          value={profileForm.headline}
                          onChange={(e) => setProfileForm(p => ({ ...p, headline: e.target.value }))}
                          placeholder="Senior Software Engineer at Google"
                        />
                      </div>
                      <div className="space-y-2 sm:col-span-2">
                        <Label htmlFor="bio">Bio</Label>
                        <Textarea
                          id="bio"
                          value={profileForm.bio}
                          onChange={(e) => setProfileForm(p => ({ ...p, bio: e.target.value }))}
                          placeholder="Tell us about yourself..."
                          rows={3}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phone">Phone</Label>
                        <Input
                          id="phone"
                          value={profileForm.phone}
                          onChange={(e) => setProfileForm(p => ({ ...p, phone: e.target.value }))}
                          placeholder="+61 4XX XXX XXX"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="timezone">Timezone</Label>
                        <Select
                          value={profileForm.timezone}
                          onValueChange={(v) => setProfileForm(p => ({ ...p, timezone: v }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {TIMEZONES.map((tz) => (
                              <SelectItem key={tz.value} value={tz.value}>
                                {tz.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="location_city">City</Label>
                        <Input
                          id="location_city"
                          value={profileForm.location_city}
                          onChange={(e) => setProfileForm(p => ({ ...p, location_city: e.target.value }))}
                          placeholder="Sydney"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="location_country">Country</Label>
                        <Input
                          id="location_country"
                          value={profileForm.location_country}
                          onChange={(e) => setProfileForm(p => ({ ...p, location_country: e.target.value }))}
                          placeholder="Australia"
                        />
                      </div>
                    </div>
                    <div className="mt-6 flex justify-end">
                      <Button onClick={handleSaveProfile} disabled={saving}>
                        {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                        Save Changes
                      </Button>
                    </div>
                  </Card>
                </div>
              )}

              {/* Career Section */}
              {activeSection === "career" && (
                <div className="space-y-6">
                  {/* Current Position */}
                  <Card className="p-6">
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                      <Building className="w-5 h-5" />
                      Current Position
                    </h3>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Job Title</Label>
                        <Input
                          value={careerForm.current_job_title}
                          onChange={(e) => setCareerForm(p => ({ ...p, current_job_title: e.target.value }))}
                          placeholder="Software Engineer"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Company</Label>
                        <Input
                          value={careerForm.current_company}
                          onChange={(e) => setCareerForm(p => ({ ...p, current_company: e.target.value }))}
                          placeholder="Acme Inc."
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Industry</Label>
                        <Select
                          value={careerForm.industry}
                          onValueChange={(v) => setCareerForm(p => ({ ...p, industry: v }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select industry" />
                          </SelectTrigger>
                          <SelectContent>
                            {INDUSTRIES.map((ind) => (
                              <SelectItem key={ind} value={ind}>{ind}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Career Level</Label>
                        <Select
                          value={careerForm.career_level}
                          onValueChange={(v) => setCareerForm(p => ({ ...p, career_level: v }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select level" />
                          </SelectTrigger>
                          <SelectContent>
                            {CAREER_LEVELS.map((level) => (
                              <SelectItem key={level.value} value={level.value}>{level.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Years of Experience</Label>
                        <Select
                          value={careerForm.years_of_experience}
                          onValueChange={(v) => setCareerForm(p => ({ ...p, years_of_experience: v }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select experience" />
                          </SelectTrigger>
                          <SelectContent>
                            {YEARS_OF_EXPERIENCE.map((exp) => (
                              <SelectItem key={exp.value} value={exp.value}>{exp.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Employment Status</Label>
                        <Select
                          value={careerForm.employment_status}
                          onValueChange={(v) => setCareerForm(p => ({ ...p, employment_status: v }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {EMPLOYMENT_STATUS.map((status) => (
                              <SelectItem key={status.value} value={status.value}>{status.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </Card>

                  {/* Skills */}
                  <Card className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold flex items-center gap-2">
                        <Award className="w-5 h-5" />
                        Skills ({skills.length})
                      </h3>
                      <Dialog open={showSkillDialog} onOpenChange={setShowSkillDialog}>
                        <DialogTrigger asChild>
                          <Button size="sm">
                            <Plus className="w-4 h-4 mr-1" />
                            Add Skill
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Add Skill</DialogTitle>
                            <DialogDescription>Add a new skill to your profile</DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <div className="space-y-2">
                              <Label>Skill Name</Label>
                              <Input
                                value={newSkill.skill_name}
                                onChange={(e) => setNewSkill(s => ({ ...s, skill_name: e.target.value }))}
                                placeholder="e.g., React, Python, Project Management"
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label>Category</Label>
                                <Select
                                  value={newSkill.category}
                                  onValueChange={(v: any) => setNewSkill(s => ({ ...s, category: v }))}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {SKILL_CATEGORIES.map((cat) => (
                                      <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-2">
                                <Label>Proficiency</Label>
                                <Select
                                  value={newSkill.proficiency}
                                  onValueChange={(v: any) => setNewSkill(s => ({ ...s, proficiency: v }))}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {SKILL_PROFICIENCY.map((prof) => (
                                      <SelectItem key={prof.value} value={prof.value}>{prof.label}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={newSkill.is_primary}
                                onCheckedChange={(v) => setNewSkill(s => ({ ...s, is_primary: v }))}
                              />
                              <Label>Mark as primary skill</Label>
                            </div>
                          </div>
                          <DialogFooter>
                            <Button variant="outline" onClick={() => setShowSkillDialog(false)}>Cancel</Button>
                            <Button onClick={handleAddSkill}>Add Skill</Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                    
                    {skills.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Award className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p>No skills added yet</p>
                        <p className="text-sm">Add your skills to get better job matches</p>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {skills.map((skill) => (
                          <Badge
                            key={skill.id}
                            variant={skill.is_primary ? "default" : "secondary"}
                            className="px-3 py-1.5 text-sm flex items-center gap-2"
                          >
                            {skill.skill_name}
                            <span className="text-xs opacity-70">({skill.proficiency})</span>
                            <button
                              onClick={() => deleteSkill(skill.id)}
                              className="ml-1 hover:text-destructive"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </Card>

                  {/* Certifications */}
                  <Card className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold flex items-center gap-2">
                        <GraduationCap className="w-5 h-5" />
                        Certifications ({certifications.length})
                      </h3>
                      <Dialog open={showCertDialog} onOpenChange={setShowCertDialog}>
                        <DialogTrigger asChild>
                          <Button size="sm">
                            <Plus className="w-4 h-4 mr-1" />
                            Add Certification
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Add Certification</DialogTitle>
                            <DialogDescription>Add a professional certification</DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <div className="space-y-2">
                              <Label>Certification Name</Label>
                              <Input
                                value={newCert.name}
                                onChange={(e) => setNewCert(c => ({ ...c, name: e.target.value }))}
                                placeholder="e.g., AWS Solutions Architect"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Issuing Organization</Label>
                              <Input
                                value={newCert.issuer}
                                onChange={(e) => setNewCert(c => ({ ...c, issuer: e.target.value }))}
                                placeholder="e.g., Amazon Web Services"
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label>Issue Date</Label>
                                <Input
                                  type="date"
                                  value={newCert.issue_date}
                                  onChange={(e) => setNewCert(c => ({ ...c, issue_date: e.target.value }))}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Expiry Date (optional)</Label>
                                <Input
                                  type="date"
                                  value={newCert.expiry_date}
                                  onChange={(e) => setNewCert(c => ({ ...c, expiry_date: e.target.value }))}
                                />
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label>Credential URL (optional)</Label>
                              <Input
                                value={newCert.credential_url}
                                onChange={(e) => setNewCert(c => ({ ...c, credential_url: e.target.value }))}
                                placeholder="https://..."
                              />
                            </div>
                          </div>
                          <DialogFooter>
                            <Button variant="outline" onClick={() => setShowCertDialog(false)}>Cancel</Button>
                            <Button onClick={handleAddCert}>Add Certification</Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                    
                    {certifications.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <GraduationCap className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p>No certifications added yet</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {certifications.map((cert) => (
                          <div key={cert.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                            <div>
                              <p className="font-medium">{cert.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {cert.issuer} {cert.issue_date && `• ${new Date(cert.issue_date).toLocaleDateString()}`}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              {cert.credential_url && (
                                <Button variant="ghost" size="icon" asChild>
                                  <a href={cert.credential_url} target="_blank" rel="noopener noreferrer">
                                    <ExternalLink className="w-4 h-4" />
                                  </a>
                                </Button>
                              )}
                              <Button variant="ghost" size="icon" onClick={() => deleteCertification(cert.id)}>
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>

                  {/* Career Goals */}
                  <Card className="p-6">
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                      <Target className="w-5 h-5" />
                      Career Goals
                    </h3>
                    <div className="space-y-4">
                      {/* Target Job Titles */}
                      <div className="space-y-2">
                        <Label>Target Job Titles</Label>
                        <div className="flex gap-2">
                          <Input
                            value={newTargetTitle}
                            onChange={(e) => setNewTargetTitle(e.target.value)}
                            placeholder="Add a target job title"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && newTargetTitle.trim()) {
                                setCareerForm(p => ({
                                  ...p,
                                  target_job_titles: [...p.target_job_titles, newTargetTitle.trim()]
                                }));
                                setNewTargetTitle("");
                              }
                            }}
                          />
                          <Button
                            variant="outline"
                            onClick={() => {
                              if (newTargetTitle.trim()) {
                                setCareerForm(p => ({
                                  ...p,
                                  target_job_titles: [...p.target_job_titles, newTargetTitle.trim()]
                                }));
                                setNewTargetTitle("");
                              }
                            }}
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                        </div>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {careerForm.target_job_titles.map((title, i) => (
                            <Badge key={i} variant="secondary" className="px-3 py-1">
                              {title}
                              <button
                                onClick={() => setCareerForm(p => ({
                                  ...p,
                                  target_job_titles: p.target_job_titles.filter((_, idx) => idx !== i)
                                }))}
                                className="ml-2"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                      </div>

                      {/* Salary Range */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Minimum Salary (AUD)</Label>
                          <Input
                            type="number"
                            value={careerForm.desired_salary_min}
                            onChange={(e) => setCareerForm(p => ({ ...p, desired_salary_min: e.target.value }))}
                            placeholder="80000"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Maximum Salary (AUD)</Label>
                          <Input
                            type="number"
                            value={careerForm.desired_salary_max}
                            onChange={(e) => setCareerForm(p => ({ ...p, desired_salary_max: e.target.value }))}
                            placeholder="120000"
                          />
                        </div>
                      </div>

                      {/* Work Arrangement */}
                      <div className="space-y-2">
                        <Label>Work Arrangement Preferences</Label>
                        <div className="flex flex-wrap gap-2">
                          {WORK_ARRANGEMENTS.map((arr) => (
                            <Badge
                              key={arr.value}
                              variant={careerForm.work_arrangement.includes(arr.value) ? "default" : "outline"}
                              className="cursor-pointer"
                              onClick={() => {
                                setCareerForm(p => ({
                                  ...p,
                                  work_arrangement: p.work_arrangement.includes(arr.value)
                                    ? p.work_arrangement.filter(a => a !== arr.value)
                                    : [...p.work_arrangement, arr.value]
                                }));
                              }}
                            >
                              {arr.label}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      {/* Job Change Timeline */}
                      <div className="space-y-2">
                        <Label>Job Change Timeline</Label>
                        <Select
                          value={careerForm.job_change_timeline}
                          onValueChange={(v) => setCareerForm(p => ({ ...p, job_change_timeline: v }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="When are you looking to change?" />
                          </SelectTrigger>
                          <SelectContent>
                            {JOB_CHANGE_TIMELINE.map((timeline) => (
                              <SelectItem key={timeline.value} value={timeline.value}>{timeline.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="mt-6 flex justify-end">
                      <Button onClick={handleSaveCareer} disabled={saving}>
                        {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                        Save Career Info
                      </Button>
                    </div>
                  </Card>
                </div>
              )}

              {/* Notifications Section */}
              {activeSection === "notifications" && (
                <div className="space-y-6">
                  <Card className="p-6">
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                      <Mail className="w-5 h-5" />
                      Email Notifications
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Choose which emails you'd like to receive
                    </p>
                    <div className="space-y-4">
                      {[
                        { key: 'email_weekly_digest', label: 'Weekly Digest', description: 'Summary of job market trends and opportunities' },
                        { key: 'email_news_alerts', label: 'News Alerts', description: 'Industry news and market updates' },
                        { key: 'marketing_emails', label: 'Product Updates', description: 'New features and tips' },
                      ].map((item) => (
                        <div key={item.key} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                          <div>
                            <Label className="font-medium">{item.label}</Label>
                            <p className="text-sm text-muted-foreground">{item.description}</p>
                          </div>
                          <Switch
                            checked={(preferences?.notification_settings as any)?.[item.key] || false}
                            onCheckedChange={(v) => {
                              updatePreferences('notification_settings', {
                                ...preferences?.notification_settings,
                                [item.key]: v,
                              });
                              toast({
                                title: v ? '✓ Enabled' : '✓ Disabled',
                                description: `${item.label} ${v ? 'enabled' : 'disabled'}`,
                              });
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  </Card>
                </div>
              )}

              {/* Security Section */}
              {activeSection === "security" && (
                <div className="space-y-6">
                  <Card className="p-6">
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                      <Lock className="w-5 h-5" />
                      Password
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Change your password to keep your account secure
                    </p>
                    <Button variant="outline" onClick={() => {
                      supabase.auth.resetPasswordForEmail(session?.user?.email || '', {
                        redirectTo: `${APP_BASE_URL}/auth`,
                      });
                      toast({
                        title: '✓ Password reset email sent',
                        description: 'Check your email for the reset link',
                      });
                    }}>
                      Change Password
                    </Button>
                  </Card>

                  <Card className="p-6">
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                      <Download className="w-5 h-5" />
                      Export Your Data
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Download all your profile data, skills, and preferences as a JSON file
                    </p>
                    <Button variant="outline" onClick={() => {
                      exportData();
                      toast({
                        title: '✓ Data exported',
                        description: 'Your data has been downloaded.',
                      });
                    }}>
                      <Download className="w-4 h-4 mr-2" />
                      Download My Data
                    </Button>
                  </Card>

                  <Card className="p-6 border-destructive/50">
                    <h3 className="font-semibold mb-4 flex items-center gap-2 text-destructive">
                      <AlertTriangle className="w-5 h-5" />
                      Danger Zone
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Once you delete your account, there is no going back. Please be certain.
                    </p>
                    <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive">
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete Account
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete your account
                            and remove all your data from our servers.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <div className="py-4">
                          <Label>Type DELETE to confirm</Label>
                          <Input
                            value={deleteConfirmText}
                            onChange={(e) => setDeleteConfirmText(e.target.value)}
                            placeholder="DELETE"
                            className="mt-2"
                          />
                        </div>
                        <AlertDialogFooter>
                          <AlertDialogCancel onClick={() => setDeleteConfirmText("")}>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={handleDeleteAccount}
                            disabled={deleteConfirmText !== "DELETE"}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Delete Account
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </Card>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
