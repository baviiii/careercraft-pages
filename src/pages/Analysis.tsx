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
} from "lucide-react";
import { analyzeResume, ATSAnalysis } from "@/lib/atsAnalyzer";
import { autoFixFormatting, getRecruiterReview } from "@/lib/aiRewriter";
import { parseResume } from "@/lib/resumeParser";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function Analysis() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [analysis, setAnalysis] = useState<ATSAnalysis | null>(null);
  const [fileName, setFileName] = useState("");
  const [isFixing, setIsFixing] = useState(false);
  const [reviewMode, setReviewMode] = useState<"harsh" | "soft" | "tech" | "junior" | "australian">("harsh");
  const [recruiterFeedback, setRecruiterFeedback] = useState<string>("");
  const [isReviewing, setIsReviewing] = useState(false);
  const [resumeText, setResumeText] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  useEffect(() => {
    const storedResume = sessionStorage.getItem("resumeText");
    const storedJob = sessionStorage.getItem("jobDescription");
    const storedFileName = sessionStorage.getItem("fileName");

    if (storedResume && storedJob) {
      setResumeText(storedResume);
      setJobDescription(storedJob);
      setFileName(storedFileName || "Resume");
      const result = analyzeResume(storedResume, storedJob);
      setAnalysis(result);
    }
  }, []);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setIsUploading(true);
    setUploadedFile(file);
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

  const handleAnalyze = () => {
    if (!resumeText || !jobDescription.trim()) {
      toast({
        title: "Missing information",
        description: "Please provide both a resume and job description.",
        variant: "destructive",
      });
      return;
    }
    sessionStorage.setItem("jobDescription", jobDescription);
    const result = analyzeResume(resumeText, jobDescription);
    setAnalysis(result);
    toast({
      title: "Analysis complete",
      description: `Your ATS score is ${result.score}/100`,
    });
  };

  const handleAutoFix = async () => {
    if (!resumeText) return;

    setIsFixing(true);
    try {
      const fixed = await autoFixFormatting(resumeText);
      sessionStorage.setItem("resumeText", fixed);
      setResumeText(fixed);
      
      if (jobDescription) {
        const newAnalysis = analyzeResume(fixed, jobDescription);
        setAnalysis(newAnalysis);
      }

      toast({
        title: "✓ Formatting Fixed",
        description: "Your resume has been automatically optimized for ATS compatibility.",
      });
    } catch (error) {
      toast({
        title: "Auto-fix Failed",
        description: error instanceof Error ? error.message : "Could not fix formatting",
        variant: "destructive",
      });
    } finally {
      setIsFixing(false);
    }
  };

  const handleGetReview = async () => {
    if (!resumeText || !jobDescription) return;

    setIsReviewing(true);
    try {
      const feedback = await getRecruiterReview(resumeText, jobDescription, reviewMode);
      setRecruiterFeedback(feedback);
      toast({
        title: "✓ Review Complete",
        description: "See your recruiter feedback below.",
      });
    } catch (error) {
      toast({
        title: "Review Failed",
        description: error instanceof Error ? error.message : "Could not get review",
        variant: "destructive",
      });
    } finally {
      setIsReviewing(false);
    }
  };

  const getTopRecommendations = () => {
    if (!analysis) return [];
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return analysis.issues
      .sort((a, b) => priorityOrder[a.severity] - priorityOrder[b.severity])
      .slice(0, 10);
  };

  // Show upload UI when no analysis
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
                <span className="bg-gradient-hero bg-clip-text text-transparent">ATS Analysis</span>
              </h1>
              <p className="text-lg text-muted-foreground">
                Upload your resume and paste the job description to see how well you match
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Resume Upload */}
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
                      onClick={() => { setResumeText(""); setUploadedFile(null); }}
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

              {/* Job Description */}
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
                disabled={!resumeText || !jobDescription.trim()}
                className="px-12"
              >
                <BarChart3 className="w-5 h-5 mr-2" />
                Analyze Resume
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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background/95 backdrop-blur sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={() => navigate("/dashboard")}
            className="text-2xl font-bold bg-gradient-hero bg-clip-text text-transparent"
          >
            ResumeAI
          </button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate("/upload")}>
              <Upload className="w-4 h-4 mr-2" />
              Upload New
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
          transition={{ duration: 0.5 }}
          className="max-w-7xl mx-auto"
        >
          {/* Hero Score Card */}
          <Card className={`p-8 mb-6 bg-gradient-to-br ${getScoreGradient(analysis.score)} border-2`}>
            <div className="grid md:grid-cols-3 gap-8 items-center">
              <div className="md:col-span-2">
                <div className="flex items-center gap-2 mb-2">
                  <BarChart3 className="w-5 h-5 text-primary" />
                  <p className="text-sm font-medium text-muted-foreground">ATS Compatibility Score</p>
                </div>
                <h1 className="text-3xl font-bold mb-4">{fileName}</h1>
                <div className="flex items-end gap-6">
                  <div className={`text-7xl font-black ${getScoreColor(analysis.score)}`}>
                    {analysis.score}
                  </div>
                  <div className="pb-2">
                    <p className="text-2xl font-bold">{getScoreLabel(analysis.score)}</p>
                    <p className="text-sm text-muted-foreground">out of 100</p>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="font-medium">Keyword Match</span>
                    <span className="font-bold">
                      {analysis.keywords.matchRate.toFixed(0)}%
                    </span>
                  </div>
                  <Progress value={analysis.keywords.matchRate} className="h-3" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center p-4 bg-background/60 backdrop-blur rounded-xl border border-border">
                    <CheckCircle2 className="w-5 h-5 text-green-500 mx-auto mb-1" />
                    <p className="text-2xl font-bold text-green-500">
                      {analysis.keywords.matched.length}
                    </p>
                    <p className="text-xs text-muted-foreground">Matched</p>
                  </div>
                  <div className="text-center p-4 bg-background/60 backdrop-blur rounded-xl border border-border">
                    <AlertCircle className="w-5 h-5 text-red-500 mx-auto mb-1" />
                    <p className="text-2xl font-bold text-red-500">
                      {analysis.keywords.missing.length}
                    </p>
                    <p className="text-xs text-muted-foreground">Missing</p>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          <Tabs defaultValue="recommendations" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4 h-auto p-1">
              <TabsTrigger value="recommendations" className="flex items-center gap-2 py-3">
                <Zap className="w-4 h-4" />
                <span className="hidden sm:inline">Top Issues</span>
              </TabsTrigger>
              <TabsTrigger value="recruiter" className="flex items-center gap-2 py-3">
                <Sparkles className="w-4 h-4" />
                <span className="hidden sm:inline">AI Review</span>
              </TabsTrigger>
              <TabsTrigger value="keywords" className="flex items-center gap-2 py-3">
                <Search className="w-4 h-4" />
                <span className="hidden sm:inline">Keywords</span>
              </TabsTrigger>
              <TabsTrigger value="all-issues" className="flex items-center gap-2 py-3">
                <Target className="w-4 h-4" />
                <span className="hidden sm:inline">All Issues</span>
              </TabsTrigger>
            </TabsList>

            {/* Top Recommendations Tab */}
            <TabsContent value="recommendations" className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold flex items-center gap-2">
                    <Zap className="w-6 h-6 text-primary" />
                    Top {Math.min(getTopRecommendations().length, 10)} Priority Fixes
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Focus on these high-impact improvements first
                  </p>
                </div>
                <Button 
                  size="lg"
                  variant="hero" 
                  onClick={handleAutoFix}
                  disabled={isFixing}
                  className="group"
                >
                  {isFixing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Fixing...
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-5 h-5 mr-2" />
                      Auto-Fix All
                    </>
                  )}
                </Button>
              </div>
              
              <div className="grid gap-4">
                {getTopRecommendations().map((issue, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card className="p-6 hover:shadow-lg transition-all hover:border-primary/50">
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-lg">
                          {index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-bold text-lg">{issue.title}</h3>
                            <Badge 
                              variant={issue.severity === "high" ? "destructive" : issue.severity === "medium" ? "default" : "secondary"}
                            >
                              {issue.severity}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {issue.category}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-3">{issue.description}</p>
                          <div className="bg-primary/5 border border-primary/10 rounded-lg px-4 py-3">
                            <p className="text-sm">
                              <span className="font-semibold text-primary">💡 Solution: </span>
                              {issue.suggestion}
                            </p>
                          </div>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </TabsContent>

            {/* AI Recruiter Review Tab */}
            <TabsContent value="recruiter" className="space-y-4">
              <Card className="p-6 bg-gradient-to-br from-primary/5 to-accent/5">
                <div className="flex items-center gap-3 mb-4">
                  <Sparkles className="w-7 h-7 text-primary" />
                  <div>
                    <h2 className="text-2xl font-bold">Real Recruiter Mode</h2>
                    <p className="text-sm text-muted-foreground">
                      Get AI-powered feedback from different recruiter perspectives
                    </p>
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                  <Select value={reviewMode} onValueChange={(value: any) => setReviewMode(value)}>
                    <SelectTrigger className="w-full sm:w-[280px]">
                      <SelectValue placeholder="Select review type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="harsh">🔥 Harsh but Honest</SelectItem>
                      <SelectItem value="soft">💚 Supportive Coach</SelectItem>
                      <SelectItem value="tech">💻 Tech Hiring Manager</SelectItem>
                      <SelectItem value="junior">🌱 Junior-Friendly</SelectItem>
                      <SelectItem value="australian">🇦🇺 Australian Standards</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Button 
                    size="lg"
                    variant="hero"
                    onClick={handleGetReview}
                    disabled={isReviewing}
                    className="group sm:w-auto w-full"
                  >
                    {isReviewing ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Get AI Review
                      </>
                    )}
                  </Button>
                </div>

                <AnimatePresence mode="wait">
                  {recruiterFeedback ? (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="bg-background rounded-xl border-2 border-primary/20 p-6"
                    >
                      <div className="flex items-center gap-2 mb-4">
                        <div className="text-2xl">
                          {reviewMode === "harsh" && "🔥"}
                          {reviewMode === "soft" && "💚"}
                          {reviewMode === "tech" && "💻"}
                          {reviewMode === "junior" && "🌱"}
                          {reviewMode === "australian" && "🇦🇺"}
                        </div>
                        <h3 className="font-bold text-lg">
                          {reviewMode === "harsh" && "Harsh but Helpful Review"}
                          {reviewMode === "soft" && "Supportive Feedback"}
                          {reviewMode === "tech" && "Tech Manager Perspective"}
                          {reviewMode === "junior" && "Entry-Level Focus"}
                          {reviewMode === "australian" && "Australian Standards Check"}
                        </h3>
                      </div>
                      <div className="prose prose-sm max-w-none text-foreground whitespace-pre-wrap leading-relaxed">
                        {recruiterFeedback}
                      </div>
                    </motion.div>
                  ) : (
                    <Card className="p-8 text-center border-dashed border-2">
                      <Sparkles className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                      <p className="text-muted-foreground">
                        Select a review type and click "Get AI Review" to receive personalized feedback
                      </p>
                    </Card>
                  )}
                </AnimatePresence>
              </Card>
            </TabsContent>

            {/* Keywords Tab */}
            <TabsContent value="keywords" className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <Card className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <CheckCircle2 className="w-6 h-6 text-green-500" />
                    <h3 className="text-xl font-bold">Matched Keywords ({analysis.keywords.matched.length})</h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {analysis.keywords.matched.map((keyword, idx) => (
                      <Badge key={idx} className="bg-green-500/10 text-green-700 border-green-500/20">
                        {keyword}
                      </Badge>
                    ))}
                  </div>
                </Card>

                <Card className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <AlertCircle className="w-6 h-6 text-red-500" />
                    <h3 className="text-xl font-bold">Missing Keywords ({analysis.keywords.missing.length})</h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {analysis.keywords.missing.map((keyword, idx) => (
                      <Badge key={idx} variant="destructive" className="bg-red-500/10 text-red-700 border-red-500/20">
                        {keyword}
                      </Badge>
                    ))}
                  </div>
                </Card>
              </div>
            </TabsContent>

            {/* All Issues Tab */}
            <TabsContent value="all-issues" className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-bold flex items-center gap-2">
                    <Target className="w-6 h-6 text-primary" />
                    All Issues ({analysis.issues.length})
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Complete breakdown of areas for improvement
                  </p>
                </div>
              </div>

              {analysis.issues.length === 0 ? (
                <Card className="p-12 text-center">
                  <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
                  <h3 className="text-2xl font-bold mb-2">Perfect Score!</h3>
                  <p className="text-muted-foreground">
                    Your resume passes all ATS checks. Great job!
                  </p>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {analysis.issues.map((issue, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.03 }}
                    >
                      <Card className="p-6 hover:shadow-lg transition-all">
                        <div className="flex gap-4">
                          <div className="flex-shrink-0">
                            {issue.severity === "high" ? (
                              <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center">
                                <AlertCircle className="w-6 h-6 text-red-500" />
                              </div>
                            ) : issue.severity === "medium" ? (
                              <div className="w-12 h-12 rounded-full bg-yellow-500/10 flex items-center justify-center">
                                <TrendingUp className="w-6 h-6 text-yellow-500" />
                              </div>
                            ) : (
                              <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                                <FileText className="w-6 h-6 text-blue-500" />
                              </div>
                            )}
                          </div>

                          <div className="flex-1">
                            <div className="flex items-start justify-between mb-2">
                              <h3 className="font-bold text-lg">{issue.title}</h3>
                              <div className="flex gap-2">
                                <Badge
                                  variant={
                                    issue.severity === "high"
                                      ? "destructive"
                                      : issue.severity === "medium"
                                      ? "default"
                                      : "secondary"
                                  }
                                >
                                  {issue.severity}
                                </Badge>
                                <Badge variant="outline">{issue.category}</Badge>
                              </div>
                            </div>
                            <p className="text-muted-foreground mb-3">{issue.description}</p>
                            <div className="bg-primary/5 border border-primary/10 rounded-lg p-4">
                              <p className="text-sm">
                                <span className="font-semibold text-primary">💡 Suggestion: </span>
                                {issue.suggestion}
                              </p>
                            </div>
                          </div>
                        </div>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </div>
  );
}
