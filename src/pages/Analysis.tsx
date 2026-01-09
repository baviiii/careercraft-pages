import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useDropzone } from "react-dropzone";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  AlertCircle,
  CheckCircle2,
  TrendingUp,
  FileText,
  Sparkles,
  Wand2,
  Zap,
  Search,
  BarChart3,
  Target,
  Upload,
  AlertTriangle,
  XCircle,
  Lightbulb,
  RefreshCw,
  PenLine,
  Trophy,
  FileCheck,
  Copy,
  Check,
  ChevronRight,
  Star,
  BookOpen,
  BriefcaseIcon,
  Save,
  FolderPlus,
  ArrowRight,
  Plus,
  Briefcase,
  CircleDot,
  Layers,
  Settings2,
  LayoutGrid,
  ListChecks,
  FileOutput,
  Brain,
  Gauge,
  Shield,
  Pencil,
  Loader2,
  X,
} from "lucide-react";
import { parseResumeWithAI, parseResumeTextWithAI, AIResumeData } from "@/lib/resumeParser";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { runATSAIAnalysis, autoRewriteResume, rewriteExperienceSection, generateAchievements, generateSummaries, rewriteResumeStructured, ATSAIAnalysis } from "@/lib/atsAIAnalyzer";
import { generateCoverLetter } from "@/lib/aiRewriter";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

type AnalysisStep = "upload" | "analyzing" | "results";

interface SavedResume {
  id: string;
  name: string;
  content: any;
  created_at: string;
  template_id?: string;
}

