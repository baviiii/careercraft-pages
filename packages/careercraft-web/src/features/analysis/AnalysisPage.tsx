import { useRef, type CSSProperties } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Briefcase, ExternalLink, ScanSearch } from "lucide-react";

import {
  CraftAppBody,
  CraftAppHeader,
  CraftAppShell,
} from "@/components/craft/AppPrimitives";
import { applicationLabel } from "@/features/cover-letter/lib/letterLabel";

import { ActionableRewritesPanel } from "./components/ActionableRewritesPanel";
import { AnalyzingScreen } from "./components/AnalyzingScreen";
import { CoverLetterPairing } from "./components/CoverLetterPairing";
import { CoverLetterPanel } from "./components/CoverLetterPanel";
import { ExecutiveSummary } from "./components/ExecutiveSummary";
import { JobDescriptionInput } from "./components/JobDescriptionInput";
import { KeywordMatchesPanel } from "./components/KeywordMatchesPanel";
import { OverviewPanel } from "./components/OverviewPanel";
import { ReanalyzingOverlay } from "./components/ReanalyzingOverlay";
import { RecentChecks } from "./components/RecentChecks";
import { RedFlagsPanel } from "./components/RedFlagsPanel";
import { RequirementsPanel } from "./components/RequirementsPanel";
import { ResultTabs } from "./components/ResultTabs";
import { ResumeSelector } from "./components/ResumeSelector";
import { ScoreBreakdown } from "./components/ScoreBreakdown";
import { ScoreGauge } from "./components/ScoreGauge";
import { ScoreTallies } from "./components/ScoreTallies";
import { SuggestionsPanel } from "./components/SuggestionsPanel";
import { WritingQualityPanel } from "./components/WritingQualityPanel";
import { CreateResumeDialog } from "./dialogs/CreateResumeDialog";
import { SaveResumeDialog } from "./dialogs/SaveResumeDialog";
import { useAnalysis } from "./hooks/useAnalysis";
import { useAtsHistory } from "./hooks/useAtsHistory";
import { toneVar } from "./tone";
import { scoreTone, type ResultTabId } from "./types";
import { QuotaNotice } from "@/components/craft/QuotaNotice";

const EASE = [0.2, 0.8, 0.2, 1] as const;

