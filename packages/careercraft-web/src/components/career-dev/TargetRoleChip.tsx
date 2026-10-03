/**
 * "Going for: Electrician · change" — the one place Interview Prep asks what job
 * someone is preparing for. It starts from their getting-started answer. They can
 * type any job, see what the coach makes of it ("sparky" → Electrician, what its
 * interviews focus on, which licences it needs), then either save it to their
 * profile — every tab, and the rest of the app, follow — or use it just this once.
 */
import { useEffect, useState } from "react";
import { Check, Loader2, Pencil, RotateCcw } from "lucide-react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { useActiveRole } from "@/hooks/useActiveRole";
import { careerCoach, type FieldPreview } from "@/lib/careerCoach";
import { CAREER_LEVEL_OPTIONS, levelLabel } from "@/lib/careerFields";
import { preloadOccupations, suggestTitles } from "@/lib/occupations";

const SOURCE_NOTE: Record<string, string> = {
  "getting-started": "From your getting-started answers",
  "current-job": "From your current job",
  persona: "From your profile",
};

// The same text always gets the same answer, and the coach may be slow to wake,
// so keep answers for the visit. Failures aren't kept, so they're retried.
const previewCache = new Map<string, Promise<FieldPreview | null>>();

function previewFor(text: string): Promise<FieldPreview | null> {
  const key = text.toLowerCase();
  let pending = previewCache.get(key);
  if (!pending) {
    pending = careerCoach.previewField(text).catch(() => {
      previewCache.delete(key);
      return null;
    });
    previewCache.set(key, pending);
  }
  return pending;
}

/** What the coach makes of a typed job, fetched once typing pauses. */
function usePreview(text: string | null) {
  const [state, setState] = useState<{ text: string; preview: FieldPreview | null; loading: boolean }>({
    text: "",
    preview: null,
    loading: false,
  });

  useEffect(() => {
    const t = (text ?? "").trim();
    if (t.length < 3) {
      setState({ text: t, preview: null, loading: false });
      return;
    }
    let live = true;
    setState((s) => ({ text: t, preview: s.text === t ? s.preview : null, loading: true }));
    const timer = setTimeout(() => {
      previewFor(t).then((preview) => {
        if (live) setState({ text: t, preview, loading: false });
      });
    }, 600);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [text]);

  return state;
}

/** The learner's own roles first, then titles matching what they've typed. */
function useSuggestions(text: string, ownRoles: string[]) {
  const [titles, setTitles] = useState<string[]>([]);
  useEffect(() => {
    let live = true;
    suggestTitles(text).then((t) => {
      if (live) setTitles(t);
    });
    return () => {
      live = false;
    };
  }, [text]);

  const q = text.trim().toLowerCase();
  const mine = ownRoles.filter((r) => !q || r.toLowerCase().includes(q)).slice(0, 4);
  const others = titles.filter((t) => !mine.some((m) => m.toLowerCase() === t.toLowerCase()));
  return { mine, others };
}

function RoleEditor({ onDone }: { onDone?: () => void }) {
  const active = useActiveRole();
  const { toast } = useToast();
  const [draft, setDraft] = useState(active.role ?? "");
  const [level, setLevel] = useState(active.level ?? "");
  const { preview, loading } = usePreview(draft);
  const { mine, others } = useSuggestions(draft, active.ownRoles);

  useEffect(preloadOccupations, []);

  const title = draft.trim();
  const known = preview?.known ? preview : null;
  const betterTitle =
    known && known.canonicalTitle.toLowerCase() !== title.toLowerCase() ? known.canonicalTitle : null;
  const required = known ? known.credentials.filter((c) => c.required).slice(0, 3) : [];
  // Only offer the stages this job really has, once the coach has said what they are.
  const levelOptions = CAREER_LEVEL_OPTIONS.filter(
    (o) => !known || Object.keys(known.levels).length === 0 || known.levels[o.value] || o.value === level,
  );
  const listed = [...mine, ...others].some((s) => s.toLowerCase() === title.toLowerCase());

  const save = async () => {
    try {
      await active.saveRole(title, level || null);
      toast({ title: `Going for: ${title}`, description: "Saved to your profile. Every tab now uses it." });
      onDone?.();
    } catch (e) {
      toast({
        title: "Couldn't save your role",
        description: e instanceof Error ? e.message : "Try again in a moment.",
        variant: "destructive",
      });
    }
  };

  const justOnce = () => {
    active.practiseJustOnce(title, level || null);
    toast({ title: `Practising for: ${title}`, description: "Just for this visit. Your profile isn't changed." });
    onDone?.();
  };

  return (
    <div className="space-y-4">
      <Command shouldFilter={false} className="rounded-[0.85rem] border border-[color:var(--cc-hair-strong)] bg-transparent">
        <CommandInput
          value={draft}
          onValueChange={setDraft}
          placeholder="Any job, e.g. electrician, ICU nurse, barista"
          aria-label="The job you're going for"
        />
        <CommandList className="max-h-56">
          {title && !listed && (
            <CommandGroup>
              <CommandItem value={`typed:${title}`} onSelect={() => setDraft(title)}>
                Use “{title}”
              </CommandItem>
            </CommandGroup>
          )}
          {mine.length > 0 && (
            <CommandGroup heading="Your roles">
              {mine.map((r) => (
                <CommandItem key={`mine:${r}`} value={`mine:${r}`} onSelect={() => setDraft(r)}>
                  {r}
                </CommandItem>
              ))}
            </CommandGroup>
          )}
          {others.length > 0 && (
            <CommandGroup heading="Suggestions">
              {others.map((r) => (
                <CommandItem key={`title:${r}`} value={`title:${r}`} onSelect={() => setDraft(r)}>
                  {r}
                </CommandItem>
              ))}
            </CommandGroup>
          )}
          <CommandEmpty>Type any job title.</CommandEmpty>
        </CommandList>
      </Command>

      {title.length >= 3 && (loading || preview) && (
        <div className="rounded-[0.85rem] border border-[color:var(--cc-hair)] p-3 text-sm" aria-live="polite">
          {known ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold text-[color:var(--cc-ink)]">{known.canonicalTitle}</p>
                {betterTitle && (
                  <button type="button" className="cc-link text-xs" onClick={() => setDraft(betterTitle)}>
                    Use “{betterTitle}”
                  </button>
                )}
              </div>
              {known.interviewStyle && <p className="mt-1 text-[color:var(--cc-ink-soft)]">{known.interviewStyle}</p>}
              {required.length > 0 && (
                <>
                  <p className="mt-2 text-[color:var(--cc-ink-soft)]">
                    <span className="font-semibold text-[color:var(--cc-ink)]">Usually required:</span>{" "}
                    {required.map((c) => c.name).join(" · ")}
                  </p>
                  <p className="mt-1 text-xs text-[color:var(--cc-ash)]">Check current requirements with the issuing body.</p>
                </>
              )}
            </>
          ) : preview ? (
            <p className="text-[color:var(--cc-ink-soft)]">We don't recognise that as a job title, but you can still use it.</p>
          ) : (
            <p className="flex items-center gap-2 text-[color:var(--cc-ink-soft)]">
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> Checking what employers look for…
            </p>
          )}
        </div>
      )}

      <label className="block">
        <span className="cc-field-label">Level</span>
        <select className="cc-field mt-1" value={level} onChange={(e) => setLevel(e.target.value)}>
          <option value="">Any level</option>
          {levelOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {levelLabel(o.value, known?.levels)}
            </option>
          ))}
        </select>
      </label>

      <div className="flex flex-wrap gap-2">
        <button type="button" className="cc-btn cc-btn-primary" disabled={!title || active.saving} onClick={save}>
          {active.saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Check className="h-4 w-4" aria-hidden />}
          Save to my profile
        </button>
        <button type="button" className="cc-btn cc-btn-ghost" disabled={!title} onClick={justOnce}>
          Just this once
        </button>
      </div>
      <p className="text-xs text-[color:var(--cc-ash)]">
        Saving updates your profile, so interviews, guidance, certifications and job search all use it.
      </p>
    </div>
  );
}

