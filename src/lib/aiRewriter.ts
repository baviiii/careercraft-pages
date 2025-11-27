export async function rewriteBullet(
  originalText: string,
  jobDescription: string
): Promise<string> {
  try {
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/rewrite-resume`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          text: originalText,
          jobDescription,
          type: "bullet",
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to rewrite text");
    }

    const data = await response.json();
    return data.rewrittenText;
  } catch (error) {
    console.error("AI Rewrite Error:", error);
    throw error;
  }
}

export async function autoFixFormatting(resumeText: string): Promise<string> {
  try {
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/rewrite-resume`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          text: resumeText,
          jobDescription: "N/A",
          type: "format",
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to fix formatting");
    }

    const data = await response.json();
    return data.rewrittenText;
  } catch (error) {
    console.error("Auto-fix Error:", error);
    throw error;
  }
}

export async function getRecruiterReview(
  resumeText: string,
  jobDescription: string,
  reviewMode: "harsh" | "soft" | "tech" | "junior" | "australian"
): Promise<string> {
  try {
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/rewrite-resume`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          text: resumeText,
          jobDescription,
          type: "review",
          reviewMode,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to get review");
    }

    const data = await response.json();
    return data.rewrittenText;
  } catch (error) {
    console.error("Recruiter Review Error:", error);
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
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/rewrite-resume`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          text: resumeText,
          jobDescription,
          type: "cover-letter",
          tone,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to generate cover letter");
    }

    const data = await response.json();
    return data.rewrittenText;
  } catch (error) {
    console.error("Cover Letter Generation Error:", error);
    throw error;
  }
}
