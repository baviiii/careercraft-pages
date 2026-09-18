/* ───────────────────────────────────────────────────────────
   01 · Import — drop a file, paste, start blank, or reopen.
   One primary action (the dropzone); every alternative lives
   in the side panel so the step reads as a single decision.
   ─────────────────────────────────────────────────────────── */

import { motion } from "framer-motion";
import {
  ArrowUpRight,
  ClipboardPaste,
  FolderOpen,
  Loader2,
  Plus,
  Sparkles,
  Upload,
  User,
} from "lucide-react";
import { useDropzone } from "react-dropzone";

interface UploadStepProps {
  isProcessing: boolean;
  uploadProgress: number;

  useAIParsing: boolean;
  onToggleAIParsing: (value: boolean) => void;

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
  useAIParsing,
  onToggleAIParsing,
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
      className="max-w-5xl mx-auto"
    >
      {/* Heading */}
      <div className="cc-label text-[color:var(--cc-rust)]">01 · Import</div>
      <h2 className="mt-3 cc-font-display text-3xl md:text-4xl leading-tight tracking-tight">
        Add your résumé
      </h2>
      <p className="mt-2 text-[15px] text-[color:var(--cc-ink-soft)]">
        Upload a file, paste the text, or start from a blank page.
      </p>

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-5 items-start">
        {/* ── Primary: dropzone ── */}
        <div>
          <div
            {...getRootProps()}
            className={`border-2 border-dashed cursor-pointer transition-colors px-8 py-14 md:py-20 text-center ${
              isDragActive
                ? "border-[color:var(--cc-rust)] bg-[color:var(--cc-rust-soft)]"
                : "border-[color:var(--cc-ink)] bg-[color:var(--cc-cream)] hover:bg-[color:var(--cc-cream-2)]"
            }`}
          >
            <input {...getInputProps()} />
            {isProcessing ? (
              <div>
                <Loader2 className="w-8 h-8 mx-auto animate-spin text-[color:var(--cc-rust)]" />
                <p className="mt-4 cc-font-display text-2xl leading-tight">
                  Reading your file…
                </p>
                {uploadProgress > 0 && (
                  <div className="mt-6 max-w-xs mx-auto">
                    <div className="relative h-[2px] bg-[color:var(--cc-hair)]">
                      <div
                        className="absolute inset-y-0 left-0 bg-[color:var(--cc-rust)] transition-all"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                    <div className="mt-2 cc-label text-[color:var(--cc-ash)] cc-tabular">
                      {uploadProgress}%
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <>
                <div className="w-12 h-12 mx-auto border border-[color:var(--cc-ink)] flex items-center justify-center">
                  <Upload className="w-5 h-5" />
                </div>
                <p className="mt-5 cc-font-display text-2xl md:text-3xl leading-tight tracking-tight">
                  {isDragActive ? "Drop to upload" : "Drop your résumé here"}
                </p>
                <p className="mt-2 text-sm text-[color:var(--cc-ink-soft)]">
                  or <span className="underline underline-offset-4">browse your files</span>
                </p>
                <p className="mt-5 cc-label-sm text-[color:var(--cc-ash)]">
                  PDF · DOCX · DOC · TXT · PNG · JPG
                </p>
              </>
            )}
          </div>

          {/* Upload setting. Hidden for guests: AI reading needs an account,
              so a toggle promising to turn it on would be a dead control. */}
          {isGuest ? (
            <p className="mt-3 border border-[color:var(--cc-hair-strong)] bg-[color:var(--cc-cream)] px-4 py-3 text-[13px] leading-snug text-[color:var(--cc-ash)]">
              PDFs, Word files and photos are read by AI, which needs a free
              account. Pasting your résumé text works right now without one.
            </p>
          ) : (
            <div className="mt-3 flex items-center justify-between gap-4 border border-[color:var(--cc-hair-strong)] bg-[color:var(--cc-cream)] px-4 py-3">
              <div className="flex items-center gap-3 min-w-0">
                <Sparkles
                  className={`w-4 h-4 shrink-0 ${
                    useAIParsing
                      ? "text-[color:var(--cc-rust)]"
                      : "text-[color:var(--cc-ash)]"
                  }`}
                />
                <div className="min-w-0">
                  <div className="text-sm font-medium leading-tight">AI extraction</div>
                  {/* Says what it does, not what it used to claim: the toggle
                      only governs text, because PDFs and images cannot be read
                      without the model at all. */}
                  <p className="mt-0.5 text-[13px] leading-snug text-[color:var(--cc-ash)]">
                    {useAIParsing
                      ? "Pasted text and .txt files are sorted into fields."
                      : "Off — text comes in raw. PDFs and photos still use AI."}
                  </p>
                </div>
              </div>
              <EditorialToggle
                checked={useAIParsing}
                onChange={onToggleAIParsing}
                ariaLabel="Toggle AI extraction"
              />
            </div>
          )}
        </div>

        {/* ── Alternatives ── */}
        <aside className="border border-[color:var(--cc-ink)] bg-[color:var(--cc-cream)]">
          <div className="px-4 py-3 border-b border-[color:var(--cc-hair)] cc-label-sm text-[color:var(--cc-ash)]">
            Other ways to start
          </div>

          <OptionRow
            icon={Sparkles}
            title="Smart import"
            desc={
              isGuest
                ? "AI reads your file and fills every field. Needs a free account."
                : "AI reads your file and fills every field — review before applying."
            }
            onClick={onOpenAIImport}
            requiresAccount={isGuest}
            featured
          />
          {!isGuest && hasProfile && (
            <OptionRow
              icon={User}
              title="Fill from profile"
              desc={`Contact details and ${profileSkillCount} skills from Settings.`}
              onClick={onAutoFillAndStart}
            />
          )}
          {/* Both of these read from the account, so they're signed-in only. */}
          {!isGuest && (
            <OptionRow
              icon={FolderOpen}
              title="My résumés"
              desc="Reopen a saved résumé."
              onClick={onOpenLoad}
              loading={isLoadingResumes}
            />
          )}
          <OptionRow
            icon={ClipboardPaste}
            title="Paste text"
            desc={
              isGuest
                ? "Paste from a document or email — no account needed."
                : "Paste from a document or email."
            }
            onClick={onOpenPaste}
          />
          <OptionRow
            icon={Plus}
            title="Start blank"
            desc="Type everything yourself."
            onClick={onStartFresh}
            last
          />
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
    onClick={onClick}
    disabled={loading}
    className={`group w-full flex items-start gap-3 px-4 py-3.5 text-left transition-colors disabled:opacity-60 ${
      last ? "" : "border-b border-[color:var(--cc-hair)]"
    } ${
      featured
        ? "bg-[color:var(--cc-ink)] text-[color:var(--cc-cream)] hover:bg-[color:var(--cc-rust)]"
        : "hover:bg-[color:var(--cc-cream-2)]"
    }`}
  >
    {loading ? (
      <Loader2 className="w-4 h-4 mt-0.5 shrink-0 animate-spin" />
    ) : (
      <Icon
        className={`w-4 h-4 mt-0.5 shrink-0 ${
          featured ? "" : "text-[color:var(--cc-ink-soft)]"
        }`}
      />
    )}
    <span className="flex-1 min-w-0">
      <span className="flex items-center gap-2 text-sm font-medium leading-tight">
        {title}
        {requiresAccount && (
          <span
            className={`shrink-0 border px-1.5 py-0.5 text-[10px] uppercase tracking-wider ${
              featured
                ? "border-[color:var(--cc-cream)]/40 text-[color:var(--cc-cream)]/80"
                : "border-[color:var(--cc-hair-strong)] text-[color:var(--cc-ash)]"
            }`}
          >
            Free account
          </span>
        )}
      </span>
      <span
        className={`mt-0.5 block text-[13px] leading-snug ${
          featured ? "text-[color:var(--cc-cream)]/75" : "text-[color:var(--cc-ash)]"
        }`}
      >
        {desc}
      </span>
    </span>
    <ArrowUpRight
      className={`w-4 h-4 mt-0.5 shrink-0 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 ${
        featured ? "" : "text-[color:var(--cc-ash)]"
      }`}
    />
  </button>
);

interface EditorialToggleProps {
  checked: boolean;
  onChange: (v: boolean) => void;
  ariaLabel: string;
}

/** Tiny editorial toggle styled with ink/paper. */
const EditorialToggle = ({
  checked,
  onChange,
  ariaLabel,
}: EditorialToggleProps) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={ariaLabel}
    onClick={() => onChange(!checked)}
    className={`relative w-12 h-6 shrink-0 border border-[color:var(--cc-ink)] transition-colors ${
      checked ? "bg-[color:var(--cc-ink)]" : "bg-[color:var(--cc-cream)]"
    }`}
  >
    <span
      className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 transition-transform ${
        checked
          ? "translate-x-[26px] bg-[color:var(--cc-cream)]"
          : "translate-x-[2px] bg-[color:var(--cc-ink)]"
      }`}
    />
  </button>
);
