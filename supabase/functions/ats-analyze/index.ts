import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Validate rewrite response completeness
function validateRewriteResponse(rewrittenText: string, originalText: string): {
  isComplete: boolean;
  missingSections: string[];
  hasTruncation: boolean;
} {
  const missingSections: string[] = [];
  const lowerText = rewrittenText.toLowerCase();
  
  // Check for required sections
  const requiredSections = [
    { name: "Contact Information", keywords: ["email", "phone", "@"] },
    { name: "Professional Summary", keywords: ["summary", "professional", "objective"] },
    { name: "Work Experience", keywords: ["experience", "employment", "work history"] },
    { name: "Education", keywords: ["education", "degree", "university", "college"] },
    { name: "Skills", keywords: ["skills", "technical", "competencies"] },
  ];
  
  // Check if original has these sections
  const originalLower = originalText.toLowerCase();
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
  
  // Check for truncation (incomplete sentences at end, very short response)
  const hasTruncation = 
    rewrittenText.length < originalText.length * 0.5 || // Less than 50% of original
    rewrittenText.endsWith("...") ||
    rewrittenText.endsWith("•") ||
    rewrittenText.endsWith("-") ||
    (!rewrittenText.includes("\n\n") && rewrittenText.length > 500); // No clear sections but long text
  
  const isComplete = missingSections.length === 0 && !hasTruncation;
  
  return { isComplete, missingSections, hasTruncation };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { resumeText, jobDescription, analysisType, resumeData, analysisContext } = await req.json();
    
    if ((!resumeText && !resumeData) || !jobDescription) {
      return new Response(
        JSON.stringify({ error: "Missing resume or job description" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse analysis context if provided
    let parsedAnalysisContext = null;
    if (analysisContext) {
      try {
        parsedAnalysisContext = typeof analysisContext === 'string' ? JSON.parse(analysisContext) : analysisContext;
      } catch (e) {
        console.warn("Failed to parse analysis context:", e);
      }
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY not found");
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let systemPrompt = "";
    let userPrompt = "";
    let toolConfig = null;

    if (analysisType === "full-analysis") {
      systemPrompt = `You are an Enterprise-grade ATS Resume Analyzer & Optimizer Engine trained on top recruitment systems (Greenhouse, Lever, Workday, Taleo, BambooHR, Seek, LinkedIn Talent Insights). You evaluate resumes + job descriptions, simulate an ATS scan, and produce a complete breakdown.`;
      
      userPrompt = `Analyze this resume against the job description and provide a comprehensive ATS analysis.

JOB DESCRIPTION:
${jobDescription}

RESUME:
${resumeText}

Provide a detailed analysis covering all aspects.`;

      toolConfig = {
        tools: [
          {
            type: "function",
            function: {
              name: "provide_ats_analysis",
              description: "Provide comprehensive ATS analysis results",
              parameters: {
                type: "object",
                properties: {
                  overallScore: { 
                    type: "number", 
                    description: "Overall ATS score 0-100" 
                  },
                  subScores: {
                    type: "object",
                    properties: {
                      skillsMatch: { type: "number", description: "Skills match percentage 0-100" },
                      experienceMatch: { type: "number", description: "Experience match percentage 0-100" },
                      keywordMatch: { type: "number", description: "Keyword match percentage 0-100" },
                      formatCompatibility: { type: "number", description: "ATS format compatibility 0-100" }
                    },
                    required: ["skillsMatch", "experienceMatch", "keywordMatch", "formatCompatibility"]
                  },
                  jobRequirements: {
                    type: "object",
                    properties: {
                      mandatorySkills: { type: "array", items: { type: "string" } },
                      preferredSkills: { type: "array", items: { type: "string" } },
                      technicalKeywords: { type: "array", items: { type: "string" } },
                      softSkills: { type: "array", items: { type: "string" } },
                      requiredExperience: { type: "string" },
                      tools: { type: "array", items: { type: "string" } },
                      certifications: { type: "array", items: { type: "string" } }
                    },
                    required: ["mandatorySkills", "preferredSkills", "technicalKeywords", "softSkills", "requiredExperience", "tools", "certifications"]
                  },
                  resumeKeywords: {
                    type: "object",
                    properties: {
                      matched: { type: "array", items: { type: "string" } },
                      missing: { type: "array", items: { type: "string" } },
                      underRepresented: { type: "array", items: { type: "string" } },
                      overused: { type: "array", items: { type: "string" } }
                    },
                    required: ["matched", "missing", "underRepresented", "overused"]
                  },
                  writingQuality: {
                    type: "object",
                    properties: {
                      grammarScore: { type: "number", description: "Score out of 10" },
                      impactLanguageScore: { type: "number", description: "Score out of 10" },
                      metricsUsageScore: { type: "number", description: "Score out of 10" },
                      actionVerbsScore: { type: "number", description: "Score out of 10" },
                      clarityScore: { type: "number", description: "Score out of 10" },
                      structureScore: { type: "number", description: "Score out of 10" }
                    },
                    required: ["grammarScore", "impactLanguageScore", "metricsUsageScore", "actionVerbsScore", "clarityScore", "structureScore"]
                  },
                  redFlags: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        type: { type: "string" },
                        severity: { type: "string", enum: ["critical", "warning", "minor"] },
                        description: { type: "string" },
                        location: { type: "string" }
                      },
                      required: ["type", "severity", "description", "location"]
                    }
                  },
                  improvements: {
                    type: "object",
                    properties: {
                      quickFixes: { 
                        type: "array", 
                        items: { 
                          type: "object",
                          properties: {
                            issue: { type: "string" },
                            fix: { type: "string" }
                          },
                          required: ["issue", "fix"]
                        }
                      },
                      strongEnhancements: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            section: { type: "string" },
                            current: { type: "string" },
                            improved: { type: "string" },
                            impact: { type: "string" }
                          },
                          required: ["section", "current", "improved", "impact"]
                        }
                      },
                      advancedOptimizations: {
                        type: "array",
                        items: { type: "string" }
                      }
                    },
                    required: ["quickFixes", "strongEnhancements", "advancedOptimizations"]
                  },
                  summary: {
                    type: "object",
                    properties: {
                      topStrengths: { type: "array", items: { type: "string" }, maxItems: 3 },
                      topWeaknesses: { type: "array", items: { type: "string" }, maxItems: 3 },
                      mostImportantFixes: { type: "array", items: { type: "string" }, maxItems: 3 },
                      overallVerdict: { type: "string" }
                    },
                    required: ["topStrengths", "topWeaknesses", "mostImportantFixes", "overallVerdict"]
                  }
                },
                required: ["overallScore", "subScores", "jobRequirements", "resumeKeywords", "writingQuality", "redFlags", "improvements", "summary"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "provide_ats_analysis" } }
      };
    } else if (analysisType === "auto-rewrite") {
      systemPrompt = `You are an expert ATS resume writer. Your task is to COMPLETELY rewrite the ENTIRE resume from start to finish. 

CRITICAL REQUIREMENTS:
1. Return the COMPLETE resume with ALL sections in this exact order:
   - Contact Information (name, email, phone, location, LinkedIn)
   - Professional Summary (3-4 sentences)
   - Work Experience (ALL jobs with dates, company, title, bullets)
   - Education (ALL degrees with dates, school, GPA if mentioned)
   - Skills (ALL skills, prioritized by job relevance)
   - Certifications (if present)
   - Projects (if present)
   - Languages (if present)

2. Do NOT skip, truncate, or omit ANY section
3. Maintain original structure and section order
4. Every section must be fully rewritten and optimized
5. Keep contact information accurate (verify name, email, phone)
6. Return complete, ready-to-use resume text

Your output MUST be a complete, professional resume. Maintain truthfulness but optimize every aspect for ATS compatibility.`;
      
      let contextInfo = "";
      let criticalIssues = "None";
      let missingKeywords = "None";
      let writingIssues = "None";
      
      if (parsedAnalysisContext) {
        const ctx = parsedAnalysisContext;
        criticalIssues = ctx.redFlags?.filter((f: any) => f.severity === 'critical').map((f: any) => `${f.type}: ${f.description}`).join('; ') || 'None';
        missingKeywords = ctx.resumeKeywords?.missing?.slice(0, 15).join(', ') || 'None';
        const issues = [];
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
      
      userPrompt = `JOB DESCRIPTION:
${jobDescription}

ORIGINAL RESUME (REWRITE EVERY SECTION):
${resumeText}${contextInfo}

TASK: Completely rewrite the ENTIRE resume above. You must:
1. Include ALL sections from the original resume
2. Optimize EVERY section with keywords from job description
3. Address all critical issues: ${criticalIssues}
4. Incorporate missing keywords: ${missingKeywords}
5. Fix writing quality issues: ${writingIssues}
6. Maintain the same structure and section order
7. Return the complete, fully rewritten resume

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
[PROJECTS - if present]
[LANGUAGES - if present]

Return the COMPLETE resume now. Do not stop mid-section. Include everything.`;
    } else if (analysisType === "rewrite-experience") {
      systemPrompt = `You are an expert at writing impactful resume bullet points. Rewrite ONLY the work experience section with strong action verbs, metrics, and job-relevant keywords.`;
      
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
      systemPrompt = `You are an expert ATS resume optimizer. You will receive structured resume data and a job description. Your task is to optimize the resume content while maintaining the exact same JSON structure. Improve bullet points with metrics, add relevant keywords, enhance the summary, but keep all field names and structure identical.`;
      
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
      
      userPrompt = `JOB DESCRIPTION:\n${jobDescription}\n\nRESUME DATA (JSON):\n${resumeData || resumeText}${contextInfo}\n\nOptimize this resume for the job. Return ONLY valid JSON with the same structure but improved content. Address all critical issues and incorporate missing keywords. Enhance:
- Summary: Make it compelling, keyword-rich, and address top weaknesses
- Experience bullets: Add metrics, strong action verbs, relevant keywords from missing list
- Skills: Prioritize job-relevant skills first, include missing mandatory skills
Keep contact info unchanged. Return ONLY the JSON, no explanation.`;

      toolConfig = {
        tools: [
          {
            type: "function",
            function: {
              name: "return_optimized_resume",
              description: "Return the optimized resume in structured JSON format",
              parameters: {
                type: "object",
                properties: {
                  contact: {
                    type: "object",
                    properties: {
                      name: { type: "string" },
                      email: { type: "string" },
                      phone: { type: "string" },
                      location: { type: "string" },
                      linkedin: { type: "string" },
                      website: { type: "string" }
                    }
                  },
                  summary: { type: "string", description: "Optimized professional summary" },
                  experience: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        id: { type: "string" },
                        title: { type: "string" },
                        company: { type: "string" },
                        location: { type: "string" },
                        startDate: { type: "string" },
                        endDate: { type: "string" },
                        current: { type: "boolean" },
                        bullets: { type: "array", items: { type: "string" }, description: "Optimized achievement bullets with metrics" }
                      }
                    }
                  },
                  education: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        id: { type: "string" },
                        degree: { type: "string" },
                        school: { type: "string" },
                        location: { type: "string" },
                        graduationDate: { type: "string" },
                        gpa: { type: "string" }
                      }
                    }
                  },
                  skills: { type: "array", items: { type: "string" }, description: "Skills prioritized by job relevance" },
                  certifications: { type: "array", items: { type: "string" } },
                  projects: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        id: { type: "string" },
                        name: { type: "string" },
                        description: { type: "string" },
                        technologies: { type: "array", items: { type: "string" } }
                      }
                    }
                  }
                },
                required: ["contact", "summary", "experience", "education", "skills"]
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "return_optimized_resume" } }
      };
    }

    // Get model from environment or use default
    const REWRITE_MODEL = Deno.env.get('REWRITE_MODEL') || 'google/gemini-2.5-flash';
    const model = analysisType === "auto-rewrite" || analysisType === "rewrite-structured" ? REWRITE_MODEL : "google/gemini-2.5-flash";
    
    const requestBody: any = {
      model: model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    };

    // Add max_tokens for rewrite operations to ensure complete output
    if (analysisType === "auto-rewrite" || analysisType === "rewrite-experience" || analysisType === "generate-achievements" || analysisType === "generate-summaries") {
      requestBody.max_tokens = 8000; // Ensure full resume output
      requestBody.temperature = 0.7; // Balance creativity and consistency
    }

    if (toolConfig) {
      requestBody.tools = toolConfig.tools;
      requestBody.tool_choice = toolConfig.tool_choice;
    }

    console.log(`Processing ${analysisType} request`);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI API error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ error: "AI service error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    console.log("AI response received");

    if (analysisType === "full-analysis") {
      // Extract structured data from tool call
      const toolCall = data.choices[0].message.tool_calls?.[0];
      if (toolCall && toolCall.function) {
        const analysisResult = JSON.parse(toolCall.function.arguments);
        return new Response(
          JSON.stringify({ analysis: analysisResult }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } else {
        // Fallback if no tool call
        return new Response(
          JSON.stringify({ error: "Failed to parse analysis" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else if (analysisType === "rewrite-structured") {
      // Extract structured resume data from tool call
      const toolCall = data.choices[0].message.tool_calls?.[0];
      if (toolCall && toolCall.function) {
        const optimizedResume = JSON.parse(toolCall.function.arguments);
        // Add IDs if missing
        if (optimizedResume.experience) {
          optimizedResume.experience = optimizedResume.experience.map((exp: any, idx: number) => ({
            ...exp,
            id: exp.id || `exp-${Date.now()}-${idx}`,
          }));
        }
        if (optimizedResume.education) {
          optimizedResume.education = optimizedResume.education.map((edu: any, idx: number) => ({
            ...edu,
            id: edu.id || `edu-${Date.now()}-${idx}`,
          }));
        }
        if (optimizedResume.projects) {
          optimizedResume.projects = optimizedResume.projects.map((proj: any, idx: number) => ({
            ...proj,
            id: proj.id || `proj-${Date.now()}-${idx}`,
          }));
        }
        return new Response(
          JSON.stringify({ result: optimizedResume }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } else {
        return new Response(
          JSON.stringify({ error: "Failed to generate optimized resume" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else {
      // Return text response for other types
      let resultText = data.choices[0].message.content.trim();
      
      // Validate rewrite responses for completeness
      if (analysisType === "auto-rewrite" || analysisType === "rewrite-experience") {
        const validation = validateRewriteResponse(resultText, resumeText);
        
        if (!validation.isComplete && analysisType === "auto-rewrite") {
          // Retry with more explicit instructions if incomplete
          console.warn("Rewrite response appears incomplete, retrying with explicit instructions...");
          
          const retrySystemPrompt = `${systemPrompt}\n\nCRITICAL: Your previous response was incomplete. You MUST return the COMPLETE resume with ALL sections. Do not stop until every section is finished.`;
          const retryUserPrompt = `${userPrompt}\n\nIMPORTANT: Your previous attempt was incomplete. Return the FULL resume now, including ALL sections from the original.`;
          
          const retryRequestBody: any = {
            model: model,
            messages: [
              { role: "system", content: retrySystemPrompt },
              { role: "user", content: retryUserPrompt },
            ],
            max_tokens: 10000, // Increase for retry
            temperature: 0.7,
          };
          
          const retryResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${LOVABLE_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(retryRequestBody),
          });
          
          if (retryResponse.ok) {
            const retryData = await retryResponse.json();
            resultText = retryData.choices[0].message.content.trim();
            const retryValidation = validateRewriteResponse(resultText, resumeText);
            
            if (!retryValidation.isComplete) {
              console.error("Retry also incomplete:", retryValidation.missingSections);
              // Return with warning but still return the result
              return new Response(
                JSON.stringify({ 
                  result: resultText,
                  warning: "Response may be incomplete. Missing sections: " + retryValidation.missingSections.join(", ")
                }),
                { headers: { ...corsHeaders, "Content-Type": "application/json" } }
              );
            }
          }
        }
        
        if (!validation.isComplete && validation.missingSections.length > 0) {
          console.warn("Rewrite response missing sections:", validation.missingSections);
        }
      }
      
      return new Response(
        JSON.stringify({ result: resultText }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (error) {
    console.error("Error in ats-analyze function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
