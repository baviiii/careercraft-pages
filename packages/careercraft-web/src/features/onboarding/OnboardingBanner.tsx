import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

type State = 'loading' | 'show' | 'hide';

export function OnboardingBanner() {
  const [state, setState] = useState<State>('loading');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        if (!cancelled) setState('hide');
        return;
      }
      const { data: profile } = await supabase
        .from('profiles')
        .select('onboarding_completed_at,onboarding_source')
        .eq('id', session.user.id)
        .maybeSingle();
      if (cancelled) return;
      const isExplicitlySkipped = profile?.onboarding_source === 'skipped';
      const isCompleted = !!profile?.onboarding_completed_at && !isExplicitlySkipped;
      setState(isCompleted ? 'hide' : 'show');
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const visible = useMemo(() => state === 'show', [state]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -8, height: 0 }}
          animate={{ opacity: 1, y: 0, height: 'auto' }}
          exit={{ opacity: 0, y: -8, height: 0 }}
          transition={{ duration: 0.25 }}
        >
          <div className="relative mb-6 overflow-hidden rounded-xl border border-primary/30 bg-gradient-to-r from-primary/10 via-primary/[0.04] to-transparent px-4 py-3 sm:px-5 sm:py-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">Personalise your CareerCraft experience</p>
                <p className="text-xs text-muted-foreground sm:text-sm">
                  Tell us about yourself or upload your resume so /tracker, interview prep, and
                  news feeds tailor to your goals. Takes ~30 seconds.
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Button asChild size="sm">
                  <Link to="/onboarding">
                    Get started
                    <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
