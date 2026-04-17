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
    kicker="§ Education"
    title={
      <>
        The <span className="cc-italic-wonk">schooling</span>.
      </>
    }
    sub="Degrees, institutions, and the occasional grade-point footnote."
  >
    <div className="space-y-5">
      <AnimatePresence initial={false}>
        {education.map((edu, index) => (
          <motion.article
            key={edu.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, height: 0 }}
            className="border border-[color:var(--cc-hair-strong)] bg-[color:var(--cc-cream)] p-5 md:p-6"
          >
            <div className="flex items-center justify-between pb-4 border-b border-[color:var(--cc-hair)]">
              <div className="cc-label text-[color:var(--cc-ash)]">
                Entry Nº&nbsp;{String(index + 1).padStart(2, "0")}
              </div>
              <button
                onClick={() => onRemove(edu.id)}
                className="inline-flex items-center gap-2 cc-label text-[color:var(--cc-rust-deep)] hover:text-[color:var(--cc-rust)]"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Strike
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5 mt-5">
              <LabelledField label="Degree" className="md:col-span-2">
                <CraftInput
                  value={edu.degree}
                  onChange={(e) => onUpdate(edu.id, "degree", e.target.value)}
                  placeholder="Bachelor of Science in Computer Science"
                />
              </LabelledField>
              <LabelledField label="School">
                <CraftInput
                  value={edu.school}
                  onChange={(e) => onUpdate(edu.id, "school", e.target.value)}
                  placeholder="University of California"
                />
              </LabelledField>
              <LabelledField label="Graduation">
                <CraftInput
                  value={edu.graduationDate}
                  onChange={(e) =>
                    onUpdate(edu.id, "graduationDate", e.target.value)
                  }
                  placeholder="May 2020"
                />
              </LabelledField>
              <LabelledField label="GPA (optional)">
                <CraftInput
                  value={edu.gpa || ""}
                  onChange={(e) => onUpdate(edu.id, "gpa", e.target.value)}
                  placeholder="3.8/4.0"
                />
              </LabelledField>
              <LabelledField label="Location">
                <CraftInput
                  value={edu.location}
                  onChange={(e) => onUpdate(edu.id, "location", e.target.value)}
                  placeholder="Berkeley, CA"
                />
              </LabelledField>
            </div>
          </motion.article>
        ))}
      </AnimatePresence>

      <CraftButton variant="ghost" onClick={onAdd} className="w-full">
        <Plus className="w-4 h-4" />
        Add entry
      </CraftButton>
    </div>
  </CraftSection>
);