export default function AnalysisPage() {
  const a = useAnalysis();
  const history = useAtsHistory(a.step === "upload");
  const reduce = useReducedMotion();
  const tabsAnchor = useRef<HTMLDivElement>(null);

  const backTo = a.forApplication ? "/tracker" : "/dashboard";
  const backLabel = a.forApplication ? "Back to tracker" : "Back to dashboard";
  const trackedBanner = a.forApplication ? (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[color:var(--cc-hair)] bg-[color:var(--cc-cream-2)] px-4 py-3 text-[14px] text-[color:var(--cc-ink-soft)]">
      <span className="inline-flex items-center gap-2">
        <Briefcase className="h-4 w-4 shrink-0 text-[color:var(--cc-rust)]" />
        <span>
          For your tracked job:{" "}
          <strong className="font-semibold text-[color:var(--cc-ink)]">
            {applicationLabel(a.forApplication)}
          </strong>
        </span>
      </span>
      {a.forApplication.job_url && (
        <a
          href={a.forApplication.job_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 font-semibold text-[color:var(--cc-rust)] underline-offset-2 hover:underline"
        >
          Open job ad <ExternalLink className="h-3.5 w-3.5" />
        </a>
      )}
    </div>
  ) : null;

  /* ─── Step: analyzing ────────────────────────────────── */
  if (a.step === "analyzing") return <AnalyzingScreen />;

  /* ─── Step: upload ───────────────────────────────────── */
  if (a.step === "upload") {
    return (
      <CraftAppShell className="cc-proof">
        <CraftAppHeader
          kicker="ATS check"
          title="Check your résumé against a job."
          backTo={backTo}
          backLabel={backLabel}
        />

        <CraftAppBody className="!pt-0">
          {trackedBanner}
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
              jobUrl={a.forApplication?.job_url}
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

          {/* Sits directly above the button the user just pressed, so the
              answer to "why did nothing happen?" is where they are looking.
              Persistent rather than a toast — this is a state, not an event. */}
          {a.quotaBlock && (
            <div className="mt-8">
              <QuotaNotice details={a.quotaBlock} />
            </div>
          )}

          <div className="mt-10 flex justify-center">
            <button
              className="cc-action cc-action--lg"
              onClick={a.handleAnalyze}
              disabled={!a.resumeText || !a.jobDescription.trim() || a.isAnalyzing}
            >
              <ScanSearch className="w-4 h-4" />
              {a.coverLetterText ? "Check résumé and letter" : "Check my résumé"}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <RecentChecks
            checks={history.checks}
            hasMore={history.hasMore}
            onOpen={(id) => void a.openCheck(id)}
            onRemove={(id) => void history.remove(id)}
            onShowMore={history.showMore}
          />
        </CraftAppBody>
      </CraftAppShell>
    );
  }

  /* ─── Step: results ──────────────────────────────────── */
  if (!a.analysis) return null;

  const { tone } = scoreTone(a.analysis.overallScore);

  const jumpTo = (tab: ResultTabId) => {
    a.setActiveResultTab(tab);
    tabsAnchor.current?.scrollIntoView({
      behavior: reduce ? "auto" : "smooth",
      block: "start",
    });
  };

  const actions = (
    <>
      <button className="cc-action cc-action--ghost cc-action--sm" onClick={a.handleNewAnalysis}>
        New check
      </button>
      <button
        className="cc-action cc-action--ghost cc-action--sm"
        onClick={() => a.openSaveDialog("original")}
      >
        Save
      </button>
      <button className="cc-action cc-action--ghost cc-action--sm" onClick={a.goToCoverLetterEditor}>
        Cover letter
      </button>
      <button
        className="cc-action cc-action--sm"
        onClick={() => a.setShowTemplateDialog(true)}
        disabled={!a.parsedResumeData}
      >
        Create résumé
      </button>
    </>
  );

  return (
    <CraftAppShell className="cc-proof">
      <ReanalyzingOverlay open={a.isReanalyzing} />

      <CraftAppHeader
        backTo={backTo}
        backLabel={backLabel}
        rightSlot={<div className="hidden md:flex items-center gap-2">{actions}</div>}
      />

      <CraftAppBody className="!pt-5 md:!pt-7">
        {trackedBanner}
        <motion.section
          className="cc-proof-card"
          style={{ "--pf-tone": toneVar(tone) } as CSSProperties}
          initial={reduce ? false : { opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE }}
        >
          <div className="grid gap-10 p-6 md:p-10 lg:grid-cols-[1.2fr_1fr] lg:gap-16 lg:p-12">
            <ScoreGauge
              score={a.analysis.overallScore}
              fileName={a.fileName}
              subScores={a.analysis.subScores}
              onJump={jumpTo}
            />
            <ScoreBreakdown subScores={a.analysis.subScores} />
          </div>
          <ScoreTallies analysis={a.analysis} onJump={jumpTo} />
        </motion.section>

        <motion.div
          initial={reduce ? false : { opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE, delay: 0.15 }}
        >
          <ExecutiveSummary summary={a.analysis.summary} />
        </motion.div>

        <div ref={tabsAnchor} className="scroll-mt-14" />
        <ResultTabs
          active={a.activeResultTab}
          onChange={a.setActiveResultTab}
          counts={{
            redflags: a.analysis.redFlags.length,
            improvements: a.analysis.improvements.quickFixes.length,
          }}
        />

        <div className="mt-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={a.activeResultTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
            >
              {a.activeResultTab === "overview" && (
                <OverviewPanel analysis={a.analysis} onJump={a.setActiveResultTab} />
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
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="mt-12 flex md:hidden flex-wrap gap-2 justify-center">{actions}</div>
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
