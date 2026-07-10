/* ───────────────────────────────────────────────────────────
   § 02 · Compose — the composition bench. Left: section rail.
   Centre: form. Right: optional live preview.
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
  Loader2,
  Save,
  Sparkles,
  Target,
  User,
} from "lucide-react";
import type { ComponentType, Dispatch, SetStateAction } from "react";

import { CraftButton } from "@/components/craft/AppPrimitives";
import { ScaledResumeFrame } from "@/components/templates/ScaledResumeFrame";
import type { TemplateData } from "@/components/templates/types";
import { getTemplate } from "@/lib/templateMap";

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
  { id: "optional", label: "More", icon: Layers },
];

export const EditStep = ({
  resumeData,
  setResumeData,
  selectedTemplate,
  activeSection,
  setActiveSection,
  showLivePreview,
  setShowLivePreview,
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
  isSaving,
  currentResumeId,
  onBack,
  onNext,
}: EditStepProps) => {
  const Template = getTemplate(selectedTemplate);
  const templateData: TemplateData = resumeToTemplateData(resumeData);

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
          <div className="cc-label text-[color:var(--cc-rust)]">02 · Edit</div>
          <h2 className="mt-3 cc-font-display text-3xl md:text-4xl leading-tight tracking-tight">
            Fill in your details
          </h2>
          <p className="mt-2 text-[15px] text-[color:var(--cc-ink-soft)]">
            {autoSaveStatusLabel(autoSaveStatus)}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={onOpenJobDescDialog}
            className={`cc-btn ${
              jobDescription ? "cc-btn-primary" : "cc-btn-ghost"
            }`}
            style={{ padding: "0.8rem 1.1rem" }}
          >
            <Target className="w-4 h-4" />
            {jobDescription ? "Edit job description" : "Add job description"}
          </button>
          <button
            onClick={() => setShowLivePreview(!showLivePreview)}
            className="cc-btn cc-btn-ghost"
            style={{ padding: "0.8rem 1.1rem" }}
          >
            {showLivePreview ? (
              <EyeOff className="w-4 h-4" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
            {showLivePreview ? "Hide preview" : "Show preview"}
          </button>
          <button
            onClick={onOpenSaveDialog}
            disabled={isSaving}
            className="cc-btn cc-btn-ghost"
            style={{ padding: "0.8rem 1.1rem" }}
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {currentResumeId ? "Update" : "Save resume"}
          </button>
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
          <div className="cc-label text-[color:var(--cc-ash)] mb-3">Table of contents</div>
          <ul className="space-y-px">
            {SECTIONS.map((section) => {
              const Icon = section.icon;
              const isActive = activeSection === section.id;
              return (
                <li key={section.id}>
                  <button
                    onClick={() => setActiveSection(section.id)}
                    className={`w-full text-left px-3 py-2.5 flex items-center gap-3 transition-colors border-l-2 ${
                      isActive
                        ? "border-[color:var(--cc-rust)] bg-[color:var(--cc-cream)] text-[color:var(--cc-ink)]"
                        : "border-transparent text-[color:var(--cc-ink-soft)] hover:bg-[color:var(--cc-cream)] hover:text-[color:var(--cc-ink)]"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="cc-label">{section.label}</span>
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
            <button onClick={onBack} className="cc-btn cc-btn-ghost">
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            <CraftButton onClick={onNext}>
              Choose template
              <ArrowRight className="w-4 h-4" />
            </CraftButton>
          </div>
        </div>

        {/* Live preview column */}
        {showLivePreview && (
          <aside className="lg:sticky lg:top-20 lg:self-start hidden lg:block">
            <div className="cc-label text-[color:var(--cc-ash)] mb-3 flex items-center justify-between">
              <span>Live proof</span>
              <Sparkles className="w-3.5 h-3.5 text-[color:var(--cc-rust)]" />
            </div>
            <div className="border border-[color:var(--cc-hair-strong)] bg-white">
              <ScaledResumeFrame>
                {Template && <Template data={templateData} />}
              </ScaledResumeFrame>
            </div>
          </aside>
        )}
      </div>
    </motion.div>
  );
};

function autoSaveStatusLabel(status: AutoSaveStatus): string {
  if (status === "saving") return "Filing edits…";
  if (status === "unsaved") return "Unsaved changes — remember to file.";
  return "All edits filed.";
}
