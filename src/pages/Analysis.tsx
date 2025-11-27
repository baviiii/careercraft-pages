import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  TrendingUp,
  FileText,
  Target,
  Edit3,
  Sparkles,
  Wand2,
  Zap,
} from "lucide-react";
import { analyzeResume, ATSAnalysis } from "@/lib/atsAnalyzer";
import { autoFixFormatting, getRecruiterReview } from "@/lib/aiRewriter";
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

  useEffect(() => {
    const resumeText = sessionStorage.getItem("resumeText");
    const jobDescription = sessionStorage.getItem("jobDescription");
    const storedFileName = sessionStorage.getItem("fileName");

    if (!resumeText || !jobDescription) {
      navigate("/upload");
      return;
    }

    setFileName(storedFileName || "Resume");
    const result = analyzeResume(resumeText, jobDescription);
    setAnalysis(result);
  }, [navigate]);

  const handleAutoFix = async () => {
    const resumeText = sessionStorage.getItem("resumeText");
    if (!resumeText) return;

    setIsFixing(true);
    try {
      const fixed = await autoFixFormatting(resumeText);
      sessionStorage.setItem("resumeText", fixed);
      
      // Re-analyze
      const jobDescription = sessionStorage.getItem("jobDescription");
      if (jobDescription) {
        const newAnalysis = analyzeResume(fixed, jobDescription);
        setAnalysis(newAnalysis);
      }

      toast({
        title: "✓ Formatting fixed",
        description: "Your resume has been automatically optimized for ATS compatibility.",
      });
    } catch (error) {
      toast({
        title: "Auto-fix failed",
        description: error instanceof Error ? error.message : "Could not fix formatting",
        variant: "destructive",
      });
    } finally {
      setIsFixing(false);
    }
  };

  const handleGetReview = async () => {
    const resumeText = sessionStorage.getItem("resumeText");
    const jobDescription = sessionStorage.getItem("jobDescription");
    if (!resumeText || !jobDescription) return;

    setIsReviewing(true);
    try {
      const feedback = await getRecruiterReview(resumeText, jobDescription, reviewMode);
      setRecruiterFeedback(feedback);
      toast({
        title: "✓ Review complete",
        description: "See your recruiter feedback below.",
      });
    } catch (error) {
      toast({
        title: "Review failed",
        description: error instanceof Error ? error.message : "Could not get review",
        variant: "destructive",
      });
    } finally {
      setIsReviewing(false);
    }
  };

  const getTopRecommendations = () => {
    if (!analysis) return [];
    
    // Sort issues by severity and return top 10
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return analysis.issues
      .sort((a, b) => priorityOrder[a.severity] - priorityOrder[b.severity])
      .slice(0, 10);
  };

  if (!analysis) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-lg text-muted-foreground">Analyzing your resume...</p>
        </div>
      </div>
    );
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-success";
    if (score >= 60) return "text-yellow-500";
    return "text-destructive";
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
      <header className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={() => navigate("/")}
            className="text-2xl font-bold bg-gradient-hero bg-clip-text text-transparent"
          >
            ResumeAI
          </button>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => navigate("/upload")}>
              Upload New
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-5xl mx-auto"
        >
          {/* Score Card */}
          <Card className="p-8 mb-8 bg-gradient-subtle">
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div>
                <p className="text-sm text-muted-foreground mb-2">ATS Score for</p>
                <h1 className="text-2xl font-bold mb-4">{fileName}</h1>
                <div className="flex items-baseline gap-4">
                  <div className={`text-6xl font-bold ${getScoreColor(analysis.score)}`}>
                    {analysis.score}
                  </div>
                  <div>
                    <p className="text-xl font-semibold">{getScoreLabel(analysis.score)}</p>
                    <p className="text-sm text-muted-foreground">out of 100</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Keyword Match</span>
                    <span className="font-semibold">
                      {analysis.keywords.matchRate.toFixed(0)}%
                    </span>
                  </div>
                  <Progress value={analysis.keywords.matchRate} className="h-2" />
                </div>

                <div className="grid grid-cols-2 gap-4 mt-6">
                  <div className="text-center p-4 bg-background rounded-lg border border-border">
                    <p className="text-2xl font-bold text-success">
                      {analysis.keywords.matched.length}
                    </p>
                    <p className="text-xs text-muted-foreground">Keywords Matched</p>
                  </div>
                  <div className="text-center p-4 bg-background rounded-lg border border-border">
                    <p className="text-2xl font-bold text-destructive">
                      {analysis.keywords.missing.length}
                    </p>
                    <p className="text-xs text-muted-foreground">Keywords Missing</p>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Real Recruiter Mode */}
          <Card className="p-6 mb-8 bg-gradient-to-br from-accent/10 to-primary/5">
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-primary" />
              Real Recruiter Mode
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              Get AI-powered feedback from different recruiter perspectives
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 mb-4">
              <Select value={reviewMode} onValueChange={(value: any) => setReviewMode(value)}>
                <SelectTrigger className="w-full sm:w-[250px]">
                  <SelectValue placeholder="Select review type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="harsh">🔥 Harsh Review</SelectItem>
                  <SelectItem value="soft">💚 Soft Review</SelectItem>
                  <SelectItem value="tech">💻 Tech Hiring Manager</SelectItem>
                  <SelectItem value="junior">🌱 Junior-Friendly</SelectItem>
                  <SelectItem value="australian">🇦🇺 Australian Format</SelectItem>
                </SelectContent>
              </Select>
              
              <Button 
                variant="hero"
                onClick={handleGetReview}
                disabled={isReviewing}
                className="group"
              >
                {isReviewing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Reviewing...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Get Review
                  </>
                )}
              </Button>
            </div>

            {recruiterFeedback && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-background rounded-lg border border-border p-6"
              >
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  {reviewMode === "harsh" && "🔥 Harsh but Helpful"}
                  {reviewMode === "soft" && "💚 Supportive Feedback"}
                  {reviewMode === "tech" && "💻 Tech Manager Perspective"}
                  {reviewMode === "junior" && "🌱 Entry-Level Focus"}
                  {reviewMode === "australian" && "🇦🇺 Australian Standards"}
                </h3>
                <div className="prose prose-sm max-w-none text-muted-foreground whitespace-pre-wrap">
                  {recruiterFeedback}
                </div>
              </motion.div>
            )}
          </Card>

          {/* Top 10 Recommendations */}
          <Card className="p-6 mb-8 bg-gradient-to-br from-primary/5 to-accent/5">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <Zap className="w-6 h-6 text-primary" />
                Top {Math.min(getTopRecommendations().length, 10)} Improvements
              </h2>
              <Button 
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
                    <Wand2 className="w-4 h-4 mr-2" />
                    Auto-Fix Formatting
                  </>
                )}
              </Button>
            </div>
            
            <div className="grid gap-3">
              {getTopRecommendations().map((issue, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-start gap-3 p-4 bg-background rounded-lg border border-border hover:border-primary/50 transition-colors"
                >
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-sm">{issue.title}</h3>
                      <Badge 
                        variant={issue.severity === "high" ? "destructive" : issue.severity === "medium" ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {issue.severity}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">{issue.description}</p>
                    <div className="bg-accent/50 rounded px-3 py-2">
                      <p className="text-xs">
                        <span className="font-semibold text-primary">Fix: </span>
                        {issue.suggestion}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </Card>

          {/* Issues Breakdown */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <AlertCircle className="w-6 h-6 text-primary" />
              Issues Found ({analysis.issues.length})
            </h2>

            <div className="space-y-4">
              {analysis.issues.map((issue, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                >
                  <Card className="p-6 hover:shadow-elegant transition-shadow">
                    <div className="flex gap-4">
                      <div className="flex-shrink-0">
                        {issue.severity === "high" ? (
                          <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
                            <AlertCircle className="w-5 h-5 text-destructive" />
                          </div>
                        ) : issue.severity === "medium" ? (
                          <div className="w-10 h-10 rounded-full bg-yellow-500/10 flex items-center justify-center">
                            <TrendingUp className="w-5 h-5 text-yellow-500" />
                          </div>
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <FileText className="w-5 h-5 text-primary" />
                          </div>
                        )}
                      </div>

                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="font-semibold text-lg">{issue.title}</h3>
                          <Badge
                            variant={
                              issue.severity === "high"
                                ? "destructive"
                                : issue.severity === "medium"
                                ? "default"
                                : "secondary"
                            }
                          >
                            {issue.category}
                          </Badge>
                        </div>
                        <p className="text-muted-foreground mb-3">{issue.description}</p>
                        <div className="bg-accent/50 rounded-lg p-3">
                          <p className="text-sm">
                            <span className="font-semibold text-success">💡 Suggestion: </span>
                            {issue.suggestion}
                          </p>
                        </div>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}

              {analysis.issues.length === 0 && (
                <Card className="p-8 text-center">
                  <CheckCircle2 className="w-16 h-16 text-success mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">Great Job!</h3>
                  <p className="text-muted-foreground">
                    No major issues detected. Your resume is ATS-ready.
                  </p>
                </Card>
              )}
            </div>
          </div>

          {/* Keyword Analysis */}
          <Card className="p-6 mb-8">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" />
              Keyword Analysis
            </h2>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold text-success mb-3 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Matched Keywords ({analysis.keywords.matched.length})
                </h3>
                <div className="flex flex-wrap gap-2">
                  {analysis.keywords.matched.slice(0, 15).map((keyword, i) => (
                    <Badge key={i} variant="secondary" className="bg-success/10 text-success">
                      {keyword}
                    </Badge>
                  ))}
                  {analysis.keywords.matched.length > 15 && (
                    <Badge variant="outline">+{analysis.keywords.matched.length - 15} more</Badge>
                  )}
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-destructive mb-3 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  Missing Keywords ({analysis.keywords.missing.length})
                </h3>
                <div className="flex flex-wrap gap-2">
                  {analysis.keywords.missing.slice(0, 15).map((keyword, i) => (
                    <Badge key={i} variant="secondary" className="bg-destructive/10 text-destructive">
                      {keyword}
                    </Badge>
                  ))}
                  {analysis.keywords.missing.length > 15 && (
                    <Badge variant="outline">+{analysis.keywords.missing.length - 15} more</Badge>
                  )}
                </div>
              </div>
            </div>
          </Card>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              variant="hero"
              size="lg"
              className="text-lg px-8 group"
              onClick={() => navigate("/editor")}
            >
              <Edit3 className="w-5 h-5" />
              Edit Resume Sections
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button 
              variant="outline" 
              size="lg" 
              className="text-lg px-8"
              onClick={() => navigate("/rewrite")}
            >
              <Sparkles className="w-5 h-5 mr-2" />
              AI Rewrite Mode
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
