import { Plus, X } from "lucide-react";
import { useState } from "react";

import { CraftInput, CraftSection } from "./FormField";

interface SkillsFormProps {
  skills: string[];
  onAdd: (skill: string) => void;
  onRemove: (skill: string) => void;
}

export const SkillsForm = ({ skills, onAdd, onRemove }: SkillsFormProps) => {
  const [draft, setDraft] = useState("");

  const commit = () => {
    if (!draft.trim()) return;
    onAdd(draft);
    setDraft("");
  };

  return (
    <CraftSection
      kicker="§ Skills"
      title={
        <>
          The <span className="cc-italic-wonk">toolkit</span>.
        </>
      }
      sub="Stacks, languages, craft — the things you reach for."
    >
      {/* Current skills */}
      <div className="flex flex-wrap gap-1.5 mb-5 min-h-[2rem]">
        {skills.length === 0 ? (
          <p className="cc-font-editorial italic text-[color:var(--cc-ink-soft)]">
            Nothing filed yet. Start typing below.
          </p>
        ) : (
          skills.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onRemove(s)}
              className="cc-pill cc-pill-filled group"
              aria-label={`Remove ${s}`}
            >
              {s}
              <X className="w-3 h-3 ml-1 opacity-60 group-hover:opacity-100" />
            </button>
          ))
        )}
      </div>

      {/* Add new */}
      <div className="flex items-end gap-3">
        <div className="flex-1">
          <CraftInput
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                commit();
              }
            }}
            placeholder="Type a skill and press Enter…"
          />
        </div>
        <button
          type="button"
          onClick={commit}
          className="cc-btn cc-btn-ghost"
          style={{ padding: "0.8rem 1.1rem" }}
          disabled={!draft.trim()}
        >
          <Plus className="w-4 h-4" />
          Add
        </button>
      </div>
    </CraftSection>
  );
};
