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
  // For MVP, we'll use a manual paste approach
  // In production, you'd use LinkedIn API or a proxy service
  
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
  // Clean up LinkedIn copied text
  let cleaned = text
    .replace(/\s+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  // Try to identify and structure sections
  const sections = ['Experience', 'Education', 'Skills', 'Summary', 'About'];
  sections.forEach(section => {
    const regex = new RegExp(`(${section})`, 'gi');
    cleaned = cleaned.replace(regex, `\n\n$1\n`);
  });

  return cleaned;
}
