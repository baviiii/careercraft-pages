/* ───────────────────────────────────────────────────────────
   Optional sections — projects, certifications, references,
   languages, awards, volunteer work, publications.
   ─────────────────────────────────────────────────────────── */

import { Plus, Trash2 } from "lucide-react";
import type { Dispatch, SetStateAction } from "react";

import { CraftButton } from "@/components/craft/AppPrimitives";

import type {
  Award,
  Certification,
  Language,
  Project,
  Publication,
  Reference,
  ResumeData,
  Volunteer,
} from "../types";
import { CraftInput, CraftSection, CraftTextarea, LabelledField } from "./FormField";

interface OptionalSectionsFormProps {
  resumeData: ResumeData;
  setResumeData: Dispatch<SetStateAction<ResumeData>>;
}

type OptionalKey =
  | "projects"
  | "certifications"
  | "references"
  | "languages"
  | "awards"
  | "volunteer"
  | "publications";

const emptyOf: Record<OptionalKey, () => any> = {
  projects: (): Project => ({
    id: `proj-${Date.now()}`,
    name: "",
    description: "",
    technologies: [],
  }),
  certifications: (): Certification => ({
    id: `cert-${Date.now()}`,
    name: "",
    issuer: "",
    date: "",
    expiryDate: "",
  }),
  references: (): Reference => ({
    id: `ref-${Date.now()}`,
    name: "",
    title: "",
    company: "",
    phone: "",
    email: "",
    relationship: "",
  }),
  languages: (): Language => ({
    id: `lang-${Date.now()}`,
    language: "",
    proficiency: "",
  }),
  awards: (): Award => ({
    id: `aw-${Date.now()}`,
    title: "",
    issuer: "",
    date: "",
    description: "",
  }),
  volunteer: (): Volunteer => ({
    id: `vol-${Date.now()}`,
    role: "",
    organization: "",
    location: "",
    startDate: "",
    endDate: "",
    current: false,
    description: "",
  }),
  publications: (): Publication => ({
    id: `pub-${Date.now()}`,
    title: "",
    publisher: "",
    date: "",
    url: "",
    description: "",
  }),
};

