// Shared types for resume templates

export interface TemplateContact {
  name: string;
  email: string;
  phone: string;
  location: string;
  linkedin?: string;
  website?: string;
}

export interface TemplateExperience {
  id: string;
  title: string;
  company: string;
  location: string;
  startDate: string;
  endDate: string;
  current: boolean;
  bullets: string[];
}

export interface TemplateEducation {
  id: string;
  degree: string;
  school: string;
  location: string;
  graduationDate: string;
  gpa?: string;
}

export interface TemplateCertification {
  id: string;
  name: string;
  issuer?: string;
  date?: string;
  expiryDate?: string;
}

export interface TemplateReference {
  id: string;
  name: string;
  title?: string;
  company?: string;
  phone?: string;
  email?: string;
  relationship?: string;
}

export interface TemplateLanguage {
  id: string;
  language: string;
  proficiency: string; // e.g., "Native", "Fluent", "Professional", "Limited"
}

export interface TemplateAward {
  id: string;
  title: string;
  issuer?: string;
  date?: string;
  description?: string;
}

export interface TemplateVolunteer {
  id: string;
  role: string;
  organization: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  current?: boolean;
  description?: string;
}

export interface TemplatePublication {
  id: string;
  title: string;
  publisher?: string;
  date?: string;
  url?: string;
  description?: string;
}

export interface TemplateData {
  contact: TemplateContact;
  summary: string;
  experience: TemplateExperience[];
  education: TemplateEducation[];
  skills: string[];
  // Optional sections
  certifications?: TemplateCertification[];
  references?: TemplateReference[];
  languages?: TemplateLanguage[];
  awards?: TemplateAward[];
  volunteer?: TemplateVolunteer[];
  publications?: TemplatePublication[];
  // Keep projects for backward compatibility
  projects?: {
    id: string;
    name: string;
    description: string;
    technologies: string[];
  }[];
}

export interface TemplateProps {
  data?: TemplateData;
  isPreview?: boolean;
}

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

// Default placeholder data for previews
export const defaultTemplateData: TemplateData = {
  contact: {
    name: "John Doe",
    email: "john@example.com",
    phone: "(555) 123-4567",
    location: "New York, NY",
    linkedin: "linkedin.com/in/johndoe",
  },
  summary: "Results-driven professional with 5+ years of experience in technology and innovation. Proven track record of delivering high-impact solutions and leading cross-functional teams.",
  experience: [
    {
      id: "1",
      title: "Senior Software Engineer",
      company: "Tech Company Inc.",
      location: "New York, NY",
      startDate: "Jan 2021",
      endDate: "Present",
      current: true,
      bullets: [
        "Led development of microservices architecture serving 1M+ users",
        "Improved system performance by 40% through optimization",
        "Mentored team of 5 junior developers",
      ],
    },
    {
      id: "2",
      title: "Software Engineer",
      company: "Startup Co.",
      location: "San Francisco, CA",
      startDate: "Jun 2018",
      endDate: "Dec 2020",
      current: false,
      bullets: [
        "Built RESTful APIs using Node.js and Express",
        "Implemented CI/CD pipelines reducing deployment time by 60%",
      ],
    },
  ],
  education: [
    {
      id: "1",
      degree: "Bachelor of Science in Computer Science",
      school: "University Name",
      location: "Boston, MA",
      graduationDate: "2018",
      gpa: "3.8",
    },
  ],
  skills: ["JavaScript", "TypeScript", "React", "Node.js", "Python", "AWS", "Docker", "PostgreSQL"],
};
