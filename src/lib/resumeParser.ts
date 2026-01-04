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
    console.log('🤖 Calling AI parse-resume edge function with pre-extracted text...');

    // Count pages for PDFs
    let pageCount = 1;
    if (fileType === 'application/pdf') {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        pageCount = pdf.numPages;
      } catch {
        pageCount = 1;
      }
    }

    const { data, error } = await supabase.functions.invoke('parse-resume', {
      body: {
        rawText,
        fileName: file.name,
        fileType: file.type,
        pageCount
      }
    });
    
    if (onProgress) onProgress(90);
    
    if (error) {
      console.error('❌ AI parsing error:', error);
      throw new Error('AI parsing failed, falling back to basic parsing');
    }

    if (!data.success) {
      console.error('❌ AI returned error:', data.error);
      throw new Error(data.error || 'AI parsing failed');
    }

    if (data?.parsed) {
      const parsed = data.parsed;
      console.log('✅ AI parsing successful! Extracted:', {
        name: parsed.personalInfo?.fullName,
        experienceCount: parsed.workExperience?.length,
        skillsCount: parsed.skills?.reduce((acc: number, s: any) => acc + s.items.length, 0)
      });

      if (onProgress) onProgress(100);

      // Transform ParsedResume to AIResumeData format
      const transformedData: AIResumeData = {
        contact: {
          name: parsed.personalInfo.fullName || '',
          email: parsed.personalInfo.email || '',
          phone: parsed.personalInfo.phone || '',
          location: parsed.personalInfo.location || '',
          linkedin: parsed.personalInfo.linkedin,
          website: parsed.personalInfo.website,
        },
        summary: parsed.personalInfo.summary || '',
        experience: parsed.workExperience.map((exp: any, index: number) => ({
          id: `exp-${index}`,
          title: exp.title,
          company: exp.company,
          location: exp.location || '',
          startDate: exp.startDate || '',
          endDate: exp.current ? 'Present' : (exp.endDate || ''),
          current: exp.current,
          bullets: exp.bullets,
        })),
        education: parsed.education.map((edu: any, index: number) => ({
          id: `edu-${index}`,
          degree: edu.degree,
          school: edu.institution,
          location: edu.field || '',
          graduationDate: edu.endDate || '',
          gpa: edu.gpa,
        })),
        skills: parsed.skills.flatMap((s: any) => s.items),
        certifications: parsed.certifications?.map((cert: any) => cert.name) || [],
        projects: parsed.projects?.map((proj: any, index: number) => ({
          id: `proj-${index}`,
          name: proj.name,
          description: proj.description || '',
          technologies: proj.technologies,
        })) || [],
      };

      return transformedData;
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

// Parse raw text directly with AI (for when we already have text)
export async function parseResumeTextWithAI(
  rawText: string,
  fileName: string = 'document.txt',
  fileType: string = 'text/plain'
): Promise<AIResumeData> {
  try {
    console.log('🤖 Calling AI parse-resume edge function with text...');
    const { data, error } = await supabase.functions.invoke('parse-resume', {
      body: {
        rawText,
        fileName,
        fileType,
        pageCount: 1
      }
    });

    if (error) {
      console.error('❌ AI parsing error:', error);
      throw new Error('AI parsing failed');
    }

    if (!data.success) {
      console.error('❌ AI returned error:', data.error);
      throw new Error(data.error || 'AI parsing failed');
    }

    if (data?.parsed) {
      const parsed = data.parsed;
      console.log('✅ AI text parsing successful!');

      // Transform ParsedResume to AIResumeData format
      const transformedData: AIResumeData = {
        contact: {
          name: parsed.personalInfo.fullName || '',
          email: parsed.personalInfo.email || '',
          phone: parsed.personalInfo.phone || '',
          location: parsed.personalInfo.location || '',
          linkedin: parsed.personalInfo.linkedin,
          website: parsed.personalInfo.website,
        },
        summary: parsed.personalInfo.summary || '',
        experience: parsed.workExperience.map((exp: any, index: number) => ({
          id: `exp-${index}`,
          title: exp.title,
          company: exp.company,
          location: exp.location || '',
          startDate: exp.startDate || '',
          endDate: exp.current ? 'Present' : (exp.endDate || ''),
          current: exp.current,
          bullets: exp.bullets,
        })),
        education: parsed.education.map((edu: any, index: number) => ({
          id: `edu-${index}`,
          degree: edu.degree,
          school: edu.institution,
          location: edu.field || '',
          graduationDate: edu.endDate || '',
          gpa: edu.gpa,
        })),
        skills: parsed.skills.flatMap((s: any) => s.items),
        certifications: parsed.certifications?.map((cert: any) => cert.name) || [],
        projects: parsed.projects?.map((proj: any, index: number) => ({
          id: `proj-${index}`,
          name: proj.name,
          description: proj.description || '',
          technologies: proj.technologies,
        })) || [],
      };

      return transformedData;
    }

    throw new Error('No data returned from AI parser');
  } catch (err) {
    console.warn('⚠️ AI text parsing failed, using FALLBACK regex parsing:', err);
    // Fallback to basic parsing
    const parsed = enhancedParseResume(rawText);

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
