import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import {
  Upload,
  FileText,
  File,
  User,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  GraduationCap,
  Wrench,
  Plus,
  Trash2,
  Download,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  Check,
  X,
  Sparkles,
  Layout,
  Save,
  Loader2,
  ChevronDown,
  ChevronUp,
  Link as LinkIcon,
  Award,
  FolderOpen,
  ClipboardPaste,
  Tag,
  Building,
  Code,
  Palette,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { parseResumeWithAI, parseResumeStructured, AIResumeData } from "@/lib/resumeParser";
import { rewriteBullet } from "@/lib/aiRewriter";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ModernTemplate1 } from "@/components/templates/ModernTemplate1";
import { ModernTemplate2 } from "@/components/templates/ModernTemplate2";
import { ModernTemplate3 } from "@/components/templates/ModernTemplate3";
import { ModernTemplate4 } from "@/components/templates/ModernTemplate4";
import { ModernTemplate5 } from "@/components/templates/ModernTemplate5";
import { ModernTemplate6 } from "@/components/templates/ModernTemplate6";
import { ModernTemplate7 } from "@/components/templates/ModernTemplate7";
import { ProfessionalTemplate } from "@/components/templates/ProfessionalTemplate";
import { ProfessionalTemplate2 } from "@/components/templates/ProfessionalTemplate2";
import { ProfessionalTemplate3 } from "@/components/templates/ProfessionalTemplate3";
import { ProfessionalTemplate4 } from "@/components/templates/ProfessionalTemplate4";
import { ProfessionalTemplate5 } from "@/components/templates/ProfessionalTemplate5";
import { ProfessionalTemplate6 } from "@/components/templates/ProfessionalTemplate6";
import { CreativeTemplate1 } from "@/components/templates/CreativeTemplate1";
import { CreativeTemplate2 } from "@/components/templates/CreativeTemplate2";
import { CreativeTemplate3 } from "@/components/templates/CreativeTemplate3";
import { CreativeTemplate4 } from "@/components/templates/CreativeTemplate4";
import { CreativeTemplate5 } from "@/components/templates/CreativeTemplate5";
import { CreativeTemplate6 } from "@/components/templates/CreativeTemplate6";
import { CreativeTemplate7 } from "@/components/templates/CreativeTemplate7";
import { MinimalTemplate1 } from "@/components/templates/MinimalTemplate1";
import { MinimalTemplate2 } from "@/components/templates/MinimalTemplate2";
import { MinimalTemplate3 } from "@/components/templates/MinimalTemplate3";
import { MinimalTemplate4 } from "@/components/templates/MinimalTemplate4";
import { MinimalTemplate5 } from "@/components/templates/MinimalTemplate5";
import { TemplateData } from "@/components/templates/types";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

// Types
interface ContactInfo {
  name: string;
  email: string;
  phone: string;
  location: string;
  linkedin?: string;
  website?: string;
}

interface Experience {
  id: string;
  title: string;
  company: string;
  location: string;
  startDate: string;
  endDate: string;
  current: boolean;
  bullets: string[];
}

interface Education {
  id: string;
  degree: string;
  school: string;
  location: string;
  graduationDate: string;
  gpa?: string;
}

interface ResumeData {
  contact: ContactInfo;
  summary: string;
  experience: Experience[];
  education: Education[];
  skills: string[];
  projects?: { id: string; name: string; description: string; technologies: string[] }[];
}

type TemplateId = "modern1" | "modern2" | "modern3" | "modern4" | "modern5" | "modern6" | "modern7" | "professional" | "professional2" | "professional3" | "professional4" | "professional5" | "professional6" | "creative1" | "creative2" | "creative3" | "creative4" | "creative5" | "creative6" | "creative7" | "minimal1" | "minimal2" | "minimal3" | "minimal4" | "minimal5";

interface Template {
  id: TemplateId;
  title: string;
  category: string;
  color: string;
  description: string;
  component: React.ComponentType<{ data?: TemplateData; isPreview?: boolean }>;
}

const TEMPLATES: Template[] = [
  // Modern Templates
  { id: "modern1", title: "Modern Blue", category: "Modern", color: "from-blue-500 to-cyan-500", description: "Clean design with blue accents", component: ModernTemplate1 },
  { id: "modern2", title: "Modern Minimal", category: "Modern", color: "from-slate-500 to-slate-700", description: "Elegant two-column layout", component: ModernTemplate2 },
  { id: "modern3", title: "Modern Gradient", category: "Modern", color: "from-indigo-500 to-purple-600", description: "Sleek gradient header design", component: ModernTemplate3 },
  { id: "modern4", title: "Modern Tech", category: "Modern", color: "from-cyan-500 to-blue-600", description: "Tech-focused modern layout", component: ModernTemplate4 },
  { id: "modern5", title: "Modern Split", category: "Modern", color: "from-teal-500 to-emerald-600", description: "Clean split-column design", component: ModernTemplate5 },
  { id: "modern6", title: "Modern Navy", category: "Modern", color: "from-blue-700 to-slate-800", description: "Professional navy accent", component: ModernTemplate6 },
  { id: "modern7", title: "Modern Emerald", category: "Modern", color: "from-emerald-500 to-teal-600", description: "Fresh emerald styling", component: ModernTemplate7 },
  // Professional Templates
  { id: "professional", title: "Professional Classic", category: "Professional", color: "from-gray-700 to-gray-900", description: "Timeless traditional design", component: ProfessionalTemplate },
  { id: "professional2", title: "Professional Executive", category: "Professional", color: "from-slate-700 to-gray-800", description: "Executive-level formatting", component: ProfessionalTemplate2 },
  { id: "professional3", title: "Professional Corporate", category: "Professional", color: "from-zinc-600 to-slate-700", description: "Corporate standard layout", component: ProfessionalTemplate3 },
  { id: "professional4", title: "Professional Banking", category: "Professional", color: "from-blue-800 to-slate-800", description: "Finance industry standard", component: ProfessionalTemplate4 },
  { id: "professional5", title: "Professional Legal", category: "Professional", color: "from-stone-600 to-zinc-700", description: "Law firm approved style", component: ProfessionalTemplate5 },
  { id: "professional6", title: "Professional Consulting", category: "Professional", color: "from-gray-600 to-slate-700", description: "Consulting firm format", component: ProfessionalTemplate6 },
  // Creative Templates
  { id: "creative1", title: "Creative Bold", category: "Creative", color: "from-purple-500 to-pink-500", description: "Bold gradients with flair", component: CreativeTemplate1 },
  { id: "creative2", title: "Creative Dark", category: "Creative", color: "from-orange-500 to-red-600", description: "Dark theme with orange", component: CreativeTemplate2 },
  { id: "creative3", title: "Creative Sunset", category: "Creative", color: "from-rose-500 to-orange-500", description: "Warm sunset gradients", component: CreativeTemplate3 },
  { id: "creative4", title: "Creative Retro", category: "Creative", color: "from-amber-500 to-red-600", description: "Retro vintage styling", component: CreativeTemplate4 },
  { id: "creative5", title: "Creative Neon", category: "Creative", color: "from-violet-500 to-fuchsia-500", description: "Neon glow effects", component: CreativeTemplate5 },
  { id: "creative6", title: "Creative Nature", category: "Creative", color: "from-green-500 to-emerald-600", description: "Nature-inspired design", component: CreativeTemplate6 },
  { id: "creative7", title: "Creative Geometric", category: "Creative", color: "from-cyan-500 to-blue-600", description: "Geometric patterns", component: CreativeTemplate7 },
  // Minimal Templates
  { id: "minimal1", title: "Minimal Clean", category: "Minimal", color: "from-gray-400 to-gray-500", description: "Ultra-clean simplicity", component: MinimalTemplate1 },
  { id: "minimal2", title: "Minimal Centered", category: "Minimal", color: "from-slate-400 to-gray-500", description: "Centered elegant layout", component: MinimalTemplate2 },
  { id: "minimal3", title: "Minimal Sidebar", category: "Minimal", color: "from-zinc-400 to-slate-500", description: "Minimal with sidebar", component: MinimalTemplate3 },
  { id: "minimal4", title: "Minimal Classic", category: "Minimal", color: "from-stone-400 to-gray-500", description: "Classic minimal style", component: MinimalTemplate4 },
  { id: "minimal5", title: "Minimal Swiss", category: "Minimal", color: "from-neutral-400 to-slate-500", description: "Swiss design inspired", component: MinimalTemplate5 },
];

