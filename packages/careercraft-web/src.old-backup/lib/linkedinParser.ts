export interface LinkedInProfile {
  name: string;
  headline: string;
  summary: string;
  experience: Array<{
    title: string;
    company: string;
    duration: string;
    description: string;
  }>;
  education: Array<{
    school: string;
    degree: string;
    field: string;
    years: string;
  }>;
  skills: string[];
}

export async function parseLinkedInProfile(profileUrl: string): Promise<string> {
  throw new Error(
    'LinkedIn import requires you to manually copy your profile text. ' +
    'Go to your LinkedIn profile, select all text (Ctrl+A), copy it, and paste it here instead.'
  );
}

export function formatLinkedInDataToResume(data: LinkedInProfile): string {
  let resume = '';

  // Contact & Summary
  resume += `${data.name}\n`;
  resume += `${data.headline}\n\n`;
  resume += `PROFESSIONAL SUMMARY\n${data.summary}\n\n`;

  // Experience
  if (data.experience.length > 0) {
    resume += 'WORK EXPERIENCE\n';
    data.experience.forEach(exp => {
      resume += `${exp.title} | ${exp.company} | ${exp.duration}\n`;
      resume += `${exp.description}\n\n`;
    });
  }

  // Education
  if (data.education.length > 0) {
    resume += 'EDUCATION\n';
    data.education.forEach(edu => {
      resume += `${edu.degree} in ${edu.field}\n`;
      resume += `${edu.school} | ${edu.years}\n\n`;
    });
  }

  // Skills
  if (data.skills.length > 0) {
    resume += 'SKILLS\n';
    resume += data.skills.join(', ');
  }

  return resume;
}

export function parseLinkedInText(text: string): string {
  if (!text || text.trim().length === 0) {
    throw new Error('Please paste your LinkedIn profile text');
  }

  // Clean up LinkedIn copied text
  let cleaned = text
    .replace(/\s+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  // Identify and structure common LinkedIn sections
  const sections = [
    'Experience', 'Work Experience', 'Professional Experience',
    'Education', 'Academic Background',
    'Skills', 'Technical Skills', 'Core Competencies',
    'Summary', 'About', 'Profile Summary',
    'Certifications', 'Licenses & Certifications',
    'Projects', 'Key Projects',
    'Volunteer', 'Volunteer Experience'
  ];
  
  sections.forEach(section => {
    const regex = new RegExp(`\\b(${section})\\b`, 'gi');
    cleaned = cleaned.replace(regex, '\n\n$1\n');
  });

  // Format job entries (Company | Position | Date)
  cleaned = cleaned.replace(/(\d{4})\s*-\s*(Present|Current|\d{4})/gi, '\n$1 - $2');
  
  // Add spacing around bullet points
  cleaned = cleaned.replace(/•/g, '\n• ');
  
  return cleaned.trim();
}
