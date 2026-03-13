export type CareerAgentUseCase =
  | "ats_reviewer"
  | "storyteller"
  | "gap_analyst"
  | "local_sa_coach";

export interface CareerAgentDefinition {
  id: string;
  name: string;
  emoji?: string;
  shortTagline: string;
  systemPrompt: string;
  behaviorRules: {
    do: string[];
    dont: string[];
  };
  toneStyle: "direct" | "supportive" | "coach" | "analyst";
  defaultTools: Array<"career_rag" | "policy_rag" | "ats_scorer">;
  careerUseCase: CareerAgentUseCase;
  linkedCollections: string[];
  createdByUserId?: string;
  isTemplate: boolean;
}

export interface CareerCollection {
  id: string;
  name: string;
  description?: string;
  type: "resumes" | "job_descriptions" | "career_notes" | "portfolio_docs";
  documentCount: number;
  createdAt: string;
  updatedAt: string;
}

