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
    const { text, jobDescription, type, reviewMode, tone } = await req.json();
    
    if (!text || !jobDescription) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
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

    if (type === "bullet") {
      systemPrompt = `You are a human job applicant rewriting a single bullet point on your own resume.
You write plainly and specifically, like a real person describing work they actually did.

Rules:
- 8-22 words max. Max one comma.
- Start with what was done, then the tool/tech used, then result (optional).
- Prefer natural verbs: "set up", "worked on", "built", "helped with", "maintained", "wrote", "configured"
- Avoid: architected, spearheaded, orchestrated, leveraged, revolutionized, cutting-edge
- Include at least one concrete noun (language, framework, service, database, platform).
- Results can be approximate: "~20 users", "around 30%"
- Use past tense for previous roles.
- Do NOT make it sound like marketing copy. Plain and specific.
- FORBIDDEN: results-driven, passionate about, proven track record, innovative solutions, synergy`;

      userPrompt = `Job Description Keywords: ${jobDescription.split(/\s+/).slice(0, 50).join(" ")}

Original Bullet Point:
${text}

Rewrite this bullet point to be ATS-optimized and achievement-focused. Return ONLY the rewritten bullet point, nothing else.`;
    } else if (type === "format") {
      systemPrompt = `You are an ATS formatting expert. Fix resume formatting issues to pass ATS scanners.

Key requirements:
- Remove special characters and symbols that ATS can't read
- Fix date formats to be consistent (MM/YYYY)
- Ensure proper spacing and line breaks
- Remove tables, text boxes, headers/footers
- Use standard section headers (Experience, Education, Skills)
- Maintain readability while being ATS-friendly`;

      userPrompt = `Resume text:
${text}

Fix all ATS formatting issues. Return the corrected resume text with proper formatting.`;
    } else if (type === "review") {
      // Recruiter review modes
      const reviewPrompts: Record<string, { system: string; user: string }> = {
        harsh: {
          system: "You are a brutally honest senior recruiter with 15+ years at top tech companies. You've rejected thousands of resumes. Be direct, critical, but constructive.",
          user: `Job Description:\n${jobDescription}\n\nResume:\n${text}\n\nGive a HARSH but helpful review. Point out every weakness, red flag, and missed opportunity. Be brutally honest about what would make you reject this resume. Use direct language. Maximum 250 words.`
        },
        soft: {
          system: "You are an encouraging career coach who believes in positive reinforcement while still providing honest feedback.",
          user: `Job Description:\n${jobDescription}\n\nResume:\n${text}\n\nProvide a supportive review highlighting strengths first, then gently suggest improvements. Be kind but honest. Maximum 250 words.`
        },
        tech: {
          system: "You are a senior engineering hiring manager at a FAANG company. You focus on technical depth, impact, and scalability.",
          user: `Job Description:\n${jobDescription}\n\nResume:\n${text}\n\nReview from a tech hiring manager perspective. Focus on technical skills, system design experience, impact metrics, and leadership. What technical red flags do you see? Maximum 250 words.`
        },
        junior: {
          system: "You are a recruiter specializing in entry-level and junior positions. You understand limited experience and focus on potential.",
          user: `Job Description:\n${jobDescription}\n\nResume:\n${text}\n\nReview for a junior candidate. Focus on transferable skills, learning ability, projects, and growth potential. How can they best position their limited experience? Maximum 250 words.`
        },
        australian: {
          system: "You are an Australian recruiter familiar with Australian resume standards and workplace culture.",
          user: `Job Description:\n${jobDescription}\n\nResume:\n${text}\n\nReview this resume for Australian standards. Check for: professional summary, key achievements, proper formatting, references statement, and cultural fit for Australian workplace. What needs to change? Maximum 250 words.`
        }
      };

      const selectedReview = reviewPrompts[reviewMode] || reviewPrompts.harsh;
      systemPrompt = selectedReview.system;
      userPrompt = selectedReview.user;
    } else if (type === "cover-letter") {
      // Cover letter generation
      const tonePrompts: Record<string, { system: string; instructions: string }> = {
        professional: {
          system: "You are a professional cover letter writer specializing in corporate and traditional industries.",
          instructions: "Write in a formal, respectful tone. Use traditional business language. Be polite and professional throughout."
        },
        confident: {
          system: "You are a bold cover letter writer who helps candidates stand out with assertive, achievement-focused language.",
          instructions: "Write with confidence and conviction. Use strong, active language. Emphasize leadership and impact. Be direct about your value."
        },
        casual: {
          system: "You are a modern cover letter writer who uses friendly, conversational language while remaining professional.",
          instructions: "Write in a warm, approachable tone. Use contractions and conversational language. Be personable while staying professional."
        }
      };

      const selectedTone = tonePrompts[tone] || tonePrompts.professional;
      
      systemPrompt = `${selectedTone.system}

Key requirements:
- Extract and incorporate specific metrics and achievements from the resume
- Mirror keywords from the job description naturally
- Include 3-4 paragraphs: opening, 2-3 achievement paragraphs, closing
- Quantify impact wherever possible using resume data
- Make it compelling and tailored to the specific role
- ${selectedTone.instructions}`;

      userPrompt = `Resume:
${text}

Job Description:
${jobDescription}

Write a tailored cover letter for this job application. Use specific achievements and metrics from the resume. Make it compelling and unique. Maximum 400 words.`;
    } else {
      // Full resume optimization
      systemPrompt = `You are a human job applicant rewriting your own resume.
You are NOT a career coach, NOT a marketer, and NOT an AI assistant.
You write plainly, conservatively, and slightly imperfectly, like a real person describing work they actually did.

WRITING RULES:
- Bullet points only in experience section. Each bullet: 8-22 words max. Max one comma.
- No two consecutive bullets may start with the same verb.
- Every bullet must include at least one concrete noun (language, framework, cloud service, database, platform).
- Prefer: "worked on", "helped build", "maintained", "set up", "handled", "wrote", "configured"
- Avoid: architected, spearheaded, enterprise-grade, world-class, cutting-edge, orchestrated, revolutionized
- Use approximate numbers: "~20 users", "around 30%"
- Not every bullet should sound equally strong. Some should be shorter and simpler.
- Do NOT use: results-driven, passionate about, proven track record, dynamic team player, innovative solutions, synergy
- Use keywords from the job description naturally but only where truthful.
- Keep all sections from the original. Do NOT drop certifications, projects, references, languages, or awards.
- Do NOT fabricate achievements, metrics, certifications, or skills.
- Use standard section headers for ATS: Experience, Education, Skills, Certifications, Projects.`;

      userPrompt = `Job Description:
${jobDescription}

Current Resume:
${text}

Rewrite this resume with plain, human language. Keep every section from the original. Use job description keywords where they fit naturally. Do not add fake information. Return the complete rewritten resume.`;
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
      }),
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
    const rewrittenText = data.choices[0].message.content.trim();

    return new Response(
      JSON.stringify({ rewrittenText }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in rewrite-resume function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
