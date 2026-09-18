import { type Dispatch, type SetStateAction, useCallback, useState } from "react";

import { useSecureResumeUpload } from "@/hooks/useSecurity";
import { type ToastActionElement, type ToastProps } from "@/hooks/use-toast";
import {
  type AIResumeData,
  extractResumeFromFile,
  parseResumeTextWithAI,
} from "@/lib/resumeParser";
import { auditFileOperation } from "@/lib/security/auditLog";

import { aiDataToResumeData, parseTextToResumeData } from "../lib/resumeData";
import type { AccountGateReason, ResumeData, UploadedFileType } from "../types";

type ToastFn = (props: Omit<ToastProps, "id"> & { action?: ToastActionElement }) => void;

interface UseResumeImportParams {
  toast: ToastFn;
  setResumeData: Dispatch<SetStateAction<ResumeData>>;
  setCurrentStep: Dispatch<SetStateAction<number>>;
  setShowPasteDialog: Dispatch<SetStateAction<boolean>>;
  setPastedText: Dispatch<SetStateAction<string>>;
  /** Building without an account — the AI endpoints are unreachable. */
  isGuest: boolean;
  /** Send a guest to signup with their draft kept. */
  requireAccount: (reason: AccountGateReason) => void;
}

export function useResumeImport({
  toast,
  setResumeData,
  setCurrentStep,
  setShowPasteDialog,
  setPastedText,
  isGuest,
  requireAccount,
}: UseResumeImportParams) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedFileType, setUploadedFileType] = useState<UploadedFileType>(null);
  const [useAIParsing, setUseAIParsing] = useState(true);

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

  const handleTextContent = useCallback(
    async (text: string) => {
      /* Two reasons to skip the model: the caller has no session (parse-resume
         verifies the JWT, so the call cannot succeed), or a signed-in user
         turned AI extraction off. Text is the one input with a real local
         parser behind it, so either way pasting still works — no dead end,
         and no signup wall on the one path that doesn't need one. */
      const useAI = useAIParsing && !isGuest;

      if (!useAI) {
        setResumeData(parseTextToResumeData(text));
        setShowPasteDialog(false);
        setPastedText("");
        setCurrentStep(1);
        toast({
          title: "Text added",
          description: isGuest
            ? "Parsed on this device — check the fields. A free account lets AI sort it for you."
            : "Parsed without AI — check the fields, or switch AI extraction on to have it sorted.",
        });
        return;
      }

      setIsProcessing(true);
      setUploadProgress(20);
      try {
        setUploadProgress(40);
        const aiParsed = await parseResumeTextWithAI(text, "pasted-resume.txt", "text/plain");
        const data = aiDataToResumeData(aiParsed);
        toast({
          title: "AI reading complete",
          description: `${data.experience.length} roles · ${data.education.length} schools · ${data.skills.length} skills pulled.`,
        });
        setUploadProgress(100);
        setResumeData(data);
        setShowPasteDialog(false);
        setPastedText("");
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
    [useAIParsing, isGuest, toast, setResumeData, setShowPasteDialog, setPastedText, setCurrentStep]
  );

  const handleFile = useCallback(
    async (file: File) => {
      const isTextFile = file.type === "text/plain" || file.name.endsWith(".txt");

      /* PDFs, Word files and images can only be read by the model, and
         parse-resume requires a verified session — there is no local parser
         to fall back to. Gate before any work happens rather than validating,
         uploading and then surfacing a 401 as "Processing failed".
         Text files have a local path, so they carry on below. */
      if (isGuest && !isTextFile) {
        requireAccount("ai-read-file");
        return;
      }

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
        ) {
          fileType = "docx";
        } else if (file.type.startsWith("image/")) {
          fileType = "image";
        } else if (isTextFile) {
          fileType = "txt";
        }
        setUploadedFileType(fileType);

        if (fileType === "txt") {
          const textContent = await file.text();
          await handleTextContent(textContent);
          return;
        }

        const aiParsed = await extractResumeFromFile(file, (p) => setUploadProgress(p));
        const data = aiDataToResumeData(aiParsed);
        toast({
          title: "AI reading complete",
          description: `${data.experience.length} roles · ${data.education.length} schools · ${data.skills.length} skills pulled.`,
        });

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
    [
      secureValidateFile,
      toast,
      isGuest,
      requireAccount,
      setResumeData,
      setCurrentStep,
      handleTextContent,
    ]
  );

  const applyAIResumeData = useCallback(
    (aiData: AIResumeData) => {
      setResumeData(aiDataToResumeData(aiData));
      setCurrentStep(1);
      toast({
        title: "Draft imported",
        description: "AI read your résumé. Review every line before filing.",
      });
    },
    [setResumeData, setCurrentStep, toast]
  );

  return {
    isProcessing,
    uploadProgress,
    uploadedFileType,
    useAIParsing,
    setUseAIParsing,
    isSecurityValidating,
    handleFile,
    handleTextContent,
    applyAIResumeData,
  };
}
