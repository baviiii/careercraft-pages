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
} from "lucide-react";
import { parseResume } from "@/lib/resumeParser";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { runATSAIAnalysis, autoRewriteResume, rewriteExperienceSection, generateAchievements, generateSummaries, ATSAIAnalysis } from "@/lib/atsAIAnalyzer";

type AnalysisStep = "upload" | "analyzing" | "results";

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

  useEffect(() => {
    const storedResume = sessionStorage.getItem("resumeText");
    const storedJob = sessionStorage.getItem("jobDescription");
    const storedFileName = sessionStorage.getItem("fileName");

    if (storedResume) setResumeText(storedResume);
    if (storedJob) setJobDescription(storedJob);
    if (storedFileName) setFileName(storedFileName);
  }, []);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const text = await parseResume(file);
      setResumeText(text);
      setFileName(file.name);
      sessionStorage.setItem("resumeText", text);
      sessionStorage.setItem("fileName", file.name);
      toast({ title: "Resume uploaded", description: "Now add a job description to analyze." });
    } catch (error) {
      toast({ title: "Upload failed", description: error instanceof Error ? error.message : "Could not parse file", variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  }, [toast]);

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
    
    try {
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
      
      const { error } = await supabase.from('resumes').insert({
        user_id: user.id,
        name: saveName,
        content: content,
        original_filename: saveName,
        file_type: "analyzed",
        notes: `ATS Score: ${analysis?.overallScore || 'N/A'}/100`,
      });

      if (error) throw error;

      toast({ title: "Saved!", description: "Resume saved to your Resume Manager." });
      setSaveDialogOpen(false);
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
                    </div>
                    <ScrollArea className="h-40 rounded-lg border bg-muted/30 p-3">
                      <pre className="whitespace-pre-wrap font-sans text-xs text-muted-foreground">{resumeText.slice(0, 800)}...</pre>
                    </ScrollArea>
                    <Button variant="outline" size="sm" onClick={() => setResumeText("")} className="w-full">
                      Upload Different Resume
                    </Button>
                  </div>
                ) : (
                  <div
                    {...getRootProps()}
                    className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                      isDragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/50"
                    }`}
                  >
                    <input {...getInputProps()} />
                    {isUploading ? (
                      <div className="py-4">
                        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                        <p className="text-sm text-muted-foreground">Parsing resume...</p>
                      </div>
                    ) : (
                      <>
                        <Upload className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                        <p className="font-medium mb-1">{isDragActive ? "Drop your resume here" : "Drag & drop your resume"}</p>
                        <p className="text-sm text-muted-foreground">PDF, DOC, DOCX, or image</p>
                      </>
                    )}
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

            <div className="mt-8 text-center space-y-4">
              <Button
                size="lg"
                variant="hero"
                onClick={handleAnalyze}
                disabled={!resumeText || !jobDescription.trim() || isAnalyzing}
                className="px-12 h-14 text-lg"
              >
                <Sparkles className="w-5 h-5 mr-2" />
                Run Deep ATS Analysis
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
            <p className="flex items-center justify-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-500" /> Extracting job requirements</p>
            <p className="flex items-center justify-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-500" /> Parsing resume content</p>
            <p className="flex items-center justify-center gap-2"><div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" /> Running AI analysis</p>
            <p className="flex items-center justify-center gap-2 opacity-50"><CircleDot className="w-4 h-4" /> Generating recommendations</p>
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
              New Analysis
            </Button>
            <Button variant="outline" size="sm" onClick={() => openSaveDialog("original")}>
              <Save className="w-4 h-4 mr-2" />
              Save Original
            </Button>
            <Button variant="hero" size="sm" onClick={() => navigate("/builder")}>
              <FolderPlus className="w-4 h-4 mr-2" />
              Resume Manager
            </Button>
          </div>
        </div>
      </header>

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
                        className={`p-5 cursor-pointer transition-all hover:border-primary/50 ${activeEnhancement === tool.id ? "border-primary bg-primary/5" : ""}`}
                        onClick={() => !activeEnhancement && handleEnhancement(tool.id)}
                      >
                        <div className="flex items-start gap-4">
                          <div className={`p-3 rounded-lg bg-${tool.color}/10`}>
                            <tool.icon className={`w-6 h-6 text-${tool.color}`} />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-bold mb-1">{tool.label}</h4>
                            <p className="text-sm text-muted-foreground">{tool.desc}</p>
                          </div>
                          {activeEnhancement === tool.id && !enhancementResult && (
                            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                          )}
                        </div>
                      </Card>
                    ))}
                  </div>

                  {/* Enhancement Result */}
                  {activeEnhancement && enhancementResult && (
                    <Card className="p-6 border-2 border-primary/20">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-lg flex items-center gap-2">
                          <Sparkles className="w-5 h-5 text-primary" />
                          Enhancement Result
                        </h3>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => copyToClipboard(enhancementResult, "enhancement")}>
                            {copiedText === "enhancement" ? <Check className="w-4 h-4 mr-1" /> : <Copy className="w-4 h-4 mr-1" />}
                            Copy
                          </Button>
                          <Button size="sm" variant="default" onClick={() => openSaveDialog("enhanced")}>
                            <Save className="w-4 h-4 mr-1" />
                            Save to Manager
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => { setActiveEnhancement(null); setEnhancementResult(""); }}>
                            Close
                          </Button>
                        </div>
                      </div>
                      <ScrollArea className="h-[400px] rounded-lg border bg-muted/30 p-4">
                        <pre className="whitespace-pre-wrap font-sans text-sm">{enhancementResult}</pre>
                      </ScrollArea>
                    </Card>
                  )}
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
              <Save className="w-5 h-5" />
              Save to Resume Manager
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Resume Name</label>
              <Input value={saveName} onChange={(e) => setSaveName(e.target.value)} placeholder="Enter a name for this resume" />
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
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Resume
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
