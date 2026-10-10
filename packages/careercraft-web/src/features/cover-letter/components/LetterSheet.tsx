import { Check, Copy, Download, Loader2 } from "lucide-react";
import { useLayoutEffect, useRef } from "react";

import { CraftButton } from "@/components/craft/AppPrimitives";

import { letterDate } from "../lib/letterLabel";
import type { LetterTone } from "../types";
import { PostageStamp } from "./PostageStamp";

interface LetterSheetProps {
  tone: LetterTone;
  text: string;
  onChange: (text: string) => void;
  generating: boolean;
  /** Role and company when this letter is for a tracked application. */
  stamp: { role: string; company: string } | null;
  onCopy: () => void;
  onDownload: () => void;
  onSave: () => void;
  saveLabel: string;
  saving: boolean;
  /** True when the sheet matches what's saved, so Save has nothing to do. */
  saved: boolean;
}

const countWords = (s: string) => (s.trim() ? s.trim().split(/\s+/).length : 0);

export const LetterSheet = ({
  tone,
  text,
  onChange,
  generating,
  stamp,
  onCopy,
  onDownload,
  onSave,
  saveLabel,
  saving,
  saved,
}: LetterSheetProps) => {
  const ref = useRef<HTMLTextAreaElement>(null);

  // Grow with the letter so the sheet reads like a page, not a scroll box.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [text, generating]);

  const words = countWords(text);
  const empty = !text.trim();

  return (
    <div>
      <article data-tone={tone} className="cc-desk-sheet" aria-busy={generating}>
        <div className="cc-desk-band" />

        <div className="relative px-6 sm:px-10 md:px-14 pt-8 md:pt-10 pb-10 md:pb-14">
          <div className="flex items-start justify-between gap-6 min-h-[5.5rem]">
            <div className="cc-desk-date pt-1">{letterDate(new Date().toISOString())}</div>
            {stamp && (
              <PostageStamp
                tone={tone}
                primary={stamp.role}
                secondary={stamp.company}
                className="shrink-0 -mt-2"
              />
            )}
          </div>

          {generating ? (
            <div className="cc-desk-ink mt-6" role="status" aria-label="Writing your letter">
              {[92, 100, 96, 70, 0, 100, 94, 98, 88, 60, 0, 97, 100, 82].map((w, i) =>
                w ? <span key={i} style={{ width: `${w}%` }} /> : <i key={i} />,
              )}
            </div>
          ) : (
            <textarea
              ref={ref}
              value={text}
              onChange={(e) => onChange(e.target.value)}
              aria-label="Cover letter"
              placeholder="Write it here, paste one you already have, or fill in the brief and write it from your résumé."
              className="cc-desk-body mt-6"
              spellCheck
            />
          )}
        </div>
      </article>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <div className="cc-label-sm cc-tabular text-[color:var(--cc-ash)]">
          {words > 0 ? `${words} words` : "Empty"}
        </div>
        <div className="flex flex-wrap gap-2">
          <CraftButton variant="ghost" size="sm" onClick={onCopy} disabled={empty || generating}>
            <Copy className="w-4 h-4" />
            Copy
          </CraftButton>
          <CraftButton variant="ghost" size="sm" onClick={onDownload} disabled={empty || generating}>
            <Download className="w-4 h-4" />
            Download
          </CraftButton>
          <CraftButton size="sm" onClick={onSave} disabled={empty || generating || saving || saved}>
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : saved ? (
              <Check className="w-4 h-4" />
            ) : null}
            {saved ? "Saved" : saveLabel}
          </CraftButton>
        </div>
      </div>
    </div>
  );
};
