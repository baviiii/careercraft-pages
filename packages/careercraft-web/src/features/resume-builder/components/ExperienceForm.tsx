import { AnimatePresence, motion } from "framer-motion";
import { PenLine, Plus, Target, Trash2, X } from "lucide-react";

import { CraftButton } from "@/components/craft/AppPrimitives";
import { CraftSpinner } from "@/components/craft/CraftSpinner";

import type { Experience } from "../types";
import { CraftInput, CraftSection, CraftTextarea, LabelledField } from "./FormField";

interface ExperienceFormProps {
  experience: Experience[];
  jobDescription: string;
  rewritingBulletId: string | null;
  onAdd: () => void;
  onRemove: (id: string) => void;
  onUpdate: <K extends keyof Experience>(
    id: string,
    field: K,
    value: Experience[K]
  ) => void;
  onAddBullet: (expId: string) => void;
  onUpdateBullet: (expId: string, index: number, value: string) => void;
  onRemoveBullet: (expId: string, index: number) => void;
  onRewriteBullet: (expId: string, bulletIndex: number) => void;
}

export const ExperienceForm = ({
  experience,
  jobDescription,
  rewritingBulletId,
  onAdd,
  onRemove,
  onUpdate,
  onAddBullet,
  onUpdateBullet,
  onRemoveBullet,
  onRewriteBullet,
}: ExperienceFormProps) => (
  <CraftSection
    title="Work experience"
    sub="Most recent first. A few short points per job: what you did, and what came of it."
    right={
      jobDescription ? (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[color:var(--cc-rust-soft)] px-2.5 py-1 text-[12.5px] font-medium text-[color:var(--cc-rust-deep)]">
          <Target className="h-3.5 w-3.5" />
          Tailoring to a job ad
        </span>
      ) : null
    }
  >
    <div className="space-y-4">
      <AnimatePresence initial={false}>
        {experience.map((exp, index) => (
          <motion.article
            key={exp.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, height: 0 }}
            className="rounded-xl border border-[color:var(--cc-hair)] bg-[color:var(--cc-cream)] p-4 md:p-5"
          >
            <div className="flex items-center justify-between border-b border-[color:var(--cc-hair)] pb-3">
              <div className="text-[13px] font-medium text-[color:var(--cc-ash)]">
                {exp.title ? `${exp.title}${exp.company ? ` · ${exp.company}` : ""}` : `Job ${index + 1}`}
              </div>
              <button
                type="button"
                onClick={() => onRemove(exp.id)}
                className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[13px] text-[#9C3424] transition-colors hover:bg-[rgba(194,65,45,0.08)]"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Remove
              </button>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-x-5 gap-y-4 md:grid-cols-2">
              <LabelledField label="Job title">
                <CraftInput
                  value={exp.title}
                  onChange={(e) => onUpdate(exp.id, "title", e.target.value)}
                  placeholder="e.g. Data Analyst"
                />
              </LabelledField>
              <LabelledField label="Employer">
                <CraftInput
                  value={exp.company}
                  onChange={(e) => onUpdate(exp.id, "company", e.target.value)}
                  placeholder="e.g. SA Health"
                />
              </LabelledField>
              <LabelledField label="Location">
                <CraftInput
                  value={exp.location}
                  onChange={(e) => onUpdate(exp.id, "location", e.target.value)}
                  placeholder="e.g. Adelaide SA"
                />
              </LabelledField>
              <div className="grid grid-cols-2 gap-3">
                <LabelledField label="Started">
                  <CraftInput
                    value={exp.startDate}
                    onChange={(e) => onUpdate(exp.id, "startDate", e.target.value)}
                    placeholder="e.g. Mar 2022"
                  />
                </LabelledField>
                <LabelledField label="Finished">
                  <CraftInput
                    value={exp.current ? "Present" : exp.endDate}
                    onChange={(e) => onUpdate(exp.id, "endDate", e.target.value)}
                    placeholder="Present"
                  />
                </LabelledField>
              </div>
            </div>

            {/* Points */}
            <div className="mt-5">
              <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
                <div className="text-[13px] font-medium text-[color:var(--cc-ink-soft)]">What you did</div>
                <span className="text-[12.5px] text-[color:var(--cc-ash)]">
                  {jobDescription ? "Tap the pen to tailor a point to the job ad." : "Add the job ad (top of the page) to tailor points to it."}
                </span>
              </div>
              <ul className="space-y-2.5">
                {exp.bullets.map((bullet, bulletIndex) => {
                  const rewriting = rewritingBulletId === `${exp.id}-${bulletIndex}`;
                  return (
                    <li key={bulletIndex} className="group flex items-start gap-2.5">
                      <span className="w-3 flex-shrink-0 pt-3 text-center text-[color:var(--cc-ash)]" aria-hidden>
                        •
                      </span>
                      <CraftTextarea
                        value={bullet}
                        onChange={(e) => onUpdateBullet(exp.id, bulletIndex, e.target.value)}
                        placeholder="e.g. Cut weekly reporting time by 40% by automating the data pull."
                        aria-label={`Point ${bulletIndex + 1}`}
                        className="min-h-[72px] flex-1"
                      />
                      <div className="flex flex-col gap-1 pt-1">
                        <button
                          type="button"
                          onClick={() => onRewriteBullet(exp.id, bulletIndex)}
                          disabled={rewriting || !bullet.trim()}
                          title={jobDescription ? "Rewrite this point for the job ad" : "Add the job ad first"}
                          aria-label="Rewrite this point for the job ad"
                          className="grid h-8 w-8 place-items-center rounded-lg text-[color:var(--cc-ink-soft)] transition-colors hover:bg-[color:var(--cc-rust-soft)] hover:text-[color:var(--cc-rust)] disabled:opacity-40"
                        >
                          {rewriting ? <CraftSpinner size="sm" label="Rewriting" /> : <PenLine className="h-4 w-4" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => onRemoveBullet(exp.id, bulletIndex)}
                          disabled={exp.bullets.length <= 1}
                          title="Remove this point"
                          aria-label="Remove this point"
                          className="grid h-8 w-8 place-items-center rounded-lg text-[color:var(--cc-ash)] transition-colors hover:bg-[color:var(--cc-cream-2)] hover:text-[color:var(--cc-ink)] disabled:opacity-40"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
              <button
                type="button"
                onClick={() => onAddBullet(exp.id)}
                className="mt-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[13px] font-medium text-[color:var(--cc-rust)] transition-colors hover:bg-[color:var(--cc-rust-soft)]"
              >
                <Plus className="h-3.5 w-3.5" />
                Add a point
              </button>
            </div>
          </motion.article>
        ))}
      </AnimatePresence>

      <CraftButton variant="ghost" onClick={onAdd} className="w-full">
        <Plus className="h-4 w-4" />
        Add a job
      </CraftButton>
    </div>
  </CraftSection>
);
