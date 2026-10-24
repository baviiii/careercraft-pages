/** Layout density — same paper, tighter type/spacing at each step down.
    The lever for "this should fit on 2 pages".

    Its own module so the builder's controls can list the options without
    importing lib/pdfExport, which pulls in the whole PDF renderer (~780 KB). */
export type PdfDensity = "normal" | "snug" | "compact";

export const PDF_DENSITIES: Array<{ id: PdfDensity; label: string }> = [
  { id: "normal", label: "Normal" },
  { id: "snug", label: "Snug" },
  { id: "compact", label: "Compact" },
];
