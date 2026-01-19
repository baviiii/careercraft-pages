import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from '@/integrations/supabase/client';

// Helper function to safely parse error responses
async function parseErrorResponse(response: Response): Promise<{ error?: string }> {
  try {
    const text = await response.text();
    if (!text.trim()) {
      return { error: `Request failed with status ${response.status}` };
    }
    try {
      return JSON.parse(text);
    } catch {
      return { error: text || `Request failed with status ${response.status}` };
    }
  } catch {
    return { error: `Request failed with status ${response.status}` };
  }
}

export interface ATSAIAnalysis {
  overallScore: number;
  subScores: {
    skillsMatch: number;
    experienceMatch: number;
    keywordMatch: number;
    formatCompatibility: number;
  };
  jobRequirements: {
    mandatorySkills: string[];
    preferredSkills: string[];
    technicalKeywords: string[];
    softSkills: string[];
    requiredExperience: string;
    tools: string[];
    certifications: string[];
  };
  resumeKeywords: {
    matched: string[];
    missing: string[];
    underRepresented: string[];
    overused: string[];
  };
  writingQuality: {
    grammarScore: number;
    impactLanguageScore: number;
    metricsUsageScore: number;
    actionVerbsScore: number;
    clarityScore: number;
    structureScore: number;
  };
  redFlags: Array<{
    type: string;
    severity: "critical" | "warning" | "minor";
    description: string;
    location: string;
  }>;
  improvements: {
    quickFixes: Array<{
      issue: string;
      fix: string;
    }>;
    strongEnhancements: Array<{
      section: string;
      current: string;
      improved: string;
      impact: string;
    }>;
    advancedOptimizations: string[];
  };
  summary: {
    topStrengths: string[];
    topWeaknesses: string[];
    mostImportantFixes: string[];
    overallVerdict: string;
  };
}

export async function runATSAIAnalysis(
  resumeText: string,
  jobDescription: string
): Promise<ATSAIAnalysis> {
  const response = await fetch(
    `${SUPABASE_URL}/functions/v1/ats-analyze`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({
        resumeText,
        jobDescription,
        analysisType: "full-analysis",
      }),
    }
  );

  if (!response.ok) {
    const error = await parseErrorResponse(response);
    throw new Error(error.error || "Failed to analyze resume");
  }

  const data = await response.json();
  return data.analysis;
}

export async function autoRewriteResume(
  resumeText: string,
  jobDescription: string,
  analysisContext?: ATSAIAnalysis
): Promise<string> {
  const response = await fetch(
    `${SUPABASE_URL}/functions/v1/ats-analyze`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({
        resumeText,
        jobDescription,
        analysisType: "auto-rewrite",
        analysisContext: analysisContext ? JSON.stringify(analysisContext) : undefined,
      }),
    }
  );

  if (!response.ok) {
    const error = await parseErrorResponse(response);
    throw new Error(error.error || "Failed to rewrite resume");
  }

  const data = await response.json();
  return data.result;
}

export async function rewriteExperienceSection(
  resumeText: string,
  jobDescription: string,
  analysisContext?: ATSAIAnalysis
): Promise<string> {
  const response = await fetch(
    `${SUPABASE_URL}/functions/v1/ats-analyze`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({
        resumeText,
        jobDescription,
        analysisType: "rewrite-experience",
        analysisContext: analysisContext ? JSON.stringify(analysisContext) : undefined,
      }),
    }
  );

  if (!response.ok) {
    const error = await parseErrorResponse(response);
    throw new Error(error.error || "Failed to rewrite experience");
  }

  const data = await response.json();
  return data.result;
}

export async function generateAchievements(
  resumeText: string,
  jobDescription: string,
  analysisContext?: ATSAIAnalysis
): Promise<string> {
  const response = await fetch(
    `${SUPABASE_URL}/functions/v1/ats-analyze`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({
        resumeText,
        jobDescription,
        analysisType: "generate-achievements",
        analysisContext: analysisContext ? JSON.stringify(analysisContext) : undefined,
      }),
    }
  );

  if (!response.ok) {
    const error = await parseErrorResponse(response);
    throw new Error(error.error || "Failed to generate achievements");
  }

  const data = await response.json();
  return data.result;
}

export async function generateSummaries(
  resumeText: string,
  jobDescription: string,
  analysisContext?: ATSAIAnalysis
): Promise<string> {
  const response = await fetch(
    `${SUPABASE_URL}/functions/v1/ats-analyze`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({
        resumeText,
        jobDescription,
        analysisType: "generate-summaries",
        analysisContext: analysisContext ? JSON.stringify(analysisContext) : undefined,
      }),
    }
  );

  if (!response.ok) {
    const error = await parseErrorResponse(response);
    throw new Error(error.error || "Failed to generate summaries");
  }

  const data = await response.json();
  return data.result;
}

// Enhanced rewrite that returns structured data for builder resumes
export async function rewriteResumeStructured(
  resumeData: any,
  jobDescription: string,
  analysisContext?: ATSAIAnalysis
): Promise<any> {
  const response = await fetch(
    `${SUPABASE_URL}/functions/v1/ats-analyze`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({
        resumeData: JSON.stringify(resumeData),
        jobDescription,
        analysisType: "rewrite-structured",
        analysisContext: analysisContext ? JSON.stringify(analysisContext) : undefined,
      }),
    }
  );

  if (!response.ok) {
    const error = await parseErrorResponse(response);
    throw new Error(error.error || "Failed to rewrite resume");
  }

  const data = await response.json();
  return data.result;
}
