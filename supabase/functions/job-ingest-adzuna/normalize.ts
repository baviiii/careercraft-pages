export function stripHtml(text: string): string {
  return text.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

export function normalizeJobType(contractTime: string | null | undefined): string | null {
  if (contractTime === "full_time") return "full-time";
  if (contractTime === "part_time") return "part-time";
  return contractTime || null;
}

export function detectRemote(title: string | null | undefined, description: string | null | undefined): boolean {
  const haystack = `${title || ""} ${description || ""}`.toLowerCase();
  return haystack.includes("remote") || haystack.includes("work from home");
}
