import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Wand2,
  ArrowRight,
  ArrowLeft,
  User,
  Mail,
  Phone,
  MapPin,
  Plus,
  Trash2,
  Download,
  CheckCircle2,
  Sparkles,
  Briefcase,
  Save,
  Eye,
  Layout,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import jsPDF from "jspdf";
import { supabase } from "@/integrations/supabase/client";
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

interface ContactInfo {
  name: string;
  email: string;
  phone: string;
  location: string;
  linkedin?: string;
}

interface Experience {
  id: string;
  title: string;
  company: string;
  location: string;
  startDate: string;
  endDate: string;
  current: boolean;
  description: string;
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
}

type TemplateStyle = "modern1" | "modern2" | "modern3" | "modern4" | "modern5" | "modern6" | "modern7" | "professional" | "professional2" | "professional3" | "professional4" | "professional5" | "professional6" | "creative1" | "creative2" | "creative3" | "creative4" | "creative5" | "creative6" | "creative7" | "minimal1" | "minimal2" | "minimal3" | "minimal4" | "minimal5";

const TEMPLATES = [
  // Modern Templates
  { id: "modern1", title: "Modern Blue", category: "Modern", color: "from-blue-500 to-cyan-500", description: "Clean design with blue accents", preview: ModernTemplate1 },
  { id: "modern2", title: "Modern Minimal", category: "Modern", color: "from-slate-500 to-slate-700", description: "Elegant two-column layout", preview: ModernTemplate2 },
  { id: "modern3", title: "Modern Gradient", category: "Modern", color: "from-indigo-500 to-purple-600", description: "Sleek gradient header design", preview: ModernTemplate3 },
  { id: "modern4", title: "Modern Tech", category: "Modern", color: "from-cyan-500 to-blue-600", description: "Tech-focused modern layout", preview: ModernTemplate4 },
  { id: "modern5", title: "Modern Split", category: "Modern", color: "from-teal-500 to-emerald-600", description: "Clean split-column design", preview: ModernTemplate5 },
  { id: "modern6", title: "Modern Navy", category: "Modern", color: "from-blue-700 to-slate-800", description: "Professional navy accent", preview: ModernTemplate6 },
  { id: "modern7", title: "Modern Emerald", category: "Modern", color: "from-emerald-500 to-teal-600", description: "Fresh emerald styling", preview: ModernTemplate7 },
  // Professional Templates
  { id: "professional", title: "Professional Classic", category: "Professional", color: "from-gray-700 to-gray-900", description: "Timeless traditional design", preview: ProfessionalTemplate },
  { id: "professional2", title: "Professional Executive", category: "Professional", color: "from-slate-700 to-gray-800", description: "Executive-level formatting", preview: ProfessionalTemplate2 },
  { id: "professional3", title: "Professional Corporate", category: "Professional", color: "from-zinc-600 to-slate-700", description: "Corporate standard layout", preview: ProfessionalTemplate3 },
  { id: "professional4", title: "Professional Banking", category: "Professional", color: "from-blue-800 to-slate-800", description: "Finance industry standard", preview: ProfessionalTemplate4 },
  { id: "professional5", title: "Professional Legal", category: "Professional", color: "from-stone-600 to-zinc-700", description: "Law firm approved style", preview: ProfessionalTemplate5 },
  { id: "professional6", title: "Professional Consulting", category: "Professional", color: "from-gray-600 to-slate-700", description: "Consulting firm format", preview: ProfessionalTemplate6 },
  // Creative Templates
  { id: "creative1", title: "Creative Bold", category: "Creative", color: "from-purple-500 to-pink-500", description: "Bold gradients with flair", preview: CreativeTemplate1 },
  { id: "creative2", title: "Creative Dark", category: "Creative", color: "from-orange-500 to-red-600", description: "Dark theme with orange", preview: CreativeTemplate2 },
  { id: "creative3", title: "Creative Sunset", category: "Creative", color: "from-rose-500 to-orange-500", description: "Warm sunset gradients", preview: CreativeTemplate3 },
  { id: "creative4", title: "Creative Retro", category: "Creative", color: "from-amber-500 to-red-600", description: "Retro vintage styling", preview: CreativeTemplate4 },
  { id: "creative5", title: "Creative Neon", category: "Creative", color: "from-violet-500 to-fuchsia-500", description: "Neon glow effects", preview: CreativeTemplate5 },
  { id: "creative6", title: "Creative Nature", category: "Creative", color: "from-green-500 to-emerald-600", description: "Nature-inspired design", preview: CreativeTemplate6 },
  { id: "creative7", title: "Creative Geometric", category: "Creative", color: "from-cyan-500 to-blue-600", description: "Geometric patterns", preview: CreativeTemplate7 },
  // Minimal Templates
  { id: "minimal1", title: "Minimal Clean", category: "Minimal", color: "from-gray-400 to-gray-500", description: "Ultra-clean simplicity", preview: MinimalTemplate1 },
  { id: "minimal2", title: "Minimal Centered", category: "Minimal", color: "from-slate-400 to-gray-500", description: "Centered elegant layout", preview: MinimalTemplate2 },
  { id: "minimal3", title: "Minimal Sidebar", category: "Minimal", color: "from-zinc-400 to-slate-500", description: "Minimal with sidebar", preview: MinimalTemplate3 },
  { id: "minimal4", title: "Minimal Classic", category: "Minimal", color: "from-stone-400 to-gray-500", description: "Classic minimal style", preview: MinimalTemplate4 },
  { id: "minimal5", title: "Minimal Swiss", category: "Minimal", color: "from-neutral-400 to-slate-500", description: "Swiss design inspired", preview: MinimalTemplate5 },
];

