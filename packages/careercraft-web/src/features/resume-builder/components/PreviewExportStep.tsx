/* ───────────────────────────────────────────────────────────
   § 04 · Press — proof and print.
   WYSIWYG: renders the actual export PDF (same bytes as the
   download) with PDF.js, so preview = file, page for page.
   A sticky press bar keeps density, page count and the export
   actions in reach while scrolling the proof.
   ─────────────────────────────────────────────────────────── */

import { motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  Download,
  Loader2,
  PenLine,
  Save,
} from "lucide-react";
import { lazy, Suspense } from "react";

import { CraftButton } from "@/components/craft/AppPrimitives";
import { PDF_DENSITIES, type PdfDensity } from "@/lib/pdfExport";

// pdfjs is heavy — load the viewer only when this step is reached.
const PdfBlobViewer = lazy(() =>
  import("@/components/pdf/PdfBlobViewer").then((m) => ({ default: m.PdfBlobViewer }))
);

import { useResumePdfPreview } from "../hooks/useResumePdfPreview";
import type { AccountGateReason, ResumeData, TemplateId } from "../types";
import { getTemplateMeta } from "../types";

/** Quiet discovery rows — not a toolkit tour. Guests only. */
const CONTINUE_ROWS: Array<{
  reason: Extract<
    AccountGateReason,
    "continue-ats" | "continue-jobs" | "continue-news" | "continue-chat"
  >;
  title: string;
  line: string;
}> = [
  {
    reason: "continue-ats",
    title: "ATS check",
    line: "Score this against a job ad",
  },
  {
    reason: "continue-jobs",
    title: "Browse jobs",
    line: "Openings across Australia",
  },
  {
    reason: "continue-news",
    title: "Market news",
    line: "Hiring and pay by sector",
  },
  {
    reason: "continue-chat",
    title: "Career chat",
    line: "Ask with sources attached",
  },
];

interface PreviewExportStepProps {
  resumeData: ResumeData;
  selectedTemplate: TemplateId;
  resumeDisplayName: string;
  isExporting: boolean;
  isSaving: boolean;
  currentResumeId: string | null;
  pdfDensity: PdfDensity;
  onDensityChange: (density: PdfDensity) => void;
  onEditContent: () => void;
  onChangeTemplate: () => void;
  onOpenSaveDialog: () => void;
  onExportPDF: () => void;
  /** Building without an account — saving and download need one. */
  isGuest: boolean;
  /** False when storage refused the draft; never promise a save that failed. */
  isDraftPersisted: boolean;
  /** Stash the draft and send them to signup, then back here. */
  onSignUpToExport: () => void;
  /** Guest picked a next tool; same signup path, different return. */
  onContinueWithDraft: (
    reason: Extract<
      AccountGateReason,
      "continue-ats" | "continue-jobs" | "continue-news" | "continue-chat"
    >,
  ) => void;
}

