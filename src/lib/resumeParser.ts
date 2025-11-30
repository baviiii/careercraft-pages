import * as pdfjsLib from 'pdfjs-dist';
import { parseImageWithOCR, isImageFile } from './ocrParser';
import { enhancedParseResume, cleanAndFormatResume } from './enhancedResumeParser';

// Configure PDF.js worker with proper HTTPS URL
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export async function parseResume(
  file: File,
  onProgress?: (progress: number) => void
): Promise<string> {
  const fileType = file.type;
  
  let rawText = '';
  
  if (fileType === 'application/pdf') {
    rawText = await parsePDF(file);
  } else if (
    fileType === 'application/msword' || 
    fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    rawText = await parseDOC(file);
  } else if (isImageFile(file)) {
    rawText = await parseImageWithOCR(file, onProgress);
  } else {
    throw new Error('Unsupported file type. Please upload PDF, DOC, DOCX, or image files.');
  }
  
  // Enhanced parsing and formatting
  const parsed = enhancedParseResume(rawText);
  return cleanAndFormatResume(parsed);
}

async function parsePDF(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  
  let fullText = '';
  
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item: any) => item.str)
      .join(' ');
    fullText += pageText + '\n';
  }
  
  return fullText.trim();
}

async function parseDOC(file: File): Promise<string> {
  // For DOC/DOCX files, we'll use a simple text extraction
  // In production, you'd use mammoth.js or similar
  const text = await file.text();
  return text;
}
