import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Brain,
  Briefcase,
  CheckCircle2,
  FileCheck,
  Loader2,
  RefreshCw,
  Sparkles,
  Target,
  X,
} from 'lucide-react';
import type { OnboardingAnalysis } from './types';

interface Props {
  analysis: OnboardingAnalysis | null;
  loading: boolean;
  runsRemaining: number;
  onConfirm: (analysis: OnboardingAnalysis) => void;
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

const REMOTE_OPTIONS = [
  { value: 'remote', label: 'Remote' },
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'onsite', label: 'On-site' },
  { value: 'any', label: 'Any' },
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
  onConfirm: (analysis: OnboardingAnalysis) => void;
  onReanalyze: () => void;
  onBack: () => void;
  saving: boolean;
}

function RevealPanel({ analysis, runsRemaining, onConfirm, onReanalyze, onBack, saving }: RevealProps) {
  // A local, editable copy so the visitor can correct anything before we save.
  const [edited, setEdited] = useState<OnboardingAnalysis>(analysis);
  useEffect(() => setEdited(analysis), [analysis]);

  const setTargets = (patch: Partial<OnboardingAnalysis['targets']>) =>
    setEdited((p) => ({ ...p, targets: { ...p.targets, ...patch } }));
  const setPrefs = (patch: Partial<OnboardingAnalysis['jobPreferences']>) =>
    setEdited((p) => ({ ...p, jobPreferences: { ...p.jobPreferences, ...patch } }));

  const stagger = (i: number) => ({
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.35, delay: i * 0.08 },
  });

  const { persona, inferredProfile, skills, cvStandards, confidence } = analysis;
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
              <Badge variant="secondary">{confidencePct}% confidence</Badge>
              {runsRemaining > 0 && (
                <Badge variant="outline" className="ml-auto text-xs font-normal text-muted-foreground">
                  {runsRemaining} re-analysis left today
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

      {/* Targets — editable */}
      <motion.div {...stagger(2)}>
        <SectionCard
          icon={Target}
          title="What you're targeting"
          subtitle="Adjust anything — this is what drives your job, market & news matches."
        >
          <div className="space-y-4">
            <EditField label="Target roles">
              <EditableChips
                items={edited.targets.target_job_titles}
                onChange={(v) => setTargets({ target_job_titles: v })}
                placeholder="Add a role…"
              />
            </EditField>
            <EditField label="Target companies">
              <EditableChips
                items={edited.targets.target_companies}
                onChange={(v) => setTargets({ target_companies: v })}
                placeholder="Add a company…"
              />
            </EditField>
            <EditField label="Preferred locations">
              <EditableChips
                items={edited.targets.preferred_locations}
                onChange={(v) => setTargets({ preferred_locations: v })}
                placeholder="Add a location…"
              />
            </EditField>
            <EditField label="Work arrangement">
              <EditableChips
                items={edited.targets.work_arrangement}
                onChange={(v) => setTargets({ work_arrangement: v })}
                placeholder="e.g. remote, hybrid…"
              />
            </EditField>
            <div className="grid grid-cols-2 gap-3">
              <EditField label="Min salary">
                <Input
                  type="number"
                  inputMode="numeric"
                  value={edited.targets.desired_salary_min ?? ''}
                  onChange={(e) =>
                    setTargets({ desired_salary_min: e.target.value ? Number(e.target.value) : null })
                  }
                  placeholder="e.g. 90000"
                  className="h-9"
                />
              </EditField>
              <EditField label="Max salary">
                <Input
                  type="number"
                  inputMode="numeric"
                  value={edited.targets.desired_salary_max ?? ''}
                  onChange={(e) =>
                    setTargets({ desired_salary_max: e.target.value ? Number(e.target.value) : null })
                  }
                  placeholder="e.g. 130000"
                  className="h-9"
                />
              </EditField>
            </div>
          </div>
        </SectionCard>
      </motion.div>

      {/* Job preferences — editable */}
      <motion.div {...stagger(3)}>
        <SectionCard icon={Briefcase} title="Job preferences">
          <div className="space-y-4">
            <EditField label="Industries">
              <EditableChips
                items={edited.jobPreferences.industries}
                onChange={(v) => setPrefs({ industries: v })}
                placeholder="Add an industry…"
              />
            </EditField>
            <EditField label="Remote preference">
              <div className="flex flex-wrap gap-1.5">
                {REMOTE_OPTIONS.map((opt) => {
                  const active = edited.jobPreferences.remote_preference === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setPrefs({ remote_preference: opt.value })}
                      className={
                        'rounded-md border px-3 py-1 text-sm transition-colors ' +
                        (active
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border/70 text-muted-foreground hover:border-foreground/40')
                      }
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </EditField>
          </div>
        </SectionCard>
      </motion.div>

      {/* Skills */}
      <motion.div {...stagger(4)}>
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
      <motion.div {...stagger(5)}>
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
      <motion.div {...stagger(6)}>
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
              <Button onClick={() => onConfirm(edited)} disabled={saving} size="lg">
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving…
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" /> Save &amp; personalise
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

function EditField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      {children}
    </div>
  );
}

function EditableChips({
  items,
  onChange,
  placeholder,
}: {
  items: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
}) {
  const [val, setVal] = useState('');
  const add = () => {
    const v = val.trim();
    if (v && !items.some((x) => x.toLowerCase() === v.toLowerCase())) onChange([...items, v]);
    setVal('');
  };
  return (
    <div>
      {items.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {items.map((it) => (
            <Badge key={it} variant="secondary" className="gap-1 font-normal">
              {it}
              <button
                type="button"
                onClick={() => onChange(items.filter((x) => x !== it))}
                aria-label={`Remove ${it}`}
                className="ml-0.5 opacity-60 transition-opacity hover:opacity-100"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <Input
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add();
            }
          }}
          placeholder={placeholder}
          className="h-9"
        />
        <Button type="button" variant="outline" size="sm" onClick={add} className="shrink-0">
          Add
        </Button>
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
