import { PDFDocument, rgb, StandardFonts, PDFPage, PDFFont } from 'pdf-lib';

export interface PDFMetadata {
  title?: string;
  author?: string;
  subject?: string;
  creator?: string;
  pageCount: number;
  creationDate?: Date;
  modificationDate?: Date;
}

export interface PDFTextBlock {
  text: string;
  x: number;
  y: number;
  fontSize: number;
  fontName: string;
  pageIndex: number;
}

export interface ParsedPDF {
  metadata: PDFMetadata;
  text: string;
  pdfBytes: Uint8Array;
  pageCount: number;
}

/**
 * Load and parse a PDF file
 */
export async function loadPDF(file: File): Promise<ParsedPDF> {
  const arrayBuffer = await file.arrayBuffer();
  const pdfBytes = new Uint8Array(arrayBuffer);
  
  const pdfDoc = await PDFDocument.load(pdfBytes, { 
    ignoreEncryption: true,
    updateMetadata: false 
  });
  
  const pages = pdfDoc.getPages();
  
  // Extract metadata
  const metadata: PDFMetadata = {
    title: pdfDoc.getTitle() || undefined,
    author: pdfDoc.getAuthor() || undefined,
    subject: pdfDoc.getSubject() || undefined,
    creator: pdfDoc.getCreator() || undefined,
    pageCount: pages.length,
    creationDate: pdfDoc.getCreationDate() || undefined,
    modificationDate: pdfDoc.getModificationDate() || undefined,
  };

  // Note: pdf-lib doesn't extract text content directly
  // We'll use pdfjs-dist for text extraction and pdf-lib for modification
  // For now, return empty text - will be filled by pdfjs
  return {
    metadata,
    text: '',
    pdfBytes,
    pageCount: pages.length,
  };
}

/**
 * Create a new PDF from text content
 */
export async function createPDFFromText(
  content: string,
  options: {
    title?: string;
    author?: string;
    fontSize?: number;
    margin?: number;
    lineHeight?: number;
  } = {}
): Promise<Uint8Array> {
  const {
    title = 'Resume',
    author = 'CareerCraft',
    fontSize = 11,
    margin = 50,
    lineHeight = 1.4,
  } = options;

  const pdfDoc = await PDFDocument.create();
  
  // Set metadata
  pdfDoc.setTitle(title);
  pdfDoc.setAuthor(author);
  pdfDoc.setCreator('CareerCraft Resume Builder');
  pdfDoc.setProducer('CareerCraft');
  pdfDoc.setCreationDate(new Date());
  pdfDoc.setModificationDate(new Date());

  // Embed font
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Page dimensions (Letter size)
  const pageWidth = 612;
  const pageHeight = 792;
  const contentWidth = pageWidth - margin * 2;
  const lineHeightPx = fontSize * lineHeight;

  // Split content into lines
  const lines = content.split('\n');
  
  let currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
  let yPosition = pageHeight - margin;

  for (const line of lines) {
    // Check if we need a new page
    if (yPosition < margin + lineHeightPx) {
      currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
      yPosition = pageHeight - margin;
    }

    // Detect headers (lines that are all caps or start with common header words)
    const isHeader = /^(EXPERIENCE|EDUCATION|SKILLS|SUMMARY|OBJECTIVE|PROJECTS|CERTIFICATIONS|AWARDS|CONTACT|PROFESSIONAL|WORK|TECHNICAL)/i.test(line.trim());
    const currentFont = isHeader ? boldFont : font;
    const currentFontSize = isHeader ? fontSize + 2 : fontSize;

    // Word wrap
    const words = line.split(' ');
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const textWidth = currentFont.widthOfTextAtSize(testLine, currentFontSize);

      if (textWidth > contentWidth && currentLine) {
        // Draw current line and start new one
        currentPage.drawText(currentLine, {
          x: margin,
          y: yPosition,
          size: currentFontSize,
          font: currentFont,
          color: rgb(0.1, 0.1, 0.1),
        });
        yPosition -= lineHeightPx;
        currentLine = word;

        // Check for new page
        if (yPosition < margin + lineHeightPx) {
          currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
          yPosition = pageHeight - margin;
        }
      } else {
        currentLine = testLine;
      }
    }

    // Draw remaining text
    if (currentLine) {
      currentPage.drawText(currentLine, {
        x: margin,
        y: yPosition,
        size: currentFontSize,
        font: currentFont,
        color: rgb(0.1, 0.1, 0.1),
      });
    }

    yPosition -= lineHeightPx;

    // Add extra space after headers
    if (isHeader) {
      yPosition -= lineHeightPx * 0.3;
    }
  }

  return await pdfDoc.save();
}

/**
 * Modify an existing PDF by adding/overlaying text
 */
export async function modifyPDF(
  pdfBytes: Uint8Array,
  modifications: {
    pageIndex: number;
    text: string;
    x: number;
    y: number;
    fontSize?: number;
    color?: { r: number; g: number; b: number };
  }[]
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const pages = pdfDoc.getPages();

  for (const mod of modifications) {
    if (mod.pageIndex >= 0 && mod.pageIndex < pages.length) {
      const page = pages[mod.pageIndex];
      const color = mod.color || { r: 0, g: 0, b: 0 };
      
      page.drawText(mod.text, {
        x: mod.x,
        y: mod.y,
        size: mod.fontSize || 12,
        font,
        color: rgb(color.r, color.g, color.b),
      });
    }
  }

  pdfDoc.setModificationDate(new Date());
  return await pdfDoc.save();
}

