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
      title="Skills"
      sub="Tools, software and know-how. Use the words job ads use, so they match."
    >
      {/* Current skills */}
      <div className="mb-5 flex min-h-[2rem] flex-wrap gap-1.5">
        {skills.length === 0 ? (
          <p className="text-[14px] text-[color:var(--cc-ash)]">No skills added yet. Type one below.</p>
        ) : (
          skills.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onRemove(s)}
              className="group inline-flex items-center gap-1 rounded-full bg-[color:var(--cc-cream-2)] py-1 pl-3 pr-2 text-[13.5px] text-[color:var(--cc-ink)] transition-colors hover:bg-[rgba(194,65,45,0.1)]"
              aria-label={`Remove ${s}`}
              title="Remove"
            >
              {s}
              <X className="h-3.5 w-3.5 text-[color:var(--cc-ash)] group-hover:text-[#9C3424]" />
            </button>
          ))
        )}
      </div>

      {/* Add new */}
      <div className="flex items-center gap-2">
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
            placeholder="e.g. Excel, customer service, forklift licence"
            aria-label="Add a skill"
          />
        </div>
        <button
          type="button"
          onClick={commit}
          className="cc-action cc-action--ghost cc-action--sm"
          disabled={!draft.trim()}
        >
          <Plus className="h-4 w-4" />
          Add
        </button>
      </div>
      <p className="mt-2 text-[12.5px] text-[color:var(--cc-ash)]">Press Enter to add. Tap a skill to remove it.</p>
    </CraftSection>
  );
};