export default function Analysis() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState<AnalysisStep>("upload");
  const [analysis, setAnalysis] = useState<ATSAIAnalysis | null>(null);
  const [fileName, setFileName] = useState("");
  const [resumeText, setResumeText] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeEnhancement, setActiveEnhancement] = useState<string | null>(null);
  const [enhancementResult, setEnhancementResult] = useState<string>("");
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [saveType, setSaveType] = useState<"original" | "enhanced">("original");
  const [saveName, setSaveName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [activeResultTab, setActiveResultTab] = useState("overview");
  const [savedResumes, setSavedResumes] = useState<SavedResume[]>([]);
  const [selectedResumeId, setSelectedResumeId] = useState<string>("");
  const [parsedResumeData, setParsedResumeData] = useState<AIResumeData | null>(null);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [resumeSource, setResumeSource] = useState<"upload" | "saved">("upload");
  
  // Cover letter generation states
  const [showCoverLetterPanel, setShowCoverLetterPanel] = useState(false);
  const [coverLetterTone, setCoverLetterTone] = useState<"professional" | "confident" | "casual">("professional");
  const [generatedCoverLetter, setGeneratedCoverLetter] = useState("");
  const [isGeneratingCoverLetter, setIsGeneratingCoverLetter] = useState(false);
  
  // Cover letter pairing for complete job readiness
  const [savedCoverLetters, setSavedCoverLetters] = useState<{id: string; content: string; created_at: string}[]>([]);
  const [selectedCoverLetterId, setSelectedCoverLetterId] = useState<string>("");
  const [coverLetterText, setCoverLetterText] = useState("");
  
  // Track if resume is from builder (has template)
  const [selectedResumeTemplateId, setSelectedResumeTemplateId] = useState<string | null>(null);
  const [isBuilderResume, setIsBuilderResume] = useState(false);
  
  // Enhanced resume data (structured) for builder resumes
  const [enhancedResumeData, setEnhancedResumeData] = useState<AIResumeData | null>(null);
  
  // Track if we're re-analyzing after enhancement
  const [isReanalyzing, setIsReanalyzing] = useState(false);

  useEffect(() => {
    const storedResume = sessionStorage.getItem("resumeText");
    const storedJob = sessionStorage.getItem("jobDescription");
    const storedFileName = sessionStorage.getItem("fileName");

    if (storedResume) setResumeText(storedResume);
    if (storedJob) setJobDescription(storedJob);
    if (storedFileName) setFileName(storedFileName);
  }, []);

  // Fetch saved resumes and cover letters
  useEffect(() => {
    const fetchSavedData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [resumesRes, coverLettersRes] = await Promise.all([
        supabase
          .from('resumes')
          .select('id, name, content, created_at, template_id')
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false }),
        supabase
          .from('cover_letters')
          .select('id, content, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
      ]);

      if (resumesRes.data) setSavedResumes(resumesRes.data as unknown as SavedResume[]);
      if (coverLettersRes.data) setSavedCoverLetters(coverLettersRes.data);
    };
    fetchSavedData();
  }, []);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setIsUploading(true);
    setResumeSource("upload");
    try {
      // Use AI parsing for better extraction
      const aiData = await parseResumeWithAI(file);
      setParsedResumeData(aiData);
      
      // Convert to text for analysis
      const text = formatResumeDataAsText(aiData);
      setResumeText(text);
      setFileName(file.name);
      setSelectedResumeId("");
      sessionStorage.setItem("resumeText", text);
      sessionStorage.setItem("fileName", file.name);
      toast({ title: "✓ Resume parsed with AI", description: "Now add a job description to analyze." });
    } catch (error) {
      toast({ title: "Upload failed", description: error instanceof Error ? error.message : "Could not parse file", variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  }, [toast]);

  // Handle selecting a saved resume
  const handleSelectSavedResume = (resumeId: string) => {
    const resume = savedResumes.find(r => r.id === resumeId);
    if (!resume) return;

    setSelectedResumeId(resumeId);
    setResumeSource("saved");
    setFileName(resume.name);

    // Parse content
    let content = resume.content;
    try {
      if (typeof content === 'string') {
        content = JSON.parse(content);
      }
    } catch (e) {
      // Plain text content
      setResumeText(content);
      setParsedResumeData(null);
      setIsBuilderResume(false);
      setSelectedResumeTemplateId(null);
      return;
    }

    // Check if it's a builder resume (has structured data with contact)
    if (content?.contact) {
      setParsedResumeData(content as AIResumeData);
      setResumeText(formatResumeDataAsText(content));
      // Check if resume has template_id (built with our builder)
      setIsBuilderResume(!!resume.template_id);
      setSelectedResumeTemplateId(resume.template_id || null);
    } else {
      setResumeText(JSON.stringify(content));
      setParsedResumeData(null);
      setIsBuilderResume(false);
      setSelectedResumeTemplateId(null);
    }
    
    toast({ 
      title: "Resume loaded", 
      description: resume.template_id 
        ? `"${resume.name}" loaded with template. Edit in Builder after analysis.`
        : `"${resume.name}" selected for analysis.`
    });
  };

  // Format AIResumeData as readable text for analysis
  const formatResumeDataAsText = (data: AIResumeData): string => {
    let text = '';
    
    if (data.contact) {
      text += `${data.contact.name || ''}\n`;
      text += `${data.contact.email || ''} | ${data.contact.phone || ''} | ${data.contact.location || ''}\n`;
      if (data.contact.linkedin) text += `${data.contact.linkedin}\n`;
      text += '\n';
    }
    
    if (data.summary) {
      text += `SUMMARY\n${data.summary}\n\n`;
    }
    
    if (data.experience?.length) {
      text += 'EXPERIENCE\n';
      data.experience.forEach(exp => {
        text += `${exp.title} at ${exp.company}\n`;
        text += `${exp.startDate} - ${exp.endDate}${exp.location ? ` | ${exp.location}` : ''}\n`;
        exp.bullets?.forEach(b => { text += `• ${b}\n`; });
        text += '\n';
      });
    }
    
    if (data.education?.length) {
      text += 'EDUCATION\n';
      data.education.forEach(edu => {
        text += `${edu.degree} - ${edu.school}\n`;
        text += `${edu.graduationDate}${edu.gpa ? ` | GPA: ${edu.gpa}` : ''}\n\n`;
      });
    }
    
    if (data.skills?.length) {
      text += `SKILLS\n${data.skills.join(', ')}\n`;
    }
    
    return text;
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "application/msword": [".doc"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
      "image/*": [".png", ".jpg", ".jpeg"],
    },
    maxFiles: 1,
  });

  const handleAnalyze = async () => {
    if (!resumeText || !jobDescription.trim()) {
      toast({ title: "Missing information", description: "Please provide both a resume and job description.", variant: "destructive" });
      return;
    }
    
    setStep("analyzing");
    setIsAnalyzing(true);
    sessionStorage.setItem("jobDescription", jobDescription);
    
    try {
      const result = await runATSAIAnalysis(resumeText, jobDescription);
      setAnalysis(result);
      setStep("results");
      
      // Save ATS score to the resume if it was loaded from saved resumes
      if (selectedResumeId) {
        await supabase.from('resumes').update({
          ats_score: result.overallScore,
          last_analyzed_at: new Date().toISOString(),
          last_job_description: jobDescription.substring(0, 500), // Store first 500 chars
        } as any).eq('id', selectedResumeId);
      }
      
      toast({ title: "Analysis complete", description: `Your ATS score is ${result.overallScore}/100` });
    } catch (error) {
      toast({ title: "Analysis failed", description: error instanceof Error ? error.message : "Could not analyze resume", variant: "destructive" });
      setStep("upload");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleEnhancement = async (type: string) => {
    if (!resumeText || !jobDescription) return;
    
    setActiveEnhancement(type);
    setEnhancementResult("");
    setEnhancedResumeData(null);
    
    try {
      // For builder resumes with auto-rewrite, use structured rewrite
      if (type === "auto-rewrite" && isBuilderResume && parsedResumeData) {
        const structuredResult = await rewriteResumeStructured(parsedResumeData, jobDescription);
        setEnhancedResumeData(structuredResult as AIResumeData);
        setEnhancementResult(""); // Clear text result since we have structured data
        toast({ 
          title: "✓ Resume optimized!", 
          description: "View the enhanced version below or apply to builder" 
        });
      } else {
        // Use text-based enhancement for uploaded resumes or other enhancement types
        let result = "";
        switch (type) {
          case "auto-rewrite":
            result = await autoRewriteResume(resumeText, jobDescription);
            break;
          case "rewrite-experience":
            result = await rewriteExperienceSection(resumeText, jobDescription);
            break;
          case "generate-achievements":
            result = await generateAchievements(resumeText, jobDescription);
            break;
          case "generate-summaries":
            result = await generateSummaries(resumeText, jobDescription);
            break;
        }
        setEnhancementResult(result);
        toast({ title: "Enhancement complete" });
      }
    } catch (error) {
      toast({ title: "Enhancement failed", description: error instanceof Error ? error.message : "Could not process request", variant: "destructive" });
      setActiveEnhancement(null);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(id);
    setTimeout(() => setCopiedText(null), 2000);
    toast({ title: "Copied to clipboard" });
  };

  // Apply enhancement and re-analyze with new content
  const applyEnhancementAndReanalyze = async () => {
    if (!enhancementResult && !enhancedResumeData) return;
    
    setIsReanalyzing(true);
    
    try {
      // Get the enhanced content
      let newResumeText = enhancementResult;
      
      // If we have structured data, convert to text for analysis
      if (enhancedResumeData) {
        newResumeText = formatResumeDataAsText(enhancedResumeData);
        setParsedResumeData(enhancedResumeData);
      }
      
      // Update the working resume text
      setResumeText(newResumeText);
      
      // Clear enhancement state
      setActiveEnhancement(null);
      setEnhancementResult("");
      setEnhancedResumeData(null);
      
      // Run new analysis
      toast({ title: "Re-analyzing...", description: "Checking your new ATS score" });
      
      const result = await runATSAIAnalysis(newResumeText, jobDescription);
      setAnalysis(result);
      
      // Update ATS score in database if saved resume
      if (selectedResumeId) {
        await supabase.from('resumes').update({
          ats_score: result.overallScore,
          last_analyzed_at: new Date().toISOString(),
        } as any).eq('id', selectedResumeId);
      }
      
      toast({ 
        title: `New ATS Score: ${result.overallScore}/100`, 
        description: result.overallScore >= 80 
          ? "Great score! Your resume is well-optimized." 
          : "Keep improving to reach 80+ for best results."
      });
    } catch (error) {
      toast({ title: "Re-analysis failed", variant: "destructive" });
    } finally {
      setIsReanalyzing(false);
    }
  };

  // Generate cover letter inline
  const handleGenerateCoverLetter = async () => {
    if (!resumeText || !jobDescription) {
      toast({ title: "Missing data", description: "Resume and job description required", variant: "destructive" });
      return;
    }
    
    setIsGeneratingCoverLetter(true);
    setGeneratedCoverLetter("");
    
    try {
      const letter = await generateCoverLetter(resumeText, jobDescription, coverLetterTone);
      setGeneratedCoverLetter(letter);
      toast({ title: "✓ Cover letter generated!", description: "Review and edit below" });
    } catch (error) {
      toast({ title: "Generation failed", description: error instanceof Error ? error.message : "Could not generate cover letter", variant: "destructive" });
    } finally {
      setIsGeneratingCoverLetter(false);
    }
  };

  // Save cover letter
  const saveCoverLetter = async () => {
    if (!generatedCoverLetter) return;
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({ title: "Not logged in", variant: "destructive" });
        return;
      }

      const { error } = await supabase.from('cover_letters').insert({
        user_id: user.id,
        content: generatedCoverLetter,
        job_description: jobDescription,
        tone: coverLetterTone,
        notes: `Generated from ATS Analysis - Score: ${analysis?.overallScore || 'N/A'}/100`,
      });

      if (error) throw error;
      toast({ title: "✓ Cover letter saved!", description: "View in Cover Letter library" });
    } catch (error) {
      toast({ title: "Save failed", variant: "destructive" });
    }
  };

  const openSaveDialog = (type: "original" | "enhanced") => {
    setSaveType(type);
    setSaveName(type === "original" ? fileName : `${fileName} (Enhanced)`);
    setSaveDialogOpen(true);
  };

  const saveToResumeManager = async () => {
    if (!saveName.trim()) {
      toast({ title: "Please enter a name", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({ title: "Please sign in", description: "You need to be signed in to save resumes.", variant: "destructive" });
        return;
      }

      const content = saveType === "enhanced" && enhancementResult ? enhancementResult : resumeText;
      
      // Parse the text content to structured data
      toast({ title: "Parsing resume...", description: "Converting to structured format" });
      
      let parsedData: AIResumeData | null = null;
      
      // If we already have parsed data, use it
      if (parsedResumeData && saveType === "original") {
        parsedData = parsedResumeData;
      } else {
        // Parse the text content using AI
        try {
          parsedData = await parseResumeTextWithAI(content);
        } catch (parseError) {
          console.error("Parse error:", parseError);
          parsedData = null;
        }
      }
      
      if (!parsedData || !parsedData.contact) {
        toast({ 
          title: "Could not parse resume", 
          description: "Opening in builder for manual editing",
          variant: "destructive" 
        });
        // Store raw text and redirect to builder anyway
        sessionStorage.setItem('atsResumeText', content);
        sessionStorage.setItem('atsResumeName', saveName);
        navigate('/builder?from=ats-text');
        return;
      }
      
      // Store parsed data and redirect to builder
      sessionStorage.setItem('atsResumeData', JSON.stringify(parsedData));
      sessionStorage.setItem('atsResumeName', saveName);
      sessionStorage.setItem('atsJobDescription', jobDescription);
      
      toast({ 
        title: "✓ Resume parsed!", 
        description: "Opening in Resume Builder to choose a template" 
      });
      
      setSaveDialogOpen(false);
      navigate('/builder?from=ats');
    } catch (error) {
      console.error("Error saving:", error);
      toast({ title: "Save failed", description: "Could not save resume", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleNewAnalysis = () => {
    setStep("upload");
    setAnalysis(null);
    setEnhancementResult("");
    setActiveEnhancement(null);
    setEnhancedResumeData(null);
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-500";
    if (score >= 60) return "text-yellow-500";
    return "text-red-500";
  };

  const getScoreGradient = (score: number) => {
    if (score >= 80) return "from-green-500 to-emerald-400";
    if (score >= 60) return "from-yellow-500 to-orange-400";
    return "from-red-500 to-pink-400";
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return "Excellent";
    if (score >= 60) return "Good";
    if (score >= 40) return "Needs Work";
    return "Poor";
  };

  // Upload Step
  if (step === "upload") {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b border-border bg-background/95 backdrop-blur sticky top-0 z-50">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <button onClick={() => navigate("/dashboard")} className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center">
                <FileText className="w-4 h-4 text-white" />
              </div>
              <span className="text-xl font-bold">CareerCraft</span>
            </button>
            <Button variant="outline" onClick={() => navigate("/builder")}>
              <FileText className="w-4 h-4 mr-2" />
              Resume Manager
            </Button>
          </div>
        </header>

        <div className="container mx-auto px-4 py-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-5xl mx-auto">
            {/* Hero Section */}
            <div className="text-center mb-10">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
                <Brain className="w-4 h-4" />
                Enterprise-Grade AI Analysis
              </div>
              <h1 className="text-4xl md:text-5xl font-bold mb-4">
                <span className="bg-gradient-hero bg-clip-text text-transparent">ATS Resume Analyzer</span>
              </h1>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Deep AI analysis with scoring, keyword extraction, red flags detection, writing quality assessment, and optimization tools
              </p>
            </div>

            {/* What You'll Get */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
              {[
                { icon: Gauge, label: "ATS Score", desc: "4 sub-scores" },
                { icon: Search, label: "Keyword Analysis", desc: "Gap detection" },
                { icon: Shield, label: "Red Flags", desc: "Issue detection" },
                { icon: Wand2, label: "AI Enhancement", desc: "Auto-optimize" },
              ].map((item, i) => (
                <Card key={i} className="p-4 text-center hover:border-primary/50 transition-all">
                  <item.icon className="w-8 h-8 mx-auto mb-2 text-primary" />
                  <p className="font-semibold text-sm">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </Card>
              ))}
            </div>

            {/* Upload Section */}
            <div className="grid lg:grid-cols-2 gap-6">
              <Card className="p-6 border-2">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">1</div>
                    Your Resume
                  </h3>
                  {resumeText && (
                    <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
                      <CheckCircle2 className="w-3 h-3 mr-1" /> Uploaded
                    </Badge>
                  )}
                </div>
                
                {resumeText ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                      <FileText className="w-5 h-5 text-green-500" />
                      <span className="text-sm font-medium flex-1 truncate">{fileName || "Resume uploaded"}</span>
                      <Badge variant="secondary" className="text-xs">
                        {resumeSource === "saved" ? "Saved" : "Uploaded"}
                      </Badge>
                    </div>
                    <ScrollArea className="h-32 rounded-lg border bg-muted/30 p-3">
                      <pre className="whitespace-pre-wrap font-sans text-xs text-muted-foreground">{resumeText.slice(0, 600)}...</pre>
                    </ScrollArea>
                    <Button variant="outline" size="sm" onClick={() => { setResumeText(""); setSelectedResumeId(""); setParsedResumeData(null); }} className="w-full">
                      Choose Different Resume
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Saved Resumes Selector */}
                    {savedResumes.length > 0 && (
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Select from My Resumes</Label>
                        <Select value={selectedResumeId} onValueChange={handleSelectSavedResume}>
                          <SelectTrigger>
                            <SelectValue placeholder="Choose a saved resume..." />
                          </SelectTrigger>
                          <SelectContent>
                            {savedResumes.map(resume => (
                              <SelectItem key={resume.id} value={resume.id}>
                                <div className="flex items-center gap-2">
                                  <FileText className="w-4 h-4" />
                                  <span>{resume.name}</span>
                                  {resume.template_id && (
                                    <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4">
                                      Template
                                    </Badge>
                                  )}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <div className="relative my-3">
                          <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t" />
                          </div>
                          <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-card px-2 text-muted-foreground">Or upload new</span>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Upload Zone */}
                    <div
                      {...getRootProps()}
                      className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                        isDragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/50"
                      }`}
                    >
                      <input {...getInputProps()} />
                      {isUploading ? (
                        <div className="py-4">
                          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                          <p className="text-sm text-muted-foreground">AI parsing resume...</p>
                        </div>
                      ) : (
                        <>
                          <Upload className="w-10 h-10 mx-auto mb-2 text-muted-foreground" />
                          <p className="font-medium text-sm mb-1">{isDragActive ? "Drop here" : "Upload resume"}</p>
                          <p className="text-xs text-muted-foreground">PDF, DOC, DOCX, TXT, or image</p>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </Card>

              <Card className="p-6 border-2">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">2</div>
                    Job Description
                  </h3>
                  {jobDescription && (
                    <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
                      <CheckCircle2 className="w-3 h-3 mr-1" /> Added
                    </Badge>
                  )}
                </div>
                <Textarea
                  placeholder="Paste the complete job description here for accurate analysis..."
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  className="min-h-[280px] resize-none"
                />
              </Card>
            </div>

            {/* Optional: Cover Letter Pairing */}
            <Card className="mt-6 p-6 border-2 border-dashed">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-sm font-bold">3</div>
                  Cover Letter (Optional)
                </h3>
                {coverLetterText && (
                  <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
                    <CheckCircle2 className="w-3 h-3 mr-1" /> Paired
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Pair a cover letter for complete job readiness analysis. We'll check if your cover letter complements your resume for this position.
              </p>
              
              {savedCoverLetters.length > 0 && (
                <div className="mb-4">
                  <Label className="text-sm mb-2 block">Select from saved cover letters</Label>
                  <Select 
                    value={selectedCoverLetterId} 
                    onValueChange={(id) => {
                      setSelectedCoverLetterId(id);
                      const cl = savedCoverLetters.find(c => c.id === id);
                      if (cl) setCoverLetterText(cl.content);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a cover letter..." />
                    </SelectTrigger>
                    <SelectContent>
                      {savedCoverLetters.map(cl => (
                        <SelectItem key={cl.id} value={cl.id}>
                          {new Date(cl.created_at).toLocaleDateString()} - {cl.content.substring(0, 40)}...
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              <Textarea
                placeholder="Or paste your cover letter here..."
                value={coverLetterText}
                onChange={(e) => {
                  setCoverLetterText(e.target.value);
                  setSelectedCoverLetterId("");
                }}
                className="min-h-[150px] resize-none"
              />
            </Card>

            <div className="mt-8 text-center space-y-4">
              <Button
                size="lg"
                variant="hero"
                onClick={handleAnalyze}
                disabled={!resumeText || !jobDescription.trim() || isAnalyzing}
                className="px-12 h-14 text-lg"
              >
                <Sparkles className="w-5 h-5 mr-2" />
                {coverLetterText ? "Run Complete Job Readiness Analysis" : "Run Deep ATS Analysis"}
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              <p className="text-sm text-muted-foreground">
                Analysis includes: ATS Score • Keyword Match • Writing Quality • Red Flags • AI Enhancement Tools
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  // Analyzing Step
  if (step === "analyzing") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center max-w-md mx-auto px-4">
          <div className="relative w-32 h-32 mx-auto mb-8">
            <div className="absolute inset-0 border-4 border-primary/20 rounded-full" />
            <div className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <Brain className="absolute inset-0 m-auto w-12 h-12 text-primary" />
          </div>
          <h2 className="text-2xl font-bold mb-4">Analyzing Your Resume</h2>
          <div className="space-y-3 text-sm text-muted-foreground">
            <div className="flex items-center justify-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-500" /> Extracting job requirements</div>
            <div className="flex items-center justify-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-500" /> Parsing resume content</div>
            <div className="flex items-center justify-center gap-2"><div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" /> Running AI analysis</div>
            <div className="flex items-center justify-center gap-2 opacity-50"><CircleDot className="w-4 h-4" /> Generating recommendations</div>
          </div>
        </motion.div>
      </div>
    );
  }

  // Results Step
  if (!analysis) return null;

  const resultTabs = [
    { id: "overview", icon: LayoutGrid, label: "Overview" },
    { id: "requirements", icon: BriefcaseIcon, label: "Job Requirements" },
    { id: "keywords", icon: Search, label: "Keywords" },
    { id: "quality", icon: FileCheck, label: "Writing Quality" },
    { id: "redflags", icon: AlertTriangle, label: "Red Flags" },
    { id: "improvements", icon: Lightbulb, label: "Improvements" },
    { id: "enhance", icon: Wand2, label: "AI Tools" },
    { id: "coverletter", icon: FileOutput, label: "Cover Letter" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-background/95 backdrop-blur sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <button onClick={() => navigate("/dashboard")} className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center">
              <FileText className="w-4 h-4 text-white" />
            </div>
            <span className="text-xl font-bold">CareerCraft</span>
          </button>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleNewAnalysis}>
              <RefreshCw className="w-4 h-4 mr-2" />
              New
            </Button>
            <Button variant="outline" size="sm" onClick={() => openSaveDialog("original")}>
              <Save className="w-4 h-4 mr-2" />
              Save
            </Button>
            <Button variant="outline" size="sm" onClick={() => {
              sessionStorage.setItem('atsResumeText', resumeText);
              sessionStorage.setItem('atsJobDescription', jobDescription);
              if (selectedResumeId) {
                sessionStorage.setItem('atsResumeId', selectedResumeId);
                const resume = savedResumes.find(r => r.id === selectedResumeId);
                if (resume) sessionStorage.setItem('atsResumeName', resume.name);
              }
              navigate('/cover-letter?from=ats');
            }}>
              <FileOutput className="w-4 h-4 mr-2" />
              Cover Letter
            </Button>
            <Button variant="hero" size="sm" onClick={() => setShowTemplateDialog(true)} disabled={!parsedResumeData}>
              <Wand2 className="w-4 h-4 mr-2" />
              Create Resume
            </Button>
          </div>
        </div>
      </header>

      {/* Re-analyzing Loading Overlay */}
      <AnimatePresence>
        {isReanalyzing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-card border rounded-2xl p-8 shadow-2xl text-center max-w-md mx-4"
            >
              <div className="relative w-24 h-24 mx-auto mb-6">
                <div className="absolute inset-0 rounded-full border-4 border-muted" />
                <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <BarChart3 className="w-10 h-10 text-primary" />
                </div>
              </div>
              <h3 className="text-xl font-bold mb-2">Re-analyzing Resume</h3>
              <p className="text-muted-foreground mb-4">
                Calculating your new ATS score with the enhanced content...
              </p>
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Sparkles className="w-4 h-4 text-primary animate-pulse" />
                <span>This usually takes 10-15 seconds</span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="container mx-auto px-4 py-6">
        <div className="max-w-7xl mx-auto">
          {/* Score Hero */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="p-6 mb-6 overflow-hidden relative">
              <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-primary/10 to-transparent rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="grid lg:grid-cols-12 gap-6 relative">
                <div className="lg:col-span-4">
                  <p className="text-sm text-muted-foreground mb-1">{fileName}</p>
                  <h1 className="text-xl font-bold mb-4">ATS Compatibility Score</h1>
                  <div className="flex items-end gap-4">
                    <div className={`text-6xl font-black bg-gradient-to-r ${getScoreGradient(analysis.overallScore)} bg-clip-text text-transparent`}>
                      {analysis.overallScore}
                    </div>
                    <div className="pb-1">
                      <Badge className={`${analysis.overallScore >= 80 ? "bg-green-500" : analysis.overallScore >= 60 ? "bg-yellow-500" : "bg-red-500"} text-white`}>
                        {getScoreLabel(analysis.overallScore)}
                      </Badge>
                      <p className="text-sm text-muted-foreground mt-1">out of 100</p>
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-8 grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: "Skills Match", value: analysis.subScores.skillsMatch, icon: Target },
                    { label: "Experience", value: analysis.subScores.experienceMatch, icon: BriefcaseIcon },
                    { label: "Keywords", value: analysis.subScores.keywordMatch, icon: Search },
                    { label: "Format", value: analysis.subScores.formatCompatibility, icon: FileCheck },
                  ].map((item, i) => (
                    <Card key={i} className="p-4 bg-muted/30">
                      <div className="flex items-center gap-2 mb-2">
                        <item.icon className="w-4 h-4 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">{item.label}</span>
                      </div>
                      <p className={`text-2xl font-bold ${getScoreColor(item.value)}`}>{item.value}%</p>
                      <Progress value={item.value} className="h-1.5 mt-2" />
                    </Card>
                  ))}
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Executive Summary */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="p-6 mb-6">
              <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
                <Trophy className="w-5 h-5 text-primary" />
                Executive Summary
              </h2>
              <p className="text-muted-foreground mb-4 text-sm">{analysis.summary.overallVerdict}</p>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="p-4 bg-green-500/5 rounded-lg border border-green-500/20">
                  <h4 className="font-semibold text-green-600 text-sm mb-2 flex items-center gap-2">
                    <Star className="w-4 h-4" /> Top Strengths
                  </h4>
                  <ul className="space-y-1">
                    {analysis.summary.topStrengths.map((s, i) => (
                      <li key={i} className="text-xs flex items-start gap-2">
                        <CheckCircle2 className="w-3 h-3 text-green-500 mt-0.5 flex-shrink-0" />
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="p-4 bg-red-500/5 rounded-lg border border-red-500/20">
                  <h4 className="font-semibold text-red-600 text-sm mb-2 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" /> Top Weaknesses
                  </h4>
                  <ul className="space-y-1">
                    {analysis.summary.topWeaknesses.map((w, i) => (
                      <li key={i} className="text-xs flex items-start gap-2">
                        <XCircle className="w-3 h-3 text-red-500 mt-0.5 flex-shrink-0" />
                        {w}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                  <h4 className="font-semibold text-primary text-sm mb-2 flex items-center gap-2">
                    <Zap className="w-4 h-4" /> Priority Fixes
                  </h4>
                  <ul className="space-y-1">
                    {analysis.summary.mostImportantFixes.map((f, i) => (
                      <li key={i} className="text-xs flex items-start gap-2">
                        <ChevronRight className="w-3 h-3 text-primary mt-0.5 flex-shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Tabs Navigation */}
          <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
            {resultTabs.map((tab) => (
              <Button
                key={tab.id}
                variant={activeResultTab === tab.id ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveResultTab(tab.id)}
                className="whitespace-nowrap"
              >
                <tab.icon className="w-4 h-4 mr-2" />
                {tab.label}
              </Button>
            ))}
          </div>

          {/* Tab Content */}
          <AnimatePresence mode="wait">
            <motion.div key={activeResultTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              {activeResultTab === "overview" && (
                <div className="grid md:grid-cols-2 gap-4">
                  <Card className="p-5">
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                      Matched Keywords ({analysis.resumeKeywords.matched.length})
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {analysis.resumeKeywords.matched.slice(0, 15).map((kw, i) => (
                        <Badge key={i} className="bg-green-500/10 text-green-700 border-green-500/20">{kw}</Badge>
                      ))}
                      {analysis.resumeKeywords.matched.length > 15 && (
                        <Badge variant="outline">+{analysis.resumeKeywords.matched.length - 15} more</Badge>
                      )}
                    </div>
                  </Card>
                  <Card className="p-5">
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <XCircle className="w-5 h-5 text-red-500" />
                      Missing Keywords ({analysis.resumeKeywords.missing.length})
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {analysis.resumeKeywords.missing.slice(0, 15).map((kw, i) => (
                        <Badge key={i} variant="destructive">{kw}</Badge>
                      ))}
                      {analysis.resumeKeywords.missing.length > 15 && (
                        <Badge variant="outline">+{analysis.resumeKeywords.missing.length - 15} more</Badge>
                      )}
                    </div>
                  </Card>
                  <Card className="p-5">
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-yellow-500" />
                      Red Flags ({analysis.redFlags.length})
                    </h3>
                    {analysis.redFlags.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No red flags detected</p>
                    ) : (
                      <ul className="space-y-2">
                        {analysis.redFlags.slice(0, 3).map((flag, i) => (
                          <li key={i} className="text-sm flex items-start gap-2">
                            <Badge variant={flag.severity === "critical" ? "destructive" : "secondary"} className="text-xs">{flag.severity}</Badge>
                            <span className="text-muted-foreground">{flag.description}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </Card>
                  <Card className="p-5">
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <Zap className="w-5 h-5 text-primary" />
                      Quick Fixes ({analysis.improvements.quickFixes.length})
                    </h3>
                    <ul className="space-y-2">
                      {analysis.improvements.quickFixes.slice(0, 3).map((fix, i) => (
                        <li key={i} className="text-sm">
                          <span className="text-red-600">{fix.issue}</span>
                          <span className="text-muted-foreground"> → </span>
                          <span className="text-green-600">{fix.fix}</span>
                        </li>
                      ))}
                    </ul>
                  </Card>
                </div>
              )}

              {activeResultTab === "requirements" && (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <Card className="p-5">
                    <h4 className="font-semibold mb-3 text-red-600">Mandatory Skills</h4>
                    <div className="flex flex-wrap gap-2">
                      {analysis.jobRequirements.mandatorySkills.map((skill, i) => (
                        <Badge key={i} variant="destructive">{skill}</Badge>
                      ))}
                    </div>
                  </Card>
                  <Card className="p-5">
                    <h4 className="font-semibold mb-3 text-blue-600">Preferred Skills</h4>
                    <div className="flex flex-wrap gap-2">
                      {analysis.jobRequirements.preferredSkills.map((skill, i) => (
                        <Badge key={i} variant="secondary">{skill}</Badge>
                      ))}
                    </div>
                  </Card>
                  <Card className="p-5">
                    <h4 className="font-semibold mb-3 text-purple-600">Technical Keywords</h4>
                    <div className="flex flex-wrap gap-2">
                      {analysis.jobRequirements.technicalKeywords.map((kw, i) => (
                        <Badge key={i} className="bg-purple-500/10 text-purple-700 border-purple-500/20">{kw}</Badge>
                      ))}
                    </div>
                  </Card>
                  <Card className="p-5">
                    <h4 className="font-semibold mb-3 text-green-600">Soft Skills</h4>
                    <div className="flex flex-wrap gap-2">
                      {analysis.jobRequirements.softSkills.map((skill, i) => (
                        <Badge key={i} className="bg-green-500/10 text-green-700 border-green-500/20">{skill}</Badge>
                      ))}
                    </div>
                  </Card>
                  <Card className="p-5">
                    <h4 className="font-semibold mb-3">Tools & Technologies</h4>
                    <div className="flex flex-wrap gap-2">
                      {analysis.jobRequirements.tools.map((tool, i) => (
                        <Badge key={i} variant="outline">{tool}</Badge>
                      ))}
                    </div>
                  </Card>
                  <Card className="p-5">
                    <h4 className="font-semibold mb-3">Required Experience</h4>
                    <p className="text-sm text-muted-foreground">{analysis.jobRequirements.requiredExperience}</p>
                  </Card>
                </div>
              )}

              {activeResultTab === "keywords" && (
                <div className="grid md:grid-cols-2 gap-4">
                  <Card className="p-5">
                    <h3 className="font-bold mb-4 text-green-600 flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5" />
                      Matched ({analysis.resumeKeywords.matched.length})
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {analysis.resumeKeywords.matched.map((kw, i) => (
                        <Badge key={i} className="bg-green-500/10 text-green-700 border-green-500/20">{kw}</Badge>
                      ))}
                    </div>
                  </Card>
                  <Card className="p-5">
                    <h3 className="font-bold mb-4 text-red-600 flex items-center gap-2">
                      <XCircle className="w-5 h-5" />
                      Missing ({analysis.resumeKeywords.missing.length})
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {analysis.resumeKeywords.missing.map((kw, i) => (
                        <Badge key={i} variant="destructive">{kw}</Badge>
                      ))}
                    </div>
                  </Card>
                  <Card className="p-5">
                    <h3 className="font-bold mb-4 text-yellow-600 flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5" />
                      Under-Represented ({analysis.resumeKeywords.underRepresented.length})
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {analysis.resumeKeywords.underRepresented.map((kw, i) => (
                        <Badge key={i} className="bg-yellow-500/10 text-yellow-700 border-yellow-500/20">{kw}</Badge>
                      ))}
                    </div>
                  </Card>
                  <Card className="p-5">
                    <h3 className="font-bold mb-4 text-orange-600 flex items-center gap-2">
                      <AlertCircle className="w-5 h-5" />
                      Overused ({analysis.resumeKeywords.overused.length})
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {analysis.resumeKeywords.overused.length > 0 ? (
                        analysis.resumeKeywords.overused.map((kw, i) => (
                          <Badge key={i} className="bg-orange-500/10 text-orange-700 border-orange-500/20">{kw}</Badge>
                        ))
                      ) : (
                        <span className="text-muted-foreground text-sm">None detected</span>
                      )}
                    </div>
                  </Card>
                </div>
              )}

              {activeResultTab === "quality" && (
                <div className="grid md:grid-cols-3 gap-4">
                  {Object.entries(analysis.writingQuality).map(([key, score]) => {
                    const labels: Record<string, { label: string; desc: string }> = {
                      grammarScore: { label: "Grammar", desc: "Spelling and punctuation" },
                      impactLanguageScore: { label: "Impact Language", desc: "Achievement-focused wording" },
                      metricsUsageScore: { label: "Metrics Usage", desc: "Quantifiable results" },
                      actionVerbsScore: { label: "Action Verbs", desc: "Strong opening words" },
                      clarityScore: { label: "Clarity", desc: "Easy to understand" },
                      structureScore: { label: "Structure", desc: "Logical organization" },
                    };
                    const info = labels[key];
                    return (
                      <Card key={key} className="p-5">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <span className="font-semibold">{info?.label}</span>
                            <p className="text-xs text-muted-foreground">{info?.desc}</p>
                          </div>
                          <span className={`text-2xl font-bold ${score >= 7 ? "text-green-500" : score >= 5 ? "text-yellow-500" : "text-red-500"}`}>
                            {score}
                          </span>
                        </div>
                        <Progress value={score * 10} className="h-2" />
                      </Card>
                    );
                  })}
                </div>
              )}

              {activeResultTab === "redflags" && (
                <div className="space-y-4">
                  {analysis.redFlags.length === 0 ? (
                    <Card className="p-12 text-center">
                      <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
                      <h3 className="text-2xl font-bold mb-2">No Red Flags!</h3>
                      <p className="text-muted-foreground">Your resume passed all red flag checks.</p>
                    </Card>
                  ) : (
                    analysis.redFlags.map((flag, i) => (
                      <Card key={i} className={`p-5 border-l-4 ${flag.severity === "critical" ? "border-l-red-500" : flag.severity === "warning" ? "border-l-yellow-500" : "border-l-blue-500"}`}>
                        <div className="flex items-start gap-4">
                          {flag.severity === "critical" ? <XCircle className="w-5 h-5 text-red-500" /> : flag.severity === "warning" ? <AlertTriangle className="w-5 h-5 text-yellow-500" /> : <AlertCircle className="w-5 h-5 text-blue-500" />}
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-bold">{flag.type}</span>
                              <Badge variant={flag.severity === "critical" ? "destructive" : "secondary"}>{flag.severity}</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">{flag.description}</p>
                            <p className="text-xs text-muted-foreground mt-1">Location: {flag.location}</p>
                          </div>
                        </div>
                      </Card>
                    ))
                  )}
                </div>
              )}

              {activeResultTab === "improvements" && (
                <div className="space-y-6">
                  <Card className="p-5">
                    <h3 className="font-bold mb-4 flex items-center gap-2">
                      <Zap className="w-5 h-5 text-yellow-500" />
                      Quick Fixes
                    </h3>
                    <div className="space-y-3">
                      {analysis.improvements.quickFixes.map((fix, i) => (
                        <div key={i} className="p-3 bg-muted/50 rounded-lg">
                          <p className="text-sm"><span className="text-red-600 font-medium">{fix.issue}</span> → <span className="text-green-600">{fix.fix}</span></p>
                        </div>
                      ))}
                    </div>
                  </Card>
                  <Card className="p-5">
                    <h3 className="font-bold mb-4 flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-blue-500" />
                      Strong Enhancements
                    </h3>
                    <div className="space-y-4">
                      {analysis.improvements.strongEnhancements.map((enh, i) => (
                        <div key={i} className="p-4 border rounded-lg">
                          <Badge className="mb-2">{enh.section}</Badge>
                          <div className="grid md:grid-cols-2 gap-3 mt-2">
                            <div className="p-3 bg-red-500/5 rounded border border-red-500/20">
                              <p className="text-xs font-medium text-red-600 mb-1">Current</p>
                              <p className="text-sm">{enh.current}</p>
                            </div>
                            <div className="p-3 bg-green-500/5 rounded border border-green-500/20">
                              <p className="text-xs font-medium text-green-600 mb-1">Improved</p>
                              <p className="text-sm">{enh.improved}</p>
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground mt-2">Impact: {enh.impact}</p>
                        </div>
                      ))}
                    </div>
                  </Card>
                  <Card className="p-5">
                    <h3 className="font-bold mb-4 flex items-center gap-2">
                      <BookOpen className="w-5 h-5 text-purple-500" />
                      Advanced Optimizations
                    </h3>
                    <ul className="space-y-2">
                      {analysis.improvements.advancedOptimizations.map((opt, i) => (
                        <li key={i} className="flex items-start gap-2 p-3 bg-purple-500/5 rounded-lg border border-purple-500/20">
                          <ChevronRight className="w-4 h-4 text-purple-500 flex-shrink-0 mt-0.5" />
                          <span className="text-sm">{opt}</span>
                        </li>
                      ))}
                    </ul>
                  </Card>
                </div>
              )}

              {activeResultTab === "enhance" && (
                <div className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-4">
                    {[
                      { id: "auto-rewrite", icon: Sparkles, color: "primary", label: "Auto-Rewrite Full Resume", desc: "Completely rewrite optimized for this job" },
                      { id: "rewrite-experience", icon: PenLine, color: "blue-500", label: "Rewrite Experience Section", desc: "Enhance work experience with metrics" },
                      { id: "generate-achievements", icon: Trophy, color: "green-500", label: "Generate Achievements", desc: "Create keyword-rich achievement bullets" },
                      { id: "generate-summaries", icon: FileOutput, color: "purple-500", label: "Generate Summaries", desc: "Professional, technical, skills summaries" },
                    ].map((tool) => (
                      <Card
                        key={tool.id}
                        className={`p-5 cursor-pointer transition-all hover:border-primary/50 ${activeEnhancement === tool.id ? "border-primary bg-primary/5" : ""} ${activeEnhancement && activeEnhancement !== tool.id && !enhancementResult && !enhancedResumeData ? "opacity-50 pointer-events-none" : ""}`}
                        onClick={() => {
                          // Allow clicking if no enhancement is running, or if we have a result (switching tools)
                          if (!activeEnhancement || enhancementResult || enhancedResumeData) {
                            handleEnhancement(tool.id);
                          }
                        }}
                      >
                        <div className="flex items-start gap-4">
                          <div className={`p-3 rounded-lg bg-${tool.color}/10`}>
                            <tool.icon className={`w-6 h-6 text-${tool.color}`} />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-bold mb-1">{tool.label}</h4>
                            <p className="text-sm text-muted-foreground">{tool.desc}</p>
                          </div>
                          {activeEnhancement === tool.id && !enhancementResult && !enhancedResumeData && (
                            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                          )}
                        </div>
                      </Card>
                    ))}
                  </div>

                  {/* Enhancement Result - Text based */}
                  {activeEnhancement && enhancementResult && !enhancedResumeData && (
                    <Card className="p-6 border-2 border-primary/20">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-lg flex items-center gap-2">
                          <Sparkles className="w-5 h-5 text-primary" />
                          Enhancement Result
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          <Button 
                            size="sm" 
                            variant="default"
                            className="bg-green-600 hover:bg-green-700"
                            onClick={applyEnhancementAndReanalyze}
                            disabled={isReanalyzing}
                          >
                            {isReanalyzing ? (
                              <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-1" /> Analyzing...</>
                            ) : (
                              <><BarChart3 className="w-4 h-4 mr-1" /> Apply & Re-analyze</>
                            )}
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => copyToClipboard(enhancementResult, "enhancement")}>
                            {copiedText === "enhancement" ? <Check className="w-4 h-4 mr-1" /> : <Copy className="w-4 h-4 mr-1" />}
                            Copy
                          </Button>
                          <Button size="sm" variant="secondary" onClick={() => openSaveDialog("enhanced")}>
                            <Wand2 className="w-4 h-4 mr-1" />
                            Edit in Builder
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => { setActiveEnhancement(null); setEnhancementResult(""); }}>
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      {/* Current score reminder */}
                      {analysis && (
                        <div className="mb-4 p-3 rounded-lg bg-muted/50 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`text-2xl font-bold ${analysis.overallScore >= 80 ? "text-green-500" : analysis.overallScore >= 60 ? "text-yellow-500" : "text-red-500"}`}>
                              {analysis.overallScore}%
                            </div>
                            <div className="text-sm">
                              <p className="font-medium">Current ATS Score</p>
                              <p className="text-muted-foreground text-xs">
                                {analysis.overallScore >= 80 ? "Great! Ready to apply" : "Click 'Apply & Re-analyze' to check new score"}
                              </p>
                            </div>
                          </div>
                          {analysis.overallScore < 80 && (
                            <Badge variant="outline" className="border-primary text-primary">
                              Goal: 80%+
                            </Badge>
                          )}
                        </div>
                      )}
                      <ScrollArea className="h-[350px] rounded-lg border bg-muted/30 p-4">
                        <pre className="whitespace-pre-wrap font-sans text-sm">{enhancementResult}</pre>
                      </ScrollArea>
                    </Card>
                  )}

                  {/* Enhancement Result - Structured (for builder resumes) */}
                  {activeEnhancement && enhancedResumeData && (
                    <Card className="p-6 border-2 border-green-500/30 bg-green-500/5">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-lg flex items-center gap-2">
                          <Sparkles className="w-5 h-5 text-green-500" />
                          Optimized Resume Ready
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          <Button 
                            size="sm" 
                            variant="default"
                            className="bg-blue-600 hover:bg-blue-700"
                            onClick={applyEnhancementAndReanalyze}
                            disabled={isReanalyzing}
                          >
                            {isReanalyzing ? (
                              <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-1" /> Analyzing...</>
                            ) : (
                              <><BarChart3 className="w-4 h-4 mr-1" /> Apply & Re-analyze</>
                            )}
                          </Button>
                          <Button 
                            size="sm" 
                            variant="default"
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => {
                              // Store enhanced data and navigate to builder
                              sessionStorage.setItem('atsResumeData', JSON.stringify(enhancedResumeData));
                              if (selectedResumeTemplateId) {
                                sessionStorage.setItem('atsResumeTemplate', selectedResumeTemplateId);
                              }
                              navigate('/builder?from=ats-enhanced');
                            }}
                          >
                            <Wand2 className="w-4 h-4 mr-1" />
                            Edit in Builder
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            onClick={() => { 
                              setActiveEnhancement(null); 
                              setEnhancedResumeData(null); 
                            }}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      
                      <div className="grid md:grid-cols-2 gap-4">
                        {/* Summary Preview */}
                        <div className="space-y-2">
                          <h4 className="font-semibold text-sm text-muted-foreground">Enhanced Summary</h4>
                          <div className="p-3 bg-background rounded-lg border text-sm">
                            {enhancedResumeData.summary || "No summary"}
                          </div>
                        </div>
                        
                        {/* Skills Preview */}
                        <div className="space-y-2">
                          <h4 className="font-semibold text-sm text-muted-foreground">Optimized Skills ({enhancedResumeData.skills?.length || 0})</h4>
                          <div className="p-3 bg-background rounded-lg border">
                            <div className="flex flex-wrap gap-1">
                              {enhancedResumeData.skills?.slice(0, 10).map((skill, i) => (
                                <Badge key={i} variant="secondary" className="text-xs">{skill}</Badge>
                              ))}
                              {(enhancedResumeData.skills?.length || 0) > 10 && (
                                <Badge variant="outline" className="text-xs">+{enhancedResumeData.skills!.length - 10} more</Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Experience Preview */}
                      <div className="mt-4 space-y-2">
                        <h4 className="font-semibold text-sm text-muted-foreground">Enhanced Experience</h4>
                        <ScrollArea className="h-[200px] rounded-lg border bg-background p-3">
                          {enhancedResumeData.experience?.map((exp, i) => (
                            <div key={exp.id || i} className="mb-4 last:mb-0">
                              <p className="font-medium">{exp.title} at {exp.company}</p>
                              <p className="text-xs text-muted-foreground mb-1">{exp.startDate} - {exp.endDate}</p>
                              <ul className="list-disc list-inside text-sm space-y-1">
                                {exp.bullets?.slice(0, 3).map((bullet, j) => (
                                  <li key={j} className="text-muted-foreground">{bullet}</li>
                                ))}
                                {(exp.bullets?.length || 0) > 3 && (
                                  <li className="text-primary text-xs">+{exp.bullets!.length - 3} more bullets</li>
                                )}
                              </ul>
                            </div>
                          ))}
                        </ScrollArea>
                      </div>

                      <div className="text-sm text-muted-foreground mt-4 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        Click "Apply to Builder" to edit this optimized version with your template
                      </div>
                    </Card>
                  )}
                </div>
              )}

              {/* Cover Letter Tab */}
              {activeResultTab === "coverletter" && (
                <div className="space-y-6">
                  <Card className="p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <FileOutput className="w-5 h-5 text-primary" />
                      <h2 className="text-xl font-bold">AI Cover Letter Generator</h2>
                    </div>
                    <p className="text-muted-foreground mb-6">
                      Generate a tailored cover letter using your resume and the job description from this analysis.
                    </p>

                    {/* Tone Selection */}
                    <div className="flex flex-wrap items-center gap-4 mb-6">
                      <Label className="font-medium">Tone:</Label>
                      <div className="flex gap-2">
                        {[
                          { id: "professional", label: "💼 Professional", desc: "Formal & traditional" },
                          { id: "confident", label: "🚀 Confident", desc: "Bold & assertive" },
                          { id: "casual", label: "😊 Casual", desc: "Friendly & approachable" },
                        ].map((t) => (
                          <Button
                            key={t.id}
                            variant={coverLetterTone === t.id ? "default" : "outline"}
                            size="sm"
                            onClick={() => setCoverLetterTone(t.id as any)}
                          >
                            {t.label}
                          </Button>
                        ))}
                      </div>
                      <Button
                        variant="hero"
                        onClick={handleGenerateCoverLetter}
                        disabled={isGeneratingCoverLetter}
                        className="ml-auto"
                      >
                        {isGeneratingCoverLetter ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Generating...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4 mr-2" />
                            Generate Cover Letter
                          </>
                        )}
                      </Button>
                    </div>

                    {/* Generated Cover Letter */}
                    {generatedCoverLetter ? (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                            Generated Cover Letter
                          </h3>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => copyToClipboard(generatedCoverLetter, "coverletter")}>
                              {copiedText === "coverletter" ? <Check className="w-4 h-4 mr-1" /> : <Copy className="w-4 h-4 mr-1" />}
                              Copy
                            </Button>
                            <Button size="sm" variant="default" onClick={saveCoverLetter}>
                              <Save className="w-4 h-4 mr-1" />
                              Save
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => navigate('/cover-letter')}>
                              Open Editor
                            </Button>
                          </div>
                        </div>
                        <Textarea
                          value={generatedCoverLetter}
                          onChange={(e) => setGeneratedCoverLetter(e.target.value)}
                          className="min-h-[400px] font-mono text-sm"
                        />
                      </div>
                    ) : (
                      <div className="border-2 border-dashed border-border rounded-lg p-12 text-center">
                        <FileOutput className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                        <p className="text-muted-foreground">
                          Click "Generate Cover Letter" to create a tailored cover letter based on your resume and the job description.
                        </p>
                      </div>
                    )}
                  </Card>

                  {/* Tips */}
                  <Card className="p-4 bg-accent/50">
                    <h3 className="font-semibold mb-2 flex items-center gap-2">
                      <Lightbulb className="w-4 h-4" />
                      Pro Tips
                    </h3>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• The cover letter uses your ATS score of <strong>{analysis.overallScore}/100</strong> to highlight relevant skills</li>
                      <li>• Edit the generated letter to add personal touches</li>
                      <li>• Save to your library to organize and track applications</li>
                    </ul>
                  </Card>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Save Dialog */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wand2 className="w-5 h-5" />
              Save & Edit in Builder
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Resume Name</label>
              <Input value={saveName} onChange={(e) => setSaveName(e.target.value)} placeholder="Enter a name for this resume" />
            </div>
            <div className="p-3 bg-primary/10 rounded-lg text-sm border border-primary/20">
              <div className="font-medium text-primary mb-2 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                What happens next:
              </div>
              <ol className="list-decimal list-inside text-muted-foreground space-y-1 text-xs">
                <li>Your resume will be parsed into structured data</li>
                <li>You'll choose a professional template</li>
                <li>Edit and customize in the Resume Builder</li>
                <li>Export as PDF when ready</li>
              </ol>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg text-sm">
              <p className="text-muted-foreground">
                Saving: <span className="font-medium text-foreground">{saveType === "enhanced" ? "Enhanced version" : "Original resume"}</span>
              </p>
              {analysis && (
                <p className="text-muted-foreground mt-1">
                  ATS Score: <span className="font-medium text-foreground">{analysis.overallScore}/100</span>
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>Cancel</Button>
            <Button onClick={saveToResumeManager} disabled={isSaving}>
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Parsing...
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4 mr-2" />
                  Continue to Builder
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Template Selection Dialog */}
      <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wand2 className="w-5 h-5" />
              Create Resume from Template
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground mb-4">
              Your resume data has been extracted. Choose how you'd like to proceed:
            </p>
            
            {parsedResumeData && (
              <Card className="p-4 mb-4 bg-green-500/10 border-green-500/20">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-green-700">Resume Data Ready</p>
                    <p className="text-muted-foreground">
                      {parsedResumeData.contact?.name && `Name: ${parsedResumeData.contact.name}`}
                      {parsedResumeData.experience?.length ? ` • ${parsedResumeData.experience.length} jobs` : ''}
                      {parsedResumeData.skills?.length ? ` • ${parsedResumeData.skills.length} skills` : ''}
                    </p>
                    {isBuilderResume && selectedResumeTemplateId && (
                      <p className="text-green-600 mt-1 font-medium">
                        ✓ Built with template: {selectedResumeTemplateId}
                      </p>
                    )}
                  </div>
                </div>
              </Card>
            )}

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card 
                className="p-4 cursor-pointer hover:border-primary transition-all group"
                onClick={() => {
                  // If it's a builder resume, navigate to edit it directly
                  if (isBuilderResume && selectedResumeId) {
                    navigate(`/builder?id=${selectedResumeId}`);
                  } else if (parsedResumeData) {
                    // Store parsed data and navigate to builder for new template
                    sessionStorage.setItem('atsResumeData', JSON.stringify(parsedResumeData));
                    if (selectedResumeTemplateId) {
                      sessionStorage.setItem('atsResumeTemplate', selectedResumeTemplateId);
                    }
                    navigate('/builder?from=ats');
                  }
                  setShowTemplateDialog(false);
                }}
              >
                <div className="flex flex-col items-center text-center">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <Wand2 className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="font-semibold mb-1">
                    {isBuilderResume ? "Edit in Builder" : "Resume Builder"}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {isBuilderResume ? "Edit with your template" : "Edit & export as PDF"}
                  </p>
                </div>
              </Card>

              <Card 
                className="p-4 cursor-pointer hover:border-primary transition-all group"
                onClick={() => {
                  // Store data and navigate to cover letter
                  sessionStorage.setItem('atsResumeText', resumeText);
                  sessionStorage.setItem('atsJobDescription', jobDescription);
                  if (selectedResumeId) {
                    sessionStorage.setItem('atsResumeId', selectedResumeId);
                    const resume = savedResumes.find(r => r.id === selectedResumeId);
                    if (resume) sessionStorage.setItem('atsResumeName', resume.name);
                  }
                  navigate('/cover-letter?from=ats');
                  setShowTemplateDialog(false);
                }}
              >
                <div className="flex flex-col items-center text-center">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <FileOutput className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="font-semibold mb-1">Cover Letter</h3>
                  <p className="text-xs text-muted-foreground">
                    Generate AI cover letter
                  </p>
                </div>
              </Card>

              <Card 
                className="p-4 cursor-pointer hover:border-primary transition-all group"
                onClick={() => {
                  // Save directly to My Resumes
                  if (parsedResumeData) {
                    setSaveType("original");
                    setSaveName(parsedResumeData.contact?.name || fileName || "Analyzed Resume");
                    setShowTemplateDialog(false);
                    setSaveDialogOpen(true);
                  }
                }}
              >
                <div className="flex flex-col items-center text-center">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <Save className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="font-semibold mb-1">Save Resume</h3>
                  <p className="text-xs text-muted-foreground">
                    Save to My Resumes
                  </p>
                </div>
              </Card>

              <Card 
                className="p-4 cursor-pointer hover:border-green-500 transition-all group"
                onClick={async () => {
                  // Add to job tracker with resume and job description
                  try {
                    const { data: { user } } = await supabase.auth.getUser();
                    if (!user) {
                      toast({ title: "Please log in", variant: "destructive" });
                      return;
                    }

                    // Extract job title from job description (first line or "Position")
                    const jobLines = jobDescription.split('\n').filter(l => l.trim());
                    const extractedTitle = jobLines[0]?.substring(0, 100) || "Job Application";

                    const { error } = await supabase.from('job_applications').insert({
                      user_id: user.id,
                      job_title: extractedTitle,
                      company: "Company Name", // User can edit later
                      status: "applied",
                      job_description: jobDescription,
                      resume_id: selectedResumeId || null,
                      notes: `ATS Score: ${analysis?.overallScore || 'N/A'}/100`,
                    });

                    if (error) throw error;
                    
                    toast({ 
                      title: "✓ Added to Job Tracker", 
                      description: "Edit the details in Job Tracker" 
                    });
                    setShowTemplateDialog(false);
                  } catch (error) {
                    toast({ title: "Failed to add job", variant: "destructive" });
                  }
                }}
              >
                <div className="flex flex-col items-center text-center">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <Briefcase className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="font-semibold mb-1">Add to Jobs</h3>
                  <p className="text-xs text-muted-foreground">
                    Track this application
                  </p>
                </div>
              </Card>
            </div>

            {analysis && analysis.overallScore < 70 && (
              <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                <div className="text-sm text-yellow-700 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Your ATS score is {analysis.overallScore}/100. Consider using the AI enhancement tools before creating your final resume.
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTemplateDialog(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
