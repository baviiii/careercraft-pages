/* ───────────────────────────────────────────────────────────
   § 04 · Press — proof and print.
   On-screen preview of the selected template; export is rendered
   independently as a vector PDF via @react-pdf/renderer.
   ─────────────────────────────────────────────────────────── */

import { motion } from "framer-motion";
import {
  ArrowLeft,
  Check,
  Download,
  Loader2,
  Save,
} from "lucide-react";
import type { RefObject } from "react";

import { CraftButton } from "@/components/craft/AppPrimitives";
import type { TemplateData } from "@/components/templates/types";
import { getTemplate } from "@/lib/templateMap";

import { resumeToTemplateData } from "../lib/resumeData";
import type { ResumeData, TemplateId } from "../types";
import { getTemplateMeta } from "../types";

interface PreviewExportStepProps {
  resumeData: ResumeData;
  selectedTemplate: TemplateId;
  previewRef: RefObject<HTMLDivElement>;
  isExporting: boolean;
  isSaving: boolean;
  currentResumeId: string | null;
  onChangeTemplate: () => void;
  onOpenSaveDialog: () => void;
  onExportPDF: () => void;
}

export const PreviewExportStep = ({
  resumeData,
  selectedTemplate,
  previewRef,
  isExporting,
  isSaving,
  currentResumeId,
  onChangeTemplate,
  onOpenSaveDialog,
  onExportPDF,
}: PreviewExportStepProps) => {
  const Template = getTemplate(selectedTemplate);
  const meta = getTemplateMeta(selectedTemplate);
  const templateData: TemplateData = resumeToTemplateData(resumeData);

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

      {/* Paper */}
      <div className="flex justify-center overflow-auto pb-8">
        <div
          ref={previewRef}
          className="bg-white shadow-[0_30px_90px_-20px_rgba(14,12,10,0.45)] border border-[color:var(--cc-hair-strong)]"
          style={{ width: "794px" }}
        >
          {Template ? (
            <Template data={templateData} isPreview={false} />
          ) : (
            <div className="p-16 text-center cc-font-editorial italic text-[color:var(--cc-ink-soft)]">
              Template missing — return to § 03 to pick one.
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};