const STEPS = [
  { id: "upload", title: "Upload", icon: Upload },
  { id: "edit", title: "Edit Content", icon: FileText },
  { id: "template", title: "Choose Template", icon: Layout },
  { id: "preview", title: "Preview & Export", icon: Download },
];

const CATEGORIES = [
  { id: "general", label: "General", icon: FileText, color: "bg-gray-500" },
  { id: "tech", label: "Tech/IT", icon: Code, color: "bg-blue-500" },
  { id: "business", label: "Business", icon: Building, color: "bg-green-500" },
  { id: "creative", label: "Creative", icon: Palette, color: "bg-purple-500" },
  { id: "academic", label: "Academic", icon: GraduationCap, color: "bg-orange-500" },
];

const PRESET_TAGS = [
  "Full-time", "Part-time", "Remote", "Hybrid", "Contract",
  "Entry-level", "Mid-level", "Senior", "Executive",
  "Updated", "Draft", "Final", "Submitted"
];

// Helper to create empty resume data
const createEmptyResumeData = (): ResumeData => ({
  contact: { name: "", email: "", phone: "", location: "", linkedin: "", website: "" },
  summary: "",
  experience: [],
  education: [],
  skills: [],
});

// Convert AI parsed data to ResumeData
const aiDataToResumeData = (aiData: AIResumeData): ResumeData => {
  return {
    contact: {
      name: aiData.contact.name || "",
      email: aiData.contact.email || "",
      phone: aiData.contact.phone || "",
      location: aiData.contact.location || "",
      linkedin: aiData.contact.linkedin || "",
      website: aiData.contact.website || "",
    },
    summary: aiData.summary || "",
    experience: aiData.experience.map(exp => ({
      id: exp.id,
      title: exp.title || "",
      company: exp.company || "",
      location: exp.location || "",
      startDate: exp.startDate || "",
      endDate: exp.endDate || "",
      current: exp.current || false,
      bullets: exp.bullets || [""],
    })),
    education: aiData.education.map(edu => ({
      id: edu.id,
      degree: edu.degree || "",
      school: edu.school || "",
      location: edu.location || "",
      graduationDate: edu.graduationDate || "",
      gpa: edu.gpa || "",
    })),
    skills: aiData.skills || [],
    projects: aiData.projects?.map(proj => ({
      id: proj.id,
      name: proj.name || "",
      description: proj.description || "",
      technologies: proj.technologies || [],
    })),
  };
};

// Parse raw text content into ResumeData
const parseTextToResumeData = (text: string): ResumeData => {
  const data = createEmptyResumeData();
  const lines = text.split('\n').map(l => l.trim());
  const nonEmptyLines = lines.filter(Boolean);
  
  // Extract contact info
  const emailMatch = text.match(/[\w.-]+@[\w.-]+\.\w+/);
  const phoneMatch = text.match(/(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
  const linkedinMatch = text.match(/(linkedin\.com\/in\/[\w-]+)/i);
  
  if (emailMatch) data.contact.email = emailMatch[0];
  if (phoneMatch) data.contact.phone = phoneMatch[0];
  if (linkedinMatch) data.contact.linkedin = linkedinMatch[0];
  
  // First line is often the name
  for (const line of nonEmptyLines.slice(0, 5)) {
    if (!line.includes('@') && !line.match(/^\d/) && line.length > 2 && line.length < 50 && !line.includes('|')) {
      data.contact.name = line;
      break;
    }
  }
  
  // Location pattern
  const locationMatch = text.match(/([A-Z][a-z]+,\s*[A-Z]{2})|([A-Z][a-z]+\s*,\s*[A-Z][a-z]+)/);
  if (locationMatch) data.contact.location = locationMatch[0];
  
  // Find sections by headers
  let currentSection = '';
  let sectionLines: { [key: string]: string[] } = {
    summary: [], experience: [], education: [], skills: []
  };
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lower = line.toLowerCase();
    
    // Detect section headers
    if (lower.match(/^(professional\s+)?summary|^objective|^profile/)) {
      currentSection = 'summary';
      continue;
    } else if (lower.match(/^(work\s+)?experience|^employment/)) {
      currentSection = 'experience';
      continue;
    } else if (lower.match(/^education/)) {
      currentSection = 'education';
      continue;
    } else if (lower.match(/^skills|^technical/)) {
      currentSection = 'skills';
      continue;
    }
    
    if (currentSection && sectionLines[currentSection] && line) {
      sectionLines[currentSection].push(line);
    }
  }
  
  // Parse summary
  data.summary = sectionLines.summary.join(' ').trim();
  
  // Parse skills
  const skillsText = sectionLines.skills.join(' ');
  data.skills = skillsText
    .split(/[,•|·\n]/)
    .map(s => s.trim())
    .filter(s => s.length > 1 && s.length < 50);
  
  // Parse experience - look for job patterns
  const expLines = sectionLines.experience;
  let currentJob: Experience | null = null;
  
  for (let i = 0; i < expLines.length; i++) {
    const line = expLines[i];
    
    // Check if this looks like a job title line (contains "at" or company pattern)
    const jobMatch = line.match(/^(.+?)\s+at\s+(.+)$/i) || line.match(/^(.+?)\s*[-–]\s*(.+)$/);
    const dateMatch = line.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|\d{4})\s*[-–]\s*(Present|\d{4}|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i);
    
    if (jobMatch && !line.startsWith('•') && !line.startsWith('-')) {
      // Save previous job
      if (currentJob) {
        data.experience.push(currentJob);
      }
      
      currentJob = {
        id: `exp-${Date.now()}-${data.experience.length}`,
        title: jobMatch[1].trim(),
        company: jobMatch[2].trim(),
        location: '',
        startDate: '',
        endDate: '',
        current: false,
        bullets: []
      };
    } else if (dateMatch && currentJob) {
      // This is a date line
      const parts = line.split(/[-–]/);
      currentJob.startDate = parts[0]?.trim() || '';
      currentJob.endDate = parts[1]?.trim() || 'Present';
      currentJob.current = currentJob.endDate.toLowerCase() === 'present';
    } else if ((line.startsWith('•') || line.startsWith('-') || line.startsWith('*')) && currentJob) {
      // This is a bullet point
      currentJob.bullets.push(line.replace(/^[•\-*]\s*/, '').trim());
    } else if (currentJob && line.length > 20 && !dateMatch) {
      // Could be a bullet without marker
      currentJob.bullets.push(line);
    }
  }
  
  // Don't forget the last job
  if (currentJob) {
    data.experience.push(currentJob);
  }
  
  // Parse education
  const eduLines = sectionLines.education;
  let currentEdu: Education | null = null;
  
  for (const line of eduLines) {
    const degreeMatch = line.match(/(Bachelor|Master|PhD|Associate|BS|BA|MS|MA|MBA|B\.S\.|B\.A\.|M\.S\.|M\.A\.)/i);
    const dateMatch = line.match(/(Graduated|Class of|Expected)?\s*:?\s*(\d{4}|May|June|Dec)/i);
    
    if (degreeMatch || (line.includes(' - ') && !line.startsWith('•'))) {
      if (currentEdu) {
        data.education.push(currentEdu);
      }
      
      const parts = line.split(/\s*[-–]\s*/);
      currentEdu = {
        id: `edu-${Date.now()}-${data.education.length}`,
        degree: parts[0]?.trim() || line,
        school: parts[1]?.trim() || '',
        location: '',
        graduationDate: '',
        gpa: ''
      };
    } else if (dateMatch && currentEdu) {
      currentEdu.graduationDate = dateMatch[2] || dateMatch[0];
    } else if (currentEdu && line.toLowerCase().includes('gpa')) {
      const gpaMatch = line.match(/(\d+\.?\d*)\s*\/?\s*(\d+\.?\d*)?/);
      if (gpaMatch) currentEdu.gpa = gpaMatch[0];
    }
  }
  
  if (currentEdu) {
    data.education.push(currentEdu);
  }
  
  // If no experience was parsed, create one empty entry so user can fill it
  if (data.experience.length === 0) {
    data.experience.push({
      id: `exp-${Date.now()}`,
      title: '',
      company: '',
      location: '',
      startDate: '',
      endDate: '',
      current: false,
      bullets: ['']
    });
  }
  
  // If no education was parsed, create one empty entry
  if (data.education.length === 0) {
    data.education.push({
      id: `edu-${Date.now()}`,
      degree: '',
      school: '',
      location: '',
      graduationDate: '',
      gpa: ''
    });
  }
  
  return data;
};

