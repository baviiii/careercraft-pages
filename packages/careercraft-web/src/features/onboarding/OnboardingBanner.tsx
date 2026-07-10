import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUpRight, Sparkles } from 'lucide-react';
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
          transition={{ duration: 0.28 }}
        >
          <div className="cc-surface cc-tone-cobalt relative mb-7 overflow-hidden px-5 py-4 sm:px-6">
            <div
              aria-hidden
              className="absolute inset-0"
              style={{
                background:
                  'linear-gradient(105deg, rgba(42,82,204,0.08) 0%, transparent 45%, rgba(63,122,92,0.06) 100%)',
              }}
            />
            <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="flex min-w-0 flex-1 items-start gap-3">
                <span className="cc-icon-chip mt-0.5 h-10 w-10 shrink-0">
                  <Sparkles className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <div className="cc-kicker">Finish setup</div>
                  <p className="mt-1 text-[15px] leading-snug text-[color:var(--cc-ink-soft)]">
                    Two minutes — then jobs, news and interview prep tune to you.
                  </p>
                </div>
              </div>
              <Link
                to="/onboarding"
                className="cc-action cc-action--sm shrink-0 self-start sm:self-auto"
              >
                Personalise <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
