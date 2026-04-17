/* ───────────────────────────────────────────────────────────
   useResumeBuilder — the state machine + every mutation.
   The page stays thin; this owns the model.
   ─────────────────────────────────────────────────────────── */

import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import {
  type Dispatch,
  type SetStateAction,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";

import { useToast } from "@/hooks/use-toast";
import { useSecureResumeUpload } from "@/hooks/useSecurity";
import { usePersonalization } from "@/hooks/usePersonalization";
import { supabase } from "@/integrations/supabase/client";
import { rewriteBullet } from "@/lib/aiRewriter";
import {
  type AIResumeData,
  parseResumeStructured,
  parseResumeWithAI,
} from "@/lib/resumeParser";
import { auditFileOperation } from "@/lib/security/auditLog";

import {
  aiDataToResumeData,
  createEmptyResumeData,
  parseTextToResumeData,
} from "../lib/resumeData";
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
  const navigate = useNavigate();
  const { toast } = useToast();
  const previewRef = useRef<HTMLDivElement>(null);

  // ── Security ────────────────────────────────────────────────
  const {
    validateFile: secureValidateFile,
    isValidating: isSecurityValidating,
  } = useSecureResumeUpload({
    onValidationError: (errors) => {
      toast({
        title: "Security check failed",
        description: errors.join(", "),
        variant: "destructive",
      });
    },
    onSecurityThreat: (threats) => {
      toast({
        title: "Security threat detected",
        description:
          "The file contains potentially malicious content and was blocked.",
        variant: "destructive",
      });
      console.error("Security threats:", threats);
    },
  });

  // ── Core state ──────────────────────────────────────────────
  const [currentStep, setCurrentStep] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedFileType, setUploadedFileType] = useState<UploadedFileType>(null);
  const [resumeData, setResumeData] = useState<ResumeData>(createEmptyResumeData());
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateId>("modern1");
  const [activeSection, setActiveSection] = useState("contact");
  const [isExporting, setIsExporting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<AutoSaveStatus>("saved");
  const [resumeName, setResumeName] = useState("");
  const [useAIParsing, setUseAIParsing] = useState(false); // default off to save tokens
  const [currentResumeId, setCurrentResumeId] = useState<string | null>(null);
  const [jobDescription, setJobDescription] = useState("");
  const [rewritingBulletId, setRewritingBulletId] = useState<string | null>(null);
  const [showLivePreview, setShowLivePreview] = useState(false);

  // Save-dialog metadata
  const [saveResumeName, setSaveResumeName] = useState("");
  const [saveCategory, setSaveCategory] = useState("general");
  const [saveTags, setSaveTags] = useState<string[]>([]);

  // Saved-resumes list (lazy-loaded on demand)
  const [savedResumes, setSavedResumes] = useState<SavedResumeRow[]>([]);
  const [isLoadingResumes, setIsLoadingResumes] = useState(false);

  // Personalization
  const {
    profile: userProfile,
    hasPersonalizationData,
    getResumeAutoFillData,
  } = usePersonalization();

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
          description: `${parsed.experience.length} roles · ${parsed.skills.length} skills ready to compose.`,
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
            } skills extracted. Compose & typeset.`,
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

  // ── File handling ──────────────────────────────────────────
  const handleFile = useCallback(
    async (file: File) => {
      setIsProcessing(true);
      setUploadProgress(0);
      try {
        const securityResult = await secureValidateFile(file);
        if (!securityResult.isValid) {
          auditFileOperation(
            "upload",
            file.name,
            undefined,
            false,
            securityResult.errors.join(", ")
          );
          toast({
            title: "File rejected",
            description:
              securityResult.errors[0] || "File failed security validation",
            variant: "destructive",
          });
          setIsProcessing(false);
          return;
        }
        auditFileOperation(
          "upload",
          securityResult.sanitizedFilename || file.name,
          undefined,
          true
        );

        let fileType: UploadedFileType = "pdf";
        if (
          file.type.includes("word") ||
          file.name.endsWith(".docx") ||
          file.name.endsWith(".doc")
        )
          fileType = "docx";
        else if (file.type.startsWith("image/")) fileType = "image";
        else if (file.type === "text/plain" || file.name.endsWith(".txt"))
          fileType = "txt";
        setUploadedFileType(fileType);

        if (fileType === "txt") {
          const textContent = await file.text();
          await handleTextContent(textContent);
          return;
        }

        let data: ResumeData;
        if (useAIParsing) {
          const aiParsed = await parseResumeWithAI(file, (p) =>
            setUploadProgress(p)
          );
          data = aiDataToResumeData(aiParsed);
          toast({
            title: "AI reading complete",
            description: `${data.experience.length} roles · ${data.education.length} schools · ${data.skills.length} skills pulled.`,
          });
        } else {
          const parsed = await parseResumeStructured(file, (p) =>
            setUploadProgress(p)
          );
          data = parseTextToResumeData(parsed.rawText);
          toast({
            title: "Text extracted",
            description: `Text pulled from ${file.name}. Toggle on AI parsing for finer results.`,
          });
        }

        setResumeData(data);
        setCurrentStep(1);
      } catch (error) {
        console.error("File processing error:", error);
        toast({
          title: "Processing failed",
          description:
            error instanceof Error ? error.message : "Could not process the file",
          variant: "destructive",
        });
      } finally {
        setIsProcessing(false);
        setUploadProgress(0);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [secureValidateFile, toast, useAIParsing]
  );

  const handleTextContent = useCallback(
    async (text: string) => {
      setIsProcessing(true);
      setUploadProgress(20);
      try {
        let data: ResumeData;
        if (useAIParsing) {
          const blob = new Blob([text], { type: "text/plain" });
          const file = new globalThis.File([blob], "pasted-resume.txt", {
            type: "text/plain",
          });
          setUploadProgress(40);
          const aiParsed = await parseResumeWithAI(file, (p) =>
            setUploadProgress(40 + p * 0.5)
          );
          data = aiDataToResumeData(aiParsed);
          toast({
            title: "AI reading complete",
            description: `${data.experience.length} roles · ${data.education.length} schools · ${data.skills.length} skills pulled.`,
          });
        } else {
          setUploadProgress(60);
          data = parseTextToResumeData(text);
          toast({
            title: "Text processed",
            description:
              "Basic extraction complete. Toggle on AI parsing for finer results.",
          });
        }
        setUploadProgress(100);
        setResumeData(data);
        dialogs.setShowPasteDialog(false);
        dialogs.setPastedText("");
        setCurrentStep(1);
      } catch (error) {
        console.error("Text processing error:", error);
        toast({
          title: "Processing failed",
          description:
            error instanceof Error ? error.message : "Could not process the text",
          variant: "destructive",
        });
      } finally {
        setIsProcessing(false);
        setUploadProgress(0);
      }
    },
    [useAIParsing, toast, dialogs]
  );

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

  // ── Saved résumés ───────────────────────────────────────────
  const loadSavedResumes = useCallback(async () => {
    setIsLoadingResumes(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Please sign in to open the cabinet",
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
      toast({ title: "Failed to open the cabinet", variant: "destructive" });
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
        toast({ title: "Failed to reopen draft", variant: "destructive" });
      }
    },
    [toast, dialogs]
  );

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

  // ── PDF export ──────────────────────────────────────────────
  const exportToPDF = useCallback(async () => {
    if (!previewRef.current) return;
    setIsExporting(true);
    try {
      const canvas = await html2canvas(previewRef.current, {
        scale: 4,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
        width: 794,
        height: previewRef.current.scrollHeight,
        windowWidth: 794,
      });

      const imgData = canvas.toDataURL("image/jpeg", 0.95);
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
        compress: true,
      });

      const pageWidth = 210;
      const pageHeight = 297;
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * pageWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;
      let pageCount = 0;
      while (heightLeft > 0) {
        if (pageCount > 0) pdf.addPage();
        pdf.addImage(
          imgData,
          "JPEG",
          0,
          position,
          imgWidth,
          imgHeight,
          undefined,
          "FAST"
        );
        heightLeft -= pageHeight;
        position -= pageHeight;
        pageCount++;
      }

      pdf.save(`${resumeData.contact.name || "resume"}.pdf`);

      toast({
        title: "PDF pressed",
        description: `High-quality export · ${pageCount} page${
          pageCount > 1 ? "s" : ""
        }.`,
      });
    } catch (error) {
      console.error("Export error:", error);
      toast({
        title: "Press failed",
        description: "Could not generate the PDF.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  }, [resumeData.contact.name, toast]);

  // ── Save / Update ───────────────────────────────────────────
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
          description: "Please sign in to file your draft.",
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
        const { error } = await (supabase.from("resumes").update as any)({
          name: saveResumeName || "Untitled Résumé",
          content,
          template_id: selectedTemplate,
          updated_at: new Date().toISOString(),
        }).eq("id", currentResumeId);
        if (error) throw error;

        toast({
          title: "Draft filed",
          description: "Your edits are in the cabinet.",
        });
      } else {
        const { data, error } = await (supabase.from("resumes").insert as any)({
          user_id: user.id,
          name: saveResumeName || "Untitled Résumé",
          content,
          file_type: "builder",
          template_id: selectedTemplate,
        })
          .select()
          .single();
        if (error) throw error;
        if (data) setCurrentResumeId((data as any).id);

        toast({
          title: "Draft filed",
          description: "Your draft now lives in the cabinet.",
          action: undefined,
        });
      }

      setAutoSaveStatus("saved");
    } catch (error) {
      console.error("Save error:", error);
      toast({
        title: "Filing failed",
        description: "Could not save the résumé.",
        variant: "destructive",
      });
      setAutoSaveStatus("unsaved");
    } finally {
      setIsSaving(false);
    }
  // navigate intentionally omitted — toast action is handled by the page
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    resumeData,
    saveCategory,
    saveTags,
    saveResumeName,
    selectedTemplate,
    currentResumeId,
    toast,
  ]);

  // unused but kept for future toast "View" action
  void navigate;

  // ── AI Import payload handler ──────────────────────────────
  const applyAIResumeData = useCallback(
    (aiData: AIResumeData) => {
      setResumeData(aiDataToResumeData(aiData));
      setCurrentStep(1);
      setAutoSaveStatus("unsaved");
      toast({
        title: "Draft imported",
        description: "AI read your résumé. Review every line before filing.",
      });
    },
    [toast]
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
