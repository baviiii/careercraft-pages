import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Session } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

import type {
  ApplicationStatus,
  CoverLetterRef,
  JobApplication,
  JobFormValues,
  ResumeRef,
  StatusFilter,
} from "../types";

interface Filters {
  search: string;
  status: StatusFilter;
}

/**
 * Owns all job-tracker state: session guard, fetch, filters, and CRUD mutations.
 */
export function useJobTracker() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [resumes, setResumes] = useState<ResumeRef[]>([]);
  const [coverLetters, setCoverLetters] = useState<CoverLetterRef[]>([]);

  const [filters, setFilters] = useState<Filters>({
    search: "",
    status: "all",
  });

  /* ── Session guard ───────────────────────────────────────────── */
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (!s) navigate("/auth");
    });

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      if (!s) navigate("/auth");
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  /* ── Fetch helpers ───────────────────────────────────────────── */
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
        description:
          error instanceof Error ? error.message : "Failed to load data",
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

  useEffect(() => {
    if (!session) return;
    fetchApplications();
    fetchResumes();
    fetchCoverLetters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  /* ── Derived ─────────────────────────────────────────────────── */
  const filteredApplications = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    return applications.filter((app) => {
      const matchesSearch =
        q === "" ||
        app.job_title.toLowerCase().includes(q) ||
        app.company.toLowerCase().includes(q);
      const matchesStatus =
        filters.status === "all" || app.status === filters.status;
      return matchesSearch && matchesStatus;
    });
  }, [applications, filters]);

  const stats = useMemo(
    () => ({
      total: applications.length,
      applied: applications.filter((a) => a.status === "applied").length,
      interview: applications.filter((a) => a.status === "interview").length,
      offer: applications.filter((a) => a.status === "offer").length,
      rejected: applications.filter((a) => a.status === "rejected").length,
    }),
    [applications]
  );

  /* ── Lookups ─────────────────────────────────────────────────── */
  const getResumeName = (resumeId: string | null) => {
    if (!resumeId) return null;
    return resumes.find((r) => r.id === resumeId)?.name ?? null;
  };

  const getCoverLetterPreview = (clId: string | null) => {
    if (!clId) return null;
    const cl = coverLetters.find((c) => c.id === clId);
    return cl ? cl.content.substring(0, 50) + "..." : null;
  };

  /* ── Mutations ───────────────────────────────────────────────── */
  const buildPayload = (form: JobFormValues) => ({
    job_title: form.jobTitle,
    company: form.company,
    status: form.status,
    notes: form.notes || null,
    reminder_date: form.reminderDate || null,
    job_description: form.jobDescription || null,
    job_url: form.jobUrl || null,
    salary_range: form.salaryRange || null,
    location: form.jobLocation || null,
    job_type: form.jobType || null,
    resume_id: form.selectedResumeId || null,
    cover_letter_id: form.selectedCoverLetterId || null,
  });

  const createApplication = async (form: JobFormValues): Promise<boolean> => {
    if (!form.jobTitle || !form.company) {
      toast({
        title: "Missing fields",
        description: "Please fill in job title and company",
        variant: "destructive",
      });
      return false;
    }
    try {
      const { error } = await supabase.from("job_applications").insert({
        user_id: session?.user?.id,
        ...buildPayload(form),
      });
      if (error) throw error;
      toast({
        title: "✓ Added",
        description: "Application logged to the ledger",
      });
      await fetchApplications();
      return true;
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save",
        variant: "destructive",
      });
      return false;
    }
  };

  const updateApplication = async (
    id: string,
    form: JobFormValues
  ): Promise<boolean> => {
    if (!form.jobTitle || !form.company) {
      toast({
        title: "Missing fields",
        description: "Please fill in job title and company",
        variant: "destructive",
      });
      return false;
    }
    try {
      const { error } = await supabase
        .from("job_applications")
        .update(buildPayload(form))
        .eq("id", id);
      if (error) throw error;
      toast({
        title: "✓ Updated",
        description: "The entry has been amended",
      });
      await fetchApplications();
      return true;
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save",
        variant: "destructive",
      });
      return false;
    }
  };

  const updateStatus = async (id: string, status: ApplicationStatus) => {
    try {
      const { error } = await supabase
        .from("job_applications")
        .update({ status })
        .eq("id", id);
      if (error) throw error;
      setApplications((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status } : a))
      );
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to update status",
        variant: "destructive",
      });
    }
  };

  const deleteApplication = async (id: string) => {
    try {
      const { error } = await supabase
        .from("job_applications")
        .delete()
        .eq("id", id);
      if (error) throw error;
      toast({
        title: "✓ Struck from the ledger",
        description: "Application removed from tracker",
      });
      setApplications((prev) => prev.filter((a) => a.id !== id));
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to delete",
        variant: "destructive",
      });
    }
  };

  return {
    session,
    loading,
    applications,
    filteredApplications,
    resumes,
    coverLetters,
    stats,
    filters,
    setFilters,
    getResumeName,
    getCoverLetterPreview,
    mutations: {
      createApplication,
      updateApplication,
      updateStatus,
      deleteApplication,
    },
  };
}
