import { useCallback, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { FileText, MessageSquare, Sparkles, Upload, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  extractResumeFromFile,
  formatResumeDataAsText,
} from '@/lib/resumeParser';
import type { OnboardingMode } from './types';

interface Props {
  onAnalyze: (mode: OnboardingMode, text: string, resumeText: string) => void;
  onSkip: () => void;
  busy?: boolean;
}

const ACCEPT = '.pdf,.doc,.docx,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain';

export function ChoosePathStep({ onAnalyze, onSkip, busy = false }: Props) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState('');
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [resumeText, setResumeText] = useState('');
  const [extracting, setExtracting] = useState(false);

  const handleFile = useCallback(
    async (file: File) => {
      if (file.size > 20 * 1024 * 1024) {
        toast({ title: 'File too large', description: 'Max 20MB.', variant: 'destructive' });
        return;
      }
      setResumeFile(file);
      setExtracting(true);
      try {
        const aiData = await extractResumeFromFile(file, (p) => {
          if (p >= 100) return;
        });
        const extracted = formatResumeDataAsText(aiData);
        setResumeText(extracted);
        toast({
          title: 'Resume ready',
          description: `AI extracted ${extracted.length.toLocaleString()} characters.`,
        });
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
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="border-border/60 bg-card/80 backdrop-blur-sm">
        <CardHeader className="space-y-2">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <Badge variant="outline" className="font-normal">
              Step 1 of 2
            </Badge>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
            Let's get to know you
          </h1>
          <p className="text-sm text-muted-foreground md:text-base">
            We'll use this to personalize your job tracker, interview prep, and news feed.
            Upload a resume, describe yourself, or do both — whatever's easiest.
          </p>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Resume upload */}
          <section className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <FileText className="h-4 w-4 text-primary" />
              Upload your resume
              <Badge variant="secondary" className="ml-auto text-xs">
                Best signal
              </Badge>
            </div>

            {!resumeFile ? (
              <div
                onDrop={onDrop}
                onDragOver={(e) => e.preventDefault()}
                onClick={() => fileInputRef.current?.click()}
                className="group flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-muted/30 px-6 py-10 text-center transition-colors hover:border-primary/60 hover:bg-muted/50"
              >
                <Upload className="h-6 w-6 text-muted-foreground transition-colors group-hover:text-primary" />
                <div>
                  <p className="text-sm font-medium">Drop your resume here or click to browse</p>
                  <p className="text-xs text-muted-foreground">PDF, DOCX, DOC, or TXT — max 20MB</p>
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
              <div className="flex items-center justify-between rounded-lg border border-border bg-muted/40 px-4 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <FileText className="h-5 w-5 shrink-0 text-primary" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{resumeFile.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {extracting
                        ? 'Reading file…'
                        : `${resumeText.length.toLocaleString()} characters extracted`}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearResume}
                  disabled={extracting}
                  aria-label="Remove resume"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
          </section>

          {/* Describe yourself */}
          <section className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <MessageSquare className="h-4 w-4 text-primary" />
              Or tell us about yourself
            </div>
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="e.g. I'm a senior backend engineer with 6 years building distributed systems at fintech startups in Sydney. Looking for staff roles or eng manager positions, ideally hybrid, around AU$200-240k."
              rows={5}
              className="resize-none text-sm"
              disabled={busy}
            />
            <p className="text-xs text-muted-foreground">
              {text.trim().length < 20 && text.length > 0
                ? `${20 - text.trim().length} more characters to enable`
                : `${text.length} characters`}
            </p>
          </section>
        </CardContent>

        <CardFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
          <Button variant="ghost" onClick={onSkip} disabled={busy} className="text-muted-foreground">
            Skip for now
          </Button>
          <Button onClick={submit} disabled={!canAnalyze || busy || extracting} size="lg">
            <Sparkles className="mr-2 h-4 w-4" />
            {busy ? 'Analyzing…' : 'Analyze with AI'}
          </Button>
        </CardFooter>
      </Card>
    </motion.div>
  );
}
