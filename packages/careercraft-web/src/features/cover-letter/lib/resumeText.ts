import { formatResumeDataAsText, type AIResumeData } from "@/lib/resumeParser";

/* resumes.content is builder JSON for most rows, a JSON string for some, and
   plain text for old pasted ones. Same reading as the ATS page
   (useAnalysis), and the same serialiser, so certifications and projects
   reach the letter too. */
export function resumeContentToText(content: unknown): string {
  let data = content;
  if (typeof data === "string") {
    try {
      data = JSON.parse(data);
    } catch {
      return data as string;
    }
  }
  if (data && typeof data === "object" && "contact" in data) {
    return formatResumeDataAsText(data as AIResumeData);
  }
  return typeof data === "string" ? data : JSON.stringify(data ?? "");
}
