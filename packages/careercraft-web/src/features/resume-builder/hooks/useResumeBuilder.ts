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
import { useNavigate } from "react-router-dom";

import { useToast } from "@/hooks/use-toast";
import { usePersonalization } from "@/hooks/usePersonalization";
import { supabase } from "@/integrations/supabase/client";
import { rewriteBullet } from "@/lib/aiRewriter";
import { type PdfDensity } from "@/lib/pdfExport";
import { type AIResumeData } from "@/lib/resumeParser";

import { claimGuestDraft } from "../lib/claimGuestDraft";
import {
  hasMeaningfulGuestDraft,
  loadGuestDraft,
  saveGuestDraft,
  setGuestReturnTo,
  takeHandoffNote,
} from "../lib/guestDraft";
import {
  aiDataToResumeData,
  createEmptyResumeData,
  parseTextToResumeData,
} from "../lib/resumeData";
import { useResumeExport } from "./useResumeExport";
import { useResumeImport } from "./useResumeImport";
import { useResumePersistence } from "./useResumePersistence";
import type {
  AccountGateReason,
  AutoSaveStatus,
  ContactInfo,
  Education,
  Experience,
  ResumeData,
  SavedResumeRow,
  TemplateId,
  UploadedFileType,
} from "../types";
import { CONTINUE_RETURN_PATH } from "../types";

const ACCOUNT_GATE_COPY: Record<AccountGateReason, { title: string; description: string }> = {
  export: {
    title: "Make a free account to download",
    description: "Your résumé comes with you. It'll be waiting when you get back here.",
  },
  "ai-read-file": {
    title: "Make a free account to read that file",
    description:
      "Reading PDFs, Word files and photos needs an account. Or paste your résumé's text to keep going without one.",
  },
  "ai-smart-import": {
    title: "Uploading needs a free account",
    description:
      "Or paste your résumé's text instead to keep building without one.",
  },
  "ai-rewrite": {
    title: "Make a free account to rewrite points",
    description: "Your draft comes with you. Nothing you've typed is lost.",
  },
  "continue-ats": {
    title: "Make a free account for the ATS check",
    description: "Your draft comes with you, ready to check against a job ad.",
  },
  "continue-jobs": {
    title: "Make a free account to browse jobs",
    description: "Your draft comes with you while you look at openings across Australia.",
  },
  "continue-news": {
    title: "Make a free account for market news",
    description: "Your draft comes with you while you look at hiring and pay by industry.",
  },
  "continue-chat": {
    title: "Make a free account for career chat",
    description: "Your draft comes with you, so you can ask about it.",
  },
};

/** Full API surface returned by the hook. */
export interface UseResumeBuilderReturn {
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
  isSecurityValidating: boolean;

  // preview
  showLivePreview: boolean;
  setShowLivePreview: Dispatch<SetStateAction<boolean>>;
  activeSection: string;
  setActiveSection: Dispatch<SetStateAction<string>>;

  // export / save
  isExporting: boolean;
  isSaving: boolean;
  pdfDensity: PdfDensity;
  setPdfDensity: (density: PdfDensity) => void;

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

  // guest mode — building without an account
  /** True while there is no session. Drives which affordances show. */
  isGuest: boolean;
  /** False until the session check resolves; the page holds its render until then. */
  isAuthResolved: boolean;
  /** False when storage refused the draft — the UI must not promise it saved. */
  isDraftPersisted: boolean;
  /** Flush the draft, remember where we are, then send the guest to signup. */
  requireAccount: (
    reason: AccountGateReason,
    options?: { returnTo?: string },
  ) => void;

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
  const navigate = useNavigate();

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

  // ── Guest mode ──────────────────────────────────────────────
  /* The builder is public. Everything local works without an account —
     typing, templates, live preview, the PDF preview itself. Anything that
     needs a server (AI, saving, export) routes through requireAccount. The
     draft lives in localStorage until they sign up, at which point
     claimGuestDraft files it under the new user. Declared before the
     import/persistence hooks because they take isGuest. */

  /* Defaults to guest deliberately. The session check is async, and the two
     ways to be wrong are not equal: showing a signed-in user a guest button
     for one frame is cosmetic, whereas showing a guest the ungated Export
     button lets them walk straight through the gate. Fail closed.
     ResumeBuilderPage also holds its render until isAuthResolved. */
  const [isGuest, setIsGuest] = useState(true);
  const [isAuthResolved, setIsAuthResolved] = useState(false);
  const [isDraftPersisted, setIsDraftPersisted] = useState(true);
  const [draftRestored, setDraftRestored] = useState(false);

