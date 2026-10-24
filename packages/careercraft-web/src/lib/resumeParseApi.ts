/* Parsing a résumé from text, and the shape every parse comes back in.

   Split from resumeParser.ts so that pasting text (all a guest can do) loads
   only this: a call to the parse-resume function. resumeParser.ts adds the
   file readers, pdf.js and mammoth, which only uploads need. */
import { supabase } from '@/integrations/supabase/client';

/**
 * Serialise structured AI resume data into plain text (onboarding, ATS, rewrite).
 *
 * Downstream analyzers only ever see THIS text, so every section must survive
 * the round-trip — dropping certifications or projects here is how a nurse's
 * AHPRA registration or a tradie's White Card silently vanishes from analysis.
 */
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
  if (data.skills?.length) text += `SKILLS\n${data.skills.join(', ')}\n\n`;
  if (data.certifications?.length) {
    text += 'CERTIFICATIONS\n';
    data.certifications.forEach((cert) => {
      // Older parse paths return plain strings; newer ones return objects.
      if (typeof cert === 'string') {
        text += `${cert}\n`;
      } else if (cert?.name) {
        text += `${cert.name}${cert.issuer ? ` — ${cert.issuer}` : ''}${cert.date ? ` (${cert.date})` : ''}\n`;
      }
    });
    text += '\n';
  }
  if (data.projects?.length) {
    text += 'PROJECTS\n';
    data.projects.forEach((proj) => {
      text += `${proj.name}${proj.description ? ` — ${proj.description}` : ''}\n`;
      if (proj.technologies?.length) text += `Technologies: ${proj.technologies.join(', ')}\n`;
    });
    text += '\n';
  }
  if (data.languages?.length) {
    text += 'LANGUAGES\n';
    data.languages.forEach((lang) => {
      text += `${lang.language}${lang.proficiency ? ` (${lang.proficiency})` : ''}\n`;
    });
    text += '\n';
  }
  if (data.awards?.length) {
    text += 'AWARDS\n';
    data.awards.forEach((award) => {
      text += `${award.title}${award.issuer ? ` — ${award.issuer}` : ''}${award.date ? ` (${award.date})` : ''}\n`;
    });
    text += '\n';
  }
  if (data.volunteer?.length) {
    text += 'VOLUNTEER\n';
    data.volunteer.forEach((vol) => {
      text += `${vol.role} at ${vol.organization}${vol.description ? ` — ${vol.description}` : ''}\n`;
    });
    text += '\n';
  }
  if (data.publications?.length) {
    text += 'PUBLICATIONS\n';
    data.publications.forEach((pub) => {
      text += `${pub.title}${pub.publisher ? ` — ${pub.publisher}` : ''}${pub.date ? ` (${pub.date})` : ''}\n`;
    });
    text += '\n';
  }
  return text.trimEnd() + '\n';
}

/**
 * Skills come back from the model — keep only clean, short noun phrases.
 * Drops empties, sentence-length fragments, and case-insensitive duplicates
 * so junk never reaches the builder, onboarding, or job matching.
 */
function sanitizeSkills(items: unknown[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of items) {
    if (typeof raw !== 'string') continue;
    const skill = raw.replace(/^[•\-–—*]\s*/, '').trim().replace(/[.;,]+$/, '');
    if (skill.length < 2 || skill.length > 50) continue;
    if (skill.split(/\s+/).length > 5) continue;
    const key = skill.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(skill);
  }
  return out;
}

export function mapEdgeParsedToAIResumeData(parsed: Record<string, unknown>): AIResumeData {
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
    skills: sanitizeSkills((p.skills ?? []).flatMap((s: any) => s.items ?? [])),
    certifications: (p.certifications ?? [])
      .filter((cert: any) => cert?.name)
      .map((cert: any, index: number) => ({
        id: `cert-${index}`,
        name: cert.name,
        issuer: cert.issuer ?? undefined,
        date: cert.date ?? undefined,
        expiryDate: cert.expiryDate ?? undefined,
      })),
    languages: (p.languages ?? [])
      .filter((lang: any) => lang?.language)
      .map((lang: any, index: number) => ({
        id: `lang-${index}`,
        language: lang.language,
        proficiency: lang.proficiency || 'Professional',
      })),
    projects: (p.projects ?? []).map((proj: any, index: number) => ({
      id: `proj-${index}`,
      name: proj.name,
      description: proj.description || '',
      technologies: proj.technologies ?? [],
    })),
    /* These four were parsed by the edge function and then dropped here, so
       they vanished on every import. Referees matter most: a Referees section
       is standard in Australia and losing three of them silently is not a
       cosmetic gap. ResumeData and formatResumeDataAsText already carry all
       four — only this mapper was missing. */
    references: (p.references ?? [])
      .filter((ref: any) => ref?.name)
      .map((ref: any, index: number) => ({
        id: `ref-${index}`,
        name: ref.name,
        title: ref.title ?? undefined,
        company: ref.company ?? undefined,
        phone: ref.phone ?? undefined,
        email: ref.email ?? undefined,
        relationship: ref.relationship ?? undefined,
      })),
    awards: (p.awards ?? [])
      .filter((award: any) => award?.title)
      .map((award: any, index: number) => ({
        id: `award-${index}`,
        title: award.title,
        issuer: award.issuer ?? undefined,
        date: award.date ?? undefined,
        description: award.description ?? undefined,
      })),
    volunteer: (p.volunteer ?? [])
      .filter((vol: any) => vol?.role || vol?.organization)
      .map((vol: any, index: number) => ({
        id: `vol-${index}`,
        role: vol.role ?? '',
        organization: vol.organization ?? '',
        location: vol.location ?? undefined,
        startDate: vol.startDate ?? undefined,
        endDate: vol.endDate ?? undefined,
        current: vol.current ?? false,
        description: vol.description ?? undefined,
      })),
    publications: (p.publications ?? [])
      .filter((pub: any) => pub?.title)
      .map((pub: any, index: number) => ({
        id: `pub-${index}`,
        title: pub.title,
        publisher: pub.publisher ?? undefined,
        date: pub.date ?? undefined,
        url: pub.url ?? undefined,
        description: pub.description ?? undefined,
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

export async function readFunctionsError(error: unknown): Promise<{ error?: string } | null> {
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