export const PreviewExportStep = ({
  resumeData,
  selectedTemplate,
  resumeDisplayName,
  isExporting,
  isSaving,
  currentResumeId,
  pdfDensity,
  onDensityChange,
  onEditContent,
  onChangeTemplate,
  onOpenSaveDialog,
  onExportPDF,
  isGuest,
  isDraftPersisted,
  onSignUpToExport,
  onContinueWithDraft,
}: PreviewExportStepProps) => {
  const meta = getTemplateMeta(selectedTemplate);
  const { preview, isRendering, renderFailed } = useResumePdfPreview({
    resumeData,
    selectedTemplate,
    resumeDisplayName,
    density: pdfDensity,
  });

  return (
    <motion.div
      key="preview"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
    >
      {/* Header */}
      <div className="mb-10">
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

      {/* Proof strip */}
      <div className="flex items-center justify-between gap-4 mb-4 max-w-[840px] mx-auto">
        <div className="cc-label text-[color:var(--cc-ash)] flex items-center gap-2">
          What you download
          {isRendering && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
        </div>
      </div>

      {preview?.usedFallbackTemplate && (
        <div className="flex items-center gap-2 mb-4 max-w-[840px] mx-auto px-4 py-3 border border-amber-400 bg-amber-50 text-amber-900 text-sm">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          This template has no PDF layout yet, so the export uses Modern 1. Pick another template if that's not what you want.
        </div>
      )}

      {isGuest && (
        <div className="max-w-[840px] mx-auto mb-4 px-4 py-3 border border-[color:var(--cc-hair-strong)] bg-[color:var(--cc-rust-soft)] cc-font-editorial text-sm text-[color:var(--cc-ink-soft)]">
          This is the finished résumé — the exact file you'll download.{" "}
          {isDraftPersisted
            ? "Your draft is saved on this device, and creating a free account brings it with you."
            : "This browser is blocking storage, so the draft isn't being kept — create a free account before you leave this page."}
        </div>
      )}

      {isGuest && (
        <motion.div
          className="max-w-[840px] mx-auto mb-6 border border-[color:var(--cc-hair-strong)] bg-[color:var(--cc-cream)]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.35, delay: 0.08 }}
        >
          <div className="px-4 pt-4 pb-3 border-b border-[color:var(--cc-hair)]">
            <div className="cc-label text-[color:var(--cc-rust)]">Also with this draft</div>
            <p className="mt-1.5 cc-font-editorial text-sm text-[color:var(--cc-ink-soft)]">
              Create a free account and your résumé comes with you — then open one of these.
            </p>
          </div>
          <ul className="divide-y divide-[color:var(--cc-hair)]">
            {CONTINUE_ROWS.map((row) => (
              <li key={row.reason}>
                <button
                  type="button"
                  onClick={() => onContinueWithDraft(row.reason)}
                  className="group flex w-full items-baseline justify-between gap-4 px-4 py-3.5 text-left transition-colors hover:bg-[color:var(--cc-cream-2)]"
                >
                  <span className="cc-font-display text-lg tracking-tight text-[color:var(--cc-ink)] underline-offset-4 group-hover:underline group-hover:decoration-[color:var(--cc-rust)]">
                    {row.title}
                  </span>
                  <span className="cc-font-editorial text-sm text-[color:var(--cc-ash)] shrink min-w-0 text-right">
                    {row.line}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </motion.div>
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

      {/* Sticky press bar — density, page count and actions always in reach */}
      <div className="sticky bottom-0 z-20">
        <div className="border border-[color:var(--cc-hair-strong)] bg-[color:var(--cc-cream)]/95 backdrop-blur-sm shadow-[0_-16px_48px_-28px_rgba(14,12,10,0.5)]">
          <div className="px-4 md:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <div className="flex items-center gap-2">
                <span className="cc-label text-[color:var(--cc-ash)]">Density</span>
                <div className="flex gap-1.5">
                  {PDF_DENSITIES.map((d) => (
                    <button
                      key={d.id}
                      onClick={() => onDensityChange(d.id)}
                      className={`cc-pill ${pdfDensity === d.id ? "cc-pill-filled" : ""}`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>
              <span className="cc-label text-[color:var(--cc-ash)] inline-flex items-center gap-2 cc-tabular">
                {isRendering ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : preview ? (
                  `${preview.pageCount} page${preview.pageCount > 1 ? "s" : ""}`
                ) : (
                  "—"
                )}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={onEditContent}
                className="cc-btn cc-btn-ghost"
                style={{ padding: "0.65rem 0.95rem" }}
              >
                <PenLine className="w-4 h-4" />
                Edit content
              </button>
              <button
                onClick={onChangeTemplate}
                className="cc-btn cc-btn-ghost"
                style={{ padding: "0.65rem 0.95rem" }}
              >
                <ArrowLeft className="w-4 h-4" />
                Change template
              </button>
              {/* Saving needs somewhere to save to, so guests don't see it. */}
              {!isGuest && (
                <button
                  onClick={onOpenSaveDialog}
                  disabled={isSaving}
                  className="cc-btn cc-btn-ghost"
                  style={{ padding: "0.65rem 0.95rem" }}
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
              )}

              {isGuest ? (
                <CraftButton onClick={onSignUpToExport} size="sm">
                  <Download className="w-4 h-4" />
                  Create free account to download
                </CraftButton>
              ) : (
                <CraftButton onClick={onExportPDF} disabled={isExporting} size="sm">
                  {isExporting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  Export PDF
                </CraftButton>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