const STEPS = [
  { id: "template", title: "Choose Template", icon: Wand2 },
  { id: "contact", title: "Contact Info", icon: User },
  { id: "summary", title: "Summary", icon: Sparkles },
  { id: "experience", title: "Experience", icon: Briefcase },
  { id: "education", title: "Education", icon: CheckCircle2 },
  { id: "skills", title: "Skills", icon: CheckCircle2 },
];

export default function TemplateBuilder() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateStyle | null>(null);
  const [resumeData, setResumeData] = useState<ResumeData>({
    contact: { name: "", email: "", phone: "", location: "", linkedin: "" },
    summary: "",
    experience: [],
    education: [],
    skills: [],
  });
  const [skillInput, setSkillInput] = useState("");
  const [showPreview, setShowPreview] = useState(true);

  // Check for data from Upload page on mount
  useEffect(() => {
    const storedData = sessionStorage.getItem('templateBuilderData');
    if (storedData) {
      try {
        const { content, name } = JSON.parse(storedData);
        if (content) {
          // Parse the content into structured data
          const parsed = parseResumeContent(content);
          setResumeData(parsed);
          sessionStorage.removeItem('templateBuilderData');
          
          toast({
            title: "✓ Resume Loaded",
            description: `Content from "${name}" loaded. Choose a template to continue.`,
          });
        }
      } catch (e) {
        console.error('Error parsing stored resume data:', e);
      }
    }
  }, [toast]);

  // Parse raw text into resume data structure
  const parseResumeContent = (text: string): ResumeData => {
    const data: ResumeData = {
      contact: { name: "", email: "", phone: "", location: "", linkedin: "" },
      summary: "",
      experience: [],
      education: [],
      skills: [],
    };

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
    const locationMatch = text.match(/([A-Z][a-z]+,\s*[A-Z]{2})/);
    if (locationMatch) data.contact.location = locationMatch[0];
    
    // Find sections and extract content
    let currentSection = '';
    const sectionContent: { [key: string]: string[] } = {
      summary: [], skills: []
    };
    
    for (const line of lines) {
      const lower = line.toLowerCase();
      if (lower.includes('summary') || lower.includes('objective') || lower.includes('profile')) {
        currentSection = 'summary';
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

  const handleTemplateSelect = (templateId: TemplateStyle) => {
    setSelectedTemplate(templateId);
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
      description: "",
    };
    setResumeData((prev) => ({ ...prev, experience: [...prev.experience, newExp] }));
  };

  const updateExperience = (id: string, field: keyof Experience, value: any) => {
    setResumeData((prev) => ({
      ...prev,
      experience: prev.experience.map((exp) =>
        exp.id === id ? { ...exp, [field]: value } : exp
      ),
    }));
  };

  const removeExperience = (id: string) => {
    setResumeData((prev) => ({
      ...prev,
      experience: prev.experience.filter((exp) => exp.id !== id),
    }));
  };

  const addEducation = () => {
    const newEdu: Education = {
      id: Date.now().toString(),
      degree: "",
      school: "",
      location: "",
      graduationDate: "",
      gpa: "",
    };
    setResumeData((prev) => ({ ...prev, education: [...prev.education, newEdu] }));
  };

  const updateEducation = (id: string, field: keyof Education, value: string) => {
    setResumeData((prev) => ({
      ...prev,
      education: prev.education.map((edu) =>
        edu.id === id ? { ...edu, [field]: value } : edu
      ),
    }));
  };

  const removeEducation = (id: string) => {
    setResumeData((prev) => ({
      ...prev,
      education: prev.education.filter((edu) => edu.id !== id),
    }));
  };

  const addSkill = () => {
    if (skillInput.trim()) {
      setResumeData((prev) => ({
        ...prev,
        skills: [...prev.skills, skillInput.trim()],
      }));
      setSkillInput("");
    }
  };

  const removeSkill = (index: number) => {
    setResumeData((prev) => ({
      ...prev,
      skills: prev.skills.filter((_, i) => i !== index),
    }));
  };

  const handleNext = () => {
    if (currentStep === 0 && !selectedTemplate) {
      toast({
        title: "Select a template",
        description: "Please choose a template to continue",
        variant: "destructive",
      });
      return;
    }
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const saveToDatabase = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Sign in required",
          description: "Please sign in to save your resume.",
          variant: "destructive",
        });
        return;
      }

      const resumeContent = JSON.stringify(resumeData);
      const template = TEMPLATES.find((t) => t.id === selectedTemplate);
      
      const { error } = await supabase.from('resumes').insert({
        user_id: user.id,
        name: `${resumeData.contact.name || 'Untitled'} - ${template?.title || 'Template'}`,
        content: resumeContent,
        file_type: selectedTemplate || 'template',
      });

      if (error) throw error;

      toast({
        title: "Resume saved!",
        description: "Your template resume has been saved to your database.",
      });
    } catch (error) {
      console.error("Error saving resume:", error);
      toast({
        title: "Save failed",
        description: "Could not save resume to database.",
        variant: "destructive",
      });
    }
  };

  const generatePDF = () => {
    const doc = new jsPDF();
    const margin = 20;
    let y = margin;
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;

    const template = TEMPLATES.find((t) => t.id === selectedTemplate);
    
    // Apply template-specific styling
    if (selectedTemplate === "modern1") {
      // Modern Blue Template
      doc.setFillColor(37, 99, 235);
      doc.rect(0, 0, 4, pageHeight, "F");
      
      doc.setFontSize(24);
      doc.setFont("helvetica", "bold");
      doc.text(resumeData.contact.name || "Your Name", margin, y);
      y += 8;
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text([resumeData.contact.email, resumeData.contact.phone, resumeData.contact.location].filter(Boolean).join(" | "), margin, y);
      y += 12;

      const addSection = (title: string) => {
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(37, 99, 235);
        doc.text(title.toUpperCase(), margin, y);
        y += 2;
        doc.setDrawColor(37, 99, 235);
        doc.setLineWidth(0.5);
        doc.line(margin, y, pageWidth - margin, y);
        y += 6;
        doc.setTextColor(0, 0, 0);
        doc.setFont("helvetica", "normal");
      };

      if (resumeData.summary) {
        addSection("Professional Summary");
        doc.setFontSize(10);
        const summaryLines = doc.splitTextToSize(resumeData.summary, pageWidth - 2 * margin);
        summaryLines.forEach((line: string) => {
          doc.text(line, margin, y);
          y += 5;
        });
        y += 5;
      }

      if (resumeData.experience.length > 0) {
        addSection("Experience");
        resumeData.experience.forEach((exp) => {
          doc.setFontSize(11);
          doc.setFont("helvetica", "bold");
          doc.text(`${exp.title} | ${exp.company}`, margin, y);
          y += 5;
          doc.setFontSize(9);
          doc.setFont("helvetica", "normal");
          doc.text(`${exp.startDate} - ${exp.current ? "Present" : exp.endDate} | ${exp.location}`, margin, y);
          y += 5;
          const descLines = doc.splitTextToSize(exp.description, pageWidth - 2 * margin);
          descLines.forEach((line: string) => {
            if (y > pageHeight - margin) {
              doc.addPage();
              y = margin;
            }
            doc.text(line, margin, y);
            y += 4;
          });
          y += 3;
        });
        y += 3;
      }

      if (resumeData.education.length > 0) {
        if (y > pageHeight - 40) {
          doc.addPage();
          y = margin;
        }
        addSection("Education");
        resumeData.education.forEach((edu) => {
          doc.setFontSize(11);
          doc.setFont("helvetica", "bold");
          doc.text(`${edu.degree}`, margin, y);
          y += 5;
          doc.setFontSize(9);
          doc.setFont("helvetica", "normal");
          doc.text(`${edu.school} | ${edu.graduationDate}`, margin, y);
          if (edu.gpa) {
            y += 4;
            doc.text(`GPA: ${edu.gpa}`, margin, y);
          }
          y += 5;
        });
        y += 3;
      }

      if (resumeData.skills.length > 0) {
        if (y > pageHeight - 30) {
          doc.addPage();
          y = margin;
        }
        addSection("Skills");
        doc.setFontSize(10);
        doc.text(resumeData.skills.join(", "), margin, y);
      }
    } else if (selectedTemplate === "professional") {
      // Professional Classic Template
      doc.setFontSize(22);
      doc.setFont("times", "bold");
      const nameWidth = doc.getTextWidth(resumeData.contact.name || "YOUR NAME");
      doc.text((resumeData.contact.name || "YOUR NAME").toUpperCase(), (pageWidth - nameWidth) / 2, y);
      y += 2;
      
      doc.setLineWidth(1);
      doc.line(margin, y, pageWidth - margin, y);
      y += 5;
      
      doc.setFontSize(9);
      doc.setFont("times", "normal");
      const contactLine = [resumeData.contact.email, resumeData.contact.phone, resumeData.contact.location].filter(Boolean).join(" • ");
      const contactWidth = doc.getTextWidth(contactLine);
      doc.text(contactLine, (pageWidth - contactWidth) / 2, y);
      y += 10;

      const addSection = (title: string) => {
        doc.setFontSize(11);
        doc.setFont("times", "bold");
        doc.text(title.toUpperCase(), margin, y);
        y += 2;
        doc.setLineWidth(0.3);
        doc.line(margin, y, pageWidth - margin, y);
        y += 5;
        doc.setFont("times", "normal");
      };

      if (resumeData.summary) {
        addSection("Professional Summary");
        doc.setFontSize(10);
        const summaryLines = doc.splitTextToSize(resumeData.summary, pageWidth - 2 * margin);
        summaryLines.forEach((line: string) => {
          doc.text(line, margin, y);
          y += 5;
        });
        y += 5;
      }

      if (resumeData.experience.length > 0) {
        addSection("Professional Experience");
        resumeData.experience.forEach((exp) => {
          doc.setFontSize(11);
          doc.setFont("times", "bold");
          doc.text(exp.title, margin, y);
          doc.setFont("times", "normal");
          doc.setFontSize(9);
          const dateText = `${exp.startDate} - ${exp.current ? "Present" : exp.endDate}`;
          const dateWidth = doc.getTextWidth(dateText);
          doc.text(dateText, pageWidth - margin - dateWidth, y);
          y += 5;
          doc.setFont("times", "italic");
          doc.text(`${exp.company}, ${exp.location}`, margin, y);
          y += 5;
          doc.setFont("times", "normal");
          const descLines = doc.splitTextToSize(exp.description, pageWidth - 2 * margin - 5);
          descLines.forEach((line: string) => {
            if (y > pageHeight - margin) {
              doc.addPage();
              y = margin;
            }
            doc.text("• " + line, margin + 5, y);
            y += 4;
          });
          y += 4;
        });
        y += 2;
      }

      if (resumeData.education.length > 0) {
        if (y > pageHeight - 40) {
          doc.addPage();
          y = margin;
        }
        addSection("Education");
        resumeData.education.forEach((edu) => {
          doc.setFontSize(11);
          doc.setFont("times", "bold");
          doc.text(edu.degree, margin, y);
          doc.setFont("times", "normal");
          doc.setFontSize(9);
          const dateWidth = doc.getTextWidth(edu.graduationDate);
          doc.text(edu.graduationDate, pageWidth - margin - dateWidth, y);
          y += 5;
          doc.text(`${edu.school}, ${edu.location}`, margin, y);
          if (edu.gpa) {
            y += 4;
            doc.text(`GPA: ${edu.gpa}`, margin, y);
          }
          y += 6;
        });
        y += 2;
      }

      if (resumeData.skills.length > 0) {
        if (y > pageHeight - 30) {
          doc.addPage();
          y = margin;
        }
        addSection("Technical Skills");
        doc.setFontSize(10);
        doc.text(resumeData.skills.join(", "), margin, y);
      }
    } else {
      // Default/Creative templates - similar to modern1 but with different colors
      doc.setFontSize(24);
      doc.setFont("helvetica", "bold");
      doc.text(resumeData.contact.name || "Your Name", margin, y);
      y += 8;
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text([resumeData.contact.email, resumeData.contact.phone, resumeData.contact.location].filter(Boolean).join(" | "), margin, y);
      y += 12;

      if (resumeData.summary) {
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text("PROFESSIONAL SUMMARY", margin, y);
        y += 6;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        const summaryLines = doc.splitTextToSize(resumeData.summary, pageWidth - 2 * margin);
        summaryLines.forEach((line: string) => {
          doc.text(line, margin, y);
          y += 5;
        });
        y += 5;
      }

      if (resumeData.experience.length > 0) {
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text("EXPERIENCE", margin, y);
        y += 6;

        resumeData.experience.forEach((exp) => {
          doc.setFontSize(11);
          doc.setFont("helvetica", "bold");
          doc.text(`${exp.title} | ${exp.company}`, margin, y);
          y += 5;
          doc.setFontSize(9);
          doc.setFont("helvetica", "normal");
          doc.text(`${exp.startDate} - ${exp.current ? "Present" : exp.endDate} | ${exp.location}`, margin, y);
          y += 5;
          const descLines = doc.splitTextToSize(exp.description, pageWidth - 2 * margin);
          descLines.forEach((line: string) => {
            if (y > pageHeight - margin) {
              doc.addPage();
              y = margin;
            }
            doc.text(line, margin, y);
            y += 4;
          });
          y += 4;
        });
        y += 3;
      }

      if (resumeData.education.length > 0) {
        if (y > pageHeight - 40) {
          doc.addPage();
          y = margin;
        }
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text("EDUCATION", margin, y);
        y += 6;

        resumeData.education.forEach((edu) => {
          doc.setFontSize(11);
          doc.setFont("helvetica", "bold");
          doc.text(`${edu.degree} | ${edu.school}`, margin, y);
          y += 5;
          doc.setFontSize(9);
          doc.setFont("helvetica", "normal");
          doc.text(`${edu.graduationDate} | ${edu.location}`, margin, y);
          if (edu.gpa) {
            y += 4;
            doc.text(`GPA: ${edu.gpa}`, margin, y);
          }
          y += 6;
        });
        y += 3;
      }

      if (resumeData.skills.length > 0) {
        if (y > pageHeight - 30) {
          doc.addPage();
          y = margin;
        }
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text("SKILLS", margin, y);
        y += 6;
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text(resumeData.skills.join(", "), margin, y);
      }
    }

    doc.save(`resume-${template?.title || 'download'}.pdf`);
    toast({
      title: "Download started",
      description: "Your beautifully formatted resume is ready!",
    });
  };

  const renderStepContent = () => {
    const step = STEPS[currentStep];

    if (step.id === "template") {
      return (
        <div className="space-y-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-3">Choose Your Template</h2>
            <p className="text-muted-foreground">
              Select a design that matches your style and industry
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {TEMPLATES.map((template, index) => {
              const PreviewComponent = template.preview;
              const isSelected = selectedTemplate === template.id;
              
              return (
                <motion.div
                  key={template.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                  className="space-y-3"
                >
                  <Card
                    className={`p-4 cursor-pointer transition-all hover:shadow-elegant overflow-hidden h-[300px] ${
                      isSelected ? "ring-2 ring-primary shadow-elegant" : ""
                    }`}
                    onClick={() => handleTemplateSelect(template.id as TemplateStyle)}
                  >
                    <div className="h-full overflow-hidden">
                      <PreviewComponent />
                    </div>
                  </Card>
                  
                  <div className="text-center space-y-2">
                    <div className="flex items-center justify-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {template.category}
                      </Badge>
                      {isSelected && (
                        <Badge className="bg-primary text-xs">Selected</Badge>
                      )}
                    </div>
                    <h3 className="font-bold">{template.title}</h3>
                    <p className="text-xs text-muted-foreground">{template.description}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      );
    }

    if (step.id === "contact") {
      return (
        <div className="space-y-6 max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-3">Contact Information</h2>
            <p className="text-muted-foreground">Tell us how employers can reach you</p>
          </div>
          <div className="grid gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <User className="w-4 h-4" /> Full Name *
              </label>
              <Input
                placeholder="John Doe"
                value={resumeData.contact.name}
                onChange={(e) =>
                  setResumeData((prev) => ({
                    ...prev,
                    contact: { ...prev.contact, name: e.target.value },
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Mail className="w-4 h-4" /> Email *
              </label>
              <Input
                type="email"
                placeholder="john@example.com"
                value={resumeData.contact.email}
                onChange={(e) =>
                  setResumeData((prev) => ({
                    ...prev,
                    contact: { ...prev.contact, email: e.target.value },
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Phone className="w-4 h-4" /> Phone *
              </label>
              <Input
                placeholder="(555) 123-4567"
                value={resumeData.contact.phone}
                onChange={(e) =>
                  setResumeData((prev) => ({
                    ...prev,
                    contact: { ...prev.contact, phone: e.target.value },
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <MapPin className="w-4 h-4" /> Location *
              </label>
              <Input
                placeholder="New York, NY"
                value={resumeData.contact.location}
                onChange={(e) =>
                  setResumeData((prev) => ({
                    ...prev,
                    contact: { ...prev.contact, location: e.target.value },
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">LinkedIn (Optional)</label>
              <Input
                placeholder="linkedin.com/in/johndoe"
                value={resumeData.contact.linkedin}
                onChange={(e) =>
                  setResumeData((prev) => ({
                    ...prev,
                    contact: { ...prev.contact, linkedin: e.target.value },
                  }))
                }
              />
            </div>
          </div>
        </div>
      );
    }

    if (step.id === "summary") {
      return (
        <div className="space-y-6 max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-3">Professional Summary</h2>
            <p className="text-muted-foreground">
              Write a brief overview of your background and goals
            </p>
          </div>
          <Textarea
            placeholder="Results-driven professional with 5+ years of experience in..."
            className="min-h-[200px]"
            value={resumeData.summary}
            onChange={(e) =>
              setResumeData((prev) => ({ ...prev, summary: e.target.value }))
            }
          />
          <p className="text-sm text-muted-foreground">
            {resumeData.summary.length} characters
          </p>
        </div>
      );
    }

    if (step.id === "experience") {
      return (
        <div className="space-y-6 max-w-3xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-3">Work Experience</h2>
            <p className="text-muted-foreground">
              Add your relevant work history
            </p>
          </div>

          <div className="space-y-6">
            {resumeData.experience.map((exp, index) => (
              <Card key={exp.id} className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">Experience #{index + 1}</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeExperience(exp.id)}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
                <div className="grid gap-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Job Title</label>
                      <Input
                        placeholder="Software Engineer"
                        value={exp.title}
                        onChange={(e) =>
                          updateExperience(exp.id, "title", e.target.value)
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Company</label>
                      <Input
                        placeholder="Tech Corp"
                        value={exp.company}
                        onChange={(e) =>
                          updateExperience(exp.id, "company", e.target.value)
                        }
                      />
                    </div>
                  </div>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Start Date</label>
                      <Input
                        placeholder="Jan 2020"
                        value={exp.startDate}
                        onChange={(e) =>
                          updateExperience(exp.id, "startDate", e.target.value)
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">End Date</label>
                      <Input
                        placeholder="Present"
                        value={exp.endDate}
                        onChange={(e) =>
                          updateExperience(exp.id, "endDate", e.target.value)
                        }
                        disabled={exp.current}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Location</label>
                      <Input
                        placeholder="New York, NY"
                        value={exp.location}
                        onChange={(e) =>
                          updateExperience(exp.id, "location", e.target.value)
                        }
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id={`current-${exp.id}`}
                      checked={exp.current}
                      onChange={(e) =>
                        updateExperience(exp.id, "current", e.target.checked)
                      }
                      className="rounded"
                    />
                    <label htmlFor={`current-${exp.id}`} className="text-sm">
                      I currently work here
                    </label>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Description</label>
                    <Textarea
                      placeholder="• Achieved X by doing Y&#10;• Led team of Z..."
                      className="min-h-[120px]"
                      value={exp.description}
                      onChange={(e) =>
                        updateExperience(exp.id, "description", e.target.value)
                      }
                    />
                  </div>
                </div>
              </Card>
            ))}

            <Button onClick={addExperience} variant="outline" className="w-full">
              <Plus className="w-4 h-4 mr-2" />
              Add Experience
            </Button>
          </div>
        </div>
      );
    }

    if (step.id === "education") {
      return (
        <div className="space-y-6 max-w-3xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-3">Education</h2>
            <p className="text-muted-foreground">Add your educational background</p>
          </div>

          <div className="space-y-6">
            {resumeData.education.map((edu, index) => (
              <Card key={edu.id} className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">Education #{index + 1}</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeEducation(edu.id)}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
                <div className="grid gap-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Degree</label>
                      <Input
                        placeholder="Bachelor of Science in Computer Science"
                        value={edu.degree}
                        onChange={(e) =>
                          updateEducation(edu.id, "degree", e.target.value)
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">School</label>
                      <Input
                        placeholder="University Name"
                        value={edu.school}
                        onChange={(e) =>
                          updateEducation(edu.id, "school", e.target.value)
                        }
                      />
                    </div>
                  </div>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Graduation Date</label>
                      <Input
                        placeholder="May 2020"
                        value={edu.graduationDate}
                        onChange={(e) =>
                          updateEducation(edu.id, "graduationDate", e.target.value)
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Location</label>
                      <Input
                        placeholder="Boston, MA"
                        value={edu.location}
                        onChange={(e) =>
                          updateEducation(edu.id, "location", e.target.value)
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">GPA (Optional)</label>
                      <Input
                        placeholder="3.8/4.0"
                        value={edu.gpa}
                        onChange={(e) =>
                          updateEducation(edu.id, "gpa", e.target.value)
                        }
                      />
                    </div>
                  </div>
                </div>
              </Card>
            ))}

            <Button onClick={addEducation} variant="outline" className="w-full">
              <Plus className="w-4 h-4 mr-2" />
              Add Education
            </Button>
          </div>
        </div>
      );
    }

    if (step.id === "skills") {
      return (
        <div className="space-y-6 max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-3">Skills</h2>
            <p className="text-muted-foreground">
              Add your relevant skills and technologies
            </p>
          </div>

          <Card className="p-6">
            <div className="flex gap-2 mb-4">
              <Input
                placeholder="e.g., JavaScript, React, Python..."
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    addSkill();
                  }
                }}
              />
              <Button onClick={addSkill}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            <div className="flex flex-wrap gap-2">
              {resumeData.skills.map((skill, index) => (
                <Badge
                  key={index}
                  variant="secondary"
                  className="px-3 py-1 flex items-center gap-2"
                >
                  {skill}
                  <button onClick={() => removeSkill(index)}>
                    <Trash2 className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>

            {resumeData.skills.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">
                No skills added yet. Start adding your skills above.
              </p>
            )}
          </Card>
        </div>
      );
    }

    return null;
  };

  const renderLivePreview = () => {
    if (!selectedTemplate || currentStep === 0) return null;
    
    const PreviewComponent = TEMPLATES.find(t => t.id === selectedTemplate)?.preview;
    if (!PreviewComponent) return null;

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold flex items-center gap-2">
            <Eye className="w-4 h-4" />
            Live Preview
          </h3>
          <Badge className="bg-primary/10 text-primary">Auto-updating</Badge>
        </div>
        <Card className="p-6 bg-muted/30 overflow-hidden">
          <div className="scale-75 origin-top-left">
            <PreviewComponent />
          </div>
        </Card>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-background/95 backdrop-blur sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <button onClick={() => navigate("/dashboard")} className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center">
              <Layout className="w-4 h-4 text-white" />
            </div>
            <span className="text-xl font-bold">CareerCraft</span>
          </button>
          <div className="flex gap-2">
            {currentStep > 0 && selectedTemplate && (
              <Button variant="outline" onClick={() => setShowPreview(!showPreview)} size="sm">
                <Eye className="w-4 h-4 mr-2" />
                {showPreview ? "Hide" : "Show"} Preview
              </Button>
            )}
            <Button variant="ghost" onClick={() => navigate("/dashboard")}>
              Exit Builder
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Progress Steps */}
        <div className="max-w-6xl mx-auto mb-8">
          <div className="flex items-center justify-between">
            {STEPS.map((step, index) => {
              const Icon = step.icon;
              const isActive = index === currentStep;
              const isCompleted = index < currentStep;
              return (
                <div key={step.id} className="flex items-center flex-1">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                        isActive
                          ? "bg-primary text-primary-foreground shadow-elegant"
                          : isCompleted
                          ? "bg-primary/20 text-primary"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <span
                      className={`text-xs mt-2 hidden sm:block ${
                        isActive ? "font-semibold" : ""
                      }`}
                    >
                      {step.title}
                    </span>
                  </div>
                  {index < STEPS.length - 1 && (
                    <div
                      className={`flex-1 h-0.5 mx-2 transition-all ${
                        isCompleted ? "bg-primary" : "bg-muted"
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Main Content - Split View */}
        <div className={`grid ${showPreview && currentStep > 0 ? 'lg:grid-cols-2' : 'grid-cols-1'} gap-6 mb-8 max-w-6xl mx-auto`}>
          {/* Step Content */}
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <Card className="p-8">{renderStepContent()}</Card>
          </motion.div>

          {/* Live Preview Panel */}
          {showPreview && currentStep > 0 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="hidden lg:block sticky top-24 h-fit"
            >
              {renderLivePreview()}
            </motion.div>
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="max-w-6xl mx-auto flex justify-between">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 0}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>

          <div className="flex gap-3">
            {currentStep === STEPS.length - 1 && (
              <>
                <Button variant="outline" onClick={saveToDatabase} size="lg">
                  <Save className="w-4 h-4 mr-2" />
                  Save to Database
                </Button>
                <Button variant="hero" onClick={generatePDF} size="lg">
                  <Download className="w-4 h-4 mr-2" />
                  Download PDF
                </Button>
              </>
            )}
            {currentStep < STEPS.length - 1 && (
              <Button variant="hero" onClick={handleNext}>
                Next
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
