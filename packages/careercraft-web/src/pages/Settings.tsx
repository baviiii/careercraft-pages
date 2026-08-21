/* ───────────────────────────────────────────────────────────
   CareerCraft — Settings
   Dashboard-energy: hero, color tones, pill tabs.
   Order: Profile → Career → Skills → Alerts → Account.
   ─────────────────────────────────────────────────────────── */

import { useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  Award,
  Bell,
  Gauge,
  Briefcase,
  Download,
  ExternalLink,
  GraduationCap,
  Loader2,
  Lock,
  LogOut,
  Mail,
  MapPin,
  Phone,
  Plus,
  Save,
  Sparkles,
  Trash2,
  User,
  X,
} from "lucide-react";
import { Session } from "@supabase/supabase-js";

import { CraftAppLayout } from "@/components/craft/CraftAppLayout";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
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
import { clearAccent } from "@/lib/personaTheme";
import {
  fetchPlanUsage,
  isUnlimited,
  usageLabel,
  usagePercent,
  formatResetsIn,
  type PlanUsage,
} from "@/lib/quota";
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
  type NotificationSettings,
} from "@/hooks/useUserProfile";

const APP_BASE_URL =
  (import.meta.env.VITE_PUBLIC_APP_URL as string | undefined)?.trim().replace(/\/+$/, "") ||
  window.location.origin;

const ease = [0.2, 0.8, 0.2, 1] as const;

type SettingsTab = "profile" | "career" | "skills" | "alerts" | "plan" | "account";

const SETTINGS_TABS: {
  id: SettingsTab;
  label: string;
  icon: typeof User;
}[] = [
  { id: "profile", label: "Profile", icon: User },
  { id: "career", label: "Career", icon: Briefcase },
  { id: "skills", label: "Skills", icon: Award },
  { id: "alerts", label: "Alerts", icon: Bell },
  { id: "plan", label: "Plan & usage", icon: Gauge },
  { id: "account", label: "Account", icon: Lock },
];

const NOTIFICATION_ITEMS: {
  key: keyof NotificationSettings;
  label: string;
  description: string;
}[] = [
  {
    key: "email_job_matches",
    label: "Job matches",
    description: "Roles that fit your profile and targets",
  },
  {
    key: "email_interview_reminders",
    label: "Interview reminders",
    description: "Upcoming practice and application interviews",
  },
  {
    key: "email_application_updates",
    label: "Application updates",
    description: "Status changes in your job tracker",
  },
  {
    key: "email_weekly_digest",
    label: "Weekly digest",
    description: "Market trends and opportunities summary",
  },
  {
    key: "email_news_alerts",
    label: "News alerts",
    description: "Industry news and market updates",
  },
  {
    key: "marketing_emails",
    label: "Product updates",
    description: "New features and tips from CareerCraft",
  },
];

function FieldLabel({ htmlFor, children }: { htmlFor?: string; children: ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="cc-field-label">
      {children}
    </label>
  );
}

function Field({
  id,
  label,
  hint,
  count,
  countWarnAt,
  icon,
  children,
  className = "",
}: {
  id?: string;
  label: string;
  hint?: string;
  count?: number;
  countWarnAt?: number;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const long = count != null && countWarnAt != null && count > countWarnAt;
  return (
    <div className={`cc-field-wrap ${className}`}>
      <div className="cc-field-meta">
        <label htmlFor={id} className="cc-field-label">
          {label}
        </label>
        {count != null && (
          <span className={`cc-field-count ${long ? "is-long" : ""}`}>{count}</span>
        )}
      </div>
      {icon ? (
        <div className="cc-field-shell cc-field-shell--icon">
          <span className="cc-field-shell__icon" aria-hidden>
            {icon}
          </span>
          {children}
        </div>
      ) : (
        children
      )}
      {hint && <p className="cc-field-hint">{hint}</p>}
    </div>
  );
}

function Panel({
  title,
  subtitle,
  children,
  actions,
  tone = "cobalt",
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  actions?: ReactNode;
  tone?: "cobalt" | "sage" | "wheat" | "ink";
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease }}
      className={`cc-surface overflow-hidden cc-tone-${tone}`}
    >
      <div className="border-b border-[color:var(--cc-hair)] bg-[color:var(--cc-t-wash)]/40 px-5 py-5 md:px-7 md:py-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="cc-kicker">{title}</div>
            {subtitle && (
              <p className="mt-2 max-w-xl cc-font-editorial text-[15px] leading-snug text-[color:var(--cc-ink-soft)]">
                {subtitle}
              </p>
            )}
          </div>
          {actions}
        </div>
      </div>
      <div className="p-5 md:p-7">{children}</div>
    </motion.div>
  );
}

function Chip({
  children,
  onRemove,
  active,
  onClick,
}: {
  children: ReactNode;
  onRemove?: () => void;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <span
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      className={`cc-chip inline-flex items-center gap-2 ${active ? "cc-chip-dark" : ""} ${
        onClick ? "cursor-pointer" : ""
      }`}
    >
      {children}
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="opacity-70 hover:opacity-100"
          aria-label="Remove"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </span>
  );
}

function SaveBar({
  onSave,
  saving,
  label,
}: {
  onSave: () => void;
  saving: boolean;
  label: string;
}) {
  return (
    <div className="mt-8 flex justify-end border-t border-[color:var(--cc-hair)] pt-5">
      <button type="button" onClick={onSave} disabled={saving} className="cc-action">
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        {label}
      </button>
    </div>
  );
}

