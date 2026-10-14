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
      title="Tags"
      description={`Short labels to find “${resume?.name || "this résumé"}” later, like Graduate, Remote or Final.`}
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
          <div className="mb-2 cc-font-sans text-[13px] font-medium text-[color:var(--cc-ink-soft)]">On this résumé</div>
          {selected.length === 0 ? (
            <p className="cc-font-sans text-[14px] text-[color:var(--cc-ash)]">None yet. Add one below or pick a suggestion.</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {selected.map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center gap-1 rounded-full bg-[color:var(--cc-ink)] py-1 pl-3 pr-1.5 cc-font-sans text-[13px] text-[color:var(--cc-cream)]"
                >
                  {t}
                  <button
                    type="button"
                    onClick={() => remove(t)}
                    className="grid h-5 w-5 place-items-center rounded-full hover:bg-white/20"
                    aria-label={`Remove ${t}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Add new */}
        <div className="flex items-end gap-2">
          <label className="flex-1">
            <span className="mb-2 block cc-font-sans text-[13px] font-medium text-[color:var(--cc-ink-soft)]">Add a tag</span>
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && add()}
              className="cc-field"
              placeholder="e.g. Hospital roles, Grad programs"
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
          <div className="mb-2 cc-font-sans text-[13px] font-medium text-[color:var(--cc-ink-soft)]">Suggestions</div>
          <div className="flex flex-wrap gap-1.5">
            {PRESET_TAGS.filter((t) => !selected.includes(t))
              .slice(0, 10)
              .map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setSelected((p) => [...p, t])}
                  className="inline-flex items-center gap-1 rounded-full border border-dashed border-[color:var(--cc-hair-strong)] px-3 py-1 cc-font-sans text-[13px] text-[color:var(--cc-ink-soft)] transition-colors hover:border-solid hover:border-[color:var(--cc-rust)] hover:text-[color:var(--cc-rust)]"
                >
                  <Plus className="h-3 w-3" />
                  {t}
                </button>
              ))}
          </div>
        </div>
      </div>
    </CraftDialog>
  );
};
