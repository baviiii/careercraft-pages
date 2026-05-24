/* ───────────────────────────────────────────────────────────
   useResumeBuilder — the state machine + every mutation.
   The page stays thin; this owns the model.
   ─────────────────────────────────────────────────────────── */

import {
  type Dispatch,
  type SetStateAction,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { useToast } from "@/hooks/use-toast";
import { usePersonalization } from "@/hooks/usePersonalization";
import { supabase } from "@/integrations/supabase/client";
import { rewriteBullet } from "@/lib/aiRewriter";
import { type AIResumeData } from "@/lib/resumeParser";

import {
  aiDataToResumeData,
  createEmptyResumeData,
  parseTextToResumeData,
} from "../lib/resumeData";
import { useResumeExport } from "./useResumeExport";
import { useResumeImport } from "./useResumeImport";
import { useResumePersistence } from "./useResumePersistence";
import type {
  AutoSaveStatus,
  ContactInfo,
  Education,
  Experience,
  ResumeData,
  SavedResumeRow,
  TemplateId,
  UploadedFileType,
} from "../types";

/** Full API surface returned by the hook. */
export interface UseResumeBuilderReturn {
  // ── refs ──
  previewRef: React.RefObject<HTMLDivElement>;

  // ── state ──
  currentStep: number;
  setCurrentStep: Dispatch<SetStateAction<number>>;

  resumeData: ResumeData;
  setResumeData: Dispatch<SetStateAction<ResumeData>>;

  selectedTemplate: TemplateId;
  setSelectedTemplate: Dispatch<SetStateAction<TemplateId>>;

  resumeName: string;
  setResumeName: Dispatch<SetStateAction<string>>;

  autoSaveStatus: AutoSaveStatus;
  setAutoSaveStatus: Dispatch<SetStateAction<AutoSaveStatus>>;

  currentResumeId: string | null;
  setCurrentResumeId: Dispatch<SetStateAction<string | null>>;

  // upload
  isProcessing: boolean;
  uploadProgress: number;
  uploadedFileType: UploadedFileType;
  useAIParsing: boolean;
  setUseAIParsing: Dispatch<SetStateAction<boolean>>;
  isSecurityValidating: boolean;

  // preview
  showLivePreview: boolean;
  setShowLivePreview: Dispatch<SetStateAction<boolean>>;
  activeSection: string;
  setActiveSection: Dispatch<SetStateAction<string>>;

  // export / save
  isExporting: boolean;
  isSaving: boolean;

  // job description
  jobDescription: string;
  setJobDescription: Dispatch<SetStateAction<string>>;
  rewritingBulletId: string | null;

  // saved resumes
  savedResumes: SavedResumeRow[];
  isLoadingResumes: boolean;

  // save dialog fields
  saveResumeName: string;
  setSaveResumeName: Dispatch<SetStateAction<string>>;
  saveCategory: string;
  setSaveCategory: Dispatch<SetStateAction<string>>;
  saveTags: string[];
  setSaveTags: Dispatch<SetStateAction<string[]>>;

  // personalization
  userProfile: ReturnType<typeof usePersonalization>["profile"];
  hasPersonalizationData: boolean;

  // ── mutations ──
  handleFile: (file: File) => Promise<void>;
  handleTextContent: (text: string) => Promise<void>;

  updateContact: (field: keyof ContactInfo, value: string) => void;
  updateSummary: (value: string) => void;

  addExperience: () => void;
  updateExperience: <K extends keyof Experience>(
    id: string,
    field: K,
    value: Experience[K]
  ) => void;
  removeExperience: (id: string) => void;
  addBullet: (expId: string) => void;
  updateBullet: (expId: string, index: number, value: string) => void;
  removeBullet: (expId: string, index: number) => void;

  addEducation: () => void;
  updateEducation: <K extends keyof Education>(
    id: string,
    field: K,
    value: Education[K]
  ) => void;
  removeEducation: (id: string) => void;

  addSkill: (skill: string) => void;
  removeSkill: (skill: string) => void;

  loadSavedResumes: () => Promise<void>;
  loadSelectedResume: (resume: SavedResumeRow) => void;

  autoFillFromProfile: () => void;

  rewriteBulletWithAI: (
    expId: string,
    bulletIndex: number,
    openJobDescDialog: () => void
  ) => Promise<void>;

  exportToPDF: () => Promise<void>;
  saveResume: () => Promise<void>;

  applyAIResumeData: (aiData: AIResumeData) => void;
}

export function useResumeBuilder(dialogs: {
  openSaveDialog: () => void;
  setShowLoadResumeDialog: Dispatch<SetStateAction<boolean>>;
  setShowAutoFillDialog: Dispatch<SetStateAction<boolean>>;
  setShowPasteDialog: Dispatch<SetStateAction<boolean>>;
  setPastedText: Dispatch<SetStateAction<string>>;
}): UseResumeBuilderReturn {
  const { toast } = useToast();
  const previewRef = useRef<HTMLDivElement>(null);

  // ── Core state ──────────────────────────────────────────────
  const [currentStep, setCurrentStep] = useState(0);
  const [resumeData, setResumeData] = useState<ResumeData>(createEmptyResumeData());
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateId>("modern1");
  const [activeSection, setActiveSection] = useState("contact");
  const [autoSaveStatus, setAutoSaveStatus] = useState<AutoSaveStatus>("saved");
  const [resumeName, setResumeName] = useState("");
  const [currentResumeId, setCurrentResumeId] = useState<string | null>(null);
  const [jobDescription, setJobDescription] = useState("");
  const [rewritingBulletId, setRewritingBulletId] = useState<string | null>(null);
  const [showLivePreview, setShowLivePreview] = useState(false);

  // Personalization
  const {
    profile: userProfile,
    hasPersonalizationData: hasPersonalizationSignal,
    getResumeAutoFillData,
  } = usePersonalization();
  const hasPersonalizationData = Boolean(hasPersonalizationSignal);

  const {
    isProcessing,
    uploadProgress,
    uploadedFileType,
    useAIParsing,
    setUseAIParsing,
    isSecurityValidating,
    handleFile,
    handleTextContent,
    applyAIResumeData,
  } = useResumeImport({
    toast,
    setResumeData,
    setCurrentStep,
    setShowPasteDialog: dialogs.setShowPasteDialog,
    setPastedText: dialogs.setPastedText,
  });

  const {
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
  } = useResumePersistence({
    toast,
    dialogs: { setShowLoadResumeDialog: dialogs.setShowLoadResumeDialog },
    resumeData,
    selectedTemplate,
    currentResumeId,
    setCurrentResumeId,
    setResumeData,
    setSelectedTemplate,
    setCurrentStep,
    setResumeName,
    setAutoSaveStatus,
  });

  const { isExporting, exportToPDF } = useResumeExport({
    resumeData,
    selectedTemplate,
    resumeDisplayName: resumeData.contact.name || "resume",
    toast,
  });

  // ── Bootstrap from sessionStorage / URL ─────────────────────
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const fromSource = urlParams.get("from");
    const templateParam = urlParams.get("template");

    // Rewrite-page handoff
    if (fromSource === "rewrite") {
      const rewriteText = sessionStorage.getItem("rewriteOptimizedText");
      const rewriteJob = sessionStorage.getItem("rewriteJobDescription");
      const rewriteTemplate =
        sessionStorage.getItem("rewriteTemplate") || templateParam;

      if (rewriteText) {
        const parsed = parseTextToResumeData(rewriteText);
        setResumeData(parsed);
        setResumeName("Optimized Résumé");
        if (rewriteJob) setJobDescription(rewriteJob);
        if (rewriteTemplate) setSelectedTemplate(rewriteTemplate as TemplateId);
        setCurrentStep(1);
        sessionStorage.removeItem("rewriteOptimizedText");
        sessionStorage.removeItem("rewriteJobDescription");
        sessionStorage.removeItem("rewriteTemplate");
        toast({
          title: "Optimised résumé loaded",
          description: `${parsed.experience.length} roles · ${parsed.skills.length} skills ready to edit.`,
        });
        return;
      }
    }

    // ATS-analysis handoff (also used by Rewrite with AI parsing)
    if (fromSource === "ats") {
      const atsData = sessionStorage.getItem("atsResumeData");
      const rewriteJob = sessionStorage.getItem("rewriteJobDescription");
      const rewriteTemplate =
        sessionStorage.getItem("rewriteTemplate") || templateParam;

      if (atsData) {
        try {
          const parsed = JSON.parse(atsData) as AIResumeData;
          const rd = aiDataToResumeData(parsed);
          setResumeData(rd);
          setResumeName(parsed.contact?.name || "Optimized Résumé");
          if (rewriteJob) setJobDescription(rewriteJob);
          if (rewriteTemplate) setSelectedTemplate(rewriteTemplate as TemplateId);
          setCurrentStep(1);
          sessionStorage.removeItem("atsResumeData");
          sessionStorage.removeItem("rewriteJobDescription");
          sessionStorage.removeItem("rewriteTemplate");
          toast({
            title: "Résumé loaded",
            description: `${parsed.experience?.length || 0} roles · ${
              parsed.skills?.length || 0
            } skills extracted. Ready to edit.`,
          });
          return;
        } catch (e) {
          console.error("Error parsing ATS resume data:", e);
        }
      }
    }

    // Cabinet / MyResumes handoff (also legacy "resumeBuilderData")
    const atsResumeData = sessionStorage.getItem("atsResumeData");
    const atsTemplate = sessionStorage.getItem("atsResumeTemplate");
    const atsName = sessionStorage.getItem("atsResumeName");
    const atsId = sessionStorage.getItem("atsResumeId");

    if (fromSource === "manager" && atsResumeData) {
      try {
        const raw =
          typeof atsResumeData === "string"
            ? JSON.parse(atsResumeData)
            : atsResumeData;
        const { metadata, ...content } = raw || {};
        setResumeData(content as ResumeData);
        if (metadata?.category) setSaveCategory(metadata.category);
        if (metadata?.tags) setSaveTags(metadata.tags);
        if (metadata?.template)
          setSelectedTemplate(metadata.template as TemplateId);
        else if (atsTemplate) setSelectedTemplate(atsTemplate as TemplateId);
        if (atsName) {
          setResumeName(atsName);
          setSaveResumeName(atsName);
        }
        if (atsId) setCurrentResumeId(atsId);
        setCurrentStep(1);
        sessionStorage.removeItem("atsResumeData");
        sessionStorage.removeItem("atsResumeTemplate");
        sessionStorage.removeItem("atsResumeName");
        sessionStorage.removeItem("atsResumeId");
        toast({
          title: "Draft reopened",
          description: `Editing “${atsName || "Untitled"}”.`,
        });
        return;
      } catch (e) {
        console.error("Error parsing cabinet payload:", e);
      }
    }

    // Legacy upload data
    const storedData = sessionStorage.getItem("resumeBuilderData");
    if (storedData) {
      try {
        const { content, name, fromUpload } = JSON.parse(storedData);
        if (content && fromUpload) {
          const parsed = parseTextToResumeData(content);
          setResumeData(parsed);
          setResumeName(name || "");
          setCurrentStep(1);
          sessionStorage.removeItem("resumeBuilderData");
          toast({
            title: "Résumé loaded",
            description: `Editing “${name}”. Review and choose a template.`,
          });
        }
      } catch (e) {
        console.error("Error parsing stored resume data:", e);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── URL ?id= load ──────────────────────────────────────────
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get("id");
    if (!id || currentResumeId === id) return;

    (async () => {
      try {
        const { data, error } = await supabase
          .from("resumes")
          .select("id, name, content, template_id, created_at")
          .eq("id", id)
          .maybeSingle();
        if (error) throw error;
        if (!data) return;

        const raw =
          typeof data.content === "string"
            ? JSON.parse(data.content)
            : data.content;
        const { metadata, ...content } = raw || {};
        setResumeData(content as ResumeData);
        if (metadata?.category) setSaveCategory(metadata.category);
        if (metadata?.tags) setSaveTags(metadata.tags);
        if (metadata?.template)
          setSelectedTemplate(metadata.template as TemplateId);
        else if ((data as any).template_id)
          setSelectedTemplate((data as any).template_id as TemplateId);
        setResumeName(data.name);
        setSaveResumeName(data.name);
        setCurrentResumeId(data.id);
        setCurrentStep(1);
      } catch (e) {
        console.error("Error loading resume from URL id:", e);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Field mutations ─────────────────────────────────────────
  const updateContact = useCallback(
    (field: keyof ContactInfo, value: string) => {
      setResumeData((prev) => ({
        ...prev,
        contact: { ...prev.contact, [field]: value },
      }));
      setAutoSaveStatus("unsaved");
    },
    []
  );

  const updateSummary = useCallback((value: string) => {
    setResumeData((prev) => ({ ...prev, summary: value }));
    setAutoSaveStatus("unsaved");
  }, []);

  const addExperience = useCallback(() => {
    const newExp: Experience = {
      id: Date.now().toString(),
      title: "",
      company: "",
      location: "",
      startDate: "",
      endDate: "",
      current: false,
      bullets: [""],
    };
    setResumeData((prev) => ({
      ...prev,
      experience: [...prev.experience, newExp],
    }));
    setAutoSaveStatus("unsaved");
  }, []);

  const updateExperience = useCallback(
    <K extends keyof Experience>(id: string, field: K, value: Experience[K]) => {
      setResumeData((prev) => ({
        ...prev,
        experience: prev.experience.map((exp) =>
          exp.id === id ? { ...exp, [field]: value } : exp
        ),
      }));
      setAutoSaveStatus("unsaved");
    },
    []
  );

  const removeExperience = useCallback((id: string) => {
    setResumeData((prev) => ({
      ...prev,
      experience: prev.experience.filter((exp) => exp.id !== id),
    }));
    setAutoSaveStatus("unsaved");
  }, []);

  const addBullet = useCallback((expId: string) => {
    setResumeData((prev) => ({
      ...prev,
      experience: prev.experience.map((exp) =>
        exp.id === expId ? { ...exp, bullets: [...exp.bullets, ""] } : exp
      ),
    }));
    setAutoSaveStatus("unsaved");
  }, []);

  const updateBullet = useCallback(
    (expId: string, index: number, value: string) => {
      setResumeData((prev) => ({
        ...prev,
        experience: prev.experience.map((exp) =>
          exp.id === expId
            ? {
                ...exp,
                bullets: exp.bullets.map((b, i) => (i === index ? value : b)),
              }
            : exp
        ),
      }));
      setAutoSaveStatus("unsaved");
    },
    []
  );

  const removeBullet = useCallback((expId: string, index: number) => {
    setResumeData((prev) => ({
      ...prev,
      experience: prev.experience.map((exp) =>
        exp.id === expId
          ? { ...exp, bullets: exp.bullets.filter((_, i) => i !== index) }
          : exp
      ),
    }));
    setAutoSaveStatus("unsaved");
  }, []);

  const addEducation = useCallback(() => {
    const newEdu: Education = {
      id: Date.now().toString(),
      degree: "",
      school: "",
      location: "",
      graduationDate: "",
    };
    setResumeData((prev) => ({
      ...prev,
      education: [...prev.education, newEdu],
    }));
    setAutoSaveStatus("unsaved");
  }, []);

  const updateEducation = useCallback(
    <K extends keyof Education>(id: string, field: K, value: Education[K]) => {
      setResumeData((prev) => ({
        ...prev,
        education: prev.education.map((edu) =>
          edu.id === id ? { ...edu, [field]: value } : edu
        ),
      }));
      setAutoSaveStatus("unsaved");
    },
    []
  );

  const removeEducation = useCallback((id: string) => {
    setResumeData((prev) => ({
      ...prev,
      education: prev.education.filter((edu) => edu.id !== id),
    }));
    setAutoSaveStatus("unsaved");
  }, []);

  const addSkill = useCallback((skill: string) => {
    const t = skill.trim();
    if (!t) return;
    setResumeData((prev) =>
      prev.skills.includes(t) ? prev : { ...prev, skills: [...prev.skills, t] }
    );
    setAutoSaveStatus("unsaved");
  }, []);

  const removeSkill = useCallback((skill: string) => {
    setResumeData((prev) => ({
      ...prev,
      skills: prev.skills.filter((s) => s !== skill),
    }));
    setAutoSaveStatus("unsaved");
  }, []);

  // ── Auto-fill ───────────────────────────────────────────────
  const autoFillFromProfile = useCallback(() => {
    if (!hasPersonalizationData) {
      toast({
        title: "Profile not set up",
        description: "Complete your profile in Settings to use auto-fill.",
        variant: "destructive",
      });
      return;
    }
    const autoFillData = getResumeAutoFillData();

    setResumeData((prev) => ({
      ...prev,
      contact: {
        name: prev.contact.name || autoFillData.contact.name,
        email: prev.contact.email || autoFillData.contact.email,
        phone: prev.contact.phone || autoFillData.contact.phone,
        location: prev.contact.location || autoFillData.contact.location,
        linkedin: prev.contact.linkedin || autoFillData.contact.linkedin,
        website: prev.contact.website || autoFillData.contact.website,
      },
      summary: prev.summary || autoFillData.summary,
      skills: prev.skills.length > 0 ? prev.skills : autoFillData.skills,
      experience:
        prev.experience.length > 0 && prev.experience[0].title
          ? prev.experience
          : autoFillData.experience.length > 0
          ? autoFillData.experience
          : prev.experience,
    }));

    dialogs.setShowAutoFillDialog(false);

    const filled: string[] = [];
    if (autoFillData.contact.name) filled.push("name");
    if (autoFillData.contact.email) filled.push("email");
    if (autoFillData.contact.phone) filled.push("phone");
    if (autoFillData.skills.length > 0)
      filled.push(`${autoFillData.skills.length} skills`);
    if (autoFillData.summary) filled.push("summary");

    toast({
      title: "Profile imported",
      description: `Filled: ${filled.join(", ")}`,
    });
    setAutoSaveStatus("unsaved");
  }, [hasPersonalizationData, getResumeAutoFillData, toast, dialogs]);

  // ── AI rewrite ──────────────────────────────────────────────
  const rewriteBulletWithAI = useCallback(
    async (expId: string, bulletIndex: number, openJobDescDialog: () => void) => {
      const exp = resumeData.experience.find((e) => e.id === expId);
      if (!exp || !exp.bullets[bulletIndex]) return;

      if (!jobDescription.trim()) {
        toast({
          title: "Target job needed",
          description: "Paste a job description to tailor the rewrite.",
        });
        openJobDescDialog();
        return;
      }

      const bulletId = `${expId}-${bulletIndex}`;
      setRewritingBulletId(bulletId);
      try {
        const rewritten = await rewriteBullet(
          exp.bullets[bulletIndex],
          jobDescription
        );
        updateBullet(expId, bulletIndex, rewritten);
        toast({ title: "Bullet rewritten" });
      } catch (error) {
        toast({
          title: "Rewrite failed",
          description:
            error instanceof Error ? error.message : "Could not rewrite",
          variant: "destructive",
        });
      } finally {
        setRewritingBulletId(null);
      }
    },
    [resumeData.experience, jobDescription, toast, updateBullet]
  );

  // Reference to keep the openSaveDialog helper tethered; avoids unused-var lints.
  void dialogs.openSaveDialog;

  return {
    previewRef,

    currentStep,
    setCurrentStep,

    resumeData,
    setResumeData,

    selectedTemplate,
    setSelectedTemplate,

    resumeName,
    setResumeName,

    autoSaveStatus,
    setAutoSaveStatus,

    currentResumeId,
    setCurrentResumeId,

    isProcessing,
    uploadProgress,
    uploadedFileType,
    useAIParsing,
    setUseAIParsing,
    isSecurityValidating,

    showLivePreview,
    setShowLivePreview,
    activeSection,
    setActiveSection,

    isExporting,
    isSaving,

    jobDescription,
    setJobDescription,
    rewritingBulletId,

    savedResumes,
    isLoadingResumes,

    saveResumeName,
    setSaveResumeName,
    saveCategory,
    setSaveCategory,
    saveTags,
    setSaveTags,

    userProfile,
    hasPersonalizationData,

    handleFile,
    handleTextContent,

    updateContact,
    updateSummary,

    addExperience,
    updateExperience,
    removeExperience,
    addBullet,
    updateBullet,
    removeBullet,

    addEducation,
    updateEducation,
    removeEducation,

    addSkill,
    removeSkill,

    loadSavedResumes,
    loadSelectedResume,

    autoFillFromProfile,
    rewriteBulletWithAI,

    exportToPDF,
    saveResume,
    applyAIResumeData,
  };
}

/** Mirror the shape of uploaded file types as a readable label. */
export const humanFileType = (t: UploadedFileType): string => {
  switch (t) {
    case "pdf":
      return "PDF";
    case "docx":
      return "Word";
    case "image":
      return "Image";
    case "txt":
      return "Text";
    default:
      return "File";
  }
};
