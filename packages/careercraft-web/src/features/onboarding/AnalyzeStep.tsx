import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Brain,
  Briefcase,
  CheckCircle2,
  FileCheck,
  Loader2,
  MapPin,
  RefreshCw,
  Sparkles,
  Target,
} from 'lucide-react';
import type { OnboardingAnalysis } from './types';

interface Props {
  analysis: OnboardingAnalysis | null;
  loading: boolean;
  runsRemaining: number;
  onConfirm: () => void;
  onReanalyze: () => void;
  onBack: () => void;
  saving?: boolean;
}

const LOADING_MESSAGES = [
  'Reading your background…',
  'Categorising your role and seniority…',
  'Inferring your career targets…',
  'Mapping your skills…',
  'Building your CV standards…',
];

export function AnalyzeStep({
  analysis,
  loading,
  runsRemaining,
  onConfirm,
  onReanalyze,
  onBack,
  saving = false,
}: Props) {
  const [msgIdx, setMsgIdx] = useState(0);

  useEffect(() => {
    if (!loading) return;
    const id = setInterval(() => setMsgIdx((i) => (i + 1) % LOADING_MESSAGES.length), 1800);
    return () => clearInterval(id);
  }, [loading]);

  if (loading || !analysis) {
    return <LoadingPanel message={LOADING_MESSAGES[msgIdx]} />;
  }

  return (
    <RevealPanel
      analysis={analysis}
      runsRemaining={runsRemaining}
      onConfirm={onConfirm}
      onReanalyze={onReanalyze}
      onBack={onBack}
      saving={saving}
    />
  );
}

function LoadingPanel({ message }: { message: string }) {
  return (
    <Card className="border-border/60 bg-card/80 backdrop-blur-sm">
      <CardContent className="flex flex-col items-center gap-6 py-16 text-center">
        <div className="relative">
          <div className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
          <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Brain className="h-8 w-8 text-primary" />
          </div>
        </div>
        <div className="space-y-1">
          <p className="text-lg font-medium">Claude is analysing your background</p>
          <div className="flex h-6 items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            <AnimatePresence mode="wait">
              <motion.span
                key={message}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.25 }}
              >
                {message}
              </motion.span>
            </AnimatePresence>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface RevealProps {
  analysis: OnboardingAnalysis;
  runsRemaining: number;
  onConfirm: () => void;
  onReanalyze: () => void;
  onBack: () => void;
  saving: boolean;
}