  /** Who is signed in, for the rescue path. A ref because the effect that
   *  needs it must not re-run when the session object identity changes. */
  const userIdRef = useRef<string | null>(null);
  /** True once the arrival message has been shown, so the rescue below does
   *  not say the same thing twice in different words. */
  const handoffAnnouncedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled) return;
      userIdRef.current = session?.user?.id ?? null;
      setIsGuest(!session?.user);
      setIsAuthResolved(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      userIdRef.current = session?.user?.id ?? null;
      setIsGuest(!session?.user);
      setIsAuthResolved(true);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  /* The arrival half of the handoff.
     The message about what happened to their draft is deliberately NOT shown
     at the /auth end: OAuth and email-confirmation links both reload the
     page, and a toast is in-memory, so it would be gone before they got
     here. The resolver leaves a note; this reads it where they land, and the
     read consumes it so a refresh can never replay it. */
  useEffect(() => {
    if (!isAuthResolved || isGuest) return;

    const note = takeHandoffNote();
    if (!note) return;

    handoffAnnouncedRef.current = true;

    if (note.outcome === "claim-failed") {
      toast({
        title: "Couldn't save your résumé to your account",
        description:
          "It's still saved on this device and open here. Save it when you're ready.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Your résumé came with you",
      description:
        note.intent === "export"
          ? "Filed under your account. Download it below."
          : "Filed under your account — find it any time in My résumés.",
    });
  }, [isAuthResolved, isGuest, toast]);

  /* The one route from "guest hit something that needs a server" to "guest is
     at signup with their work safe". Every gated affordance calls this; there
     is no second path and no feature-specific redirect to keep in sync.

     Held in a ref so the callback stays stable — otherwise it would change on
     every keystroke and churn the import callbacks that close over it. */
  const gateStateRef = useRef({ resumeData, selectedTemplate, currentStep });
  useEffect(() => {
    gateStateRef.current = { resumeData, selectedTemplate, currentStep };
  });

  const requireAccount = useCallback(
    (reason: AccountGateReason, options?: { returnTo?: string }) => {
      const { resumeData: data, selectedTemplate: template, currentStep: step } =
        gateStateRef.current;

      /* Flush synchronously — the debounced autosave may not have fired and we
         are about to navigate away. */
      const persisted = saveGuestDraft(data, template, step);
      setIsDraftPersisted(persisted);

      const continuePath =
        reason in CONTINUE_RETURN_PATH
          ? CONTINUE_RETURN_PATH[reason as keyof typeof CONTINUE_RETURN_PATH]
          : undefined;
      const returnTo = options?.returnTo ?? continuePath ?? "/builder";

      const copy = ACCOUNT_GATE_COPY[reason];
      if (persisted) {
        /* The reason travels with the path. Only `export` can actually be
           finished on the way back — the AI gates needed a File or a job
           description that cannot survive a redirect — so the resolver uses
           it to pick the step they land on rather than resuming blindly.
           continue-* reasons land on another tool after claim. */
        setGuestReturnTo(returnTo, reason);
        toast({ title: copy.title, description: copy.description });
      } else {
        /* Storage refused the write, so promising the draft will follow them
           would be a lie. Send them anyway — signing up is still the right
           next step — but tell them the truth about what's at risk. */
        toast({
          title: copy.title,
          description:
            "This browser is blocking local storage, so your draft can't be held while you sign up. Copy anything you'd hate to retype.",
          variant: "destructive",
        });
      }

      navigate("/auth");
    },
    [navigate, toast]
  );

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
    isGuest,
    requireAccount,
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

  // Layout density for the PDF (remembered across sessions — most users
  // settle on one that makes their resume fit and keep it).
  const [pdfDensity, setPdfDensityState] = useState<PdfDensity>(() => {
    const stored = window.localStorage.getItem("cc-pdf-density");
    return stored === "snug" || stored === "compact" ? stored : "normal";
  });
  const setPdfDensity = useCallback((density: PdfDensity) => {
    setPdfDensityState(density);
    try {
      window.localStorage.setItem("cc-pdf-density", density);
    } catch {
      /* storage unavailable — session-only */
    }
  }, []);

  const { isExporting, exportToPDF: runExport } = useResumeExport({
    resumeData,
    selectedTemplate,
    resumeDisplayName: resumeData.contact.name || "resume",
    pdfDensity,
    toast,
  });

  /* The export button is hidden for guests, but the gate belongs on the
     action, not only on the button that happens to call it. */
  const exportToPDF = useCallback(async () => {
    if (isGuest) {
      requireAccount("export");
      return;
    }
    await runExport();
  }, [isGuest, requireAccount, runExport]);

  /* Restore a local draft — but never clobber content a handoff
     (ATS / rewrite / upload / ?id=) already placed.

     This runs for signed-in users too, and that is the point. A draft only
     gets cleared once it is safely on the server, so any failure between
     "guest clicked sign up" and "row inserted" leaves one sitting in
     localStorage. The old guest-only guard meant that draft became
     permanently invisible the moment they had an account: still on disk,
     never read by anything again. Now it gets claimed on arrival instead. */
  useEffect(() => {
    if (!isAuthResolved || draftRestored) return;

    /* A ?id= load owns the editor — it has its own async fetch in flight and
       restoring underneath it would race. */
    if (new URLSearchParams(window.location.search).get("id")) return;

    setDraftRestored(true);

    const alreadyHasContent =
      Boolean(resumeData.contact?.name?.trim()) ||
      Boolean(resumeData.summary?.trim()) ||
      resumeData.experience.length > 0;
    if (alreadyHasContent) return;

    const draft = loadGuestDraft();
    if (!draft) return;

    setResumeData(draft.resumeData);
    setSelectedTemplate(draft.selectedTemplate);
    setCurrentStep(draft.currentStep);

    if (isGuest) {
      toast({
        title: "Draft restored",
        description:
          "Picking up where you left off. Saved on this device until you make an account.",
      });
      return;
    }

    /* Signed in with a stranded draft: the claim never completed. Finish it
       now rather than leaving them to notice their résumé is missing. The
       handoff note, if one is waiting, already told them what happened — so
       stay quiet unless this rescue is itself the news. */
    if (!hasMeaningfulGuestDraft(draft)) return;

    let cancelled = false;
    (async () => {
      try {
        const userId = userIdRef.current;
        if (!userId) return;
        const { claimed, resumeId } = await claimGuestDraft(userId);
        if (cancelled) return;
        if (claimed && resumeId) {
          setCurrentResumeId(resumeId);
          if (!handoffAnnouncedRef.current) {
            toast({
              title: "Draft recovered",
              description: "It didn't save the first time. It's in your account now.",
            });
          }
        }
      } catch (error) {
        console.error("[builder] Could not rescue stranded draft:", error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isAuthResolved, isGuest, draftRestored, resumeData, toast]);

  /* Persist as they work. Debounced so we aren't writing on every keystroke.
     The write can fail (private browsing, storage full); isDraftPersisted
     carries that to the UI so it never claims work is safe when it isn't. */
  useEffect(() => {
    if (!isAuthResolved || !isGuest) return;

    const timer = window.setTimeout(() => {
      setIsDraftPersisted(saveGuestDraft(resumeData, selectedTemplate, currentStep));
    }, 800);

    return () => window.clearTimeout(timer);
  }, [isAuthResolved, isGuest, resumeData, selectedTemplate, currentStep]);

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
          description: `${parsed.experience.length} jobs · ${parsed.skills.length} skills, ready to edit.`,
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
            description: `${parsed.experience?.length || 0} jobs · ${
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
            description: `Editing “${name}”. Look it over, then pick a design.`,
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

        /* The template lives in the JSON metadata for rows the builder wrote,
           and in the template_id column for older ones. Supabase's generated
           types don't cover the resumes table, so the column is narrowed here
           rather than cast to any. */
        const row = data as { template_id?: string | null };
        if (metadata?.template)
          setSelectedTemplate(metadata.template as TemplateId);
        else if (row.template_id)
          setSelectedTemplate(row.template_id as TemplateId);
        setResumeName(data.name);
        setSaveResumeName(data.name);
        setCurrentResumeId(data.id);

        /* Someone who signed up specifically to download lands on the export
           step with the PDF already rendering, not on the edit form with the
           download button three clicks away. Anything else opens for editing
           as before. Clamped, because the value comes from the URL. */
        const rawStep = urlParams.get("step");
        const stepParam = rawStep === null ? NaN : Number(rawStep);
        setCurrentStep(
          Number.isInteger(stepParam) && stepParam >= 0 && stepParam <= 3 ? stepParam : 1,
        );
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
        description: "Fill in your profile in Settings first.",
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
      title: "Filled from your profile",
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
          title: "Add the job ad first",
          description: "The rewrite matches your point to what the ad asks for.",
        });
        openJobDescDialog();
        return;
      }

      /* rewrite-resume requires a verified session, so there is nothing to
         attempt here as a guest — send them to signup before the call rather
         than after it fails. */
      if (isGuest) {
        requireAccount("ai-rewrite");
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
        toast({ title: "Point rewritten" });
      } catch (error) {
        toast({
          title: "Couldn't rewrite that point",
          description:
            error instanceof Error ? error.message : "Try again in a moment.",
          variant: "destructive",
        });
      } finally {
        setRewritingBulletId(null);
      }
    },
    [resumeData.experience, jobDescription, toast, updateBullet, isGuest, requireAccount]
  );

  // Reference to keep the openSaveDialog helper tethered; avoids unused-var lints.
  void dialogs.openSaveDialog;

  return {
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

    isGuest,
    isAuthResolved,
    isDraftPersisted,
    requireAccount,

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
    pdfDensity,
    setPdfDensity,
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
