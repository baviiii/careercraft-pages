import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useDropzone } from "react-dropzone";
import {
  ArrowLeft,
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
} from "lucide-react";
import { parseResume } from "@/lib/resumeParser";
import { useToast } from "@/hooks/use-toast";
import { runATSAIAnalysis, autoRewriteResume, rewriteExperienceSection, generateAchievements, generateSummaries, ATSAIAnalysis } from "@/lib/atsAIAnalyzer";

export default function Analysis() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [analysis, setAnalysis] = useState<ATSAIAnalysis | null>(null);
  const [fileName, setFileName] = useState("");
  const [resumeText, setResumeText] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeEnhancement, setActiveEnhancement] = useState<string | null>(null);
  const [enhancementResult, setEnhancementResult] = useState<string>("");
  const [copiedText, setCopiedText] = useState<string | null>(null);

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
      toast({
        title: "Resume uploaded",
        description: "Now add a job description to analyze.",
      });
    } catch (error) {
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Could not parse file",
        variant: "destructive",
      });
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
      toast({
        title: "Missing information",
        description: "Please provide both a resume and job description.",
        variant: "destructive",
      });
      return;
    }
    
    setIsAnalyzing(true);
    sessionStorage.setItem("jobDescription", jobDescription);
    
    try {
      const result = await runATSAIAnalysis(resumeText, jobDescription);
      setAnalysis(result);
      toast({
        title: "Analysis complete",
        description: `Your ATS score is ${result.overallScore}/100`,
      });
    } catch (error) {
      toast({
        title: "Analysis failed",
        description: error instanceof Error ? error.message : "Could not analyze resume",
        variant: "destructive",
      });
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
      toast({ title: "Enhancement complete", description: "See results below." });
    } catch (error) {
      toast({
        title: "Enhancement failed",
        description: error instanceof Error ? error.message : "Could not process request",
        variant: "destructive",
      });
      setActiveEnhancement(null);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(id);
    setTimeout(() => setCopiedText(null), 2000);
    toast({ title: "Copied to clipboard" });
  };

  const handleNewAnalysis = () => {
    setAnalysis(null);
    setEnhancementResult("");
    setActiveEnhancement(null);
  };

  // Upload UI
  if (!analysis) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b border-border bg-background/95 backdrop-blur sticky top-0 z-50">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <button
              onClick={() => navigate("/dashboard")}
              className="text-2xl font-bold bg-gradient-hero bg-clip-text text-transparent"
            >
              ResumeAI
            </button>
            <Button variant="outline" onClick={() => navigate("/upload")}>
              <FileText className="w-4 h-4 mr-2" />
              Resume Manager
            </Button>
          </div>
        </header>

        <div className="container mx-auto px-4 py-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-4xl mx-auto"
          >
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold mb-4">
                <span className="bg-gradient-hero bg-clip-text text-transparent">Enterprise ATS Analyzer</span>
              </h1>
              <p className="text-lg text-muted-foreground">
                AI-powered deep analysis with scoring, keyword extraction, red flags detection, and optimization
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  Your Resume
                </h3>
                {resumeText ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                      <span className="text-sm font-medium">{fileName || "Resume uploaded"}</span>
                    </div>
                    <div className="max-h-48 overflow-y-auto p-3 bg-muted/50 rounded-lg text-sm">
                      <pre className="whitespace-pre-wrap font-sans">{resumeText.slice(0, 500)}...</pre>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => { setResumeText(""); }}
                    >
                      Upload Different Resume
                    </Button>
                  </div>
                ) : (
                  <div
                    {...getRootProps()}
                    className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                      isDragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                    }`}
                  >
                    <input {...getInputProps()} />
                    {isUploading ? (
                      <div className="py-4">
                        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                        <p className="text-sm text-muted-foreground">Parsing resume...</p>
                      </div>
                    ) : (
                      <>
                        <Upload className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
                        <p className="font-medium mb-1">
                          {isDragActive ? "Drop your resume here" : "Drag & drop your resume"}
                        </p>
                        <p className="text-sm text-muted-foreground">PDF, DOC, DOCX, or image</p>
                      </>
                    )}
                  </div>
                )}
              </Card>

              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Target className="w-5 h-5 text-primary" />
                  Job Description
                </h3>
                <Textarea
                  placeholder="Paste the job description here..."
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  className="min-h-[220px] resize-none"
                />
              </Card>
            </div>

            <div className="mt-8 text-center">
              <Button
                size="lg"
                variant="hero"
                onClick={handleAnalyze}
                disabled={!resumeText || !jobDescription.trim() || isAnalyzing}
                className="px-12"
              >
                {isAnalyzing ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Analyzing with AI...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 mr-2" />
                    Run Deep ATS Analysis
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-500";
    if (score >= 60) return "text-yellow-500";
    return "text-red-500";
  };

  const getScoreGradient = (score: number) => {
    if (score >= 80) return "from-green-500/20 to-emerald-500/20";
    if (score >= 60) return "from-yellow-500/20 to-orange-500/20";
    return "from-red-500/20 to-pink-500/20";
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return "Excellent";
    if (score >= 60) return "Good";
    if (score >= 40) return "Needs Work";
    return "Poor";
  };

  const getSeverityIcon = (severity: string) => {
    if (severity === "critical") return <XCircle className="w-5 h-5 text-red-500" />;
    if (severity === "warning") return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
    return <AlertCircle className="w-5 h-5 text-blue-500" />;
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-background/95 backdrop-blur sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={() => navigate("/dashboard")}
            className="text-2xl font-bold bg-gradient-hero bg-clip-text text-transparent"
          >
            ResumeAI
          </button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleNewAnalysis}>
              <RefreshCw className="w-4 h-4 mr-2" />
              New Analysis
            </Button>
            <Button variant="hero" onClick={() => navigate("/rewrite")}>
              <Sparkles className="w-4 h-4 mr-2" />
              AI Rewrite
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-7xl mx-auto space-y-6"
        >
          {/* Hero Score Card */}
          <Card className={`p-8 bg-gradient-to-br ${getScoreGradient(analysis.overallScore)} border-2`}>
            <div className="grid lg:grid-cols-4 gap-8 items-center">
              <div className="lg:col-span-2">
                <div className="flex items-center gap-2 mb-2">
                  <BarChart3 className="w-5 h-5 text-primary" />
                  <p className="text-sm font-medium text-muted-foreground">ATS Compatibility Score</p>
                </div>
                <h1 className="text-2xl font-bold mb-4">{fileName}</h1>
                <div className="flex items-end gap-6">
                  <div className={`text-7xl font-black ${getScoreColor(analysis.overallScore)}`}>
                    {analysis.overallScore}
                  </div>
                  <div className="pb-2">
                    <p className="text-2xl font-bold">{getScoreLabel(analysis.overallScore)}</p>
                    <p className="text-sm text-muted-foreground">out of 100</p>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-2 grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Skills Match</span>
                      <span className="font-bold">{analysis.subScores.skillsMatch}%</span>
                    </div>
                    <Progress value={analysis.subScores.skillsMatch} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Experience</span>
                      <span className="font-bold">{analysis.subScores.experienceMatch}%</span>
                    </div>
                    <Progress value={analysis.subScores.experienceMatch} className="h-2" />
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Keywords</span>
                      <span className="font-bold">{analysis.subScores.keywordMatch}%</span>
                    </div>
                    <Progress value={analysis.subScores.keywordMatch} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Format</span>
                      <span className="font-bold">{analysis.subScores.formatCompatibility}%</span>
                    </div>
                    <Progress value={analysis.subScores.formatCompatibility} className="h-2" />
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Summary Card */}
          <Card className="p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-primary" />
              Executive Summary
            </h2>
            <p className="text-muted-foreground mb-4">{analysis.summary.overallVerdict}</p>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="p-4 bg-green-500/10 rounded-lg border border-green-500/20">
                <h4 className="font-semibold text-green-600 mb-2 flex items-center gap-2">
                  <Star className="w-4 h-4" /> Top Strengths
                </h4>
                <ul className="space-y-1 text-sm">
                  {analysis.summary.topStrengths.map((s, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="p-4 bg-red-500/10 rounded-lg border border-red-500/20">
                <h4 className="font-semibold text-red-600 mb-2 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" /> Top Weaknesses
                </h4>
                <ul className="space-y-1 text-sm">
                  {analysis.summary.topWeaknesses.map((w, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <XCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                      {w}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
                <h4 className="font-semibold text-primary mb-2 flex items-center gap-2">
                  <Zap className="w-4 h-4" /> Priority Fixes
                </h4>
                <ul className="space-y-1 text-sm">
                  {analysis.summary.mostImportantFixes.map((f, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <ChevronRight className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Card>

          <Tabs defaultValue="requirements" className="space-y-6">
            <TabsList className="grid w-full grid-cols-6 h-auto p-1">
              <TabsTrigger value="requirements" className="flex items-center gap-2 py-3">
                <BriefcaseIcon className="w-4 h-4" />
                <span className="hidden sm:inline">Job Req</span>
              </TabsTrigger>
              <TabsTrigger value="keywords" className="flex items-center gap-2 py-3">
                <Search className="w-4 h-4" />
                <span className="hidden sm:inline">Keywords</span>
              </TabsTrigger>
              <TabsTrigger value="quality" className="flex items-center gap-2 py-3">
                <FileCheck className="w-4 h-4" />
                <span className="hidden sm:inline">Quality</span>
              </TabsTrigger>
              <TabsTrigger value="redflags" className="flex items-center gap-2 py-3">
                <AlertTriangle className="w-4 h-4" />
                <span className="hidden sm:inline">Red Flags</span>
              </TabsTrigger>
              <TabsTrigger value="improvements" className="flex items-center gap-2 py-3">
                <Lightbulb className="w-4 h-4" />
                <span className="hidden sm:inline">Improve</span>
              </TabsTrigger>
              <TabsTrigger value="enhance" className="flex items-center gap-2 py-3">
                <Wand2 className="w-4 h-4" />
                <span className="hidden sm:inline">AI Tools</span>
              </TabsTrigger>
            </TabsList>

            {/* Job Requirements Tab */}
            <TabsContent value="requirements" className="space-y-4">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <BriefcaseIcon className="w-6 h-6 text-primary" />
                Extracted Job Requirements
              </h2>
              <div className="grid md:grid-cols-2 gap-4">
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
                  <h4 className="font-semibold mb-3">Certifications</h4>
                  <div className="flex flex-wrap gap-2">
                    {analysis.jobRequirements.certifications.length > 0 ? (
                      analysis.jobRequirements.certifications.map((cert, i) => (
                        <Badge key={i} variant="outline">{cert}</Badge>
                      ))
                    ) : (
                      <span className="text-muted-foreground text-sm">None specified</span>
                    )}
                  </div>
                </Card>
              </div>
              <Card className="p-5">
                <h4 className="font-semibold mb-2">Required Experience</h4>
                <p className="text-muted-foreground">{analysis.jobRequirements.requiredExperience}</p>
              </Card>
            </TabsContent>

            {/* Keywords Tab */}
            <TabsContent value="keywords" className="space-y-4">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <Search className="w-6 h-6 text-primary" />
                Keyword Gap Analysis
              </h2>
              <div className="grid md:grid-cols-2 gap-4">
                <Card className="p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                    <h3 className="font-bold text-green-600">Matched Keywords ({analysis.resumeKeywords.matched.length})</h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {analysis.resumeKeywords.matched.map((kw, i) => (
                      <Badge key={i} className="bg-green-500/10 text-green-700 border-green-500/20">{kw}</Badge>
                    ))}
                  </div>
                </Card>
                <Card className="p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <XCircle className="w-5 h-5 text-red-500" />
                    <h3 className="font-bold text-red-600">Missing Keywords ({analysis.resumeKeywords.missing.length})</h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {analysis.resumeKeywords.missing.map((kw, i) => (
                      <Badge key={i} variant="destructive">{kw}</Badge>
                    ))}
                  </div>
                </Card>
                <Card className="p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <AlertTriangle className="w-5 h-5 text-yellow-500" />
                    <h3 className="font-bold text-yellow-600">Under-Represented ({analysis.resumeKeywords.underRepresented.length})</h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {analysis.resumeKeywords.underRepresented.map((kw, i) => (
                      <Badge key={i} className="bg-yellow-500/10 text-yellow-700 border-yellow-500/20">{kw}</Badge>
                    ))}
                  </div>
                </Card>
                <Card className="p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <AlertCircle className="w-5 h-5 text-orange-500" />
                    <h3 className="font-bold text-orange-600">Overused ({analysis.resumeKeywords.overused.length})</h3>
                  </div>
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
            </TabsContent>

            {/* Writing Quality Tab */}
            <TabsContent value="quality" className="space-y-4">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <FileCheck className="w-6 h-6 text-primary" />
                Resume Writing Quality
              </h2>
              <div className="grid md:grid-cols-3 gap-4">
                {Object.entries(analysis.writingQuality).map(([key, score]) => {
                  const labels: Record<string, string> = {
                    grammarScore: "Grammar",
                    impactLanguageScore: "Impact Language",
                    metricsUsageScore: "Metrics Usage",
                    actionVerbsScore: "Action Verbs",
                    clarityScore: "Clarity",
                    structureScore: "Structure",
                  };
                  return (
                    <Card key={key} className="p-5">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium">{labels[key]}</span>
                        <span className={`text-2xl font-bold ${score >= 7 ? "text-green-500" : score >= 5 ? "text-yellow-500" : "text-red-500"}`}>
                          {score}/10
                        </span>
                      </div>
                      <Progress value={score * 10} className="h-3" />
                    </Card>
                  );
                })}
              </div>
            </TabsContent>

            {/* Red Flags Tab */}
            <TabsContent value="redflags" className="space-y-4">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <AlertTriangle className="w-6 h-6 text-red-500" />
                Red Flags Detection ({analysis.redFlags.length})
              </h2>
              {analysis.redFlags.length === 0 ? (
                <Card className="p-12 text-center">
                  <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
                  <h3 className="text-2xl font-bold mb-2">No Red Flags!</h3>
                  <p className="text-muted-foreground">Your resume passed all red flag checks.</p>
                </Card>
              ) : (
                <div className="space-y-3">
                  {analysis.redFlags.map((flag, i) => (
                    <Card key={i} className={`p-5 border-l-4 ${flag.severity === "critical" ? "border-l-red-500" : flag.severity === "warning" ? "border-l-yellow-500" : "border-l-blue-500"}`}>
                      <div className="flex items-start gap-4">
                        {getSeverityIcon(flag.severity)}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-bold">{flag.type}</span>
                            <Badge variant={flag.severity === "critical" ? "destructive" : flag.severity === "warning" ? "default" : "secondary"}>
                              {flag.severity}
                            </Badge>
                          </div>
                          <p className="text-muted-foreground mb-1">{flag.description}</p>
                          <p className="text-xs text-muted-foreground">Location: {flag.location}</p>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Improvements Tab */}
            <TabsContent value="improvements" className="space-y-6">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <Lightbulb className="w-6 h-6 text-primary" />
                Tailored Improvement Suggestions
              </h2>
              
              {/* Quick Fixes */}
              <Card className="p-5">
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                  <Zap className="w-5 h-5 text-yellow-500" />
                  Quick Fixes
                </h3>
                <div className="space-y-3">
                  {analysis.improvements.quickFixes.map((fix, i) => (
                    <div key={i} className="p-4 bg-muted/50 rounded-lg">
                      <p className="font-medium text-red-600 mb-1">{fix.issue}</p>
                      <p className="text-sm text-green-600">→ {fix.fix}</p>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Strong Enhancements */}
              <Card className="p-5">
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-blue-500" />
                  Strong Enhancements
                </h3>
                <div className="space-y-4">
                  {analysis.improvements.strongEnhancements.map((enh, i) => (
                    <div key={i} className="p-4 border rounded-lg">
                      <Badge className="mb-2">{enh.section}</Badge>
                      <div className="grid md:grid-cols-2 gap-4 mt-2">
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

              {/* Advanced Optimizations */}
              <Card className="p-5">
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-purple-500" />
                  Advanced Career Optimizations
                </h3>
                <ul className="space-y-2">
                  {analysis.improvements.advancedOptimizations.map((opt, i) => (
                    <li key={i} className="flex items-start gap-2 p-3 bg-purple-500/5 rounded-lg border border-purple-500/20">
                      <ChevronRight className="w-5 h-5 text-purple-500 flex-shrink-0 mt-0.5" />
                      <span>{opt}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            </TabsContent>

            {/* AI Enhancement Tools Tab */}
            <TabsContent value="enhance" className="space-y-6">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <Wand2 className="w-6 h-6 text-primary" />
                AI-Powered Enhancement Tools
              </h2>
              
              <div className="grid md:grid-cols-2 gap-4">
                <Card className="p-5 hover:border-primary/50 transition-all cursor-pointer" onClick={() => !activeEnhancement && handleEnhancement("auto-rewrite")}>
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-primary/10 rounded-lg">
                      <Sparkles className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold mb-1">Auto-Rewrite Full Resume</h4>
                      <p className="text-sm text-muted-foreground">Completely rewrite your resume optimized for this job.</p>
                    </div>
                  </div>
                </Card>
                
                <Card className="p-5 hover:border-primary/50 transition-all cursor-pointer" onClick={() => !activeEnhancement && handleEnhancement("rewrite-experience")}>
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-blue-500/10 rounded-lg">
                      <PenLine className="w-6 h-6 text-blue-500" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold mb-1">Rewrite Experience Section</h4>
                      <p className="text-sm text-muted-foreground">Enhance just your work experience with metrics.</p>
                    </div>
                  </div>
                </Card>
                
                <Card className="p-5 hover:border-primary/50 transition-all cursor-pointer" onClick={() => !activeEnhancement && handleEnhancement("generate-achievements")}>
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-green-500/10 rounded-lg">
                      <Trophy className="w-6 h-6 text-green-500" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold mb-1">Generate Achievements</h4>
                      <p className="text-sm text-muted-foreground">Create keyword-rich achievement bullets.</p>
                    </div>
                  </div>
                </Card>
                
                <Card className="p-5 hover:border-primary/50 transition-all cursor-pointer" onClick={() => !activeEnhancement && handleEnhancement("generate-summaries")}>
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-purple-500/10 rounded-lg">
                      <FileText className="w-6 h-6 text-purple-500" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold mb-1">Generate Summaries</h4>
                      <p className="text-sm text-muted-foreground">Create professional, technical, and skills summaries.</p>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Enhancement Result */}
              <AnimatePresence>
                {activeEnhancement && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                  >
                    <Card className="p-6 border-2 border-primary/20">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-lg flex items-center gap-2">
                          <Sparkles className="w-5 h-5 text-primary" />
                          Enhancement Result
                        </h3>
                        {enhancementResult && (
                          <div className="flex gap-2">
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => copyToClipboard(enhancementResult, "enhancement")}
                            >
                              {copiedText === "enhancement" ? (
                                <Check className="w-4 h-4 mr-1" />
                              ) : (
                                <Copy className="w-4 h-4 mr-1" />
                              )}
                              Copy
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => { setActiveEnhancement(null); setEnhancementResult(""); }}>
                              Close
                            </Button>
                          </div>
                        )}
                      </div>
                      
                      {!enhancementResult ? (
                        <div className="flex items-center justify-center py-12">
                          <div className="text-center">
                            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                            <p className="text-muted-foreground">Generating with AI...</p>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-muted/50 rounded-lg p-4 max-h-[500px] overflow-y-auto">
                          <pre className="whitespace-pre-wrap font-sans text-sm">{enhancementResult}</pre>
                        </div>
                      )}
                    </Card>
                  </motion.div>
                )}
              </AnimatePresence>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </div>
  );
}
