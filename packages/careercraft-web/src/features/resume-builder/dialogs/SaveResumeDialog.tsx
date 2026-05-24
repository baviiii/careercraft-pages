/* Save a résumé to the cabinet — with category + tag metadata. */

import { Check, Loader2, Plus, X } from "lucide-react";
import { useState } from "react";

import { CraftButton, CraftDialog } from "@/components/craft/AppPrimitives";

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
      kicker={isUpdate ? "§ Update resume" : "§ Save resume"}
      title={
        isUpdate ? (
          <>
            Update the <span className="cc-italic-wonk">entry</span>.
          </>
        ) : (
          <>
            Save this <span className="cc-italic-wonk">resume</span>.
          </>
        )
      }
      description="Name it, pick a category, and add tags so you can find it later."
      maxWidth="max-w-lg"
      footer={
        <>
          <button
            onClick={() => onOpenChange(false)}
            className="cc-btn cc-btn-ghost"
          >
            Cancel
          </button>
          <CraftButton onClick={onSave} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving…
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                {isUpdate ? "Update" : "Save"}
              </>
            )}
          </CraftButton>
        </>
      }
    >
      <div className="space-y-6">
        {/* Name */}
        <LabelledField label="Resume title" required>
          <CraftInput
            value={resumeName}
            onChange={(e) => onResumeNameChange(e.target.value)}
            placeholder="Software Engineer — Google"
          />
        </LabelledField>

        {/* Category */}
        <div>
          <div className="cc-label text-[color:var(--cc-ash)]">Category</div>
          <div className="mt-2 grid grid-cols-2 md:grid-cols-5 gap-px bg-[color:var(--cc-hair-strong)] border border-[color:var(--cc-hair-strong)]">
            {CATEGORIES.map((cat) => {
              const active = category === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => onCategoryChange(cat.id)}
                  className={`px-3 py-3 text-center transition-colors cc-label ${
                    active
                      ? "bg-[color:var(--cc-ink)] text-[color:var(--cc-cream)]"
                      : "bg-[color:var(--cc-cream)] text-[color:var(--cc-ink)] hover:bg-[color:var(--cc-cream-2)]"
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
          <div className="cc-label text-[color:var(--cc-ash)]">Tags</div>

          <div className="mt-2 flex flex-wrap gap-1.5 min-h-[2rem]">
            {tags.length === 0 ? (
              <span className="cc-font-editorial italic text-[color:var(--cc-ink-soft)]">
                None yet.
              </span>
            ) : (
              tags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => removeTag(tag)}
                  className="cc-pill cc-pill-filled group"
                >
                  {tag}
                  <X className="w-3 h-3 ml-1 opacity-60 group-hover:opacity-100" />
                </button>
              ))
            )}
          </div>

          <div className="mt-3 flex items-end gap-2">
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
                placeholder="Custom tag…"
              />
            </div>
            <button
              type="button"
              onClick={commitTag}
              disabled={!draftTag.trim()}
              className="cc-btn cc-btn-ghost"
              style={{ padding: "0.8rem 1.1rem" }}
            >
              <Plus className="w-4 h-4" />
              Add
            </button>
          </div>

          {/* Preset tags */}
          <div className="mt-4">
            <div className="cc-label text-[color:var(--cc-ash)] mb-2">
              Quick-add
            </div>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_TAGS.filter((t) => !tags.includes(t)).slice(0, 8).map(
                (tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => addPreset(tag)}
                    className="cc-pill"
                  >
                    <Plus className="w-3 h-3" />
                    {tag}
                  </button>
                )
              )}
            </div>
          </div>
        </div>
      </div>
    </CraftDialog>
  );
};
