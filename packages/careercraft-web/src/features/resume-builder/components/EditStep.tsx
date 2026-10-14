/* ───────────────────────────────────────────────────────────
   Step 2 · Edit. Left: the sections. Centre: the form.
   Right: an optional live preview.
   ─────────────────────────────────────────────────────────── */

import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Briefcase,
  ChevronRight,
  Eye,
  EyeOff,
  FileText,
  GraduationCap,
  Layers,
  Save,
  Target,
  User,
} from "lucide-react";
import { lazy, Suspense, useState, type ComponentType, type Dispatch, type SetStateAction } from "react";

import { CraftButton } from "@/components/craft/AppPrimitives";
import { CraftSpinner } from "@/components/craft/CraftSpinner";
import { ScaledResumeFrame } from "@/components/templates/ScaledResumeFrame";
import type { TemplateData } from "@/components/templates/types";
import { getTemplate } from "@/lib/templateMap";
import type { PdfDensity } from "@/lib/pdfExport";

// pdfjs is heavy — load the viewer only when the "Pages" proof is used.
const PdfBlobViewer = lazy(() =>
  import("@/components/pdf/PdfBlobViewer").then((m) => ({ default: m.PdfBlobViewer }))
);

import { useResumePdfPreview } from "../hooks/useResumePdfPreview";
import { resumeToTemplateData } from "../lib/resumeData";
import type { AutoSaveStatus, ContactInfo, Education, Experience, ResumeData, TemplateId } from "../types";
import { ContactForm } from "./ContactForm";
import { EducationForm } from "./EducationForm";
import { ExperienceForm } from "./ExperienceForm";
import { OptionalSectionsForm } from "./OptionalSectionsForm";
import { SkillsForm } from "./SkillsForm";
import { SummaryForm } from "./SummaryForm";

interface EditStepProps {
  // Data
  resumeData: ResumeData;
  setResumeData: Dispatch<SetStateAction<ResumeData>>;
  selectedTemplate: TemplateId;

  // Section nav
  activeSection: string;
  setActiveSection: (id: string) => void;

  // Preview
  showLivePreview: boolean;
  setShowLivePreview: (v: boolean) => void;
  pdfDensity: PdfDensity;

  // Mutations
  updateContact: (field: keyof ContactInfo, value: string) => void;
  updateSummary: (value: string) => void;
  addExperience: () => void;
  updateExperience: <K extends keyof Experience>(
    id: string,
    field: K,
    value: Experience[K]
  ) => void;
  removeExperience: (id: string) => void;
  addBullet: (expId: string) => void;
  updateBullet: (expId: string, index: number, value: string) => void;
  removeBullet: (expId: string, index: number) => void;
  addEducation: () => void;
  updateEducation: <K extends keyof Education>(
    id: string,
    field: K,
    value: Education[K]
  ) => void;
  removeEducation: (id: string) => void;
  addSkill: (skill: string) => void;
  removeSkill: (skill: string) => void;

  // AI + Save
  jobDescription: string;
  rewritingBulletId: string | null;
  onRewriteBullet: (expId: string, bulletIndex: number) => void;
  onOpenJobDescDialog: () => void;
  onOpenSaveDialog: () => void;
  autoSaveStatus: AutoSaveStatus;
  /** Building without an account — saving needs one. */
  isGuest: boolean;
  /** False when storage refused the draft; never promise a save that failed. */
  isDraftPersisted: boolean;
  isSaving: boolean;
  currentResumeId: string | null;

  // Flow
  onBack: () => void;
  onNext: () => void;
}

const SECTIONS: Array<{ id: string; label: string; icon: ComponentType<{ className?: string }> }> = [
  { id: "contact", label: "Contact", icon: User },
  { id: "summary", label: "Summary", icon: FileText },
  { id: "experience", label: "Experience", icon: Briefcase },
  { id: "education", label: "Education", icon: GraduationCap },
  { id: "skills", label: "Skills", icon: Target },
  { id: "optional", label: "Other sections", icon: Layers },
];

