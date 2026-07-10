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
  /** Kicker number e.g. "01". */
  number: string;
  title: string;
  /** Short subtitle. */
  sub: string;
}

/** The 4-step flow. */
export const STEPS: BuilderStep[] = [
  {
    id: "upload",
    number: "01",
    title: "Import",
    sub: "Upload, paste or start blank.",
  },
  {
    id: "edit",
    number: "02",
    title: "Edit",
    sub: "Fill in your details.",
  },
  {
    id: "template",
    number: "03",
    title: "Template",
    sub: "Choose a layout.",
  },
  {
    id: "preview",
    number: "04",
    title: "Export",
    sub: "Preview and download.",
  },
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
  { id: "modern1", title: "Modern Blue", category: "Modern", description: "Clean design with blue accents" },
  { id: "modern2", title: "Modern Minimal", category: "Modern", description: "Elegant two-column layout" },
  { id: "modern3", title: "Modern Gradient", category: "Modern", description: "Sleek gradient header design" },
  { id: "modern4", title: "Modern Tech", category: "Modern", description: "Tech-focused modern layout" },
  { id: "modern5", title: "Modern Split", category: "Modern", description: "Clean split-column design" },
  { id: "modern6", title: "Modern Navy", category: "Modern", description: "Professional navy accent" },
  { id: "modern7", title: "Modern Emerald", category: "Modern", description: "Fresh emerald styling" },
  { id: "professional", title: "Professional Classic", category: "Professional", description: "Timeless traditional design" },
  { id: "professional2", title: "Professional Executive", category: "Professional", description: "Executive-level formatting" },
  { id: "professional3", title: "Professional Corporate", category: "Professional", description: "Corporate standard layout" },
  { id: "professional4", title: "Professional Banking", category: "Professional", description: "Finance industry standard" },
  { id: "professional5", title: "Professional Legal", category: "Professional", description: "Law firm approved style" },
  { id: "professional6", title: "Professional Consulting", category: "Professional", description: "Consulting firm format" },
  { id: "creative1", title: "Creative Bold", category: "Creative", description: "Bold gradients with flair" },
  { id: "creative2", title: "Creative Dark", category: "Creative", description: "Dark theme with orange" },
  { id: "creative3", title: "Creative Sunset", category: "Creative", description: "Warm sunset gradients" },
  { id: "creative4", title: "Creative Retro", category: "Creative", description: "Retro vintage styling" },
  { id: "creative5", title: "Creative Neon", category: "Creative", description: "Neon glow effects" },
  { id: "creative6", title: "Creative Nature", category: "Creative", description: "Nature-inspired design" },
  { id: "creative7", title: "Creative Geometric", category: "Creative", description: "Geometric patterns" },
  { id: "minimal1", title: "Minimal Clean", category: "Minimal", description: "Ultra-clean simplicity" },
  { id: "minimal2", title: "Minimal Centered", category: "Minimal", description: "Centered elegant layout" },
  { id: "minimal3", title: "Minimal Sidebar", category: "Minimal", description: "Minimal with sidebar" },
  { id: "minimal4", title: "Minimal Classic", category: "Minimal", description: "Classic minimal style" },
  { id: "minimal5", title: "Minimal Swiss", category: "Minimal", description: "Swiss design inspired" },
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
