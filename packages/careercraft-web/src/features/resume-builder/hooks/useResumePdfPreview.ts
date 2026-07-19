/* ───────────────────────────────────────────────────────────
   useResumePdfPreview — debounced live render of the ACTUAL
   export PDF (same bytes as the download). Shared by the edit
   step's "Pages" proof and the preview/export step, so both
   always show real pagination at the chosen density.
   ─────────────────────────────────────────────────────────── */

import { useEffect, useState } from "react";

import { renderResumePdfBlob, type PdfDensity } from "@/lib/pdfExport";

import type { ResumeData, TemplateId } from "../types";

export interface ResumePdfPreview {
  blob: Blob;
  pageCount: number;
  usedFallbackTemplate: boolean;
}

interface UseResumePdfPreviewParams {
  resumeData: ResumeData;
  selectedTemplate: TemplateId;
  resumeDisplayName: string;
  density: PdfDensity;
  /** When false, no rendering happens (e.g. the proof panel is hidden). */
  enabled?: boolean;
}

export function useResumePdfPreview({
  resumeData,
  selectedTemplate,
  resumeDisplayName,
  density,
  enabled = true,
}: UseResumePdfPreviewParams) {
  const [preview, setPreview] = useState<ResumePdfPreview | null>(null);
  const [isRendering, setIsRendering] = useState(enabled);
  const [renderFailed, setRenderFailed] = useState(false);

  useEffect(() => {
    if (!enabled) return;

    let stale = false;
    setIsRendering(true);
    setRenderFailed(false);

    // Debounce so typing doesn't queue a render per keystroke.
    const timer = setTimeout(async () => {
      try {
        const { blob, pageCount, usedFallbackTemplate } = await renderResumePdfBlob({
          resume: {
            name: resumeDisplayName || "resume",
            content: resumeData,
            template_id: selectedTemplate,
          },
          density,
        });
        if (stale) return;
        setPreview({ blob, pageCount, usedFallbackTemplate });
      } catch (error) {
        console.error("PDF preview failed:", error);
        if (!stale) setRenderFailed(true);
      } finally {
        if (!stale) setIsRendering(false);
      }
    }, 350);

    return () => {
      stale = true;
      clearTimeout(timer);
    };
  }, [resumeData, selectedTemplate, resumeDisplayName, density, enabled]);

  return { preview, isRendering, renderFailed };
}
