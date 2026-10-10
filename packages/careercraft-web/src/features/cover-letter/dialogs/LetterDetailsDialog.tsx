import { Loader2, X } from "lucide-react";
import { useEffect, useState } from "react";

import { CraftButton, CraftDialog } from "@/components/craft/AppPrimitives";

import type { LetterDetails } from "../types";

interface LetterDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** "save" names a new letter; "edit" changes a saved one's details. */
  mode: "save" | "edit";
  initial: LetterDetails;
  /** The user's existing categories, offered as suggestions. */
  categories: string[];
  /** Shown under the title when saving will also attach to an application. */
  attachNote?: string | null;
  onSubmit: (details: LetterDetails) => Promise<void>;
}

export const LetterDetailsDialog = ({
  open,
  onOpenChange,
  mode,
  initial,
  categories,
  attachNote,
  onSubmit,
}: LetterDetailsDialogProps) => {
  const [details, setDetails] = useState<LetterDetails>(initial);
  const [tagDraft, setTagDraft] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setDetails(initial);
      setTagDraft("");
    }
    // Reset only when the dialog opens, not on every parent render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const set = (patch: Partial<LetterDetails>) => setDetails((d) => ({ ...d, ...patch }));

  const addTag = () => {
    const t = tagDraft.trim();
    if (t && !details.tags.includes(t)) set({ tags: [...details.tags, t] });
    setTagDraft("");
  };

  const submit = async () => {
    setBusy(true);
    try {
      await onSubmit({ ...details, title: details.title.trim(), category: details.category.trim() });
    } finally {
      setBusy(false);
    }
  };

  return (
    <CraftDialog
      open={open}
      onOpenChange={onOpenChange}
      kicker={mode === "save" ? "Save letter" : "Letter details"}
      title={mode === "save" ? "Name this letter" : "Edit details"}
      description={attachNote ?? undefined}
      maxWidth="max-w-lg"
      footer={
        <>
          <CraftButton variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </CraftButton>
          <CraftButton onClick={submit} disabled={busy || !details.title.trim()}>
            {busy && <Loader2 className="w-4 h-4 animate-spin" />}
            {mode === "save" ? "Save letter" : "Save details"}
          </CraftButton>
        </>
      }
    >
      <form
        className="space-y-6"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <div>
          <label htmlFor="cl-title" className="cc-desk-field-label">
            Title
          </label>
          <input
            id="cl-title"
            autoFocus
            value={details.title}
            onChange={(e) => set({ title: e.target.value })}
            placeholder="e.g. Registered Nurse — SA Health"
            className="cc-input"
          />
        </div>

        <div>
          <label htmlFor="cl-category" className="cc-desk-field-label">
            Category <span className="text-[color:var(--cc-ash)] font-normal">optional</span>
          </label>
          <input
            id="cl-category"
            list="cl-categories"
            value={details.category}
            onChange={(e) => set({ category: e.target.value })}
            placeholder="e.g. Nursing, Graduate roles"
            className="cc-input"
          />
          <datalist id="cl-categories">
            {categories.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </div>

        <div>
          <label htmlFor="cl-tag" className="cc-desk-field-label">
            Tags <span className="text-[color:var(--cc-ash)] font-normal">optional</span>
          </label>
          {details.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {details.tags.map((t) => (
                <span key={t} className="cc-tag inline-flex items-center gap-1">
                  {t}
                  <button
                    type="button"
                    aria-label={`Remove ${t}`}
                    onClick={() => set({ tags: details.tags.filter((x) => x !== t) })}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
          <input
            id="cl-tag"
            value={tagDraft}
            onChange={(e) => setTagDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === ",") {
                e.preventDefault();
                addTag();
              }
            }}
            onBlur={addTag}
            placeholder="Type a tag and press Enter"
            className="cc-input"
          />
        </div>

        <div>
          <label htmlFor="cl-notes" className="cc-desk-field-label">
            Notes <span className="text-[color:var(--cc-ash)] font-normal">optional</span>
          </label>
          <textarea
            id="cl-notes"
            value={details.notes}
            onChange={(e) => set({ notes: e.target.value })}
            className="cc-textarea w-full min-h-[90px]"
          />
        </div>
      </form>
    </CraftDialog>
  );
};