export default function TargetRoleChip() {
  const active = useActiveRole();
  const [open, setOpen] = useState(false);
  // Also wakes the coach while the page is read, so the first real request is quicker.
  const { preview } = usePreview(active.role);
  const jobLevels = preview?.known ? preview.levels : undefined;

  if (active.loading) {
    return (
      <section className="cc-card p-4 text-sm text-[color:var(--cc-ink-soft)]" aria-busy="true">
        Loading your role…
      </section>
    );
  }

  if (!active.role) {
    return (
      <section className="cc-card p-5" aria-label="The job you're preparing for">
        <p className="cc-kicker">Before you start</p>
        <h2 className="mt-1 cc-font-display text-xl text-[color:var(--cc-ink)]">What job are you going for?</h2>
        <p className="mt-1 text-sm text-[color:var(--cc-ink-soft)]">
          Interviews, guidance and certifications all tailor to it. Any job works.
        </p>
        <div className="mt-4">
          <RoleEditor />
        </div>
      </section>
    );
  }

  return (
    <section className="cc-card flex flex-wrap items-center justify-between gap-3 p-4" aria-label="The job you're preparing for">
      <div className="min-w-0">
        <p className="cc-kicker">Going for</p>
        <p className="mt-0.5 cc-font-display text-lg text-[color:var(--cc-ink)]">
          {active.role}
          {active.level && (
            <span className="text-[color:var(--cc-ink-soft)]"> · {levelLabel(active.level, jobLevels)}</span>
          )}
        </p>
        {active.overridden ? (
          <p className="mt-1 flex flex-wrap items-center gap-2 text-xs">
            <span className="cc-pill cc-pill-wheat">Just this session</span>
            {active.savedRole && (
              <button type="button" className="cc-link inline-flex items-center gap-1" onClick={active.clearOverride}>
                <RotateCcw className="h-3 w-3" aria-hidden /> Back to {active.savedRole}
              </button>
            )}
          </p>
        ) : (
          SOURCE_NOTE[active.source] && (
            <p className="mt-1 text-xs text-[color:var(--cc-ash)]">{SOURCE_NOTE[active.source]}</p>
          )
        )}
      </div>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button type="button" className="cc-btn cc-btn-ghost">
            <Pencil className="h-3.5 w-3.5" aria-hidden /> Change
          </button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-[min(26rem,calc(100vw-2rem))] p-4">
          <RoleEditor onDone={() => setOpen(false)} />
        </PopoverContent>
      </Popover>
    </section>
  );
}
