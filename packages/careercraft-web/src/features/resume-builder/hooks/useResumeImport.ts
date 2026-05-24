import { type Dispatch, type SetStateAction, useCallback, useState } from "react";

import { useSecureResumeUpload } from "@/hooks/useSecurity";
import { type ToastActionElement, type ToastProps } from "@/hooks/use-toast";
import {
  type AIResumeData,
  parseResumeStructured,
  parseResumeWithAI,
} from "@/lib/resumeParser";
import { auditFileOperation } from "@/lib/security/auditLog";

import {
  aiDataToResumeData,
  parseTextToResumeData,
} from "../lib/resumeData";
import type { ResumeData, UploadedFileType } from "../types";

type ToastFn = (props: Omit<ToastProps, "id"> & { action?: ToastActionElement }) => void;

interface UseResumeImportParams {
  toast: ToastFn;
  setResumeData: Dispatch<SetStateAction<ResumeData>>;
  setCurrentStep: Dispatch<SetStateAction<number>>;
  setShowPasteDialog: Dispatch<SetStateAction<boolean>>;
  setPastedText: Dispatch<SetStateAction<string>>;
}

export function useResumeImport({
  toast,
  setResumeData,
  setCurrentStep,
  setShowPasteDialog,
  setPastedText,
}: UseResumeImportParams) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedFileType, setUploadedFileType] = useState<UploadedFileType>(null);
  const [useAIParsing, setUseAIParsing] = useState(false);

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
    [useAIParsing, toast, setResumeData, setShowPasteDialog, setPastedText, setCurrentStep]
  );

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
        ) {
          fileType = "docx";
        } else if (file.type.startsWith("image/")) {
          fileType = "image";
        } else if (file.type === "text/plain" || file.name.endsWith(".txt")) {
          fileType = "txt";
        }
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
    [secureValidateFile, toast, useAIParsing, setResumeData, setCurrentStep, handleTextContent]
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

