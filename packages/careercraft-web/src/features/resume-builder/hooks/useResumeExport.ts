import { useCallback, useState } from "react";

import { type Toast } from "@/hooks/use-toast";
import { exportResumeToPdf, type PdfDensity } from "@/lib/pdfExport";

import type { ResumeData, TemplateId } from "../types";

type ToastFn = (props: Toast) => void;

interface UseResumeExportParams {
  resumeData: ResumeData;
  selectedTemplate: TemplateId;
  resumeDisplayName: string;
  pdfDensity: PdfDensity;
  toast: ToastFn;
}

export function useResumeExport({
  resumeData,
  selectedTemplate,
  resumeDisplayName,
  pdfDensity,
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
        density: pdfDensity,
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
  }, [resumeData, selectedTemplate, resumeDisplayName, pdfDensity, toast]);

  return {
    isExporting,
    exportToPDF,
  };
}
