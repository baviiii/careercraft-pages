import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { z } from "npm:zod@3";

import { horusGenerateObject, horusGenerateText, type HorusTier } from "../_shared/ai/horus.ts";
import { ValidationError } from "../_shared/ai/errors.ts";
import { handler, json } from "../_shared/http/responses.ts";

// Enhanced validation with item counting and content preservation
function validateRewriteResponse(rewrittenText: string, originalText: string): {
  isComplete: boolean;
  missingSections: string[];
  hasTruncation: boolean;
  missingItems: string[];
  warnings: string[];
} {
  const missingSections: string[] = [];
  const missingItems: string[] = [];
  const warnings: string[] = [];
  const lowerText = rewrittenText.toLowerCase();
  const originalLower = originalText.toLowerCase();

  // Check for required sections
  const requiredSections = [
    { name: "Contact Information", keywords: ["email", "phone", "@"] },
    { name: "Professional Summary", keywords: ["summary", "professional", "objective"] },
    { name: "Work Experience", keywords: ["experience", "employment", "work history"] },
    { name: "Education", keywords: ["education", "degree", "university", "college"] },
    { name: "Skills", keywords: ["skills", "technical", "competencies"] },
  ];

  // Check if original has these sections
  const originalHasSection = (keywords: string[]) =>
    keywords.some(kw => originalLower.includes(kw));

  // Check if rewritten has these sections
  requiredSections.forEach(section => {
    if (originalHasSection(section.keywords)) {
      const hasSection = section.keywords.some(kw => lowerText.includes(kw));
      if (!hasSection) {
        missingSections.push(section.name);
      }
    }
  });

  // ENHANCED: Check for optional but critical sections (certifications, projects, languages)
  const optionalSections = [
    { name: "Certifications", keywords: ["certification", "certified", "certificate"] },
    { name: "Projects", keywords: ["project", "portfolio"] },
    { name: "Languages", keywords: ["language", "fluent", "proficient"] },
  ];

  optionalSections.forEach(section => {
    if (originalHasSection(section.keywords)) {
      const hasSection = section.keywords.some(kw => lowerText.includes(kw));
      if (!hasSection) {
        missingSections.push(section.name);
        warnings.push(`${section.name} section found in original but missing in rewrite`);
      }
    }
  });

  // ENHANCED: Count and verify specific items
  // Count certifications
  const certPatterns = [
    /certifi(ed|cate|cation)[:\s]+([A-Z][^\n]+)/gi,
    /(AWS|Azure|Google Cloud|CompTIA|PMP|CISSP|CPA|CFA)[^\n]+(Certified|Certificate)/gi,
  ];
  let originalCerts = 0;
  let rewrittenCerts = 0;
  certPatterns.forEach(pattern => {
    const origMatches = originalText.match(pattern) || [];
    const rewriteMatches = rewrittenText.match(pattern) || [];
    originalCerts += origMatches.length;
    rewrittenCerts += rewriteMatches.length;
  });

  if (originalCerts > 0 && rewrittenCerts < originalCerts) {
    missingItems.push(`Certifications: Found ${originalCerts} in original but only ${rewrittenCerts} in rewrite`);
    warnings.push(`Possible certification loss: ${originalCerts} → ${rewrittenCerts}`);
  }

  // Count jobs/positions (company names or job titles)
  const jobPatterns = [
    /\b(Senior|Lead|Principal|Manager|Director|Engineer|Developer|Analyst|Consultant|Specialist)[^\n]+\n/gi,
    /\b\d{4}\s*[-–—]\s*(\d{4}|Present|Current)/gi, // Date ranges indicating jobs
  ];
  let originalJobs = 0;
  let rewrittenJobs = 0;
  jobPatterns.forEach(pattern => {
    const origMatches = originalText.match(pattern) || [];
    const rewriteMatches = rewrittenText.match(pattern) || [];
    originalJobs = Math.max(originalJobs, origMatches.length);
    rewrittenJobs = Math.max(rewrittenJobs, rewriteMatches.length);
  });

  if (originalJobs > 0 && rewrittenJobs < originalJobs * 0.8) { // Allow 20% variance for pattern matching errors
    warnings.push(`Possible job loss: ${originalJobs} positions in original, ${rewrittenJobs} in rewrite`);
  }

  // Count education entries
  const eduCount = (text: string) => {
    const patterns = [
      /\b(Bachelor|Master|PhD|Associate|Doctorate|B\.S\.|M\.S\.|MBA)/gi,
      /\b(University|College|Institute|School)\b/gi,
    ];
    let maxCount = 0;
    patterns.forEach(pattern => {
      const matches = text.match(pattern) || [];
      maxCount = Math.max(maxCount, matches.length);
    });
    return maxCount;
  };

  const originalEdu = eduCount(originalText);
  const rewrittenEdu = eduCount(rewrittenText);
  if (originalEdu > 0 && rewrittenEdu < originalEdu) {
    warnings.push(`Possible education loss: ${originalEdu} entries in original, ${rewrittenEdu} in rewrite`);
  }

  // Check for truncation (incomplete sentences at end, very short response)
  const hasTruncation =
    rewrittenText.length < originalText.length * 0.5 || // Less than 50% of original
    rewrittenText.endsWith("...") ||
    rewrittenText.endsWith("•") ||
    rewrittenText.endsWith("-") ||
    (!rewrittenText.includes("\n\n") && rewrittenText.length > 500); // No clear sections but long text

  const isComplete = missingSections.length === 0 && !hasTruncation && missingItems.length === 0;

  return { isComplete, missingSections, hasTruncation, missingItems, warnings };
}

// Section header patterns for parsing resume text into named sections
const SECTION_PATTERNS: { name: string; patterns: RegExp[] }[] = [
  { name: "CONTACT", patterns: [] }, // Contact is always the top (before first section header)
  { name: "SUMMARY", patterns: [
    /^(?:PROFESSIONAL\s+)?SUMMARY$/i,
    /^OBJECTIVE$/i,
    /^PROFILE$/i,
    /^ABOUT\s+ME$/i,
    /^CAREER\s+SUMMARY$/i,
    /^PERSONAL\s+STATEMENT$/i,
  ]},
  { name: "EXPERIENCE", patterns: [
    /^(?:WORK\s+)?EXPERIENCE$/i,
    /^EMPLOYMENT(?:\s+HISTORY)?$/i,
    /^WORK\s+HISTORY$/i,
    /^PROFESSIONAL\s+EXPERIENCE$/i,
  ]},
  { name: "EDUCATION", patterns: [
    /^EDUCATION$/i,
    /^ACADEMIC\s+(?:BACKGROUND|QUALIFICATIONS)$/i,
  ]},
  { name: "SKILLS", patterns: [
    /^(?:TECHNICAL\s+)?SKILLS$/i,
    /^(?:CORE\s+)?COMPETENCIES$/i,
    /^KEY\s+SKILLS$/i,
    /^SKILLS\s+(?:&|AND)\s+(?:TOOLS|TECHNOLOGIES)$/i,
  ]},
  { name: "CERTIFICATIONS", patterns: [
    /^CERTIFICATIONS?$/i,
    /^CERTIFICATES?$/i,
    /^LICENSES?\s+(?:&|AND)\s+CERTIFICATIONS?$/i,
    /^PROFESSIONAL\s+CERTIFICATIONS?$/i,
  ]},
  { name: "PROJECTS", patterns: [
    /^PROJECTS?$/i,
    /^(?:KEY|PERSONAL|NOTABLE)\s+PROJECTS?$/i,
    /^PORTFOLIO$/i,
  ]},
  { name: "REFERENCES", patterns: [
    /^REFERENCES?$/i,
    /^RECOMMENDATIONS?$/i,
    /^REFEREES?$/i,
  ]},
  { name: "LANGUAGES", patterns: [
    /^LANGUAGES?$/i,
  ]},
  { name: "AWARDS", patterns: [
    /^AWARDS?$/i,
    /^(?:AWARDS?\s+(?:&|AND)\s+)?HONORS?$/i,
    /^ACHIEVEMENTS?$/i,
  ]},
  { name: "VOLUNTEER", patterns: [
    /^VOLUNTEER(?:ING)?(?:\s+EXPERIENCE)?$/i,
    /^COMMUNITY\s+(?:SERVICE|INVOLVEMENT)$/i,
  ]},
  { name: "PUBLICATIONS", patterns: [
    /^PUBLICATIONS?$/i,
    /^PUBLISHED\s+WORKS?$/i,
  ]},
];

