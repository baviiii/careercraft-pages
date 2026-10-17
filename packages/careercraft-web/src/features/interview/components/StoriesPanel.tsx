/**
 * Stories — the learner's best story for each competency, built up by
 * practising (every story answer the coach scores lands here if it beats the
 * last one), and a drafter that turns those stories into written responses to
 * selection criteria.
 *
 * Shown against the plain competencies or a public-sector framework's
 * capabilities. Strength is a word and a three-dot meter, never a colour.
 */
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Check, ChevronDown, Copy, Loader2, PenLine } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  COACH_AVAILABLE,
  CoachUnavailableError,
  interviewCoach,
  NSW_LEVELS,
  type Framework,
  type SelectionDraft,
} from "@/lib/interviewCoach";
import { stageSession } from "../hooks/useInterviewSession";
import {
  competencyList,
  competencyName,
  FRAMEWORK_LABEL,
  frameworkOf,
  storyStrength,
  type StoryStrength,
} from "../lib/competencies";
import { wordCount } from "../lib/format";
import { relativeDay } from "../lib/progress";
import { useStories, type Story } from "../lib/practiceData";
import { StarRow } from "./AnswerFeedback";
import { LevelMeter } from "./RoundMarks";
import "../interview.css";

const STRENGTH_LEVEL: Record<StoryStrength, number> = { none: 0, weak: 1, usable: 2, strong: 3 };

function Strength({ strength }: { strength: StoryStrength }) {
  return <LevelMeter level={STRENGTH_LEVEL[strength]} label={strength === "none" ? "no story yet" : strength} />;
}

