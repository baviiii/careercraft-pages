/* ───────────────────────────────────────────────────────────
   ResumeBuilderPage — editorial orchestrator.
   Thin shell: routes the four steps, owns dialog state,
   delegates all data/behaviour to useResumeBuilder.
   ─────────────────────────────────────────────────────────── */

import { AnimatePresence } from "framer-motion";
import { useState } from "react";

import {
  CraftAppBody,
  CraftAppHeader,
  CraftAppShell,
} from "@/components/craft/AppPrimitives";

import { EditStep } from "./components/EditStep";
import { PreviewExportStep } from "./components/PreviewExportStep";
import { StepNavigator } from "./components/StepNavigator";
import { TemplatePickerStep } from "./components/TemplatePickerStep";
import { UploadStep } from "./components/UploadStep";
import { AIImportDialog } from "./dialogs/AIImportDialog";
import { AutoFillDialog } from "./dialogs/AutoFillDialog";
import { JobDescriptionDialog } from "./dialogs/JobDescriptionDialog";
import { LoadResumeDialog } from "./dialogs/LoadResumeDialog";
import { PasteTextDialog } from "./dialogs/PasteTextDialog";
import { SaveResumeDialog } from "./dialogs/SaveResumeDialog";
import { useResumeBuilder } from "./hooks/useResumeBuilder";

