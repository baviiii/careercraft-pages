/**
 * Explain any idea in layers: the intuition, then working knowledge, then
 * what an interviewer probes for, with a worked example and the usual
 * mistakes. Backed by a real source when the coach finds one.
 */
import { useState } from "react";
import { ArrowUpRight, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { careerCoach, CoachUnavailableError, type ConceptExplanation } from "@/lib/careerCoach";

const LEVELS = [
  { id: "eli5", label: "Simply" },
  { id: "working", label: "Working knowledge" },
  { id: "interview", label: "Interview-grade" },
] as const;

type Level = (typeof LEVELS)[number]["id"];

export function ExplainConcept({ field }: { field?: string }) {
  const { toast } = useToast();
  const [concept, setConcept] = useState("");
  const [level, setLevel] = useState<Level>("working");
  const [explanation, setExplanation] = useState<ConceptExplanation | null>(null);
  const [explaining, setExplaining] = useState(false);

  const explain = async () => {
    if (concept.trim().length < 2) return;
    setExplaining(true);
    try {
      setExplanation(await careerCoach.explainConcept({ concept: concept.trim(), level, field: field || undefined }));
    } catch (e) {
      toast({
        title: "Not available",
        description: e instanceof CoachUnavailableError ? e.message : "The coach isn't available at the moment.",
        variant: "destructive",
      });
    } finally {
      setExplaining(false);
    }
  };

  const layers = explanation?.levels
    ? [
        { label: "The intuition", text: explanation.levels.intuition },
        { label: "Working knowledge", text: explanation.levels.working },
        { label: "Interview-grade", text: explanation.levels.interviewGrade },
      ].filter((l) => l.text)
    : [];

  return (
    <div className="space-y-6 pt-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void explain();
        }}
        className="space-y-4"
      >
        <div>
          <label htmlFor="explain-concept" className="st-label st-label--muted">
            What should the coach explain?
          </label>
          <input
            id="explain-concept"
            value={concept}
            onChange={(e) => setConcept(e.target.value)}
            maxLength={200}
            placeholder="e.g. duty of care, eventual consistency, a cash-flow forecast"
            className="st-input mt-1 text-[17px]"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {LEVELS.map((l) => (
            <button key={l.id} type="button" aria-pressed={level === l.id} onClick={() => setLevel(l.id)} className="st-chip">
              {l.label}
            </button>
          ))}
          <button type="submit" disabled={explaining || concept.trim().length < 2} className="cc-action cc-action--sm ml-auto">
            {explaining ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Explaining…
              </>
            ) : (
              "Explain"
            )}
          </button>
        </div>
      </form>

      {explanation && (
        <div className="space-y-6">
          {layers.length > 0 && (
            <div className="st-layers">
              {layers.map((l) => (
                <div key={l.label} className="st-layer">
                  <p className="st-label">{l.label}</p>
                  <p>{l.text}</p>
                </div>
              ))}
            </div>
          )}

          {explanation.workedExample && (
            <div className="st-note">
              <span>
                <span className="st-label st-label--muted mb-1 block">Worked example</span>
                {explanation.workedExample}
              </span>
            </div>
          )}

          {((explanation.commonPitfalls?.length ?? 0) > 0 || (explanation.interviewAngles?.length ?? 0) > 0) && (
            <div className="grid gap-6 md:grid-cols-2">
              {(explanation.commonPitfalls?.length ?? 0) > 0 && (
                <div>
                  <p className="st-label st-label--muted">Common mistakes</p>
                  <ul className="mt-1">
                    {explanation.commonPitfalls!.map((p, i) => (
                      <li key={i} className="st-check">
                        <span className="st-box" aria-hidden />
                        {p}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {(explanation.interviewAngles?.length ?? 0) > 0 && (
                <div>
                  <p className="st-label st-label--muted">How interviewers probe it</p>
                  <ul className="mt-1">
                    {explanation.interviewAngles!.map((p, i) => (
                      <li key={i} className="st-check">
                        <span className="st-box" aria-hidden />
                        {p}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {explanation.proof && (
            <a href={explanation.proof.url} target="_blank" rel="noreferrer" className="st-textbtn inline-flex items-center gap-1.5">
              Backed by {explanation.proof.label}
              {explanation.proof.stat ? ` · ${explanation.proof.stat}` : ""}
              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
            </a>
          )}
        </div>
      )}
    </div>
  );
}
