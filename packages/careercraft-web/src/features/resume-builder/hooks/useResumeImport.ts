import { type Dispatch, type SetStateAction, useCallback, useState } from "react";

import { useSecureResumeUpload } from "@/hooks/useSecurity";
import { type Toast } from "@/hooks/use-toast";
import {
  type AIResumeData,
  extractResumeFromFile,
  parseResumeTextWithAI,
} from "@/lib/resumeParser";
import { auditFileOperation } from "@/lib/security/auditLog";

import { aiDataToResumeData, parseTextToResumeData } from "../lib/resumeData";
import type { AccountGateReason, ResumeData, UploadedFileType } from "../types";

type ToastFn = (props: Toast) => void;

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

  const {
    validateFile: secureValidateFile,
    isValidating: isSecurityValidating,
  } = useSecureResumeUpload({
    onValidationError: (errors) => {
      toast({
        title: "Can't use that file",
        description: errors.join(", "),
        variant: "destructive",
      });
    },
    onSecurityThreat: (threats) => {
      toast({
        title: "That file was blocked",
        description:
          "It contains something that looks unsafe. Try saving it again as a fresh PDF, or paste the text.",
        variant: "destructive",
      });
      console.error("Security threats:", threats);
    },
  });

  const handleTextContent = useCallback(
    async (text: string) => {
      /* AI reads every paste, guest or not — parse-resume takes anonymous
         calls on the text path behind a rate limit. This used to fall to a
         local regex parser for guests, and that parser cannot do the one job
         that matters here: pasted résumés are nearly always copied out of a
         two-column PDF, where the columns interleave and headings weld onto
         neighbouring sentences. Matching `^education` against that text finds
         nothing, so everything landed in the summary and the rest came back
         empty. It survives below as a crash fallback only. */
      setIsProcessing(true);
      setUploadProgress(20);
      try {
        setUploadProgress(40);
        const aiParsed = await parseResumeTextWithAI(text, "pasted-resume.txt", "text/plain");
        const data = aiDataToResumeData(aiParsed);
        toast({
          title: "Read your résumé",
          description: `${data.experience.length} jobs · ${data.education.length} qualifications · ${data.skills.length} skills found.`,
        });
        setUploadProgress(100);
        setResumeData(data);
      } catch (error) {
        /* Losing the paste is worse than parsing it badly, so fall back rather
           than fail — but say plainly that the result needs checking, because
           on a multi-column source it will be rough. */
        console.error("AI text parsing failed, falling back to local parse:", error);
        setResumeData(parseTextToResumeData(text));
        toast({
          title: "Couldn't read it properly",
          description:
            error instanceof Error && /rate limit/i.test(error.message)
              ? "Too many reads just now. Your text was sorted roughly on this device — check every field."
              : "Sorted roughly on this device instead. Check every field, then try again in a moment for a cleaner read.",
          variant: "destructive",
        });
      } finally {
        setShowPasteDialog(false);
        setPastedText("");
        setCurrentStep(1);
        setIsProcessing(false);
        setUploadProgress(0);
      }
    },
    [toast, setResumeData, setShowPasteDialog, setPastedText, setCurrentStep]
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
            title: "Can't use that file",
            description:
              securityResult.errors[0] || "It didn't pass our file check.",
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
          title: "Read your résumé",
          description: `${data.experience.length} jobs · ${data.education.length} qualifications · ${data.skills.length} skills found.`,
        });

        setResumeData(data);
        setCurrentStep(1);
      } catch (error) {
        console.error("File processing error:", error);
        toast({
          title: "Couldn't read that file",
          description:
            error instanceof Error ? error.message : "Try another file, or paste the text instead.",
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
        description: "We've filled in what we read. Check each section before you save.",
      });
    },
    [setResumeData, setCurrentStep, toast]
  );

  return {
    isProcessing,
    uploadProgress,
    uploadedFileType,
    isSecurityValidating,
    handleFile,
    handleTextContent,
    applyAIResumeData,
  };
}