export default function ResumeBuilderPage() {
  // Dialog open state lives here so the hook can toggle it directly.
  const [showPasteDialog, setShowPasteDialog] = useState(false);
  const [showLoadResumeDialog, setShowLoadResumeDialog] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showAutoFillDialog, setShowAutoFillDialog] = useState(false);
  const [showAIImportDialog, setShowAIImportDialog] = useState(false);
  const [showJobDescDialog, setShowJobDescDialog] = useState(false);

  const [pastedText, setPastedText] = useState("");

  const builder = useResumeBuilder({
    openSaveDialog: () => setShowSaveDialog(true),
    setShowLoadResumeDialog,
    setShowAutoFillDialog,
    setShowPasteDialog,
    setPastedText,
  });

  // Short aliases for readability inside JSX
  const {
    currentStep,
    setCurrentStep,
    resumeData,
    setResumeData,
    selectedTemplate,
    setSelectedTemplate,
    autoSaveStatus,
    currentResumeId,
    isProcessing,
    uploadProgress,
    useAIParsing,
    setUseAIParsing,
    showLivePreview,
    setShowLivePreview,
    activeSection,
    setActiveSection,
    isExporting,
    isSaving,
    jobDescription,
    setJobDescription,
    rewritingBulletId,
    savedResumes,
    isLoadingResumes,
    saveResumeName,
    setSaveResumeName,
    saveCategory,
    setSaveCategory,
    saveTags,
    setSaveTags,
    userProfile,
    hasPersonalizationData,
    handleFile,
    handleTextContent,
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
    loadSavedResumes,
    loadSelectedResume,
    autoFillFromProfile,
    rewriteBulletWithAI,
    exportToPDF,
    saveResume,
    applyAIResumeData,
  } = builder;

  const openSaveDialog = () => {
    if (!saveResumeName && resumeData.contact.name) {
      setSaveResumeName(`${resumeData.contact.name} — Résumé`);
    }
    setShowSaveDialog(true);
  };

  const onStartFresh = () => setCurrentStep(1);

  return (
    <CraftAppShell>
      {/* Editorial masthead */}
      <CraftAppHeader
        kicker="Résumé builder"
        title={
          <>
            Build your résumé in <span className="cc-italic-wonk">four</span> steps.
          </>
        }
        backTo="/dashboard"
      />

      {/* Step rail */}
      <StepNavigator
        currentStep={currentStep}
        onStepClick={(i) => setCurrentStep(i)}
      />

      {/* Steps */}
      <CraftAppBody data-ds-tokenized="true">
        <AnimatePresence mode="wait">
          {currentStep === 0 && (
            <UploadStep
              key="step-upload"
              isProcessing={isProcessing}
              uploadProgress={uploadProgress}
              useAIParsing={useAIParsing}
              onToggleAIParsing={setUseAIParsing}
              onDropFile={handleFile}
              onOpenPaste={() => setShowPasteDialog(true)}
              onOpenLoad={loadSavedResumes}
              onOpenAIImport={() => setShowAIImportDialog(true)}
              onStartFresh={onStartFresh}
              hasProfile={hasPersonalizationData}
              profileSkillCount={userProfile?.skills?.length ?? 0}
              onAutoFillAndStart={() => setShowAutoFillDialog(true)}
              isLoadingResumes={isLoadingResumes}
            />
          )}

          {currentStep === 1 && (
            <EditStep
              key="step-edit"
              resumeData={resumeData}
              setResumeData={setResumeData}
              selectedTemplate={selectedTemplate}
              activeSection={activeSection}
              setActiveSection={setActiveSection}
              showLivePreview={showLivePreview}
              setShowLivePreview={setShowLivePreview}
              updateContact={updateContact}
              updateSummary={updateSummary}
              addExperience={addExperience}
              updateExperience={updateExperience}
              removeExperience={removeExperience}
              addBullet={addBullet}
              updateBullet={updateBullet}
              removeBullet={removeBullet}
              addEducation={addEducation}
              updateEducation={updateEducation}
              removeEducation={removeEducation}
              addSkill={addSkill}
              removeSkill={removeSkill}
              jobDescription={jobDescription}
              rewritingBulletId={rewritingBulletId}
              onRewriteBullet={(expId, i) =>
                rewriteBulletWithAI(expId, i, () => setShowJobDescDialog(true))
              }
              onOpenJobDescDialog={() => setShowJobDescDialog(true)}
              onOpenSaveDialog={openSaveDialog}
              autoSaveStatus={autoSaveStatus}
              isSaving={isSaving}
              currentResumeId={currentResumeId}
              onBack={() => setCurrentStep(0)}
              onNext={() => setCurrentStep(2)}
            />
          )}

          {currentStep === 2 && (
            <TemplatePickerStep
              key="step-template"
              selectedTemplate={selectedTemplate}
              onSelect={setSelectedTemplate}
              onBack={() => setCurrentStep(1)}
              onNext={() => setCurrentStep(3)}
            />
          )}

          {currentStep === 3 && (
            <PreviewExportStep
              key="step-preview"
              resumeData={resumeData}
              selectedTemplate={selectedTemplate}
              resumeDisplayName={resumeData.contact.name || "resume"}
              isExporting={isExporting}
              isSaving={isSaving}
              currentResumeId={currentResumeId}
              onChangeTemplate={() => setCurrentStep(2)}
              onOpenSaveDialog={openSaveDialog}
              onExportPDF={exportToPDF}
            />
          )}
        </AnimatePresence>
      </CraftAppBody>

      {/* Dialogs */}
      <PasteTextDialog
        open={showPasteDialog}
        onOpenChange={setShowPasteDialog}
        pastedText={pastedText}
        onPastedTextChange={setPastedText}
        useAIParsing={useAIParsing}
        onToggleAIParsing={setUseAIParsing}
        isProcessing={isProcessing}
        onProcess={() => handleTextContent(pastedText)}
      />

      <LoadResumeDialog
        open={showLoadResumeDialog}
        onOpenChange={setShowLoadResumeDialog}
        savedResumes={savedResumes}
        onSelect={loadSelectedResume}
      />

      <SaveResumeDialog
        open={showSaveDialog}
        onOpenChange={setShowSaveDialog}
        resumeName={saveResumeName}
        onResumeNameChange={setSaveResumeName}
        category={saveCategory}
        onCategoryChange={setSaveCategory}
        tags={saveTags}
        onTagsChange={setSaveTags}
        isSaving={isSaving}
        isUpdate={Boolean(currentResumeId)}
        onSave={async () => {
          await saveResume();
          setShowSaveDialog(false);
        }}
      />

      <JobDescriptionDialog
        open={showJobDescDialog}
        onOpenChange={setShowJobDescDialog}
        jobDescription={jobDescription}
        onJobDescriptionChange={setJobDescription}
        onConfirm={() => setShowJobDescDialog(false)}
      />

      <AutoFillDialog
        open={showAutoFillDialog}
        onOpenChange={setShowAutoFillDialog}
        profileName={userProfile?.fullName || undefined}
        profileSkillCount={userProfile?.skills?.length ?? 0}
        onConfirm={() => {
          autoFillFromProfile();
          setCurrentStep(1);
        }}
      />

      <AIImportDialog
        open={showAIImportDialog}
        onOpenChange={setShowAIImportDialog}
        onApply={(ai) => {
          applyAIResumeData(ai);
          setShowAIImportDialog(false);
        }}
      />
    </CraftAppShell>
  );
}
