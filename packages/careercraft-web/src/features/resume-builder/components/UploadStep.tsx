/* ───────────────────────────────────────────────────────────
   Step 1 · Start — drop a file, paste, start blank, or reopen.
   One primary action (the dropzone); every alternative lives
   in the side panel so the step reads as a single decision.
   ─────────────────────────────────────────────────────────── */

import { motion } from "framer-motion";
import {
  ArrowUpRight,
  ClipboardPaste,
  FolderOpen,
  ListChecks,
  Plus,
  Upload,
  User,
} from "lucide-react";
import { useDropzone } from "react-dropzone";

import { CraftSpinner } from "@/components/craft/CraftSpinner";

interface UploadStepProps {
  isProcessing: boolean;
  uploadProgress: number;

  onDropFile: (file: File) => void;

  onOpenPaste: () => void;
  onOpenLoad: () => void;
  onOpenAIImport: () => void;
  onStartFresh: () => void;

  hasProfile: boolean;
  profileSkillCount: number;
  onAutoFillAndStart: () => void;

  isLoadingResumes: boolean;

  /** Building without an account — hides the options that need one. */
  isGuest: boolean;
}

export const UploadStep = ({
  isProcessing,
  uploadProgress,
  onDropFile,
  onOpenPaste,
  onOpenLoad,
  onOpenAIImport,
  onStartFresh,
  hasProfile,
  profileSkillCount,
  onAutoFillAndStart,
  isLoadingResumes,
  isGuest,
}: UploadStepProps) => {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (files) => files[0] && onDropFile(files[0]),
    accept: {
      "application/pdf": [".pdf"],
      "application/msword": [".doc"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        [".docx"],
      "image/*": [".png", ".jpg", ".jpeg", ".webp"],
      "text/plain": [".txt"],
    },
    maxFiles: 1,
  });

  return (
    <motion.div
      key="upload"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      className="mx-auto max-w-5xl"
    >
      <h2 className="cc-font-display text-3xl leading-tight tracking-tight md:text-4xl">
        Add your résumé
      </h2>
      <p className="mt-2 text-[15px] text-[color:var(--cc-ink-soft)]">
        Upload the one you have, paste its text, or start from a blank page.
      </p>

      <div className="mt-8 grid grid-cols-1 items-start gap-5 lg:grid-cols-[1fr_340px]">
        {/* ── Primary: dropzone ── */}
        <div>
          <div
            {...getRootProps()}
            className={`cursor-pointer rounded-2xl border-2 border-dashed px-8 py-14 text-center transition-colors md:py-20 ${
              isDragActive
                ? "border-[color:var(--cc-rust)] bg-[color:var(--cc-rust-soft)]"
                : "border-[color:var(--cc-hair-strong)] bg-white hover:border-[color:var(--cc-rust)]"
            }`}
          >
            <input {...getInputProps()} />
            {isProcessing ? (
              <div>
                <div className="flex justify-center">
                  <CraftSpinner label="Reading your file" />
                </div>
                <p className="mt-4 cc-font-display text-2xl leading-tight">Reading your file…</p>
                {uploadProgress > 0 && (
                  <div className="mx-auto mt-6 max-w-xs">
                    <div className="relative h-1.5 overflow-hidden rounded-full bg-[color:var(--cc-cream-2)]">
                      <div
                        className="absolute inset-y-0 left-0 rounded-full bg-[color:var(--cc-rust)] transition-all"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                    <div className="mt-2 cc-tabular text-[13px] text-[color:var(--cc-ash)]">{uploadProgress}%</div>
                  </div>
                )}
              </div>
            ) : (
              <>
                <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-[color:var(--cc-rust-soft)] text-[color:var(--cc-rust)]">
                  <Upload className="h-5 w-5" />
                </div>
                <p className="mt-5 cc-font-display text-2xl leading-tight tracking-tight md:text-3xl">
                  {isDragActive ? "Let go to upload" : "Drop your résumé here"}
                </p>
                <p className="mt-2 text-sm text-[color:var(--cc-ink-soft)]">
                  or <span className="text-[color:var(--cc-rust)] underline underline-offset-4">choose a file</span>
                </p>
                <p className="mt-5 text-[13px] text-[color:var(--cc-ash)]">PDF, Word, a photo or a text file</p>
              </>
            )}
          </div>

          {/* Every import path is read by the model. Guests still see the file
              gate, because only the text path takes anonymous calls — page
              images are too expensive to leave unauthenticated. */}
          <p className="mt-3 rounded-xl bg-[color:var(--cc-cream-2)] px-4 py-3 text-[13.5px] leading-snug text-[color:var(--cc-ink-soft)]">
            {isGuest
              ? "Reading a PDF, Word file or photo needs a free account. Pasting your résumé's text works right now without one."
              : "We read what you bring in and sort it into the right fields. Have a quick look over them before you save."}
          </p>
        </div>

        {/* ── Alternatives ── */}
        <aside className="overflow-hidden rounded-2xl border border-[color:var(--cc-hair)] bg-white">
          <div className="border-b border-[color:var(--cc-hair)] px-4 py-3 text-[13px] font-medium text-[color:var(--cc-ash)]">
            Other ways to start
          </div>

          <OptionRow
            icon={ListChecks}
            title="Upload and review first"
            desc={
              isGuest
                ? "See what we read from your file before anything is filled in. Needs a free account."
                : "See what we read from your file before anything is filled in."
            }
            onClick={onOpenAIImport}
            requiresAccount={isGuest}
            featured
          />
          {!isGuest && hasProfile && (
            <OptionRow
              icon={User}
              title="Fill from my profile"
              desc={`Your contact details and ${profileSkillCount} skill${profileSkillCount === 1 ? "" : "s"} from Settings.`}
              onClick={onAutoFillAndStart}
            />
          )}
          {/* Both of these read from the account, so they're signed-in only. */}
          {!isGuest && (
            <OptionRow
              icon={FolderOpen}
              title="Open a saved résumé"
              desc="Pick up where you left off."
              onClick={onOpenLoad}
              loading={isLoadingResumes}
            />
          )}
          <OptionRow
            icon={ClipboardPaste}
            title="Paste text"
            desc={isGuest ? "From a document or email. No account needed." : "From a document or email."}
            onClick={onOpenPaste}
          />
          <OptionRow icon={Plus} title="Start blank" desc="Type it all in yourself." onClick={onStartFresh} last />
        </aside>
      </div>
    </motion.div>
  );
};

