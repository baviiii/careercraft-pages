/**
 * PDF EXPORT — Professional government-style conversation transcript
 * Uses jsPDF for real PDF generation. No emojis, no AI branding.
 */

import { jsPDF } from "jspdf";
import type { ChatMessage } from "@careercraft/shared";

// ── Colours ──
const NAVY = [15, 23, 42] as const;       // headings
const DARK = [30, 41, 59] as const;        // body text
const GREY = [100, 116, 139] as const;     // secondary text
const LIGHT_GREY = [226, 232, 240] as const; // rules
const ACCENT = [79, 70, 229] as const;     // indigo accent

function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/\[Source \d+\]/g, "")
    .replace(/#{1,6}\s/g, "")
    .trim();
}

function wrapText(doc: jsPDF, text: string, maxWidth: number): string[] {
  return doc.splitTextToSize(text, maxWidth);
}

export async function exportConversationToPDF(
  messages: ChatMessage[],
  options: {
    includeSources?: boolean;
    includeMetadata?: boolean;
    includeAnalytics?: boolean;
  } = {}
) {
  const { includeSources = true } = options;
  const conversationMessages = messages.filter(m => !m.isLoading && !m.isStreaming);
  if (conversationMessages.length === 0) return;

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const marginL = 20;
  const marginR = 20;
  const contentW = pageW - marginL - marginR;
  let y = 20;
  let pageNum = 1;

  // ── Helper: check page break ──
  const checkPage = (needed: number) => {
    if (y + needed > pageH - 25) {
      addFooter();
      doc.addPage();
      pageNum++;
      y = 20;
    }
  };

  // ── Helper: add footer ──
  const addFooter = () => {
    doc.setFontSize(8);
    doc.setTextColor(...GREY);
    doc.text(`Page ${pageNum}`, pageW / 2, pageH - 10, { align: "center" });
    doc.text("Confidential — For internal use only", marginL, pageH - 10);
    doc.text(new Date().toLocaleDateString("en-AU"), pageW - marginR, pageH - 10, { align: "right" });
  };

  // ── Helper: horizontal rule ──
  const drawRule = (width?: number) => {
    doc.setDrawColor(...LIGHT_GREY);
    doc.setLineWidth(0.3);
    doc.line(marginL, y, marginL + (width || contentW), y);
    y += 4;
  };

  // ═══════════════════════════════════════════════════════════════
  // COVER / HEADER
  // ═══════════════════════════════════════════════════════════════

  // Accent bar at top
  doc.setFillColor(...ACCENT);
  doc.rect(0, 0, pageW, 3, "F");

  y = 25;

  // Title
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...NAVY);
  doc.text("Conversation Transcript", marginL, y);
  y += 10;

  // Subtitle
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...GREY);
  doc.text("South Australia Government Document Analysis", marginL, y);
  y += 8;

  drawRule();

  // Metadata row
  doc.setFontSize(9);
  doc.setTextColor(...GREY);
  const dateStr = new Date().toLocaleDateString("en-AU", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  const userMsgCount = conversationMessages.filter(m => m.role === "user").length;
  const assistantMsgCount = conversationMessages.filter(m => m.role === "assistant").length;
  const totalSources = conversationMessages.reduce((sum, m) => sum + (m.sources?.length || 0), 0);

  doc.text(`Date: ${dateStr}`, marginL, y);
  doc.text(`Questions: ${userMsgCount}  |  Responses: ${assistantMsgCount}  |  Sources cited: ${totalSources}`, pageW - marginR, y, { align: "right" });
  y += 10;

  drawRule();
  y += 2;

  // ═══════════════════════════════════════════════════════════════
  // MESSAGES
  // ═══════════════════════════════════════════════════════════════

  conversationMessages.forEach((message, idx) => {
    const isUser = message.role === "user";
    const cleanContent = stripMarkdown(message.content);
    const lines = wrapText(doc, cleanContent, contentW - 8);
    const blockHeight = lines.length * 5 + 14 + (message.sources && includeSources ? message.sources.length * 12 + 8 : 0);

    checkPage(Math.min(blockHeight, 60));

    // Role label
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    if (isUser) doc.setTextColor(14, 165, 233);
    else doc.setTextColor(...ACCENT);
    doc.text(isUser ? "QUESTION" : "RESPONSE", marginL, y);

    // Timestamp
    if (message.timestamp) {
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...GREY);
      doc.setFontSize(8);
      const ts = message.timestamp instanceof Date ? message.timestamp : new Date(message.timestamp);
      doc.text(ts.toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" }), pageW - marginR, y, { align: "right" });
    }

    // Confidence
    if (!isUser && message.confidence) {
      doc.setFontSize(8);
      doc.setTextColor(...GREY);
      doc.text(`[${message.confidence} confidence]`, marginL + 25, y);
    }

    y += 6;

    // Left accent bar
    const barX = marginL;
    const barStartY = y - 1;

    // Content
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...DARK);

    lines.forEach((line: string) => {
      checkPage(6);
      doc.text(line, marginL + 4, y);
      y += 5;
    });

    // Draw accent bar
    if (isUser) doc.setDrawColor(14, 165, 233);
    else doc.setDrawColor(...ACCENT);
    doc.setLineWidth(0.8);
    doc.line(barX, barStartY, barX, Math.min(y - 1, pageH - 25));

    // Sources
    if (includeSources && message.sources && message.sources.length > 0) {
      y += 2;
      checkPage(10);
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...GREY);
      doc.text(`Sources (${message.sources.length}):`, marginL + 4, y);
      y += 5;

      message.sources.forEach((source, sIdx) => {
        checkPage(12);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(...DARK);

        const title = source.title || "Government Document";
        const page = source.pageNumber ? `, p.${source.pageNumber}` : "";
        const relevance = source.relevance ? ` (${Math.round(source.relevance <= 1 ? source.relevance * 100 : source.relevance)}% match)` : "";

        doc.text(`[${sIdx + 1}] ${title}${page}${relevance}`, marginL + 8, y);
        y += 4;

        if (source.snippet) {
          doc.setTextColor(...GREY);
          const snippetLines = wrapText(doc, `"${source.snippet.substring(0, 150)}..."`, contentW - 16);
          snippetLines.slice(0, 2).forEach((sl: string) => {
            checkPage(5);
            doc.text(sl, marginL + 8, y);
            y += 4;
          });
        }
        y += 1;
      });
    }

    y += 6;

    // Separator between messages
    if (idx < conversationMessages.length - 1) {
      checkPage(6);
      doc.setDrawColor(...LIGHT_GREY);
      doc.setLineWidth(0.15);
      doc.line(marginL + 4, y - 3, marginL + contentW - 4, y - 3);
    }
  });

  // ═══════════════════════════════════════════════════════════════
  // FOOTER / DISCLAIMER
  // ═══════════════════════════════════════════════════════════════

  checkPage(30);
  y += 6;
  drawRule();
  y += 2;

  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...NAVY);
  doc.text("Disclaimer", marginL, y);
  y += 5;

  doc.setFont("helvetica", "normal");
  doc.setTextColor(...GREY);
  const disclaimer = "This transcript is generated from an automated document analysis system. All responses are based on publicly available South Australian Government documents. Information should be independently verified before making decisions. This document is intended for reference purposes only.";
  const disclaimerLines = wrapText(doc, disclaimer, contentW);
  disclaimerLines.forEach((line: string) => {
    doc.text(line, marginL, y);
    y += 4;
  });

  // Add footer to last page
  addFooter();

  // ── Save ──
  const filename = `conversation-transcript-${new Date().toISOString().split("T")[0]}.pdf`;
  doc.save(filename);
}
