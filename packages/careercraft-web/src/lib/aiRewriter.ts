import {
  supabase,
  SUPABASE_URL,
} from '@/integrations/supabase/client';

async function getAuthenticatedHeaders(): Promise<Record<string, string>> {
  const { data, error } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (error || !token) {
    throw new Error('Please sign in to use AI rewriting.');
  }
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

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

export async function rewriteBullet(
  originalText: string,
  jobDescription: string
): Promise<string> {
  try {
    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/rewrite-resume`,
      {
        method: "POST",
        headers: await getAuthenticatedHeaders(),
        body: JSON.stringify({
          text: originalText,
          jobDescription,
          type: "bullet",
        }),
      }
    );

    if (!response.ok) {
      const error = await parseErrorResponse(response);
      throw new Error(error.error || "Failed to rewrite text");
    }

    const data = await response.json();
    return data.rewrittenText;
  } catch (error) {
    console.error("AI Rewrite Error:", error);
    throw error;
  }
}

export async function generateCoverLetter(
  resumeText: string,
  jobDescription: string,
  tone: "professional" | "confident" | "casual"
): Promise<string> {
  try {
    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/rewrite-resume`,
      {
        method: "POST",
        headers: await getAuthenticatedHeaders(),
        body: JSON.stringify({
          text: resumeText,
          jobDescription,
          type: "cover-letter",
          tone,
        }),
      }
    );

    if (!response.ok) {
      const error = await parseErrorResponse(response);
      throw new Error(error.error || "Failed to generate cover letter");
    }

    const data = await response.json();
    return data.rewrittenText;
  } catch (error) {
    console.error("Cover Letter Generation Error:", error);
    throw error;
  }
}
