/* Upload and review first. Two phases:
     1. Upload: drop any résumé and it gets read.
     2. Review: a short summary of what was found, before anything is filled in. */

import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  Briefcase,
  Check,
  FileText,
  GraduationCap,
  Mail,
  MapPin,
  Phone,
  Target,
  Upload,
} from "lucide-react";
import { useState } from "react";
import { useDropzone } from "react-dropzone";

import { CraftButton, CraftDialog } from "@/components/craft/AppPrimitives";
import { CraftSpinner } from "@/components/craft/CraftSpinner";
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
        title: "Read your résumé",
        description: `${ai.experience?.length ?? 0} jobs · ${
          ai.education?.length ?? 0
        } qualifications · ${ai.skills?.length ?? 0} skills found.`,
      });
    } catch (error) {
      toast({
        title: "Couldn't read that file",
        description:
          error instanceof Error ? error.message : "Try another file, or paste the text instead.",
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
      title={phase === "upload" ? "Upload and review first" : "Here's what we found"}
      description={
        phase === "upload"
          ? "We'll show you what we read from your file before anything goes into the builder."
          : "Check the numbers look right. You can change every line in the next step."
      }
      maxWidth="max-w-2xl"
      footer={
        phase === "upload" ? (
          <CraftButton variant="ghost" onClick={() => handleClose(false)}>
            Cancel
          </CraftButton>
        ) : (
          <>
            <CraftButton
              variant="ghost"
              onClick={() => {
                setPhase("upload");
                setParsed(null);
              }}
            >
              <ArrowLeft className="h-4 w-4" />
              Try another file
            </CraftButton>
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
              <Check className="h-4 w-4" />
              Fill in the builder
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
              className={`cursor-pointer rounded-2xl border-2 border-dashed p-10 text-center transition-colors ${
                isDragActive
                  ? "border-[color:var(--cc-rust)] bg-[color:var(--cc-rust-soft)]"
                  : "border-[color:var(--cc-hair-strong)] bg-white hover:border-[color:var(--cc-rust)]"
              }`}
            >
              <input {...getInputProps()} />
              {isProcessing ? (
                <div>
                  <div className="flex justify-center">
                    <CraftSpinner size="lg" label="Reading your file" />
                  </div>
                  <p className="mt-4 cc-font-display text-2xl leading-tight">Reading your file…</p>
                  {progress > 0 && (
                    <div className="mx-auto mt-5 max-w-xs">
                      <div className="relative h-1.5 overflow-hidden rounded-full bg-[color:var(--cc-cream-2)]">
                        <div
                          className="absolute inset-y-0 left-0 rounded-full bg-[color:var(--cc-rust)] transition-all"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <div className="mt-2 cc-tabular text-[13px] text-[color:var(--cc-ash)]">{progress}%</div>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-[color:var(--cc-rust-soft)] text-[color:var(--cc-rust)]">
                    <Upload className="h-5 w-5" />
                  </div>
                  <p className="mt-4 cc-font-display text-2xl leading-tight tracking-tight">
                    {isDragActive ? "Let go to upload" : "Drop your résumé here"}
                  </p>
                  <p className="mt-2 text-sm text-[color:var(--cc-ink-soft)]">
                    or <span className="text-[color:var(--cc-rust)] underline underline-offset-4">choose a file</span>
                  </p>
                  <p className="mt-4 text-[13px] text-[color:var(--cc-ash)]">PDF, Word, a photo or a text file</p>
                </>
              )}
            </div>

            <p className="mt-4 text-[13.5px] text-[color:var(--cc-ink-soft)]">
              We look for your contact details, jobs, education and skills, plus projects, certificates and anything else
              on the page.
            </p>
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
      label: "Jobs",
      count: parsed.experience?.length ?? 0,
    },
    {
      icon: GraduationCap,
      label: "Qualifications",
      count: parsed.education?.length ?? 0,
    },
    {
      icon: Target,
      label: "Skills",
      count: parsed.skills?.length ?? 0,
    },
    {
      icon: FileText,
      label: "Other sections",
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
      className="space-y-5"
    >
      {/* Contact */}
      <div className="rounded-xl border border-[color:var(--cc-hair)] bg-white p-4">
        <div className="text-[13px] font-medium text-[color:var(--cc-ash)]">Contact</div>
        <div className="mt-1 cc-font-display text-xl font-semibold leading-tight tracking-tight">
          {parsed.contact?.name || "No name found"}
        </div>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5 text-[14px] text-[color:var(--cc-ink-soft)]">
          {parsed.contact?.email && (
            <span className="inline-flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5" />
              {parsed.contact.email}
            </span>
          )}
          {parsed.contact?.phone && (
            <span className="inline-flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5" />
              {parsed.contact.phone}
            </span>
          )}
          {parsed.contact?.location && (
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" />
              {parsed.contact.location}
            </span>
          )}
        </div>
      </div>

      {/* Summary */}
      {parsed.summary && (
        <div>
          <div className="text-[13px] font-medium text-[color:var(--cc-ash)]">Summary</div>
          <p className="mt-1 text-[14.5px] leading-snug text-[color:var(--cc-ink)]">{parsed.summary}</p>
        </div>
      )}

      {/* Counts */}
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="rounded-xl bg-[color:var(--cc-cream-2)] p-3.5">
              <Icon className="h-4 w-4 text-[color:var(--cc-rust)]" />
              <div className="mt-2 cc-font-display text-2xl font-semibold leading-none cc-tabular">{s.count}</div>
              <div className="mt-1 text-[13px] text-[color:var(--cc-ink-soft)]">{s.label}</div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
};
