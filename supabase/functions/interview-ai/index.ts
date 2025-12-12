import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, field, seniority, jobDescription, question, answer, questions, answers } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    let systemPrompt = "";
    let userPrompt = "";

    if (action === "generate_questions") {
      systemPrompt = `You are an expert interview coach and hiring manager. Generate interview questions based on the candidate's field, seniority, and job description.

Your task:
1. Parse the job description to identify required hard skills, soft skills, frameworks, and seniority level
2. Generate 5-7 relevant interview questions mixing technical, behavioral, and situational questions
3. Include questions testing STAR method competency for behavioral questions

Return a JSON object with this structure:
{
  "analysis": {
    "hardSkills": ["skill1", "skill2"],
    "softSkills": ["skill1", "skill2"],
    "frameworks": ["framework1"],
    "seniorityLevel": "string"
  },
  "questions": [
    {
      "id": 1,
      "question": "question text",
      "type": "technical|behavioral|situational|system_design",
      "difficulty": "easy|medium|hard",
      "expectedTopics": ["topic1", "topic2"]
    }
  ]
}`;

      userPrompt = `Field: ${field}
Seniority: ${seniority || "Mid-level"}
Job Description: ${jobDescription || "General interview for " + field}

Generate interview questions for this candidate.`;

    } else if (action === "evaluate_answer") {
      systemPrompt = `You are an expert interview coach providing detailed feedback on interview answers.

Evaluate the candidate's answer using:
- STAR method compliance (Situation, Task, Action, Result)
- Industry best practices
- Behavioral psychology principles
- Technical accuracy (if applicable)

Return a JSON object with this structure:
{
  "score": 7,
  "scoreBreakdown": {
    "relevance": 8,
    "clarity": 7,
    "depth": 6,
    "structure": 7
  },
  "validation": {
    "correct": ["what they got right"],
    "missing": ["critical points they missed"],
    "redFlags": ["problematic statements or approaches"]
  },
  "bestAnswer": "The ideal answer would be...",
  "faangAnswer": "For FAANG-level companies, an optimized answer would be...",
  "confidence": 75,
  "tips": ["Tip 1", "Tip 2"],
  "improvement": "Specific advice for improvement"
}`;

      userPrompt = `Question: ${question}
Candidate's Answer: ${answer}

Evaluate this interview response thoroughly.`;

    } else if (action === "final_evaluation") {
      systemPrompt = `You are an expert career coach providing a comprehensive interview performance evaluation.

Analyze the complete interview session and provide actionable feedback.

Return a JSON object with this structure:
{
  "overallScore": 75,
  "grade": "B+",
  "strengths": ["strength1", "strength2", "strength3"],
  "weaknesses": ["weakness1", "weakness2"],
  "mustFix": ["Critical issue 1 to fix before applying", "Critical issue 2"],
  "improvementPlan": [
    {"area": "Technical Skills", "action": "Practice X", "timeline": "2 weeks"},
    {"area": "Communication", "action": "Practice Y", "timeline": "1 week"}
  ],
  "readiness": "Ready|Almost Ready|Needs Work|Not Ready",
  "summary": "Overall assessment paragraph"
}`;

      const qaPairs = questions?.map((q: any, i: number) => 
        `Q${i + 1}: ${q.question}\nA${i + 1}: ${answers?.[i] || "No answer provided"}`
      ).join("\n\n");

      userPrompt = `Interview Session Summary:
Field: ${field}
Seniority: ${seniority}

Questions and Answers:
${qaPairs}

Provide a comprehensive final evaluation.`;
    }

    console.log(`Processing ${action} request for field: ${field}`);

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
          { role: "user", content: userPrompt }
        ],
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    let result;
    try {
      result = JSON.parse(content);
    } catch {
      result = { raw: content };
    }

    console.log(`Successfully processed ${action} request`);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Interview AI error:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
