/* Save a résumé to My Résumés, with a category and tags. */

import { Check, Plus, X } from "lucide-react";
import { useState } from "react";

import { CraftButton, CraftDialog } from "@/components/craft/AppPrimitives";
import { CraftSpinner } from "@/components/craft/CraftSpinner";

import { CraftInput, LabelledField } from "../components/FormField";
import { CATEGORIES, PRESET_TAGS } from "../types";

interface SaveResumeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;

  resumeName: string;
  onResumeNameChange: (v: string) => void;

  category: string;
  onCategoryChange: (v: string) => void;

  tags: string[];
  onTagsChange: (tags: string[]) => void;

  isSaving: boolean;
  isUpdate: boolean;
  onSave: () => void;
}

const SUBLABEL = "mb-2 block text-[13px] font-medium text-[color:var(--cc-ink-soft)]";

export const SaveResumeDialog = ({
  open,
  onOpenChange,
  resumeName,
  onResumeNameChange,
  category,
  onCategoryChange,
  tags,
  onTagsChange,
  isSaving,
  isUpdate,
  onSave,
}: SaveResumeDialogProps) => {
  const [draftTag, setDraftTag] = useState("");

  const commitTag = () => {
    const t = draftTag.trim();
    if (!t || tags.includes(t)) return;
    onTagsChange([...tags, t]);
    setDraftTag("");
  };

  const addPreset = (tag: string) => {
    if (tags.includes(tag)) return;
    onTagsChange([...tags, tag]);
  };

  const removeTag = (tag: string) => {
    onTagsChange(tags.filter((t) => t !== tag));
  };

  return (
    <CraftDialog
      open={open}
      onOpenChange={onOpenChange}
      title={isUpdate ? "Save changes" : "Save your résumé"}
      description="Give it a name you'll recognise. A category and tags help you find it in My Résumés."
      maxWidth="max-w-lg"
      footer={
        <>
          <CraftButton variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </CraftButton>
          <CraftButton onClick={onSave} disabled={isSaving}>
            {isSaving ? (
              <>
                <CraftSpinner size="sm" label="Saving" />
                Saving…
              </>
            ) : (
              <>
                <Check className="h-4 w-4" />
                {isUpdate ? "Save changes" : "Save"}
              </>
            )}
          </CraftButton>
        </>
      }
    >
      <div className="space-y-5">
        {/* Name */}
        <LabelledField label="Name" required>
          <CraftInput
            value={resumeName}
            onChange={(e) => onResumeNameChange(e.target.value)}
            placeholder="e.g. Admin roles, SA Health"
          />
        </LabelledField>

        {/* Category */}
        <div>
          <span className={SUBLABEL}>Category</span>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Category">
            {CATEGORIES.map((cat) => {
              const active = category === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => onCategoryChange(cat.id)}
                  className={`rounded-full border px-3.5 py-1.5 text-[13.5px] transition-colors ${
                    active
                      ? "border-[color:var(--cc-ink)] bg-[color:var(--cc-ink)] font-medium text-[color:var(--cc-cream)]"
                      : "border-[color:var(--cc-hair)] bg-white text-[color:var(--cc-ink-soft)] hover:border-[color:var(--cc-ink)] hover:text-[color:var(--cc-ink)]"
                  }`}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tags */}
        <div>
          <span className={SUBLABEL}>Tags</span>
          {tags.length === 0 ? (
            <p className="text-[14px] text-[color:var(--cc-ash)]">None yet. Add one below or pick a suggestion.</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 rounded-full bg-[color:var(--cc-ink)] py-1 pl-3 pr-1.5 text-[13px] text-[color:var(--cc-cream)]"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="grid h-5 w-5 place-items-center rounded-full hover:bg-white/20"
                    aria-label={`Remove ${tag}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}

          <div className="mt-3 flex items-center gap-2">
            <div className="flex-1">
              <CraftInput
                value={draftTag}
                onChange={(e) => setDraftTag(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    commitTag();
                  }
                }}
                placeholder="Add your own tag"
                aria-label="Add your own tag"
              />
            </div>
            <CraftButton variant="ghost" size="sm" onClick={commitTag} disabled={!draftTag.trim()}>
              <Plus className="h-3.5 w-3.5" />
              Add
            </CraftButton>
          </div>

          {/* Suggestions */}
          <div className="mt-4">
            <span className={SUBLABEL}>Suggestions</span>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_TAGS.filter((t) => !tags.includes(t))
                .slice(0, 8)
                .map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => addPreset(tag)}
                    className="inline-flex items-center gap-1 rounded-full border border-dashed border-[color:var(--cc-hair-strong)] px-3 py-1 text-[13px] text-[color:var(--cc-ink-soft)] transition-colors hover:border-solid hover:border-[color:var(--cc-rust)] hover:text-[color:var(--cc-rust)]"
                  >
                    <Plus className="h-3 w-3" />
                    {tag}
                  </button>
                ))}
            </div>
          </div>
        </div>
      </div>
    </CraftDialog>
  );
};
