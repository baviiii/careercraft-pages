/* ───────────────────────────────────────────────────────────
   § 04 · Press — proof and print.
   WYSIWYG: renders the actual export PDF (same bytes as the
   download) with PDF.js, so preview = file, page for page.
   ─────────────────────────────────────────────────────────── */

import { motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  Download,
  Loader2,
  Save,
} from "lucide-react";
import { lazy, Suspense, useEffect, useState } from "react";

import { CraftButton } from "@/components/craft/AppPrimitives";
import { renderResumePdfBlob } from "@/lib/pdfExport";

// pdfjs is heavy — load the viewer only when this step is reached.
const PdfBlobViewer = lazy(() =>
  import("@/components/pdf/PdfBlobViewer").then((m) => ({ default: m.PdfBlobViewer }))
);

import type { ResumeData, TemplateId } from "../types";
import { getTemplateMeta } from "../types";

interface PreviewExportStepProps {
  resumeData: ResumeData;
  selectedTemplate: TemplateId;
  resumeDisplayName: string;
  isExporting: boolean;
  isSaving: boolean;
  currentResumeId: string | null;
  onChangeTemplate: () => void;
  onOpenSaveDialog: () => void;
  onExportPDF: () => void;
}

interface PreviewState {
  blob: Blob;
  pageCount: number;
  usedFallbackTemplate: boolean;
}

export const PreviewExportStep = ({
  resumeData,
  selectedTemplate,
  resumeDisplayName,
  isExporting,
  isSaving,
  currentResumeId,
  onChangeTemplate,
  onOpenSaveDialog,
  onExportPDF,
}: PreviewExportStepProps) => {
  const meta = getTemplateMeta(selectedTemplate);
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const [isRendering, setIsRendering] = useState(true);
  const [renderFailed, setRenderFailed] = useState(false);

  useEffect(() => {
    let stale = false;
    setIsRendering(true);
    setRenderFailed(false);

    const timer = setTimeout(async () => {
      try {
        const { blob, pageCount, usedFallbackTemplate } = await renderResumePdfBlob({
          resume: {
            name: resumeDisplayName || "resume",
            content: resumeData,
            template_id: selectedTemplate,
          },
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
  }, [resumeData, selectedTemplate, resumeDisplayName]);

  return (
    <motion.div
      key="preview"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
    >
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-10">
        <div>
          <div className="cc-label text-[color:var(--cc-rust)]">§ 04 · Preview &amp; export</div>
          <h2 className="mt-3 cc-font-display text-4xl md:text-5xl leading-[0.95] tracking-tight">
            Review <span className="cc-italic-wonk">and</span> download.
          </h2>
          <p className="mt-3 cc-font-editorial italic text-xl text-[color:var(--cc-ink-soft)]">
            {meta
              ? `Using template: ${meta.title} · ${meta.category}`
              : "Review your résumé before exporting."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button onClick={onChangeTemplate} className="cc-btn cc-btn-ghost" style={{ padding: "0.8rem 1.1rem" }}>
            <ArrowLeft className="w-4 h-4" />
            Change template
          </button>
          <button
            onClick={onOpenSaveDialog}
            disabled={isSaving}
            className="cc-btn cc-btn-ghost"
            style={{ padding: "0.8rem 1.1rem" }}
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : currentResumeId ? (
              <Check className="w-4 h-4" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {currentResumeId ? "Update" : "Save resume"}
          </button>
          <CraftButton onClick={onExportPDF} disabled={isExporting}>
            {isExporting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            Export PDF
          </CraftButton>
        </div>
      </div>

      {/* Proof strip */}
      <div className="flex items-center justify-between gap-4 mb-4 max-w-[840px] mx-auto">
        <div className="cc-label text-[color:var(--cc-ash)] flex items-center gap-2">
          What you download
          {isRendering && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
        </div>
        {preview && (
          <div className="cc-label text-[color:var(--cc-ash)]">
            {preview.pageCount} page{preview.pageCount > 1 ? "s" : ""}
          </div>
        )}
      </div>

      {preview?.usedFallbackTemplate && (
        <div className="flex items-center gap-2 mb-4 max-w-[840px] mx-auto px-4 py-3 border border-amber-400 bg-amber-50 text-amber-900 text-sm">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          This template has no PDF layout yet, so the export uses Modern 1. Pick another template if that's not what you want.
        </div>
      )}

      {/* The actual PDF, page for page */}
      <div className="max-w-[840px] mx-auto pb-8">
        {preview ? (
          <div className={isRendering ? "opacity-60 transition-opacity" : "transition-opacity"}>
            <Suspense
              fallback={
                <div
                  className="w-full bg-white border border-[color:var(--cc-hair-strong)] animate-pulse"
                  style={{ aspectRatio: "794 / 1123" }}
                />
              }
            >
              <PdfBlobViewer blob={preview.blob} />
            </Suspense>
          </div>
        ) : renderFailed ? (
          <div className="p-16 text-center cc-font-editorial italic text-[color:var(--cc-ink-soft)] border border-[color:var(--cc-hair-strong)] bg-white">
            Could not render the preview — try Export PDF directly, or reload.
          </div>
        ) : (
          <div
            className="w-full bg-white border border-[color:var(--cc-hair-strong)] animate-pulse"
            style={{ aspectRatio: "794 / 1123" }}
          />
        )}
      </div>
    </motion.div>
  );
};
