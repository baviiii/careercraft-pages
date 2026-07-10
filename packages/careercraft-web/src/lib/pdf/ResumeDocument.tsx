/* ───────────────────────────────────────────────────────────────
   Vector resume PDF — true text, true vectors, real pagination.

   Dispatches to a faithful per-template renderer (one for every
   id in TEMPLATE_MAP) so the exported PDF looks exactly like the
   template shown in the builder preview. Fonts must be registered
   before rendering (registerPdfFontsForWeb in the browser, or
   registerPdfFonts with file paths in Node).
   ─────────────────────────────────────────────────────────────── */

import { Document } from "@react-pdf/renderer";

import type { TemplateData } from "@/components/templates/types";

import { getPdfTemplate } from "./templates";

interface ResumeDocumentProps {
  data: TemplateData;
  templateId?: string | null;
}

export function ResumeDocument({ data, templateId }: ResumeDocumentProps) {
  const Template = getPdfTemplate(templateId);

  return (
    <Document
      title={data.contact.name ? `${data.contact.name} — Résumé` : "Résumé"}
      author={data.contact.name || undefined}
      creator="CareerCraft"
      producer="CareerCraft"
    >
      <Template data={data} />
    </Document>
  );
}