/* ────────────────────────── subcomponents ────────────────────── */

interface OptionRowProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
  onClick: () => void;
  featured?: boolean;
  loading?: boolean;
  last?: boolean;
  /** Marks the row as leading to signup, so the redirect isn't a surprise. */
  requiresAccount?: boolean;
}

const OptionRow = ({
  icon: Icon,
  title,
  desc,
  onClick,
  featured,
  loading,
  last,
  requiresAccount,
}: OptionRowProps) => (
  <button
    type="button"
    onClick={onClick}
    disabled={loading}
    className={`group flex w-full items-start gap-3 px-4 py-3.5 text-left transition-colors disabled:opacity-60 ${
      last ? "" : "border-b border-[color:var(--cc-hair)]"
    } ${featured ? "bg-[color:var(--cc-rust-soft)] hover:bg-[rgba(42,82,204,0.16)]" : "hover:bg-[color:var(--cc-cream-2)]"}`}
  >
    {loading ? (
      <span className="mt-0.5">
        <CraftSpinner size="sm" label="Loading" />
      </span>
    ) : (
      <Icon
        className={`mt-0.5 h-4 w-4 shrink-0 ${featured ? "text-[color:var(--cc-rust)]" : "text-[color:var(--cc-ink-soft)]"}`}
      />
    )}
    <span className="min-w-0 flex-1">
      <span
        className={`flex items-center gap-2 text-sm font-semibold leading-tight ${
          featured ? "text-[color:var(--cc-rust-deep)]" : "text-[color:var(--cc-ink)]"
        }`}
      >
        {title}
        {requiresAccount && (
          <span className="shrink-0 rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-[color:var(--cc-ink-soft)]">
            Free account
          </span>
        )}
      </span>
      <span className="mt-0.5 block text-[13px] leading-snug text-[color:var(--cc-ink-soft)]">{desc}</span>
    </span>
    <ArrowUpRight
      className={`mt-0.5 h-4 w-4 shrink-0 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 ${
        featured ? "text-[color:var(--cc-rust)]" : "text-[color:var(--cc-ash)]"
      }`}
    />
  </button>
);