function RevealPanel({ analysis, runsRemaining, onConfirm, onReanalyze, onBack, saving }: RevealProps) {
  const stagger = (i: number) => ({
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.35, delay: i * 0.08 },
  });

  const { persona, inferredProfile, targets, skills, cvStandards, confidence } = analysis;
  const confidencePct = Math.round((confidence?.overall ?? 0) * 100);

  return (
    <div className="space-y-4">
      {/* Persona — the headline card */}
      <motion.div {...stagger(0)}>
        <Card className="border-primary/30 bg-gradient-to-br from-primary/5 via-card to-card">
          <CardHeader className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="font-normal">
                <Sparkles className="mr-1 h-3 w-3" /> Step 2 of 2
              </Badge>
              <Badge variant="secondary">
                {confidencePct}% confidence
              </Badge>
              {runsRemaining > 0 && (
                <Badge variant="outline" className="ml-auto text-xs font-normal text-muted-foreground">
                  {runsRemaining} re-analysis {runsRemaining === 1 ? 'left' : 'left'} today
                </Badge>
              )}
            </div>
            <div>
              <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
                Here's how we're categorising you
              </p>
              <h2 className="mt-1 text-2xl font-semibold tracking-tight md:text-3xl">
                {persona.archetype}
              </h2>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-base text-foreground/90">{persona.narrative}</p>
            <div className="flex flex-wrap gap-2">
              <PersonaPill label="Seniority" value={persona.seniority} />
              <PersonaPill label="Function" value={persona.function} />
              {persona.subFunction && <PersonaPill label="Focus" value={persona.subFunction} />}
              {persona.vertical && <PersonaPill label="Vertical" value={persona.vertical} />}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Profile inference */}
      <motion.div {...stagger(1)}>
        <SectionCard icon={Briefcase} title="What we picked up">
          <DefList
            rows={[
              ['Current role', inferredProfile.current_job_title],
              ['Current company', inferredProfile.current_company],
              ['Experience', inferredProfile.years_of_experience],
              ['Industry', inferredProfile.industry],
              [
                'Location',
                [inferredProfile.location_city, inferredProfile.location_country]
                  .filter(Boolean)
                  .join(', ') || null,
              ],
            ]}
          />
        </SectionCard>
      </motion.div>

      {/* Targets */}
      <motion.div {...stagger(2)}>
        <SectionCard icon={Target} title="What you're targeting">
          <div className="space-y-3">
            <ChipRow label="Target roles" items={targets.target_job_titles} />
            <ChipRow label="Target companies" items={targets.target_companies} />
            <ChipRow label="Work arrangement" items={targets.work_arrangement} />
            <ChipRow
              label="Preferred locations"
              items={targets.preferred_locations}
              icon={MapPin}
            />
            {(targets.desired_salary_min || targets.desired_salary_max) && (
              <p className="text-sm text-muted-foreground">
                Salary target:{' '}
                <span className="font-medium text-foreground">
                  {fmtSalary(targets.desired_salary_min, targets.desired_salary_max, targets.desired_salary_currency)}
                </span>
              </p>
            )}
          </div>
        </SectionCard>
      </motion.div>

      {/* Skills */}
      <motion.div {...stagger(3)}>
        <SectionCard icon={Sparkles} title={`Skills (${skills.length})`}>
          <div className="flex flex-wrap gap-1.5">
            {skills.slice(0, 24).map((s) => (
              <Badge key={s.name} variant="outline" className="font-normal">
                {s.name}
                <span className="ml-1.5 text-[10px] text-muted-foreground">{s.category}</span>
              </Badge>
            ))}
            {skills.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No skills inferred — try the resume path or describe in more detail.
              </p>
            )}
          </div>
        </SectionCard>
      </motion.div>

      {/* CV Standards */}
      <motion.div {...stagger(4)}>
        <SectionCard
          icon={FileCheck}
          title="Your CV standards"
          accent
          subtitle="Use these rules when we generate or rewrite your resume."
        >
          <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
            <KV label="Recommended length" value={cvStandards.recommended_length} />
            <KV label="Format" value={cvStandards.format} />
          </div>
          {cvStandards.ats_notes?.length > 0 && (
            <div className="mt-3">
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                ATS notes
              </p>
              <ul className="space-y-1 text-sm">
                {cvStandards.ats_notes.slice(0, 5).map((n, i) => (
                  <li key={i} className="flex gap-2">
                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                    <span>{n}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {cvStandards.improvements?.length > 0 && (
            <div className="mt-3">
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Top improvements
              </p>
              <ul className="space-y-1 text-sm">
                {cvStandards.improvements.slice(0, 5).map((n, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="mt-0.5 text-primary">→</span>
                    <span>{n}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </SectionCard>
      </motion.div>

      {/* Action bar */}
      <motion.div {...stagger(5)}>
        <Card className="border-border/60">
          <CardContent className="flex flex-col-reverse gap-2 py-4 sm:flex-row sm:justify-between">
            <Button variant="ghost" onClick={onBack} disabled={saving}>
              Back
            </Button>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={onReanalyze}
                disabled={saving || runsRemaining <= 0}
                title={runsRemaining <= 0 ? 'Daily limit reached' : 'Re-run AI analysis'}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Re-analyze
              </Button>
              <Button onClick={onConfirm} disabled={saving} size="lg">
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving…
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" /> Looks good — save
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

function PersonaPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border/80 bg-background/60 px-2.5 py-1 text-xs">
      <span className="text-muted-foreground">{label}:</span>{' '}
      <span className="font-medium capitalize">{value}</span>
    </div>
  );
}

function SectionCard({
  icon: Icon,
  title,
  subtitle,
  accent = false,
  children,
}: {
  icon: typeof Briefcase;
  title: string;
  subtitle?: string;
  accent?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Card className={accent ? 'border-primary/30 bg-primary/[0.03]' : 'border-border/60'}>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">{title}</h3>
        </div>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function DefList({ rows }: { rows: [string, string | null][] }) {
  const visible = rows.filter(([, v]) => !!v && String(v).trim().length > 0);
  if (visible.length === 0)
    return <p className="text-sm text-muted-foreground">Nothing inferred yet — try the resume path.</p>;
  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
      {visible.map(([k, v]) => (
        <div key={k} className="flex justify-between gap-4 border-b border-border/40 pb-1.5 last:border-0">
          <dt className="text-muted-foreground">{k}</dt>
          <dd className="text-right font-medium">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

function ChipRow({
  label,
  items,
  icon: Icon,
}: {
  label: string;
  items: string[];
  icon?: typeof MapPin;
}) {
  if (!items?.length) return null;
  return (
    <div>
      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {items.map((it) => (
          <Badge key={it} variant="secondary" className="font-normal">
            {Icon && <Icon className="mr-1 h-3 w-3" />}
            {it}
          </Badge>
        ))}
      </div>
    </div>
  );
}

function KV({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-sm font-medium capitalize">{value}</p>
    </div>
  );
}

function fmtSalary(min: number | null, max: number | null, currency: string | null): string {
  const ccy = currency || 'AUD';
  const fmt = (n: number) => new Intl.NumberFormat('en-AU').format(n);
  if (min && max) return `${ccy} ${fmt(min)}–${fmt(max)}`;
  if (min) return `${ccy} ${fmt(min)}+`;
  if (max) return `Up to ${ccy} ${fmt(max)}`;
  return '—';
}