export const OptionalSectionsForm = ({
  resumeData,
  setResumeData,
}: OptionalSectionsFormProps) => {
  function addItem<K extends OptionalKey>(key: K) {
    setResumeData((prev) => {
      const list = ((prev[key] as any[]) || []).slice();
      list.push(emptyOf[key]());
      return { ...prev, [key]: list } as ResumeData;
    });
  }
  function removeItem<K extends OptionalKey>(key: K, id: string) {
    setResumeData((prev) => {
      const list = ((prev[key] as any[]) || []).filter((i: any) => i.id !== id);
      return { ...prev, [key]: list } as ResumeData;
    });
  }
  function updateItem<K extends OptionalKey>(
    key: K,
    id: string,
    field: string,
    value: any
  ) {
    setResumeData((prev) => {
      const list = ((prev[key] as any[]) || []).map((i: any) =>
        i.id === id ? { ...i, [field]: value } : i
      );
      return { ...prev, [key]: list } as ResumeData;
    });
  }

  const projects = resumeData.projects || [];
  const certs = resumeData.certifications || [];
  const refs = resumeData.references || [];
  const langs = resumeData.languages || [];
  const awards = resumeData.awards || [];
  const volunteer = resumeData.volunteer || [];
  const pubs = resumeData.publications || [];

  return (
    <div className="space-y-6">
      {/* Projects */}
      <CraftSection
        kicker="§ Projects"
        title="Side works & shipped things."
        sub="Greenfield builds, open-source, demos."
      >
        <SubList
          rows={projects}
          onAdd={() => addItem("projects")}
          renderRow={(p: Project) => (
            <div key={p.id}>
              <SubHeader
                label={`Project Nº ${String(projects.indexOf(p) + 1).padStart(2, "0")}`}
                onRemove={() => removeItem("projects", p.id)}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5 mt-4">
                <LabelledField label="Name">
                  <CraftInput
                    value={p.name}
                    onChange={(e) =>
                      updateItem("projects", p.id, "name", e.target.value)
                    }
                    placeholder="Project name"
                  />
                </LabelledField>
                <LabelledField label="Technologies (comma-separated)">
                  <CraftInput
                    value={(p.technologies || []).join(", ")}
                    onChange={(e) =>
                      updateItem(
                        "projects",
                        p.id,
                        "technologies",
                        e.target.value
                          .split(",")
                          .map((s) => s.trim())
                          .filter(Boolean)
                      )
                    }
                    placeholder="React, TypeScript, Postgres"
                  />
                </LabelledField>
                <LabelledField label="Description" className="md:col-span-2">
                  <CraftTextarea
                    value={p.description}
                    onChange={(e) =>
                      updateItem(
                        "projects",
                        p.id,
                        "description",
                        e.target.value
                      )
                    }
                    className="min-h-[100px]"
                    placeholder="What it does, what you built, what the outcome was."
                  />
                </LabelledField>
              </div>
            </div>
          )}
          emptyText="No projects filed yet."
          addLabel="Add project"
        />
      </CraftSection>

      {/* Certifications */}
      <CraftSection
        kicker="§ Certifications"
        title="Papers & stamps."
        sub="Third-party certificates, exams, memberships."
      >
        <SubList
          rows={certs}
          onAdd={() => addItem("certifications")}
          renderRow={(c: Certification) => (
            <div key={c.id}>
              <SubHeader
                label={`Certificate Nº ${String(certs.indexOf(c) + 1).padStart(2, "0")}`}
                onRemove={() => removeItem("certifications", c.id)}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5 mt-4">
                <LabelledField label="Name">
                  <CraftInput
                    value={c.name}
                    onChange={(e) =>
                      updateItem("certifications", c.id, "name", e.target.value)
                    }
                    placeholder="AWS Solutions Architect"
                  />
                </LabelledField>
                <LabelledField label="Issuer">
                  <CraftInput
                    value={c.issuer || ""}
                    onChange={(e) =>
                      updateItem(
                        "certifications",
                        c.id,
                        "issuer",
                        e.target.value
                      )
                    }
                    placeholder="Amazon"
                  />
                </LabelledField>
                <LabelledField label="Date">
                  <CraftInput
                    value={c.date || ""}
                    onChange={(e) =>
                      updateItem("certifications", c.id, "date", e.target.value)
                    }
                    placeholder="Mar 2024"
                  />
                </LabelledField>
                <LabelledField label="Expiry">
                  <CraftInput
                    value={c.expiryDate || ""}
                    onChange={(e) =>
                      updateItem(
                        "certifications",
                        c.id,
                        "expiryDate",
                        e.target.value
                      )
                    }
                    placeholder="Mar 2027"
                  />
                </LabelledField>
              </div>
            </div>
          )}
          emptyText="No certifications filed yet."
          addLabel="Add certificate"
        />
      </CraftSection>

      {/* References */}
      <CraftSection
        kicker="§ References"
        title="Who vouches for the work."
      >
        <SubList
          rows={refs}
          onAdd={() => addItem("references")}
          renderRow={(r: Reference) => (
            <div key={r.id}>
              <SubHeader
                label={`Reference Nº ${String(refs.indexOf(r) + 1).padStart(2, "0")}`}
                onRemove={() => removeItem("references", r.id)}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5 mt-4">
                <LabelledField label="Name">
                  <CraftInput
                    value={r.name}
                    onChange={(e) =>
                      updateItem("references", r.id, "name", e.target.value)
                    }
                    placeholder="Jane Manager"
                  />
                </LabelledField>
                <LabelledField label="Title">
                  <CraftInput
                    value={r.title || ""}
                    onChange={(e) =>
                      updateItem("references", r.id, "title", e.target.value)
                    }
                    placeholder="Director of Engineering"
                  />
                </LabelledField>
                <LabelledField label="Company">
                  <CraftInput
                    value={r.company || ""}
                    onChange={(e) =>
                      updateItem("references", r.id, "company", e.target.value)
                    }
                    placeholder="Acme Co."
                  />
                </LabelledField>
                <LabelledField label="Relationship">
                  <CraftInput
                    value={r.relationship || ""}
                    onChange={(e) =>
                      updateItem(
                        "references",
                        r.id,
                        "relationship",
                        e.target.value
                      )
                    }
                    placeholder="Former direct manager"
                  />
                </LabelledField>
                <LabelledField label="Email">
                  <CraftInput
                    value={r.email || ""}
                    onChange={(e) =>
                      updateItem("references", r.id, "email", e.target.value)
                    }
                    placeholder="jane@acme.com"
                  />
                </LabelledField>
                <LabelledField label="Phone">
                  <CraftInput
                    value={r.phone || ""}
                    onChange={(e) =>
                      updateItem("references", r.id, "phone", e.target.value)
                    }
                    placeholder="+1 555-123-4567"
                  />
                </LabelledField>
              </div>
            </div>
          )}
          emptyText="No references filed yet."
          addLabel="Add reference"
        />
      </CraftSection>

      {/* Languages */}
      <CraftSection kicker="§ Languages" title="Tongues held.">
        <SubList
          rows={langs}
          onAdd={() => addItem("languages")}
          renderRow={(l: Language) => (
            <div key={l.id}>
              <SubHeader
                label={`Language Nº ${String(langs.indexOf(l) + 1).padStart(2, "0")}`}
                onRemove={() => removeItem("languages", l.id)}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5 mt-4">
                <LabelledField label="Language">
                  <CraftInput
                    value={l.language}
                    onChange={(e) =>
                      updateItem("languages", l.id, "language", e.target.value)
                    }
                    placeholder="Spanish"
                  />
                </LabelledField>
                <LabelledField label="Proficiency">
                  <CraftInput
                    value={l.proficiency}
                    onChange={(e) =>
                      updateItem(
                        "languages",
                        l.id,
                        "proficiency",
                        e.target.value
                      )
                    }
                    placeholder="Native / Fluent / Professional"
                  />
                </LabelledField>
              </div>
            </div>
          )}
          emptyText="No languages filed yet."
          addLabel="Add language"
        />
      </CraftSection>

      {/* Awards */}
      <CraftSection kicker="§ Awards" title="Honours & prizes.">
        <SubList
          rows={awards}
          onAdd={() => addItem("awards")}
          renderRow={(a: Award) => (
            <div key={a.id}>
              <SubHeader
                label={`Award Nº ${String(awards.indexOf(a) + 1).padStart(2, "0")}`}
                onRemove={() => removeItem("awards", a.id)}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5 mt-4">
                <LabelledField label="Title">
                  <CraftInput
                    value={a.title}
                    onChange={(e) =>
                      updateItem("awards", a.id, "title", e.target.value)
                    }
                    placeholder="Employee of the Year"
                  />
                </LabelledField>
                <LabelledField label="Issuer">
                  <CraftInput
                    value={a.issuer || ""}
                    onChange={(e) =>
                      updateItem("awards", a.id, "issuer", e.target.value)
                    }
                    placeholder="Acme Co."
                  />
                </LabelledField>
                <LabelledField label="Date">
                  <CraftInput
                    value={a.date || ""}
                    onChange={(e) =>
                      updateItem("awards", a.id, "date", e.target.value)
                    }
                    placeholder="2023"
                  />
                </LabelledField>
                <LabelledField label="Description" className="md:col-span-2">
                  <CraftTextarea
                    value={a.description || ""}
                    onChange={(e) =>
                      updateItem(
                        "awards",
                        a.id,
                        "description",
                        e.target.value
                      )
                    }
                    className="min-h-[80px]"
                    placeholder="Why, and for what."
                  />
                </LabelledField>
              </div>
            </div>
          )}
          emptyText="No awards filed yet."
          addLabel="Add award"
        />
      </CraftSection>

      {/* Volunteer */}
      <CraftSection
        kicker="§ Volunteer"
        title="Hours given."
        sub="Work done outside the ledger."
      >
        <SubList
          rows={volunteer}
          onAdd={() => addItem("volunteer")}
          renderRow={(v: Volunteer) => (
            <div key={v.id}>
              <SubHeader
                label={`Volunteer Nº ${String(volunteer.indexOf(v) + 1).padStart(2, "0")}`}
                onRemove={() => removeItem("volunteer", v.id)}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5 mt-4">
                <LabelledField label="Role">
                  <CraftInput
                    value={v.role}
                    onChange={(e) =>
                      updateItem("volunteer", v.id, "role", e.target.value)
                    }
                    placeholder="Mentor"
                  />
                </LabelledField>
                <LabelledField label="Organisation">
                  <CraftInput
                    value={v.organization}
                    onChange={(e) =>
                      updateItem(
                        "volunteer",
                        v.id,
                        "organization",
                        e.target.value
                      )
                    }
                    placeholder="Code for Good"
                  />
                </LabelledField>
                <LabelledField label="Start">
                  <CraftInput
                    value={v.startDate || ""}
                    onChange={(e) =>
                      updateItem("volunteer", v.id, "startDate", e.target.value)
                    }
                    placeholder="Jan 2022"
                  />
                </LabelledField>
                <LabelledField label="End">
                  <CraftInput
                    value={v.endDate || ""}
                    onChange={(e) =>
                      updateItem("volunteer", v.id, "endDate", e.target.value)
                    }
                    placeholder="Present"
                  />
                </LabelledField>
                <LabelledField label="Description" className="md:col-span-2">
                  <CraftTextarea
                    value={v.description || ""}
                    onChange={(e) =>
                      updateItem(
                        "volunteer",
                        v.id,
                        "description",
                        e.target.value
                      )
                    }
                    className="min-h-[80px]"
                    placeholder="What you helped with, and for whom."
                  />
                </LabelledField>
              </div>
            </div>
          )}
          emptyText="No volunteer work filed yet."
          addLabel="Add volunteer entry"
        />
      </CraftSection>

      {/* Publications */}
      <CraftSection
        kicker="§ Publications"
        title="Things written in ink."
      >
        <SubList
          rows={pubs}
          onAdd={() => addItem("publications")}
          renderRow={(p: Publication) => (
            <div key={p.id}>
              <SubHeader
                label={`Publication Nº ${String(pubs.indexOf(p) + 1).padStart(2, "0")}`}
                onRemove={() => removeItem("publications", p.id)}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5 mt-4">
                <LabelledField label="Title">
                  <CraftInput
                    value={p.title}
                    onChange={(e) =>
                      updateItem(
                        "publications",
                        p.id,
                        "title",
                        e.target.value
                      )
                    }
                    placeholder="The article title"
                  />
                </LabelledField>
                <LabelledField label="Publisher">
                  <CraftInput
                    value={p.publisher || ""}
                    onChange={(e) =>
                      updateItem(
                        "publications",
                        p.id,
                        "publisher",
                        e.target.value
                      )
                    }
                    placeholder="Journal or site"
                  />
                </LabelledField>
                <LabelledField label="Date">
                  <CraftInput
                    value={p.date || ""}
                    onChange={(e) =>
                      updateItem("publications", p.id, "date", e.target.value)
                    }
                    placeholder="2024"
                  />
                </LabelledField>
                <LabelledField label="URL">
                  <CraftInput
                    value={p.url || ""}
                    onChange={(e) =>
                      updateItem("publications", p.id, "url", e.target.value)
                    }
                    placeholder="https://…"
                  />
                </LabelledField>
                <LabelledField label="Description" className="md:col-span-2">
                  <CraftTextarea
                    value={p.description || ""}
                    onChange={(e) =>
                      updateItem(
                        "publications",
                        p.id,
                        "description",
                        e.target.value
                      )
                    }
                    className="min-h-[80px]"
                    placeholder="A sentence about the piece."
                  />
                </LabelledField>
              </div>
            </div>
          )}
          emptyText="No publications filed yet."
          addLabel="Add publication"
        />
      </CraftSection>
    </div>
  );
};

