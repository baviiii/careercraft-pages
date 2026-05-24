import { useCallback, useState } from "react";

import { type ToastActionElement, type ToastProps } from "@/hooks/use-toast";
import { exportResumeToPdf } from "@/lib/pdfExport";

import type { ResumeData, TemplateId } from "../types";

type ToastFn = (props: Omit<ToastProps, "id"> & { action?: ToastActionElement }) => void;

interface UseResumeExportParams {
  resumeData: ResumeData;
  selectedTemplate: TemplateId;
  resumeDisplayName: string;
  toast: ToastFn;
}

export function useResumeExport({
  resumeData,
  selectedTemplate,
  resumeDisplayName,
  toast,
}: UseResumeExportParams) {
  const [isExporting, setIsExporting] = useState(false);

  const exportToPDF = useCallback(async () => {
    setIsExporting(true);
    try {
      const { pageCount } = await exportResumeToPdf({
        resume: {
          name: resumeDisplayName || "resume",
          content: resumeData,
          template_id: selectedTemplate,
        },
      });

      toast({
        title: "PDF downloaded",
        description: `High-quality export · ${pageCount} page${
          pageCount > 1 ? "s" : ""
        }.`,
      });
    } catch (error) {
      console.error("Export error:", error);
      toast({
        title: "Export failed",
        description: "Could not generate the PDF.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  }, [resumeData, selectedTemplate, resumeDisplayName, toast]);

  return {
    isExporting,
    exportToPDF,
  };
}
