/* Optional sections: projects, certificates and licences, referees,
   languages, awards, volunteering, publications. Each one only shows on the
   résumé once something is in it. */

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
        title="Projects"
        sub="Uni projects, side projects, things you built or ran."
      >
        <SubList
          rows={projects}
          onAdd={() => addItem("projects")}
          renderRow={(p: Project) => (
            <div key={p.id}>
              <SubHeader
                label={`Project ${projects.indexOf(p) + 1}`}
                onRemove={() => removeItem("projects", p.id)}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-4 mt-4">
                <LabelledField label="Name">
                  <CraftInput
                    value={p.name}
                    onChange={(e) =>
                      updateItem("projects", p.id, "name", e.target.value)
                    }
                    placeholder="e.g. Club membership app"
                  />
                </LabelledField>
                <LabelledField label="Tools used" hint="Separate them with commas.">
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
                    placeholder="e.g. Excel, Canva, Python"
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
                    placeholder="What it was, what you did, and how it turned out."
                  />
                </LabelledField>
              </div>
            </div>
          )}
          emptyText="No projects yet."
          addLabel="Add a project"
        />
      </CraftSection>

      {/* Certifications */}
      <CraftSection
        title="Certificates and licences"
        sub="Courses, tickets and memberships, like a White Card, RSA or First Aid."
      >
        <SubList
          rows={certs}
          onAdd={() => addItem("certifications")}
          renderRow={(c: Certification) => (
            <div key={c.id}>
              <SubHeader
                label={`Certificate ${certs.indexOf(c) + 1}`}
                onRemove={() => removeItem("certifications", c.id)}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-4 mt-4">
                <LabelledField label="Name">
                  <CraftInput
                    value={c.name}
                    onChange={(e) =>
                      updateItem("certifications", c.id, "name", e.target.value)
                    }
                    placeholder="e.g. Provide First Aid (HLTAID011)"
                  />
                </LabelledField>
                <LabelledField label="Given by">
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
                    placeholder="e.g. St John Ambulance"
                  />
                </LabelledField>
                <LabelledField label="Date">
                  <CraftInput
                    value={c.date || ""}
                    onChange={(e) =>
                      updateItem("certifications", c.id, "date", e.target.value)
                    }
                    placeholder="e.g. Mar 2024"
                  />
                </LabelledField>
                <LabelledField label="Expires (if it does)">
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
                    placeholder="e.g. Mar 2027"
                  />
                </LabelledField>
              </div>
            </div>
          )}
          emptyText="No certificates or licences yet."
          addLabel="Add a certificate or licence"
        />
      </CraftSection>

      {/* References */}
      <CraftSection
        title="Referees"
        sub={'Optional. Many people write "Referees available on request" instead.'}
      >
        <SubList
          rows={refs}
          onAdd={() => addItem("references")}
          renderRow={(r: Reference) => (
            <div key={r.id}>
              <SubHeader
                label={`Referee ${refs.indexOf(r) + 1}`}
                onRemove={() => removeItem("references", r.id)}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-4 mt-4">
                <LabelledField label="Name">
                  <CraftInput
                    value={r.name}
                    onChange={(e) =>
                      updateItem("references", r.id, "name", e.target.value)
                    }
                    placeholder="e.g. Priya Shah"
                  />
                </LabelledField>
                <LabelledField label="Their job title">
                  <CraftInput
                    value={r.title || ""}
                    onChange={(e) =>
                      updateItem("references", r.id, "title", e.target.value)
                    }
                    placeholder="e.g. Store Manager"
                  />
                </LabelledField>
                <LabelledField label="Where they work">
                  <CraftInput
                    value={r.company || ""}
                    onChange={(e) =>
                      updateItem("references", r.id, "company", e.target.value)
                    }
                    placeholder="e.g. Coles"
                  />
                </LabelledField>
                <LabelledField label="How you know them">
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
                    placeholder="e.g. My manager at Coles"
                  />
                </LabelledField>
                <LabelledField label="Email">
                  <CraftInput
                    value={r.email || ""}
                    onChange={(e) =>
                      updateItem("references", r.id, "email", e.target.value)
                    }
                    placeholder="name@example.com"
                  />
                </LabelledField>
                <LabelledField label="Phone">
                  <CraftInput
                    value={r.phone || ""}
                    onChange={(e) =>
                      updateItem("references", r.id, "phone", e.target.value)
                    }
                    placeholder="e.g. 0412 345 678"
                  />
                </LabelledField>
              </div>
            </div>
          )}
          emptyText="No referees yet."
          addLabel="Add a referee"
        />
      </CraftSection>

      {/* Languages */}
      <CraftSection title="Languages" sub="Languages other than English, and how well you speak them.">
        <SubList
          rows={langs}
          onAdd={() => addItem("languages")}
          renderRow={(l: Language) => (
            <div key={l.id}>
              <SubHeader
                label={`Language ${langs.indexOf(l) + 1}`}
                onRemove={() => removeItem("languages", l.id)}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-4 mt-4">
                <LabelledField label="Language">
                  <CraftInput
                    value={l.language}
                    onChange={(e) =>
                      updateItem("languages", l.id, "language", e.target.value)
                    }
                    placeholder="e.g. Punjabi"
                  />
                </LabelledField>
                <LabelledField label="How well">
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
                    placeholder="e.g. Fluent, or Conversational"
                  />
                </LabelledField>
              </div>
            </div>
          )}
          emptyText="No languages yet."
          addLabel="Add a language"
        />
      </CraftSection>

      {/* Awards */}
      <CraftSection title="Awards" sub="Prizes, scholarships and recognition.">
        <SubList
          rows={awards}
          onAdd={() => addItem("awards")}
          renderRow={(a: Award) => (
            <div key={a.id}>
              <SubHeader
                label={`Award ${awards.indexOf(a) + 1}`}
                onRemove={() => removeItem("awards", a.id)}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-4 mt-4">
                <LabelledField label="Title">
                  <CraftInput
                    value={a.title}
                    onChange={(e) =>
                      updateItem("awards", a.id, "title", e.target.value)
                    }
                    placeholder="e.g. Dean's Merit List"
                  />
                </LabelledField>
                <LabelledField label="Given by">
                  <CraftInput
                    value={a.issuer || ""}
                    onChange={(e) =>
                      updateItem("awards", a.id, "issuer", e.target.value)
                    }
                    placeholder="e.g. Coles"
                  />
                </LabelledField>
                <LabelledField label="Date">
                  <CraftInput
                    value={a.date || ""}
                    onChange={(e) =>
                      updateItem("awards", a.id, "date", e.target.value)
                    }
                    placeholder="e.g. 2023"
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
                    placeholder="What it was for, in a sentence."
                  />
                </LabelledField>
              </div>
            </div>
          )}
          emptyText="No awards yet."
          addLabel="Add an award"
        />
      </CraftSection>

      {/* Volunteer */}
      <CraftSection
        title="Volunteering"
        sub="Unpaid work counts. Clubs, charities, community groups."
      >
        <SubList
          rows={volunteer}
          onAdd={() => addItem("volunteer")}
          renderRow={(v: Volunteer) => (
            <div key={v.id}>
              <SubHeader
                label={`Role ${volunteer.indexOf(v) + 1}`}
                onRemove={() => removeItem("volunteer", v.id)}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-4 mt-4">
                <LabelledField label="Role">
                  <CraftInput
                    value={v.role}
                    onChange={(e) =>
                      updateItem("volunteer", v.id, "role", e.target.value)
                    }
                    placeholder="e.g. Junior football coach"
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
                    placeholder="e.g. Foodbank SA"
                  />
                </LabelledField>
                <LabelledField label="Started">
                  <CraftInput
                    value={v.startDate || ""}
                    onChange={(e) =>
                      updateItem("volunteer", v.id, "startDate", e.target.value)
                    }
                    placeholder="e.g. Jan 2022"
                  />
                </LabelledField>
                <LabelledField label="Finished">
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
                    placeholder="What you did, and for whom."
                  />
                </LabelledField>
              </div>
            </div>
          )}
          emptyText="No volunteering yet."
          addLabel="Add volunteering"
        />
      </CraftSection>

      {/* Publications */}
      <CraftSection
        title="Publications"
        sub="Articles, papers or reports with your name on them."
      >
        <SubList
          rows={pubs}
          onAdd={() => addItem("publications")}
          renderRow={(p: Publication) => (
            <div key={p.id}>
              <SubHeader
                label={`Publication ${pubs.indexOf(p) + 1}`}
                onRemove={() => removeItem("publications", p.id)}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-4 mt-4">
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
                    placeholder="Title"
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
                    placeholder="e.g. a journal, newspaper or website"
                  />
                </LabelledField>
                <LabelledField label="Date">
                  <CraftInput
                    value={p.date || ""}
                    onChange={(e) =>
                      updateItem("publications", p.id, "date", e.target.value)
                    }
                    placeholder="e.g. 2024"
                  />
                </LabelledField>
                <LabelledField label="Link">
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
                    placeholder="One sentence on what it's about."
                  />
                </LabelledField>
              </div>
            </div>
          )}
          emptyText="No publications yet."
          addLabel="Add a publication"
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
  <div className="flex items-center justify-between border-b border-[color:var(--cc-hair)] pb-3">
    <div className="text-[13px] font-medium text-[color:var(--cc-ash)]">{label}</div>
    <button
      type="button"
      onClick={onRemove}
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[13px] text-[#9C3424] transition-colors hover:bg-[rgba(194,65,45,0.08)]"
    >
      <Trash2 className="h-3.5 w-3.5" />
      Remove
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
    <div className="space-y-4">
      {rows.length === 0 ? (
        <p className="text-[14px] text-[color:var(--cc-ash)]">{emptyText}</p>
      ) : (
        rows.map((row) => (
          <div
            key={(row as any).id}
            className="rounded-xl border border-[color:var(--cc-hair)] bg-[color:var(--cc-cream)] p-4 md:p-5"
          >
            {renderRow(row)}
          </div>
        ))
      )}
      <CraftButton variant="ghost" onClick={onAdd} className="w-full">
        <Plus className="h-4 w-4" />
        {addLabel}
      </CraftButton>
    </div>
  );
}
