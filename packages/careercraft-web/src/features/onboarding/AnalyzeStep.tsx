import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Briefcase,
  Check,
  CheckCircle2,
  FileCheck,
  Info,
  Loader2,
  RefreshCw,
  Tags,
  Target,
  UserRound,
} from 'lucide-react';
import { FaircopyMark } from '@/components/brand/FaircopyMark';
import {
  CAREER_LEVELS,
  EMPLOYMENT_STATUS,
  INDUSTRIES,
  YEARS_OF_EXPERIENCE,
} from '@/hooks/useUserProfile';
import type { OnboardingAnalysis } from './types';
import { Chip, SectionIcon } from './ui';

interface Props {
  analysis: OnboardingAnalysis | null;
  loading: boolean;
  runsRemaining: number;
  onConfirm: (analysis: OnboardingAnalysis) => void;
  onReanalyze: () => void;
  onBack: () => void;
  saving?: boolean;
}

const WORK_OPTIONS = [
  { value: 'remote', label: 'Remote' },
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'onsite', label: 'On-site' },
];

/* The shared labels carry year ranges ("Mid Level (2-5 years)") that sit right
   beside the Experience field here and contradict it whenever the two disagree.
   Experience already says how long; level only needs to say how senior. */
const LEVEL_OPTIONS = CAREER_LEVELS.map((l) => ({ ...l, label: l.label.replace(/\s*\(.*\)$/, '') }));

/** Below this the analyser was guessing, and saying so beats a score. */
const LOW_CONFIDENCE = 0.6;

/**
 * remote_preference is single-valued; work_arrangement is the set the person
 * actually picks. Asking both on one screen read as the same question twice, so
 * only the set is asked and the single value is derived from it on save.
 */
function deriveRemotePreference(arrangement: string[], current: string): string {
  if (arrangement.includes(current)) return current;
  if (arrangement.length === 1) return arrangement[0];
  return 'any';
}

