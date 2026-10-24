/* ───────────────────────────────────────────────────────────
   Resume-Builder — shared types, steps, categories, tag presets.
   Pure data — no React here.
   ─────────────────────────────────────────────────────────── */

export interface ContactInfo {
  name: string;
  email: string;
  phone: string;
  location: string;
  linkedin?: string;
  website?: string;
}

export interface Experience {
  id: string;
  title: string;
  company: string;
  location: string;
  startDate: string;
  endDate: string;
  current: boolean;
  bullets: string[];
}

export interface Education {
  id: string;
  degree: string;
  school: string;
  location: string;
  graduationDate: string;
  gpa?: string;
}

export interface Certification {
  id: string;
  name: string;
  issuer?: string;
  date?: string;
  expiryDate?: string;
}

export interface Reference {
  id: string;
  name: string;
  title?: string;
  company?: string;
  phone?: string;
  email?: string;
  relationship?: string;
}

export interface Language {
  id: string;
  language: string;
  proficiency: string;
}

export interface Award {
  id: string;
  title: string;
  issuer?: string;
  date?: string;
  description?: string;
}

export interface Volunteer {
  id: string;
  role: string;
  organization: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  current?: boolean;
  description?: string;
}

export interface Publication {
  id: string;
  title: string;
  publisher?: string;
  date?: string;
  url?: string;
  description?: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  technologies: string[];
}

export interface ResumeData {
  contact: ContactInfo;
  summary: string;
  experience: Experience[];
  education: Education[];
  skills: string[];
  // Optional sections
  projects?: Project[];
  certifications?: Certification[];
  references?: Reference[];
  languages?: Language[];
  awards?: Award[];
  volunteer?: Volunteer[];
  publications?: Publication[];
}

export type TemplateId =
  | "modern1"
  | "modern2"
  | "modern3"
  | "modern4"
  | "modern5"
  | "modern6"
  | "modern7"
  | "professional"
  | "professional2"
  | "professional3"
  | "professional4"
  | "professional5"
  | "professional6"
  | "creative1"
  | "creative2"
  | "creative3"
  | "creative4"
  | "creative5"
  | "creative6"
  | "creative7"
  | "minimal1"
  | "minimal2"
  | "minimal3"
  | "minimal4"
  | "minimal5";

export type AutoSaveStatus = "saved" | "saving" | "unsaved";
export type UploadedFileType = "pdf" | "docx" | "image" | "txt" | null;

export interface BuilderStep {
  id: "upload" | "edit" | "template" | "preview";
  /** Step number, e.g. "1". */
  number: string;
  title: string;
  /** Short subtitle. */
  sub: string;
}

/** The 4-step flow. */
export const STEPS: BuilderStep[] = [
  { id: "upload", number: "1", title: "Start", sub: "Upload, paste or start blank." },
  { id: "edit", number: "2", title: "Edit", sub: "Your details, section by section." },
  { id: "template", number: "3", title: "Design", sub: "Pick how it looks." },
  { id: "preview", number: "4", title: "Download", sub: "Check it and get the PDF." },
];

export interface BuilderCategory {
  id: string;
  label: string;
}

export const CATEGORIES: BuilderCategory[] = [
  { id: "general", label: "General" },
  { id: "tech", label: "Tech / IT" },
  { id: "business", label: "Business" },
  { id: "creative", label: "Creative" },
  { id: "academic", label: "Academic" },
];

export const PRESET_TAGS = [
  "Full-time",
  "Part-time",
  "Remote",
  "Hybrid",
  "Contract",
  "Entry-level",
  "Mid-level",
  "Senior",
  "Executive",
  "Updated",
  "Draft",
  "Final",
  "Submitted",
];

/** Decorative metadata for template cards — pairs with `TEMPLATE_MAP` in @/lib/templateMap. */
export interface TemplateMeta {
  id: TemplateId;
  title: string;
  category: "Modern" | "Professional" | "Creative" | "Minimal";
  description: string;
}

