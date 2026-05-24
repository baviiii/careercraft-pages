/* ───────────────────────────────────────────────────────────
   § 03 · Template — pick the layout.
   Scaled thumbnails of every template in @/lib/templateMap.
   ─────────────────────────────────────────────────────────── */

import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { useMemo, useState } from "react";

import { CraftButton } from "@/components/craft/AppPrimitives";
import type { TemplateData } from "@/components/templates/types";
import { TEMPLATE_MAP } from "@/lib/templateMap";

import { resumeToTemplateData } from "../lib/resumeData";
import type { ResumeData, TemplateId } from "../types";
import { TEMPLATE_META } from "../types";

interface TemplatePickerStepProps {
  resumeData: ResumeData;
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
  resumeData,
  selectedTemplate,
  onSelect,
  onBack,
  onNext,
}: TemplatePickerStepProps) => {
  const [filter, setFilter] = useState<"all" | "Modern" | "Professional" | "Creative" | "Minimal">("all");
  const templateData: TemplateData = useMemo(
    () => resumeToTemplateData(resumeData),
    [resumeData]
  );

  const visible = filter === "all"
    ? TEMPLATE_META
    : TEMPLATE_META.filter((t) => t.category === filter);

  return (
    <motion.div
      key="template"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
    >
      <div className="mb-10">
        <div className="cc-label text-[color:var(--cc-rust)]">§ 03 · Template</div>
        <h2 className="mt-3 cc-font-display text-4xl md:text-5xl leading-[0.95] tracking-tight">
          Pick a <span className="cc-italic-wonk">template</span>.
        </h2>
        <p className="mt-3 cc-font-editorial italic text-xl text-[color:var(--cc-ink-soft)] max-w-xl">
          Same content, different layout. Switch any time — your writing stays put.
        </p>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-1.5 mb-8">
        {(["all", ...CATEGORY_ORDER] as const).map((cat) => {
          const active = filter === cat;
          return (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`cc-pill ${active ? "cc-pill-filled" : ""}`}
            >
              {cat === "all" ? "All templates" : cat}
            </button>
          );
        })}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {visible.map((meta, i) => {
          const Component = TEMPLATE_MAP[meta.id];
          const isSelected = selectedTemplate === meta.id;
          return (
            <button
              key={meta.id}
              onClick={() => onSelect(meta.id)}
              className={`text-left bg-[color:var(--cc-cream)] transition-all ${
                isSelected
                  ? "border-2 border-[color:var(--cc-ink)] shadow-[0_20px_60px_-20px_rgba(14,12,10,0.35)]"
                  : "border border-[color:var(--cc-hair-strong)] hover:border-[color:var(--cc-ink)]"
              }`}
            >
              {/* Thumbnail */}
              <div className="relative h-56 bg-white overflow-hidden border-b border-[color:var(--cc-hair-strong)]">
                <div
                  style={{
                    transform: "scale(0.3)",
                    transformOrigin: "top left",
                    width: "333%",
                    height: "333%",
                  }}
                  className="pointer-events-none"
                >
                  {Component && <Component data={templateData} isPreview />}
                </div>
                {isSelected && (
                  <div className="absolute top-3 right-3 w-9 h-9 bg-[color:var(--cc-ink)] text-[color:var(--cc-cream)] inline-flex items-center justify-center">
                    <Check className="w-4 h-4" />
                  </div>
                )}
              </div>
              {/* Body */}
              <div className="p-5">
                <div className="flex items-center justify-between">
                  <div className="cc-label text-[color:var(--cc-rust)]">
                    {romanish(i + 1)} · {meta.category}
                  </div>
                </div>
                <h3 className="mt-2 cc-font-display text-2xl leading-tight tracking-tight">
                  {meta.title}
                </h3>
                <p className="mt-2 cc-font-editorial italic text-[15px] text-[color:var(--cc-ink-soft)]">
                  {meta.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Step nav */}
      <div className="flex items-center justify-between mt-12">
        <button onClick={onBack} className="cc-btn cc-btn-ghost">
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <CraftButton onClick={onNext}>
          Preview &amp; export
          <ArrowRight className="w-4 h-4" />
        </CraftButton>
      </div>
    </motion.div>
  );
};

function romanish(n: number): string {
  if (n <= 0) return "";
  const table: [number, string][] = [
    [50, "L"],
    [40, "XL"],
    [10, "X"],
    [9, "IX"],
    [5, "V"],
    [4, "IV"],
    [1, "I"],
  ];
  let out = "";
  let rem = n;
  for (const [v, s] of table) {
    while (rem >= v) {
      out += s;
      rem -= v;
    }
  }
  return out;
}
