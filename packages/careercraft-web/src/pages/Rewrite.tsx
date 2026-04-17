import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Download,
  Copy,
  Sparkles,
  Check,
  Wand2,
  FileText,
  Zap,
  Upload,
  BarChart3,
  RefreshCw,
  Target,
  Brain,
  Loader2,
  ChevronRight,
  History,
  Save,
  FolderOpen,
  Briefcase,
  TrendingUp,
  Award,
  MessageSquare,
  Lightbulb,
  ArrowRight,
  PenLine,
  ListChecks,
  X,
  Layout,
  Mail,
  FileOutput,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useDropzone } from "react-dropzone";
import { rewriteBullet, autoFixFormatting, generateCoverLetter } from "@/lib/aiRewriter";
import { parseResumeWithAI, AIResumeData } from "@/lib/resumeParser";
import { supabase, SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "@/integrations/supabase/client";
import jsPDF from "jspdf";

type RewriteMode = "bullet" | "full" | "summary" | "achievements" | "keywords";

interface SavedResume {
  id: string;
  name: string;
  content: any;
  created_at: string;
}

export default function Rewrite() {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Core state
  const [resumeText, setResumeText] = useState("");
  const [optimizedText, setOptimizedText] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [selectedText, setSelectedText] = useState("");
  
  // UI state
  const [activeTab, setActiveTab] = useState("rewrite");
  const [rewriteMode, setRewriteMode] = useState<RewriteMode>("bullet");
  const [isRewriting, setIsRewriting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showJobDescDialog, setShowJobDescDialog] = useState(false);
  const [showLoadResumeDialog, setShowLoadResumeDialog] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  
  // Data state
  const [savedResumes, setSavedResumes] = useState<SavedResume[]>([]);
  const [rewriteHistory, setRewriteHistory] = useState<Array<{ original: string; rewritten: string; mode: string; timestamp: Date }>>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  // New features: Template, Cover Letter, Save
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [showCoverLetterDialog, setShowCoverLetterDialog] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState("modern1");
  const [coverLetter, setCoverLetter] = useState("");
  const [isGeneratingCoverLetter, setIsGeneratingCoverLetter] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveName, setSaveName] = useState("");

  // Load from session storage
  useEffect(() => {
    const storedResume = sessionStorage.getItem("resumeText");
    const storedJob = sessionStorage.getItem("jobDescription");

    if (storedResume) {
      setResumeText(storedResume);
      setOptimizedText(storedResume);
    }
    if (storedJob) {
      setJobDescription(storedJob);
    }
  }, []);

  // Dropzone for file upload
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setIsLoading(true);
    setUploadProgress(10);

    try {
      const parsed = await parseResumeWithAI(file, (progress) => {
        setUploadProgress(progress);
      });
      
      // Convert to text
      const text = aiDataToText(parsed);
      setResumeText(text);
      setOptimizedText(text);
      setShowUploadDialog(false);
      
      toast({
        title: "✓ Resume Parsed",
        description: `Extracted ${parsed.experience?.length || 0} jobs, ${parsed.skills?.length || 0} skills`,
      });
    } catch (error) {
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Could not parse file",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setUploadProgress(0);
    }
  }, [toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt'],
    },
    maxFiles: 1,
  });

  // Convert AI data to readable text
  const aiDataToText = (data: AIResumeData): string => {
    let text = "";
    
    if (data.contact?.name) text += `${data.contact.name}\n`;
    if (data.contact?.email) text += `${data.contact.email}`;
    if (data.contact?.phone) text += ` | ${data.contact.phone}`;
    if (data.contact?.location) text += ` | ${data.contact.location}`;
    text += "\n\n";
    
    if (data.summary) {
      text += `PROFESSIONAL SUMMARY\n${data.summary}\n\n`;
    }
    
    if (data.experience?.length) {
      text += "EXPERIENCE\n";
      data.experience.forEach(exp => {
        text += `${exp.title} at ${exp.company}\n`;
        text += `${exp.startDate} - ${exp.endDate || 'Present'}\n`;
        exp.bullets?.forEach(b => {
          text += `• ${b}\n`;
        });
        text += "\n";
      });
    }
    
    if (data.education?.length) {
      text += "EDUCATION\n";
      data.education.forEach(edu => {
        text += `${edu.degree} - ${edu.school}\n`;
        if (edu.graduationDate) text += `Graduated: ${edu.graduationDate}\n`;
        text += "\n";
      });
    }
    
    if (data.skills?.length) {
      text += `SKILLS\n${data.skills.join(", ")}\n`;
    }
    
    return text;
  };

  // Load saved resumes
  const loadSavedResumes = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({ title: "Please log in", variant: "destructive" });
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
      toast({ title: "Failed to load resumes", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  // Load a specific resume
  const loadSelectedResume = (resume: SavedResume) => {
    try {
      let content = resume.content;
      if (typeof content === 'string') {
        content = JSON.parse(content);
      }
      
      // Convert structured data to text
      let text = "";
      if (content.contact) {
        text += `${content.contact.name || ''}\n`;
        text += `${content.contact.email || ''} | ${content.contact.phone || ''} | ${content.contact.location || ''}\n\n`;
      }
      if (content.summary) text += `SUMMARY\n${content.summary}\n\n`;
      if (content.experience?.length) {
        text += "EXPERIENCE\n";
        content.experience.forEach((exp: any) => {
          text += `${exp.title} at ${exp.company}\n${exp.startDate} - ${exp.endDate}\n`;
          exp.bullets?.forEach((b: string) => text += `• ${b}\n`);
          text += "\n";
        });
      }
      if (content.skills?.length) {
        text += `SKILLS\n${content.skills.join(", ")}\n`;
      }
      
      setResumeText(text);
      setOptimizedText(text);
      setShowLoadResumeDialog(false);
      
      toast({ title: "✓ Resume Loaded", description: `Loaded "${resume.name}"` });
    } catch (error) {
      toast({ title: "Failed to load resume", variant: "destructive" });
    }
  };

  // Handle text selection
  const handleTextSelect = () => {
    const selection = window.getSelection();
    const text = selection?.toString().trim();
    if (text && text.length > 10) {
      setSelectedText(text);
    }
  };

  // Rewrite modes configuration
  const REWRITE_MODES = [
    { id: "bullet", label: "Bullet Points", icon: ListChecks, description: "Rewrite individual achievements" },
    { id: "full", label: "Full Rewrite", icon: Wand2, description: "Optimize entire resume" },
    { id: "summary", label: "Summary", icon: PenLine, description: "Generate professional summary" },
    { id: "achievements", label: "Achievements", icon: Award, description: "Add metrics & impact" },
    { id: "keywords", label: "Keywords", icon: Target, description: "Inject job keywords" },
  ];

  // Main rewrite handler
  const handleRewrite = async () => {
    if (rewriteMode === "bullet" && !selectedText) {
      toast({
        title: "No Text Selected",
        description: "Select a bullet point or sentence to rewrite.",
        variant: "destructive",
      });
      return;
    }

    if (!jobDescription.trim()) {
      setShowJobDescDialog(true);
      return;
    }

    setIsRewriting(true);

    try {
      let rewritten = "";
      const textToRewrite = rewriteMode === "bullet" ? selectedText : optimizedText;
      
      // Use the rewrite-resume edge function with different types
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/rewrite-resume`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            text: textToRewrite,
            jobDescription,
            type: rewriteMode === "bullet" ? "bullet" : rewriteMode,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Rewrite failed");
      }

      const data = await response.json();
      rewritten = data.rewrittenText;

      // Add to history
      setRewriteHistory(prev => [{
        original: textToRewrite.substring(0, 100) + (textToRewrite.length > 100 ? "..." : ""),
        rewritten: rewritten.substring(0, 100) + (rewritten.length > 100 ? "..." : ""),
        mode: rewriteMode,
        timestamp: new Date(),
      }, ...prev].slice(0, 20));

      // Update text
      if (rewriteMode === "bullet") {
        setOptimizedText(optimizedText.replace(selectedText, rewritten));
      } else {
        setOptimizedText(rewritten);
      }

      toast({
        title: "✓ Rewrite Complete!",
        description: `${REWRITE_MODES.find(m => m.id === rewriteMode)?.label} optimization applied.`,
      });
    } catch (error) {
      toast({
        title: "Rewrite Failed",
        description: error instanceof Error ? error.message : "Could not optimize the text.",
        variant: "destructive",
      });
    } finally {
      setIsRewriting(false);
      setSelectedText("");
    }
  };

  // Copy to clipboard
  const handleCopy = () => {
    navigator.clipboard.writeText(optimizedText);
    setCopied(true);
    toast({ title: "✓ Copied to clipboard" });
    setTimeout(() => setCopied(false), 2000);
  };

  // Download as PDF
  const handleDownloadPDF = () => {
    const doc = new jsPDF();
    const margin = 20;
    const lineHeight = 7;
    const pageHeight = doc.internal.pageSize.height;
    let yPosition = margin;

    const lines = doc.splitTextToSize(optimizedText, doc.internal.pageSize.width - 2 * margin);

    lines.forEach((line: string) => {
      if (yPosition + lineHeight > pageHeight - margin) {
        doc.addPage();
        yPosition = margin;
      }
      doc.text(line, margin, yPosition);
      yPosition += lineHeight;
    });

    doc.save("optimized-resume.pdf");
    toast({ title: "✓ PDF Downloaded" });
  };

  // Reset to original
  const handleReset = () => {
    setOptimizedText(resumeText);
    setRewriteHistory([]);
    toast({ title: "✓ Reset to original" });
  };

  // Template options
  const TEMPLATES = [
    { id: "modern1", name: "Modern Blue", color: "from-blue-500 to-cyan-500" },
    { id: "modern2", name: "Modern Minimal", color: "from-slate-500 to-slate-700" },
    { id: "professional", name: "Professional", color: "from-gray-700 to-gray-900" },
    { id: "creative1", name: "Creative Bold", color: "from-purple-500 to-pink-500" },
    { id: "creative2", name: "Creative Gradient", color: "from-orange-500 to-red-500" },
  ];

  // State for AI parsing when loading into template
  const [isParsingForTemplate, setIsParsingForTemplate] = useState(false);

  // Load into template (navigate to builder) - uses AI parsing for better results
  const handleLoadIntoTemplate = async () => {
    if (!optimizedText) {
      toast({ title: "No resume to load", variant: "destructive" });
      return;
    }
    
    setIsParsingForTemplate(true);
    
    try {
      // Use AI to parse the optimized text into structured data
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/parse-resume`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ rawText: optimizedText }),
        }
      );

      if (!response.ok) {
        throw new Error("AI parsing failed");
      }

      const result = await response.json();
      
      if (result.data) {
        console.log('📤 AI Parsed for Builder:', {
          name: result.data.contact?.name,
          experienceCount: result.data.experience?.length,
          skillsCount: result.data.skills?.length,
          template: selectedTemplate
        });
        
        // Store the AI-parsed structured data
        sessionStorage.setItem('atsResumeData', JSON.stringify(result.data));
        sessionStorage.setItem('rewriteJobDescription', jobDescription);
        sessionStorage.setItem('rewriteTemplate', selectedTemplate);
        
        setShowTemplateDialog(false);
        toast({ title: "✓ Resume parsed with AI" });
        navigate(`/builder?from=ats&template=${selectedTemplate}`);
      } else {
        throw new Error("No data returned");
      }
    } catch (error) {
      console.error('AI parsing failed, using text fallback:', error);
      // Fallback to text-based loading
      sessionStorage.setItem('rewriteOptimizedText', optimizedText);
      sessionStorage.setItem('rewriteJobDescription', jobDescription);
      sessionStorage.setItem('rewriteTemplate', selectedTemplate);
      
      setShowTemplateDialog(false);
      toast({ title: "Loading resume...", description: "Using basic parsing" });
      navigate(`/builder?from=rewrite&template=${selectedTemplate}`);
    } finally {
      setIsParsingForTemplate(false);
    }
  };

  // Generate cover letter
  const handleGenerateCoverLetter = async () => {
    if (!optimizedText || !jobDescription) {
      toast({ title: "Need resume and job description", variant: "destructive" });
      return;
    }
    
    setIsGeneratingCoverLetter(true);
    setCoverLetter("");
    
    try {
      const letter = await generateCoverLetter(optimizedText, jobDescription, "professional");
      setCoverLetter(letter);
      setShowCoverLetterDialog(true);
      toast({ title: "✓ Cover letter generated!" });
    } catch (error) {
      toast({ title: "Generation failed", variant: "destructive" });
    } finally {
      setIsGeneratingCoverLetter(false);
    }
  };

  // Save to My Resumes
  const handleSaveResume = async () => {
    if (!saveName.trim()) {
      toast({ title: "Please enter a name", variant: "destructive" });
      return;
    }
    
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({ title: "Please log in", variant: "destructive" });
        return;
      }

      const { error } = await supabase.from('resumes').insert({
        user_id: user.id,
        name: saveName,
        content: optimizedText,
        file_type: 'rewrite',
      });

      if (error) throw error;
      
      setShowSaveDialog(false);
      setSaveName("");
      toast({ title: "✓ Resume saved!", description: "View in My Resumes" });
    } catch (error) {
      toast({ title: "Save failed", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  // Save cover letter
  const handleSaveCoverLetter = async () => {
    if (!coverLetter) return;
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({ title: "Please log in", variant: "destructive" });
        return;
      }

      const { error } = await supabase.from('cover_letters').insert({
        user_id: user.id,
        content: coverLetter,
        job_description: jobDescription,
        tone: 'professional',
      });

      if (error) throw error;
      toast({ title: "✓ Cover letter saved!" });
    } catch (error) {
      toast({ title: "Save failed", variant: "destructive" });
    }
  };

  // Download cover letter as PDF
  const handleDownloadCoverLetterPDF = () => {
    const doc = new jsPDF();
    const margin = 20;
    const lineHeight = 7;
    const pageHeight = doc.internal.pageSize.height;
    let yPosition = margin;

    const lines = doc.splitTextToSize(coverLetter, doc.internal.pageSize.width - 2 * margin);

    lines.forEach((line: string) => {
      if (yPosition + lineHeight > pageHeight - margin) {
        doc.addPage();
        yPosition = margin;
      }
      doc.text(line, margin, yPosition);
      yPosition += lineHeight;
    });

    doc.save("cover-letter.pdf");
    toast({ title: "✓ Cover letter downloaded" });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/10">
      {/* Header */}
      <header className="border-b border-border bg-background/95 backdrop-blur sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <button onClick={() => navigate("/dashboard")} className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center">
              <Wand2 className="w-4 h-4 text-white" />
            </div>
            <span className="text-xl font-bold">CareerCraft</span>
          </button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate("/analysis")}>
              <BarChart3 className="w-4 h-4 mr-2" />
              View Analysis
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        <div className="max-w-7xl mx-auto">
          {/* Hero + Quick Actions */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                  <Wand2 className="w-5 h-5 text-white" />
                </div>
                AI Resume Rewriter
              </h1>
              <p className="text-muted-foreground mt-1">
                Transform your resume with AI-powered optimization
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowUploadDialog(true)}>
                <Upload className="w-4 h-4 mr-2" />
                Upload
              </Button>
              <Button variant="outline" size="sm" onClick={loadSavedResumes} disabled={isLoading}>
                <FolderOpen className="w-4 h-4 mr-2" />
                My Resumes
              </Button>
              <Button 
                variant={jobDescription ? "default" : "outline"} 
                size="sm" 
                onClick={() => setShowJobDescDialog(true)}
              >
                <Briefcase className="w-4 h-4 mr-2" />
                {jobDescription ? "Job Added ✓" : "Add Job"}
              </Button>
            </div>
          </div>

          {/* No Resume State */}
          {!resumeText && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="p-12 text-center border-2 border-dashed">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center mx-auto mb-4">
                  <Wand2 className="w-8 h-8 text-purple-500" />
                </div>
                <h2 className="text-2xl font-bold mb-2">Start Optimizing Your Resume</h2>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  Upload a resume or load from your saved resumes to begin AI-powered optimization
                </p>
                <div className="flex flex-wrap justify-center gap-3">
                  <Button onClick={() => setShowUploadDialog(true)}>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Resume
                  </Button>
                  <Button variant="outline" onClick={loadSavedResumes}>
                    <FolderOpen className="w-4 h-4 mr-2" />
                    Load from My Resumes
                  </Button>
                </div>
              </Card>
            </motion.div>
          )}

          {/* Main Content - Only show when resume exists */}
          {resumeText && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              {/* Rewrite Mode Selector */}
              <Card className="p-4 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Brain className="w-5 h-5 text-purple-500" />
                    AI Rewrite Mode
                  </h3>
                  {rewriteHistory.length > 0 && (
                    <Button variant="ghost" size="sm" onClick={handleReset}>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Reset ({rewriteHistory.length} changes)
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                  {REWRITE_MODES.map((mode) => {
                    const Icon = mode.icon;
                    return (
                      <button
                        key={mode.id}
                        onClick={() => setRewriteMode(mode.id as RewriteMode)}
                        className={`p-3 rounded-lg border-2 transition-all text-left ${
                          rewriteMode === mode.id
                            ? "border-purple-500 bg-purple-500/10"
                            : "border-transparent bg-muted/50 hover:bg-muted"
                        }`}
                      >
                        <Icon className={`w-5 h-5 mb-1 ${rewriteMode === mode.id ? "text-purple-500" : "text-muted-foreground"}`} />
                        <p className="font-medium text-sm">{mode.label}</p>
                        <p className="text-xs text-muted-foreground">{mode.description}</p>
                      </button>
                    );
                  })}
                </div>
              </Card>

              {/* Editor Grid */}
              <div className="grid lg:grid-cols-2 gap-6 mb-6">
                {/* Original Resume */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="font-semibold flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      Original Resume
                    </h2>
                    <Badge variant="secondary">Reference</Badge>
                  </div>
                  <Card className="relative">
                    <ScrollArea className="h-[500px]">
                      <pre className="p-4 text-sm whitespace-pre-wrap font-sans text-muted-foreground">
                        {resumeText || "No resume loaded"}
                      </pre>
                    </ScrollArea>
                  </Card>
                </div>

                {/* Optimized Resume */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="font-semibold flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-purple-500" />
                      AI-Optimized Resume
                    </h2>
                    <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">
                      {rewriteHistory.length > 0 ? `${rewriteHistory.length} optimizations` : "Editable"}
                    </Badge>
                  </div>
                  <Card className="relative">
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 to-pink-500" />
                    <Textarea
                      value={optimizedText}
                      onChange={(e) => setOptimizedText(e.target.value)}
                      onMouseUp={handleTextSelect}
                      className="h-[500px] resize-none border-0 rounded-t-none focus-visible:ring-0 font-mono text-sm"
                      placeholder="Your optimized resume will appear here..."
                    />
                  </Card>
                </div>
              </div>

              {/* Action Bar */}
              <Card className="p-4 bg-gradient-to-r from-purple-500/5 to-pink-500/5 border-purple-500/20">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    {selectedText ? (
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="max-w-xs truncate">
                          <Check className="w-3 h-3 mr-1" />
                          "{selectedText.substring(0, 40)}..."
                        </Badge>
                        <Button variant="ghost" size="sm" onClick={() => setSelectedText("")}>
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        {rewriteMode === "bullet" 
                          ? "Select text in the optimized resume to rewrite" 
                          : `Click "Rewrite" to apply ${REWRITE_MODES.find(m => m.id === rewriteMode)?.label} optimization`}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="hero"
                      onClick={handleRewrite}
                      disabled={isRewriting || (rewriteMode === "bullet" && !selectedText)}
                    >
                      {isRewriting ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Rewriting...
                        </>
                      ) : (
                        <>
                          <Wand2 className="w-4 h-4 mr-2" />
                          {rewriteMode === "bullet" ? "Rewrite Selected" : `Apply ${REWRITE_MODES.find(m => m.id === rewriteMode)?.label}`}
                        </>
                      )}
                    </Button>
                    <Button variant="outline" onClick={handleCopy}>
                      {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                      {copied ? "Copied!" : "Copy"}
                    </Button>
                    <Button variant="outline" onClick={handleDownloadPDF}>
                      <Download className="w-4 h-4 mr-2" />
                      PDF
                    </Button>
                  </div>
                </div>
              </Card>

              {/* Next Steps Card */}
              <Card className="mt-6 p-4 bg-gradient-to-r from-green-500/5 to-emerald-500/5 border-green-500/20">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-green-500" />
                  What's Next?
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Button
                    variant="outline"
                    className="h-auto py-4 flex-col gap-2"
                    onClick={() => setShowTemplateDialog(true)}
                  >
                    <Layout className="w-5 h-5 text-blue-500" />
                    <span className="text-sm">Load into Template</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-auto py-4 flex-col gap-2"
                    onClick={handleGenerateCoverLetter}
                    disabled={isGeneratingCoverLetter || !jobDescription}
                  >
                    {isGeneratingCoverLetter ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Mail className="w-5 h-5 text-purple-500" />
                    )}
                    <span className="text-sm">Generate Cover Letter</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-auto py-4 flex-col gap-2"
                    onClick={() => {
                      setSaveName("");
                      setShowSaveDialog(true);
                    }}
                  >
                    <Save className="w-5 h-5 text-green-500" />
                    <span className="text-sm">Save to My Resumes</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-auto py-4 flex-col gap-2"
                    onClick={() => navigate('/cover-letter')}
                  >
                    <FileOutput className="w-5 h-5 text-orange-500" />
                    <span className="text-sm">Cover Letter Editor</span>
                  </Button>
                </div>
              </Card>

              {/* History */}
              {rewriteHistory.length > 0 && (
                <Card className="mt-6 p-4">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <History className="w-4 h-4" />
                    Rewrite History
                  </h3>
                  <ScrollArea className="h-[200px]">
                    <div className="space-y-3">
                      {rewriteHistory.map((item, idx) => (
                        <div key={idx} className="p-3 bg-muted/50 rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline" className="text-xs">{item.mode}</Badge>
                            <span className="text-xs text-muted-foreground">
                              {item.timestamp.toLocaleTimeString()}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground line-through mb-1">{item.original}</p>
                          <p className="text-sm font-medium">{item.rewritten}</p>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </Card>
              )}
            </motion.div>
          )}
        </div>
      </div>

      {/* Upload Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Resume</DialogTitle>
            <DialogDescription>Upload a PDF, Word document, or text file</DialogDescription>
          </DialogHeader>
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragActive ? "border-purple-500 bg-purple-500/5" : "border-muted hover:border-purple-500/50"
            }`}
          >
            <input {...getInputProps()} />
            {isLoading ? (
              <div className="space-y-4">
                <Loader2 className="w-10 h-10 mx-auto animate-spin text-purple-500" />
                <Progress value={uploadProgress} className="w-48 mx-auto" />
                <p className="text-sm text-muted-foreground">Processing...</p>
              </div>
            ) : (
              <>
                <Upload className="w-10 h-10 mx-auto mb-4 text-muted-foreground" />
                <p className="font-medium mb-1">Drop your resume here</p>
                <p className="text-sm text-muted-foreground">PDF, DOCX, DOC, or TXT</p>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Load Resume Dialog */}
      <Dialog open={showLoadResumeDialog} onOpenChange={setShowLoadResumeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Load Saved Resume</DialogTitle>
            <DialogDescription>Select a resume from your library</DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[400px]">
            {savedResumes.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No saved resumes found</p>
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
                        <p className="font-medium">{resume.name}</p>
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
        </DialogContent>
      </Dialog>

      {/* Job Description Dialog */}
      <Dialog open={showJobDescDialog} onOpenChange={setShowJobDescDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Target Job Description</DialogTitle>
            <DialogDescription>
              Paste the job description to tailor your resume optimization
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Paste the job description here..."
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            className="min-h-[300px]"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowJobDescDialog(false)}>Cancel</Button>
            <Button onClick={() => {
              setShowJobDescDialog(false);
              if (jobDescription) toast({ title: "✓ Job description saved" });
            }}>
              <Check className="w-4 h-4 mr-2" />
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Template Selection Dialog */}
      <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Layout className="w-5 h-5" />
              Choose a Template
            </DialogTitle>
            <DialogDescription>
              Select a template to load your optimized resume into
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-3 py-4">
            {TEMPLATES.map((template) => (
              <button
                key={template.id}
                onClick={() => setSelectedTemplate(template.id)}
                className={`p-4 rounded-lg border-2 transition-all flex items-center gap-4 ${
                  selectedTemplate === template.id
                    ? "border-primary bg-primary/5"
                    : "border-transparent bg-muted/50 hover:bg-muted"
                }`}
              >
                <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${template.color}`} />
                <div className="text-left">
                  <p className="font-medium">{template.name}</p>
                  <p className="text-sm text-muted-foreground">Professional resume template</p>
                </div>
                {selectedTemplate === template.id && (
                  <Check className="w-5 h-5 text-primary ml-auto" />
                )}
              </button>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTemplateDialog(false)} disabled={isParsingForTemplate}>
              Cancel
            </Button>
            <Button onClick={handleLoadIntoTemplate} disabled={isParsingForTemplate}>
              {isParsingForTemplate ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Parsing with AI...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Open in Builder
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Save Resume Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Save className="w-5 h-5" />
              Save to My Resumes
            </DialogTitle>
            <DialogDescription>
              Save your optimized resume to access it later
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <label className="text-sm font-medium mb-2 block">Resume Name</label>
            <Input
              placeholder="e.g., Software Engineer - Optimized"
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveResume} disabled={isSaving || !saveName.trim()}>
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Save Resume
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cover Letter Dialog */}
      <Dialog open={showCoverLetterDialog} onOpenChange={setShowCoverLetterDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5" />
              Generated Cover Letter
            </DialogTitle>
            <DialogDescription>
              Review, edit, and save your AI-generated cover letter
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[400px]">
            <Textarea
              value={coverLetter}
              onChange={(e) => setCoverLetter(e.target.value)}
              className="min-h-[350px] font-mono text-sm"
            />
          </ScrollArea>
          <DialogFooter className="flex-wrap gap-2">
            <Button variant="outline" onClick={() => setShowCoverLetterDialog(false)}>Close</Button>
            <Button variant="outline" onClick={() => {
              navigator.clipboard.writeText(coverLetter);
              toast({ title: "✓ Copied to clipboard" });
            }}>
              <Copy className="w-4 h-4 mr-2" />
              Copy
            </Button>
            <Button variant="outline" onClick={handleDownloadCoverLetterPDF}>
              <Download className="w-4 h-4 mr-2" />
              Download PDF
            </Button>
            <Button onClick={handleSaveCoverLetter}>
              <Save className="w-4 h-4 mr-2" />
              Save to Library
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