// Preferred section ordering for merging
const SECTION_ORDER = [
  "CONTACT", "SUMMARY", "EXPERIENCE", "EDUCATION", "SKILLS",
  "CERTIFICATIONS", "PROJECTS", "REFERENCES", "LANGUAGES",
  "AWARDS", "VOLUNTEER", "PUBLICATIONS"
];

const AtsAnalysisSchema = z.object({
  overallScore: z.number(),
  subScores: z.object({
    skillsMatch: z.number(),
    experienceMatch: z.number(),
    keywordMatch: z.number(),
    formatCompatibility: z.number(),
  }),
  jobRequirements: z.record(z.any()),
  resumeKeywords: z.record(z.any()),
  writingQuality: z.record(z.any()),
  redFlags: z.array(z.any()),
  improvements: z.record(z.any()),
  summary: z.record(z.any()),
});

const StructuredResumeSchema = z.object({
  contact: z.record(z.any()),
  summary: z.string(),
  experience: z.array(z.record(z.any())).default([]),
  education: z.array(z.record(z.any())).default([]),
  skills: z.array(z.string()).default([]),
  certifications: z.array(z.record(z.any())).default([]),
  projects: z.array(z.record(z.any())).default([]),
  references: z.array(z.record(z.any())).default([]),
  languages: z.array(z.record(z.any())).default([]),
  awards: z.array(z.record(z.any())).default([]),
  volunteer: z.array(z.record(z.any())).default([]),
  publications: z.array(z.record(z.any())).default([]),
});

/**
 * Parse resume text into named sections.
 * Returns a Map of section name -> section content (including the header line).
 */
function parseSections(text: string): Map<string, string> {
  const lines = text.split('\n');
  const sections = new Map<string, string>();
  let currentSection = "CONTACT";
  let currentContent: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      currentContent.push(line);
      continue;
    }

    // Check if this line is a section header
    let matchedSection: string | null = null;
    for (const sec of SECTION_PATTERNS) {
      if (sec.name === "CONTACT") continue; // Contact has no header
      for (const pattern of sec.patterns) {
        if (pattern.test(trimmed)) {
          matchedSection = sec.name;
          break;
        }
      }
      if (matchedSection) break;
    }

    if (matchedSection) {
      // Save previous section
      if (currentContent.length > 0) {
        const existing = sections.get(currentSection) || "";
        sections.set(currentSection, (existing + "\n" + currentContent.join("\n")).trim());
      }
      currentSection = matchedSection;
      currentContent = [line]; // Include the header line
    } else {
      currentContent.push(line);
    }
  }

  // Save last section
  if (currentContent.length > 0) {
    const existing = sections.get(currentSection) || "";
    sections.set(currentSection, (existing + "\n" + currentContent.join("\n")).trim());
  }

  return sections;
}

/**
 * Deterministic merge: for any section present in original but missing in rewritten,
 * append the original section to the rewritten text.
 * Returns the merged text and list of recovered section names.
 */
function mergeMissingSections(
  originalText: string,
  rewrittenText: string
): { mergedText: string; recoveredSections: string[] } {
  const originalSections = parseSections(originalText);
  const rewrittenSections = parseSections(rewrittenText);
  const recoveredSections: string[] = [];

  // Find sections in original that are missing from rewritten
  for (const [sectionName, sectionContent] of originalSections) {
    if (sectionName === "CONTACT") continue; // Contact is always at top, skip
    if (!sectionContent.trim()) continue; // Empty in original, nothing to recover

    const rewrittenContent = rewrittenSections.get(sectionName);
    if (!rewrittenContent || !rewrittenContent.trim()) {
      // Section missing in rewrite -- append original content
      recoveredSections.push(sectionName);
    }
  }

  if (recoveredSections.length === 0) {
    return { mergedText: rewrittenText, recoveredSections: [] };
  }

  // Build the merged text: rewritten text + missing sections appended in order
  let mergedText = rewrittenText.trimEnd();
  for (const sectionName of SECTION_ORDER) {
    if (recoveredSections.includes(sectionName)) {
      const originalContent = originalSections.get(sectionName)!;
      mergedText += "\n\n" + originalContent;
    }
  }

  return { mergedText, recoveredSections };
}

