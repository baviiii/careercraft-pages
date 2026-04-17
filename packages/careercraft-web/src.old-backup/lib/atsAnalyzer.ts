export interface ATSIssue {
  category: string;
  severity: "high" | "medium" | "low";
  title: string;
  description: string;
  suggestion: string;
}

export interface ATSAnalysis {
  score: number;
  issues: ATSIssue[];
  keywords: {
    matched: string[];
    missing: string[];
    matchRate: number;
  };
  sections: {
    found: string[];
    missing: string[];
  };
  formatting: {
    hasComplexFormatting: boolean;
    hasImages: boolean;
    hasColumns: boolean;
  };
}

const STANDARD_SECTIONS = [
  "experience",
  "education",
  "skills",
  "summary",
  "contact",
];

const WEAK_VERBS = [
  "responsible for",
  "worked on",
  "helped with",
  "participated in",
  "involved in",
  "duties included",
  "handled",
];

const STRONG_VERBS = [
  "achieved",
  "improved",
  "increased",
  "reduced",
  "generated",
  "developed",
  "led",
  "managed",
  "created",
  "implemented",
  "optimized",
  "streamlined",
];

export function analyzeResume(
  resumeText: string,
  jobDescription: string
): ATSAnalysis {
  const issues: ATSIssue[] = [];
  let score = 100;

  // Extract keywords from job description
  const jobKeywords = extractKeywords(jobDescription);
  const resumeKeywords = extractKeywords(resumeText);

  const matched = jobKeywords.filter((kw) =>
    resumeKeywords.some((rw) => rw.toLowerCase().includes(kw.toLowerCase()))
  );
  const missing = jobKeywords.filter(
    (kw) => !matched.some((m) => m.toLowerCase() === kw.toLowerCase())
  );

  const matchRate = (matched.length / jobKeywords.length) * 100;

  // Check keyword match rate
  if (matchRate < 50) {
    score -= 20;
    issues.push({
      category: "Keywords",
      severity: "high",
      title: "Low keyword match rate",
      description: `Only ${matched.length} out of ${jobKeywords.length} key terms from the job description are present in your resume.`,
      suggestion: `Add these missing keywords naturally: ${missing.slice(0, 5).join(", ")}`,
    });
  } else if (matchRate < 70) {
    score -= 10;
    issues.push({
      category: "Keywords",
      severity: "medium",
      title: "Moderate keyword coverage",
      description: `${matched.length} out of ${jobKeywords.length} keywords matched. You can improve this.`,
      suggestion: `Consider incorporating: ${missing.slice(0, 3).join(", ")}`,
    });
  }

  // Check for weak verbs
  const weakVerbsFound = WEAK_VERBS.filter((verb) =>
    resumeText.toLowerCase().includes(verb)
  );
  if (weakVerbsFound.length > 0) {
    score -= 15;
    issues.push({
      category: "Language",
      severity: "high",
      title: "Weak action verbs detected",
      description: `Found passive phrases like "${weakVerbsFound[0]}". ATS and recruiters prefer achievement-driven language.`,
      suggestion: `Replace with strong verbs like: ${STRONG_VERBS.slice(0, 5).join(", ")}`,
    });
  }

  // Check for metrics/numbers
  const hasNumbers = /\d+%|\d+x|\$\d+|\d+\+/.test(resumeText);
  if (!hasNumbers) {
    score -= 15;
    issues.push({
      category: "Impact",
      severity: "high",
      title: "Missing quantifiable achievements",
      description: "No metrics or numbers found to demonstrate impact.",
      suggestion:
        "Add specific numbers: revenue increased, time saved, projects completed, team size, etc.",
    });
  }

  // Check resume length
  const wordCount = resumeText.split(/\s+/).length;
  if (wordCount < 200) {
    score -= 10;
    issues.push({
      category: "Content",
      severity: "medium",
      title: "Resume too short",
      description: `Your resume has only ${wordCount} words. This may not provide enough detail.`,
      suggestion: "Expand your experience sections with more specific achievements and responsibilities.",
    });
  } else if (wordCount > 800) {
    score -= 5;
    issues.push({
      category: "Content",
      severity: "low",
      title: "Resume might be too long",
      description: `Your resume has ${wordCount} words. ATS systems may truncate very long resumes.`,
      suggestion: "Consider condensing to 1-2 pages, focusing on the most relevant experiences.",
    });
  }

  // Check for standard sections
  const foundSections = STANDARD_SECTIONS.filter((section) =>
    resumeText.toLowerCase().includes(section)
  );
  const missingSections = STANDARD_SECTIONS.filter(
    (section) => !foundSections.includes(section)
  );

  if (missingSections.length > 2) {
    score -= 10;
    issues.push({
      category: "Structure",
      severity: "medium",
      title: "Missing key resume sections",
      description: `Could not detect these standard sections: ${missingSections.join(", ")}`,
      suggestion: "Ensure your resume has clear section headers for Experience, Education, Skills, etc.",
    });
  }

  // Check for contact information
  const hasEmail = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(
    resumeText
  );
  const hasPhone = /\d{3}[-.]?\d{3}[-.]?\d{4}/.test(resumeText);

  if (!hasEmail || !hasPhone) {
    score -= 5;
    issues.push({
      category: "Contact",
      severity: "medium",
      title: "Missing contact information",
      description: `${!hasEmail ? "Email" : ""}${!hasEmail && !hasPhone ? " and " : ""}${!hasPhone ? "Phone" : ""} not detected.`,
      suggestion: "Always include complete contact information at the top of your resume.",
    });
  }

  // Ensure score doesn't go below 0
  score = Math.max(0, score);

  return {
    score,
    issues,
    keywords: {
      matched,
      missing,
      matchRate,
    },
    sections: {
      found: foundSections,
      missing: missingSections,
    },
    formatting: {
      hasComplexFormatting: false,
      hasImages: false,
      hasColumns: false,
    },
  };
}

function extractKeywords(text: string): string[] {
  // Simple keyword extraction - in production, use NLP library
  const words = text.toLowerCase().match(/\b[a-z]{3,}\b/g) || [];
  
  // Common stop words to filter out
  const stopWords = new Set([
    "the", "and", "for", "are", "but", "not", "you", "all", "can", "her", "was",
    "one", "our", "out", "day", "get", "has", "him", "his", "how", "man", "new",
    "now", "old", "see", "two", "who", "boy", "did", "its", "let", "put", "say",
    "she", "too", "use", "with", "will", "have", "this", "that", "from", "they",
    "been", "more", "when", "your", "work", "than", "into", "very", "time", "each",
  ]);

  // Filter and count frequency
  const filtered = words.filter((word) => !stopWords.has(word));
  const frequency: { [key: string]: number } = {};
  
  filtered.forEach((word) => {
    frequency[word] = (frequency[word] || 0) + 1;
  });

  // Get top keywords by frequency
  const sorted = Object.entries(frequency)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 30)
    .map(([word]) => word);

  return sorted;
}
