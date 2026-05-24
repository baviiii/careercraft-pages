export type EventType =
  | "interview"
  | "offer"
  | "rejection"
  | "follow_up"
  | "status_changed"
  | "note";

export function classifyEmail(content: string): {
  eventType: EventType;
  confidence: number;
  summary: string;
} {
  const text = content.toLowerCase();
  if (/\b(interview|next stage|screening call|panel interview)\b/.test(text)) {
    return {
      eventType: "interview",
      confidence: 88,
      summary: "Recruiter email indicates interview progression.",
    };
  }
  if (/\b(offer|we are pleased to offer|compensation package)\b/.test(text)) {
    return {
      eventType: "offer",
      confidence: 92,
      summary: "Recruiter email indicates an offer.",
    };
  }
  if (/\b(unfortunately|not moving forward|regret to inform|rejected)\b/.test(text)) {
    return {
      eventType: "rejection",
      confidence: 90,
      summary: "Recruiter email indicates rejection.",
    };
  }
  if (/\b(follow up|follow-up|checking in|any updates?)\b/.test(text)) {
    return {
      eventType: "follow_up",
      confidence: 74,
      summary: "Likely follow-up communication detected.",
    };
  }
  return {
    eventType: "note",
    confidence: 55,
    summary: "General recruiter communication captured as note.",
  };
}

export function statusFromEvent(
  eventType: EventType,
): "applied" | "interview" | "offer" | "rejected" | null {
  if (eventType === "interview") return "interview";
  if (eventType === "offer") return "offer";
  if (eventType === "rejection") return "rejected";
  return null;
}
