import * as pdfjsLib from 'pdfjs-dist';
// @ts-ignore Vite worker import with query param
import pdfWorkerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?worker&url';
import mammoth from 'mammoth';
import { supabase, SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from '@/integrations/supabase/client';

import { type AIResumeData, mapEdgeParsedToAIResumeData, parseResumeTextWithAI, readFunctionsError } from './resumeParseApi';

// Text parsing lives in resumeParseApi.ts; re-exported so existing imports keep working.
export { formatResumeDataAsText } from './resumeParseApi';
export { parseResumeTextWithAI };
export type { AIResumeData };

(pdfjsLib as any).GlobalWorkerOptions.workerSrc = pdfWorkerSrc as unknown as string;

const MAX_VISION_PAGES = 2;
const PDF_RENDER_SCALE = 1.5;

/**
 * Single entry point for resume extraction.
 * TXT/DOCX → text path. PDF/images → vision-first on server (Azure OpenAI multimodal), DI fallback automatic.
 */
export async function extractResumeFromFile(
  file: File,
  onProgress?: (progress: number) => void,
): Promise<AIResumeData> {
  const isTxt =
    file.type === 'text/plain' || file.name.toLowerCase().endsWith('.txt');
  if (isTxt) {
    const rawText = await file.text();
    if (!rawText.trim()) throw new Error('Text file is empty.');
    return parseResumeTextWithAI(rawText, file.name, 'text/plain');
  }

  const isDocx =
    file.type === 'application/msword' ||
    file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    file.name.endsWith('.docx') ||
    file.name.endsWith('.doc');

  if (isDocx) {
    if (onProgress) onProgress(25);
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    const rawText = result.value?.trim();
    if (!rawText) throw new Error('Could not extract text from this document.');
    if (onProgress) onProgress(50);
    return parseResumeTextWithAI(rawText, file.name, file.type);
  }

  return parseResumeWithAI(file, onProgress);
}

/** Render PDF pages to JPEG data URLs for multimodal vision parsing on the server. */
async function renderPdfPageImages(file: File, maxPages = MAX_VISION_PAGES): Promise<string[]> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const pageCount = Math.min(pdf.numPages, maxPages);
  const images: string[] = [];

  for (let i = 1; i <= pageCount; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: PDF_RENDER_SCALE });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not render PDF page');

    await page.render({ canvasContext: ctx, viewport }).promise;
    images.push(canvas.toDataURL('image/jpeg', 0.88));
  }

  return images;
}

function isImageFile(file: File): boolean {
  return file.type.startsWith('image/');
}

async function getResumeParseAuthHeaders(): Promise<HeadersInit> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error('Authentication required. Please sign in to parse resumes.');
  }

  return {
    Authorization: `Bearer ${session.access_token}`,
  };
}

async function invokeParseResumeVision(
  file: File,
  pageImages: string[],
  onProgress?: (progress: number) => void,
): Promise<AIResumeData> {
  if (onProgress) onProgress(40);

  const formData = new FormData();
  formData.append('file', file);
  formData.append('fileName', file.name);
  if (pageImages.length > 0) {
    formData.append('pageImages', JSON.stringify(pageImages));
  }

  const response = await fetch(`${SUPABASE_URL}/functions/v1/parse-resume`, {
    method: 'POST',
    headers: await getResumeParseAuthHeaders(),
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorData: { error?: string } = {};
    try {
      errorData = JSON.parse(errorText);
    } catch {
      errorData = { error: errorText };
    }
    throw new Error(errorData.error || `Failed to parse resume (${response.status})`);
  }

  const data = await response.json();
  if (onProgress) onProgress(90);

  if (!data.success || !data.parsed) {
    throw new Error(data.error || 'AI parsing failed');
  }

  console.log(`✅ Resume parsed via ${data.extractionRoute ?? 'vision'}`);
  return mapEdgeParsedToAIResumeData(data.parsed);
}

/** PDF + images: render/send to vision-first parse-resume (Azure OpenAI multimodal + DI fallback on server). */
export async function parseResumeWithAI(
  file: File,
  onProgress?: (progress: number) => void,
): Promise<AIResumeData> {
  if (onProgress) onProgress(10);

  const supportedTypes = [
    'application/pdf',
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/webp',
  ];

  if (!supportedTypes.includes(file.type) && !isImageFile(file)) {
    throw new Error('Unsupported file type. Please upload PDF or image files.');
  }

  if (onProgress) onProgress(20);

  let pageImages: string[] = [];
  if (file.type === 'application/pdf') {
    if (onProgress) onProgress(30);
    pageImages = await renderPdfPageImages(file);
  }

  const result = await invokeParseResumeVision(file, pageImages, onProgress);
  if (onProgress) onProgress(100);
  return result;
}
