import { useCallback, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { generateCoverLetter } from "@/lib/aiRewriter";
import {
  autoRewriteResume,
  generateAchievements,
  generateSummaries,
  rewriteExperienceSection,
  rewriteResumeStructured,
  runATSAIAnalysis,
  type ATSAIAnalysis,
} from "@/lib/atsAIAnalyzer";
import {
  parseResumeTextWithAI,
  parseResumeWithAI,
  formatResumeDataAsText,
  type AIResumeData,
} from "@/lib/resumeParser";

import type {
  AnalysisStep,
  CoverLetterTone,
  EnhancementType,
  ResultTabId,
  ResumeSource,
  SavedCoverLetter,
  SavedResume,
  SaveType,
} from "../types";

/* ───────────────── helpers (module scope) ───────────────── */

export { formatResumeDataAsText };

/** Validate that a rewrite preserves required sections and isn't truncated. */
const validateRewriteResult = (
  rewritten: string,
  original: string
): { isComplete: boolean; missingSections: string[]; hasTruncation: boolean } => {
  const missingSections: string[] = [];
  const lowerRewritten = rewritten.toLowerCase();
  const lowerOriginal = original.toLowerCase();

  const sections = [
    { name: "Contact Information", keywords: ["email", "phone", "@", "location"] },
    { name: "Professional Summary", keywords: ["summary", "professional", "objective"] },
    { name: "Work Experience", keywords: ["experience", "employment", "work history"] },
    { name: "Education", keywords: ["education", "degree", "university", "college"] },
    { name: "Skills", keywords: ["skills", "technical", "competencies"] },
  ];

  sections.forEach((section) => {
    const originalHas = section.keywords.some((kw) => lowerOriginal.includes(kw));
    if (originalHas) {
      const rewrittenHas = section.keywords.some((kw) => lowerRewritten.includes(kw));
      if (!rewrittenHas) missingSections.push(section.name);
    }
  });

  const hasTruncation =
    rewritten.length < original.length * 0.3 ||
    rewritten.endsWith("...") ||
    rewritten.endsWith("•") ||
    rewritten.endsWith("-") ||
    (rewritten.split("\n\n").length < 3 && rewritten.length > 500);

  return {
    isComplete: missingSections.length === 0 && !hasTruncation,
    missingSections,
    hasTruncation,
  };
};

/* ───────────────── hook ───────────────── */

export function useAnalysis() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();

  /* ── core workflow ─────────────────────────────────── */
  const [step, setStep] = useState<AnalysisStep>("upload");
  const [analysis, setAnalysis] = useState<ATSAIAnalysis | null>(null);
  const [fileName, setFileName] = useState("");
  const [resumeText, setResumeText] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isReanalyzing, setIsReanalyzing] = useState(false);

  /* ── enhancement state ─────────────────────────────── */
  const [activeEnhancement, setActiveEnhancement] = useState<EnhancementType | null>(
    null
  );
  const [enhancementResult, setEnhancementResult] = useState<string>("");
  const [enhancedResumeData, setEnhancedResumeData] = useState<AIResumeData | null>(
    null
  );
  const [copiedText, setCopiedText] = useState<string | null>(null);

  /* ── save / template dialogs ───────────────────────── */
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [saveType, setSaveType] = useState<SaveType>("original");
  const [saveName, setSaveName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);

  /* ── results UI ────────────────────────────────────── */
  const [activeResultTab, setActiveResultTab] = useState<ResultTabId>("overview");

  /* ── library data ──────────────────────────────────── */
  const [savedResumes, setSavedResumes] = useState<SavedResume[]>([]);
  const [savedCoverLetters, setSavedCoverLetters] = useState<SavedCoverLetter[]>([]);
  const [selectedResumeId, setSelectedResumeId] = useState<string>("");
  const [parsedResumeData, setParsedResumeData] = useState<AIResumeData | null>(null);
  const [resumeSource, setResumeSource] = useState<ResumeSource>("upload");
  const [selectedResumeTemplateId, setSelectedResumeTemplateId] = useState<
    string | null
  >(null);
  const [isBuilderResume, setIsBuilderResume] = useState(false);

  /* ── cover letter ──────────────────────────────────── */
  const [coverLetterTone, setCoverLetterTone] =
    useState<CoverLetterTone>("professional");
  const [generatedCoverLetter, setGeneratedCoverLetter] = useState("");
  const [isGeneratingCoverLetter, setIsGeneratingCoverLetter] = useState(false);
  const [selectedCoverLetterId, setSelectedCoverLetterId] = useState<string>("");
  const [coverLetterText, setCoverLetterText] = useState("");

  /* ───── Rehydrate from sessionStorage ───────────────── */
  useEffect(() => {
    const storedResume = sessionStorage.getItem("resumeText");
    const storedJob = sessionStorage.getItem("jobDescription");
    const storedFileName = sessionStorage.getItem("fileName");
    if (storedResume) setResumeText(storedResume);
    if (storedJob) setJobDescription(storedJob);
    if (storedFileName) setFileName(storedFileName);
  }, []);

  /* ───── Fetch saved resumes + cover letters ─────────── */
  useEffect(() => {
    const fetchSavedData = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const [resumesRes, coverLettersRes] = await Promise.all([
        supabase
          .from("resumes")
          .select("id, name, content, created_at, template_id")
          .eq("user_id", user.id)
          .order("updated_at", { ascending: false }),
        supabase
          .from("cover_letters")
          .select("id, content, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),
      ]);

      if (resumesRes.data) setSavedResumes(resumesRes.data as unknown as SavedResume[]);
      if (coverLettersRes.data) setSavedCoverLetters(coverLettersRes.data);
    };
    fetchSavedData();
  }, []);

  /* ───── Auto-select from ?id= query param ───────────── */
  useEffect(() => {
    const id = searchParams.get("id");
    if (!id || savedResumes.length === 0) return;
    if (selectedResumeId === id) return;
    const match = savedResumes.find((r) => r.id === id);
    if (match) handleSelectSavedResume(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedResumes, searchParams]);

  /* ───── Actions ─────────────────────────────────────── */

  const handleSelectSavedResume = useCallback(
    (resumeId: string) => {
      const resume = savedResumes.find((r) => r.id === resumeId);
      if (!resume) return;

      setSelectedResumeId(resumeId);
      setResumeSource("saved");
      setFileName(resume.name);

      let content = resume.content;
      try {
        if (typeof content === "string") content = JSON.parse(content);
      } catch {
        setResumeText(content);
        setParsedResumeData(null);
        setIsBuilderResume(false);
        setSelectedResumeTemplateId(null);
        return;
      }

      if (content?.contact) {
        setParsedResumeData(content as AIResumeData);
        setResumeText(formatResumeDataAsText(content));
        setIsBuilderResume(!!resume.template_id);
        setSelectedResumeTemplateId(resume.template_id || null);
      } else {
        setResumeText(JSON.stringify(content));
        setParsedResumeData(null);
        setIsBuilderResume(false);
        setSelectedResumeTemplateId(null);
      }

      toast({
        title: "Resume loaded",
        description: resume.template_id
          ? `"${resume.name}" loaded with its template — edit in Builder after the audit.`
          : `"${resume.name}" selected for the audit.`,
      });
    },
    [savedResumes, toast]
  );

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;

      setIsUploading(true);
      setResumeSource("upload");
      try {
        const aiData = await parseResumeWithAI(file);
        setParsedResumeData(aiData);
        const text = formatResumeDataAsText(aiData);
        setResumeText(text);
        setFileName(file.name);
        setSelectedResumeId("");
        sessionStorage.setItem("resumeText", text);
        sessionStorage.setItem("fileName", file.name);
        toast({
          title: "✓ Resume parsed",
          description: "Now paste a job description to audit against.",
        });
      } catch (error) {
        toast({
          title: "Upload failed",
          description:
            error instanceof Error ? error.message : "Could not parse the file.",
          variant: "destructive",
        });
      } finally {
        setIsUploading(false);
      }
    },
    [toast]
  );

  const handleAnalyze = useCallback(async () => {
    if (!resumeText || !jobDescription.trim()) {
      toast({
        title: "Missing pages",
        description: "Both a résumé and a job description are required.",
        variant: "destructive",
      });
      return;
    }

    setStep("analyzing");
    setIsAnalyzing(true);
    sessionStorage.setItem("jobDescription", jobDescription);

    try {
      const result = await runATSAIAnalysis(resumeText, jobDescription);
      setAnalysis(result);
      setStep("results");

      if (selectedResumeId) {
        await supabase
          .from("resumes")
          .update({
            ats_score: result.overallScore,
            last_analyzed_at: new Date().toISOString(),
            last_job_description: jobDescription.substring(0, 500),
          } as any)
          .eq("id", selectedResumeId);
      }

      toast({
        title: "Audit complete",
        description: `The reading: ${result.overallScore} / 100.`,
      });
    } catch (error) {
      toast({
        title: "Audit failed",
        description:
          error instanceof Error
            ? error.message
            : "Could not analyse the résumé.",
        variant: "destructive",
      });
      setStep("upload");
    } finally {
      setIsAnalyzing(false);
    }
  }, [resumeText, jobDescription, selectedResumeId, toast]);

  const handleEnhancement = useCallback(
    async (type: EnhancementType) => {
      if (!resumeText || !jobDescription) {
        toast({
          title: "Missing pages",
          description: "Both a résumé and a job description are required.",
          variant: "destructive",
        });
        return;
      }

      if (type === "auto-rewrite") {
        if (resumeText.length < 100) {
          toast({
            title: "Résumé too short",
            description: "The draft seems incomplete — upload a fuller one.",
            variant: "destructive",
          });
          return;
        }

        if (!analysis) {
          toast({
            title: "Audit recommended",
            description: "Running the audit first for a sharper rewrite…",
          });
          try {
            setStep("analyzing");
            setIsAnalyzing(true);
            const result = await runATSAIAnalysis(resumeText, jobDescription);
            setAnalysis(result);
            setStep("results");
            toast({
              title: "Audit complete",
              description: `The reading: ${result.overallScore} / 100.`,
            });
          } catch {
            toast({
              title: "Audit failed",
              description: "Proceeding with the rewrite regardless.",
              variant: "destructive",
            });
          } finally {
            setIsAnalyzing(false);
          }
        }

        const lowerText = resumeText.toLowerCase();
        const hasContact =
          lowerText.includes("@") ||
          lowerText.includes("email") ||
          lowerText.includes("phone");
        const hasExperience =
          lowerText.includes("experience") ||
          lowerText.includes("employment") ||
          lowerText.includes("work");

        if (!hasContact || !hasExperience) {
          toast({
            title: "Draft may be incomplete",
            description:
              "Some sections seem missing — the rewrite will try to include them.",
          });
        }
      }

      setActiveEnhancement(type);
      setEnhancementResult("");
      setEnhancedResumeData(null);

      try {
        const analysisContext = analysis || undefined;

        if (type === "auto-rewrite" && isBuilderResume && parsedResumeData) {
          const structuredResponse = await rewriteResumeStructured(
            parsedResumeData,
            jobDescription,
            analysisContext
          );
          setEnhancedResumeData(structuredResponse.result as AIResumeData);
          setEnhancementResult("");

          if (
            structuredResponse.recoveredSections &&
            structuredResponse.recoveredSections.length > 0
          ) {
            toast({
              title: "✓ Rewrite ready — some sections preserved",
              description: `Kept verbatim from the original: ${structuredResponse.recoveredSections.join(
                ", "
              )}. Review before saving.`,
              duration: 6000,
            });
          } else {
            toast({
              title: "✓ Rewrite ready",
              description:
                "Preview it below or apply it straight to the Builder.",
            });
          }
        } else {
          let result = "";
          let recovered: string[] = [];

          switch (type) {
            case "auto-rewrite": {
              const r = await autoRewriteResume(
                resumeText,
                jobDescription,
                analysisContext
              );
              result = r.result;
              recovered = r.recoveredSections || [];
              break;
            }
            case "rewrite-experience": {
              const r = await rewriteExperienceSection(
                resumeText,
                jobDescription,
                analysisContext
              );
              result = r.result;
              recovered = r.recoveredSections || [];
              break;
            }
            case "generate-achievements":
              result = await generateAchievements(
                resumeText,
                jobDescription,
                analysisContext
              );
              break;
            case "generate-summaries":
              result = await generateSummaries(
                resumeText,
                jobDescription,
                analysisContext
              );
              break;
          }

          if ((type === "auto-rewrite" || type === "rewrite-experience") && result) {
            if (recovered.length > 0) {
              toast({
                title: "✓ Rewrite ready — sections preserved",
                description: `Kept from the original: ${recovered.join(", ")}.`,
                duration: 6000,
              });
            } else {
              const validation = validateRewriteResult(result, resumeText);
              if (!validation.isComplete) {
                toast({
                  title: "⚠ Rewrite may be incomplete",
                  description:
                    validation.missingSections.length > 0
                      ? `Missing sections: ${validation.missingSections.join(", ")}.`
                      : "The text appears truncated — consider retrying.",
                  duration: 5000,
                });
              } else {
                toast({
                  title: "✓ Rewrite complete",
                  description: "All sections accounted for.",
                });
              }
            }
          } else {
            toast({ title: "✓ Draft ready" });
          }

          setEnhancementResult(result);
        }
      } catch (error) {
        toast({
          title: "Rewrite failed",
          description:
            error instanceof Error ? error.message : "Could not process request.",
          variant: "destructive",
        });
        setActiveEnhancement(null);
      }
    },
    [resumeText, jobDescription, analysis, isBuilderResume, parsedResumeData, toast]
  );

  const applyEnhancementAndReanalyze = useCallback(async () => {
    if (!enhancementResult && !enhancedResumeData) return;

    setIsReanalyzing(true);
    try {
      let newResumeText = enhancementResult;
      if (enhancedResumeData) {
        newResumeText = formatResumeDataAsText(enhancedResumeData);
        setParsedResumeData(enhancedResumeData);
      }

      setResumeText(newResumeText);
      setActiveEnhancement(null);
      setEnhancementResult("");
      setEnhancedResumeData(null);

      toast({
        title: "Re-auditing…",
        description: "Checking the new reading.",
      });

      const result = await runATSAIAnalysis(newResumeText, jobDescription);
      setAnalysis(result);

      if (selectedResumeId) {
        await supabase
          .from("resumes")
          .update({
            ats_score: result.overallScore,
            last_analyzed_at: new Date().toISOString(),
          } as any)
          .eq("id", selectedResumeId);
      }

      toast({
        title: `New reading: ${result.overallScore} / 100`,
        description:
          result.overallScore >= 80
            ? "Well set — the draft reads strongly."
            : "Keep refining — aim for 80 + for best results.",
      });
    } catch {
      toast({ title: "Re-audit failed", variant: "destructive" });
    } finally {
      setIsReanalyzing(false);
    }
  }, [
    enhancementResult,
    enhancedResumeData,
    jobDescription,
    selectedResumeId,
    toast,
  ]);

  const copyToClipboard = useCallback(
    (text: string, id: string) => {
      navigator.clipboard.writeText(text);
      setCopiedText(id);
      setTimeout(() => setCopiedText(null), 2000);
      toast({ title: "Copied to clipboard" });
    },
    [toast]
  );

  const handleGenerateCoverLetter = useCallback(async () => {
    if (!resumeText || !jobDescription) {
      toast({
        title: "Missing pages",
        description: "Résumé and job description required.",
        variant: "destructive",
      });
      return;
    }

    setIsGeneratingCoverLetter(true);
    setGeneratedCoverLetter("");

    try {
      const letter = await generateCoverLetter(
        resumeText,
        jobDescription,
        coverLetterTone
      );
      setGeneratedCoverLetter(letter);
      toast({
        title: "✓ Cover letter drafted",
        description: "Review and edit below.",
      });
    } catch (error) {
      toast({
        title: "Draft failed",
        description:
          error instanceof Error ? error.message : "Could not generate letter.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingCoverLetter(false);
    }
  }, [resumeText, jobDescription, coverLetterTone, toast]);

  const saveCoverLetter = useCallback(async () => {
    if (!generatedCoverLetter) return;
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        toast({ title: "Not logged in", variant: "destructive" });
        return;
      }
      const { error } = await supabase.from("cover_letters").insert({
        user_id: user.id,
        content: generatedCoverLetter,
        job_description: jobDescription,
        tone: coverLetterTone,
        notes: `Generated from ATS Analysis — Score: ${
          analysis?.overallScore || "N/A"
        }/100`,
      });
      if (error) throw error;
      toast({
        title: "✓ Cover letter filed",
        description: "Find it in your Cover Letter library.",
      });
    } catch {
      toast({ title: "Save failed", variant: "destructive" });
    }
  }, [generatedCoverLetter, jobDescription, coverLetterTone, analysis, toast]);

  const openSaveDialog = useCallback(
    (type: SaveType) => {
      setSaveType(type);
      setSaveName(type === "original" ? fileName : `${fileName} (Enhanced)`);
      setSaveDialogOpen(true);
    },
    [fileName]
  );

  const saveToResumeManager = useCallback(async () => {
    if (!saveName.trim()) {
      toast({ title: "Please enter a name", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Please sign in",
          description: "You need to be signed in to save résumés.",
          variant: "destructive",
        });
        return;
      }

      const content =
        saveType === "enhanced" && enhancementResult ? enhancementResult : resumeText;

      toast({
        title: "Parsing résumé…",
        description: "Converting to a structured format.",
      });

      let parsedData: AIResumeData | null = null;
      if (parsedResumeData && saveType === "original") {
        parsedData = parsedResumeData;
      } else {
        try {
          parsedData = await parseResumeTextWithAI(content);
        } catch (parseError) {
          console.error("Parse error:", parseError);
          parsedData = null;
        }
      }

      if (!parsedData || !parsedData.contact) {
        toast({
          title: "Could not parse résumé",
          description: "Opening the Builder for manual editing.",
          variant: "destructive",
        });
        sessionStorage.setItem("atsResumeText", content);
        sessionStorage.setItem("atsResumeName", saveName);
        navigate("/builder?from=ats-text");
        return;
      }

      sessionStorage.setItem("atsResumeData", JSON.stringify(parsedData));
      sessionStorage.setItem("atsResumeName", saveName);
      sessionStorage.setItem("rewriteJobDescription", jobDescription);

      toast({
        title: "✓ Résumé parsed",
        description: "Opening the Builder to pick a template.",
      });

      setSaveDialogOpen(false);
      navigate("/builder?from=ats");
    } catch (error) {
      console.error("Error saving:", error);
      toast({
        title: "Save failed",
        description: "Could not save the résumé.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  }, [
    saveName,
    saveType,
    enhancementResult,
    resumeText,
    parsedResumeData,
    jobDescription,
    navigate,
    toast,
  ]);

  const handleNewAnalysis = useCallback(() => {
    setStep("upload");
    setAnalysis(null);
    setEnhancementResult("");
    setActiveEnhancement(null);
    setEnhancedResumeData(null);
  }, []);

  const clearResume = useCallback(() => {
    setResumeText("");
    setSelectedResumeId("");
    setParsedResumeData(null);
    setFileName("");
  }, []);

  const pickCoverLetter = useCallback(
    (id: string) => {
      setSelectedCoverLetterId(id);
      const cl = savedCoverLetters.find((c) => c.id === id);
      if (cl) setCoverLetterText(cl.content);
    },
    [savedCoverLetters]
  );

  const goToCoverLetterEditor = useCallback(() => {
    sessionStorage.setItem("atsResumeText", resumeText);
    sessionStorage.setItem("rewriteJobDescription", jobDescription);
    if (selectedResumeId) {
      sessionStorage.setItem("atsResumeId", selectedResumeId);
      const resume = savedResumes.find((r) => r.id === selectedResumeId);
      if (resume) sessionStorage.setItem("atsResumeName", resume.name);
    }
    navigate("/cover-letter?from=ats");
  }, [resumeText, jobDescription, selectedResumeId, savedResumes, navigate]);

  const goToBuilderWithEnhanced = useCallback(() => {
    if (!enhancedResumeData) return;
    sessionStorage.setItem("atsResumeData", JSON.stringify(enhancedResumeData));
    if (selectedResumeTemplateId) {
      sessionStorage.setItem("atsResumeTemplate", selectedResumeTemplateId);
    }
    navigate("/builder?from=ats-enhanced");
  }, [enhancedResumeData, selectedResumeTemplateId, navigate]);

  const addToJobTracker = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        toast({ title: "Please sign in", variant: "destructive" });
        return;
      }
      const jobLines = jobDescription.split("\n").filter((l) => l.trim());
      const extractedTitle = jobLines[0]?.substring(0, 100) || "Job Application";
      const { error } = await supabase.from("job_applications").insert({
        user_id: user.id,
        job_title: extractedTitle,
        company: "Company Name",
        status: "applied",
        job_description: jobDescription,
        resume_id: selectedResumeId || null,
        notes: `ATS Score: ${analysis?.overallScore || "N/A"}/100`,
      });
      if (error) throw error;
      toast({
        title: "✓ Filed to the Job Tracker",
        description: "Edit the details from Jobs.",
      });
      setShowTemplateDialog(false);
    } catch {
      toast({ title: "Couldn't file the job", variant: "destructive" });
    }
  }, [jobDescription, selectedResumeId, analysis, toast]);

  const goBuilderFromTemplate = useCallback(() => {
    if (isBuilderResume && selectedResumeId) {
      navigate(`/builder?id=${selectedResumeId}`);
    } else if (parsedResumeData) {
      sessionStorage.setItem("atsResumeData", JSON.stringify(parsedResumeData));
      if (selectedResumeTemplateId) {
        sessionStorage.setItem("atsResumeTemplate", selectedResumeTemplateId);
      }
      navigate("/builder?from=ats");
    }
    setShowTemplateDialog(false);
  }, [
    isBuilderResume,
    selectedResumeId,
    parsedResumeData,
    selectedResumeTemplateId,
    navigate,
  ]);

  const openSaveFromTemplateDialog = useCallback(() => {
    if (!parsedResumeData) return;
    setSaveType("original");
    setSaveName(parsedResumeData.contact?.name || fileName || "Analyzed Resume");
    setShowTemplateDialog(false);
    setSaveDialogOpen(true);
  }, [parsedResumeData, fileName]);

  const clearEnhancement = useCallback(() => {
    setActiveEnhancement(null);
    setEnhancementResult("");
    setEnhancedResumeData(null);
  }, []);

  return {
    /* state */
    step,
    analysis,
    fileName,
    resumeText,
    jobDescription,
    isUploading,
    isAnalyzing,
    isReanalyzing,
    activeEnhancement,
    enhancementResult,
    enhancedResumeData,
    copiedText,
    saveDialogOpen,
    saveType,
    saveName,
    isSaving,
    showTemplateDialog,
    activeResultTab,
    savedResumes,
    savedCoverLetters,
    selectedResumeId,
    parsedResumeData,
    resumeSource,
    selectedResumeTemplateId,
    isBuilderResume,
    coverLetterTone,
    generatedCoverLetter,
    isGeneratingCoverLetter,
    selectedCoverLetterId,
    coverLetterText,

    /* setters */
    setResumeText,
    setJobDescription,
    setCoverLetterText,
    setActiveResultTab,
    setSaveDialogOpen,
    setShowTemplateDialog,
    setSaveName,
    setCoverLetterTone,
    setGeneratedCoverLetter,
    setSelectedCoverLetterId,

    /* actions */
    onDrop,
    handleSelectSavedResume,
    handleAnalyze,
    handleEnhancement,
    applyEnhancementAndReanalyze,
    copyToClipboard,
    handleGenerateCoverLetter,
    saveCoverLetter,
    openSaveDialog,
    saveToResumeManager,
    handleNewAnalysis,
    clearResume,
    pickCoverLetter,
    goToCoverLetterEditor,
    goToBuilderWithEnhanced,
    addToJobTracker,
    goBuilderFromTemplate,
    openSaveFromTemplateDialog,
    clearEnhancement,
  };
}

export type UseAnalysis = ReturnType<typeof useAnalysis>;
