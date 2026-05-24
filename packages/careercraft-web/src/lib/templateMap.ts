/* ───────────────────────────────────────────────────────────────
   Central registry of all résumé templates. Imported by the
   MyResumes cabinet and the ResumeBuilder so both stay in sync.
   ─────────────────────────────────────────────────────────────── */

import type { ComponentType } from "react";

import { ModernTemplate1 } from "@/components/templates/ModernTemplate1";
import { ModernTemplate2 } from "@/components/templates/ModernTemplate2";
import { ModernTemplate3 } from "@/components/templates/ModernTemplate3";
import { ModernTemplate4 } from "@/components/templates/ModernTemplate4";
import { ModernTemplate5 } from "@/components/templates/ModernTemplate5";
import { ModernTemplate6 } from "@/components/templates/ModernTemplate6";
import { ModernTemplate7 } from "@/components/templates/ModernTemplate7";
import { ProfessionalTemplate } from "@/components/templates/ProfessionalTemplate";
import { ProfessionalTemplate2 } from "@/components/templates/ProfessionalTemplate2";
import { ProfessionalTemplate3 } from "@/components/templates/ProfessionalTemplate3";
import { ProfessionalTemplate4 } from "@/components/templates/ProfessionalTemplate4";
import { ProfessionalTemplate5 } from "@/components/templates/ProfessionalTemplate5";
import { ProfessionalTemplate6 } from "@/components/templates/ProfessionalTemplate6";
import { CreativeTemplate1 } from "@/components/templates/CreativeTemplate1";
import { CreativeTemplate2 } from "@/components/templates/CreativeTemplate2";
import { CreativeTemplate3 } from "@/components/templates/CreativeTemplate3";
import { CreativeTemplate4 } from "@/components/templates/CreativeTemplate4";
import { CreativeTemplate5 } from "@/components/templates/CreativeTemplate5";
import { CreativeTemplate6 } from "@/components/templates/CreativeTemplate6";
import { CreativeTemplate7 } from "@/components/templates/CreativeTemplate7";
import { MinimalTemplate1 } from "@/components/templates/MinimalTemplate1";
import { MinimalTemplate2 } from "@/components/templates/MinimalTemplate2";
import { MinimalTemplate3 } from "@/components/templates/MinimalTemplate3";
import { MinimalTemplate4 } from "@/components/templates/MinimalTemplate4";
import { MinimalTemplate5 } from "@/components/templates/MinimalTemplate5";
import type { TemplateData } from "@/components/templates/types";

export type TemplateComponent = ComponentType<{
  data?: TemplateData;
  isPreview?: boolean;
}>;

export const TEMPLATE_MAP: Record<string, TemplateComponent> = {
  modern1: ModernTemplate1,
  modern2: ModernTemplate2,
  modern3: ModernTemplate3,
  modern4: ModernTemplate4,
  modern5: ModernTemplate5,
  modern6: ModernTemplate6,
  modern7: ModernTemplate7,
  professional: ProfessionalTemplate,
  professional2: ProfessionalTemplate2,
  professional3: ProfessionalTemplate3,
  professional4: ProfessionalTemplate4,
  professional5: ProfessionalTemplate5,
  professional6: ProfessionalTemplate6,
  creative1: CreativeTemplate1,
  creative2: CreativeTemplate2,
  creative3: CreativeTemplate3,
  creative4: CreativeTemplate4,
  creative5: CreativeTemplate5,
  creative6: CreativeTemplate6,
  creative7: CreativeTemplate7,
  minimal1: MinimalTemplate1,
  minimal2: MinimalTemplate2,
  minimal3: MinimalTemplate3,
  minimal4: MinimalTemplate4,
  minimal5: MinimalTemplate5,
};

export function getTemplate(id?: string | null): TemplateComponent | null {
  if (!id) return null;
  return TEMPLATE_MAP[id] ?? null;
}

/** Convert a raw resume row's `content` blob into the template-safe shape. */
export function toTemplateData(content: any): TemplateData {
  const c = content || {};
  return {
    contact: {
      name: c.contact?.name || "",
      email: c.contact?.email || "",
      phone: c.contact?.phone || "",
      location: c.contact?.location || "",
      linkedin: c.contact?.linkedin || "",
      website: c.contact?.website || "",
    },
    summary: c.summary || "",
    experience: (c.experience || []).map((exp: any, i: number) => ({
      id: exp.id || `exp-${i}`,
      title: exp.title || "",
      company: exp.company || "",
      location: exp.location || "",
      startDate: exp.startDate || "",
      endDate: exp.endDate || "",
      current: exp.current || false,
      bullets: exp.bullets || [],
    })),
    education: (c.education || []).map((edu: any, i: number) => ({
      id: edu.id || `edu-${i}`,
      degree: edu.degree || "",
      school: edu.school || "",
      location: edu.location || "",
      graduationDate: edu.graduationDate || "",
      gpa: edu.gpa || "",
    })),
    skills: c.skills || [],
    certifications: c.certifications,
    references: c.references,
    languages: c.languages,
    awards: c.awards,
    volunteer: c.volunteer,
    publications: c.publications,
    projects: c.projects,
  };
}

/** Pretty-print a template id, e.g. "professional2" -> "Professional 2". */
export function formatTemplateName(id: string): string {
  const withSpace = id.replace(/(\d+)/, " $1");
  return withSpace.charAt(0).toUpperCase() + withSpace.slice(1);
}
