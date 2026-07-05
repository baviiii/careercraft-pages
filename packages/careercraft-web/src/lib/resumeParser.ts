import * as pdfjsLib from 'pdfjs-dist';
// Use bundled worker to avoid CDN fake worker failures in Vite
// @ts-ignore Vite worker import with query param
import pdfWorkerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?worker&url';
import mammoth from 'mammoth';
import { parseImageWithOCR, isImageFile } from './ocrParser';
import { enhancedParseResume, type ParsedResume } from './enhancedResumeParser';
import { supabase, SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from '@/integrations/supabase/client';

// Configure PDF.js worker using bundled worker URL
(pdfjsLib as any).GlobalWorkerOptions.workerSrc = pdfWorkerSrc as unknown as string;

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
 * Single entry point for resume extraction — always routes through parse-resume edge fn.
 * TXT → text body; everything else → FormData (Azure Document Intelligence + Azure OpenAI).
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
  return parseResumeWithAI(file, onProgress);
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

// AI-powered resume parsing (Azure Document Intelligence + Azure OpenAI via edge function)
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
  // Optional sections
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

export async function parseResumeWithAI(
  file: File,
  onProgress?: (progress: number) => void
): Promise<AIResumeData> {
  const fileType = file.type;
  
  if (onProgress) onProgress(10);
  
  // Validate file type
  const supportedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/png',
    'image/jpeg',
    'image/jpg'
  ];
  
  if (!supportedTypes.includes(fileType) && !isImageFile(file)) {
    throw new Error('Unsupported file type. Please upload PDF, DOC, DOCX, or image files.');
  }
  
  if (onProgress) onProgress(20);
  
  // Send file directly to edge function - use Document Intelligence for extraction
  try {
    console.log('📄 Sending file to Document Intelligence for extraction...');

    // Create FormData to send file directly
    const formData = new FormData();
    formData.append('file', file);
    formData.append('fileName', file.name);

    // Use fetch directly since supabase.functions.invoke doesn't support FormData well
    const { data: { session } } = await supabase.auth.getSession();
    
    if (onProgress) onProgress(40);

    const response = await fetch(`${SUPABASE_URL}/functions/v1/parse-resume`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session?.access_token || SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: formData
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { error: errorText };
      }
      
      console.error('❌ Parse-resume error:', errorData);
      
      // If Document Intelligence is not configured or fails, fall back to client-side extraction
      if (errorData.error?.includes('Document Intelligence not configured') || 
          errorData.error?.includes('Document analysis failed') ||
          response.status === 500) {
        console.warn('⚠️ Document Intelligence unavailable, falling back to client-side extraction...');
        
        // Fallback to client-side extraction
        if (onProgress) onProgress(30);
        
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
          throw new Error('Unsupported file type');
        }
        
        if (onProgress) onProgress(60);
        
        // Send pre-extracted text to AI parser
        const { data: fallbackData, error: fallbackError } = await supabase.functions.invoke('parse-resume', {
          body: {
            rawText,
            fileName: file.name,
            fileType: file.type,
            pageCount: 1
          }
        });
        
        if (fallbackError || !fallbackData?.success) {
          throw new Error(fallbackData?.error || 'AI parsing failed');
        }
        
        const data = fallbackData;
        if (onProgress) onProgress(90);
        
        if (data?.parsed) {
          const parsed = data.parsed;
          console.log('✅ AI parsing successful (fallback mode)! Extracted:', {
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
      }
      
      throw new Error(`Failed to parse resume: ${response.status} - ${errorData.error || errorText}`);
    }

    const data = await response.json();
    
    if (onProgress) onProgress(90);
    
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
    console.error('⚠️ AI parsing failed:', err);
    throw err; // Re-throw to let caller handle
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

// Re-export legacy regex types (fallback only inside parseResumeTextWithAI)
export type { ParsedResume };