export default function ResumeBuilder() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const previewRef = useRef<HTMLDivElement>(null);
  
  // State
  const [currentStep, setCurrentStep] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedFileType, setUploadedFileType] = useState<"pdf" | "docx" | "image" | null>(null);
  const [resumeData, setResumeData] = useState<ResumeData>(createEmptyResumeData());
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateId>("modern1");
  const [showPreview, setShowPreview] = useState(true);
  const [activeSection, setActiveSection] = useState("contact");
  const [isExporting, setIsExporting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<"saved" | "saving" | "unsaved">("saved");
  const [resumeName, setResumeName] = useState<string>("");
  const [useAIParsing, setUseAIParsing] = useState(false); // Default OFF to save tokens
  const [showPasteDialog, setShowPasteDialog] = useState(false);
  const [pastedText, setPastedText] = useState("");
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveResumeName, setSaveResumeName] = useState("");
  const [saveCategory, setSaveCategory] = useState("general");
  const [saveTags, setSaveTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState("");
  const [currentResumeId, setCurrentResumeId] = useState<string | null>(null);
  
  // New features: Load saved resumes, job description, AI rewrite
  const [showLoadResumeDialog, setShowLoadResumeDialog] = useState(false);
  const [savedResumes, setSavedResumes] = useState<{id: string; name: string; content: any; created_at: string}[]>([]);
  const [isLoadingResumes, setIsLoadingResumes] = useState(false);
  const [jobDescription, setJobDescription] = useState("");
  const [showJobDescDialog, setShowJobDescDialog] = useState(false);
  const [rewritingBulletId, setRewritingBulletId] = useState<string | null>(null);
  const [showLivePreview, setShowLivePreview] = useState(false);

  // Check for data from Upload page or ATS Analysis on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const fromSource = urlParams.get('from');
    const templateParam = urlParams.get('template');
    
    // Check for Rewrite page data
    if (fromSource === 'rewrite') {
      const rewriteText = sessionStorage.getItem('rewriteOptimizedText');
      const rewriteJob = sessionStorage.getItem('rewriteJobDescription');
      const rewriteTemplate = sessionStorage.getItem('rewriteTemplate') || templateParam;
      
      console.log('📝 Loading from Rewrite:', { 
        hasText: !!rewriteText, 
        textLength: rewriteText?.length,
        template: rewriteTemplate 
      });
      
      if (rewriteText) {
        const parsed = parseTextToResumeData(rewriteText);
        console.log('📝 Parsed resume data:', {
          name: parsed.contact.name,
          email: parsed.contact.email,
          summary: parsed.summary?.substring(0, 50),
          experienceCount: parsed.experience.length,
          skillsCount: parsed.skills.length
        });
        
        setResumeData(parsed);
        setResumeName("Optimized Resume");
        if (rewriteJob) setJobDescription(rewriteJob);
        if (rewriteTemplate) setSelectedTemplate(rewriteTemplate as any);
        setCurrentStep(1); // Skip to edit step
        
        // Clean up
        sessionStorage.removeItem('rewriteOptimizedText');
        sessionStorage.removeItem('rewriteJobDescription');
        sessionStorage.removeItem('rewriteTemplate');
        
        toast({
          title: "✓ Optimized Resume Loaded",
          description: `${parsed.experience.length} jobs, ${parsed.skills.length} skills loaded. Edit and choose template!`,
        });
        return;
      }
    }
    
    // Check for ATS analysis data (also used by Rewrite page with AI parsing)
    if (fromSource === 'ats') {
      const atsData = sessionStorage.getItem('atsResumeData');
      const rewriteJob = sessionStorage.getItem('rewriteJobDescription');
      const rewriteTemplate = sessionStorage.getItem('rewriteTemplate') || templateParam;
      
      if (atsData) {
        try {
          const parsed = JSON.parse(atsData) as AIResumeData;
          const resumeData = aiDataToResumeData(parsed);
          setResumeData(resumeData);
          setResumeName(parsed.contact?.name || "Optimized Resume");
          
          // Set job description if coming from rewrite
          if (rewriteJob) setJobDescription(rewriteJob);
          
          // Set template if specified
          if (rewriteTemplate) setSelectedTemplate(rewriteTemplate as any);
          
          setCurrentStep(1); // Skip to edit step
          
          // Clean up
          sessionStorage.removeItem('atsResumeData');
          sessionStorage.removeItem('rewriteJobDescription');
          sessionStorage.removeItem('rewriteTemplate');
          
          toast({
            title: "✓ Resume Loaded",
            description: `${parsed.experience?.length || 0} jobs, ${parsed.skills?.length || 0} skills extracted. Edit and choose template!`,
          });
          return;
        } catch (e) {
          console.error('Error parsing ATS resume data:', e);
        }
      }
    }
    
    // Check for legacy upload data
    const storedData = sessionStorage.getItem('resumeBuilderData');
    if (storedData) {
      try {
        const { content, name, fromUpload } = JSON.parse(storedData);
        if (content && fromUpload) {
          const parsed = parseTextToResumeData(content);
          setResumeData(parsed);
          setResumeName(name || "");
          setCurrentStep(1); // Skip to edit step
          sessionStorage.removeItem('resumeBuilderData'); // Clean up
          
          toast({
            title: "✓ Resume Loaded",
            description: `Editing "${name}". Review and select a template.`,
          });
        }
      } catch (e) {
        console.error('Error parsing stored resume data:', e);
      }
    }
  }, [toast]);

  // Dropzone
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleFileDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'image/*': ['.png', '.jpg', '.jpeg', '.webp'],
      'text/plain': ['.txt'],
    },
    maxFiles: 1,
  });

  async function handleFileDrop(acceptedFiles: File[]) {
    const file = acceptedFiles[0];
    if (!file) return;

    setIsProcessing(true);
    setUploadProgress(0);

    try {
      // Determine file type
      let fileType: "pdf" | "docx" | "image" | "txt" = "pdf";
      if (file.type.includes("word") || file.name.endsWith(".docx") || file.name.endsWith(".doc")) {
        fileType = "docx";
      } else if (file.type.startsWith("image/")) {
        fileType = "image";
      } else if (file.type === "text/plain" || file.name.endsWith(".txt")) {
        fileType = "txt";
      }
      setUploadedFileType(fileType as any);

      // Handle plain text files directly
      if (fileType === "txt") {
        const textContent = await file.text();
        await handleTextContent(textContent);
        return;
      }

      // Parse the file - use AI or basic parsing based on toggle
      let data: ResumeData;
      
      if (useAIParsing) {
        // AI-powered parsing (uses tokens)
        const aiParsed = await parseResumeWithAI(file, (progress) => {
          setUploadProgress(progress);
        });
        data = aiDataToResumeData(aiParsed);
        
        toast({
          title: "✓ AI Parsing Complete",
          description: `Extracted ${data.experience.length} jobs, ${data.education.length} education entries, and ${data.skills.length} skills.`,
        });
      } else {
        // Basic parsing (no tokens used)
        const parsed = await parseResumeStructured(file, (progress) => {
          setUploadProgress(progress);
        });
        data = parseTextToResumeData(parsed.rawText);
        
        toast({
          title: "✓ Basic Parsing Complete",
          description: `Extracted text from ${file.name}. Enable AI parsing for better results.`,
        });
      }
      
      setResumeData(data);

      // Move to edit step
      setCurrentStep(1);
    } catch (error) {
      console.error("File processing error:", error);
      toast({
        title: "Processing failed",
        description: error instanceof Error ? error.message : "Could not process the file",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      setUploadProgress(0);
    }
  }

  // Handle text content (from .txt file or paste)
  async function handleTextContent(text: string) {
    setIsProcessing(true);
    setUploadProgress(20);
    
    try {
      let data: ResumeData;
      
      if (useAIParsing) {
        // Create a fake file to use AI parsing
        const blob = new Blob([text], { type: 'text/plain' });
        const file = new globalThis.File([blob], 'pasted-resume.txt', { type: 'text/plain' });
        
        setUploadProgress(40);
        const aiParsed = await parseResumeWithAI(file, (progress) => {
          setUploadProgress(40 + progress * 0.5);
        });
        data = aiDataToResumeData(aiParsed);
        
        toast({
          title: "✓ AI Parsing Complete",
          description: `Extracted ${data.experience.length} jobs, ${data.education.length} education entries, and ${data.skills.length} skills.`,
        });
      } else {
        // Basic parsing
        setUploadProgress(60);
        data = parseTextToResumeData(text);
        
        toast({
          title: "✓ Text Processed",
          description: "Basic extraction complete. Enable AI parsing for better results.",
        });
      }
      
      setUploadProgress(100);
      setResumeData(data);
      setShowPasteDialog(false);
      setPastedText("");
      setCurrentStep(1);
    } catch (error) {
      console.error("Text processing error:", error);
      toast({
        title: "Processing failed",
        description: error instanceof Error ? error.message : "Could not process the text",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      setUploadProgress(0);
    }
  }

  // Update handlers
  const updateContact = (field: keyof ContactInfo, value: string) => {
    setResumeData(prev => ({
      ...prev,
      contact: { ...prev.contact, [field]: value }
    }));
    setAutoSaveStatus("unsaved");
  };

  const updateSummary = (value: string) => {
    setResumeData(prev => ({ ...prev, summary: value }));
    setAutoSaveStatus("unsaved");
  };

  const addExperience = () => {
    const newExp: Experience = {
      id: Date.now().toString(),
      title: "",
      company: "",
      location: "",
      startDate: "",
      endDate: "",
      current: false,
      bullets: [""],
    };
    setResumeData(prev => ({
      ...prev,
      experience: [...prev.experience, newExp]
    }));
  };

  const updateExperience = (id: string, field: keyof Experience, value: any) => {
    setResumeData(prev => ({
      ...prev,
      experience: prev.experience.map(exp =>
        exp.id === id ? { ...exp, [field]: value } : exp
      )
    }));
    setAutoSaveStatus("unsaved");
  };

  const removeExperience = (id: string) => {
    setResumeData(prev => ({
      ...prev,
      experience: prev.experience.filter(exp => exp.id !== id)
    }));
  };

  const addBullet = (expId: string) => {
    setResumeData(prev => ({
      ...prev,
      experience: prev.experience.map(exp =>
        exp.id === expId ? { ...exp, bullets: [...exp.bullets, ""] } : exp
      )
    }));
  };

  const updateBullet = (expId: string, index: number, value: string) => {
    setResumeData(prev => ({
      ...prev,
      experience: prev.experience.map(exp =>
        exp.id === expId
          ? { ...exp, bullets: exp.bullets.map((b, i) => i === index ? value : b) }
          : exp
      )
    }));
    setAutoSaveStatus("unsaved");
  };

  const removeBullet = (expId: string, index: number) => {
    setResumeData(prev => ({
      ...prev,
      experience: prev.experience.map(exp =>
        exp.id === expId
          ? { ...exp, bullets: exp.bullets.filter((_, i) => i !== index) }
          : exp
      )
    }));
  };

  const addEducation = () => {
    const newEdu: Education = {
      id: Date.now().toString(),
      degree: "",
      school: "",
      location: "",
      graduationDate: "",
    };
    setResumeData(prev => ({
      ...prev,
      education: [...prev.education, newEdu]
    }));
  };

  const updateEducation = (id: string, field: keyof Education, value: any) => {
    setResumeData(prev => ({
      ...prev,
      education: prev.education.map(edu =>
        edu.id === id ? { ...edu, [field]: value } : edu
      )
    }));
    setAutoSaveStatus("unsaved");
  };

  const removeEducation = (id: string) => {
    setResumeData(prev => ({
      ...prev,
      education: prev.education.filter(edu => edu.id !== id)
    }));
  };

  const addSkill = (skill: string) => {
    if (skill.trim() && !resumeData.skills.includes(skill.trim())) {
      setResumeData(prev => ({
        ...prev,
        skills: [...prev.skills, skill.trim()]
      }));
      setAutoSaveStatus("unsaved");
    }
  };

  const removeSkill = (skill: string) => {
    setResumeData(prev => ({
      ...prev,
      skills: prev.skills.filter(s => s !== skill)
    }));
  };

  // Load saved resumes from database
  const loadSavedResumes = async () => {
    setIsLoadingResumes(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({ title: "Please log in to load resumes", variant: "destructive" });
        return;
      }

      const { data, error } = await supabase
        .from('resumes')
        .select('id, name, content, created_at')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setSavedResumes(data || []);
      setShowLoadResumeDialog(true);
    } catch (error) {
      console.error('Error loading resumes:', error);
      toast({ title: "Failed to load resumes", variant: "destructive" });
    } finally {
      setIsLoadingResumes(false);
    }
  };

  // Load a specific saved resume
  const loadSelectedResume = (resume: typeof savedResumes[0]) => {
    try {
      let content = resume.content;
      if (typeof content === 'string') {
        content = JSON.parse(content);
      }
      
      // Check if it has the new metadata structure
      if (content.metadata) {
        const { metadata, ...resumeContent } = content;
        setResumeData(resumeContent as ResumeData);
        if (metadata.category) setSaveCategory(metadata.category);
        if (metadata.tags) setSaveTags(metadata.tags);
        if (metadata.template) setSelectedTemplate(metadata.template);
      } else {
        // Legacy format - just resume data
        setResumeData(content as ResumeData);
      }
      
      setCurrentResumeId(resume.id);
      setResumeName(resume.name);
      setSaveResumeName(resume.name);
      setShowLoadResumeDialog(false);
      setCurrentStep(1); // Go to edit step
      
      toast({
        title: "✓ Resume Loaded",
        description: `Editing "${resume.name}"`,
      });
    } catch (error) {
      console.error('Error parsing resume:', error);
      toast({ title: "Failed to load resume", variant: "destructive" });
    }
  };

  // AI rewrite a bullet point
  const rewriteBulletWithAI = async (expId: string, bulletIndex: number) => {
    const exp = resumeData.experience.find(e => e.id === expId);
    if (!exp || !exp.bullets[bulletIndex]) return;
    
    if (!jobDescription.trim()) {
      toast({
        title: "Job description needed",
        description: "Add a job description to tailor the rewrite",
        action: <Button size="sm" variant="outline" onClick={() => setShowJobDescDialog(true)}>Add Job Description</Button>
      });
      return;
    }
    
    const bulletId = `${expId}-${bulletIndex}`;
    setRewritingBulletId(bulletId);
    
    try {
      const rewritten = await rewriteBullet(exp.bullets[bulletIndex], jobDescription);
      updateBullet(expId, bulletIndex, rewritten);
      toast({ title: "✓ Bullet rewritten with AI" });
    } catch (error) {
      toast({ title: "Rewrite failed", description: error instanceof Error ? error.message : "Could not rewrite", variant: "destructive" });
    } finally {
      setRewritingBulletId(null);
    }
  };

  // Export to PDF
  const exportToPDF = async () => {
    if (!previewRef.current) return;

    setIsExporting(true);
    try {
      const canvas = await html2canvas(previewRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);
      pdf.save(`${resumeData.contact.name || "resume"}.pdf`);

      toast({
        title: "✓ PDF Downloaded",
        description: "Your resume has been exported successfully",
      });
    } catch (error) {
      console.error("Export error:", error);
      toast({
        title: "Export failed",
        description: "Could not generate PDF",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  // Open save dialog
  const openSaveDialog = () => {
    // Use resumeName if set, otherwise fall back to contact name
    setSaveResumeName(resumeName || resumeData.contact.name || "Untitled Resume");
    setShowSaveDialog(true);
  };

  // Add tag helper
  const addSaveTag = () => {
    if (newTag && !saveTags.includes(newTag)) {
      setSaveTags(prev => [...prev, newTag]);
      setNewTag("");
    }
  };

  // Remove tag helper
  const removeSaveTag = (tag: string) => {
    setSaveTags(prev => prev.filter(t => t !== tag));
  };

  // Save to database with metadata
  const saveResume = async () => {
    setIsSaving(true);
    setAutoSaveStatus("saving");
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Not logged in",
          description: "Please log in to save your resume",
          variant: "destructive",
        });
        return;
      }

      // Include metadata in content
      const contentWithMetadata = {
        ...resumeData,
        metadata: {
          category: saveCategory,
          tags: saveTags,
          is_favorite: false,
          template: selectedTemplate,
          created_at: new Date().toISOString(),
        }
      };

      const content = JSON.stringify(contentWithMetadata);
      
      if (currentResumeId) {
        // Update existing resume
        const { error } = await supabase.from("resumes").update({
          name: saveResumeName || "Untitled Resume",
          content,
          updated_at: new Date().toISOString(),
        }).eq('id', currentResumeId);

        if (error) throw error;

        toast({
          title: "✓ Resume Updated",
          description: "Your changes have been saved",
        });
      } else {
        // Create new resume
        const { data, error } = await supabase.from("resumes").insert({
          user_id: user.id,
          name: saveResumeName || "Untitled Resume",
          content,
          file_type: "builder",
        }).select().single();

        if (error) throw error;
        
        // Store the ID for future updates
        if (data) {
          setCurrentResumeId(data.id);
        }

        toast({
          title: "✓ Resume Saved",
          description: "Your resume has been saved to My Resumes",
          action: (
            <Button variant="outline" size="sm" onClick={() => navigate("/my-resumes")}>
              View
            </Button>
          ),
        });
      }
      
      setAutoSaveStatus("saved");
      setShowSaveDialog(false);
    } catch (error) {
      console.error("Save error:", error);
      toast({
        title: "Save failed",
        description: "Could not save resume",
        variant: "destructive",
      });
      setAutoSaveStatus("unsaved");
    } finally {
      setIsSaving(false);
    }
  };

  // Get current template component
  const CurrentTemplate = TEMPLATES.find(t => t.id === selectedTemplate)?.component || ModernTemplate1;

  // Format data for template
  const templateData: TemplateData = {
    contact: resumeData.contact,
    summary: resumeData.summary,
    experience: resumeData.experience,
    education: resumeData.education,
    skills: resumeData.skills,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/20">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate("/dashboard")} className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center">
                <FileText className="w-4 h-4 text-white" />
              </div>
              <span className="text-xl font-bold hidden sm:block">CareerCraft</span>
            </button>
            
            {/* Editable Resume Name */}
            {currentStep > 0 && (
              <div className="flex items-center gap-2 border-l pl-4">
                <Input
                  value={resumeName}
                  onChange={(e) => {
                    setResumeName(e.target.value);
                    setSaveResumeName(e.target.value);
                    setAutoSaveStatus("unsaved");
                  }}
                  placeholder="Untitled Resume"
                  className="h-8 w-48 sm:w-64 text-sm font-medium border-none bg-muted/50 focus-visible:bg-background"
                />
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {currentStep > 0 && (
              <>
                <Badge variant="outline" className="hidden sm:flex">
                  {autoSaveStatus === "saved" && <Check className="w-3 h-3 mr-1 text-green-500" />}
                  {autoSaveStatus === "saving" && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
                  {autoSaveStatus === "unsaved" && <span className="w-2 h-2 rounded-full bg-yellow-500 mr-2" />}
                  {autoSaveStatus === "saved" ? "Saved" : autoSaveStatus === "saving" ? "Saving..." : "Unsaved"}
                </Badge>
                <Button variant="outline" size="sm" onClick={openSaveDialog} disabled={isSaving}>
                  <Save className="w-4 h-4 mr-2" />
                  {currentResumeId ? "Update" : "Save"}
                </Button>
              </>
            )}
            <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>
              Exit
            </Button>
          </div>
        </div>
      </header>

      {/* Progress Steps */}
      <div className="border-b bg-background/50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between max-w-3xl mx-auto">
            {STEPS.map((step, index) => {
              const Icon = step.icon;
              const isActive = index === currentStep;
              const isCompleted = index < currentStep;

              return (
                <button
                  key={step.id}
                  onClick={() => index <= currentStep && setCurrentStep(index)}
                  disabled={index > currentStep}
                  className={`flex flex-col items-center gap-2 transition-all ${
                    isActive ? "text-primary" : isCompleted ? "text-green-500" : "text-muted-foreground"
                  } ${index <= currentStep ? "cursor-pointer" : "cursor-not-allowed opacity-50"}`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                    isActive ? "border-primary bg-primary/10" : isCompleted ? "border-green-500 bg-green-500/10" : "border-muted"
                  }`}>
                    {isCompleted ? <Check className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                  </div>
                  <span className="text-xs font-medium hidden sm:block">{step.title}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <AnimatePresence mode="wait">
          {/* Step 0: Upload */}
          {currentStep === 0 && (
            <motion.div
              key="upload"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-2xl mx-auto"
            >
              <div className="text-center mb-8">
                <h1 className="text-3xl font-bold mb-2">Create Your Resume</h1>
                <p className="text-muted-foreground">
                  Upload an existing resume or start from scratch
                </p>
              </div>

              {/* AI Toggle */}
              <Card className="p-4 mb-4 bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-purple-500/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Sparkles className={`w-5 h-5 ${useAIParsing ? 'text-purple-500' : 'text-muted-foreground'}`} />
                    <div>
                      <Label htmlFor="ai-toggle" className="font-medium cursor-pointer">
                        AI-Powered Parsing
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        {useAIParsing 
                          ? "Uses AI tokens for better extraction of experience, education & skills" 
                          : "Basic text extraction (no tokens used)"}
                      </p>
                    </div>
                  </div>
                  <Switch
                    id="ai-toggle"
                    checked={useAIParsing}
                    onCheckedChange={setUseAIParsing}
                  />
                </div>
              </Card>

              {/* Upload Zone */}
              <Card
                {...getRootProps()}
                className={`p-12 border-2 border-dashed cursor-pointer transition-all ${
                  isDragActive ? "border-primary bg-primary/5" : "border-muted hover:border-primary/50"
                }`}
              >
                <input {...getInputProps()} />
                <div className="text-center">
                  {isProcessing ? (
                    <div className="space-y-4">
                      <Loader2 className="w-12 h-12 mx-auto animate-spin text-primary" />
                      <p className="font-medium">Processing your file...</p>
                      {uploadProgress > 0 && (
                        <Progress value={uploadProgress} className="w-48 mx-auto" />
                      )}
                    </div>
                  ) : (
                    <>
                      <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-lg font-medium mb-2">
                        {isDragActive ? "Drop your file here" : "Drag & drop your resume"}
                      </p>
                      <p className="text-sm text-muted-foreground mb-4">
                        Supports PDF, Word, images, and text files
                      </p>
                      <div className="flex gap-2 justify-center flex-wrap">
                        <Badge variant="secondary">PDF</Badge>
                        <Badge variant="secondary">DOCX</Badge>
                        <Badge variant="secondary">DOC</Badge>
                        <Badge variant="secondary">TXT</Badge>
                        <Badge variant="secondary">PNG/JPG</Badge>
                      </div>
                    </>
                  )}
                </div>
              </Card>

              {/* Or Start Fresh */}
              <div className="relative my-8">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">Or</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full"
                  onClick={loadSavedResumes}
                  disabled={isLoadingResumes}
                >
                  {isLoadingResumes ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <FolderOpen className="w-4 h-4 mr-2" />
                  )}
                  My Resumes
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full"
                  onClick={() => setShowPasteDialog(true)}
                >
                  <ClipboardPaste className="w-4 h-4 mr-2" />
                  Paste Text
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full"
                  onClick={() => setCurrentStep(1)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Start Fresh
                </Button>
              </div>

              {/* Info Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
                <Card className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                      <FileText className="w-5 h-5 text-blue-500" />
                    </div>
                    <div>
                      <h3 className="font-medium">PDF Files</h3>
                      <p className="text-sm text-muted-foreground">
                        Text is extracted for editing. Original formatting is used as reference.
                      </p>
                    </div>
                  </div>
                </Card>
                <Card className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                      <File className="w-5 h-5 text-green-500" />
                    </div>
                    <div>
                      <h3 className="font-medium">Word Documents</h3>
                      <p className="text-sm text-muted-foreground">
                        Full text extraction with better structure preservation.
                      </p>
                    </div>
                  </div>
                </Card>
                <Card className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                      <ClipboardPaste className="w-5 h-5 text-orange-500" />
                    </div>
                    <div>
                      <h3 className="font-medium">Text / Paste</h3>
                      <p className="text-sm text-muted-foreground">
                        Upload .txt files or paste resume text directly.
                      </p>
                    </div>
                  </div>
                </Card>
              </div>
            </motion.div>
          )}

          {/* Step 1: Edit Content */}
          {currentStep === 1 && (
            <motion.div
              key="edit"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={showLivePreview ? "max-w-6xl mx-auto" : "max-w-4xl mx-auto"}
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h1 className="text-2xl font-bold">Edit Your Content</h1>
                  <p className="text-muted-foreground">
                    Review and update your resume information
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {/* Job Description Button */}
                  <Button 
                    variant={jobDescription ? "default" : "outline"} 
                    size="sm"
                    onClick={() => setShowJobDescDialog(true)}
                  >
                    <Briefcase className="w-4 h-4 mr-2" />
                    {jobDescription ? "Job Added ✓" : "Add Job Desc"}
                  </Button>
                  {/* Live Preview Toggle */}
                  <Button
                    variant={showLivePreview ? "default" : "outline"}
                    size="sm"
                    onClick={() => setShowLivePreview(!showLivePreview)}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Preview
                  </Button>
                  <Button onClick={() => setCurrentStep(2)}>
                    Choose Template
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>

              <div className={`${showLivePreview ? 'grid grid-cols-2 gap-6' : ''}`}>
                {/* Editor Panel */}
                <div className={showLivePreview ? '' : ''}>
              <Tabs value={activeSection} onValueChange={setActiveSection}>
                <TabsList className="grid grid-cols-5 w-full mb-6">
                  <TabsTrigger value="contact" className="gap-2">
                    <User className="w-4 h-4" />
                    <span className="hidden sm:inline">Contact</span>
                  </TabsTrigger>
                  <TabsTrigger value="summary" className="gap-2">
                    <FileText className="w-4 h-4" />
                    <span className="hidden sm:inline">Summary</span>
                  </TabsTrigger>
                  <TabsTrigger value="experience" className="gap-2">
                    <Briefcase className="w-4 h-4" />
                    <span className="hidden sm:inline">Experience</span>
                  </TabsTrigger>
                  <TabsTrigger value="education" className="gap-2">
                    <GraduationCap className="w-4 h-4" />
                    <span className="hidden sm:inline">Education</span>
                  </TabsTrigger>
                  <TabsTrigger value="skills" className="gap-2">
                    <Wrench className="w-4 h-4" />
                    <span className="hidden sm:inline">Skills</span>
                  </TabsTrigger>
                </TabsList>

                {/* Contact */}
                <TabsContent value="contact">
                  <Card className="p-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <User className="w-5 h-5" />
                      Personal Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium mb-1 block">Full Name *</label>
                        <Input
                          value={resumeData.contact.name}
                          onChange={(e) => updateContact("name", e.target.value)}
                          placeholder="John Doe"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-1 block">Email *</label>
                        <Input
                          type="email"
                          value={resumeData.contact.email}
                          onChange={(e) => updateContact("email", e.target.value)}
                          placeholder="john@example.com"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-1 block">Phone</label>
                        <Input
                          value={resumeData.contact.phone}
                          onChange={(e) => updateContact("phone", e.target.value)}
                          placeholder="+1 (555) 123-4567"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-1 block">Location</label>
                        <Input
                          value={resumeData.contact.location}
                          onChange={(e) => updateContact("location", e.target.value)}
                          placeholder="San Francisco, CA"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-1 block">LinkedIn</label>
                        <Input
                          value={resumeData.contact.linkedin || ""}
                          onChange={(e) => updateContact("linkedin", e.target.value)}
                          placeholder="linkedin.com/in/johndoe"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-1 block">Website</label>
                        <Input
                          value={resumeData.contact.website || ""}
                          onChange={(e) => updateContact("website", e.target.value)}
                          placeholder="johndoe.com"
                        />
                      </div>
                    </div>
                  </Card>
                </TabsContent>

                {/* Summary */}
                <TabsContent value="summary">
                  <Card className="p-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <FileText className="w-5 h-5" />
                      Professional Summary
                    </h3>
                    <Textarea
                      value={resumeData.summary}
                      onChange={(e) => updateSummary(e.target.value)}
                      placeholder="A brief summary of your professional background, key achievements, and career goals..."
                      className="min-h-[200px]"
                    />
                    <p className="text-xs text-muted-foreground mt-2">
                      {resumeData.summary.split(/\s+/).filter(Boolean).length} words • Aim for 50-150 words
                    </p>
                  </Card>
                </TabsContent>

                {/* Experience */}
                <TabsContent value="experience">
                  <div className="space-y-4">
                    <AnimatePresence>
                      {resumeData.experience.map((exp, index) => (
                        <motion.div
                          key={exp.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, height: 0 }}
                        >
                          <Card className="p-6">
                            <div className="flex items-center justify-between mb-4">
                              <h3 className="font-semibold flex items-center gap-2">
                                <Briefcase className="w-4 h-4" />
                                Position {index + 1}
                              </h3>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => removeExperience(exp.id)}
                                className="text-destructive"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                              <div>
                                <label className="text-sm font-medium mb-1 block">Job Title</label>
                                <Input
                                  value={exp.title}
                                  onChange={(e) => updateExperience(exp.id, "title", e.target.value)}
                                  placeholder="Software Engineer"
                                />
                              </div>
                              <div>
                                <label className="text-sm font-medium mb-1 block">Company</label>
                                <Input
                                  value={exp.company}
                                  onChange={(e) => updateExperience(exp.id, "company", e.target.value)}
                                  placeholder="Tech Company Inc."
                                />
                              </div>
                              <div>
                                <label className="text-sm font-medium mb-1 block">Location</label>
                                <Input
                                  value={exp.location}
                                  onChange={(e) => updateExperience(exp.id, "location", e.target.value)}
                                  placeholder="San Francisco, CA"
                                />
                              </div>
                              <div className="flex gap-2">
                                <div className="flex-1">
                                  <label className="text-sm font-medium mb-1 block">Start</label>
                                  <Input
                                    value={exp.startDate}
                                    onChange={(e) => updateExperience(exp.id, "startDate", e.target.value)}
                                    placeholder="Jan 2020"
                                  />
                                </div>
                                <div className="flex-1">
                                  <label className="text-sm font-medium mb-1 block">End</label>
                                  <Input
                                    value={exp.current ? "Present" : exp.endDate}
                                    onChange={(e) => updateExperience(exp.id, "endDate", e.target.value)}
                                    placeholder="Present"
                                  />
                                </div>
                              </div>
                            </div>

                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <label className="text-sm font-medium">Achievements</label>
                                {jobDescription && (
                                  <Badge variant="outline" className="text-xs">
                                    <Sparkles className="w-3 h-3 mr-1" />
                                    AI Rewrite Available
                                  </Badge>
                                )}
                              </div>
                              <div className="space-y-2">
                                {exp.bullets.map((bullet, bulletIndex) => (
                                  <div key={bulletIndex} className="flex gap-2 group">
                                    <span className="text-muted-foreground mt-2">•</span>
                                    <Textarea
                                      value={bullet}
                                      onChange={(e) => updateBullet(exp.id, bulletIndex, e.target.value)}
                                      placeholder="Describe an achievement..."
                                      className="flex-1 min-h-[60px]"
                                    />
                                    <div className="flex flex-col gap-1">
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => rewriteBulletWithAI(exp.id, bulletIndex)}
                                        disabled={rewritingBulletId === `${exp.id}-${bulletIndex}` || !bullet.trim()}
                                        className="text-purple-500 hover:text-purple-600 hover:bg-purple-50"
                                        title={jobDescription ? "AI Rewrite" : "Add job description first"}
                                      >
                                        {rewritingBulletId === `${exp.id}-${bulletIndex}` ? (
                                          <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                          <Sparkles className="w-4 h-4" />
                                        )}
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => removeBullet(exp.id, bulletIndex)}
                                        disabled={exp.bullets.length <= 1}
                                      >
                                        <X className="w-4 h-4" />
                                      </Button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => addBullet(exp.id)}
                                className="mt-2"
                              >
                                <Plus className="w-4 h-4 mr-2" />
                                Add Bullet
                              </Button>
                            </div>
                          </Card>
                        </motion.div>
                      ))}
                    </AnimatePresence>

                    <Button onClick={addExperience} variant="outline" className="w-full">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Experience
                    </Button>
                  </div>
                </TabsContent>

                {/* Education */}
                <TabsContent value="education">
                  <div className="space-y-4">
                    <AnimatePresence>
                      {resumeData.education.map((edu, index) => (
                        <motion.div
                          key={edu.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, height: 0 }}
                        >
                          <Card className="p-6">
                            <div className="flex items-center justify-between mb-4">
                              <h3 className="font-semibold flex items-center gap-2">
                                <GraduationCap className="w-4 h-4" />
                                Education {index + 1}
                              </h3>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => removeEducation(edu.id)}
                                className="text-destructive"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="md:col-span-2">
                                <label className="text-sm font-medium mb-1 block">Degree</label>
                                <Input
                                  value={edu.degree}
                                  onChange={(e) => updateEducation(edu.id, "degree", e.target.value)}
                                  placeholder="Bachelor of Science in Computer Science"
                                />
                              </div>
                              <div>
                                <label className="text-sm font-medium mb-1 block">School</label>
                                <Input
                                  value={edu.school}
                                  onChange={(e) => updateEducation(edu.id, "school", e.target.value)}
                                  placeholder="University of California"
                                />
                              </div>
                              <div>
                                <label className="text-sm font-medium mb-1 block">Graduation</label>
                                <Input
                                  value={edu.graduationDate}
                                  onChange={(e) => updateEducation(edu.id, "graduationDate", e.target.value)}
                                  placeholder="May 2020"
                                />
                              </div>
                              <div>
                                <label className="text-sm font-medium mb-1 block">GPA (Optional)</label>
                                <Input
                                  value={edu.gpa || ""}
                                  onChange={(e) => updateEducation(edu.id, "gpa", e.target.value)}
                                  placeholder="3.8/4.0"
                                />
                              </div>
                              <div>
                                <label className="text-sm font-medium mb-1 block">Location</label>
                                <Input
                                  value={edu.location}
                                  onChange={(e) => updateEducation(edu.id, "location", e.target.value)}
                                  placeholder="Berkeley, CA"
                                />
                              </div>
                            </div>
                          </Card>
                        </motion.div>
                      ))}
                    </AnimatePresence>

                    <Button onClick={addEducation} variant="outline" className="w-full">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Education
                    </Button>
                  </div>
                </TabsContent>

                {/* Skills */}
                <TabsContent value="skills">
                  <Card className="p-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Wrench className="w-5 h-5" />
                      Skills & Technologies
                    </h3>

                    <div className="flex flex-wrap gap-2 mb-4">
                      {resumeData.skills.map((skill) => (
                        <Badge
                          key={skill}
                          variant="secondary"
                          className="px-3 py-1 cursor-pointer hover:bg-destructive/20 group"
                          onClick={() => removeSkill(skill)}
                        >
                          {skill}
                          <X className="w-3 h-3 ml-2 opacity-0 group-hover:opacity-100" />
                        </Badge>
                      ))}
                      {resumeData.skills.length === 0 && (
                        <p className="text-muted-foreground text-sm">No skills added yet</p>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Input
                        placeholder="Type a skill and press Enter..."
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            addSkill((e.target as HTMLInputElement).value);
                            (e.target as HTMLInputElement).value = "";
                          }
                        }}
                      />
                      <Button
                        variant="outline"
                        onClick={(e) => {
                          const input = (e.target as HTMLElement).previousElementSibling as HTMLInputElement;
                          if (input) {
                            addSkill(input.value);
                            input.value = "";
                          }
                        }}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </Card>
                </TabsContent>
              </Tabs>
                </div>

                {/* Live Preview Panel */}
                {showLivePreview && (
                  <div className="sticky top-24">
                    <Card className="p-2 bg-muted/30">
                      <div className="flex items-center justify-between mb-2 px-2">
                        <span className="text-sm font-medium">Live Preview</span>
                        <Badge variant="secondary" className="text-xs">{TEMPLATES.find(t => t.id === selectedTemplate)?.title}</Badge>
                      </div>
                      <div className="bg-white rounded shadow-sm overflow-hidden" style={{ transform: 'scale(0.4)', transformOrigin: 'top left', width: '250%', height: '400px' }}>
                        <CurrentTemplate data={templateData} isPreview={true} />
                      </div>
                    </Card>
                  </div>
                )}
              </div>

              {/* Navigation */}
              <div className="flex justify-between mt-6">
                <Button variant="outline" onClick={() => setCurrentStep(0)}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <Button onClick={() => setCurrentStep(2)}>
                  Choose Template
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 2: Choose Template */}
          {currentStep === 2 && (
            <motion.div
              key="template"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div className="text-center mb-8">
                <h1 className="text-2xl font-bold mb-2">Choose Your Template</h1>
                <p className="text-muted-foreground">
                  Select a design that matches your style
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
                {TEMPLATES.map((template) => {
                  const TemplatePreview = template.component;
                  return (
                    <Card
                      key={template.id}
                      className={`overflow-hidden cursor-pointer transition-all hover:shadow-lg ${
                        selectedTemplate === template.id ? "ring-2 ring-primary" : ""
                      }`}
                      onClick={() => setSelectedTemplate(template.id)}
                    >
                      {/* Template Preview - scaled down */}
                      <div className="h-48 overflow-hidden bg-gray-100 relative">
                        <div className="absolute inset-0 pointer-events-none">
                          <TemplatePreview data={templateData} isPreview={true} />
                        </div>
                      </div>
                      <div className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-semibold">{template.title}</h3>
                          {selectedTemplate === template.id && (
                            <Check className="w-5 h-5 text-primary" />
                          )}
                        </div>
                        <Badge variant="secondary" className="mb-2">{template.category}</Badge>
                        <p className="text-sm text-muted-foreground">{template.description}</p>
                      </div>
                    </Card>
                  );
                })}
              </div>

              {/* Navigation */}
              <div className="flex justify-between mt-8 max-w-5xl mx-auto">
                <Button variant="outline" onClick={() => setCurrentStep(1)}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Edit Content
                </Button>
                <Button onClick={() => setCurrentStep(3)}>
                  Preview & Export
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 3: Preview & Export */}
          {currentStep === 3 && (
            <motion.div
              key="preview"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h1 className="text-2xl font-bold">Preview & Export</h1>
                  <p className="text-muted-foreground">
                    Review your resume and download as PDF
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setCurrentStep(2)}>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Change Template
                  </Button>
                  <Button variant="outline" onClick={openSaveDialog}>
                    <Save className="w-4 h-4 mr-2" />
                    {currentResumeId ? "Update" : "Save"}
                  </Button>
                  <Button onClick={exportToPDF} disabled={isExporting}>
                    {isExporting ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4 mr-2" />
                    )}
                    Download PDF
                  </Button>
                </div>
              </div>

              {/* Preview */}
              <div className="flex justify-center">
                <div
                  ref={previewRef}
                  className="bg-white shadow-2xl rounded-lg overflow-hidden"
                  style={{ width: "210mm", minHeight: "297mm" }}
                >
                  <CurrentTemplate data={templateData} isPreview={false} />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Paste Text Dialog */}
      <Dialog open={showPasteDialog} onOpenChange={setShowPasteDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardPaste className="w-5 h-5" />
              Paste Resume Text
            </DialogTitle>
            <DialogDescription>
              Copy your resume content from any source and paste it below. 
              {useAIParsing ? " AI will extract structured data." : " Enable AI parsing for better extraction."}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* AI Toggle in dialog */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2">
                <Sparkles className={`w-4 h-4 ${useAIParsing ? 'text-purple-500' : 'text-muted-foreground'}`} />
                <span className="text-sm font-medium">AI Parsing</span>
              </div>
              <Switch
                checked={useAIParsing}
                onCheckedChange={setUseAIParsing}
              />
            </div>
            
            <Textarea
              placeholder="Paste your resume text here...

Example:
John Doe
john@email.com | (555) 123-4567 | New York, NY

EXPERIENCE
Software Engineer at Tech Company
Jan 2020 - Present
• Built scalable APIs serving 1M+ users
• Led team of 5 developers

EDUCATION
BS Computer Science, University Name, 2019

SKILLS
JavaScript, React, Node.js, Python"
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
              className="min-h-[300px] font-mono text-sm"
            />
            
            <p className="text-xs text-muted-foreground">
              {pastedText.length > 0 
                ? `${pastedText.split(/\s+/).filter(Boolean).length} words`
                : "Paste your resume content above"}
            </p>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowPasteDialog(false);
              setPastedText("");
            }}>
              Cancel
            </Button>
            <Button 
              onClick={() => handleTextContent(pastedText)}
              disabled={!pastedText.trim() || isProcessing}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Process Resume
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Save Resume Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Save className="w-5 h-5" />
              {currentResumeId ? "Update Resume" : "Save Resume"}
            </DialogTitle>
            <DialogDescription>
              {currentResumeId 
                ? "Update your resume and organize it with tags."
                : "Save your resume to My Resumes and organize it with tags and categories."
              }
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Resume Name */}
            <div className="space-y-2">
              <Label htmlFor="resume-name">Resume Name</Label>
              <Input
                id="resume-name"
                placeholder="e.g., Software Engineer - Google"
                value={saveResumeName}
                onChange={(e) => setSaveResumeName(e.target.value)}
              />
            </div>
            
            {/* Category */}
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={saveCategory} onValueChange={setSaveCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${cat.color}`} />
                        {cat.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Tags */}
            <div className="space-y-2">
              <Label>Tags</Label>
              <div className="flex flex-wrap gap-2 mb-2">
                {saveTags.map(tag => (
                  <Badge key={tag} variant="secondary" className="gap-1 pr-1">
                    {tag}
                    <button 
                      onClick={() => removeSaveTag(tag)}
                      className="ml-1 hover:bg-muted rounded-full p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
                {saveTags.length === 0 && (
                  <span className="text-sm text-muted-foreground">No tags added</span>
                )}
              </div>
              
              {/* Add new tag */}
              <div className="flex gap-2">
                <Input
                  placeholder="Add custom tag..."
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSaveTag())}
                  className="flex-1"
                />
                <Button type="button" variant="outline" onClick={addSaveTag} disabled={!newTag}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              
              {/* Preset tags */}
              <div className="flex flex-wrap gap-1 mt-2">
                {PRESET_TAGS.filter(t => !saveTags.includes(t)).slice(0, 6).map(tag => (
                  <Badge 
                    key={tag} 
                    variant="outline" 
                    className="cursor-pointer hover:bg-muted text-xs"
                    onClick={() => setSaveTags(prev => [...prev, tag])}
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
          
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
              Cancel
            </Button>
            <Button onClick={saveResume} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  {currentResumeId ? "Update Resume" : "Save to My Resumes"}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Load Resume Dialog */}
      <Dialog open={showLoadResumeDialog} onOpenChange={setShowLoadResumeDialog}>
        <DialogContent className="max-w-lg max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderOpen className="w-5 h-5" />
              Load Saved Resume
            </DialogTitle>
            <DialogDescription>
              Select a resume from your library to edit
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="max-h-[400px] pr-4">
            {savedResumes.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No saved resumes found</p>
                <p className="text-sm">Upload or create a resume first</p>
              </div>
            ) : (
              <div className="space-y-2">
                {savedResumes.map(resume => (
                  <Card 
                    key={resume.id} 
                    className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => loadSelectedResume(resume)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">{resume.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {new Date(resume.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLoadResumeDialog(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Job Description Dialog */}
      <Dialog open={showJobDescDialog} onOpenChange={setShowJobDescDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Briefcase className="w-5 h-5" />
              Target Job Description
            </DialogTitle>
            <DialogDescription>
              Paste the job description to tailor your resume. AI will use this to rewrite bullet points.
            </DialogDescription>
          </DialogHeader>
          
          <Textarea
            placeholder="Paste the job description here...

Example:
We are looking for a Software Engineer with experience in:
- React, TypeScript, Node.js
- Building scalable web applications
- Working in agile teams
- Strong problem-solving skills

Requirements:
- 3+ years of experience
- Bachelor's degree in CS or related field"
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            className="min-h-[300px] font-mono text-sm"
          />
          
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {jobDescription.length > 0 
                ? `${jobDescription.split(/\s+/).filter(Boolean).length} words`
                : "Paste job description to enable AI rewriting"}
            </p>
            {jobDescription && (
              <Button variant="ghost" size="sm" onClick={() => setJobDescription("")}>
                Clear
              </Button>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowJobDescDialog(false)}>
              Cancel
            </Button>
            <Button onClick={() => {
              setShowJobDescDialog(false);
              if (jobDescription) {
                toast({
                  title: "✓ Job description added",
                  description: "You can now use AI to rewrite bullet points",
                });
              }
            }}>
              <Check className="w-4 h-4 mr-2" />
              {jobDescription ? "Save & Close" : "Close"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
