/* ───────────────────────────────────────────────────────────
   § 01 · Cover — drop a file, paste, start fresh, or reopen.
   ─────────────────────────────────────────────────────────── */

import { motion } from "framer-motion";
import {
  ClipboardPaste,
  FolderOpen,
  Loader2,
  Plus,
  Sparkles,
  Upload,
  User,
} from "lucide-react";
import { useDropzone } from "react-dropzone";

import { CraftButton } from "@/components/craft/AppPrimitives";

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
      className="max-w-3xl mx-auto"
    >
      {/* Opening kicker */}
      <div className="cc-label text-[color:var(--cc-rust)]">§ 01 · Cover</div>
      <h2 className="mt-3 cc-font-display text-4xl md:text-5xl leading-[0.95] tracking-tight">
        Bring a draft — <span className="cc-italic-wonk">or</span>
        <br />
        begin with a blank sheet.
      </h2>
      <p className="mt-4 cc-font-editorial italic text-xl text-[color:var(--cc-ink-soft)] max-w-xl">
        Upload a résumé, paste one in, or reopen a saved resume.
      </p>

      {/* AI Smart Import — top-tier */}
      <button
        onClick={onOpenAIImport}
        className="mt-10 w-full text-left border-2 border-[color:var(--cc-ink)] bg-[color:var(--cc-cream)] hover:bg-[color:var(--cc-cream-2)] transition-colors p-6 md:p-7 group"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 border border-[color:var(--cc-ink)] bg-[color:var(--cc-ink)] text-[color:var(--cc-cream)] inline-flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="cc-label text-[color:var(--cc-rust)]">
                § Smart import · new
              </div>
              <h3 className="mt-1 cc-font-display text-2xl md:text-3xl leading-tight tracking-tight">
                Let AI import your résumé for you.
              </h3>
              <p className="mt-2 cc-font-editorial italic text-[color:var(--cc-ink-soft)]">
                Upload any format · we'll extract your details · review before you apply.
              </p>
            </div>
          </div>
          <div className="cc-font-display italic text-5xl text-[color:var(--cc-rust)] leading-none group-hover:translate-x-1 transition-transform">
            →
          </div>
        </div>
      </button>

      {/* AI toggle */}
      <div className="mt-6 flex items-center justify-between border border-[color:var(--cc-hair-strong)] bg-[color:var(--cc-cream)] px-5 py-4">
        <div className="flex items-start gap-3">
          <Sparkles
            className={`w-4 h-4 mt-1 ${
              useAIParsing
                ? "text-[color:var(--cc-rust)]"
                : "text-[color:var(--cc-ash)]"
            }`}
          />
          <div>
            <div className="cc-label text-[color:var(--cc-ink)]">
              AI parsing on quick drop
            </div>
            <p className="mt-1 cc-font-editorial italic text-[color:var(--cc-ink-soft)]">
              {useAIParsing
                ? "Uses AI tokens — richer extraction of experience, schools, skills."
                : "Basic text extraction (no tokens used)."}
            </p>
          </div>
        </div>
        <EditorialToggle
          checked={useAIParsing}
          onChange={onToggleAIParsing}
          ariaLabel="Toggle AI parsing"
        />
      </div>

      {/* Drop zone */}
      <div
        {...getRootProps()}
        className={`mt-6 border-2 border-dashed cursor-pointer transition-colors p-10 md:p-14 text-center ${
          isDragActive
            ? "border-[color:var(--cc-rust)] bg-[color:var(--cc-cream-2)]"
            : "border-[color:var(--cc-ink)] bg-[color:var(--cc-cream)] hover:bg-[color:var(--cc-cream-2)]"
        }`}
      >
        <input {...getInputProps()} />
        {isProcessing ? (
          <div>
            <Loader2 className="w-10 h-10 mx-auto animate-spin text-[color:var(--cc-rust)]" />
            <p className="mt-5 cc-font-display italic text-2xl leading-tight">
              Reading the pages…
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
            <Upload className="w-10 h-10 mx-auto text-[color:var(--cc-ink-soft)]" />
            <p className="mt-4 cc-font-display text-3xl md:text-4xl leading-tight tracking-tight">
              {isDragActive ? (
                <>
                  Drop it <span className="cc-italic-wonk">here</span>.
                </>
              ) : (
                <>
                  Drag a résumé onto the page.
                </>
              )}
            </p>
            <p className="mt-3 cc-font-editorial italic text-[color:var(--cc-ink-soft)]">
              PDF · Word · image · plain text
            </p>
            <div className="mt-6 flex flex-wrap gap-1.5 justify-center">
              {["PDF", "DOCX", "DOC", "TXT", "PNG/JPG"].map((ext) => (
                <span key={ext} className="cc-pill">
                  {ext}
                </span>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Divider */}
      <div className="cc-dot-rule my-10">
        <span>or begin otherwise</span>
      </div>

      {/* Auto-fill banner */}
      {hasProfile && (
        <div className="border border-[color:var(--cc-ink)] bg-[color:var(--cc-cream)] p-5 md:p-6 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <User className="w-5 h-5 mt-1 text-[color:var(--cc-rust)]" />
            <div>
              <div className="cc-label text-[color:var(--cc-ink)]">
                § Quick start from your profile
              </div>
              <p className="mt-1 cc-font-editorial italic text-[color:var(--cc-ink-soft)]">
                Auto-fill contact, {profileSkillCount} skills, and career notes
                from Settings.
              </p>
            </div>
          </div>
          <CraftButton onClick={onAutoFillAndStart}>
            <Sparkles className="w-4 h-4" />
            Auto-fill & begin
          </CraftButton>
        </div>
      )}

      {/* Three buttons row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <button
          onClick={onOpenLoad}
          disabled={isLoadingResumes}
          className="cc-btn cc-btn-ghost w-full"
        >
          {isLoadingResumes ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <FolderOpen className="w-4 h-4" />
          )}
          My resumes
        </button>
        <button onClick={onOpenPaste} className="cc-btn cc-btn-ghost w-full">
          <ClipboardPaste className="w-4 h-4" />
          Paste text
        </button>
        <button onClick={onStartFresh} className="cc-btn cc-btn-ghost w-full">
          <Plus className="w-4 h-4" />
          Start fresh
        </button>
      </div>

      {/* Info */}
      <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-px bg-[color:var(--cc-hair-strong)] border border-[color:var(--cc-hair-strong)]">
        <InfoCard
          heading="PDF files"
          body="Text is pulled for editing. Original formatting is reference only."
        />
        <InfoCard
          heading="Word documents"
          body="Fuller extraction with better structural preservation."
        />
        <InfoCard
          heading="Plain text"
          body="Paste from anywhere or upload a .txt."
        />
      </div>
    </motion.div>
  );
};

const InfoCard = ({ heading, body }: { heading: string; body: string }) => (
  <div className="bg-[color:var(--cc-cream)] p-6">
    <div className="cc-label text-[color:var(--cc-rust)]">§ {heading}</div>
    <p className="mt-3 cc-font-editorial text-[17px] leading-snug text-[color:var(--cc-ink-soft)]">
      {body}
    </p>
  </div>
);

interface EditorialToggleProps {
  checked: boolean;
  onChange: (v: boolean) => void;
  ariaLabel: string;
}

/** Tiny editorial toggle styled with ink/cream. */
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
    className={`relative w-12 h-6 border border-[color:var(--cc-ink)] transition-colors ${
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