const SubHeader = ({
  label,
  onRemove,
}: {
  label: string;
  onRemove: () => void;
}) => (
  <div className="flex items-center justify-between pb-3 border-b border-[color:var(--cc-hair)]">
    <div className="cc-label text-[color:var(--cc-ash)]">{label}</div>
    <button
      onClick={onRemove}
      className="inline-flex items-center gap-2 cc-label text-[color:var(--cc-rust-deep)] hover:text-[color:var(--cc-rust)]"
    >
      <Trash2 className="w-3.5 h-3.5" />
      Strike
    </button>
  </div>
);

function SubList<T>({
  rows,
  renderRow,
  onAdd,
  addLabel,
  emptyText,
}: {
  rows: T[];
  renderRow: (row: T) => React.ReactNode;
  onAdd: () => void;
  addLabel: string;
  emptyText: string;
}) {
  return (
    <div className="space-y-5">
      {rows.length === 0 ? (
        <p className="cc-font-editorial italic text-[color:var(--cc-ink-soft)]">
          {emptyText}
        </p>
      ) : (
        rows.map((row) => (
          <div
            key={(row as any).id}
            className="border border-[color:var(--cc-hair-strong)] bg-[color:var(--cc-cream)] p-5 md:p-6"
          >
            {renderRow(row)}
          </div>
        ))
      )}
      <CraftButton variant="ghost" onClick={onAdd} className="w-full">
        <Plus className="w-4 h-4" />
        {addLabel}
      </CraftButton>
    </div>
  );
}
