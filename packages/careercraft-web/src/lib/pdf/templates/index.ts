/* ───────────────────────────────────────────────────────────────
   Registry of PDF template renderers, keyed by the same ids as
   TEMPLATE_MAP in src/lib/templateMap.ts. Every id here must be a
   faithful port of its on-screen counterpart.
   ─────────────────────────────────────────────────────────────── */

import type { ComponentType } from "react";

import type { TemplateData } from "@/components/templates/types";

import {
  Creative1Pdf,
  Creative2Pdf,
  Creative3Pdf,
  Creative4Pdf,
  Creative5Pdf,
  Creative6Pdf,
  Creative7Pdf,
} from "./creative";
import {
  Minimal1Pdf,
  Minimal2Pdf,
  Minimal3Pdf,
  Minimal4Pdf,
  Minimal5Pdf,
} from "./minimal";
import {
  Modern1Pdf,
  Modern2Pdf,
  Modern3Pdf,
  Modern4Pdf,
  Modern5Pdf,
  Modern6Pdf,
  Modern7Pdf,
} from "./modern";
import {
  Professional1Pdf,
  Professional2Pdf,
  Professional3Pdf,
  Professional4Pdf,
  Professional5Pdf,
  Professional6Pdf,
} from "./professional";

export type PdfTemplateComponent = ComponentType<{ data: TemplateData }>;

export const PDF_TEMPLATES: Record<string, PdfTemplateComponent> = {
  modern1: Modern1Pdf,
  modern2: Modern2Pdf,
  modern3: Modern3Pdf,
  modern4: Modern4Pdf,
  modern5: Modern5Pdf,
  modern6: Modern6Pdf,
  modern7: Modern7Pdf,
  professional: Professional1Pdf,
  professional2: Professional2Pdf,
  professional3: Professional3Pdf,
  professional4: Professional4Pdf,
  professional5: Professional5Pdf,
  professional6: Professional6Pdf,
  creative1: Creative1Pdf,
  creative2: Creative2Pdf,
  creative3: Creative3Pdf,
  creative4: Creative4Pdf,
  creative5: Creative5Pdf,
  creative6: Creative6Pdf,
  creative7: Creative7Pdf,
  minimal1: Minimal1Pdf,
  minimal2: Minimal2Pdf,
  minimal3: Minimal3Pdf,
  minimal4: Minimal4Pdf,
  minimal5: Minimal5Pdf,
};

export function hasPdfTemplate(id?: string | null): boolean {
  return Boolean(id && PDF_TEMPLATES[id]);
}

/** Unknown ids fall back to Modern 1 — callers should check
    hasPdfTemplate() first and surface the substitution to the user. */
export function getPdfTemplate(id?: string | null): PdfTemplateComponent {
  if (id && PDF_TEMPLATES[id]) return PDF_TEMPLATES[id];
  return Modern1Pdf;
}
