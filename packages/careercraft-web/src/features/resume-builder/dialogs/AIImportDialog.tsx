/* ───────────────────────────────────────────────────────────
   AI Smart Import — replaces the old SmartResumeFlow panel.
   Two phases:
     1. Upload    — drop any résumé, AI parses it
     2. Review    — a terse editorial summary of what was read
   ─────────────────────────────────────────────────────────── */

import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  Briefcase,
  Check,
  FileText,
  GraduationCap,
  Loader2,
  Mail,
  Phone,
  Sparkles,
  Target,
  Upload,
  User,
} from "lucide-react";
import { useState } from "react";
import { useDropzone } from "react-dropzone";

import { CraftButton, CraftDialog } from "@/components/craft/AppPrimitives";
import { useToast } from "@/hooks/use-toast";
import { type AIResumeData, parseResumeWithAI } from "@/lib/resumeParser";

interface AIImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApply: (aiData: AIResumeData) => void;
}

type Phase = "upload" | "review";

export const AIImportDialog = ({
  open,
  onOpenChange,
  onApply,
}: AIImportDialogProps) => {
  const { toast } = useToast();

  const [phase, setPhase] = useState<Phase>("upload");
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [parsed, setParsed] = useState<AIResumeData | null>(null);

  const reset = () => {
    setPhase("upload");
    setIsProcessing(false);
    setProgress(0);
    setParsed(null);
  };

  const handleClose = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const handleFile = async (file: File) => {
    setIsProcessing(true);
    setProgress(0);
    try {
      const ai = await parseResumeWithAI(file, (p) => setProgress(p));
      setParsed(ai);
      setPhase("review");
      toast({
        title: "AI reading complete",
        description: `${ai.experience?.length ?? 0} roles · ${
          ai.education?.length ?? 0
        } schools · ${ai.skills?.length ?? 0} skills extracted.`,
      });
    } catch (error) {
      toast({
        title: "AI read failed",
        description:
          error instanceof Error ? error.message : "Could not parse the file",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (files) => files[0] && handleFile(files[0]),
    accept: {
      "application/pdf": [".pdf"],
      "application/msword": [".doc"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        [".docx"],
      "image/*": [".png", ".jpg", ".jpeg", ".webp"],
      "text/plain": [".txt"],
    },
    maxFiles: 1,
    disabled: isProcessing,
  });

  return (
    <CraftDialog
      open={open}
      onOpenChange={handleClose}
      kicker="§ Smart import"
      title={
        phase === "upload" ? (
          <>
            Hand the pages to the <span className="cc-italic-wonk">press-reader</span>.
          </>
        ) : (
          <>
            A <span className="cc-italic-wonk">précis</span> of what was read.
          </>
        )
      }
      description={
        phase === "upload"
          ? "Any résumé format. AI extracts contact, experience, education, skills, and more."
          : "Check the count. You'll review every line in the next step."
      }
      maxWidth="max-w-2xl"
      footer={
        phase === "upload" ? (
          <button
            onClick={() => handleClose(false)}
            className="cc-btn cc-btn-ghost"
          >
            Cancel
          </button>
        ) : (
          <>
            <button
              onClick={() => {
                setPhase("upload");
                setParsed(null);
              }}
              className="cc-btn cc-btn-ghost"
            >
              <ArrowLeft className="w-4 h-4" />
              Re-read another file
            </button>
            <CraftButton
              onClick={() => {
                if (parsed) {
                  onApply(parsed);
                  reset();
                  onOpenChange(false);
                }
              }}
              disabled={!parsed}
            >
              <Check className="w-4 h-4" />
              Apply to the draft
            </CraftButton>
          </>
        )
      }
    >
      <AnimatePresence mode="wait">
        {phase === "upload" && (
          <motion.div
            key="upload"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
          >
            <div
              {...getRootProps()}
              className={`border-2 border-dashed cursor-pointer transition-colors p-10 text-center ${
                isDragActive
                  ? "border-[color:var(--cc-rust)] bg-[color:var(--cc-cream-2)]"
                  : "border-[color:var(--cc-ink)] bg-[color:var(--cc-cream)] hover:bg-[color:var(--cc-cream-2)]"
              }`}
            >
              <input {...getInputProps()} />
              {isProcessing ? (
                <div>
                  <Loader2 className="w-10 h-10 mx-auto animate-spin text-[color:var(--cc-rust)]" />
                  <p className="mt-4 cc-font-display italic text-2xl leading-tight">
                    Reading the pages…
                  </p>
                  {progress > 0 && (
                    <div className="mt-4 max-w-xs mx-auto">
                      <div className="relative h-[2px] bg-[color:var(--cc-hair)]">
                        <div
                          className="absolute inset-y-0 left-0 bg-[color:var(--cc-rust)] transition-all"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <div className="mt-2 cc-label text-[color:var(--cc-ash)] cc-tabular">
                        {progress}%
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <div className="w-12 h-12 mx-auto border-2 border-[color:var(--cc-ink)] inline-flex items-center justify-center">
                    <Upload className="w-5 h-5" />
                  </div>
                  <p className="mt-4 cc-font-display text-2xl md:text-3xl leading-tight tracking-tight">
                    {isDragActive ? (
                      <>
                        Drop it <span className="cc-italic-wonk">here</span>.
                      </>
                    ) : (
                      <>Drag a résumé onto the page.</>
                    )}
                  </p>
                  <p className="mt-2 cc-font-editorial italic text-[color:var(--cc-ink-soft)]">
                    PDF · Word · image · plain text
                  </p>
                  <div className="mt-4 flex flex-wrap gap-1.5 justify-center">
                    {["PDF", "DOCX", "DOC", "TXT", "PNG/JPG"].map((ext) => (
                      <span key={ext} className="cc-pill">
                        {ext}
                      </span>
                    ))}
                  </div>
                </>
              )}
            </div>

            <div className="mt-5 flex items-center gap-2 cc-font-editorial italic text-[color:var(--cc-ink-soft)]">
              <Sparkles className="w-4 h-4 text-[color:var(--cc-rust)]" />
              AI will pull contact, experience, education, skills, projects, certs,
              and more.
            </div>
          </motion.div>
        )}

        {phase === "review" && parsed && <ReviewPanel parsed={parsed} />}
      </AnimatePresence>
    </CraftDialog>
  );
};

/* ────────────── Review panel ────────────── */

const ReviewPanel = ({ parsed }: { parsed: AIResumeData }) => {
  const stats = [
    {
      icon: Briefcase,
      label: "Roles",
      count: parsed.experience?.length ?? 0,
    },
    {
      icon: GraduationCap,
      label: "Schools",
      count: parsed.education?.length ?? 0,
    },
    {
      icon: Target,
      label: "Skills",
      count: parsed.skills?.length ?? 0,
    },
    {
      icon: FileText,
      label: "Extras",
      count:
        (parsed.projects?.length ?? 0) +
        (parsed.certifications?.length ?? 0) +
        (parsed.awards?.length ?? 0) +
        (parsed.publications?.length ?? 0) +
        (parsed.volunteer?.length ?? 0) +
        (parsed.languages?.length ?? 0) +
        (parsed.references?.length ?? 0),
    },
  ];

  return (
    <motion.div
      key="review"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="space-y-6"
    >
      {/* Contact strip */}
      <div className="border border-[color:var(--cc-ink)] bg-[color:var(--cc-cream)] p-5">
        <div className="cc-label text-[color:var(--cc-rust)]">§ Contact</div>
        <div className="mt-3 cc-font-display text-2xl leading-tight tracking-tight">
          {parsed.contact?.name || "—"}
        </div>
        <div className="mt-3 flex flex-wrap gap-4 cc-font-editorial text-[15px] text-[color:var(--cc-ink-soft)]">
          {parsed.contact?.email && (
            <span className="inline-flex items-center gap-2">
              <Mail className="w-3.5 h-3.5" />
              {parsed.contact.email}
            </span>
          )}
          {parsed.contact?.phone && (
            <span className="inline-flex items-center gap-2">
              <Phone className="w-3.5 h-3.5" />
              {parsed.contact.phone}
            </span>
          )}
          {parsed.contact?.location && (
            <span className="inline-flex items-center gap-2">
              <User className="w-3.5 h-3.5" />
              {parsed.contact.location}
            </span>
          )}
        </div>
      </div>

      {/* Summary */}
      {parsed.summary && (
        <div>
          <div className="cc-label text-[color:var(--cc-ash)]">Opening line</div>
          <p className="mt-2 cc-font-editorial text-[17px] leading-snug text-[color:var(--cc-ink)] italic">
            &ldquo;{parsed.summary}&rdquo;
          </p>
        </div>
      )}

      {/* Counts */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-[color:var(--cc-hair-strong)] border border-[color:var(--cc-hair-strong)]">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div
              key={s.label}
              className="bg-[color:var(--cc-cream)] p-4 text-left"
            >
              <Icon className="w-4 h-4 text-[color:var(--cc-rust)]" />
              <div className="mt-3 cc-font-display text-3xl leading-none cc-tabular">
                {String(s.count).padStart(2, "0")}
              </div>
              <div className="mt-2 cc-label text-[color:var(--cc-ink)]">
                {s.label}
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-sm text-[color:var(--cc-ink-soft)]">
        Apply when ready — you can still edit everything in the next step.
      </p>
    </motion.div>
  );
};
