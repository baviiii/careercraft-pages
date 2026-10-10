/**
 * Cover letters and everything they connect to: the user's résumés, and the
 * tracked applications each letter went out with.
 *
 * Saving writes the title and resume_id columns. The old page asked for a
 * name and dropped it, and wrote the linked résumé into `notes` as prose.
 */
import { useCallback, useEffect, useState } from "react";

import { supabase } from "@/integrations/supabase/client";

import type { LetterApplication, ResumeOption, SavedLetter } from "../types";

const LETTER_COLUMNS =
  "id, title, content, job_description, tone, category, tags, notes, resume_id, created_at, updated_at";
export const APPLICATION_COLUMNS =
  "id, job_title, company, cover_letter_id, resume_id, job_description, job_url";

export interface NewLetter {
  title: string | null;
  content: string;
  job_description: string | null;
  tone: string;
  category: string | null;
  tags: string[] | null;
  notes: string | null;
  resume_id: string | null;
}

export type LetterPatch = Partial<Omit<NewLetter, "content">> & { content?: string };

export function useCoverLetters() {
  const [letters, setLetters] = useState<SavedLetter[]>([]);
  const [resumes, setResumes] = useState<ResumeOption[]>([]);
  /** Applications that have a letter attached, for the "Sent with" chips. */
  const [sentWith, setSentWith] = useState<LetterApplication[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const [lettersRes, resumesRes, appsRes] = await Promise.all([
      supabase.from("cover_letters").select(LETTER_COLUMNS).order("updated_at", { ascending: false }),
      supabase.from("resumes").select("id, name, content").order("updated_at", { ascending: false }),
      supabase
        .from("job_applications")
        .select(APPLICATION_COLUMNS)
        .not("cover_letter_id", "is", null),
    ]);
    if (lettersRes.error) console.error("Error loading cover letters:", lettersRes.error);
    if (resumesRes.error) console.error("Error loading résumés:", resumesRes.error);
    if (appsRes.error) console.error("Error loading applications:", appsRes.error);
    setLetters((lettersRes.data as SavedLetter[] | null) ?? []);
    setResumes((resumesRes.data as ResumeOption[] | null) ?? []);
    setSentWith((appsRes.data as LetterApplication[] | null) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const applicationsFor = useCallback(
    (letterId: string) => sentWith.filter((a) => a.cover_letter_id === letterId),
    [sentWith],
  );

  /** Returns the new letter's id. */
  const saveLetter = useCallback(
    async (letter: NewLetter): Promise<string> => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Sign in to save cover letters.");
      const { data, error } = await supabase
        .from("cover_letters")
        .insert({ ...letter, user_id: user.id })
        .select("id")
        .single();
      if (error) throw error;
      await refresh();
      return data.id;
    },
    [refresh],
  );

  const updateLetter = useCallback(
    async (id: string, patch: LetterPatch) => {
      const { error } = await supabase
        .from("cover_letters")
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
      await refresh();
    },
    [refresh],
  );

  /* job_applications.cover_letter_id is ON DELETE SET NULL, so any
     application this was attached to keeps everything else. */
  const deleteLetter = useCallback(
    async (id: string) => {
      const { error } = await supabase.from("cover_letters").delete().eq("id", id);
      if (error) throw error;
      await refresh();
    },
    [refresh],
  );

  const attachToApplication = useCallback(
    async (applicationId: string, letterId: string) => {
      const { error } = await supabase
        .from("job_applications")
        .update({ cover_letter_id: letterId })
        .eq("id", applicationId);
      if (error) throw error;
      await refresh();
    },
    [refresh],
  );

  return {
    letters,
    resumes,
    loading,
    applicationsFor,
    saveLetter,
    updateLetter,
    deleteLetter,
    attachToApplication,
  };
}
