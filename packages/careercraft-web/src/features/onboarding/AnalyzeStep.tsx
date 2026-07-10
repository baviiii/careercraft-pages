import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Briefcase,
  CheckCircle2,
  FileCheck,
  Loader2,
  RefreshCw,
  Sparkles,
  Target,
  X,
} from 'lucide-react';
import {
  CAREER_LEVELS,
  EMPLOYMENT_STATUS,
  INDUSTRIES,
  YEARS_OF_EXPERIENCE,
} from '@/hooks/useUserProfile';
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
  'Setting your CV standards…',
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
    <div className="cc-card p-10 md:p-14">
      <div className="flex flex-col items-center gap-6 text-center">
        <div className="relative flex h-16 w-16 items-center justify-center">
          <span className="absolute inset-0 animate-ping rounded-full bg-[color:var(--cc-rust-soft)]" />
          <span className="relative flex h-16 w-16 items-center justify-center rounded-full border border-[color:var(--cc-ink)] bg-[color:var(--cc-cream-2)]">
            <Sparkles className="h-7 w-7 text-[color:var(--cc-rust)]" />
          </span>
        </div>
        <div className="space-y-3">
          <p className="cc-font-display text-2xl tracking-tight text-[color:var(--cc-ink)]">
            Reading your career
          </p>
          <div className="flex h-6 items-center justify-center gap-2 cc-label-sm text-[color:var(--cc-ash)]">
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
      </div>
    </div>
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
  const setProfile = (patch: Partial<OnboardingAnalysis['inferredProfile']>) =>
    setEdited((p) => ({ ...p, inferredProfile: { ...p.inferredProfile, ...patch } }));

  const stagger = (i: number) => ({
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.35, delay: i * 0.07 },
  });

  const { persona, inferredProfile, skills, cvStandards, confidence } = edited;
  const confidencePct = Math.round((confidence?.overall ?? 0) * 100);

  return (
    <div className="space-y-4">
      {/* Persona — the headline plate */}
      <motion.div {...stagger(0)}>
        <div className="cc-card border-[color:var(--cc-ink)] p-6 md:p-8">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div className="cc-label text-[color:var(--cc-rust)]">§ 02 · Your profile</div>
            {runsRemaining > 0 && (
              <span className="cc-label-sm text-[color:var(--cc-ash)]">
                {runsRemaining} re-analyses left today
              </span>
            )}
          </div>

          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="cc-label-sm text-[color:var(--cc-ash)]">Here's how we read you</p>
              <h2 className="mt-2 cc-font-display text-3xl md:text-4xl leading-[0.95] tracking-[-0.02em] text-[color:var(--cc-ink)]">
                {persona.archetype}
              </h2>
            </div>
            <ConfidenceRing pct={confidencePct} />
          </div>

          <p className="mt-5 cc-font-editorial text-lg leading-snug text-[color:var(--cc-ink-soft)]">
            {persona.narrative}
          </p>

          <div className="mt-5 flex flex-wrap gap-2">
            <PersonaPill label="Seniority" value={persona.seniority} />
            <PersonaPill label="Function" value={persona.function} />
            {persona.subFunction && <PersonaPill label="Focus" value={persona.subFunction} />}
            {persona.vertical && <PersonaPill label="Vertical" value={persona.vertical} />}
          </div>
        </div>
      </motion.div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.85fr)]">
        <div className="space-y-4">
          {/* Targets — editable */}
          <motion.div {...stagger(1)}>
            <SectionCard
              icon={Target}
              title="Tune your targets"
              subtitle="These are the details worth checking before saving."
            >
              <div className="space-y-5">
                <EditField label="Target roles">
                  <EditableChips
                    items={edited.targets.target_job_titles}
                    onChange={(v) => setTargets({ target_job_titles: v })}
                    placeholder="Add a role…"
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
                <div className="grid grid-cols-2 gap-4">
                  <EditField label="Min salary">
                    <input
                      type="number"
                      inputMode="numeric"
                      value={edited.targets.desired_salary_min ?? ''}
                      onChange={(e) =>
                        setTargets({ desired_salary_min: e.target.value ? Number(e.target.value) : null })
                      }
                      placeholder="90000"
                      className="cc-field"
                    />
                  </EditField>
                  <EditField label="Max salary">
                    <input
                      type="number"
                      inputMode="numeric"
                      value={edited.targets.desired_salary_max ?? ''}
                      onChange={(e) =>
                        setTargets({ desired_salary_max: e.target.value ? Number(e.target.value) : null })
                      }
                      placeholder="130000"
                      className="cc-field"
                    />
                  </EditField>
                </div>
              </div>
            </SectionCard>
          </motion.div>

          <motion.div {...stagger(2)}>
            <SectionCard icon={Briefcase} title="Preferences">
              <div className="space-y-5">
                <EditField label="Target companies">
                  <EditableChips
                    items={edited.targets.target_companies}
                    onChange={(v) => setTargets({ target_companies: v })}
                    placeholder="Add a company…"
                  />
                </EditField>
                <EditField label="Industries">
                  <EditableChips
                    items={edited.jobPreferences.industries}
                    onChange={(v) => setPrefs({ industries: v })}
                    placeholder="Add an industry…"
                  />
                </EditField>
                <EditField label="Remote preference">
                  <div className="flex flex-wrap gap-2">
                    {REMOTE_OPTIONS.map((opt) => {
                      const active = edited.jobPreferences.remote_preference === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setPrefs({ remote_preference: opt.value })}
                          className={
                            'cc-pill transition-colors ' +
                            (active ? 'cc-pill-filled' : 'hover:border-[color:var(--cc-ink)]')
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
        </div>

        <div className="space-y-4">
          <motion.div {...stagger(3)}>
            <SectionCard
              icon={Briefcase}
              title="Your details"
              subtitle="Saved straight into your profile — fix anything we misread."
            >
              <div className="space-y-4">
                <EditField label="Full name">
                  <input
                    value={inferredProfile.full_name ?? ''}
                    onChange={(e) => setProfile({ full_name: e.target.value || null })}
                    placeholder="Your name"
                    className="cc-field"
                  />
                </EditField>
                <div className="grid grid-cols-2 gap-3">
                  <EditField label="Current role">
                    <input
                      value={inferredProfile.current_job_title ?? ''}
                      onChange={(e) => setProfile({ current_job_title: e.target.value || null })}
                      placeholder="Job title"
                      className="cc-field"
                    />
                  </EditField>
                  <EditField label="Company">
                    <input
                      value={inferredProfile.current_company ?? ''}
                      onChange={(e) => setProfile({ current_company: e.target.value || null })}
                      placeholder="Company"
                      className="cc-field"
                    />
                  </EditField>
                </div>
                <EditField label="Industry">
                  <CanonicalSelect
                    value={inferredProfile.industry}
                    onChange={(v) => setProfile({ industry: v })}
                    options={INDUSTRIES.map((i) => ({ value: i, label: i }))}
                  />
                </EditField>
                <div className="grid grid-cols-2 gap-3">
                  <EditField label="Career level">
                    <CanonicalSelect
                      value={inferredProfile.career_level}
                      onChange={(v) => setProfile({ career_level: v })}
                      options={CAREER_LEVELS}
                    />
                  </EditField>
                  <EditField label="Experience">
                    <CanonicalSelect
                      value={inferredProfile.years_of_experience}
                      onChange={(v) => setProfile({ years_of_experience: v })}
                      options={YEARS_OF_EXPERIENCE}
                    />
                  </EditField>
                </div>
                <EditField label="Status">
                  <CanonicalSelect
                    value={inferredProfile.employment_status}
                    onChange={(v) => setProfile({ employment_status: v })}
                    options={EMPLOYMENT_STATUS}
                  />
                </EditField>
                <div className="grid grid-cols-2 gap-3">
                  <EditField label="City">
                    <input
                      value={inferredProfile.location_city ?? ''}
                      onChange={(e) => setProfile({ location_city: e.target.value || null })}
                      placeholder="Adelaide"
                      className="cc-field"
                    />
                  </EditField>
                  <EditField label="Country">
                    <input
                      value={inferredProfile.location_country ?? ''}
                      onChange={(e) => setProfile({ location_country: e.target.value || null })}
                      placeholder="Australia"
                      className="cc-field"
                    />
                  </EditField>
                </div>
              </div>
            </SectionCard>
          </motion.div>

          <motion.div {...stagger(4)}>
            <SectionCard icon={Sparkles} title={`Skills · ${skills.length}`}>
              <div className="flex flex-wrap gap-2">
                {skills.slice(0, 18).map((s) => (
                  <span key={s.name} className="cc-pill">
                    {s.name}
                  </span>
                ))}
                {skills.length === 0 && (
                  <p className="cc-font-editorial text-base text-[color:var(--cc-ash)]">
                    No skills inferred — try the résumé path or describe in more detail.
                  </p>
                )}
              </div>
            </SectionCard>
          </motion.div>

          <motion.div {...stagger(5)}>
            <SectionCard
              icon={FileCheck}
              title="CV standards"
              accent
              subtitle="Used when we generate or rewrite your résumé."
            >
              <div className="grid grid-cols-2 gap-4">
                <KV label="Length" value={cvStandards.recommended_length} />
                <KV label="Format" value={cvStandards.format} />
              </div>
              {cvStandards.improvements?.length > 0 && (
                <div className="mt-5">
                  <p className="cc-label-sm text-[color:var(--cc-rust)] mb-2">Top improvements</p>
                  <ul className="space-y-1.5">
                    {cvStandards.improvements.slice(0, 4).map((n, i) => (
                      <li key={i} className="flex gap-2 cc-font-editorial text-base text-[color:var(--cc-ink-soft)]">
                        <span className="mt-0.5 text-[color:var(--cc-rust)]">→</span>
                        <span>{n}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {cvStandards.ats_notes?.length > 0 && (
                <div className="mt-5">
                  <p className="cc-label-sm text-[color:var(--cc-rust)] mb-2">ATS notes</p>
                  <ul className="space-y-1.5">
                    {cvStandards.ats_notes.slice(0, 3).map((n, i) => (
                      <li key={i} className="flex gap-2 cc-font-editorial text-base text-[color:var(--cc-ink-soft)]">
                        <CheckCircle2 className="mt-1 h-3.5 w-3.5 shrink-0 text-[color:var(--cc-signal)]" />
                        <span>{n}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </SectionCard>
          </motion.div>
        </div>
      </div>

      {/* Action bar */}
      <motion.div {...stagger(6)}>
        <div className="cc-card p-4 md:p-5 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button onClick={onBack} disabled={saving} className="cc-btn cc-btn-ghost">
            Back
          </button>
          <div className="flex flex-col-reverse gap-3 sm:flex-row">
            <button
              onClick={onReanalyze}
              disabled={saving || runsRemaining <= 0}
              title={runsRemaining <= 0 ? 'Daily limit reached' : 'Re-run AI analysis'}
              className="cc-btn cc-btn-ghost"
            >
              <RefreshCw className="h-4 w-4" />
              Re-analyse
            </button>
            <button onClick={() => onConfirm(edited)} disabled={saving} className="cc-btn cc-btn-signal">
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Saving…
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" /> Save &amp; personalise
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function ConfidenceRing({ pct }: { pct: number }) {
  const r = 30;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;
  const tone = pct >= 75 ? 'good' : pct >= 45 ? 'warn' : 'poor';
  return (
    <div className="flex shrink-0 items-center gap-3">
      <svg className="cc-ring" viewBox="0 0 72 72" style={{ width: 64, height: 64 }}>
        <circle className="cc-ring-track" cx="36" cy="36" r={r} />
        <circle
          className={`cc-ring-fill-${tone}`}
          cx="36"
          cy="36"
          r={r}
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(.2,.8,.2,1)' }}
        />
        <text
          x="36"
          y="41"
          textAnchor="middle"
          className="cc-font-display cc-tabular"
          style={{ fontSize: 18, fill: 'var(--cc-ink)' }}
        >
          {pct}
        </text>
      </svg>
      <div className="cc-label-sm text-[color:var(--cc-ash)] leading-tight">
        AI
        <br />
        confidence
      </div>
    </div>
  );
}

function PersonaPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="cc-meta border border-[color:var(--cc-hair-strong)] px-3 py-1.5">
      <span className="cc-meta-label">{label}</span>
      <span className="cc-meta-value capitalize" style={{ fontSize: 14 }}>
        {value}
      </span>
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
    <div
      className="cc-card p-5 md:p-6"
      style={accent ? { borderColor: 'var(--cc-rust)', background: 'var(--cc-rust-soft)' } : undefined}
    >
      <div className="mb-4">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-[color:var(--cc-rust)]" />
          <h3 className="cc-label text-[color:var(--cc-ink)]">{title}</h3>
        </div>
        {subtitle && (
          <p className="mt-1.5 cc-font-editorial text-base text-[color:var(--cc-ash)]">{subtitle}</p>
        )}
      </div>
      {children}
    </div>
  );
}

function CanonicalSelect({
  value,
  onChange,
  options,
}: {
  value: string | null;
  onChange: (v: string | null) => void;
  options: ReadonlyArray<{ value: string; label: string }>;
}) {
  // The AI may hand us a value we don't recognise (older runs); surface it
  // rather than silently blanking the field.
  const known = options.some((o) => o.value === value);
  return (
    <select
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value || null)}
      className="cc-field"
      style={{ appearance: 'none', cursor: 'pointer' }}
    >
      <option value="">Not set</option>
      {!known && value && <option value={value}>{value}</option>}
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

function EditField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="cc-field-label">{label}</p>
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
        <div className="mb-2.5 flex flex-wrap gap-2">
          {items.map((it) => (
            <span key={it} className="cc-pill gap-1.5">
              {it}
              <button
                type="button"
                onClick={() => onChange(items.filter((x) => x !== it))}
                aria-label={`Remove ${it}`}
                className="opacity-60 transition-opacity hover:opacity-100"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <input
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add();
            }
          }}
          placeholder={placeholder}
          className="cc-field"
        />
        <button
          type="button"
          onClick={add}
          className="shrink-0 border border-[color:var(--cc-ink)] bg-transparent px-4 cc-label text-[color:var(--cc-ink)] transition-colors hover:bg-[color:var(--cc-ink)] hover:text-[color:var(--cc-cream)]"
        >
          Add
        </button>
      </div>
    </div>
  );
}

function KV({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="cc-label-sm text-[color:var(--cc-ash)]">{label}</p>
      <p className="mt-1 cc-font-display text-lg capitalize text-[color:var(--cc-ink)]">{value}</p>
    </div>
  );
}
