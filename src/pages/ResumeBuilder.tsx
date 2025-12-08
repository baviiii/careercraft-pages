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
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { parseResumeWithAI, parseResumeStructured, AIResumeData } from "@/lib/resumeParser";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { ModernTemplate1 } from "@/components/templates/ModernTemplate1";
import { ModernTemplate2 } from "@/components/templates/ModernTemplate2";
import { ProfessionalTemplate } from "@/components/templates/ProfessionalTemplate";
import { CreativeTemplate1 } from "@/components/templates/CreativeTemplate1";
import { CreativeTemplate2 } from "@/components/templates/CreativeTemplate2";
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

type TemplateId = "modern1" | "modern2" | "professional" | "creative1" | "creative2";

interface Template {
  id: TemplateId;
  title: string;
  category: string;
  color: string;
  description: string;
  component: React.ComponentType<{ data?: TemplateData; isPreview?: boolean }>;
}

const TEMPLATES: Template[] = [
  {
    id: "modern1",
    title: "Modern Blue",
    category: "Modern",
    color: "from-blue-500 to-cyan-500",
    description: "Clean design with blue accents",
    component: ModernTemplate1,
  },
  {
    id: "modern2",
    title: "Modern Minimal",
    category: "Modern",
    color: "from-slate-500 to-slate-700",
    description: "Elegant two-column layout",
    component: ModernTemplate2,
  },
  {
    id: "professional",
    title: "Professional Classic",
    category: "Professional",
    color: "from-gray-700 to-gray-900",
    description: "Timeless traditional design",
    component: ProfessionalTemplate,
  },
  {
    id: "creative1",
    title: "Creative Bold",
    category: "Creative",
    color: "from-purple-500 to-pink-500",
    description: "Stand out with bold colors",
    component: CreativeTemplate1,
  },
  {
    id: "creative2",
    title: "Creative Gradient",
    category: "Creative",
    color: "from-orange-500 to-red-500",
    description: "Modern gradient styling",
    component: CreativeTemplate2,
  },
];

const STEPS = [
  { id: "upload", title: "Upload", icon: Upload },
  { id: "edit", title: "Edit Content", icon: FileText },
  { id: "template", title: "Choose Template", icon: Layout },
  { id: "preview", title: "Preview & Export", icon: Download },
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
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  
  // Extract contact info
  const emailMatch = text.match(/[\w.-]+@[\w.-]+\.\w+/);
  const phoneMatch = text.match(/(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
  const linkedinMatch = text.match(/(linkedin\.com\/in\/[\w-]+)/i);
  
  if (emailMatch) data.contact.email = emailMatch[0];
  if (phoneMatch) data.contact.phone = phoneMatch[0];
  if (linkedinMatch) data.contact.linkedin = linkedinMatch[0];
  
  // First line is often the name
  for (const line of lines.slice(0, 5)) {
    if (!line.includes('@') && !line.match(/^\d/) && line.length > 2 && line.length < 50) {
      data.contact.name = line;
      break;
    }
  }
  
  // Location pattern
  const locationMatch = text.match(/([A-Z][a-z]+,\s*[A-Z]{2})|([A-Z][a-z]+\s*,\s*[A-Z][a-z]+)/);
  if (locationMatch) data.contact.location = locationMatch[0];
  
  // Find sections
  let currentSection = '';
  let sectionContent: { [key: string]: string[] } = {
    summary: [], experience: [], education: [], skills: []
  };
  
  for (const line of lines) {
    const lower = line.toLowerCase();
    if (lower.includes('summary') || lower.includes('objective') || lower.includes('profile')) {
      currentSection = 'summary';
    } else if (lower.includes('experience') || lower.includes('employment')) {
      currentSection = 'experience';
    } else if (lower.includes('education')) {
      currentSection = 'education';
    } else if (lower.includes('skill') || lower.includes('technical')) {
      currentSection = 'skills';
    } else if (currentSection && sectionContent[currentSection]) {
      sectionContent[currentSection].push(line);
    }
  }
  
  data.summary = sectionContent.summary.join(' ');
  data.skills = sectionContent.skills.join(' ')
    .split(/[,•|·]/)
    .map(s => s.trim())
    .filter(s => s.length > 1 && s.length < 50);
  
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

  // Check for data from Upload page on mount
  useEffect(() => {
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
        const file = new File([blob], 'pasted-resume.txt', { type: 'text/plain' });
        
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

  // Save to database
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

      const content = JSON.stringify(resumeData);
      const { error } = await supabase.from("resumes").insert({
        user_id: user.id,
        name: resumeData.contact.name || "Untitled Resume",
        content,
        file_type: "builder",
      });

      if (error) throw error;

      toast({
        title: "✓ Resume Saved",
        description: "Your resume has been saved to your account",
      });
      setAutoSaveStatus("saved");
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
          <button onClick={() => navigate("/dashboard")} className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center">
              <FileText className="w-4 h-4 text-white" />
            </div>
            <span className="text-xl font-bold">CareerCraft</span>
          </button>

          <div className="flex items-center gap-2">
            {currentStep > 0 && (
              <>
                <Badge variant="outline" className="hidden sm:flex">
                  {autoSaveStatus === "saved" && <Check className="w-3 h-3 mr-1 text-green-500" />}
                  {autoSaveStatus === "saving" && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
                  {autoSaveStatus === "unsaved" && <span className="w-2 h-2 rounded-full bg-yellow-500 mr-2" />}
                  {autoSaveStatus === "saved" ? "Saved" : autoSaveStatus === "saving" ? "Saving..." : "Unsaved"}
                </Badge>
                <Button variant="outline" size="sm" onClick={saveResume} disabled={isSaving}>
                  <Save className="w-4 h-4 mr-2" />
                  Save
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

              <div className="grid grid-cols-2 gap-4">
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
                  Start from Scratch
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
              className="max-w-4xl mx-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h1 className="text-2xl font-bold">Edit Your Content</h1>
                  <p className="text-muted-foreground">
                    Review and update your resume information
                  </p>
                </div>
                <Button onClick={() => setCurrentStep(2)}>
                  Choose Template
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>

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
                              <label className="text-sm font-medium mb-2 block">Achievements</label>
                              <div className="space-y-2">
                                {exp.bullets.map((bullet, bulletIndex) => (
                                  <div key={bulletIndex} className="flex gap-2">
                                    <span className="text-muted-foreground mt-2">•</span>
                                    <Textarea
                                      value={bullet}
                                      onChange={(e) => updateBullet(exp.id, bulletIndex, e.target.value)}
                                      placeholder="Describe an achievement..."
                                      className="flex-1 min-h-[60px]"
                                    />
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => removeBullet(exp.id, bulletIndex)}
                                      disabled={exp.bullets.length <= 1}
                                    >
                                      <X className="w-4 h-4" />
                                    </Button>
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
    </div>
  );
}