function MetricCell({
  label,
  value,
  onClick,
  border,
}: {
  label: string;
  value: string | number;
  onClick?: () => void;
  border?: boolean;
}) {
  const className = `px-4 py-4 text-left transition-colors ${
    border ? "border-l border-[color:var(--cc-hair)]" : ""
  } ${onClick ? "hover:bg-white/60" : ""}`;

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={className}>
        <div className="cc-label-sm text-[color:var(--cc-ash)]">{label}</div>
        <div className="mt-1.5 cc-font-display text-2xl tracking-tight cc-tabular text-[color:var(--cc-ink)]">
          {value}
        </div>
      </button>
    );
  }

  return (
    <div className={className}>
      <div className="cc-label-sm text-[color:var(--cc-ash)]">{label}</div>
      <div className="mt-1.5 cc-font-display text-2xl tracking-tight cc-tabular text-[color:var(--cc-ink)]">
        {value}
      </div>
    </div>
  );
}

export default function Settings() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [session, setSession] = useState<Session | null>(null);
  const [tab, setTab] = useState<SettingsTab>(() => {
    // QuotaNotice links here with ?tab=plan when a limit is hit.
    const requested = new URLSearchParams(window.location.search).get("tab");
    return SETTINGS_TABS.some((t) => t.id === requested)
      ? (requested as SettingsTab)
      : "profile";
  });
  const [usage, setUsage] = useState<PlanUsage | null>(null);
  const [usageLoading, setUsageLoading] = useState(true);
  const [upgradeRequested, setUpgradeRequested] = useState(false);
  const [savingInterest, setSavingInterest] = useState(false);

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
    deleteSkill,
    addCertification,
    deleteCertification,
    deleteAccount,
    exportData,
  } = useUserProfile();

  const [profileForm, setProfileForm] = useState({
    full_name: "",
    headline: "",
    bio: "",
    phone: "",
    location_city: "",
    location_country: "",
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
    proficiency: "intermediate",
    category: "technical",
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

  useEffect(() => {
    if (!session?.user?.id) return;
    let cancelled = false;
    setUsageLoading(true);
    fetchPlanUsage(session.user.id).then((result) => {
      if (cancelled) return;
      setUsage(result);
      setUsageLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [session?.user?.id]);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_, next) => {
      setSession(next);
      if (!next) navigate("/auth");
    });

    supabase.auth.getSession().then(({ data: { session: current } }) => {
      setSession(current);
      if (!current) navigate("/auth");
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (!profile) return;
    setProfileForm({
      full_name: profile.full_name || "",
      headline: profile.headline || "",
      bio: profile.bio || "",
      phone:
        profile.phone && !/X{2,}/i.test(profile.phone) ? profile.phone : "",
      location_city: profile.location_city || "",
      location_country: profile.location_country || "",
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
  }, [profile]);

  const handleSaveProfile = async () => {
    await updateProfile({
      full_name: profileForm.full_name || null,
      headline: profileForm.headline || null,
      bio: profileForm.bio || null,
      phone: profileForm.phone || null,
      location_city: profileForm.location_city || null,
      location_country: profileForm.location_country || null,
    });
    toast({ title: "Profile saved", description: "Your changes have been saved." });
  };

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
      desired_salary_min: careerForm.desired_salary_min
        ? parseInt(careerForm.desired_salary_min, 10)
        : null,
      desired_salary_max: careerForm.desired_salary_max
        ? parseInt(careerForm.desired_salary_max, 10)
        : null,
      work_arrangement: careerForm.work_arrangement.length > 0 ? careerForm.work_arrangement : null,
      preferred_locations:
        careerForm.preferred_locations.length > 0 ? careerForm.preferred_locations : null,
      job_change_timeline: careerForm.job_change_timeline || null,
    });
    toast({ title: "Career info saved", description: "Your career details have been updated." });
  };

  const handleAddSkill = async () => {
    if (!newSkill.skill_name.trim()) return;
    const created = await addSkill({
      skill_id: null,
      skill_name: newSkill.skill_name.trim(),
      proficiency: newSkill.proficiency,
      category: newSkill.category,
      is_primary: newSkill.is_primary,
      years_experience: null,
    } as Parameters<typeof addSkill>[0]);
    if (!created) return;

    toast({
      title: "Skill added",
      description: `"${newSkill.skill_name}" is on your profile.`,
    });
    setNewSkill({
      skill_name: "",
      proficiency: "intermediate",
      category: "technical",
      is_primary: false,
    });
    setShowSkillDialog(false);
  };

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
      title: "Certification added",
      description: `"${newCert.name}" is on your profile.`,
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

  const handleSignOut = async () => {
    clearAccent();
    await supabase.auth.signOut();
    navigate("/");
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== "DELETE") return;
    await deleteAccount();
    navigate("/");
  };

  const handleRegisterInterest = async () => {
    if (!session?.user?.id) return;
    setSavingInterest(true);
    try {
      const { error } = await supabase.from("plan_upgrade_requests").insert({
        user_id: session.user.id,
        from_plan_key: usage?.plan_key ?? null,
      });
      if (error) throw error;
      setUpgradeRequested(true);
      toast({
        title: "Thanks — noted",
        description: "We'll let you know before paid plans open up.",
      });
    } catch (error) {
      console.error("Error registering interest:", error);
      toast({
        title: "Couldn't save that",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSavingInterest(false);
    }
  };

  const handleNotificationToggle = async (key: keyof NotificationSettings, value: boolean) => {
    const next = {
      ...(preferences?.notification_settings ?? {}),
      [key]: value,
    };
    await updatePreferences("notification_settings", next);
    const item = NOTIFICATION_ITEMS.find((n) => n.key === key);
    toast({
      title: value ? "Enabled" : "Disabled",
      description: `${item?.label ?? key} ${value ? "enabled" : "disabled"}.`,
    });
  };

  const pushTag = (
    field: "target_job_titles" | "target_companies" | "preferred_locations",
    value: string,
    clear: () => void,
  ) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    setCareerForm((p) => ({
      ...p,
      [field]: [...new Set([...p[field], trimmed])],
    }));
    clear();
  };

  const userName =
    session?.user?.user_metadata?.full_name ||
    profile?.full_name ||
    session?.user?.email?.split("@")[0] ||
    "User";

  const locationLabel =
    [profileForm.location_city, profileForm.location_country].filter(Boolean).join(", ") || "—";

  const tabHint = (id: SettingsTab) => {
    if (id === "profile") return `${completeness}%`;
    if (id === "skills") return String(skills.length);
    return undefined;
  };

  if (loading) {
    return (
      <CraftAppLayout>
        <div className="grid place-items-center py-32">
          <div className="text-center">
            <div className="cc-kicker mb-3">Loading settings</div>
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-[color:var(--cc-hair-strong)] border-t-[color:var(--cc-rust)]" />
          </div>
        </div>
      </CraftAppLayout>
    );
  }

  return (
    <CraftAppLayout
      topBarLeft={<div className="cc-label-sm text-[color:var(--cc-ash)]">Settings</div>}
      headerActions={
        <div className="flex items-center gap-2">
          {saving && (
            <span className="cc-eyebrow cc-tone-wheat">
              <Loader2 className="h-3 w-3 animate-spin" />
              Saving
            </span>
          )}
          <button
            type="button"
            onClick={handleSignOut}
            className="cc-action cc-action--ghost cc-action--sm"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      }
    >
      {/* Hero — same paper composition as dashboard */}
      <motion.section
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease }}
        className="cc-hero text-[color:var(--cc-ink)]"
      >
        <div className="relative grid gap-8 px-6 pb-0 pt-8 md:grid-cols-[1fr_auto] md:items-end md:px-10 md:pt-10">
          <div>
            <div className="cc-eyebrow cc-tone-cobalt">Your account</div>
            <h1 className="mt-5 max-w-2xl cc-font-display text-[2.4rem] leading-[0.96] tracking-[-0.035em] md:text-[3.1rem]">
              Tune the profile that{" "}
              <span className="cc-italic-wonk text-[color:var(--cc-rust)]">powers</span> everything.
            </h1>
            <p className="mt-4 max-w-lg cc-font-editorial text-lg leading-snug text-[color:var(--cc-ink-soft)]">
              Jobs, résumés, and coach all read from here — keep it sharp and personal.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => navigate("/onboarding?redo=1")}
                className="cc-action"
              >
                <Sparkles className="h-4 w-4" />
                Re-run onboarding
              </button>
              <button
                type="button"
                onClick={() => {
                  exportData();
                  toast({ title: "Data exported", description: "Your download has started." });
                }}
                className="cc-action cc-action--ghost"
              >
                <Download className="h-4 w-4" />
                Export data
              </button>
            </div>
          </div>

          <div className="cc-tint cc-tone-cobalt mb-8 flex items-center gap-4 p-4 md:mb-10 md:min-w-[260px]">
            <Avatar className="h-14 w-14 ring-2 ring-white/80">
              <AvatarImage src={profile?.avatar_url || undefined} />
              <AvatarFallback className="bg-[color:var(--cc-rust)] text-lg text-white">
                {userName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate font-semibold text-[color:var(--cc-ink)]">{userName}</p>
              <p className="truncate text-sm text-[color:var(--cc-ink-soft)]">
                {session?.user?.email}
              </p>
              {(profileForm.location_city || profileForm.location_country) && (
                <p className="mt-1 flex items-center gap-1 text-xs text-[color:var(--cc-ash)]">
                  <MapPin className="h-3 w-3" />
                  {locationLabel}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="relative mt-2 grid grid-cols-2 border-t border-[color:var(--cc-hair)] bg-white/45 sm:grid-cols-4">
          <MetricCell
            label="Complete"
            value={`${completeness}%`}
            onClick={() => setTab("profile")}
          />
          <MetricCell
            label="Skills"
            value={skills.length}
            onClick={() => setTab("skills")}
            border
          />
          <MetricCell
            label="Certs"
            value={certifications.length}
            onClick={() => setTab("skills")}
            border
          />
          <MetricCell
            label="Targets"
            value={careerForm.target_job_titles.length}
            onClick={() => setTab("career")}
            border
          />
        </div>
      </motion.section>

      <Tabs
        value={tab}
        onValueChange={(v) => setTab(v as SettingsTab)}
        className="mt-8 pb-16"
      >
        <TabsList className="cc-tabs sticky top-2 z-20 h-auto justify-start p-[0.35rem]">
          {SETTINGS_TABS.map(({ id, label, icon: Icon }) => {
            const hint = tabHint(id);
            return (
              <TabsTrigger
                key={id}
                value={id}
                className="cc-tab rounded-[0.85rem] shadow-none data-[state=active]:bg-[color:var(--cc-rust-soft)] data-[state=active]:text-[color:var(--cc-rust-deep)] data-[state=active]:shadow-none"
              >
                <Icon className="h-3.5 w-3.5 opacity-70" aria-hidden />
                {label}
                {hint != null && <span className="cc-tab__hint">{hint}</span>}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {/* ── Profile ───────────────────────────────────────── */}
        <TabsContent value="profile" className="cc-tabs-panel mt-6 focus-visible:ring-0">
          <Panel
            title="Basic information"
            subtitle="The basics CareerCraft and recruiters read first."
            tone="cobalt"
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <Field id="full_name" label="Full name" hint="How your name appears on résumés and outreach.">
                <input
                  id="full_name"
                  className="cc-field"
                  value={profileForm.full_name}
                  onChange={(e) => setProfileForm((p) => ({ ...p, full_name: e.target.value }))}
                  placeholder="Curvindu Silva"
                  autoComplete="name"
                />
              </Field>

              <Field
                id="email"
                label="Email"
                hint="Tied to your login — change it from your auth provider if needed."
              >
                <div className="cc-field-locked" id="email">
                  <Mail className="h-4 w-4 shrink-0 text-[color:var(--cc-ash)]" aria-hidden />
                  <span className="min-w-0 truncate">{session?.user?.email || "—"}</span>
                  <Lock className="ml-auto h-3.5 w-3.5 shrink-0 text-[color:var(--cc-ash)]" aria-hidden />
                </div>
              </Field>

              <Field
                id="headline"
                label="Professional headline"
                hint="One crisp line — role + focus. Shows under your name."
                count={profileForm.headline.length}
                countWarnAt={90}
                className="sm:col-span-2"
              >
                <input
                  id="headline"
                  className="cc-field"
                  value={profileForm.headline}
                  onChange={(e) => setProfileForm((p) => ({ ...p, headline: e.target.value }))}
                  placeholder="Full-Stack Developer · Platform Engineer"
                  maxLength={140}
                />
              </Field>

              <Field
                id="bio"
                label="Bio"
                hint="2–4 short paragraphs work best. Skip keyword stuffing."
                count={profileForm.bio.length}
                countWarnAt={900}
                className="sm:col-span-2"
              >
                <textarea
                  id="bio"
                  className="cc-field cc-field-textarea"
                  value={profileForm.bio}
                  onChange={(e) => setProfileForm((p) => ({ ...p, bio: e.target.value }))}
                  placeholder="A short professional story — what you build, where you’ve worked, and what you’re aiming for next."
                  rows={7}
                />
              </Field>

              <Field
                id="phone"
                label="Phone"
                hint="Optional. Used only when you choose to share it."
                icon={<Phone className="h-4 w-4" />}
              >
                <input
                  id="phone"
                  className="cc-field"
                  value={profileForm.phone}
                  onChange={(e) => setProfileForm((p) => ({ ...p, phone: e.target.value }))}
                  placeholder="+61 412 345 678"
                  autoComplete="tel"
                  inputMode="tel"
                />
              </Field>

              <Field
                id="location_city"
                label="City"
                hint="Suburb or city only — e.g. Plympton."
                icon={<MapPin className="h-4 w-4" />}
              >
                <input
                  id="location_city"
                  className="cc-field"
                  value={profileForm.location_city}
                  onChange={(e) =>
                    setProfileForm((p) => ({ ...p, location_city: e.target.value }))
                  }
                  placeholder="Plympton"
                  autoComplete="address-level2"
                />
              </Field>

              <Field
                id="location_country"
                label="Country"
                className="sm:col-span-2"
              >
                <input
                  id="location_country"
                  className="cc-field"
                  value={profileForm.location_country}
                  onChange={(e) =>
                    setProfileForm((p) => ({ ...p, location_country: e.target.value }))
                  }
                  placeholder="Australia"
                  autoComplete="country-name"
                />
              </Field>
            </div>
            <SaveBar onSave={handleSaveProfile} saving={saving} label="Save profile" />
          </Panel>
        </TabsContent>

        {/* ── Career ────────────────────────────────────────── */}
        <TabsContent value="career" className="cc-tabs-panel mt-6 focus-visible:ring-0">
          <div className="space-y-5">
            <Panel
              title="Role & experience"
              subtitle="Your current situation — drives job matching and interview prep."
              tone="sage"
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <FieldLabel htmlFor="current_job_title">Current job title</FieldLabel>
                  <input
                    id="current_job_title"
                    className="cc-field"
                    value={careerForm.current_job_title}
                    onChange={(e) =>
                      setCareerForm((p) => ({ ...p, current_job_title: e.target.value }))
                    }
                    placeholder="Product designer"
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="current_company">Current company</FieldLabel>
                  <input
                    id="current_company"
                    className="cc-field"
                    value={careerForm.current_company}
                    onChange={(e) =>
                      setCareerForm((p) => ({ ...p, current_company: e.target.value }))
                    }
                    placeholder="Company name"
                  />
                </div>
                <div>
                  <FieldLabel>Years of experience</FieldLabel>
                  <Select
                    value={careerForm.years_of_experience || undefined}
                    onValueChange={(v) =>
                      setCareerForm((p) => ({ ...p, years_of_experience: v }))
                    }
                  >
                    <SelectTrigger className="cc-field h-auto border-[color:var(--cc-hair-strong)]">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {YEARS_OF_EXPERIENCE.map((y) => (
                        <SelectItem key={y.value} value={y.value}>
                          {y.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <FieldLabel>Industry</FieldLabel>
                  <Select
                    value={careerForm.industry || undefined}
                    onValueChange={(v) => setCareerForm((p) => ({ ...p, industry: v }))}
                  >
                    <SelectTrigger className="cc-field h-auto border-[color:var(--cc-hair-strong)]">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {INDUSTRIES.map((ind) => (
                        <SelectItem key={ind.value} value={ind.value}>
                          {ind.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <FieldLabel>Career level</FieldLabel>
                  <Select
                    value={careerForm.career_level || undefined}
                    onValueChange={(v) => setCareerForm((p) => ({ ...p, career_level: v }))}
                  >
                    <SelectTrigger className="cc-field h-auto border-[color:var(--cc-hair-strong)]">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {CAREER_LEVELS.map((level) => (
                        <SelectItem key={level.value} value={level.value}>
                          {level.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <FieldLabel>Employment status</FieldLabel>
                  <Select
                    value={careerForm.employment_status}
                    onValueChange={(v) => setCareerForm((p) => ({ ...p, employment_status: v }))}
                  >
                    <SelectTrigger className="cc-field h-auto border-[color:var(--cc-hair-strong)]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {EMPLOYMENT_STATUS.map((status) => (
                        <SelectItem key={status.value} value={status.value}>
                          {status.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </Panel>

            <Panel
              title="Goals & preferences"
              subtitle="Where you’re headed — titles, companies, pay, and work style."
              tone="wheat"
            >
              <div className="space-y-6">
                <div>
                  <FieldLabel>Target job titles</FieldLabel>
                  <div className="flex gap-2">
                    <input
                      className="cc-field"
                      value={newTargetTitle}
                      onChange={(e) => setNewTargetTitle(e.target.value)}
                      placeholder="Add a target title"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          pushTag("target_job_titles", newTargetTitle, () =>
                            setNewTargetTitle(""),
                          );
                        }
                      }}
                    />
                    <button
                      type="button"
                      className="cc-action cc-action--ghost"
                      onClick={() =>
                        pushTag("target_job_titles", newTargetTitle, () => setNewTargetTitle(""))
                      }
                      aria-label="Add title"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {careerForm.target_job_titles.map((title) => (
                      <Chip
                        key={title}
                        onRemove={() =>
                          setCareerForm((p) => ({
                            ...p,
                            target_job_titles: p.target_job_titles.filter((t) => t !== title),
                          }))
                        }
                      >
                        {title}
                      </Chip>
                    ))}
                  </div>
                </div>

                <div className="grid gap-6 sm:grid-cols-2">
                  <div>
                    <FieldLabel>Target companies</FieldLabel>
                    <div className="flex gap-2">
                      <input
                        className="cc-field"
                        value={newTargetCompany}
                        onChange={(e) => setNewTargetCompany(e.target.value)}
                        placeholder="Add a company"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            pushTag("target_companies", newTargetCompany, () =>
                              setNewTargetCompany(""),
                            );
                          }
                        }}
                      />
                      <button
                        type="button"
                        className="cc-action cc-action--ghost"
                        onClick={() =>
                          pushTag("target_companies", newTargetCompany, () =>
                            setNewTargetCompany(""),
                          )
                        }
                        aria-label="Add company"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {careerForm.target_companies.map((company) => (
                        <Chip
                          key={company}
                          onRemove={() =>
                            setCareerForm((p) => ({
                              ...p,
                              target_companies: p.target_companies.filter((c) => c !== company),
                            }))
                          }
                        >
                          {company}
                        </Chip>
                      ))}
                    </div>
                  </div>

                  <div>
                    <FieldLabel>Preferred locations</FieldLabel>
                    <div className="flex gap-2">
                      <input
                        className="cc-field"
                        value={newLocation}
                        onChange={(e) => setNewLocation(e.target.value)}
                        placeholder="City or region"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            pushTag("preferred_locations", newLocation, () => setNewLocation(""));
                          }
                        }}
                      />
                      <button
                        type="button"
                        className="cc-action cc-action--ghost"
                        onClick={() =>
                          pushTag("preferred_locations", newLocation, () => setNewLocation(""))
                        }
                        aria-label="Add location"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {careerForm.preferred_locations.map((location) => (
                        <Chip
                          key={location}
                          onRemove={() =>
                            setCareerForm((p) => ({
                              ...p,
                              preferred_locations: p.preferred_locations.filter(
                                (l) => l !== location,
                              ),
                            }))
                          }
                        >
                          {location}
                        </Chip>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <FieldLabel htmlFor="salary_min">Minimum salary (AUD)</FieldLabel>
                    <input
                      id="salary_min"
                      type="number"
                      className="cc-field"
                      value={careerForm.desired_salary_min}
                      onChange={(e) =>
                        setCareerForm((p) => ({ ...p, desired_salary_min: e.target.value }))
                      }
                      placeholder="80000"
                    />
                  </div>
                  <div>
                    <FieldLabel htmlFor="salary_max">Maximum salary (AUD)</FieldLabel>
                    <input
                      id="salary_max"
                      type="number"
                      className="cc-field"
                      value={careerForm.desired_salary_max}
                      onChange={(e) =>
                        setCareerForm((p) => ({ ...p, desired_salary_max: e.target.value }))
                      }
                      placeholder="120000"
                    />
                  </div>
                </div>

                <div>
                  <FieldLabel>Work arrangement</FieldLabel>
                  <div className="flex flex-wrap gap-2">
                    {WORK_ARRANGEMENTS.map((arr) => {
                      const active = careerForm.work_arrangement.includes(arr.value);
                      return (
                        <Chip
                          key={arr.value}
                          active={active}
                          onClick={() =>
                            setCareerForm((p) => ({
                              ...p,
                              work_arrangement: active
                                ? p.work_arrangement.filter((a) => a !== arr.value)
                                : [...p.work_arrangement, arr.value],
                            }))
                          }
                        >
                          {arr.label}
                        </Chip>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <FieldLabel>Job change timeline</FieldLabel>
                  <Select
                    value={careerForm.job_change_timeline || undefined}
                    onValueChange={(v) =>
                      setCareerForm((p) => ({ ...p, job_change_timeline: v }))
                    }
                  >
                    <SelectTrigger className="cc-field h-auto border-[color:var(--cc-hair-strong)]">
                      <SelectValue placeholder="When are you looking to change?" />
                    </SelectTrigger>
                    <SelectContent>
                      {JOB_CHANGE_TIMELINE.map((timeline) => (
                        <SelectItem key={timeline.value} value={timeline.value}>
                          {timeline.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <SaveBar onSave={handleSaveCareer} saving={saving} label="Save career info" />
            </Panel>
          </div>
        </TabsContent>

        {/* ── Skills ────────────────────────────────────────── */}
        <TabsContent value="skills" className="cc-tabs-panel mt-6 focus-visible:ring-0">
          <div className="space-y-5">
            <Panel
              title={`Skills · ${skills.length}`}
              subtitle="What you bring — stronger lists mean sharper job matches."
              tone="cobalt"
              actions={
                <Dialog open={showSkillDialog} onOpenChange={setShowSkillDialog}>
                  <DialogTrigger asChild>
                    <button type="button" className="cc-action cc-action--sm">
                      <Plus className="h-4 w-4" />
                      Add skill
                    </button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add skill</DialogTitle>
                      <DialogDescription>Add a skill to improve job matching.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                      <div>
                        <FieldLabel>Skill name</FieldLabel>
                        <input
                          className="cc-field"
                          value={newSkill.skill_name}
                          onChange={(e) =>
                            setNewSkill((s) => ({ ...s, skill_name: e.target.value }))
                          }
                          placeholder="e.g. React, Python"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <FieldLabel>Category</FieldLabel>
                          <Select
                            value={newSkill.category}
                            onValueChange={(v) => setNewSkill((s) => ({ ...s, category: v }))}
                          >
                            <SelectTrigger className="cc-field h-auto">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {SKILL_CATEGORIES.map((cat) => (
                                <SelectItem key={cat.value} value={cat.value}>
                                  {cat.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <FieldLabel>Proficiency</FieldLabel>
                          <Select
                            value={newSkill.proficiency}
                            onValueChange={(v) => setNewSkill((s) => ({ ...s, proficiency: v }))}
                          >
                            <SelectTrigger className="cc-field h-auto">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {SKILL_PROFICIENCY.map((prof) => (
                                <SelectItem key={prof.value} value={prof.value}>
                                  {prof.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={newSkill.is_primary}
                          onCheckedChange={(v) => setNewSkill((s) => ({ ...s, is_primary: v }))}
                        />
                        <span className="text-sm text-[color:var(--cc-ink-soft)]">
                          Primary skill
                        </span>
                      </div>
                    </div>
                    <DialogFooter className="gap-2">
                      <button
                        type="button"
                        className="cc-action cc-action--ghost"
                        onClick={() => setShowSkillDialog(false)}
                      >
                        Cancel
                      </button>
                      <button type="button" className="cc-action" onClick={handleAddSkill}>
                        Add skill
                      </button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              }
            >
              {skills.length === 0 ? (
                <div className="cc-tint cc-tone-cobalt px-5 py-10 text-center">
                  <Award className="mx-auto h-8 w-8 text-[color:var(--cc-rust)] opacity-70" />
                  <p className="mt-3 text-sm text-[color:var(--cc-ink-soft)]">
                    No skills yet — add a few to sharpen matches.
                  </p>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {skills.map((skill) => (
                    <Chip
                      key={skill.id}
                      active={skill.is_primary}
                      onRemove={() => deleteSkill(skill.id)}
                    >
                      {skill.skill_name}
                      <span className="opacity-60">({skill.proficiency})</span>
                    </Chip>
                  ))}
                </div>
              )}
            </Panel>

            <Panel
              title={`Certifications · ${certifications.length}`}
              subtitle="Credentials that recruiters and ATS scans look for."
              tone="sage"
              actions={
                <Dialog open={showCertDialog} onOpenChange={setShowCertDialog}>
                  <DialogTrigger asChild>
                    <button type="button" className="cc-action cc-action--ghost cc-action--sm">
                      <Plus className="h-4 w-4" />
                      Add certification
                    </button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add certification</DialogTitle>
                      <DialogDescription>Add a professional certification.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                      <div>
                        <FieldLabel>Name</FieldLabel>
                        <input
                          className="cc-field"
                          value={newCert.name}
                          onChange={(e) => setNewCert((c) => ({ ...c, name: e.target.value }))}
                          placeholder="AWS Solutions Architect"
                        />
                      </div>
                      <div>
                        <FieldLabel>Issuer</FieldLabel>
                        <input
                          className="cc-field"
                          value={newCert.issuer}
                          onChange={(e) => setNewCert((c) => ({ ...c, issuer: e.target.value }))}
                          placeholder="Amazon Web Services"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <FieldLabel>Issue date</FieldLabel>
                          <input
                            type="date"
                            className="cc-field"
                            value={newCert.issue_date}
                            onChange={(e) =>
                              setNewCert((c) => ({ ...c, issue_date: e.target.value }))
                            }
                          />
                        </div>
                        <div>
                          <FieldLabel>Expiry (optional)</FieldLabel>
                          <input
                            type="date"
                            className="cc-field"
                            value={newCert.expiry_date}
                            onChange={(e) =>
                              setNewCert((c) => ({ ...c, expiry_date: e.target.value }))
                            }
                          />
                        </div>
                      </div>
                      <div>
                        <FieldLabel>Credential URL</FieldLabel>
                        <input
                          className="cc-field"
                          value={newCert.credential_url}
                          onChange={(e) =>
                            setNewCert((c) => ({ ...c, credential_url: e.target.value }))
                          }
                          placeholder="https://…"
                        />
                      </div>
                    </div>
                    <DialogFooter className="gap-2">
                      <button
                        type="button"
                        className="cc-action cc-action--ghost"
                        onClick={() => setShowCertDialog(false)}
                      >
                        Cancel
                      </button>
                      <button type="button" className="cc-action" onClick={handleAddCert}>
                        Add certification
                      </button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              }
            >
              {certifications.length === 0 ? (
                <div className="cc-tint cc-tone-sage px-5 py-10 text-center">
                  <GraduationCap className="mx-auto h-8 w-8 text-[color:var(--cc-signal)] opacity-70" />
                  <p className="mt-3 text-sm text-[color:var(--cc-ink-soft)]">
                    No certifications yet
                  </p>
                </div>
              ) : (
                <ul className="space-y-3">
                  {certifications.map((cert) => (
                    <li
                      key={cert.id}
                      className="flex items-center justify-between rounded-xl border border-[color:var(--cc-hair)] bg-[color:var(--cc-cream)] px-4 py-3"
                    >
                      <div>
                        <p className="font-medium text-[color:var(--cc-ink)]">{cert.name}</p>
                        <p className="text-sm text-[color:var(--cc-ash)]">
                          {cert.issuer}
                          {cert.issue_date
                            ? ` · ${new Date(cert.issue_date).toLocaleDateString()}`
                            : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        {cert.credential_url && (
                          <a
                            href={cert.credential_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="cc-action cc-action--ghost cc-action--sm p-2"
                            aria-label="Open credential"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        )}
                        <button
                          type="button"
                          className="cc-action cc-action--ghost cc-action--sm p-2 text-[color:var(--cc-rust)]"
                          onClick={() => deleteCertification(cert.id)}
                          aria-label="Delete certification"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>
        </TabsContent>

        {/* ── Alerts ────────────────────────────────────────── */}
        <TabsContent value="alerts" className="cc-tabs-panel mt-6 focus-visible:ring-0">
          <Panel
            title="Email notifications"
            subtitle="Toggle what lands in your inbox — changes save instantly."
            tone="wheat"
          >
            <ul className="overflow-hidden rounded-xl border border-[color:var(--cc-hair)]">
              {NOTIFICATION_ITEMS.map((item, i) => {
                const checked = Boolean(preferences?.notification_settings?.[item.key]);
                return (
                  <li
                    key={item.key}
                    className={`flex items-center justify-between gap-4 bg-white px-4 py-4 ${
                      i > 0 ? "border-t border-[color:var(--cc-hair)]" : ""
                    }`}
                  >
                    <div>
                      <p className="font-medium text-[color:var(--cc-ink)]">{item.label}</p>
                      <p className="text-sm text-[color:var(--cc-ash)]">{item.description}</p>
                    </div>
                    <Switch
                      checked={checked}
                      onCheckedChange={(v) => handleNotificationToggle(item.key, v)}
                    />
                  </li>
                );
              })}
            </ul>
          </Panel>
        </TabsContent>

        {/* ── Account ───────────────────────────────────────── */}
        {/* ── Plan & usage ──────────────────────────────────── */}
        <TabsContent value="plan" className="cc-tabs-panel mt-6 focus-visible:ring-0">
          <Panel
            title={usage ? `${usage.plan_key} plan` : "Your plan"}
            subtitle="What you've used this month, and when it resets"
            tone="cobalt"
          >
            {usageLoading ? (
              <p className="cc-font-editorial text-[color:var(--cc-ash)]">
                Loading your usage…
              </p>
            ) : !usage ? (
              <p className="cc-font-editorial text-[color:var(--cc-ash)]">
                Usage information isn&rsquo;t available right now.
              </p>
            ) : (
              <div className="space-y-6">
                <ul className="space-y-4">
                  {usage.resources
                    .filter((r) => r.is_enabled)
                    .map((r) => {
                      const pct = usagePercent(r.monthly_used, r.monthly_limit);
                      const unlimited = isUnlimited(r.monthly_limit);
                      return (
                        <li key={r.resource} className="space-y-1.5">
                          <div className="flex items-baseline justify-between gap-4">
                            <span className="cc-font-editorial text-[15px] text-[color:var(--cc-ink)]">
                              {r.label}
                            </span>
                            <span className="cc-label-sm cc-tabular text-[color:var(--cc-ash)]">
                              {usageLabel(r.monthly_used, r.monthly_limit)}
                            </span>
                          </div>
                          {!unlimited && (
                            <div
                              className="cc-score"
                              role="progressbar"
                              aria-valuenow={pct}
                              aria-valuemin={0}
                              aria-valuemax={100}
                              aria-label={`${r.label} usage`}
                            >
                              <div
                                className={`cc-score-fill ${
                                  pct >= 90 ? "cc-score-poor" : pct >= 70 ? "cc-score-warn" : "cc-score-good"
                                }`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          )}
                        </li>
                      );
                    })}
                </ul>

                {usage.resources.some((r) => !r.is_enabled) && (
                  <div className="border-t border-[color:var(--cc-hair)] pt-4">
                    <p className="cc-label-sm text-[color:var(--cc-ash)]">
                      Not on this plan
                    </p>
                    <p className="mt-1.5 cc-font-editorial text-[15px] text-[color:var(--cc-ink-soft)]">
                      {usage.resources
                        .filter((r) => !r.is_enabled)
                        .map((r) => r.label)
                        .join(", ")}
                    </p>
                  </div>
                )}

                <p className="cc-label-sm text-[color:var(--cc-ash)]">
                  {/* Windows roll over in UTC, which lands mid-morning in
                      Australia — better said than discovered. */}
                  Allowances reset {formatResetsIn(usage.resets_at) ?? "soon"} (UTC).
                </p>
              </div>
            )}
          </Panel>

          {/* No checkout exists yet, so this records interest instead of
              pretending to sell something. Which features people run out of is
              the most useful thing to know before picking a price. */}
          <Panel
            title="Need more?"
            subtitle="Tell us and we'll let you know when paid plans open up"
            tone="wheat"
          >
            {upgradeRequested ? (
              <p className="cc-font-editorial text-[15px] text-[color:var(--cc-ink-soft)]">
                Thanks — noted. We&rsquo;ll be in touch before anything changes.
              </p>
            ) : (
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="cc-font-editorial text-[15px] text-[color:var(--cc-ink-soft)]">
                  Paid plans aren&rsquo;t available yet. Register interest and
                  you&rsquo;ll hear first.
                </p>
                <button
                  type="button"
                  onClick={handleRegisterInterest}
                  disabled={savingInterest}
                  className="cc-action cc-action--sm shrink-0"
                >
                  {savingInterest ? "Saving…" : "I'd want more"}
                </button>
              </div>
            )}
          </Panel>
        </TabsContent>

        <TabsContent value="account" className="cc-tabs-panel mt-6 focus-visible:ring-0">
          <div className="space-y-5">
            <Panel title="Password" subtitle="We’ll email a secure link to reset your password." tone="ink">
              <button
                type="button"
                className="cc-action cc-action--ghost"
                onClick={async () => {
                  const email = session?.user?.email;
                  if (!email) return;
                  await supabase.auth.resetPasswordForEmail(email, {
                    redirectTo: `${APP_BASE_URL}/reset-password`,
                  });
                  toast({
                    title: "Reset email sent",
                    description: "Check your inbox for the password reset link.",
                  });
                }}
              >
                Change password
              </button>
            </Panel>

            <Panel title="Your data" subtitle="Download a copy of your profile and preferences." tone="cobalt">
              <button
                type="button"
                className="cc-action cc-action--ghost"
                onClick={() => {
                  exportData();
                  toast({
                    title: "Data exported",
                    description: "Your download has started.",
                  });
                }}
              >
                <Download className="h-4 w-4" />
                Download my data
              </button>
            </Panel>

            <div className="overflow-hidden rounded-[1.25rem] border border-[color:var(--cc-rust)] bg-[color:var(--cc-rust-soft)] p-5 md:p-7">
              <h2 className="mb-2 flex items-center gap-2 font-semibold text-[color:var(--cc-rust-deep)]">
                <AlertTriangle className="h-4 w-4" />
                Danger zone
              </h2>
              <p className="mb-4 text-sm text-[color:var(--cc-ink-soft)]">
                Deleting your account permanently removes your data. This cannot be undone.
              </p>
              <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <AlertDialogTrigger asChild>
                  <button type="button" className="cc-action cc-action--ink">
                    <Trash2 className="h-4 w-4" />
                    Delete account
                  </button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This permanently deletes your account and all associated data.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <div className="py-2">
                    <FieldLabel htmlFor="delete-confirm">Type DELETE to confirm</FieldLabel>
                    <input
                      id="delete-confirm"
                      className="cc-field"
                      value={deleteConfirmText}
                      onChange={(e) => setDeleteConfirmText(e.target.value)}
                      placeholder="DELETE"
                    />
                  </div>
                  <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setDeleteConfirmText("")}>
                      Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeleteAccount}
                      disabled={deleteConfirmText !== "DELETE"}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Delete account
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </CraftAppLayout>
  );
}
