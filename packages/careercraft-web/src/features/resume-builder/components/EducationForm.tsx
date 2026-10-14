import { AnimatePresence, motion } from "framer-motion";
import { Plus, Trash2 } from "lucide-react";

import { CraftButton } from "@/components/craft/AppPrimitives";

import type { Education } from "../types";
import { CraftInput, CraftSection, LabelledField } from "./FormField";

interface EducationFormProps {
  education: Education[];
  onAdd: () => void;
  onRemove: (id: string) => void;
  onUpdate: <K extends keyof Education>(
    id: string,
    field: K,
    value: Education[K]
  ) => void;
}

export const EducationForm = ({
  education,
  onAdd,
  onRemove,
  onUpdate,
}: EducationFormProps) => (
  <CraftSection
    title="Education"
    sub="Degrees, TAFE courses and certificates. Most recent first."
  >
    <div className="space-y-4">
      <AnimatePresence initial={false}>
        {education.map((edu, index) => (
          <motion.article
            key={edu.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, height: 0 }}
            className="rounded-xl border border-[color:var(--cc-hair)] bg-[color:var(--cc-cream)] p-4 md:p-5"
          >
            <div className="flex items-center justify-between border-b border-[color:var(--cc-hair)] pb-3">
              <div className="text-[13px] font-medium text-[color:var(--cc-ash)]">
                {edu.degree || `Qualification ${index + 1}`}
              </div>
              <button
                type="button"
                onClick={() => onRemove(edu.id)}
                className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[13px] text-[#9C3424] transition-colors hover:bg-[rgba(194,65,45,0.08)]"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Remove
              </button>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-x-5 gap-y-4 md:grid-cols-2">
              <LabelledField label="Qualification" className="md:col-span-2">
                <CraftInput
                  value={edu.degree}
                  onChange={(e) => onUpdate(edu.id, "degree", e.target.value)}
                  placeholder="e.g. Bachelor of Business (Marketing)"
                />
              </LabelledField>
              <LabelledField label="Where you studied">
                <CraftInput
                  value={edu.school}
                  onChange={(e) => onUpdate(edu.id, "school", e.target.value)}
                  placeholder="e.g. University of Adelaide"
                />
              </LabelledField>
              <LabelledField label="Finished">
                <CraftInput
                  value={edu.graduationDate}
                  onChange={(e) => onUpdate(edu.id, "graduationDate", e.target.value)}
                  placeholder="e.g. Nov 2023, or Expected 2026"
                />
              </LabelledField>
              <LabelledField label="GPA (optional)" hint="Only worth adding if it's strong.">
                <CraftInput
                  value={edu.gpa || ""}
                  onChange={(e) => onUpdate(edu.id, "gpa", e.target.value)}
                  placeholder="e.g. 6.2/7"
                />
              </LabelledField>
              <LabelledField label="Location">
                <CraftInput
                  value={edu.location}
                  onChange={(e) => onUpdate(edu.id, "location", e.target.value)}
                  placeholder="e.g. Adelaide SA"
                />
              </LabelledField>
            </div>
          </motion.article>
        ))}
      </AnimatePresence>

      <CraftButton variant="ghost" onClick={onAdd} className="w-full">
        <Plus className="h-4 w-4" />
        Add a qualification
      </CraftButton>
    </div>
  </CraftSection>
);
