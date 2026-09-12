import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { applyAccent, resolveAccent } from '@/lib/personaTheme';
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
  const [searchParams] = useSearchParams();
  const isRedo = searchParams.get('redo') === '1';
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
      // `?redo=1` lets an already-onboarded user re-run the flow from Settings.
      if (!cancelled && isCompleted && !isRedo) {
        navigate('/dashboard', { replace: true });
        return;
      }
      void markOnboardingStarted(session.user.id);
    })();
    return () => {
      cancelled = true;
    };
  }, [navigate, isRedo]);

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

  const handleConfirm = useCallback(async (edited: OnboardingAnalysis) => {
    if (!userId || !pending) return;
    setSaving(true);
    try {
      await applyOnboarding({ userId, analysis: edited, source: pending.mode });
      // Re-tint the app to their world right away — the dashboard they land
      // on should already feel like theirs.
      applyAccent(
        resolveAccent({
          personaFunction: edited.persona.function,
          subFunction: edited.persona.subFunction,
          vertical: edited.persona.vertical,
          industry: edited.inferredProfile.industry,
        }),
      );
      toast({
        title: 'You\'re all set',
        description: 'Your profile is now personalised across Faircopy.',
      });
      navigate('/dashboard', { replace: true });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Save failed';
      toast({ title: 'Could not save', description: msg, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }, [userId, pending, toast, navigate]);

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
    <div className="cc-root cc-font-sans relative min-h-screen overflow-hidden bg-[color:var(--cc-cream)] text-[color:var(--cc-ink)] antialiased">
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden
        style={{
          background:
            'radial-gradient(circle at 82% 8%, rgba(200,67,30,0.18), transparent 32%), radial-gradient(circle at 14% 22%, rgba(255,253,247,0.62), transparent 30%)',
        }}
      />
      <div className="cc-grain pointer-events-none absolute inset-0" aria-hidden />

      {/* Masthead */}
      <header className="relative border-b border-[color:var(--cc-hair-strong)]">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-5">
          <span className="cc-font-display text-xl tracking-tight text-[color:var(--cc-ink)]">
            Faircopy
          </span>
          <span className="cc-label-sm text-[color:var(--cc-ash)]">
            {stage === 'choose' ? 'Step 1 · Setup' : 'Step 2 · Review'}
          </span>
        </div>
      </header>

      <div className="relative mx-auto max-w-5xl px-4 py-10 md:py-14">
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
