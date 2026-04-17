import { AnimatePresence, motion } from "framer-motion";
import { Loader2, Plus, Sparkles, Trash2, X } from "lucide-react";

import { CraftButton } from "@/components/craft/AppPrimitives";

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
    kicker="§ Experience"
    title={
      <>
        The <span className="cc-italic-wonk">ledger</span> of roles.
      </>
    }
    sub="Each chapter is a job. Short bullets, strong verbs, measured outcomes."
    right={
      jobDescription ? (
        <span className="cc-pill cc-pill-rust">
          <Sparkles className="w-3 h-3" />
          Targeting a role
        </span>
      ) : null
    }
  >
    <div className="space-y-5">
      <AnimatePresence initial={false}>
        {experience.map((exp, index) => (
          <motion.article
            key={exp.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, height: 0 }}
            className="border border-[color:var(--cc-hair-strong)] bg-[color:var(--cc-cream)] p-5 md:p-6"
          >
            <div className="flex items-center justify-between pb-4 border-b border-[color:var(--cc-hair)]">
              <div className="cc-label text-[color:var(--cc-ash)]">
                Position Nº&nbsp;{String(index + 1).padStart(2, "0")}
              </div>
              <button
                onClick={() => onRemove(exp.id)}
                className="inline-flex items-center gap-2 cc-label text-[color:var(--cc-rust-deep)] hover:text-[color:var(--cc-rust)]"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Strike
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5 mt-5">
              <LabelledField label="Job title">
                <CraftInput
                  value={exp.title}
                  onChange={(e) => onUpdate(exp.id, "title", e.target.value)}
                  placeholder="Software Engineer"
                />
              </LabelledField>
              <LabelledField label="Company">
                <CraftInput
                  value={exp.company}
                  onChange={(e) => onUpdate(exp.id, "company", e.target.value)}
                  placeholder="Tech Company Inc."
                />
              </LabelledField>
              <LabelledField label="Location">
                <CraftInput
                  value={exp.location}
                  onChange={(e) => onUpdate(exp.id, "location", e.target.value)}
                  placeholder="San Francisco, CA"
                />
              </LabelledField>
              <div className="grid grid-cols-2 gap-3">
                <LabelledField label="Start">
                  <CraftInput
                    value={exp.startDate}
                    onChange={(e) =>
                      onUpdate(exp.id, "startDate", e.target.value)
                    }
                    placeholder="Jan 2020"
                  />
                </LabelledField>
                <LabelledField label="End">
                  <CraftInput
                    value={exp.current ? "Present" : exp.endDate}
                    onChange={(e) =>
                      onUpdate(exp.id, "endDate", e.target.value)
                    }
                    placeholder="Present"
                  />
                </LabelledField>
              </div>
            </div>

            {/* Bullets */}
            <div className="mt-6">
              <div className="flex items-center justify-between mb-3">
                <div className="cc-label text-[color:var(--cc-ash)]">
                  Achievements
                </div>
                {jobDescription && (
                  <span className="cc-pill cc-pill-rust">
                    <Sparkles className="w-3 h-3" />
                    AI rewrite available
                  </span>
                )}
              </div>
              <ol className="space-y-3" style={{ counterReset: "bullets" }}>
                {exp.bullets.map((bullet, bulletIndex) => (
                  <li
                    key={bulletIndex}
                    className="flex items-start gap-3 group"
                    style={{ counterIncrement: "bullets" }}
                  >
                    <span className="cc-font-display italic text-[color:var(--cc-rust)] pt-2 cc-tabular text-lg w-8 flex-shrink-0">
                      {romanise(bulletIndex + 1)}
                    </span>
                    <CraftTextarea
                      value={bullet}
                      onChange={(e) =>
                        onUpdateBullet(exp.id, bulletIndex, e.target.value)
                      }
                      placeholder="What you shipped, who it helped, and by how much."
                      className="flex-1 min-h-[76px]"
                    />
                    <div className="flex flex-col gap-1 pt-2">
                      <button
                        onClick={() => onRewriteBullet(exp.id, bulletIndex)}
                        disabled={
                          rewritingBulletId === `${exp.id}-${bulletIndex}` ||
                          !bullet.trim()
                        }
                        title={
                          jobDescription
                            ? "AI rewrite"
                            : "Add a target job first"
                        }
                        className="p-2 border border-[color:var(--cc-hair-strong)] hover:border-[color:var(--cc-rust)] hover:text-[color:var(--cc-rust)] transition-colors disabled:opacity-40"
                      >
                        {rewritingBulletId === `${exp.id}-${bulletIndex}` ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Sparkles className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        onClick={() => onRemoveBullet(exp.id, bulletIndex)}
                        disabled={exp.bullets.length <= 1}
                        className="p-2 border border-[color:var(--cc-hair-strong)] hover:border-[color:var(--cc-ink)] transition-colors disabled:opacity-40"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </li>
                ))}
              </ol>
              <button
                onClick={() => onAddBullet(exp.id)}
                className="mt-4 inline-flex items-center gap-2 cc-label text-[color:var(--cc-ink)] hover:text-[color:var(--cc-rust)]"
              >
                <Plus className="w-3.5 h-3.5" />
                Add another bullet
              </button>
            </div>
          </motion.article>
        ))}
      </AnimatePresence>

      <CraftButton variant="ghost" onClick={onAdd} className="w-full">
        <Plus className="w-4 h-4" />
        Add position
      </CraftButton>
    </div>
  </CraftSection>
);

function romanise(n: number): string {
  const table: [number, string][] = [
    [10, "x"],
    [9, "ix"],
    [5, "v"],
    [4, "iv"],
    [1, "i"],
  ];
  let out = "";
  let remainder = n;
  for (const [val, sym] of table) {
    while (remainder >= val) {
      out += sym;
      remainder -= val;
    }
  }
  return `${out}.`;
}
