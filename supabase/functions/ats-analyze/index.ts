import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { resumeText, jobDescription, analysisType, resumeData } = await req.json();
    
    if ((!resumeText && !resumeData) || !jobDescription) {
      return new Response(
        JSON.stringify({ error: "Missing resume or job description" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
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
      systemPrompt = `You are an expert ATS resume writer. Completely rewrite the resume to maximize ATS score for the target job. Maintain truthfulness but optimize every aspect.`;
      userPrompt = `JOB DESCRIPTION:\n${jobDescription}\n\nORIGINAL RESUME:\n${resumeText}\n\nCompletely rewrite this resume to maximize ATS compatibility and keyword matching. Return the optimized resume text.`;
    } else if (analysisType === "rewrite-experience") {
      systemPrompt = `You are an expert at writing impactful resume bullet points. Rewrite ONLY the work experience section with strong action verbs, metrics, and job-relevant keywords.`;
      userPrompt = `JOB DESCRIPTION:\n${jobDescription}\n\nRESUME:\n${resumeText}\n\nRewrite only the work experience section with powerful, metrics-driven bullet points. Keep other sections as-is. Return the full resume with improved experience section.`;
    } else if (analysisType === "generate-achievements") {
      systemPrompt = `You are an achievement generator. Based on the resume context, generate 5-8 keyword-rich achievement bullets that could strengthen the resume for this role.`;
      userPrompt = `JOB DESCRIPTION:\n${jobDescription}\n\nRESUME CONTEXT:\n${resumeText}\n\nGenerate 5-8 powerful achievement bullets with metrics that this candidate could add to strengthen their resume for this role. Make them realistic based on their background.`;
    } else if (analysisType === "generate-summaries") {
      systemPrompt = `You are an expert at writing resume summaries. Generate multiple summary options optimized for ATS.`;
      userPrompt = `JOB DESCRIPTION:\n${jobDescription}\n\nRESUME:\n${resumeText}\n\nGenerate 4 different summary options:\n1. Professional Summary (3-4 sentences, formal)\n2. Technical Summary (focused on skills/tech stack)\n3. Skills Summary (bullet-point format of key skills)\n4. Career Snapshot (one powerful sentence)\n\nLabel each clearly.`;
    } else if (analysisType === "rewrite-structured") {
      // resumeData is already extracted from the request body above
      systemPrompt = `You are an expert ATS resume optimizer. You will receive structured resume data and a job description. Your task is to optimize the resume content while maintaining the exact same JSON structure. Improve bullet points with metrics, add relevant keywords, enhance the summary, but keep all field names and structure identical.`;
      
      userPrompt = `JOB DESCRIPTION:\n${jobDescription}\n\nRESUME DATA (JSON):\n${resumeData || resumeText}\n\nOptimize this resume for the job. Return ONLY valid JSON with the same structure but improved content. Enhance:
- Summary: Make it compelling and keyword-rich
- Experience bullets: Add metrics, action verbs, relevant keywords
- Skills: Prioritize job-relevant skills first
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

    const requestBody: any = {
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    };

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
      const resultText = data.choices[0].message.content.trim();
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
