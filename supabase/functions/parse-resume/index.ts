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
    const { rawText } = await req.json();
    
    if (!rawText) {
      return new Response(
        JSON.stringify({ error: "Missing resume text" }),
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

    const systemPrompt = `You are an expert resume parser. Extract structured information from the resume text provided. Be thorough and accurate. If information is not present, use empty strings or empty arrays.`;
    
    const userPrompt = `Parse this resume and extract all information:

${rawText}

Extract all details including contact info, work experience with bullet points, education, skills, and any other relevant sections.`;

    const requestBody = {
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "extract_resume_data",
            description: "Extract structured resume data",
            parameters: {
              type: "object",
              properties: {
                contact: {
                  type: "object",
                  properties: {
                    name: { type: "string", description: "Full name" },
                    email: { type: "string", description: "Email address" },
                    phone: { type: "string", description: "Phone number" },
                    location: { type: "string", description: "City, State or full address" },
                    linkedin: { type: "string", description: "LinkedIn URL or profile path" },
                    website: { type: "string", description: "Personal website or portfolio URL" }
                  },
                  required: ["name", "email", "phone", "location"]
                },
                summary: { 
                  type: "string", 
                  description: "Professional summary or objective statement" 
                },
                experience: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      title: { type: "string", description: "Job title" },
                      company: { type: "string", description: "Company name" },
                      location: { type: "string", description: "Job location" },
                      startDate: { type: "string", description: "Start date (e.g., Jan 2020 or 2020)" },
                      endDate: { type: "string", description: "End date or 'Present'" },
                      current: { type: "boolean", description: "Is this the current job" },
                      bullets: { 
                        type: "array", 
                        items: { type: "string" },
                        description: "Achievement/responsibility bullet points"
                      }
                    },
                    required: ["title", "company", "startDate", "endDate", "bullets"]
                  }
                },
                education: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      degree: { type: "string", description: "Degree name (e.g., Bachelor of Science in Computer Science)" },
                      school: { type: "string", description: "School/University name" },
                      location: { type: "string", description: "School location" },
                      graduationDate: { type: "string", description: "Graduation date or expected date" },
                      gpa: { type: "string", description: "GPA if mentioned" }
                    },
                    required: ["degree", "school", "graduationDate"]
                  }
                },
                skills: {
                  type: "array",
                  items: { type: "string" },
                  description: "List of skills, technologies, tools"
                },
                certifications: {
                  type: "array",
                  items: { type: "string" },
                  description: "List of certifications"
                },
                projects: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      name: { type: "string", description: "Project name" },
                      description: { type: "string", description: "Project description" },
                      technologies: { 
                        type: "array", 
                        items: { type: "string" },
                        description: "Technologies used"
                      }
                    },
                    required: ["name", "description"]
                  }
                }
              },
              required: ["contact", "summary", "experience", "education", "skills"],
              additionalProperties: false
            }
          }
        }
      ],
      tool_choice: { type: "function", function: { name: "extract_resume_data" } }
    };

    console.log("Parsing resume with AI...");

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

      return new Response(
        JSON.stringify({ error: "AI service error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    
    // Log token usage for tracking
    const usage = data.usage;
    if (usage) {
      console.log("📊 TOKEN USAGE:", {
        prompt_tokens: usage.prompt_tokens,
        completion_tokens: usage.completion_tokens,
        total_tokens: usage.total_tokens
      });
    }
    console.log("AI parsing complete");

    // Extract structured data from tool call
    const toolCall = data.choices[0].message.tool_calls?.[0];
    if (toolCall && toolCall.function) {
      const parsedResume = JSON.parse(toolCall.function.arguments);
      
      // Add IDs to experience and education for React keys
      if (parsedResume.experience) {
        parsedResume.experience = parsedResume.experience.map((exp: any, idx: number) => ({
          ...exp,
          id: `exp-${Date.now()}-${idx}`,
          current: exp.current || exp.endDate?.toLowerCase() === 'present',
          location: exp.location || '',
          bullets: exp.bullets || []
        }));
      }
      
      if (parsedResume.education) {
        parsedResume.education = parsedResume.education.map((edu: any, idx: number) => ({
          ...edu,
          id: `edu-${Date.now()}-${idx}`,
          location: edu.location || '',
          gpa: edu.gpa || ''
        }));
      }
      
      if (parsedResume.projects) {
        parsedResume.projects = parsedResume.projects.map((proj: any, idx: number) => ({
          ...proj,
          id: `proj-${Date.now()}-${idx}`,
          technologies: proj.technologies || []
        }));
      }

      // Ensure contact has all fields
      parsedResume.contact = {
        name: parsedResume.contact?.name || '',
        email: parsedResume.contact?.email || '',
        phone: parsedResume.contact?.phone || '',
        location: parsedResume.contact?.location || '',
        linkedin: parsedResume.contact?.linkedin || '',
        website: parsedResume.contact?.website || ''
      };

      return new Response(
        JSON.stringify({ 
          data: parsedResume,
          usage: usage ? {
            prompt_tokens: usage.prompt_tokens,
            completion_tokens: usage.completion_tokens,
            total_tokens: usage.total_tokens
          } : null
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      return new Response(
        JSON.stringify({ error: "Failed to parse resume" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (error) {
    console.error("Error in parse-resume function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