export const TEMPLATE_META: TemplateMeta[] = [
  { id: "modern1", title: "Modern Blue", category: "Modern", description: "One column, blue headings and skill tags." },
  { id: "modern2", title: "Modern Minimal", category: "Modern", description: "Two columns, skills and education on the left." },
  { id: "modern3", title: "Modern Gradient", category: "Modern", description: "A teal band across the top, one column." },
  { id: "modern4", title: "Modern Tech", category: "Modern", description: "Purple accents, summary in a shaded box." },
  { id: "modern5", title: "Modern Split", category: "Modern", description: "A green sidebar holds contact details and skills." },
  { id: "modern6", title: "Modern Navy", category: "Modern", description: "Centred, with coloured section headings." },
  { id: "modern7", title: "Modern Emerald", category: "Modern", description: "Each section in its own rounded box." },
  { id: "professional", title: "Professional Classic", category: "Professional", description: "Traditional: serif name, ruled headings." },
  { id: "professional2", title: "Professional Executive", category: "Professional", description: "Plain and traditional, nothing extra." },
  { id: "professional3", title: "Professional Corporate", category: "Professional", description: "A dark band for your name, skills beside education." },
  { id: "professional4", title: "Professional Banking", category: "Professional", description: "Centred serif name, one plain column." },
  { id: "professional5", title: "Professional Legal", category: "Professional", description: "A dark rule down the left, small section markers." },
  { id: "professional6", title: "Professional Consulting", category: "Professional", description: "Initials badge and numbered jobs." },
  { id: "creative1", title: "Creative Bold", category: "Creative", description: "Purple, with skill bars in a side panel." },
  { id: "creative2", title: "Creative Dark", category: "Creative", description: "Black page, orange accents, a job timeline." },
  { id: "creative3", title: "Creative Sunset", category: "Creative", description: "Soft lavender cards with small icons." },
  { id: "creative4", title: "Creative Retro", category: "Creative", description: "Warm cream page with amber boxes." },
  { id: "creative5", title: "Creative Neon", category: "Creative", description: "Deep blue page with light text." },
  { id: "creative6", title: "Creative Nature", category: "Creative", description: "A green sidebar with initials and skill bars." },
  { id: "creative7", title: "Creative Geometric", category: "Creative", description: "Pink-to-yellow header, warm tinted boxes." },
  { id: "minimal1", title: "Minimal Clean", category: "Minimal", description: "Light type and plenty of white space." },
  { id: "minimal2", title: "Minimal Centered", category: "Minimal", description: "Centred, with sections in light boxes." },
  { id: "minimal3", title: "Minimal Sidebar", category: "Minimal", description: "A narrow grey sidebar, light type." },
  { id: "minimal4", title: "Minimal Classic", category: "Minimal", description: "Compact single column, very little decoration." },
  { id: "minimal5", title: "Minimal Swiss", category: "Minimal", description: "Section names sit in a narrow left column." },
];

export function getTemplateMeta(id: TemplateId | string): TemplateMeta | undefined {
  return TEMPLATE_META.find((t) => t.id === id);
}

export type SavedResumeRow = {
  id: string;
  name: string;
  content: any;
  created_at: string;
};

/**
 * Why a guest is being sent to signup.
 *
 * Each of these is a capability that genuinely cannot work without a session,
 * not a marketing gate: the AI endpoints verify a JWT and meter a per-user
 * quota, and saving and exporting need somewhere to write. Keeping them in
 * one union means the builder has exactly one route to signup, and each
 * reason gets copy naming what the account actually unlocks.
 *
 * Lives here rather than in useResumeBuilder so the import hook and the step
 * components can reference it without importing the hook that owns them.
 */
export type AccountGateReason =
  | "export"
  | "ai-read-file"
  | "ai-smart-import"
  | "ai-rewrite"
  /** Guest picked ATS from the preview “also with this draft” list. */
  | "continue-ats"
  /** Guest picked browse jobs. */
  | "continue-jobs"
  /** Guest picked market news. */
  | "continue-news"
  /** Guest picked career chat. */
  | "continue-chat";

/** Paths a guest return may legally point at after signup. */
export const GUEST_RETURN_ALLOWLIST = [
  "/builder",
  "/analysis",
  "/au-jobs",
  "/job-market-news",
  "/career-coach",
  // The browser extension's /save-job hands off here after sign-in.
  "/tracker",
  // The public tool pages send new sign-ups back to the tool they picked.
  "/rewrite",
  "/cover-letter",
  "/interview-prep",
] as const;

export type GuestReturnPath = (typeof GUEST_RETURN_ALLOWLIST)[number];

/** Where each continue-* gate lands after claim. */
export const CONTINUE_RETURN_PATH: Record<
  Extract<
    AccountGateReason,
    "continue-ats" | "continue-jobs" | "continue-news" | "continue-chat"
  >,
  GuestReturnPath
> = {
  "continue-ats": "/analysis",
  "continue-jobs": "/au-jobs",
  "continue-news": "/job-market-news",
  "continue-chat": "/career-coach",
};
