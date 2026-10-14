/* Step 4 · Download. Shows the actual export PDF (the same bytes as the
   download) through PDF.js, so the preview is the file, page for page.
   A sticky bar keeps spacing, page count and the actions in reach while
   scrolling. */

import { motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowUpRight,
  Check,
  Download,
  PenLine,
  Save,
} from "lucide-react";
import { lazy, Suspense } from "react";

import { CraftButton } from "@/components/craft/AppPrimitives";
import { CraftSpinner } from "@/components/craft/CraftSpinner";
import { PDF_DENSITIES, type PdfDensity } from "@/lib/pdfExport";

// pdfjs is heavy — load the viewer only when this step is reached.
const PdfBlobViewer = lazy(() =>
  import("@/components/pdf/PdfBlobViewer").then((m) => ({ default: m.PdfBlobViewer }))
);

import { useResumePdfPreview } from "../hooks/useResumePdfPreview";
import type { AccountGateReason, ResumeData, TemplateId } from "../types";
import { getTemplateMeta } from "../types";

/** Where a guest can take the draft next. Guests only. */
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
    line: "Check it against a job ad",
  },
  {
    reason: "continue-jobs",
    title: "Browse jobs",
    line: "Openings across Australia",
  },
  {
    reason: "continue-news",
    title: "Market news",
    line: "Hiring and pay by industry",
  },
  {
    reason: "continue-chat",
    title: "Career chat",
    line: "Ask about your next move",
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

const SHEET = "w-full rounded-xl border border-[color:var(--cc-hair)] bg-white";

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
      <div className="mx-auto mb-6 max-w-[840px]">
        <h2 className="cc-font-display text-3xl leading-tight tracking-tight md:text-4xl">Check it and download</h2>
        <p className="mt-2 text-[15px] text-[color:var(--cc-ink-soft)]">
          {meta ? (
            <>
              This is the exact PDF you'll get, in the <span className="font-medium text-[color:var(--cc-ink)]">{meta.title}</span>{" "}
              design.
            </>
          ) : (
            "This is the exact PDF you'll get."
          )}
        </p>
      </div>

      {preview?.usedFallbackTemplate && (
        <div className="mx-auto mb-4 flex max-w-[840px] items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          This design has no PDF version yet, so the download uses Modern Blue. Pick another design if that's not what you
          want.
        </div>
      )}

      {isGuest && (
        <div className="mx-auto mb-4 max-w-[840px] rounded-xl bg-[color:var(--cc-rust-soft)] px-4 py-3 text-[14px] leading-snug text-[color:var(--cc-ink-soft)]">
          {isDraftPersisted
            ? "Your draft is saved on this device. Make a free account to download it, and it comes with you."
            : "This browser is blocking storage, so your draft isn't being kept. Make a free account before you leave this page."}
        </div>
      )}

      {isGuest && (
        <motion.div
          className="mx-auto mb-6 max-w-[840px] overflow-hidden rounded-2xl border border-[color:var(--cc-hair)] bg-white"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.35, delay: 0.08 }}
        >
          <div className="border-b border-[color:var(--cc-hair)] px-4 py-3">
            <div className="text-[14px] font-semibold text-[color:var(--cc-ink)]">Take this draft further</div>
            <p className="mt-0.5 text-[13px] text-[color:var(--cc-ink-soft)]">
              With a free account, your résumé comes along to any of these.
            </p>
          </div>
          <ul className="grid grid-cols-1 divide-y divide-[color:var(--cc-hair)] sm:grid-cols-2 sm:divide-y-0">
            {CONTINUE_ROWS.map((row, i) => (
              <li
                key={row.reason}
                className={`${i % 2 === 0 ? "sm:border-r" : ""} ${i < 2 ? "sm:border-b" : ""} border-[color:var(--cc-hair)]`}
              >
                <button
                  type="button"
                  onClick={() => onContinueWithDraft(row.reason)}
                  className="group flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-[color:var(--cc-cream-2)]"
                >
                  <span className="min-w-0">
                    <span className="block text-[14px] font-medium text-[color:var(--cc-ink)]">{row.title}</span>
                    <span className="block text-[13px] text-[color:var(--cc-ash)]">{row.line}</span>
                  </span>
                  <ArrowUpRight className="h-4 w-4 shrink-0 text-[color:var(--cc-ash)] transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[color:var(--cc-rust)]" />
                </button>
              </li>
            ))}
          </ul>
        </motion.div>
      )}

      {/* The actual PDF, page for page */}
      <div className="mx-auto max-w-[840px] pb-8">
        {preview ? (
          <div className={isRendering ? "opacity-60 transition-opacity" : "transition-opacity"}>
            <Suspense
              fallback={
                <div
                  className={`${SHEET} animate-pulse motion-reduce:animate-none`}
                  style={{ aspectRatio: "794 / 1123" }}
                />
              }
            >
              <PdfBlobViewer blob={preview.blob} />
            </Suspense>
          </div>
        ) : renderFailed ? (
          <div className={`${SHEET} p-12 text-center text-[15px] text-[color:var(--cc-ink-soft)]`}>
            The preview didn't load. Downloading may still work, or try reloading the page.
          </div>
        ) : (
          <div
            className={`${SHEET} animate-pulse motion-reduce:animate-none`}
            style={{ aspectRatio: "794 / 1123" }}
          />
        )}
      </div>

      {/* Sticky bar: spacing, page count and actions always in reach */}
      <div className="sticky bottom-3 z-20">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[color:var(--cc-hair)] bg-white/95 px-4 py-3 shadow-[0_18px_40px_-20px_rgba(20,22,26,0.4)] backdrop-blur-sm md:px-5">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <div className="flex items-center gap-2">
              <span className="text-[13px] text-[color:var(--cc-ash)]" id="cc-spacing-label">
                Spacing
              </span>
              <div
                className="flex gap-0.5 rounded-full bg-[color:var(--cc-cream-2)] p-0.5"
                role="group"
                aria-labelledby="cc-spacing-label"
              >
                {PDF_DENSITIES.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    aria-pressed={pdfDensity === d.id}
                    onClick={() => onDensityChange(d.id)}
                    className={`rounded-full px-3 py-1 text-[13px] transition-colors ${
                      pdfDensity === d.id
                        ? "bg-white font-medium text-[color:var(--cc-ink)] shadow-sm"
                        : "text-[color:var(--cc-ink-soft)] hover:text-[color:var(--cc-ink)]"
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
            <span className="inline-flex items-center gap-2 cc-tabular text-[13px] text-[color:var(--cc-ash)]">
              {isRendering ? (
                <CraftSpinner size="sm" label="Updating the preview" />
              ) : preview ? (
                `${preview.pageCount} page${preview.pageCount > 1 ? "s" : ""}`
              ) : null}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <CraftButton variant="ghost" size="sm" onClick={onEditContent}>
              <PenLine className="h-4 w-4" />
              Edit
            </CraftButton>
            <CraftButton variant="ghost" size="sm" onClick={onChangeTemplate}>
              <ArrowLeft className="h-4 w-4" />
              Change design
            </CraftButton>
            {/* Saving needs somewhere to save to, so guests don't see it. */}
            {!isGuest && (
              <CraftButton variant="ghost" size="sm" onClick={onOpenSaveDialog} disabled={isSaving}>
                {isSaving ? (
                  <CraftSpinner size="sm" label="Saving" />
                ) : currentResumeId ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {currentResumeId ? "Save changes" : "Save résumé"}
              </CraftButton>
            )}

            {isGuest ? (
              <CraftButton onClick={onSignUpToExport} size="sm">
                <Download className="h-4 w-4" />
                Make a free account to download
              </CraftButton>
            ) : (
              <CraftButton onClick={onExportPDF} disabled={isExporting} size="sm">
                {isExporting ? <CraftSpinner size="sm" label="Making your PDF" /> : <Download className="h-4 w-4" />}
                Download PDF
              </CraftButton>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};
