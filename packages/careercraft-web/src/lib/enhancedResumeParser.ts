export interface ParsedResume {
  rawText: string;
  contact: {
    name: string;
    email: string;
    phone: string;
    location: string;
    linkedin?: string;
  };
  sections: {
    summary: string;
    experience: string;
    education: string;
    skills: string;
    certifications?: string;
    other: string;
  };
}

export function enhancedParseResume(text: string): ParsedResume {
  const lines = text.split('\n').map(line => line.trim()).filter(Boolean);
  
  const result: ParsedResume = {
    rawText: text,
    contact: extractContactInfo(text),
    sections: {
      summary: '',
      experience: '',
      education: '',
      skills: '',
      certifications: '',
      other: '',
    },
  };

  let currentSection: keyof typeof result.sections = 'other';
  const sectionContent: { [key: string]: string[] } = {
    summary: [],
    experience: [],
    education: [],
    skills: [],
    certifications: [],
    other: [],
  };

  lines.forEach(line => {
    const lowerLine = line.toLowerCase();

    // Detect section headers
    if (
      lowerLine.includes('summary') ||
      lowerLine.includes('objective') ||
      lowerLine.includes('profile') ||
      lowerLine.match(/^(about|about me)$/i)
    ) {
      currentSection = 'summary';
    } else if (
      lowerLine.includes('experience') ||
      lowerLine.includes('employment') ||
      lowerLine.includes('work history') ||
      lowerLine.match(/^(work|career)$/i)
    ) {
      currentSection = 'experience';
    } else if (
      lowerLine.includes('education') ||
      lowerLine.includes('academic') ||
      lowerLine.includes('qualification')
    ) {
      currentSection = 'education';
    } else if (
      lowerLine.includes('skill') ||
      lowerLine.includes('technical') ||
      lowerLine.includes('technologies') ||
      lowerLine.includes('competencies')
    ) {
      currentSection = 'skills';
    } else if (
      lowerLine.includes('certification') ||
      lowerLine.includes('license') ||
      lowerLine.includes('credential')
    ) {
      currentSection = 'certifications';
    } else if (!isLikelySectionHeader(line)) {
      // Don't add the section header itself
      sectionContent[currentSection].push(line);
    }
  });

  // Join section content
  Object.keys(sectionContent).forEach(key => {
    result.sections[key as keyof typeof result.sections] = sectionContent[key].join('\n');
  });

  return result;
}

function extractContactInfo(text: string): ParsedResume['contact'] {
  const contact: ParsedResume['contact'] = {
    name: '',
    email: '',
    phone: '',
    location: '',
    linkedin: '',
  };

  // Extract email
  const emailMatch = text.match(/[\w.-]+@[\w.-]+\.\w+/);
  if (emailMatch) contact.email = emailMatch[0];

  // Extract phone (various formats)
  const phoneMatch = text.match(
    /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/
  );
  if (phoneMatch) contact.phone = phoneMatch[0];

  // Extract LinkedIn
  const linkedinMatch = text.match(
    /(linkedin\.com\/in\/[\w-]+)|(linkedin\.com\/profile\/[\w-]+)/i
  );
  if (linkedinMatch) contact.linkedin = linkedinMatch[0];

  // Extract name (usually first line or before email)
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length > 0) {
    // First non-empty line is often the name
    const firstLine = lines[0];
    if (
      firstLine.length < 50 &&
      !firstLine.includes('@') &&
      !firstLine.match(/\d{3}[-.\s]?\d{3}[-.\s]?\d{4}/)
    ) {
      contact.name = firstLine;
    }
  }

  // Extract location (common patterns)
  const locationMatch = text.match(
    /([A-Z][a-z]+,\s*[A-Z]{2})|([A-Z][a-z]+\s*,\s*[A-Z][a-z]+)/
  );
  if (locationMatch) contact.location = locationMatch[0];

  return contact;
}

function isLikelySectionHeader(line: string): boolean {
  const lowerLine = line.toLowerCase().trim();
  const sectionKeywords = [
    'summary',
    'objective',
    'experience',
    'employment',
    'education',
    'skills',
    'technical',
    'certification',
    'project',
    'award',
    'volunteer',
    'language',
  ];

  // Short lines that are all caps or title case and match keywords
  return (
    line.length < 30 &&
    (line === line.toUpperCase() || /^[A-Z][a-z\s]+$/.test(line)) &&
    sectionKeywords.some(keyword => lowerLine.includes(keyword))
  );
}

export function cleanAndFormatResume(parsedResume: ParsedResume): string {
  let formatted = '';

  // Contact info
  if (parsedResume.contact.name) {
    formatted += `${parsedResume.contact.name}\n`;
  }

  const contactLine = [
    parsedResume.contact.email,
    parsedResume.contact.phone,
    parsedResume.contact.location,
  ]
    .filter(Boolean)
    .join(' | ');

  if (contactLine) {
    formatted += `${contactLine}\n`;
  }

  if (parsedResume.contact.linkedin) {
    formatted += `LinkedIn: ${parsedResume.contact.linkedin}\n`;
  }

  formatted += '\n';

  // Sections
  const sectionOrder: Array<{
    key: keyof typeof parsedResume.sections;
    title: string;
  }> = [
    { key: 'summary', title: 'PROFESSIONAL SUMMARY' },
    { key: 'experience', title: 'WORK EXPERIENCE' },
    { key: 'education', title: 'EDUCATION' },
    { key: 'skills', title: 'SKILLS' },
    { key: 'certifications', title: 'CERTIFICATIONS' },
  ];

  sectionOrder.forEach(({ key, title }) => {
    const content = parsedResume.sections[key];
    if (content && content.trim()) {
      formatted += `${title}\n${content}\n\n`;
    }
  });

  return formatted.trim();
}
