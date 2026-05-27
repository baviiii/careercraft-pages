import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ChoosePathStep } from './ChoosePathStep';
import { AnalyzeStep } from './AnalyzeStep';
import { SkipWarningDialog } from './SkipWarningDialog';
import {
  analyzeOnboarding,
  applyOnboarding,
  markOnboardingStarted,
  OnboardingRateLimitError,
  skipOnboarding,
} from './lib/onboarding-api';
import type { OnboardingAnalysis, OnboardingMode } from './types';

type Stage = 'choose' | 'analyzing' | 'reveal';

interface PendingInput {
  mode: OnboardingMode;
  text: string;
  resumeText: string;
}

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [stage, setStage] = useState<Stage>('choose');
  const [userId, setUserId] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<OnboardingAnalysis | null>(null);
  const [runsRemaining, setRunsRemaining] = useState(4);
  const [pending, setPending] = useState<PendingInput | null>(null);
  const [showSkip, setShowSkip] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);

  // Auth gate + bail if already onboarded
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.auth.getSession();
      const session = data?.session;
      if (!session?.user) {
        if (!cancelled) navigate('/auth', { replace: true });
        return;
      }
      if (cancelled) return;
      setUserId(session.user.id);

      const { data: profile } = await supabase
        .from('profiles')
        .select('onboarding_completed_at,onboarding_source')
        .eq('id', session.user.id)
        .single();
      const isExplicitlySkipped = profile?.onboarding_source === 'skipped';
      const isCompleted = !!profile?.onboarding_completed_at && !isExplicitlySkipped;
      if (!cancelled && isCompleted) {
        navigate('/dashboard', { replace: true });
        return;
      }
      void markOnboardingStarted(session.user.id);
    })();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  const runAnalysis = useCallback(
    async (input: PendingInput) => {
      setBusy(true);
      setStage('analyzing');
      try {
        const { analysis: a, runsRemaining: rr } = await analyzeOnboarding(input);
        setAnalysis(a);
        setRunsRemaining(rr);
        setStage('reveal');
      } catch (e) {
        if (e instanceof OnboardingRateLimitError) {
          toast({
            title: 'Daily limit reached',
            description: e.message,
            variant: 'destructive',
          });
          setStage('choose');
        } else {
          const msg = e instanceof Error ? e.message : 'AI analysis failed';
          toast({ title: 'Analysis failed', description: msg, variant: 'destructive' });
          setStage('choose');
        }
      } finally {
        setBusy(false);
      }
    },
    [toast],
  );

  const handleAnalyze = useCallback(
    (mode: OnboardingMode, text: string, resumeText: string) => {
      const input = { mode, text, resumeText };
      setPending(input);
      void runAnalysis(input);
    },
    [runAnalysis],
  );

  const handleReanalyze = useCallback(() => {
    if (pending) void runAnalysis(pending);
  }, [pending, runAnalysis]);

  const handleConfirm = useCallback(async () => {
    if (!userId || !analysis || !pending) return;
    setSaving(true);
    try {
      await applyOnboarding({ userId, analysis, source: pending.mode });
      toast({
        title: 'You\'re all set',
        description: 'Your profile is now personalised across CareerCraft.',
      });
      navigate('/dashboard', { replace: true });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Save failed';
      toast({ title: 'Could not save', description: msg, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }, [userId, analysis, pending, toast, navigate]);

  const handleSkipConfirm = useCallback(async () => {
    if (!userId) return;
    setSaving(true);
    try {
      await skipOnboarding(userId);
      navigate('/dashboard', { replace: true });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Could not skip';
      toast({ title: 'Skip failed', description: msg, variant: 'destructive' });
    } finally {
      setSaving(false);
      setShowSkip(false);
    }
  }, [userId, navigate, toast]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/30 px-4 py-10 md:py-16">
      <div className="mx-auto max-w-3xl">
        {stage === 'choose' && (
          <ChoosePathStep
            onAnalyze={handleAnalyze}
            onSkip={() => setShowSkip(true)}
            busy={busy}
          />
        )}
        {(stage === 'analyzing' || stage === 'reveal') && (
          <AnalyzeStep
            analysis={analysis}
            loading={stage === 'analyzing'}
            runsRemaining={runsRemaining}
            onConfirm={handleConfirm}
            onReanalyze={handleReanalyze}
            onBack={() => setStage('choose')}
            saving={saving}
          />
        )}

        <SkipWarningDialog
          open={showSkip}
          onCancel={() => setShowSkip(false)}
          onConfirm={handleSkipConfirm}
          saving={saving}
        />
      </div>
    </div>
  );
}
