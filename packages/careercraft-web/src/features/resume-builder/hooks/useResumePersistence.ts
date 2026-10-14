import { type Dispatch, type SetStateAction, useCallback, useState } from "react";

import { type Toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

import type { AutoSaveStatus, ResumeData, SavedResumeRow, TemplateId } from "../types";

type ToastFn = (props: Toast) => void;

interface UseResumePersistenceParams {
  toast: ToastFn;
  dialogs: {
    setShowLoadResumeDialog: Dispatch<SetStateAction<boolean>>;
  };
  resumeData: ResumeData;
  selectedTemplate: TemplateId;
  currentResumeId: string | null;
  setCurrentResumeId: Dispatch<SetStateAction<string | null>>;
  setResumeData: Dispatch<SetStateAction<ResumeData>>;
  setSelectedTemplate: Dispatch<SetStateAction<TemplateId>>;
  setCurrentStep: Dispatch<SetStateAction<number>>;
  setResumeName: Dispatch<SetStateAction<string>>;
  setAutoSaveStatus: Dispatch<SetStateAction<AutoSaveStatus>>;
}

export function useResumePersistence({
  toast,
  dialogs,
  resumeData,
  selectedTemplate,
  currentResumeId,
  setCurrentResumeId,
  setResumeData,
  setSelectedTemplate,
  setCurrentStep,
  setResumeName,
  setAutoSaveStatus,
}: UseResumePersistenceParams) {
  const [isSaving, setIsSaving] = useState(false);
  const [savedResumes, setSavedResumes] = useState<SavedResumeRow[]>([]);
  const [isLoadingResumes, setIsLoadingResumes] = useState(false);
  const [saveResumeName, setSaveResumeName] = useState("");
  const [saveCategory, setSaveCategory] = useState("general");
  const [saveTags, setSaveTags] = useState<string[]>([]);

  const loadSavedResumes = useCallback(async () => {
    setIsLoadingResumes(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Sign in to open your saved résumés",
          variant: "destructive",
        });
        return;
      }
      const { data, error } = await supabase
        .from("resumes")
        .select("id, name, content, created_at")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      setSavedResumes((data || []) as SavedResumeRow[]);
      dialogs.setShowLoadResumeDialog(true);
    } catch (error) {
      console.error("Error loading resumes:", error);
      toast({ title: "Couldn't load your résumés", variant: "destructive" });
    } finally {
      setIsLoadingResumes(false);
    }
  }, [toast, dialogs]);

  const loadSelectedResume = useCallback(
    (resume: SavedResumeRow) => {
      try {
        let content = resume.content;
        if (typeof content === "string") content = JSON.parse(content);

        if (content?.metadata) {
          const { metadata, ...resumeContent } = content;
          setResumeData(resumeContent as ResumeData);
          if (metadata.category) setSaveCategory(metadata.category);
          if (metadata.tags) setSaveTags(metadata.tags);
          if (metadata.template) setSelectedTemplate(metadata.template);
        } else {
          setResumeData(content as ResumeData);
        }

        setCurrentResumeId(resume.id);
        setResumeName(resume.name);
        setSaveResumeName(resume.name);
        dialogs.setShowLoadResumeDialog(false);
        setCurrentStep(1);

        toast({
          title: "Draft reopened",
          description: `Editing “${resume.name}”.`,
        });
      } catch (error) {
        console.error("Error parsing resume:", error);
        toast({ title: "Couldn't open that résumé", variant: "destructive" });
      }
    },
    [toast, dialogs, setResumeData, setCurrentResumeId, setResumeName, setSelectedTemplate, setCurrentStep]
  );

  const saveResume = useCallback(async () => {
    setIsSaving(true);
    setAutoSaveStatus("saving");
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Not signed in",
          description: "Sign in to save your résumé.",
          variant: "destructive",
        });
        return;
      }

      const contentWithMetadata = {
        ...resumeData,
        metadata: {
          category: saveCategory,
          tags: saveTags,
          is_favorite: false,
          template: selectedTemplate,
          created_at: new Date().toISOString(),
        },
      };

      const content = JSON.stringify(contentWithMetadata);

      if (currentResumeId) {
        const { error } = await supabase
          .from("resumes")
          .update({
            name: saveResumeName || "Untitled Résumé",
            content,
            template_id: selectedTemplate,
            updated_at: new Date().toISOString(),
          })
          .eq("id", currentResumeId);
        if (error) throw error;

        toast({
          title: "Changes saved",
          description: "Your résumé is up to date.",
        });
      } else {
        const { data, error } = await supabase
          .from("resumes")
          .insert({
            user_id: user.id,
            name: saveResumeName || "Untitled Résumé",
            content,
            file_type: "builder",
            template_id: selectedTemplate,
          })
          .select("id")
          .single();
        if (error) throw error;
        if (data) setCurrentResumeId(data.id);

        toast({
          title: "Résumé saved",
          description: "You'll find it in My Résumés.",
          action: undefined,
        });
      }

      setAutoSaveStatus("saved");
    } catch (error) {
      console.error("Save error:", error);
      toast({
        title: "Couldn't save",
        description: "Your résumé wasn't saved. Try again in a moment.",
        variant: "destructive",
      });
      setAutoSaveStatus("unsaved");
    } finally {
      setIsSaving(false);
    }
  }, [
    resumeData,
    saveCategory,
    saveTags,
    saveResumeName,
    selectedTemplate,
    currentResumeId,
    setCurrentResumeId,
    setAutoSaveStatus,
    toast,
  ]);

  return {
    isSaving,
    savedResumes,
    isLoadingResumes,
    saveResumeName,
    setSaveResumeName,
    saveCategory,
    setSaveCategory,
    saveTags,
    setSaveTags,
    loadSavedResumes,
    loadSelectedResume,
    saveResume,
  };
}