function StoryRow({
  label,
  shows,
  story,
  onPractise,
}: {
  label: string;
  shows: string;
  story: Story | undefined;
  onPractise: () => void;
}) {
  const [open, setOpen] = useState(false);
  const strength = storyStrength(story?.bestScore);
  return (
    <li className="cc-iv-behavioral border-b border-[color:var(--cc-hair)] last:border-b-0">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-4">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-[color:var(--cc-ink)]">{label}</p>
          <p className="mt-0.5 text-xs text-[color:var(--cc-ink-soft)]">
            {story ? (
              <>
                “{story.title}” · best {story.bestScore ?? "—"}/10 · practised {story.timesPractised}×, last{" "}
                {relativeDay(story.lastPractisedAt).toLowerCase()}
              </>
            ) : (
              shows
            )}
          </p>
        </div>
        <Strength strength={strength} />
        <div className="flex items-center gap-2">
          {story && (
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              className="inline-flex items-center gap-1 text-xs font-semibold text-[color:var(--cc-ink-soft)] hover:text-[color:var(--cc-ink)]"
            >
              Read <ChevronDown className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`} />
            </button>
          )}
          <button type="button" onClick={onPractise} disabled={!COACH_AVAILABLE} className="cc-action cc-action--sm">
            {story ? "Practise again" : "Practise it"}
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      {open && story && (
        <blockquote className="mx-5 mb-4 whitespace-pre-wrap rounded-xl border-l-2 border-[color:var(--cc-iv)] bg-[color:var(--cc-cream-2)] px-4 py-3 text-sm leading-relaxed text-[color:var(--cc-ink-soft)]">
          {story.bestAnswer}
        </blockquote>
      )}
    </li>
  );
}

/* ── selection criteria ─────────────────────────────────────────────────── */

const WORD_LIMITS = [250, 300, 400, 500];

function SelectionCriterionDrafter({
  stories,
  framework,
  seniority,
}: {
  stories: Story[];
  framework: Framework | null;
  seniority?: string;
}) {
  const { toast } = useToast();
  const [criterion, setCriterion] = useState("");
  const [wordLimit, setWordLimit] = useState(300);
  const [level, setLevel] = useState<string>("Adept");
  const [storyKey, setStoryKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<SelectionDraft | null>(null);
  const [text, setText] = useState("");
  const [copied, setCopied] = useState(false);
  const words = wordCount(text);

  const draft = async () => {
    if (criterion.trim().length < 10) return;
    setBusy(true);
    try {
      const r = await interviewCoach.draftSelectionCriterion({
        criterion: criterion.trim(),
        wordLimit,
        framework: framework ?? undefined,
        frameworkLevel: framework === "nsw" ? level : undefined,
        competency: storyKey || undefined,
      });
      setResult(r);
      setText(r.draft);
    } catch (e) {
      toast({
        title: "Couldn't draft that",
        description: e instanceof CoachUnavailableError ? e.message : "Try again in a moment.",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      toast({ title: "Couldn't copy", description: "Select the text and copy it instead.", variant: "destructive" });
    }
  };

  return (
    <section className="cc-surface overflow-hidden" aria-labelledby="iv-ksc">
      <div className="border-b border-[color:var(--cc-hair)] px-5 py-4 md:px-6">
        <p id="iv-ksc" className="flex items-center gap-2 font-semibold text-[color:var(--cc-ink)]">
          <PenLine className="h-4 w-4" aria-hidden />
          Selection criteria
        </p>
        <p className="mt-1 text-sm text-[color:var(--cc-ink-soft)]">
          Paste a criterion from the ad. The coach writes a STAR response from your stories above, in your words, within
          the word limit. It won't invent anything; if no story fits, it says what's missing.
        </p>
      </div>
      <div className="space-y-5 p-5 md:p-6">
        <div className="cc-field-wrap">
          <label htmlFor="iv-ksc-text" className="cc-field-label">
            Criterion
          </label>
          <textarea
            id="iv-ksc-text"
            value={criterion}
            onChange={(e) => setCriterion(e.target.value)}
            rows={3}
            placeholder="e.g. Demonstrated ability to deliver results in a fast-paced environment."
            className="cc-field cc-field-textarea"
          />
        </div>
        <div className="flex flex-wrap items-end gap-4">
          <label className="text-sm text-[color:var(--cc-ink-soft)]">
            <span className="cc-field-label mb-1 block">Word limit</span>
            <select value={wordLimit} onChange={(e) => setWordLimit(Number(e.target.value))} className="cc-field !w-auto !py-2">
              {WORD_LIMITS.map((n) => (
                <option key={n} value={n}>
                  {n} words
                </option>
              ))}
            </select>
          </label>
          <label className="min-w-0 max-w-full text-sm text-[color:var(--cc-ink-soft)]">
            <span className="cc-field-label mb-1 block">Build from</span>
            {/* Story titles can be long; never let one push the page sideways. */}
            <select
              value={storyKey}
              onChange={(e) => setStoryKey(e.target.value)}
              className="cc-field !w-auto max-w-full truncate !py-2"
            >
              <option value="">Whichever story fits best</option>
              {stories.map((s) => (
                <option key={s.competency} value={s.competency}>
                  {competencyName(s.competency, seniority)} — {s.title}
                </option>
              ))}
            </select>
          </label>
          {framework === "nsw" && (
            <label className="text-sm text-[color:var(--cc-ink-soft)]">
              <span className="cc-field-label mb-1 block">NSW level</span>
              <select value={level} onChange={(e) => setLevel(e.target.value)} className="cc-field !w-auto !py-2">
                {NSW_LEVELS.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
            </label>
          )}
          <button
            type="button"
            onClick={() => void draft()}
            disabled={busy || criterion.trim().length < 10 || !COACH_AVAILABLE}
            className="cc-action"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <PenLine className="h-4 w-4" />}
            {busy ? "Drafting" : "Draft from my stories"}
          </button>
        </div>
        {stories.length === 0 && (
          <p className="text-xs text-[color:var(--cc-ink-soft)]">
            You have no saved stories yet, so a draft can only use your résumé. Practise a story or two first for a much
            better response.
          </p>
        )}

        {result && (
          <div className="space-y-4 border-t border-[color:var(--cc-hair)] pt-5">
            {result.draft ? (
              <>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="cc-label-sm text-[color:var(--cc-ink)]">
                    Your draft{result.storyUsed ? ` · from “${result.storyUsed.title}”` : ""}
                  </p>
                  <span
                    className={`cc-font-mono text-xs tabular-nums ${
                      words > wordLimit ? "font-semibold text-[color:var(--cc-ink)]" : "text-[color:var(--cc-ink-soft)]"
                    }`}
                  >
                    {words}/{wordLimit} words{words > wordLimit ? " · over the limit" : ""}
                  </span>
                </div>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  rows={10}
                  aria-label="Your selection criterion response"
                  className="cc-field cc-field-textarea"
                />
                <button type="button" onClick={() => void copy()} className="cc-action cc-action--ghost cc-action--sm">
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? "Copied" : "Copy"}
                </button>
              </>
            ) : (
              <p className="text-sm text-[color:var(--cc-ink)]">None of your stories fits this criterion yet.</p>
            )}
            {result.starCoverage && <StarRow star={result.starCoverage} />}
            {(result.gaps.length > 0 || result.tips.length > 0) && (
              <ul className="space-y-1">
                {[...result.gaps, ...result.tips].map((g, i) => (
                  <li key={i} className="text-sm text-[color:var(--cc-ink-soft)]">
                    — {g}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

/* ── the panel ──────────────────────────────────────────────────────────── */

export function StoriesPanel({
  field,
  seniority,
  initialFramework = null,
}: {
  field?: string;
  seniority?: string;
  initialFramework?: Framework | null;
}) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data, isLoading, isError, refetch } = useStories();
  const stories = useMemo(() => data ?? [], [data]);
  const [framework, setFramework] = useState<Framework | null>(initialFramework);
  const list = competencyList(framework, seniority);
  const byKey = new Map(stories.map((s) => [s.competency, s]));
  const others = stories.filter((s) => frameworkOf(s.competency) !== framework || !list.some((c) => c.key === s.competency));
  const strong = list.filter((c) => storyStrength(byKey.get(c.key)?.bestScore) === "strong").length;

  // One coached story question for this competency, straight into the room.
  const practise = (competency: string, label: string) => {
    if (!field) {
      toast({
        title: "Tell us the job you're going for",
        description: "Use the card at the top of the page. Any job works.",
        variant: "destructive",
      });
      return;
    }
    stageSession({
      field,
      seniority: seniority || undefined,
      roundType: "behavioral",
      competency,
      framework: frameworkOf(competency) ?? undefined,
      mode: "coached",
      questionCount: 1,
      roundName: `Story · ${label}`,
    });
    navigate("/interview-prep/room");
  };

  if (isLoading) {
    return <div className="h-64 animate-pulse rounded-[1.25rem] border border-[color:var(--cc-hair)] bg-[color:var(--cc-cream-2)]" />;
  }
  if (isError) {
    return (
      <div className="cc-surface p-10 text-center">
        <p className="cc-kicker mb-2">Couldn't load your stories</p>
        <button type="button" onClick={() => void refetch()} className="cc-action cc-action--ghost mt-4">
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="cc-surface overflow-hidden" aria-labelledby="iv-stories">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[color:var(--cc-hair)] px-5 py-4 md:px-6">
          <div>
            <p id="iv-stories" className="font-semibold text-[color:var(--cc-ink)]">
              Your stories
            </p>
            <p className="mt-1 text-sm text-[color:var(--cc-ink-soft)]">
              {strong} of {list.length} have a strong story. Every behavioural answer you practise is saved here when it
              beats your last one.
            </p>
          </div>
          <div role="group" aria-label="Show stories against" className="inline-flex overflow-hidden rounded-[0.85rem] border border-[color:var(--cc-hair-strong)]">
            {([null, "aps", "nsw"] as Array<Framework | null>).map((f) => (
              <button
                key={f ?? "plain"}
                type="button"
                aria-pressed={framework === f}
                onClick={() => setFramework(f)}
                title={f ? FRAMEWORK_LABEL[f] : "The skills any panel asks about"}
                className={`px-3.5 py-2 text-xs font-semibold transition-colors ${
                  framework === f
                    ? "bg-[color:var(--cc-ink)] text-[color:var(--cc-cream)]"
                    : "text-[color:var(--cc-ink-soft)] hover:text-[color:var(--cc-ink)]"
                }`}
              >
                {f === null ? "Any panel" : f.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
        <ul>
          {list.map((c) => (
            <StoryRow
              key={c.key}
              label={c.label}
              shows={c.shows}
              story={byKey.get(c.key)}
              onPractise={() => practise(c.key, c.label)}
            />
          ))}
        </ul>
        {others.length > 0 && (
          <div className="border-t border-[color:var(--cc-hair)] px-5 py-4 md:px-6">
            <p className="cc-label-sm text-[color:var(--cc-ash)]">Also saved</p>
            <ul className="mt-2 space-y-1">
              {others.map((s) => (
                <li key={s.competency} className="text-sm text-[color:var(--cc-ink-soft)]">
                  <span className="font-semibold text-[color:var(--cc-ink)]">{competencyName(s.competency, seniority)}</span> — “
                  {s.title}” · best {s.bestScore ?? "—"}/10
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <SelectionCriterionDrafter stories={stories} framework={framework} seniority={seniority} />
    </div>
  );
}
