import * as pdfjsLib from 'pdfjs-dist';
// Use bundled worker to avoid CDN fake worker failures in Vite
// @ts-ignore Vite worker import with query param
import pdfWorkerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?worker&url';
import mammoth from 'mammoth';
import { parseImageWithOCR, isImageFile } from './ocrParser';
import { enhancedParseResume, cleanAndFormatResume, ParsedResume } from './enhancedResumeParser';
import { supabase } from '@/integrations/supabase/client';

// Configure PDF.js worker using bundled worker URL
(pdfjsLib as any).GlobalWorkerOptions.workerSrc = pdfWorkerSrc as unknown as string;

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
  const arrayBuffer = await file.arrayBuffer();
  
  try {
    // Use mammoth for DOCX files
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
  } catch (error) {
    console.error('Mammoth parsing failed, trying fallback:', error);
    // Fallback for older .doc files
    const text = await file.text();
    return text;
  }
}

// Export structured parsing for the editor
export async function parseResumeStructured(
  file: File,
  onProgress?: (progress: number) => void
): Promise<ParsedResume> {
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
  
  // Return structured data instead of formatted text
  return enhancedParseResume(rawText);
}

// AI-powered resume parsing for better extraction
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
  certifications?: string[];
  projects?: {
    id: string;
    name: string;
    description: string;
    technologies: string[];
  }[];
}

export async function parseResumeWithAI(
  file: File,
  onProgress?: (progress: number) => void
): Promise<AIResumeData> {
  const fileType = file.type;
  
  let rawText = '';
  
  // Extract raw text first
  if (onProgress) onProgress(10);
  
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
  
  if (onProgress) onProgress(40);
  
  // Use AI to parse the extracted text
  try {
    console.log('🤖 Calling AI parse-resume edge function...');
    const { data, error } = await supabase.functions.invoke('parse-resume', {
      body: { rawText }
    });
    
    if (onProgress) onProgress(90);
    
    if (error) {
      console.error('❌ AI parsing error:', error);
      throw new Error('AI parsing failed, falling back to basic parsing');
    }
    
    if (data?.error) {
      console.error('❌ AI returned error:', data.error);
      throw new Error(data.error);
    }
    
    if (data?.data) {
      console.log('✅ AI parsing successful! Extracted:', {
        name: data.data.contact?.name,
        experienceCount: data.data.experience?.length,
        skillsCount: data.data.skills?.length
      });
      if (data?.usage) {
        console.log('📊 TOKENS USED:', {
          prompt: data.usage.prompt_tokens,
          completion: data.usage.completion_tokens,
          total: data.usage.total_tokens
        });
      }
      if (onProgress) onProgress(100);
      return data.data as AIResumeData;
    }
    
    throw new Error('No data returned from AI parser');
  } catch (err) {
    console.warn('⚠️ AI parsing failed, using FALLBACK regex parsing:', err);
    // Fallback to basic parsing
    const parsed = enhancedParseResume(rawText);
    if (onProgress) onProgress(100);
    
    return {
      contact: {
        name: parsed.contact.name || '',
        email: parsed.contact.email || '',
        phone: parsed.contact.phone || '',
        location: parsed.contact.location || '',
        linkedin: parsed.contact.linkedin || '',
        website: '',
      },
      summary: parsed.sections.summary || '',
      experience: [],
      education: [],
      skills: parsed.sections.skills
        ? parsed.sections.skills.split(/[,•|·\n]/).map(s => s.trim()).filter(s => s.length > 1 && s.length < 50)
        : [],
      certifications: [],
      projects: [],
    };
  }
}

// Re-export types
export type { ParsedResume };