export function AnalyzeStep({
  analysis,
  loading,
  runsRemaining,
  onConfirm,
  onReanalyze,
  onBack,
  saving = false,
}: Props) {
  if (loading || !analysis) return <LoadingPanel />;

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

function LoadingPanel() {
  return (
    <div className="cc-card p-10 md:p-16">
      <div className="mx-auto flex max-w-sm flex-col items-center gap-6 text-center">
        <motion.div
          animate={{ scale: [1, 1.05, 1], opacity: [0.8, 1, 0.8] }}
          transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
        >
          <FaircopyMark className="h-14 w-14" />
        </motion.div>
        <div>
          <p className="cc-font-display text-2xl tracking-tight text-[color:var(--cc-ink)]">
            Building your profile
          </p>
          <p className="mt-2 text-[15px] text-[color:var(--cc-ink-soft)]">Usually under half a minute.</p>
        </div>
        <div className="relative h-[3px] w-48 overflow-hidden rounded-full bg-[color:var(--cc-hair)]" aria-hidden>
          <motion.span
            className="absolute inset-y-0 w-1/3 rounded-full bg-[color:var(--cc-rust)]"
            animate={{ x: ['-100%', '300%'] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
          />
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
    transition: { duration: 0.35, delay: i * 0.06 },
  });

  const { persona, inferredProfile, skills, cvStandards, confidence } = edited;
  const name = inferredProfile.full_name?.trim();
  const roleLine = [inferredProfile.current_job_title, inferredProfile.current_company]
    .filter(Boolean)
    .join(' at ');
  const lowConfidence = (confidence?.overall ?? 0) < LOW_CONFIDENCE;
  const currency = edited.targets.desired_salary_currency || 'AUD';

  const toggleWork = (value: string) => {
    const cur = edited.targets.work_arrangement;
    setTargets({
      work_arrangement: cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value],
    });
  };

  const save = () =>
    onConfirm({
      ...edited,
      jobPreferences: {
        ...edited.jobPreferences,
        remote_preference: deriveRemotePreference(
          edited.targets.work_arrangement,
          edited.jobPreferences.remote_preference,
        ),
      },
    });

  return (
    <div className="space-y-4">
      {/* Who this is — read straight off the details below, so edits show here */}
      <motion.div {...stagger(0)}>
        <div className="cc-card p-6 md:p-8">
          <div className="cc-label text-[color:var(--cc-rust)]">§ 02 · Check your profile</div>
          <h1 className="mt-3 cc-font-display text-4xl md:text-5xl leading-[0.95] tracking-[-0.03em] text-[color:var(--cc-ink)]">
            {name || roleLine || 'Your profile'}
          </h1>
          {name && roleLine && (
            <p className="mt-2 text-lg text-[color:var(--cc-ink-soft)]">{roleLine}</p>
          )}

          <div className="mt-5 flex flex-wrap gap-2">
            <PersonaPill label="Seniority" value={persona.seniority} />
            <PersonaPill label="Function" value={persona.function} />
            {persona.subFunction && <PersonaPill label="Focus" value={persona.subFunction} />}
            {inferredProfile.location_city && (
              <PersonaPill label="Based in" value={inferredProfile.location_city} />
            )}
          </div>

          <p className="mt-6 border-t border-[color:var(--cc-hair)] pt-4 text-[15px] text-[color:var(--cc-ink-soft)]">
            {lowConfidence ? (
              <span className="flex items-start gap-2">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--cc-rust)]" />
                Parts of your résumé were hard to read. Check the details below before saving.
              </span>
            ) : (
              'Check the details below. You can change any of them later in Settings.'
            )}
          </p>
        </div>
      </motion.div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.85fr)]">
        <div className="space-y-4">
          <motion.div {...stagger(1)}>
            <SectionCard icon={Target} title="What you're looking for">
              <div className="space-y-5">
                <EditField label="Target roles">
                  <EditableChips
                    items={edited.targets.target_job_titles}
                    onChange={(v) => setTargets({ target_job_titles: v })}
                    placeholder="Add a role"
                  />
                </EditField>
                <EditField label="Preferred locations">
                  <EditableChips
                    items={edited.targets.preferred_locations}
                    onChange={(v) => setTargets({ preferred_locations: v })}
                    placeholder="Add a location"
                  />
                </EditField>
                <EditField label="Work arrangement">
                  <div className="flex flex-wrap gap-2">
                    {WORK_OPTIONS.map((opt) => {
                      const active = edited.targets.work_arrangement.includes(opt.value);
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => toggleWork(opt.value)}
                          aria-pressed={active}
                          className={
                            'inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[13px] transition-colors ' +
                            (active
                              ? 'border-[color:var(--cc-ink)] bg-[color:var(--cc-ink)] text-[color:var(--cc-cream)]'
                              : 'border-[color:var(--cc-hair-strong)] bg-white/70 text-[color:var(--cc-ink)] hover:border-[color:var(--cc-ink)]')
                          }
                        >
                          {active && <Check className="h-3.5 w-3.5" strokeWidth={2.5} />}
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </EditField>
                <div className="grid grid-cols-2 gap-4">
                  <EditField label={`Min salary (${currency})`}>
                    <input
                      type="number"
                      inputMode="numeric"
                      value={edited.targets.desired_salary_min ?? ''}
                      onChange={(e) =>
                        setTargets({ desired_salary_min: e.target.value ? Number(e.target.value) : null })
                      }
                      placeholder="e.g. 90000"
                      className="cc-field"
                    />
                  </EditField>
                  <EditField label={`Max salary (${currency})`}>
                    <input
                      type="number"
                      inputMode="numeric"
                      value={edited.targets.desired_salary_max ?? ''}
                      onChange={(e) =>
                        setTargets({ desired_salary_max: e.target.value ? Number(e.target.value) : null })
                      }
                      placeholder="e.g. 130000"
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
                    placeholder="Add a company"
                  />
                </EditField>
                <EditField label="Industries">
                  <EditableChips
                    items={edited.jobPreferences.industries}
                    onChange={(v) => setPrefs({ industries: v })}
                    placeholder="Add an industry"
                  />
                </EditField>
              </div>
            </SectionCard>
          </motion.div>

          <motion.div {...stagger(4)}>
            <SectionCard icon={Tags} title="Skills" count={skills.length}>
              <EditableChips
                items={skills.map((s) => s.name)}
                onChange={(names) =>
                  setEdited((p) => ({
                    ...p,
                    skills: names.map(
                      (n) =>
                        p.skills.find((s) => s.name === n) ?? {
                          name: n,
                          category: 'domain',
                          proficiency: 'intermediate',
                          years_experience: null,
                        },
                    ),
                  }))
                }
                placeholder="Add a skill"
                empty="No skills found. Add the ones you want employers to see."
              />
            </SectionCard>
          </motion.div>
        </div>

        <div className="space-y-4">
          <motion.div {...stagger(3)}>
            <SectionCard icon={UserRound} title="Your details">
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
                      options={LEVEL_OPTIONS}
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


          <motion.div {...stagger(5)}>
            <SectionCard
              icon={FileCheck}
              title="CV standards"
              subtitle="Used when we write or rewrite your résumé."
              accent
            >
              <div className="grid grid-cols-2 gap-4">
                <KV label="Length" value={cvStandards.recommended_length} />
                <KV label="Format" value={cvStandards.format.replace(/-/g, ' ')} />
              </div>
              {cvStandards.improvements?.length > 0 && (
                <div className="mt-5">
                  <p className="cc-field-label mb-2">Improve first</p>
                  <ul className="space-y-2">
                    {cvStandards.improvements.slice(0, 4).map((n, i) => (
                      <li key={i} className="flex gap-2 text-[15px] leading-snug text-[color:var(--cc-ink-soft)]">
                        <span className="text-[color:var(--cc-rust)]">→</span>
                        <span>{n}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {cvStandards.ats_notes?.length > 0 && (
                <div className="mt-5">
                  <p className="cc-field-label mb-2">ATS tips</p>
                  <ul className="space-y-2">
                    {cvStandards.ats_notes.slice(0, 3).map((n, i) => (
                      <li key={i} className="flex gap-2 text-[15px] leading-snug text-[color:var(--cc-ink-soft)]">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--cc-signal)]" />
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
              title={runsRemaining <= 0 ? 'No re-analyses left today' : undefined}
              className="cc-btn cc-btn-ghost"
            >
              <RefreshCw className="h-4 w-4" />
              Re-analyse{runsRemaining > 0 ? ` (${runsRemaining} left)` : ''}
            </button>
            <button onClick={save} disabled={saving} className="cc-btn cc-btn-signal">
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Saving…
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" /> Save profile
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function PersonaPill({ label, value }: { label: string; value: string }) {
  if (!value) return null;
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
  icon,
  title,
  count,
  subtitle,
  accent = false,
  children,
}: {
  icon: typeof Briefcase;
  title: string;
  count?: number;
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
        <div className="flex items-center gap-2.5">
          <SectionIcon icon={icon} />
          <h2 className="cc-font-display text-lg tracking-tight text-[color:var(--cc-ink)]">{title}</h2>
          {count !== undefined && (
            <span className="text-[13px] tabular-nums text-[color:var(--cc-ash)]">{count}</span>
          )}
        </div>
        {subtitle && <p className="mt-1.5 text-[14px] text-[color:var(--cc-ink-soft)]">{subtitle}</p>}
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
      <p className="cc-field-label mb-1.5">{label}</p>
      {children}
    </div>
  );
}

function EditableChips({
  items,
  onChange,
  placeholder,
  empty,
}: {
  items: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
  empty?: string;
}) {
  const [val, setVal] = useState('');
  const add = () => {
    const v = val.trim();
    if (v && !items.some((x) => x.toLowerCase() === v.toLowerCase())) onChange([...items, v]);
    setVal('');
  };
  return (
    <div>
      {items.length > 0 ? (
        <div className="mb-3 flex flex-wrap gap-2">
          {items.map((it) => (
            <Chip key={it} onRemove={() => onChange(items.filter((x) => x !== it))}>
              {it}
            </Chip>
          ))}
        </div>
      ) : (
        empty && <p className="mb-3 text-[14px] text-[color:var(--cc-ash)]">{empty}</p>
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
          disabled={!val.trim()}
          className="shrink-0 rounded-[0.85rem] border border-[color:var(--cc-ink)] bg-transparent px-4 cc-label text-[color:var(--cc-ink)] transition-colors hover:bg-[color:var(--cc-ink)] hover:text-[color:var(--cc-cream)] disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-[color:var(--cc-ink)]"
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
      <p className="cc-field-label mb-1.5">{label}</p>
      <p className="cc-font-display text-lg capitalize text-[color:var(--cc-ink)]">{value}</p>
    </div>
  );
}