export const EditStep = ({
  resumeData,
  setResumeData,
  selectedTemplate,
  activeSection,
  setActiveSection,
  showLivePreview,
  setShowLivePreview,
  pdfDensity,
  updateContact,
  updateSummary,
  addExperience,
  updateExperience,
  removeExperience,
  addBullet,
  updateBullet,
  removeBullet,
  addEducation,
  updateEducation,
  removeEducation,
  addSkill,
  removeSkill,
  jobDescription,
  rewritingBulletId,
  onRewriteBullet,
  onOpenJobDescDialog,
  onOpenSaveDialog,
  autoSaveStatus,
  isGuest,
  isDraftPersisted,
  isSaving,
  currentResumeId,
  onBack,
  onNext,
}: EditStepProps) => {
  const Template = getTemplate(selectedTemplate);
  const templateData: TemplateData = resumeToTemplateData(resumeData);

  // "pages" proofs the ACTUAL export PDF (real page breaks, at the chosen
  // density) so layout issues are visible — and fixable — while editing.
  const [previewMode, setPreviewMode] = useState<"pages" | "layout">("pages");
  const pagesOn = showLivePreview && previewMode === "pages";
  const { preview, isRendering, renderFailed } = useResumePdfPreview({
    resumeData,
    selectedTemplate,
    resumeDisplayName: resumeData.contact.name || "resume",
    density: pdfDensity,
    enabled: pagesOn,
  });

  return (
    <motion.div
      key="edit"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
    >
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-8">
        <div>
          <h2 className="cc-font-display text-3xl md:text-4xl leading-tight tracking-tight">
            Your details
          </h2>
          {/* A guest's work lives in localStorage, which can refuse the write
              (private browsing, storage full). Say which of those is true —
              telling someone their résumé is safe when it isn't is the one
              message here that can actually cost them the work. */}
          <p
            className={`mt-2 text-[15px] ${
              isGuest && !isDraftPersisted
                ? "text-[color:var(--cc-rust)]"
                : "text-[color:var(--cc-ink-soft)]"
            }`}
          >
            {!isGuest
              ? autoSaveStatusLabel(autoSaveStatus)
              : isDraftPersisted
                ? "Saved on this device. Make a free account to keep it."
                : "This browser is blocking storage, so nothing is being saved. Make a free account to keep your work."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onOpenJobDescDialog}
            className={`cc-action cc-action--sm ${jobDescription ? "" : "cc-action--ghost"}`}
            title="Paste the job ad so your points can be tailored to it"
          >
            <Target className="w-4 h-4" />
            {jobDescription ? "Edit the job ad" : "Add the job ad"}
          </button>
          <button
            type="button"
            onClick={() => setShowLivePreview(!showLivePreview)}
            className="cc-action cc-action--ghost cc-action--sm"
          >
            {showLivePreview ? (
              <EyeOff className="w-4 h-4" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
            {showLivePreview ? "Hide preview" : "Show preview"}
          </button>
          {!isGuest && (
            <button
              type="button"
              onClick={onOpenSaveDialog}
              disabled={isSaving}
              className="cc-action cc-action--ghost cc-action--sm"
            >
              {isSaving ? <CraftSpinner size="sm" label="Saving" /> : <Save className="w-4 h-4" />}
              {currentResumeId ? "Save changes" : "Save résumé"}
            </button>
          )}
        </div>
      </div>

      {/* Layout */}
      <div
        className={`grid gap-6 ${
          showLivePreview
            ? "grid-cols-1 lg:grid-cols-[180px_minmax(0,1fr)_minmax(0,1fr)]"
            : "grid-cols-1 lg:grid-cols-[180px_minmax(0,1fr)]"
        }`}
      >
        {/* Section rail */}
        <nav className="lg:sticky lg:top-20 lg:self-start">
          <div className="mb-2 px-1 text-[13px] font-medium text-[color:var(--cc-ash)]">Sections</div>
          <ul className="space-y-1">
            {SECTIONS.map((section) => {
              const Icon = section.icon;
              const isActive = activeSection === section.id;
              return (
                <li key={section.id}>
                  <button
                    onClick={() => setActiveSection(section.id)}
                    aria-current={isActive ? "true" : undefined}
                    className={`w-full text-left rounded-xl px-3 py-2.5 flex items-center gap-3 transition-colors ${
                      isActive
                        ? "bg-white text-[color:var(--cc-ink)] shadow-[0_1px_0_rgba(20,22,26,0.04),0_8px_18px_-14px_rgba(20,22,26,0.4)]"
                        : "text-[color:var(--cc-ink-soft)] hover:bg-white/70 hover:text-[color:var(--cc-ink)]"
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? "text-[color:var(--cc-rust)]" : ""}`} />
                    <span className="text-[14px] font-medium">{section.label}</span>
                    {isActive && (
                      <ChevronRight className="w-3.5 h-3.5 ml-auto" />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Forms */}
        <div className="space-y-6 min-w-0">
          {activeSection === "contact" && (
            <ContactForm contact={resumeData.contact} onChange={updateContact} />
          )}
          {activeSection === "summary" && (
            <SummaryForm summary={resumeData.summary} onChange={updateSummary} />
          )}
          {activeSection === "experience" && (
            <ExperienceForm
              experience={resumeData.experience}
              jobDescription={jobDescription}
              rewritingBulletId={rewritingBulletId}
              onAdd={addExperience}
              onRemove={removeExperience}
              onUpdate={updateExperience}
              onAddBullet={addBullet}
              onUpdateBullet={updateBullet}
              onRemoveBullet={removeBullet}
              onRewriteBullet={onRewriteBullet}
            />
          )}
          {activeSection === "education" && (
            <EducationForm
              education={resumeData.education}
              onAdd={addEducation}
              onRemove={removeEducation}
              onUpdate={updateEducation}
            />
          )}
          {activeSection === "skills" && (
            <SkillsForm
              skills={resumeData.skills}
              onAdd={addSkill}
              onRemove={removeSkill}
            />
          )}
          {activeSection === "optional" && (
            <OptionalSectionsForm
              resumeData={resumeData}
              setResumeData={setResumeData}
            />
          )}

          {/* Step nav */}
          <div className="flex items-center justify-between pt-2">
            <CraftButton variant="ghost" onClick={onBack}>
              <ArrowLeft className="w-4 h-4" />
              Back
            </CraftButton>
            <CraftButton onClick={onNext}>
              Pick a design
              <ArrowRight className="w-4 h-4" />
            </CraftButton>
          </div>
        </div>

        {/* Live preview column — "Pages" proofs the real export PDF, page
            for page; "Layout" is the instant single-sheet template view. */}
        {showLivePreview && (
          <aside className="lg:sticky lg:top-20 lg:self-start hidden lg:block">
            <div className="mb-2 flex items-center justify-between gap-2 px-1">
              <span className="inline-flex items-center gap-2 text-[13px] font-medium text-[color:var(--cc-ash)]">
                Preview
                {pagesOn &&
                  (isRendering ? (
                    <CraftSpinner size="sm" label="Updating the preview" />
                  ) : preview ? (
                    <span className="cc-tabular">
                      · {preview.pageCount} page{preview.pageCount > 1 ? "s" : ""}
                    </span>
                  ) : null)}
              </span>
              <span className="flex gap-1" role="group" aria-label="Preview style">
                {(["pages", "layout"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    aria-pressed={previewMode === m}
                    onClick={() => setPreviewMode(m)}
                    title={m === "pages" ? "The real PDF, page by page" : "A quick single-page view"}
                    className={`rounded-full px-2.5 py-1 text-[12.5px] transition-colors ${
                      previewMode === m
                        ? "bg-[color:var(--cc-ink)] font-medium text-[color:var(--cc-cream)]"
                        : "text-[color:var(--cc-ink-soft)] hover:bg-white"
                    }`}
                  >
                    {m === "pages" ? "Pages" : "Quick view"}
                  </button>
                ))}
              </span>
            </div>

            {previewMode === "layout" ? (
              <div className="overflow-hidden rounded-xl border border-[color:var(--cc-hair)] bg-white">
                <ScaledResumeFrame>
                  {Template && <Template data={templateData} />}
                </ScaledResumeFrame>
              </div>
            ) : (
              <div className="rounded-xl border border-[color:var(--cc-hair)] bg-[color:var(--cc-cream-2)] p-3 max-h-[calc(100vh-10rem)] overflow-y-auto overscroll-contain">
                {preview ? (
                  <div className={isRendering ? "opacity-60 transition-opacity" : "transition-opacity"}>
                    <Suspense fallback={<PagesPlaceholder />}>
                      <PdfBlobViewer blob={preview.blob} pageGap={12} />
                    </Suspense>
                  </div>
                ) : renderFailed ? (
                  <div className="p-8 text-center text-[14px] text-[color:var(--cc-ink-soft)]">
                    The page preview didn't load. Try Quick view, or carry on editing.
                  </div>
                ) : (
                  <PagesPlaceholder />
                )}
              </div>
            )}
          </aside>
        )}
      </div>
    </motion.div>
  );
};

const PagesPlaceholder = () => (
  <div
    className="w-full rounded-md bg-white animate-pulse motion-reduce:animate-none"
    style={{ aspectRatio: "794 / 1123" }}
  />
);

function autoSaveStatusLabel(status: AutoSaveStatus): string {
  if (status === "saving") return "Saving…";
  if (status === "unsaved") return "Changes not saved yet.";
  return "All changes saved.";
}
