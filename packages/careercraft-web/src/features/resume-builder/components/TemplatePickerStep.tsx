/* Step 3 · Design. The thumbnails are static images
   (public/template-thumbnails, made by scripts/generate-template-thumbnails.mjs
   from the real PDF renderer), so the gallery shows exactly what downloads. */

import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { useState } from "react";

import { CraftButton } from "@/components/craft/AppPrimitives";

import type { TemplateId } from "../types";
import { getTemplateMeta, TEMPLATE_META } from "../types";

interface TemplatePickerStepProps {
  selectedTemplate: TemplateId;
  onSelect: (id: TemplateId) => void;
  onBack: () => void;
  onNext: () => void;
}

const CATEGORY_ORDER: Array<"Modern" | "Professional" | "Creative" | "Minimal"> = [
  "Modern",
  "Professional",
  "Creative",
  "Minimal",
];

export const TemplatePickerStep = ({
  selectedTemplate,
  onSelect,
  onBack,
  onNext,
}: TemplatePickerStepProps) => {
  const [filter, setFilter] = useState<"all" | "Modern" | "Professional" | "Creative" | "Minimal">("all");

  const visible = filter === "all"
    ? TEMPLATE_META
    : TEMPLATE_META.filter((t) => t.category === filter);

  const selectedMeta = getTemplateMeta(selectedTemplate);

  return (
    <motion.div
      key="template"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
    >
      <div className="mb-6">
        <h2 className="cc-font-display text-3xl leading-tight tracking-tight md:text-4xl">Pick a design</h2>
        <p className="mt-2 max-w-xl text-[15px] text-[color:var(--cc-ink-soft)]">
          Your words stay the same, only the look changes. You can switch any time, and each picture is the actual PDF
          you'll download.
        </p>
      </div>

      {/* Filter */}
      <div className="mb-6 flex flex-wrap gap-1.5" role="group" aria-label="Show designs">
        {(["all", ...CATEGORY_ORDER] as const).map((cat) => {
          const active = filter === cat;
          const count = cat === "all" ? TEMPLATE_META.length : TEMPLATE_META.filter((t) => t.category === cat).length;
          return (
            <button
              key={cat}
              type="button"
              aria-pressed={active}
              onClick={() => setFilter(cat)}
              className={`rounded-full border px-3.5 py-1.5 text-[13.5px] transition-colors ${
                active
                  ? "border-[color:var(--cc-ink)] bg-[color:var(--cc-ink)] font-medium text-[color:var(--cc-cream)]"
                  : "border-[color:var(--cc-hair)] bg-white text-[color:var(--cc-ink-soft)] hover:border-[color:var(--cc-ink)] hover:text-[color:var(--cc-ink)]"
              }`}
            >
              {cat === "all" ? "All" : cat}
              <span className={`ml-1.5 cc-tabular ${active ? "opacity-70" : "text-[color:var(--cc-ash)]"}`}>{count}</span>
            </button>
          );
        })}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((meta) => {
          const isSelected = selectedTemplate === meta.id;
          return (
            <button
              key={meta.id}
              type="button"
              onClick={() => onSelect(meta.id)}
              aria-pressed={isSelected}
              className={`group overflow-hidden rounded-2xl border bg-white text-left transition-[border-color,box-shadow,transform] duration-200 motion-safe:hover:-translate-y-0.5 ${
                isSelected
                  ? "border-[color:var(--cc-rust)] shadow-[0_0_0_2px_var(--cc-rust),0_18px_40px_-24px_rgba(20,22,26,0.45)]"
                  : "border-[color:var(--cc-hair)] hover:border-[color:var(--cc-hair-strong)] hover:shadow-[0_18px_40px_-26px_rgba(20,22,26,0.4)]"
              }`}
            >
              {/* Thumbnail */}
              <div
                className="relative overflow-hidden border-b border-[color:var(--cc-hair)] bg-[color:var(--cc-cream-2)]"
                style={{ aspectRatio: "794 / 1123" }}
              >
                <img
                  src={`/template-thumbnails/${meta.id}.jpg`}
                  alt={`${meta.title} design`}
                  loading="lazy"
                  className="absolute inset-0 h-full w-full object-cover"
                />
                {isSelected && (
                  <div className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-[color:var(--cc-rust)] py-1 pl-2 pr-2.5 text-[12.5px] font-medium text-white shadow-sm">
                    <Check className="h-3.5 w-3.5" />
                    Selected
                  </div>
                )}
              </div>
              {/* Body */}
              <div className="p-4">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="cc-font-display text-lg font-semibold leading-tight tracking-tight">{meta.title}</h3>
                  <span className="shrink-0 rounded-full bg-[color:var(--cc-cream-2)] px-2 py-0.5 text-[12px] text-[color:var(--cc-ink-soft)]">
                    {meta.category}
                  </span>
                </div>
                <p className="mt-1 text-[14px] leading-snug text-[color:var(--cc-ink-soft)]">{meta.description}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Sticky bar: the pick and the next step stay in reach while browsing. */}
      <div className="sticky bottom-3 z-20 mt-8">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[color:var(--cc-hair)] bg-white/95 px-4 py-3 shadow-[0_18px_40px_-20px_rgba(20,22,26,0.4)] backdrop-blur-sm md:px-5">
          <div className="min-w-0">
            <div className="text-[12.5px] text-[color:var(--cc-ash)]">Your pick</div>
            <div className="truncate cc-font-display text-lg font-semibold leading-tight tracking-tight">
              {selectedMeta ? selectedMeta.title : "Nothing picked yet"}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <CraftButton variant="ghost" size="sm" onClick={onBack}>
              <ArrowLeft className="h-4 w-4" />
              Back
            </CraftButton>
            <CraftButton onClick={onNext} size="sm">
              Check and download
              <ArrowRight className="h-4 w-4" />
            </CraftButton>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
