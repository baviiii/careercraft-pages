import { useCallback, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Check, FileText, Loader2, MessageSquare, Upload, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  extractResumeFromFile,
  formatResumeDataAsText,
} from '@/lib/resumeParser';
import type { OnboardingMode } from './types';
import { SectionIcon } from './ui';

interface Props {
  onAnalyze: (mode: OnboardingMode, text: string, resumeText: string) => void;
  onSkip: () => void;
  busy?: boolean;
}

const ACCEPT =
  '.pdf,.doc,.docx,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain';

export function ChoosePathStep({ onAnalyze, onSkip, busy = false }: Props) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState('');
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [resumeText, setResumeText] = useState('');
  const [extracting, setExtracting] = useState(false);
  const [dragging, setDragging] = useState(false);

  const handleFile = useCallback(
    async (file: File) => {
      if (file.size > 20 * 1024 * 1024) {
        toast({ title: 'File too large', description: 'Max 20MB.', variant: 'destructive' });
        return;
      }
      setResumeFile(file);
      setExtracting(true);
      try {
        const aiData = await extractResumeFromFile(file, () => {});
        const extracted = formatResumeDataAsText(aiData);
        setResumeText(extracted);
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Could not read this file';
        toast({ title: 'Extraction failed', description: msg, variant: 'destructive' });
        setResumeFile(null);
        setResumeText('');
      } finally {
        setExtracting(false);
      }
    },
    [toast],
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file) void handleFile(file);
    },
    [handleFile],
  );

  const clearResume = () => {
    setResumeFile(null);
    setResumeText('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const hasText = text.trim().length >= 20;
  const hasResume = !!resumeText && !extracting;
  const canAnalyze = hasText || hasResume;
  const mode: OnboardingMode = hasText && hasResume ? 'hybrid' : hasResume ? 'resume' : 'describe';

  const submit = () => {
    if (!canAnalyze || busy) return;
    onAnalyze(mode, text.trim(), resumeText);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
        <aside className="lg:sticky lg:top-24">
          <div className="cc-label text-[color:var(--cc-rust)]">§ 01 · Your résumé</div>
          <h1 className="mt-4 cc-font-display text-5xl md:text-7xl leading-[0.9] tracking-[-0.04em] text-[color:var(--cc-ink)]">
            Start with
            <span className="block text-[color:var(--cc-rust)]">your résumé.</span>
          </h1>
          <p className="mt-6 cc-font-editorial text-lg md:text-xl leading-snug text-[color:var(--cc-ink-soft)]">
            We read it and fill in your profile. You check everything before it's saved.
          </p>
          <div className="mt-8 hidden border-l-2 border-[color:var(--cc-rust)] pl-5 lg:block">
            <p className="cc-font-editorial text-base leading-snug text-[color:var(--cc-ink-soft)]">
              Your profile sets your job matches, résumé rewrites and interview practice.
            </p>
          </div>
        </aside>

        <div>
          <section className="cc-card p-5 md:p-6">
            <div className="mb-4 flex items-center gap-2.5">
              <SectionIcon icon={FileText} />
              <h2 className="cc-font-display text-lg tracking-tight text-[color:var(--cc-ink)]">Upload your résumé</h2>
              <span className="ml-auto hidden sm:block"><span className="cc-tag">Recommended</span></span>
            </div>

            {!resumeFile ? (
              <div
                onDrop={onDrop}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onClick={() => fileInputRef.current?.click()}
                className={
                  'group flex cursor-pointer flex-col items-center justify-center gap-3 border border-dashed px-6 py-14 text-center transition-colors ' +
                  (dragging
                    ? 'border-[color:var(--cc-rust)] bg-[color:var(--cc-rust-soft)]'
                    : 'border-[color:var(--cc-hair-strong)] bg-[color:var(--cc-cream-2)] hover:border-[color:var(--cc-ink)]')
                }
              >
                <Upload className="h-7 w-7 text-[color:var(--cc-ash)] transition-colors group-hover:text-[color:var(--cc-rust)]" />
                <div>
                  <p className="cc-font-editorial text-xl text-[color:var(--cc-ink)]">
                    Drop your résumé here, or click to browse
                  </p>
                  <p className="mt-1 cc-label-sm text-[color:var(--cc-ash)]">PDF · DOCX · TXT · max 20MB</p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ACCEPT}
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void handleFile(file);
                  }}
                />
              </div>
            ) : (
              <div className="flex items-center justify-between border border-[color:var(--cc-ink)] bg-[color:var(--cc-cream-2)] px-4 py-4">
                <div className="flex min-w-0 items-center gap-3">
                  <FileText className="h-5 w-5 shrink-0 text-[color:var(--cc-rust)]" />
                  <div className="min-w-0">
                    <p className="truncate cc-font-editorial text-lg text-[color:var(--cc-ink)]">
                      {resumeFile.name}
                    </p>
                    {extracting ? (
                      <p className="mt-0.5 flex items-center gap-1.5 text-[13px] text-[color:var(--cc-ink-soft)]">
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-[color:var(--cc-rust)]" />
                        Reading your résumé…
                      </p>
                    ) : (
                      <p className="mt-0.5 flex items-center gap-1.5 text-[13px] text-[color:var(--cc-signal)]">
                        <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                        Read and ready
                      </p>
                    )}
                  </div>
                </div>
                <button
                  onClick={clearResume}
                  disabled={extracting}
                  aria-label="Remove résumé"
                  className="text-[color:var(--cc-ash)] transition-colors hover:text-[color:var(--cc-rust)] disabled:opacity-40"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
          </section>

          <div className="cc-dot-rule my-6">and / or</div>

          <section className="cc-card p-5 md:p-6">
            <div className="mb-3 flex items-center gap-2.5">
              <SectionIcon icon={MessageSquare} />
              <h2 className="cc-font-display text-lg tracking-tight text-[color:var(--cc-ink)]">What are you aiming for?</h2>
              <span className="ml-auto text-[13px] text-[color:var(--cc-ash)]">Optional</span>
            </div>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="e.g. I'm a software engineer in Adelaide, strongest in React, NestJS and AI systems. I want a product-focused role, hybrid if possible, with room to grow into tech lead."
              rows={6}
              disabled={busy}
              className="cc-field cc-field-textarea"
            />
            {text.trim().length > 0 && text.trim().length < 20 && (
              <p className="mt-2 text-[13px] text-[color:var(--cc-ash)]">
                {20 - text.trim().length} more characters, or upload a résumé
              </p>
            )}
          </section>

          <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button onClick={onSkip} disabled={busy} className="cc-btn cc-btn-ghost">
              Skip for now
            </button>
            <button onClick={submit} disabled={!canAnalyze || busy || extracting} className="cc-btn cc-btn-primary">
              {busy ? 'Building…' : extracting ? 'Reading résumé…' : 'Build my profile'}
              <ArrowRight className="cc-arrow-right h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
