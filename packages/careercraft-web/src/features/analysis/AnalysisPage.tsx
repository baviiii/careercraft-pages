import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";

import {
  CraftAppBody,
  CraftAppHeader,
  CraftAppShell,
  CraftButton,
} from "@/components/craft/AppPrimitives";

import { ActionableRewritesPanel } from "./components/ActionableRewritesPanel";
import { AnalyzingScreen } from "./components/AnalyzingScreen";
import { CoverLetterPairing } from "./components/CoverLetterPairing";
import { CoverLetterPanel } from "./components/CoverLetterPanel";
import { ExecutiveSummary } from "./components/ExecutiveSummary";
import { JobDescriptionInput } from "./components/JobDescriptionInput";
import { KeywordMatchesPanel } from "./components/KeywordMatchesPanel";
import { OverviewPanel } from "./components/OverviewPanel";
import { ReanalyzingOverlay } from "./components/ReanalyzingOverlay";
import { RedFlagsPanel } from "./components/RedFlagsPanel";
import { RequirementsPanel } from "./components/RequirementsPanel";
import { ResultTabs } from "./components/ResultTabs";
import { ResumeSelector } from "./components/ResumeSelector";
import { ScoreBreakdown } from "./components/ScoreBreakdown";
import { ScoreGauge } from "./components/ScoreGauge";
import { SuggestionsPanel } from "./components/SuggestionsPanel";
import { WritingQualityPanel } from "./components/WritingQualityPanel";
import { CreateResumeDialog } from "./dialogs/CreateResumeDialog";
import { SaveResumeDialog } from "./dialogs/SaveResumeDialog";
import { useAnalysis } from "./hooks/useAnalysis";