/**
 * Merge multiple PDFs into one
 */
export async function mergePDFs(pdfBytesArray: Uint8Array[]): Promise<Uint8Array> {
  const mergedPdf = await PDFDocument.create();

  for (const pdfBytes of pdfBytesArray) {
    const pdf = await PDFDocument.load(pdfBytes);
    const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
    copiedPages.forEach((page) => mergedPdf.addPage(page));
  }

  return await mergedPdf.save();
}

/**
 * Extract specific pages from a PDF
 */
export async function extractPages(
  pdfBytes: Uint8Array,
  pageIndices: number[]
): Promise<Uint8Array> {
  const srcDoc = await PDFDocument.load(pdfBytes);
  const newDoc = await PDFDocument.create();
  
  const copiedPages = await newDoc.copyPages(srcDoc, pageIndices);
  copiedPages.forEach((page) => newDoc.addPage(page));

  return await newDoc.save();
}

/**
 * Get PDF page dimensions
 */
export async function getPageDimensions(
  pdfBytes: Uint8Array
): Promise<{ width: number; height: number }[]> {
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const pages = pdfDoc.getPages();
  
  return pages.map((page) => ({
    width: page.getWidth(),
    height: page.getHeight(),
  }));
}

/**
 * Convert PDF to base64 data URL for preview
 */
export function pdfBytesToDataUrl(pdfBytes: Uint8Array): string {
  const base64 = btoa(
    pdfBytes.reduce((data, byte) => data + String.fromCharCode(byte), '')
  );
  return `data:application/pdf;base64,${base64}`;
}

/**
 * Download PDF bytes as a file
 */
export function downloadPDF(pdfBytes: Uint8Array, filename: string): void {
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Create a professional resume PDF with sections
 */
export async function createResumePDF(
  resumeData: {
    name: string;
    email?: string;
    phone?: string;
    location?: string;
    summary?: string;
    experience?: { title: string; company: string; dates: string; bullets: string[] }[];
    education?: { degree: string; school: string; dates: string }[];
    skills?: string[];
  }
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([612, 792]); // Letter size
  
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
  const margin = 50;
  const pageWidth = 612;
  let y = 742; // Start from top
  
  const drawText = (text: string, options: { font?: PDFFont; size?: number; x?: number; color?: any } = {}) => {
    const font = options.font || helvetica;
    const size = options.size || 11;
    const x = options.x || margin;
    const color = options.color || rgb(0.1, 0.1, 0.1);
    
    page.drawText(text, { x, y, size, font, color });
    y -= size * 1.4;
  };
  
  const drawSection = (title: string) => {
    y -= 10;
    drawText(title.toUpperCase(), { font: helveticaBold, size: 12, color: rgb(0.2, 0.4, 0.6) });
    page.drawLine({
      start: { x: margin, y: y + 8 },
      end: { x: pageWidth - margin, y: y + 8 },
      thickness: 1,
      color: rgb(0.8, 0.8, 0.8),
    });
    y -= 5;
  };
  
  // Header - Name
  drawText(resumeData.name, { font: helveticaBold, size: 24, color: rgb(0.1, 0.1, 0.1) });
  
  // Contact info
  const contactParts = [resumeData.email, resumeData.phone, resumeData.location].filter(Boolean);
  if (contactParts.length > 0) {
    drawText(contactParts.join(' • '), { size: 10, color: rgb(0.4, 0.4, 0.4) });
  }
  
  // Summary
  if (resumeData.summary) {
    drawSection('Summary');
    const words = resumeData.summary.split(' ');
    let line = '';
    for (const word of words) {
      const testLine = line ? `${line} ${word}` : word;
      if (helvetica.widthOfTextAtSize(testLine, 11) > pageWidth - margin * 2) {
        drawText(line);
        line = word;
      } else {
        line = testLine;
      }
    }
    if (line) drawText(line);
  }
  
  // Experience
  if (resumeData.experience && resumeData.experience.length > 0) {
    drawSection('Experience');
    for (const exp of resumeData.experience) {
      drawText(exp.title, { font: helveticaBold, size: 11 });
      drawText(`${exp.company} | ${exp.dates}`, { size: 10, color: rgb(0.4, 0.4, 0.4) });
      for (const bullet of exp.bullets) {
        drawText(`• ${bullet}`, { x: margin + 10 });
      }
      y -= 5;
    }
  }
  
  // Education
  if (resumeData.education && resumeData.education.length > 0) {
    drawSection('Education');
    for (const edu of resumeData.education) {
      drawText(edu.degree, { font: helveticaBold, size: 11 });
      drawText(`${edu.school} | ${edu.dates}`, { size: 10, color: rgb(0.4, 0.4, 0.4) });
      y -= 5;
    }
  }
  
  // Skills
  if (resumeData.skills && resumeData.skills.length > 0) {
    drawSection('Skills');
    drawText(resumeData.skills.join(' • '));
  }
  
  // Set metadata
  pdfDoc.setTitle(`${resumeData.name} - Resume`);
  pdfDoc.setAuthor(resumeData.name);
  pdfDoc.setCreator('CareerCraft');
  pdfDoc.setCreationDate(new Date());
  
  return await pdfDoc.save();
}