serve(handler(async (req) => {
  try {
    const { resumeText, jobDescription, analysisType, resumeData, analysisContext } = await req.json();
    
    if ((!resumeText && !resumeData) || !jobDescription) {
      throw new ValidationError("Missing resume or job description");
    }

    // Parse analysis context if provided
    let parsedAnalysisContext: any = null;
    if (analysisContext) {
      try {
        parsedAnalysisContext = typeof analysisContext === 'string' ? JSON.parse(analysisContext) : analysisContext;
      } catch (e) {
        console.warn("Failed to parse analysis context:", e);
      }
    }

    let systemPrompt = "";
    let userPrompt = "";

    if (analysisType === "full-analysis") {
      systemPrompt = `You are an Enterprise-grade ATS Resume Analyzer & Optimizer Engine trained on top recruitment systems (Greenhouse, Lever, Workday, Taleo, BambooHR, Seek, LinkedIn Talent Insights). You evaluate resumes + job descriptions, simulate an ATS scan, and produce a complete breakdown.

Resumes come from every profession — healthcare, trades, education, hospitality, finance, retail, engineering. Ground every skill, keyword, and improvement in what the resume and job description actually contain, in the language of that profession. Never inject tech-industry skills or advice into a non-tech resume.`;
      
      userPrompt = `Analyze this resume against the job description and provide a comprehensive ATS analysis.

JOB DESCRIPTION:
${jobDescription}

RESUME:
${resumeText}

Provide a detailed analysis covering all aspects.`;

    } else if (analysisType === "auto-rewrite") {
      systemPrompt = `You are a human job applicant rewriting your own resume.
You are NOT a career coach, NOT a marketer, and NOT an AI assistant.
You write plainly, conservatively, and slightly imperfectly, like a real person describing work they actually did.

=== WRITING STYLE (MANDATORY) ===

1. Write like a human, not a brochure.
   - Avoid motivational, promotional, or corporate language.
   - Do NOT use buzzwords unless followed by concrete proof.
   - If a sentence sounds impressive but vague, rewrite it until it sounds boring and specific.

2. Under-claim rather than over-claim.
   - Prefer: "worked on", "helped build", "maintained", "set up", "handled", "supported"
   - Avoid: architected, spearheaded, enterprise-grade, world-class, cutting-edge, revolutionized, orchestrated
   - If leadership is mentioned, keep it factual and limited.

3. Task then Tool then Result (optional).
   - Start bullets with what was actually done.
   - Mention real tools, platforms, or technologies.
   - Results can be approximate or omitted if unclear.

4. Specific beats impressive.
   - "Azure App Service + GitHub Actions" is better than "cloud infrastructure".
   - "Internal tool for ~20 users" is better than "enterprise platform".

=== BULLET RULES ===

- Bullet points only (no paragraphs in experience section).
- Each bullet: 8-22 words max.
- No bullet may contain more than one comma.
- No two consecutive bullets may start with the same verb.
- Avoid perfect symmetry across bullets -- variation is required.
- Sentence fragments are allowed if they sound natural.
- Every bullet must include at least one concrete noun from the person's actual field (a tool, system, method, piece of equipment, or platform — framework for a developer, clinical procedure for a nurse, machine for a tradesperson).

=== STRICTLY FORBIDDEN PHRASES ===

Do NOT use or paraphrase any of these:
results-driven, passionate about, proven track record, dynamic team player,
leveraging cutting-edge technologies, fast-paced environment, innovative solutions,
synergy, stakeholder engagement (unless very specific), spearheaded, architected,
orchestrated, revolutionized, world-class, enterprise-grade, cutting-edge

If detected in original, replace with plain language.

=== HUMAN IMPERFECTION INJECTION ===

To avoid AI-detection patterns:
- Occasionally remove an adjective or soften a claim.
- Use "basic", "initial", "internal", or "small team" where appropriate.
- Use approximate numbers: "~20 users", "around 30%".
- Do NOT make every bullet sound equally strong. Some bullets should be shorter and simpler.
- Do NOT repeat the same sentence structure more than twice.
- Do NOT stack multiple achievements into one bullet.
- Write like someone explaining their work to a colleague in the same trade or profession, not to HR.

=== COMPLETENESS REQUIREMENTS (CRITICAL) ===

1. Return the COMPLETE resume with ALL sections in this exact order:
   - Contact Information (name, email, phone, location, LinkedIn)
   - Professional Summary (2-3 sentences, plain and specific)
   - Work Experience (ALL jobs with dates, company, title, bullets)
   - Education (ALL degrees with dates, school, GPA if mentioned)
   - Skills (ALL skills, prioritized by job relevance)
   - Certifications (if present in original)
   - Projects (if present in original)
   - References/Recommendations (if present in original)
   - Languages (if present in original)
   - Awards/Honors (if present in original)
   - Volunteer (if present in original)
   - Publications (if present in original)

2. Do NOT skip, truncate, or omit ANY section.
3. Maintain original structure and section order.
4. Keep contact information exactly accurate.

=== ANTI-HALLUCINATION RULES (CRITICAL) ===

DO NOT fabricate or invent ANY information:
- NO fake certifications (only include certifications explicitly listed in original)
- NO fake projects (only include projects explicitly mentioned in original)
- NO fake job titles, companies, or dates (preserve all exactly)
- NO invented achievements or metrics (only enhance what exists)
- NO made-up skills (only include skills from original or job description)

PRESERVATION REQUIREMENTS:
- CERTIFICATIONS: Include EVERY certification with exact name, issuer, and date
- PROJECTS: Include EVERY project with exact name and description
- RECOMMENDATIONS/REFERENCES: Preserve all exactly as stated
- AWARDS/HONORS: Include ALL awards, honors, publications if present
- Count: If original has 5 certifications, rewrite must have 5 certifications
- Names: Preserve exact certification/project names

=== KEYWORD INTEGRATION ===

- ONLY add keywords where they fit naturally and truthfully.
- Do NOT claim experience with technologies you cannot verify from the resume.
- Enhance existing content with keywords, don't fabricate new content.

=== FINAL QUALITY CHECK ===

Before outputting, read each bullet and ask: "Could this person, in this profession, realistically write this?"
If it sounds impressive without being specific, rewrite it.
If it sounds like marketing, rewrite it.
If it sounds too clean, simplify it.

Only output the final rewritten resume content. No explanations or commentary.`;
      
      let contextInfo = "";
      let criticalIssues = "None";
      let missingKeywords = "None";
      let writingIssues = "None";
      
      if (parsedAnalysisContext) {
        const ctx = parsedAnalysisContext;
        criticalIssues = ctx.redFlags?.filter((f: any) => f.severity === 'critical').map((f: any) => `${f.type}: ${f.description}`).join('; ') || 'None';
        missingKeywords = ctx.resumeKeywords?.missing?.slice(0, 15).join(', ') || 'None';
        const issues: string[] = [];
        if (ctx.writingQuality?.actionVerbsScore < 7) issues.push(`Action verbs (${ctx.writingQuality.actionVerbsScore}/10)`);
        if (ctx.writingQuality?.metricsUsageScore < 7) issues.push(`Metrics usage (${ctx.writingQuality.metricsUsageScore}/10)`);
        if (ctx.writingQuality?.impactLanguageScore < 7) issues.push(`Impact language (${ctx.writingQuality.impactLanguageScore}/10)`);
        writingIssues = issues.length > 0 ? issues.join('; ') : 'None';
        
        contextInfo = `\n\n=== ATS ANALYSIS CONTEXT ===
Current ATS Score: ${ctx.overallScore}/100
Sub-scores: Skills ${ctx.subScores?.skillsMatch}%, Experience ${ctx.subScores?.experienceMatch}%, Keywords ${ctx.subScores?.keywordMatch}%, Format ${ctx.subScores?.formatCompatibility}%

CRITICAL ISSUES TO FIX:
${ctx.redFlags?.filter((f: any) => f.severity === 'critical').map((f: any) => `- ${f.type}: ${f.description}`).join('\n') || 'None'}

MISSING KEYWORDS (must include naturally):
${ctx.resumeKeywords?.missing?.slice(0, 15).join(', ') || 'None'}

UNDER-REPRESENTED KEYWORDS (need more emphasis):
${ctx.resumeKeywords?.underRepresented?.slice(0, 10).join(', ') || 'None'}

WRITING QUALITY ISSUES:
${ctx.writingQuality?.actionVerbsScore < 7 ? `- Action verbs score: ${ctx.writingQuality.actionVerbsScore}/10 - Use stronger action verbs` : ''}
${ctx.writingQuality?.metricsUsageScore < 7 ? `- Metrics usage score: ${ctx.writingQuality.metricsUsageScore}/10 - Add more quantifiable results` : ''}
${ctx.writingQuality?.impactLanguageScore < 7 ? `- Impact language score: ${ctx.writingQuality.impactLanguageScore}/10 - Focus on achievements, not duties` : ''}

TOP PRIORITY FIXES:
${ctx.summary?.mostImportantFixes?.slice(0, 5).map((f: string) => `- ${f}`).join('\n') || 'None'}

QUICK FIXES TO APPLY:
${ctx.improvements?.quickFixes?.slice(0, 5).map((f: any) => `- ${f.issue} → ${f.fix}`).join('\n') || 'None'}

MANDATORY SKILLS TO HIGHLIGHT:
${ctx.jobRequirements?.mandatorySkills?.join(', ') || 'None'}
`;
      }
      
      // Extract key items from original resume for explicit preservation
      const extractItems = (text: string) => {
        const certMatches = text.match(/(?:certified|certification|certificate)[:\s]+([A-Z][^\n]+)/gi) || [];
        const projectMatches = text.match(/(?:project|portfolio)[:\s]+([A-Z][^\n]+)/gi) || [];
        const educationMatches = text.match(/(?:bachelor|master|phd|associate|doctorate|b\.s\.|m\.s\.|mba)[^\n]+/gi) || [];
        return {
          certifications: certMatches.slice(0, 10).map(c => c.trim()),
          projects: projectMatches.slice(0, 8).map(p => p.trim()),
          education: educationMatches.slice(0, 5).map(e => e.trim()),
        };
      };

      const extractedItems = extractItems(resumeText);
      let itemsToPreserve = "";

      if (extractedItems.certifications.length > 0) {
        itemsToPreserve += `\n📜 CERTIFICATIONS TO PRESERVE (${extractedItems.certifications.length} total):\n${extractedItems.certifications.map((c, i) => `${i + 1}. ${c}`).join('\n')}`;
      }
      if (extractedItems.projects.length > 0) {
        itemsToPreserve += `\n\n💼 PROJECTS TO PRESERVE (${extractedItems.projects.length} total):\n${extractedItems.projects.map((p, i) => `${i + 1}. ${p}`).join('\n')}`;
      }
      if (extractedItems.education.length > 0) {
        itemsToPreserve += `\n\n🎓 EDUCATION TO PRESERVE (${extractedItems.education.length} total):\n${extractedItems.education.map((e, i) => `${i + 1}. ${e}`).join('\n')}`;
      }

      userPrompt = `JOB DESCRIPTION (READ CAREFULLY - ONLY ADD KEYWORDS THAT MATCH ACTUAL EXPERIENCE):
${jobDescription}

ORIGINAL RESUME (REWRITE EVERY SECTION):
${resumeText}${contextInfo}${itemsToPreserve}

TASK: Completely rewrite the ENTIRE resume above by processing EACH SECTION methodically.

=== STEP-BY-STEP PROCESS ===

STEP 1 - READ JOB DESCRIPTION:
- Understand what skills, experience, and qualifications they want
- Note which requirements match this candidate's actual background
- Identify keywords that truthfully apply to this candidate

STEP 2 - PROCESS CONTACT SECTION:
- Keep exactly as-is (no changes to name, email, phone, etc.)

STEP 3 - REWRITE PROFESSIONAL SUMMARY:
- Write 2-3 sentences highlighting strengths that ACTUALLY match job requirements
- Only use keywords from job description if they match candidate's real experience
- Make it specific to THIS candidate, not generic

STEP 4 - REWRITE WORK EXPERIENCE (process each job one-by-one):
For EACH job position in order:
  a) Read all bullets for that specific job
  b) Identify which job requirements this position satisfies
  c) Rewrite each bullet to be clearer and more impactful
  d) Add relevant keywords ONLY where truthful
  e) Include metrics (approximate if needed: "~20 users", "around 30%")
  f) DO NOT invent technologies or achievements not in original
  g) Move to next job and repeat

STEP 5 - REWRITE EDUCATION:
- Keep exactly as-is (preserve degree names, schools, dates, GPA)

STEP 6 - REWRITE SKILLS:
- Keep ALL skills from original
- Reorder to prioritize job-relevant ones first
- May add job keywords ONLY if evidenced in experience section
- DO NOT add skills the candidate hasn't used

STEP 7 - REWRITE OTHER SECTIONS:
- Certifications: Include ALL ${extractedItems.certifications.length > 0 ? extractedItems.certifications.length : ''} exactly as listed
- Projects: Include ALL ${extractedItems.projects.length > 0 ? extractedItems.projects.length : ''} with enhanced descriptions
- Languages/Awards/etc: Preserve all items exactly

=== CRITICAL REQUIREMENTS ===

Address these specific issues:
- Critical issues to fix: ${criticalIssues}
- Missing keywords to incorporate (ONLY where truthful): ${missingKeywords}
- Writing quality improvements: ${writingIssues}

⚠️ PRESERVATION CHECKLIST (VERIFY BEFORE SUBMITTING):
${extractedItems.certifications.length > 0 ? `✓ Include ALL ${extractedItems.certifications.length} certifications listed above (with exact names)` : ''}
${extractedItems.projects.length > 0 ? `✓ Include ALL ${extractedItems.projects.length} projects listed above (with exact names)` : ''}
${extractedItems.education.length > 0 ? `✓ Include ALL ${extractedItems.education.length} education entries listed above` : ''}
✓ Preserve ALL job positions with exact company names and dates
✓ Keep ALL skills from original (can reorder by relevance)
✓ Do NOT add fake certifications, projects, or experience
✓ Only add keywords where they TRUTHFULLY match actual experience
✓ Do NOT claim experience with tools/technologies not in original resume

OUTPUT FORMAT (MUST FOLLOW):
[Full Name]
[Email] | [Phone] | [Location]
[LinkedIn URL if present]

PROFESSIONAL SUMMARY
[Optimized 3-4 sentence summary with keywords]

WORK EXPERIENCE
[Company Name] - [Job Title]
[Start Date] - [End Date] | [Location]
• [Optimized bullet with metrics and keywords]
• [Optimized bullet with metrics and keywords]
• [Optimized bullet with metrics and keywords]

[Next Job...]

EDUCATION
[Degree] - [School Name]
[Graduation Date] | GPA: [if mentioned]

SKILLS
[Relevant skills prioritized by job description]

[CERTIFICATIONS - if present]
${extractedItems.certifications.length > 0 ? extractedItems.certifications.map((c, i) => `${i + 1}. ${c.replace(/.*:\s*/, '')}`).join('\n') + '\n(All ' + extractedItems.certifications.length + ' certifications must be included)' : '[Include if present in original]'}

[PROJECTS - if present]
${extractedItems.projects.length > 0 ? '[All ' + extractedItems.projects.length + ' projects must be included with enhanced descriptions]' : '[Include if present in original]'}

[LANGUAGES - if present]

Return the COMPLETE resume now. Do not stop mid-section. Include everything.`;
    } else if (analysisType === "rewrite-experience") {
      systemPrompt = `You are a human job applicant rewriting ONLY the work experience section of your own resume.
You write plainly and specifically, like a real person describing work they actually did.

BULLET RULES:
- Each bullet: 8-22 words max. Max one comma per bullet.
- No two consecutive bullets may start with the same verb.
- Start with what was done, then the tool/tech, then result (optional).
- Prefer: "worked on", "helped build", "maintained", "set up", "wrote", "updated", "configured", "migrated"
- Avoid: architected, spearheaded, orchestrated, revolutionized, leveraged, cutting-edge
- Every bullet must include at least one concrete noun from the person's actual field (tool, system, method, equipment, or platform).
- Use approximate numbers where appropriate: "~20 users", "around 30%"
- Not every bullet should sound equally strong. Some should be shorter and simpler.
- Do NOT stack multiple achievements into one bullet.
- Do NOT repeat sentence structures more than twice.
- Do NOT fabricate metrics or achievements. Only enhance what exists.

FORBIDDEN PHRASES: results-driven, passionate about, proven track record, dynamic team player, innovative solutions, synergy, fast-paced environment

Keep ALL other sections exactly as-is. Only rewrite the experience bullets.`;
      
      let contextInfo = "";
      if (parsedAnalysisContext) {
        const ctx = parsedAnalysisContext;
        contextInfo = `\n\n=== ATS ANALYSIS CONTEXT ===
Experience Match Score: ${ctx.subScores?.experienceMatch}%
Missing Keywords for Experience Section: ${ctx.resumeKeywords?.missing?.slice(0, 10).join(', ') || 'None'}
Action Verbs Score: ${ctx.writingQuality?.actionVerbsScore}/10
Metrics Usage Score: ${ctx.writingQuality?.metricsUsageScore}/10
${ctx.writingQuality?.actionVerbsScore < 7 ? '⚠️ Use stronger action verbs (Led, Developed, Increased, Reduced, etc.)' : ''}
${ctx.writingQuality?.metricsUsageScore < 7 ? '⚠️ Add quantifiable metrics (%, $, numbers, timeframes)' : ''}
Priority Keywords: ${ctx.jobRequirements?.mandatorySkills?.slice(0, 5).join(', ') || 'None'}
`;
      }
      
      userPrompt = `JOB DESCRIPTION:\n${jobDescription}\n\nRESUME:\n${resumeText}${contextInfo}\n\nRewrite only the work experience section with powerful, metrics-driven bullet points. Address the writing quality issues and incorporate missing keywords naturally. Keep other sections as-is. Return the full resume with improved experience section.`;
    } else if (analysisType === "generate-achievements") {
      systemPrompt = `You are an achievement generator. Based on the resume context, generate 5-8 keyword-rich achievement bullets that could strengthen the resume for this role.`;
      
      let contextInfo = "";
      if (parsedAnalysisContext) {
        const ctx = parsedAnalysisContext;
        contextInfo = `\n\n=== ATS ANALYSIS CONTEXT ===
Missing Keywords to Include: ${ctx.resumeKeywords?.missing?.slice(0, 10).join(', ') || 'None'}
Mandatory Skills to Highlight: ${ctx.jobRequirements?.mandatorySkills?.slice(0, 5).join(', ') || 'None'}
Current Metrics Score: ${ctx.writingQuality?.metricsUsageScore}/10
${ctx.writingQuality?.metricsUsageScore < 7 ? '⚠️ Focus on quantifiable achievements with numbers, percentages, or dollar amounts' : ''}
`;
      }
      
      userPrompt = `JOB DESCRIPTION:\n${jobDescription}\n\nRESUME CONTEXT:\n${resumeText}${contextInfo}\n\nGenerate 5-8 powerful achievement bullets with metrics that this candidate could add to strengthen their resume for this role. Incorporate missing keywords naturally. Make them realistic based on their background.`;
    } else if (analysisType === "generate-summaries") {
      systemPrompt = `You are an expert at writing resume summaries. Generate multiple summary options optimized for ATS.`;
      
      let contextInfo = "";
      if (parsedAnalysisContext) {
        const ctx = parsedAnalysisContext;
        contextInfo = `\n\n=== ATS ANALYSIS CONTEXT ===
Keyword Match Score: ${ctx.subScores?.keywordMatch}%
Missing Keywords to Include: ${ctx.resumeKeywords?.missing?.slice(0, 10).join(', ') || 'None'}
Mandatory Skills: ${ctx.jobRequirements?.mandatorySkills?.slice(0, 5).join(', ') || 'None'}
Preferred Skills: ${ctx.jobRequirements?.preferredSkills?.slice(0, 5).join(', ') || 'None'}
`;
      }
      
      userPrompt = `JOB DESCRIPTION:\n${jobDescription}\n\nRESUME:\n${resumeText}${contextInfo}\n\nGenerate 4 different summary options optimized for ATS:\n1. Professional Summary (3-4 sentences, formal, include top missing keywords)\n2. Technical Summary (focused on skills/tech stack, emphasize mandatory skills)\n3. Skills Summary (bullet-point format of key skills, prioritize job-relevant)\n4. Career Snapshot (one powerful sentence with top keywords)\n\nLabel each clearly. Ensure all summaries incorporate missing keywords naturally.`;
    } else if (analysisType === "rewrite-structured") {
      // resumeData is already extracted from the request body above
      systemPrompt = `You are a human job applicant rewriting your own resume into structured JSON format.
You are NOT a career coach, NOT a marketer, and NOT an AI assistant.
You write plainly and specifically, like a real person describing work they actually did.

You will receive structured resume data (JSON) and a job description. Optimize the content while maintaining the exact same JSON structure and all field names.

=== JOB DESCRIPTION ADHERENCE (CRITICAL) ===

1. READ THE JOB DESCRIPTION CAREFULLY - understand what skills, experience, and qualifications are required
2. ONLY add keywords/skills from the job description if they TRUTHFULLY match the candidate's actual experience
3. DO NOT claim experience with technologies, tools, or skills that aren't already demonstrated in the original resume
4. If the job requires "Python" but the resume shows "JavaScript", DO NOT add Python unless the candidate actually used it
5. Keywords must be integrated NATURALLY and TRUTHFULLY into existing bullets - never fabricate new achievements to fit keywords
6. When in doubt, DO NOT add a keyword - accuracy is more important than keyword density

=== WRITING STYLE (MANDATORY) ===

1. Write like a human, not a brochure.
   - Avoid motivational, promotional, or corporate language.
   - No buzzwords unless followed by concrete proof.
   - If a bullet sounds impressive but vague, make it boring and specific.

2. Under-claim rather than over-claim.
   - Prefer: "worked on", "helped build", "maintained", "set up", "handled"
   - Avoid: architected, spearheaded, enterprise-grade, world-class, cutting-edge, revolutionized, orchestrated

3. Task then Tool then Result (optional).
   - Start bullets with what was done. Mention real tools. Results can be approximate.

4. Bullet rules: 8-22 words max per bullet. Max one comma per bullet. No two consecutive bullets start with same verb. Variation required.

5. Human imperfection: Occasionally soften claims. Use "~20 users" or "around 30%". Not every bullet should sound equally strong.

=== FORBIDDEN PHRASES ===

Do NOT use: results-driven, passionate about, proven track record, dynamic team player,
leveraging cutting-edge technologies, fast-paced environment, innovative solutions,
synergy, stakeholder engagement (unless very specific), spearheaded, architected, orchestrated

=== ANTI-HALLUCINATION RULES (CRITICAL) ===

DO NOT fabricate or invent ANY information:
- NO fake certifications (only optimize certifications already in the data)
- NO fake projects (only enhance projects already in the data)
- NO fake job titles or companies (preserve all exactly)
- NO invented achievements or metrics (only enhance what exists)
- NO made-up skills (only include skills from original or job description IF they match actual experience)
- NO claiming experience with tools/technologies not evidenced in the original resume
- If a keyword from the job description doesn't match the candidate's background, DO NOT force it in

=== PRESERVATION REQUIREMENTS ===

- Keep EXACT count of all items (certifications, projects, jobs, education, references, languages, awards, volunteer, publications)
- Preserve all names, dates, companies, schools exactly
- Preserve all IDs in the JSON structure
- Only ENHANCE existing content, don't ADD new items
- If original has 3 certifications, optimized must have exactly 3 certifications
- Contact info must remain exactly the same

=== OPTIMIZATION FOCUS - PROCESS SECTION BY SECTION ===

Process each section methodically in this order:

1. CONTACT: Keep exactly as-is (no changes)
2. SUMMARY: Rewrite 2-3 sentences highlighting candidate's actual strengths relevant to the job
3. EXPERIENCE: Go through EACH job entry one-by-one:
   - Review each bullet point individually
   - Enhance wording to be clearer and more impactful
   - Add relevant keywords ONLY if they truthfully describe what was done
   - Ensure metrics are present (if in original) or approximate if appropriate
4. EDUCATION: Keep exactly as-is (no changes)
5. SKILLS: Reorder by job relevance, keep all original skills, may add job-relevant skills ONLY if evidenced in experience
6. CERTIFICATIONS/PROJECTS/etc: Enhance descriptions but preserve all items exactly

=== KEYWORD INTEGRATION RULES ===

- ONLY add keywords where they fit NATURALLY and TRUTHFULLY
- If a keyword doesn't match actual experience, skip it
- Better to have fewer accurate keywords than many inaccurate ones
- Enhance existing content with keywords, don't fabricate new content`;
      
      let contextInfo = "";
      if (parsedAnalysisContext) {
        const ctx = parsedAnalysisContext;
        contextInfo = `\n\n=== ATS ANALYSIS CONTEXT ===
Current ATS Score: ${ctx.overallScore}/100
Sub-scores: Skills ${ctx.subScores?.skillsMatch}%, Experience ${ctx.subScores?.experienceMatch}%, Keywords ${ctx.subScores?.keywordMatch}%

CRITICAL ISSUES TO FIX:
${ctx.redFlags?.filter((f: any) => f.severity === 'critical').map((f: any) => `- ${f.type}: ${f.description}`).join('\n') || 'None'}

MISSING KEYWORDS (must include naturally):
${ctx.resumeKeywords?.missing?.slice(0, 15).join(', ') || 'None'}

UNDER-REPRESENTED KEYWORDS:
${ctx.resumeKeywords?.underRepresented?.slice(0, 10).join(', ') || 'None'}

WRITING QUALITY IMPROVEMENTS NEEDED:
${ctx.writingQuality?.actionVerbsScore < 7 ? `- Action verbs: ${ctx.writingQuality.actionVerbsScore}/10 - Use stronger verbs` : ''}
${ctx.writingQuality?.metricsUsageScore < 7 ? `- Metrics: ${ctx.writingQuality.metricsUsageScore}/10 - Add quantifiable results` : ''}
${ctx.writingQuality?.impactLanguageScore < 7 ? `- Impact language: ${ctx.writingQuality.impactLanguageScore}/10 - Focus on achievements` : ''}

MANDATORY SKILLS TO HIGHLIGHT:
${ctx.jobRequirements?.mandatorySkills?.join(', ') || 'None'}

TOP PRIORITY FIXES:
${ctx.summary?.mostImportantFixes?.slice(0, 5).map((f: string) => `- ${f}`).join('\n') || 'None'}
`;
      }
      
      // Parse the resume data to count items
      let resumeDataObj: any = {};
      try {
        resumeDataObj = JSON.parse(resumeData || resumeText || '{}');
      } catch (e) {
        console.warn("Could not parse resume data for counting:", e);
      }

      const certCount = resumeDataObj.certifications?.length || 0;
      const projectCount = resumeDataObj.projects?.length || 0;
      const experienceCount = resumeDataObj.experience?.length || 0;
      const educationCount = resumeDataObj.education?.length || 0;
      const skillsCount = resumeDataObj.skills?.length || 0;
      const referencesCount = resumeDataObj.references?.length || 0;
      const languagesCount = resumeDataObj.languages?.length || 0;
      const awardsCount = resumeDataObj.awards?.length || 0;
      const volunteerCount = resumeDataObj.volunteer?.length || 0;
      const publicationsCount = resumeDataObj.publications?.length || 0;

      let structuredPreservation = `\n\n⚠️ PRESERVATION REQUIREMENTS (VERIFY COUNTS):
- Experience entries: MUST have exactly ${experienceCount} (same as original)
- Education entries: MUST have exactly ${educationCount} (same as original)`;

      if (certCount > 0) {
        structuredPreservation += `\n- Certifications: MUST have exactly ${certCount} (same as original)`;
      }
      if (projectCount > 0) {
        structuredPreservation += `\n- Projects: MUST have exactly ${projectCount} (same as original)`;
      }
      if (referencesCount > 0) {
        structuredPreservation += `\n- References: MUST have exactly ${referencesCount} (same as original)`;
      }
      if (languagesCount > 0) {
        structuredPreservation += `\n- Languages: MUST have exactly ${languagesCount} (same as original)`;
      }
      if (awardsCount > 0) {
        structuredPreservation += `\n- Awards: MUST have exactly ${awardsCount} (same as original)`;
      }
      if (volunteerCount > 0) {
        structuredPreservation += `\n- Volunteer Experience: MUST have exactly ${volunteerCount} (same as original)`;
      }
      if (publicationsCount > 0) {
        structuredPreservation += `\n- Publications: MUST have exactly ${publicationsCount} (same as original)`;
      }
      if (skillsCount > 0) {
        structuredPreservation += `\n- Skills: MUST have at least ${skillsCount} (can add job-relevant skills from missing list, but keep all ${skillsCount} original skills)`;
      }

      structuredPreservation += `\n- Contact info: MUST remain exactly the same (name, email, phone, location, linkedin)
- All IDs: MUST be preserved exactly (exp-xxx, edu-xxx, cert-xxx, proj-xxx, ref-xxx, etc.)
- Company names, job titles, dates: MUST be preserved exactly
- School names, degree names: MUST be preserved exactly
- Reference names, contact info: MUST be preserved exactly
- Certification names, issuers: MUST be preserved exactly

DO NOT ADD NEW CERTIFICATIONS, PROJECTS, REFERENCES, AWARDS, VOLUNTEER EXPERIENCES, OR JOBS. ONLY ENHANCE EXISTING CONTENT.`;

      userPrompt = `JOB DESCRIPTION (READ CAREFULLY - ONLY USE KEYWORDS THAT MATCH ACTUAL EXPERIENCE):
${jobDescription}

RESUME DATA (JSON):
${resumeData || resumeText}${contextInfo}${structuredPreservation}

TASK: Optimize this resume for the job description above by processing EACH SECTION methodically.

=== CRITICAL INSTRUCTIONS ===

1. READ THE JOB DESCRIPTION FIRST - Understand what they're looking for
2. COMPARE to the candidate's actual experience in the resume
3. ONLY enhance with keywords that TRUTHFULLY match the candidate's background
4. DO NOT add skills/technologies the candidate hasn't actually used
5. Process section-by-section:

STEP 1 - SUMMARY:
- Rewrite 2-3 sentences highlighting strengths that ACTUALLY align with job requirements
- Use keywords from job description ONLY if they match candidate's real experience
- Make it specific to this candidate's background, not generic

STEP 2 - EXPERIENCE (process each job individually):
For EACH work experience entry:
  a) Read all existing bullets for that job
  b) Identify which job requirements match this specific role
  c) Enhance bullets with relevant keywords IF truthful
  d) Add metrics where appropriate (approximate if needed)
  e) Use strong but realistic language (no over-claiming)
  f) DO NOT invent achievements or technologies not in original

STEP 3 - SKILLS:
- Reorder skills to prioritize job-relevant ones first
- Keep ALL ${skillsCount > 0 ? skillsCount : ''} original skills
- MAY add missing mandatory skills ONLY if evidenced in experience section
- DO NOT add skills the candidate hasn't demonstrated

STEP 4 - OTHER SECTIONS:
- Enhance descriptions where appropriate
- Keep exact same count of items (certifications, projects, etc.)
- DO NOT add new items, only improve existing ones

=== QUALITY CHECKLIST - VERIFY BEFORE RETURNING ===

Accuracy Check:
  ✓ No fabricated skills or technologies
  ✓ No claimed experience with tools not in original
  ✓ Keywords added only where truthful
  ✓ Contact info unchanged
  ✓ All dates, companies, schools preserved exactly

Completeness Check:
${experienceCount > 0 ? `  ✓ Experience array has exactly ${experienceCount} entries` : ''}
${educationCount > 0 ? `  ✓ Education array has exactly ${educationCount} entries` : ''}
${certCount > 0 ? `  ✓ Certifications array has exactly ${certCount} entries` : ''}
${projectCount > 0 ? `  ✓ Projects array has exactly ${projectCount} entries` : ''}
  ✓ All IDs preserved
  ✓ All section counts match original

Quality Check:
  ✓ Bullets are 8-22 words (not too long)
  ✓ No forbidden phrases used
  ✓ Plain language, not marketing speak
  ✓ Specific examples, not vague claims

RETURN: ONLY valid JSON with the same structure but improved content. No explanations, no commentary, just the JSON.`;

    }

    // Rewrites carry whole resumes — use the deep tier; analysis stays fast.
    const tier: HorusTier =
      analysisType === "auto-rewrite" || analysisType === "rewrite-structured"
        ? "deep"
        : "fast";

    console.log(`Processing ${analysisType} request`);

    if (analysisType === "full-analysis") {
      const { object: analysisResult } = await horusGenerateObject(AtsAnalysisSchema, {
        task: "careercraft.ats_full_analysis",
        system: systemPrompt,
        prompt: userPrompt,
        model: tier,
        temperature: 0.3,
        maxTokens: 6000,
      });
      return json({ analysis: analysisResult });
    } else if (analysisType === "rewrite-structured") {
      const { object: optimizedResume } = await horusGenerateObject(StructuredResumeSchema, {
        task: "careercraft.ats_rewrite_structured",
        system: systemPrompt,
        prompt: userPrompt,
        model: tier,
        temperature: 0.7,
        maxTokens: 10000,
      });

        // Parse original data for validation and recovery
        const warnings: string[] = [];
        const recoveredSections: string[] = [];
        let originalResumeData: any = {};
        try {
          originalResumeData = JSON.parse(resumeData || resumeText || '{}');
        } catch (e) {
          console.warn("Could not parse original resume data for validation:", e);
        }

        // ALWAYS restore contact info from original (never let AI change name/email/phone)
        if (originalResumeData.contact) {
          optimizedResume.contact = { ...originalResumeData.contact };
        }

        // Helper: restore missing array items from original
        const restoreArray = (fieldName: string, idPrefix: string) => {
          const originalArr = originalResumeData[fieldName] || [];
          const optimizedArr = optimizedResume[fieldName] || [];
          
          if (originalArr.length === 0) return; // Nothing to restore
          
          if (optimizedArr.length === 0 && originalArr.length > 0) {
            // Entire section was dropped -- restore from original
            optimizedResume[fieldName] = originalArr.map((item: any, idx: number) => ({
              ...item,
              id: item.id || `${idPrefix}-${Date.now()}-${idx}`,
            }));
            recoveredSections.push(fieldName);
            warnings.push(`${fieldName}: Entire section restored from original (${originalArr.length} items)`);
            console.warn(`⚠️ ${fieldName.toUpperCase()} RESTORED: AI dropped all ${originalArr.length} items`);
          } else if (optimizedArr.length < originalArr.length) {
            // Some items were dropped -- append missing ones from original
            // Match by ID if possible, otherwise by index
            const optimizedIds = new Set(optimizedArr.map((item: any) => item.id).filter(Boolean));
            const missingItems = originalArr.filter((item: any) => {
              if (item.id && optimizedIds.has(item.id)) return false;
              return true;
            });
            
            // Only append truly missing items (those beyond the optimized count)
            const itemsToAdd = originalArr.slice(optimizedArr.length);
            if (itemsToAdd.length > 0) {
              optimizedResume[fieldName] = [
                ...optimizedArr,
                ...itemsToAdd.map((item: any, idx: number) => ({
                  ...item,
                  id: item.id || `${idPrefix}-${Date.now()}-${optimizedArr.length + idx}`,
                }))
              ];
              warnings.push(`${fieldName}: Restored ${itemsToAdd.length} missing items (had ${originalArr.length}, AI returned ${optimizedArr.length})`);
              console.warn(`⚠️ ${fieldName.toUpperCase()}: Restored ${itemsToAdd.length} missing items`);
              recoveredSections.push(fieldName);
            }
          }
          
          // Ensure all items have IDs
          if (optimizedResume[fieldName]) {
            optimizedResume[fieldName] = optimizedResume[fieldName].map((item: any, idx: number) => ({
              ...item,
              id: item.id || originalResumeData[fieldName]?.[idx]?.id || `${idPrefix}-${Date.now()}-${idx}`,
            }));
          }
        };

        // Restore all array sections
        restoreArray("experience", "exp");
        restoreArray("education", "edu");
        restoreArray("certifications", "cert");
        restoreArray("projects", "proj");
        restoreArray("references", "ref");
        restoreArray("languages", "lang");
        restoreArray("awards", "award");
        restoreArray("volunteer", "vol");
        restoreArray("publications", "pub");

        // Restore skills if count decreased
        const originalSkillsCount = originalResumeData.skills?.length || 0;
        const optimizedSkillsCount = optimizedResume.skills?.length || 0;
        if (originalSkillsCount > 0 && optimizedSkillsCount < originalSkillsCount) {
          // Merge: keep optimized skills (reordered) and append any originals that were dropped
          const optimizedSkillsLower = new Set((optimizedResume.skills || []).map((s: string) => s.toLowerCase()));
          const missingSkills = (originalResumeData.skills || []).filter(
            (s: string) => !optimizedSkillsLower.has(s.toLowerCase())
          );
          if (missingSkills.length > 0) {
            optimizedResume.skills = [...(optimizedResume.skills || []), ...missingSkills];
            warnings.push(`Skills: Restored ${missingSkills.length} dropped skills`);
            console.warn(`⚠️ SKILLS: Restored ${missingSkills.length} dropped skills`);
          }
        }

        // Return with recovery info
        if (warnings.length > 0 || recoveredSections.length > 0) {
          console.warn("Structured rewrite validation - warnings:", warnings, "recovered:", recoveredSections);
          return json({
            result: optimizedResume,
            recoveredSections,
            warning: recoveredSections.length > 0
              ? `Preserved from your original resume: ${recoveredSections.join(", ")}`
              : "Data preservation issues detected: " + warnings.join("; "),
            validationWarnings: warnings,
          });
        }

        return json({ result: optimizedResume });
    } else {
      // Return text response for other types
      const { text } = await horusGenerateText({
        task: `careercraft.ats_${analysisType ?? "text"}`,
        system: systemPrompt,
        prompt: userPrompt,
        model: tier,
        temperature: 0.7,
        maxTokens:
          analysisType === "auto-rewrite" ||
          analysisType === "rewrite-experience" ||
          analysisType === "generate-achievements" ||
          analysisType === "generate-summaries"
            ? 8000
            : 4000,
      });
      let resultText = text.trim();
      
      // Validate rewrite responses for completeness with enhanced checks
      if (analysisType === "auto-rewrite" || analysisType === "rewrite-experience") {
        const validation = validateRewriteResponse(resultText, resumeText);

        // Log all warnings for monitoring
        if (validation.warnings.length > 0) {
          console.warn("Validation warnings:", validation.warnings);
        }
        if (validation.missingItems.length > 0) {
          console.warn("Missing items detected:", validation.missingItems);
        }

        if (!validation.isComplete && analysisType === "auto-rewrite") {
          // Retry with more explicit instructions if incomplete
          console.warn("Rewrite response appears incomplete, retrying with explicit instructions...");
          console.warn("Missing sections:", validation.missingSections);
          console.warn("Missing items:", validation.missingItems);

          const retrySystemPrompt = `${systemPrompt}

CRITICAL: Your previous response was incomplete. You MUST return the COMPLETE resume with ALL sections. Do not stop until every section is finished.

DETECTED ISSUES IN PREVIOUS ATTEMPT:
${validation.missingSections.length > 0 ? `- Missing sections: ${validation.missingSections.join(", ")}` : ''}
${validation.missingItems.length > 0 ? `- Missing items: ${validation.missingItems.join("; ")}` : ''}
${validation.warnings.length > 0 ? `- Warnings: ${validation.warnings.join("; ")}` : ''}

YOU MUST INCLUDE EVERY SINGLE ITEM FROM THE ORIGINAL RESUME.`;

          const retryUserPrompt = `${userPrompt}

IMPORTANT: Your previous attempt was incomplete. Return the FULL resume now, including ALL sections from the original.
${validation.missingSections.length > 0 ? `\nYou missed these sections: ${validation.missingSections.join(", ")}` : ''}
${validation.missingItems.length > 0 ? `\n⚠️ You lost some items: ${validation.missingItems.join("; ")}` : ''}

DO NOT SKIP ANY CERTIFICATIONS, PROJECTS, OR OTHER SECTIONS.`;

          try {
            const { text: retryText } = await horusGenerateText({
              task: "careercraft.ats_rewrite_retry",
              system: retrySystemPrompt,
              prompt: retryUserPrompt,
              model: tier,
              maxTokens: 10000,
              temperature: 0.7,
            });
            resultText = retryText.trim();
            const retryValidation = validateRewriteResponse(resultText, resumeText);

            if (!retryValidation.isComplete) {
              console.error("Retry also incomplete:", retryValidation.missingSections);
              console.error("Missing items after retry:", retryValidation.missingItems);
              // Return with detailed warning
              const allWarnings = [
                ...retryValidation.missingSections.map(s => `Missing section: ${s}`),
                ...retryValidation.missingItems,
                ...retryValidation.warnings,
              ];
              return json({
                result: resultText,
                warning: "Response may be incomplete. Issues detected: " + allWarnings.join("; "),
                validationDetails: {
                  missingSections: retryValidation.missingSections,
                  missingItems: retryValidation.missingItems,
                  warnings: retryValidation.warnings,
                }
              });
            } else {
              // Retry succeeded, but still log warnings if any
              if (retryValidation.warnings.length > 0) {
                console.warn("Retry succeeded but with warnings:", retryValidation.warnings);
              }
            }
          } catch (retryError) {
            console.warn("Retry generation failed, using original rewrite:", retryError);
          }
        }

        // Log warnings even if response is marked complete
        if (validation.warnings.length > 0) {
          console.warn("Rewrite completed with warnings:", validation.warnings);
        }
        if (!validation.isComplete && validation.missingSections.length > 0) {
          console.warn("Rewrite response missing sections:", validation.missingSections);
        }
      }

      // HUMAN IMPERFECTION PASS: Soften ~20% of bullets for auto-rewrite
      if (analysisType === "auto-rewrite" && resultText.length > 200) {
        try {
          const { text: imperfectionText } = await horusGenerateText({
            task: "careercraft.ats_imperfection_pass",
            model: tier,
            system: `You are a human editor doing a quick pass on your own resume before submitting.
Your ONLY task: pick roughly 20% of the bullet points and make them slightly shorter, weaker, or more casual. This breaks AI-detection patterns.

Rules:
- Only change ~20% of bullets. Leave the rest exactly as-is.
- Changes should be subtle: remove an adjective, shorten a phrase, use a simpler verb, soften a claim.
- Do NOT change contact info, section headers, dates, company names, or job titles.
- Do NOT remove any sections or bullets entirely.
- Do NOT add new content.
- Keep all facts accurate.
 - Return the COMPLETE resume with your edits. Do not explain changes.`,
            prompt: resultText,
            maxTokens: 8000,
            temperature: 0.8,
          });
          const softened = imperfectionText?.trim();
          if (softened && softened.length > resultText.length * 0.5) {
            resultText = softened;
            console.log("Imperfection pass applied successfully");
          } else {
            console.warn("Imperfection pass returned too-short result, skipping");
          }
        } catch (imperfectionError) {
          console.warn("Imperfection pass error, using original rewrite:", imperfectionError);
        }
      }

      // DETERMINISTIC SECTION MERGE: Restore any sections the AI dropped
      if (analysisType === "auto-rewrite" || analysisType === "rewrite-experience") {
        const { mergedText, recoveredSections } = mergeMissingSections(resumeText, resultText);
        if (recoveredSections.length > 0) {
          console.warn("Recovered missing sections from original:", recoveredSections);
          resultText = mergedText;
          return json({
            result: resultText,
            recoveredSections,
            warning: `The following sections were preserved from your original resume: ${recoveredSections.join(", ")}`,
          });
        }
      }
      
      return json({ result: resultText });
    }
  } catch (error) {
    console.error("Error in ats-analyze function:", error);
    return json({ error: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
}, { name: "ats-analyze", allowedMethods: ["POST"] }));
