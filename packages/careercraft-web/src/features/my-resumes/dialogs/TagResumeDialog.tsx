import { Plus, X } from "lucide-react";
import { useEffect, useState } from "react";

import { CraftButton, CraftDialog } from "@/components/craft/AppPrimitives";

import { PRESET_TAGS } from "../types";
import type { Resume } from "../types";

interface TagResumeDialogProps {
  resume: Resume | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (tags: string[]) => void;
}

export const TagResumeDialog = ({
  resume,
  open,
  onOpenChange,
  onSave,
}: TagResumeDialogProps) => {
  const [selected, setSelected] = useState<string[]>([]);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    if (resume) setSelected(resume.tags || []);
    if (!open) setDraft("");
  }, [resume, open]);

  const add = () => {
    const t = draft.trim();
    if (t && !selected.includes(t)) {
      setSelected((p) => [...p, t]);
      setDraft("");
    }
  };
  const remove = (t: string) => setSelected((p) => p.filter((x) => x !== t));

  return (
    <CraftDialog
      open={open}
      onOpenChange={onOpenChange}
      kicker="§ Catalogue"
      title="Pin tags to this draft"
      description="Labels for shelf organisation — roles, seniority, stage of life."
      maxWidth="max-w-lg"
      footer={
        <>
          <CraftButton variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </CraftButton>
          <CraftButton onClick={() => onSave(selected)}>Save tags</CraftButton>
        </>
      }
    >
      <div className="space-y-5">
        {/* Current tags */}
        <div>
          <div className="cc-label text-[color:var(--cc-ash)] mb-2">On file</div>
          {selected.length === 0 ? (
            <p className="cc-font-editorial italic text-[color:var(--cc-ink-soft)]">
              No tags yet — start typing below or pick from the suggestions.
            </p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {selected.map((t) => (
                <span key={t} className="cc-pill cc-pill-filled group">
                  {t}
                  <button
                    onClick={() => remove(t)}
                    className="ml-1 hover:text-[color:var(--cc-rust)]"
                    aria-label={`Remove ${t}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Add new */}
        <div className="flex items-end gap-2">
          <label className="flex-1">
            <span className="cc-label text-[color:var(--cc-ash)] block mb-2">
              Add a new tag
            </span>
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && add()}
              className="cc-input w-full"
              placeholder="e.g. Product, FAANG, Dream-job…"
            />
          </label>
          <CraftButton
            variant="ghost"
            size="sm"
            onClick={add}
            disabled={!draft.trim()}
          >
            <Plus className="w-3 h-3" />
            Add
          </CraftButton>
        </div>

        {/* Suggestions */}
        <div>
          <div className="cc-label text-[color:var(--cc-ash)] mb-2">
            Suggestions
          </div>
          <div className="flex flex-wrap gap-1.5">
            {PRESET_TAGS.filter((t) => !selected.includes(t))
              .slice(0, 10)
              .map((t) => (
                <button
                  key={t}
                  onClick={() => setSelected((p) => [...p, t])}
                  className="cc-pill hover:cc-pill-filled hover:bg-[color:var(--cc-ink)] hover:text-[color:var(--cc-cream)] transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  {t}
                </button>
              ))}
          </div>
        </div>
      </div>
    </CraftDialog>
  );
};
