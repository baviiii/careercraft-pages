/* ───────────────────────────────────────────────────────────────
   PDF exporters.

   exportResumeToPdf — renders a vector resume PDF via
   @react-pdf/renderer (true text, true fonts, real pagination).
   No DOM screenshot, no html2canvas.

   exportConversationToPDF — chat transcript export, still pure
   jsPDF since it's just paginated text.
   ─────────────────────────────────────────────────────────────── */

import { pdf } from "@react-pdf/renderer";
import jsPDF from "jspdf";
import { PDFDocument } from "pdf-lib";
import { createElement } from "react";

import { toTemplateData } from "@/lib/templateMap";

import { ResumeDocument } from "./pdf/ResumeDocument";

export interface ExportResumePdfOptions {
  resume: {
    id?: string;
    name?: string;
    content?: any;
    template_id?: string | null;
  };
}

export interface ExportResumePdfResult {
  pageCount: number;
  fileName: string;
}

interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
  sources?: Array<{
    title?: string;
    pageNumber?: number;
    snippet?: string;
  }>;
}

interface ExportConversationToPDFOptions {
  includeSources?: boolean;
  includeMetadata?: boolean;
  includeAnalytics?: boolean;
  fileName?: string;
}

function sanitizePdfFileName(input: string): string {
  return input.replace(/[<>:"/\\|?*\u0000-\u001F]/g, "").trim() || "resume";
}

function triggerBlobDownload(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Give the browser a tick to start the download before we revoke.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Render the resume's template as a vector PDF and save it.
 */
export async function exportResumeToPdf({
  resume,
}: ExportResumePdfOptions): Promise<ExportResumePdfResult> {
  const data = toTemplateData(resume.content);

  const doc = createElement(ResumeDocument, {
    data,
    templateId: resume.template_id,
  });

  const blob = await pdf(doc).toBlob();

  const bytes = await blob.arrayBuffer();
  const pdfDoc = await PDFDocument.load(bytes);
  const pageCount = pdfDoc.getPageCount();

  const fileName = `${sanitizePdfFileName(
    data.contact.name || resume.name || "resume"
  )}.pdf`;

  triggerBlobDownload(blob, fileName);

  return { pageCount, fileName };
}

/**
 * Backward-compatible chat export used by CareerCoach.
 */
export function exportConversationToPDF(
  messages: ConversationMessage[],
  options: ExportConversationToPDFOptions = {}
): void {
  const {
    includeSources = true,
    includeMetadata = true,
    fileName = "career-conversation.pdf",
  } = options;

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
    compress: true,
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 14;
  const maxTextWidth = pageWidth - margin * 2;
  const lineHeight = 6;
  let y = margin;

  const ensureSpace = (requiredHeight: number) => {
    if (y + requiredHeight > pageHeight - margin) {
      doc.addPage();
      y = margin;
    }
  };

  if (includeMetadata) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("Career Conversation Export", margin, y);
    y += 8;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, margin, y);
    y += 10;
  }

  messages.forEach((message) => {
    const speaker = message.role === "user" ? "User" : "Assistant";
    const content = (message.content || "").trim();

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    ensureSpace(lineHeight);
    doc.text(`${speaker}:`, margin, y);
    y += lineHeight;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const wrappedContent = doc.splitTextToSize(content || "(empty)", maxTextWidth);
    ensureSpace(wrappedContent.length * lineHeight);
    doc.text(wrappedContent, margin, y);
    y += wrappedContent.length * lineHeight + 2;

    if (includeSources && message.sources?.length) {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(9);
      message.sources.slice(0, 5).forEach((source, index) => {
        const sourceText = `Source ${index + 1}: ${source.title || "Untitled"}${
          source.pageNumber ? ` (p.${source.pageNumber})` : ""
        }`;
        const wrappedSource = doc.splitTextToSize(sourceText, maxTextWidth);
        ensureSpace(wrappedSource.length * 5);
        doc.text(wrappedSource, margin + 2, y);
        y += wrappedSource.length * 5;
      });
      y += 2;
    }
  });

  doc.save(fileName);
}