export default function AnalysisPage() {
  const a = useAnalysis();

  /* ─── Step: analyzing ────────────────────────────────── */
  if (a.step === "analyzing") return <AnalyzingScreen />;

  /* ─── Step: upload ───────────────────────────────────── */
  if (a.step === "upload") {
    return (
      <CraftAppShell>
        <CraftAppHeader
          kicker="§ 03 · The audit"
          title={
            <>
              Read the <span className="cc-italic-wonk">draft</span> against
              <br />
              the posting.
            </>
          }
          sub="A close read for clarity, metrics, and keywords — so the pages pass both machines and human readers."
        />

        <CraftAppBody>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid lg:grid-cols-2 gap-6"
          >
            <ResumeSelector
              savedResumes={a.savedResumes}
              selectedResumeId={a.selectedResumeId}
              onSelectSaved={a.handleSelectSavedResume}
              resumeText={a.resumeText}
              fileName={a.fileName}
              resumeSource={a.resumeSource}
              isUploading={a.isUploading}
              onDrop={a.onDrop}
              onClear={a.clearResume}
            />
            <JobDescriptionInput
              value={a.jobDescription}
              onChange={a.setJobDescription}
            />
          </motion.div>

          <CoverLetterPairing
            savedCoverLetters={a.savedCoverLetters}
            selectedCoverLetterId={a.selectedCoverLetterId}
            onPick={a.pickCoverLetter}
            coverLetterText={a.coverLetterText}
            onChangeText={a.setCoverLetterText}
            onClearSelection={() => a.setSelectedCoverLetterId("")}
          />

          <div className="mt-10 flex flex-col items-center text-center">
            <CraftButton
              onClick={a.handleAnalyze}
              disabled={!a.resumeText || !a.jobDescription.trim() || a.isAnalyzing}
            >
              <Sparkles className="w-4 h-4" />
              {a.coverLetterText
                ? "Run the complete reading"
                : "Audit the draft"}
              <ArrowRight className="w-4 h-4" />
            </CraftButton>
            <p className="mt-5 cc-font-editorial italic text-[color:var(--cc-ink-soft)] max-w-xl">
              The audit covers ATS score, keyword match, writing quality, red
              flags, and the full rewrite toolkit.
            </p>
          </div>
        </CraftAppBody>
      </CraftAppShell>
    );
  }

  /* ─── Step: results ──────────────────────────────────── */
  if (!a.analysis) return null;

  return (
    <CraftAppShell>
      <ReanalyzingOverlay open={a.isReanalyzing} />

      <CraftAppHeader
        kicker="§ The reading"
        title={
          <>
            Redlines & <span className="cc-italic-wonk">marginalia</span>.
          </>
        }
        sub="A working mark-up of the draft — what's strong, what's missing, and where to sharpen."
        rightSlot={
          <div className="hidden md:flex items-center gap-2">
            <CraftButton variant="ghost" size="sm" onClick={a.handleNewAnalysis}>
              New audit
            </CraftButton>
            <CraftButton
              variant="ghost"
              size="sm"
              onClick={() => a.openSaveDialog("original")}
            >
              Save
            </CraftButton>
            <CraftButton
              variant="ghost"
              size="sm"
              onClick={a.goToCoverLetterEditor}
            >
              Cover letter
            </CraftButton>
            <CraftButton
              size="sm"
              onClick={() => a.setShowTemplateDialog(true)}
              disabled={!a.parsedResumeData}
            >
              Create résumé
            </CraftButton>
          </div>
        }
      />

      <CraftAppBody className="!py-6 md:!py-8">
        <section className="border border-[color:var(--cc-ink)] bg-[color:var(--cc-cream)] p-7 md:p-8">
          <div className="grid md:grid-cols-[auto_1fr] gap-8 items-start">
            <ScoreGauge score={a.analysis.overallScore} fileName={a.fileName} />
            <ScoreBreakdown subScores={a.analysis.subScores} />
          </div>
        </section>

        <ExecutiveSummary summary={a.analysis.summary} />

        <ResultTabs active={a.activeResultTab} onChange={a.setActiveResultTab} />

        <div className="mt-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={a.activeResultTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
            >
              {a.activeResultTab === "overview" && (
                <OverviewPanel analysis={a.analysis} />
              )}
              {a.activeResultTab === "requirements" && (
                <RequirementsPanel analysis={a.analysis} />
              )}
              {a.activeResultTab === "keywords" && (
                <KeywordMatchesPanel analysis={a.analysis} />
              )}
              {a.activeResultTab === "quality" && (
                <WritingQualityPanel analysis={a.analysis} />
              )}
              {a.activeResultTab === "redflags" && (
                <RedFlagsPanel analysis={a.analysis} />
              )}
              {a.activeResultTab === "improvements" && (
                <SuggestionsPanel analysis={a.analysis} />
              )}
              {a.activeResultTab === "enhance" && (
                <ActionableRewritesPanel
                  analysis={a.analysis}
                  activeEnhancement={a.activeEnhancement}
                  enhancementResult={a.enhancementResult}
                  enhancedResumeData={a.enhancedResumeData}
                  isReanalyzing={a.isReanalyzing}
                  copiedText={a.copiedText}
                  onRun={a.handleEnhancement}
                  onApplyAndReanalyze={a.applyEnhancementAndReanalyze}
                  onCopy={a.copyToClipboard}
                  onOpenSaveEnhanced={() => a.openSaveDialog("enhanced")}
                  onGoBuilderWithEnhanced={a.goToBuilderWithEnhanced}
                  onClearEnhancement={a.clearEnhancement}
                />
              )}
              {a.activeResultTab === "coverletter" && (
                <CoverLetterPanel
                  tone={a.coverLetterTone}
                  onToneChange={a.setCoverLetterTone}
                  isGenerating={a.isGeneratingCoverLetter}
                  generated={a.generatedCoverLetter}
                  onGenerate={a.handleGenerateCoverLetter}
                  onGeneratedChange={a.setGeneratedCoverLetter}
                  onSave={a.saveCoverLetter}
                  onCopy={a.copyToClipboard}
                  copiedText={a.copiedText}
                  overallScore={a.analysis.overallScore}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="mt-12 flex md:hidden flex-wrap gap-2 justify-center">
          <CraftButton variant="ghost" size="sm" onClick={a.handleNewAnalysis}>
            New audit
          </CraftButton>
          <CraftButton
            variant="ghost"
            size="sm"
            onClick={() => a.openSaveDialog("original")}
          >
            Save
          </CraftButton>
          <CraftButton
            variant="ghost"
            size="sm"
            onClick={a.goToCoverLetterEditor}
          >
            Cover letter
          </CraftButton>
          <CraftButton
            size="sm"
            onClick={() => a.setShowTemplateDialog(true)}
            disabled={!a.parsedResumeData}
          >
            Create résumé
          </CraftButton>
        </div>

        <div className="mt-12 cc-dot-rule">
          <span>end of reading</span>
          <span className="cc-tabular">
            score {a.analysis.overallScore}/100
          </span>
        </div>
      </CraftAppBody>

      <SaveResumeDialog
        open={a.saveDialogOpen}
        onOpenChange={a.setSaveDialogOpen}
        saveName={a.saveName}
        onSaveNameChange={a.setSaveName}
        saveType={a.saveType}
        isSaving={a.isSaving}
        analysis={a.analysis}
        onConfirm={a.saveToResumeManager}
      />

      <CreateResumeDialog
        open={a.showTemplateDialog}
        onOpenChange={a.setShowTemplateDialog}
        analysis={a.analysis}
        parsedResumeData={a.parsedResumeData}
        isBuilderResume={a.isBuilderResume}
        selectedResumeTemplateId={a.selectedResumeTemplateId}
        onGoBuilder={a.goBuilderFromTemplate}
        onGoCoverLetter={() => {
          a.goToCoverLetterEditor();
          a.setShowTemplateDialog(false);
        }}
        onSaveResume={a.openSaveFromTemplateDialog}
        onAddToJobs={a.addToJobTracker}
      />
    </CraftAppShell>
  );
}
