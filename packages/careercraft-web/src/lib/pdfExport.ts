/* ───────────────────────────────────────────────────────────────
   Resume → PDF exporter. Renders a template component off-screen
   at true A4 (96 DPI) dimensions, captures it at 4x for crisp
   text, and paginates as needed. Used by MyResumes + ResumeBuilder.
   ─────────────────────────────────────────────────────────────── */

import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { createElement } from "react";

import { getTemplate, toTemplateData } from "@/lib/templateMap";

export interface ExportResumePdfOptions {
  resume: {
    id?: string;
    name?: string;
    content?: any;
    template_id?: string | null;
  };
  /** Capture scale for html2canvas; higher = sharper but slower. Default 4. */
  scale?: number;
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

  const pdf = new jsPDF({
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
      pdf.addPage();
      y = margin;
    }
  };

  if (includeMetadata) {
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(14);
    pdf.text("Career Conversation Export", margin, y);
    y += 8;

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    pdf.text(`Generated: ${new Date().toLocaleString()}`, margin, y);
    y += 10;
  }

  messages.forEach((message) => {
    const speaker = message.role === "user" ? "User" : "Assistant";
    const content = (message.content || "").trim();

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(11);
    ensureSpace(lineHeight);
    pdf.text(`${speaker}:`, margin, y);
    y += lineHeight;

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    const wrappedContent = pdf.splitTextToSize(content || "(empty)", maxTextWidth);
    ensureSpace(wrappedContent.length * lineHeight);
    pdf.text(wrappedContent, margin, y);
    y += wrappedContent.length * lineHeight + 2;

    if (includeSources && message.sources?.length) {
      pdf.setFont("helvetica", "italic");
      pdf.setFontSize(9);
      message.sources.slice(0, 5).forEach((source, index) => {
        const sourceText = `Source ${index + 1}: ${source.title || "Untitled"}${
          source.pageNumber ? ` (p.${source.pageNumber})` : ""
        }`;
        const wrappedSource = pdf.splitTextToSize(sourceText, maxTextWidth);
        ensureSpace(wrappedSource.length * 5);
        pdf.text(wrappedSource, margin + 2, y);
        y += wrappedSource.length * 5;
      });
      y += 2;
    }
  });

  pdf.save(fileName);
}

/**
 * Render the resume's template at A4 and save as PDF.
 * Throws if no matching template is registered.
 */
export async function exportResumeToPdf({
  resume,
  scale = 4,
}: ExportResumePdfOptions): Promise<ExportResumePdfResult> {
  const TemplateComponent = getTemplate(resume.template_id);
  if (!TemplateComponent) {
    throw new Error(
      `No template registered for id "${resume.template_id ?? ""}"`
    );
  }

  const tempContainer = document.createElement("div");
  tempContainer.style.position = "absolute";
  tempContainer.style.left = "-9999px";
  tempContainer.style.top = "0";
  tempContainer.style.width = "794px"; // A4 @ 96 DPI
  tempContainer.style.minHeight = "1123px";
  tempContainer.style.backgroundColor = "#ffffff";
  tempContainer.style.boxSizing = "border-box";
  document.body.appendChild(tempContainer);

  const { createRoot } = await import("react-dom/client");
  const templateData = toTemplateData(resume.content);

  const root = createRoot(tempContainer);
  root.render(
    createElement(TemplateComponent, { data: templateData, isPreview: false })
  );

  try {
    await new Promise((r) => setTimeout(r, 800));

    const canvas = await html2canvas(tempContainer, {
      scale,
      useCORS: true,
      logging: false,
      backgroundColor: "#ffffff",
      width: 794,
      height: tempContainer.scrollHeight,
      windowWidth: 794,
    });

    const imgData = canvas.toDataURL("image/jpeg", 0.95);
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
      compress: true,
    });

    const pageWidth = 210;
    const pageHeight = 297;
    const imgWidth = pageWidth;
    const imgHeight = (canvas.height * pageWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = 0;
    let pageCount = 0;

    while (heightLeft > 0) {
      if (pageCount > 0) pdf.addPage();
      pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight, undefined, "FAST");
      heightLeft -= pageHeight;
      position -= pageHeight;
      pageCount++;
    }

    const fileName = `${resume.content?.contact?.name || resume.name || "resume"}.pdf`;
    pdf.save(fileName);

    return { pageCount, fileName };
  } finally {
    root.unmount();
    if (tempContainer.parentNode) {
      tempContainer.parentNode.removeChild(tempContainer);
    }
  }
}
