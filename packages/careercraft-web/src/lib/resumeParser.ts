import * as pdfjsLib from 'pdfjs-dist';
// @ts-ignore Vite worker import with query param
import pdfWorkerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?worker&url';
import mammoth from 'mammoth';
import { supabase, SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from '@/integrations/supabase/client';

(pdfjsLib as any).GlobalWorkerOptions.workerSrc = pdfWorkerSrc as unknown as string;

const MAX_VISION_PAGES = 2;
const PDF_RENDER_SCALE = 1.5;

/** Serialise structured AI resume data into plain text (onboarding, ATS, rewrite). */
export function formatResumeDataAsText(data: AIResumeData): string {
  let text = '';
  if (data.contact) {
    text += `${data.contact.name || ''}\n`;
    text += `${data.contact.email || ''} | ${data.contact.phone || ''} | ${data.contact.location || ''}\n`;
    if (data.contact.linkedin) text += `${data.contact.linkedin}\n`;
    text += '\n';
  }
  if (data.summary) text += `SUMMARY\n${data.summary}\n\n`;
  if (data.experience?.length) {
    text += 'EXPERIENCE\n';
    data.experience.forEach((exp) => {
      text += `${exp.title} at ${exp.company}\n`;
      text += `${exp.startDate} - ${exp.endDate}${exp.location ? ` | ${exp.location}` : ''}\n`;
      exp.bullets?.forEach((b) => {
        text += `• ${b}\n`;
      });
      text += '\n';
    });
  }
  if (data.education?.length) {
    text += 'EDUCATION\n';
    data.education.forEach((edu) => {
      text += `${edu.degree} - ${edu.school}\n`;
      text += `${edu.graduationDate}${edu.gpa ? ` | GPA: ${edu.gpa}` : ''}\n\n`;
    });
  }
  if (data.skills?.length) text += `SKILLS\n${data.skills.join(', ')}\n`;
  return text;
}

/**
 * Single entry point for resume extraction.
 * TXT/DOCX → text path. PDF/images → vision-first on server (Gemini Flash), DI fallback automatic.
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
  return {
    Authorization: `Bearer ${session?.access_token || SUPABASE_PUBLISHABLE_KEY}`,
  };
}

function mapEdgeParsedToAIResumeData(parsed: Record<string, unknown>): AIResumeData {
  const p = parsed as Record<string, any>;
  return {
    contact: {
      name: p.personalInfo?.fullName || '',
      email: p.personalInfo?.email || '',
      phone: p.personalInfo?.phone || '',
      location: p.personalInfo?.location || '',
      linkedin: p.personalInfo?.linkedin ?? undefined,
      website: p.personalInfo?.website ?? undefined,
    },
    summary: p.personalInfo?.summary || '',
    experience: (p.workExperience ?? []).map((exp: any, index: number) => ({
      id: `exp-${index}`,
      title: exp.title,
      company: exp.company,
      location: exp.location || '',
      startDate: exp.startDate || '',
      endDate: exp.current ? 'Present' : exp.endDate || '',
      current: exp.current,
      bullets: exp.bullets ?? [],
    })),
    education: (p.education ?? []).map((edu: any, index: number) => ({
      id: `edu-${index}`,
      degree: edu.degree,
      school: edu.institution,
      location: edu.field || '',
      graduationDate: edu.endDate || '',
      gpa: edu.gpa ?? undefined,
    })),
    skills: (p.skills ?? []).flatMap((s: any) => s.items ?? []),
    certifications: (p.certifications ?? []).map((cert: any) => cert.name),
    projects: (p.projects ?? []).map((proj: any, index: number) => ({
      id: `proj-${index}`,
      name: proj.name,
      description: proj.description || '',
      technologies: proj.technologies ?? [],
    })),
  };
}

async function invokeParseResumeJson(body: {
  rawText: string;
  fileName: string;
  fileType: string;
  pageCount: number;
}): Promise<AIResumeData> {
  const { data, error } = await supabase.functions.invoke('parse-resume', { body });

  if (error) {
    const bodyErr = await readFunctionsError(error);
    throw new Error(bodyErr?.error || error.message || 'AI parsing failed');
  }

  if (!data?.success || !data?.parsed) {
    throw new Error(data?.error || 'AI parsing returned no result');
  }

  console.log(`✅ Resume parsed via ${data.extractionRoute ?? 'text'}`);
  return mapEdgeParsedToAIResumeData(data.parsed);
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

async function readFunctionsError(error: unknown): Promise<{ error?: string } | null> {
  const ctx = (error as { context?: Response }).context;
  if (!ctx || typeof ctx.clone !== 'function') return null;
  try {
    return (await ctx.clone().json()) as { error?: string };
  } catch {
    return null;
  }
}

export interface AIResumeData {
  contact: {
    name: string;
    email: string;
    phone: string;
    location: string;
    linkedin?: string;
    website?: string;
  };
  summary: string;
  experience: {
    id: string;
    title: string;
    company: string;
    location: string;
    startDate: string;
    endDate: string;
    current: boolean;
    bullets: string[];
  }[];
  education: {
    id: string;
    degree: string;
    school: string;
    location: string;
    graduationDate: string;
    gpa?: string;
  }[];
  skills: string[];
  projects?: {
    id: string;
    name: string;
    description: string;
    technologies: string[];
  }[];
  certifications?: {
    id: string;
    name: string;
    issuer?: string;
    date?: string;
    expiryDate?: string;
  }[];
  references?: {
    id: string;
    name: string;
    title?: string;
    company?: string;
    phone?: string;
    email?: string;
    relationship?: string;
  }[];
  languages?: {
    id: string;
    language: string;
    proficiency: string;
  }[];
  awards?: {
    id: string;
    title: string;
    issuer?: string;
    date?: string;
    description?: string;
  }[];
  volunteer?: {
    id: string;
    role: string;
    organization: string;
    location?: string;
    startDate?: string;
    endDate?: string;
    current?: boolean;
    description?: string;
  }[];
  publications?: {
    id: string;
    title: string;
    publisher?: string;
    date?: string;
    url?: string;
    description?: string;
  }[];
}

/** PDF + images: render/send to vision-first parse-resume (Gemini Flash + DI fallback on server). */
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

export async function parseResumeTextWithAI(
  rawText: string,
  fileName: string = 'document.txt',
  fileType: string = 'text/plain',
): Promise<AIResumeData> {
  return invokeParseResumeJson({
    rawText,
    fileName,
    fileType,
    pageCount: 1,
  });
}
