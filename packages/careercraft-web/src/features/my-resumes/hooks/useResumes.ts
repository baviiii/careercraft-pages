import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Session } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

import type { Resume, SortKey, SortOrder } from "../types";

interface Filters {
  search: string;
  category: string; // "all" or category id
  tag: string; // "all" or tag
  favoritesOnly: boolean;
  sortBy: SortKey;
  sortOrder: SortOrder;
}

/**
 * Own the entire resume-cabinet state machine: session, fetch, filter, sort,
 * and all CRUD mutations. Returns a tight API the page component wires up.
 */
export function useResumes() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [resumes, setResumes] = useState<Resume[]>([]);

  const [filters, setFilters] = useState<Filters>({
    search: "",
    category: "all",
    tag: "all",
    favoritesOnly: false,
    sortBy: "updated",
    sortOrder: "desc",
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
      setLoading(false);
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  /* ── Fetch ──────────────────────────────────────────────────── */
  useEffect(() => {
    if (!session?.user) return;
    (async () => {
      try {
        const { data, error } = await supabase
          .from("resumes")
          .select("*")
          .eq("user_id", session.user.id)
          .order("updated_at", { ascending: false });
        if (error) throw error;

        const parsed: Resume[] = (data || []).map((r: any) => {
          let content: any = null;
          try {
            content =
              typeof r.content === "string" ? JSON.parse(r.content) : r.content;
          } catch {
            // legacy plain-text content — wrap so the rest of the UI still works
            content = {
              contact: { name: r.name || "Untitled" },
              rawText: r.content,
            };
          }
          return {
            ...r,
            content: content || {},
            tags: content?.metadata?.tags || [],
            is_favorite: content?.metadata?.is_favorite || false,
            category: content?.metadata?.category || "general",
            job_title:
              content?.experience?.[0]?.title ||
              content?.contact?.name ||
              "Resume",
            target_company: content?.metadata?.target_company || "",
          };
        });
        setResumes(parsed);
      } catch (e) {
        console.error("Error fetching resumes:", e);
        toast({
          title: "Error",
          description: "Failed to load resumes",
          variant: "destructive",
        });
      }
    })();
  }, [session, toast]);

  /* ── Derived ─────────────────────────────────────────────────── */
  const allTags = useMemo(
    () => Array.from(new Set(resumes.flatMap((r) => r.tags || []))),
    [resumes]
  );

  const filteredResumes = useMemo(() => {
    let out = [...resumes];
    const q = filters.search.trim().toLowerCase();
    if (q) {
      out = out.filter(
        (r) =>
          r.name?.toLowerCase().includes(q) ||
          r.content?.contact?.name?.toLowerCase().includes(q) ||
          r.job_title?.toLowerCase().includes(q) ||
          r.target_company?.toLowerCase().includes(q) ||
          r.tags?.some((t) => t.toLowerCase().includes(q))
      );
    }
    if (filters.category !== "all")
      out = out.filter((r) => r.category === filters.category);
    if (filters.tag !== "all")
      out = out.filter((r) => r.tags?.includes(filters.tag));
    if (filters.favoritesOnly) out = out.filter((r) => r.is_favorite);

    out.sort((a, b) => {
      let d = 0;
      switch (filters.sortBy) {
        case "name":
          d = (a.name || "").localeCompare(b.name || "");
          break;
        case "date":
          d =
            new Date(a.created_at).getTime() -
            new Date(b.created_at).getTime();
          break;
        case "updated":
          d =
            new Date(a.updated_at).getTime() -
            new Date(b.updated_at).getTime();
          break;
      }
      return filters.sortOrder === "asc" ? d : -d;
    });
    return out;
  }, [resumes, filters]);

  const stats = useMemo(() => {
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return {
      total: resumes.length,
      favorites: resumes.filter((r) => r.is_favorite).length,
      tags: allTags.length,
      recent: resumes.filter(
        (r) => new Date(r.updated_at).getTime() > weekAgo
      ).length,
    };
  }, [resumes, allTags]);

  /* ── Mutations ───────────────────────────────────────────────── */
  const writeMeta = async (resume: Resume, patch: Record<string, any>) => {
    const next = {
      ...resume.content,
      metadata: { ...(resume.content?.metadata || {}), ...patch },
    };
    const { error } = await supabase
      .from("resumes")
      .update({ content: next, updated_at: new Date().toISOString() })
      .eq("id", resume.id);
    if (error) throw error;
    return next;
  };

  const deleteResume = async (resume: Resume) => {
    try {
      const { error } = await supabase
        .from("resumes")
        .delete()
        .eq("id", resume.id);
      if (error) throw error;
      setResumes((prev) => prev.filter((r) => r.id !== resume.id));
      toast({
        title: "Resume deleted",
        description: "The resume has been permanently deleted.",
      });
    } catch (e) {
      toast({
        title: "Error",
        description: "Failed to delete resume",
        variant: "destructive",
      });
    }
  };

  const toggleFavorite = async (resume: Resume) => {
    const newFav = !resume.is_favorite;
    try {
      const nextContent = await writeMeta(resume, { is_favorite: newFav });
      setResumes((prev) =>
        prev.map((r) =>
          r.id === resume.id
            ? { ...r, is_favorite: newFav, content: nextContent }
            : r
        )
      );
      toast({
        title: newFav ? "Added to favourites" : "Removed from favourites",
      });
    } catch {
      toast({
        title: "Error",
        description: "Failed to update favourite status",
        variant: "destructive",
      });
    }
  };

  const updateTags = async (resume: Resume, tags: string[]) => {
    try {
      const nextContent = await writeMeta(resume, { tags });
      setResumes((prev) =>
        prev.map((r) =>
          r.id === resume.id ? { ...r, tags, content: nextContent } : r
        )
      );
      toast({ title: "Tags updated" });
    } catch {
      toast({
        title: "Error",
        description: "Failed to update tags",
        variant: "destructive",
      });
    }
  };

  const duplicateResume = async (resume: Resume) => {
    if (!session?.user) return;
    try {
      const { data, error } = await supabase
        .from("resumes")
        .insert({
          user_id: session.user.id,
          name: `${resume.name} (Copy)`,
          content: resume.content,
        })
        .select()
        .single();
      if (error) throw error;
      const copy: Resume = {
        ...(data as any),
        content: resume.content,
        tags: resume.tags,
        is_favorite: false,
        category: resume.category,
        job_title: resume.job_title,
      };
      setResumes((prev) => [copy, ...prev]);
      toast({ title: "Resume duplicated" });
    } catch {
      toast({
        title: "Error",
        description: "Failed to duplicate resume",
        variant: "destructive",
      });
    }
  };

  return {
    session,
    loading,
    resumes,
    allTags,
    filteredResumes,
    stats,
    filters,
    setFilters,
    mutations: {
      deleteResume,
      toggleFavorite,
      updateTags,
      duplicateResume,
    },
  };
}
