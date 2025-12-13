import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { gsap } from "gsap";
import InterviewDashboard from "@/components/interview/InterviewDashboard";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FileText,
  Play,
  CheckCircle2,
  XCircle,
  Lightbulb,
  Target,
  TrendingUp,
  Award,
  ChevronRight,
  Loader2,
  Download,
  RotateCcw,
  Home,
  Menu,
  Sparkles,
  Brain,
  MessageSquare,
  BarChart3,
  AlertTriangle,
  LayoutDashboard,
  BookOpen,
  History,
  Settings,
  Flame,
} from "lucide-react";

const FIELDS = [
  "Software Engineering",
  "DevOps / SRE",
  "Cloud / AWS",
  "Data Science",
  "Product Management",
  "UX/UI Design",
  "Sales",
  "Marketing",
  "Finance",
  "Healthcare / Nursing",
  "Human Resources",
  "Legal",
  "Operations",
  "Customer Success",
];

const SENIORITY = ["Junior", "Mid-Level", "Senior", "Lead", "Manager", "Director", "VP", "C-Level"];

interface Question {
  id: number;
  question: string;
  type: string;
  difficulty: string;
  expectedTopics: string[];
}

interface AnswerEvaluation {
  score: number;
  scoreBreakdown: { relevance: number; clarity: number; depth: number; structure: number };
  validation: { correct: string[]; missing: string[]; redFlags: string[] };
  bestAnswer: string;
  faangAnswer: string;
  confidence: number;
  tips: string[];
  improvement: string;
}

interface FinalEval {
  overallScore: number;
  grade: string;
  strengths: string[];
  weaknesses: string[];
  mustFix: string[];
  improvementPlan: { area: string; action: string; timeline: string }[];
  readiness: string;
  summary: string;
}

export default function InterviewPrep() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // GSAP refs
  const navItemsRef = useRef<HTMLButtonElement[]>([]);
  const mainContentRef = useRef<HTMLDivElement>(null);

  // Update URL when tab changes
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };
  
  // Setup state
  const [field, setField] = useState("");
  const [seniority, setSeniority] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [loading, setLoading] = useState(false);
  
  // Interview state
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [currentAnswer, setCurrentAnswer] = useState("");
  const [evaluations, setEvaluations] = useState<AnswerEvaluation[]>([]);
  const [currentEvaluation, setCurrentEvaluation] = useState<AnswerEvaluation | null>(null);
  const [evaluating, setEvaluating] = useState(false);
  
  // Final evaluation state
  const [finalEvaluation, setFinalEvaluation] = useState<FinalEval | null>(null);
  const [generatingFinal, setGeneratingFinal] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) navigate("/auth");
    });
  }, [navigate]);

  const generateQuestions = async () => {
    if (!field) {
      toast({ title: "Please select a field", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("interview-ai", {
        body: { action: "generate_questions", field, seniority, jobDescription },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setQuestions(data.questions || []);
      setAnswers(new Array(data.questions?.length || 0).fill(""));
      setEvaluations([]);
      setActiveTab("interview");
      
      toast({ title: "Interview simulation ready!", description: `${data.questions?.length} questions generated` });
    } catch (error: any) {
      console.error("Error generating questions:", error);
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const submitAnswer = async () => {
    if (!currentAnswer.trim()) {
      toast({ title: "Please provide an answer", variant: "destructive" });
      return;
    }

    setEvaluating(true);
    const newAnswers = [...answers];
    newAnswers[currentQuestionIndex] = currentAnswer;
    setAnswers(newAnswers);

    try {
      const { data, error } = await supabase.functions.invoke("interview-ai", {
        body: {
          action: "evaluate_answer",
          field,
          question: questions[currentQuestionIndex].question,
          answer: currentAnswer,
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setCurrentEvaluation(data);
      const newEvaluations = [...evaluations];
      newEvaluations[currentQuestionIndex] = data;
      setEvaluations(newEvaluations);
    } catch (error: any) {
      console.error("Error evaluating answer:", error);
      toast({ title: "Error evaluating", description: error.message, variant: "destructive" });
    } finally {
      setEvaluating(false);
    }
  };

  const nextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setCurrentAnswer(answers[currentQuestionIndex + 1] || "");
      setCurrentEvaluation(evaluations[currentQuestionIndex + 1] || null);
    } else {
      generateFinalEvaluation();
    }
  };

  const generateFinalEvaluation = async () => {
    setGeneratingFinal(true);
    setActiveTab("evaluation");

    try {
      const { data, error } = await supabase.functions.invoke("interview-ai", {
        body: {
          action: "final_evaluation",
          field,
          seniority,
          questions,
          answers,
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setFinalEvaluation(data);
    } catch (error: any) {
      console.error("Error generating final evaluation:", error);
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setGeneratingFinal(false);
    }
  };

  const resetInterview = () => {
    setActiveTab("setup");
    setQuestions([]);
    setAnswers([]);
    setEvaluations([]);
    setCurrentQuestionIndex(0);
    setCurrentAnswer("");
    setCurrentEvaluation(null);
    setFinalEvaluation(null);
  };

  const currentQuestion = questions[currentQuestionIndex];
  const progress = questions.length > 0 ? ((currentQuestionIndex + 1) / questions.length) * 100 : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 h-full w-72 bg-card border-r border-border z-50 transform transition-transform duration-300 lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 h-full flex flex-col">
          <button onClick={() => navigate("/dashboard")} className="flex items-center gap-2 mb-8 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center group-hover:scale-105 transition-transform">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold">Interview Prep</span>
          </button>

          <nav className="space-y-1 flex-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-3">Navigation</p>
            
            <button 
              ref={(el) => { if (el) navItemsRef.current[0] = el; }}
              onClick={() => navigate("/dashboard")} 
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:bg-muted hover:translate-x-1 transition-all"
            >
              <Home className="w-5 h-5" />Back to Main
            </button>
            
            <button 
              ref={(el) => { if (el) navItemsRef.current[1] = el; }}
              onClick={() => handleTabChange("dashboard")} 
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all hover:translate-x-1 ${activeTab === 'dashboard' ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:bg-muted'}`}
            >
              <LayoutDashboard className="w-5 h-5" />Progress Dashboard
            </button>
            
            <button 
              ref={(el) => { if (el) navItemsRef.current[2] = el; }}
              onClick={() => handleTabChange("setup")} 
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all hover:translate-x-1 ${activeTab === 'setup' ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:bg-muted'}`}
            >
              <Target className="w-5 h-5" />New Practice
            </button>
            
            <button 
              ref={(el) => { if (el) navItemsRef.current[3] = el; }}
              onClick={() => questions.length > 0 && handleTabChange("interview")} 
              disabled={questions.length === 0} 
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all hover:translate-x-1 ${activeTab === 'interview' ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:bg-muted'} disabled:opacity-50 disabled:hover:translate-x-0`}
            >
              <MessageSquare className="w-5 h-5" />Active Interview
              {questions.length > 0 && <Badge className="ml-auto bg-green-500 text-[10px]">Live</Badge>}
            </button>
            
            <button 
              ref={(el) => { if (el) navItemsRef.current[4] = el; }}
              onClick={() => finalEvaluation && handleTabChange("evaluation")} 
              disabled={!finalEvaluation} 
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all hover:translate-x-1 ${activeTab === 'evaluation' ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:bg-muted'} disabled:opacity-50 disabled:hover:translate-x-0`}
            >
              <BarChart3 className="w-5 h-5" />Results
            </button>

            <div className="border-t my-4" />
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-3">Resources</p>
            
            <button 
              ref={(el) => { if (el) navItemsRef.current[5] = el; }}
              onClick={() => handleTabChange("history")} 
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all hover:translate-x-1 ${activeTab === 'history' ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:bg-muted'}`}
            >
              <History className="w-5 h-5" />Session History
            </button>
            
            <button 
              ref={(el) => { if (el) navItemsRef.current[6] = el; }}
              onClick={() => handleTabChange("resources")} 
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all hover:translate-x-1 ${activeTab === 'resources' ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:bg-muted'}`}
            >
              <BookOpen className="w-5 h-5" />Learning Resources
            </button>
          </nav>

          {/* Streak Card */}
          <Card className="p-4 bg-gradient-to-br from-orange-500/10 to-amber-500/10 border-orange-500/20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center">
                <Flame className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <p className="font-semibold text-sm">Keep Practicing!</p>
                <p className="text-xs text-muted-foreground">Build your streak</p>
              </div>
            </div>
          </Card>
        </div>
      </aside>

      {/* Main Content */}
      <div className="lg:pl-72">
        <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border">
          <div className="flex items-center justify-between px-4 md:px-8 py-4">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSidebarOpen(true)}>
                <Menu className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-xl md:text-2xl font-bold">Interview Preparation</h1>
                <p className="text-sm text-muted-foreground hidden sm:block">AI-powered interview simulation & coaching</p>
              </div>
            </div>
            {questions.length > 0 && (
              <Button variant="outline" onClick={resetInterview}>
                <RotateCcw className="w-4 h-4 mr-2" />Start Over
              </Button>
            )}
          </div>
        </header>

        <main ref={mainContentRef} className="p-4 md:p-8">
          <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
            <TabsList className="grid w-full max-w-2xl grid-cols-4">
              <TabsTrigger value="dashboard" className="gap-2"><LayoutDashboard className="w-4 h-4" />Dashboard</TabsTrigger>
              <TabsTrigger value="setup" className="gap-2"><Target className="w-4 h-4" />Practice</TabsTrigger>
              <TabsTrigger value="interview" disabled={questions.length === 0} className="gap-2"><MessageSquare className="w-4 h-4" />Interview</TabsTrigger>
              <TabsTrigger value="evaluation" disabled={!finalEvaluation} className="gap-2"><BarChart3 className="w-4 h-4" />Results</TabsTrigger>
            </TabsList>

            {/* DASHBOARD TAB */}
            <TabsContent value="dashboard">
              <InterviewDashboard />
            </TabsContent>

            {/* SETUP TAB */}
            <TabsContent value="setup" className="space-y-6">
              <Card className="p-6">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" />Configure Your Interview
                </h2>

                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Select Your Field *</label>
                    <Select value={field} onValueChange={setField}>
                      <SelectTrigger><SelectValue placeholder="Choose a field" /></SelectTrigger>
                      <SelectContent>
                        {FIELDS.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Seniority Level</label>
                    <Select value={seniority} onValueChange={setSeniority}>
                      <SelectTrigger><SelectValue placeholder="Select level" /></SelectTrigger>
                      <SelectContent>
                        {SENIORITY.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-medium">Job Description (Optional)</label>
                    <Textarea
                      value={jobDescription}
                      onChange={(e) => setJobDescription(e.target.value)}
                      placeholder="Paste the job description here for more targeted questions..."
                      className="min-h-[150px]"
                    />
                    <p className="text-xs text-muted-foreground">Adding a job description helps generate more relevant interview questions</p>
                  </div>
                </div>

                <Button onClick={generateQuestions} disabled={loading || !field} className="mt-6 w-full sm:w-auto" size="lg">
                  {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating...</> : <><Play className="w-4 h-4 mr-2" />Start Interview Simulation</>}
                </Button>
              </Card>
            </TabsContent>

            {/* INTERVIEW TAB */}
            <TabsContent value="interview" className="space-y-6">
              {currentQuestion && (
                <>
                  {/* Progress */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Question {currentQuestionIndex + 1} of {questions.length}</span>
                      <span>{Math.round(progress)}% Complete</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                  </div>

                  {/* Question Card */}
                  <Card className="p-6">
                    <div className="flex items-start gap-4 mb-4">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <Brain className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <div className="flex flex-wrap gap-2 mb-2">
                          <Badge variant="outline">{currentQuestion.type}</Badge>
                          <Badge variant={currentQuestion.difficulty === "hard" ? "destructive" : currentQuestion.difficulty === "medium" ? "secondary" : "outline"}>
                            {currentQuestion.difficulty}
                          </Badge>
                        </div>
                        <p className="text-lg font-medium">{currentQuestion.question}</p>
                      </div>
                    </div>

                    <Textarea
                      value={currentAnswer}
                      onChange={(e) => setCurrentAnswer(e.target.value)}
                      placeholder="Type your answer here..."
                      className="min-h-[150px] mb-4"
                      disabled={evaluating}
                    />

                    <div className="flex gap-3">
                      <Button onClick={submitAnswer} disabled={evaluating || !currentAnswer.trim()}>
                        {evaluating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Evaluating...</> : <>Submit Answer<ChevronRight className="w-4 h-4 ml-2" /></>}
                      </Button>
                    </div>
                  </Card>

                  {/* Evaluation Feedback */}
                  <AnimatePresence>
                    {currentEvaluation && (
                      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                        <Card className="p-6 space-y-6">
                          <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold flex items-center gap-2">
                              <Sparkles className="w-5 h-5 text-primary" />AI Feedback
                            </h3>
                            <div className="flex items-center gap-2">
                              <span className="text-3xl font-bold">{currentEvaluation.score}</span>
                              <span className="text-muted-foreground">/10</span>
                            </div>
                          </div>

                          {/* Score Breakdown */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {Object.entries(currentEvaluation.scoreBreakdown || {}).map(([key, value]) => (
                              <div key={key} className="text-center p-3 bg-muted/50 rounded-lg">
                                <p className="text-2xl font-bold">{value}</p>
                                <p className="text-xs text-muted-foreground capitalize">{key}</p>
                              </div>
                            ))}
                          </div>

                          {/* Confidence Meter */}
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span>Confidence Level</span>
                              <span>{currentEvaluation.confidence}%</span>
                            </div>
                            <Progress value={currentEvaluation.confidence} className="h-2" />
                          </div>

                          {/* Validation */}
                          <div className="grid md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                              <h4 className="font-medium flex items-center gap-2 text-green-600"><CheckCircle2 className="w-4 h-4" />What You Got Right</h4>
                              <ul className="text-sm space-y-1">
                                {currentEvaluation.validation?.correct?.map((item, i) => (
                                  <li key={i} className="text-muted-foreground">• {item}</li>
                                ))}
                              </ul>
                            </div>
                            <div className="space-y-2">
                              <h4 className="font-medium flex items-center gap-2 text-amber-600"><Lightbulb className="w-4 h-4" />Missing Points</h4>
                              <ul className="text-sm space-y-1">
                                {currentEvaluation.validation?.missing?.map((item, i) => (
                                  <li key={i} className="text-muted-foreground">• {item}</li>
                                ))}
                              </ul>
                            </div>
                            <div className="space-y-2">
                              <h4 className="font-medium flex items-center gap-2 text-red-600"><AlertTriangle className="w-4 h-4" />Red Flags</h4>
                              <ul className="text-sm space-y-1">
                                {currentEvaluation.validation?.redFlags?.length ? currentEvaluation.validation.redFlags.map((item, i) => (
                                  <li key={i} className="text-muted-foreground">• {item}</li>
                                )) : <li className="text-muted-foreground">• None detected</li>}
                              </ul>
                            </div>
                          </div>

                          {/* Best Answer */}
                          <div className="space-y-2">
                            <h4 className="font-medium flex items-center gap-2"><Award className="w-4 h-4 text-primary" />Industry Best Answer</h4>
                            <p className="text-sm text-muted-foreground bg-muted/50 p-4 rounded-lg">{currentEvaluation.bestAnswer}</p>
                          </div>

                          {/* FAANG Answer */}
                          <div className="space-y-2">
                            <h4 className="font-medium flex items-center gap-2"><TrendingUp className="w-4 h-4 text-primary" />FAANG-Optimized Answer</h4>
                            <p className="text-sm text-muted-foreground bg-gradient-to-r from-primary/5 to-primary/10 p-4 rounded-lg border border-primary/20">{currentEvaluation.faangAnswer}</p>
                          </div>

                          {/* Tips */}
                          <div className="space-y-2">
                            <h4 className="font-medium">Tips for Improvement</h4>
                            <div className="flex flex-wrap gap-2">
                              {currentEvaluation.tips?.map((tip, i) => (
                                <Badge key={i} variant="secondary">{tip}</Badge>
                              ))}
                            </div>
                          </div>

                          <Button onClick={nextQuestion} className="w-full" size="lg">
                            {currentQuestionIndex < questions.length - 1 ? <>Next Question<ChevronRight className="w-4 h-4 ml-2" /></> : <>Complete Interview & Get Final Evaluation</>}
                          </Button>
                        </Card>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </>
              )}
            </TabsContent>

            {/* EVALUATION TAB */}
            <TabsContent value="evaluation" className="space-y-6">
              {generatingFinal ? (
                <Card className="p-12 text-center">
                  <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin text-primary" />
                  <h3 className="text-lg font-semibold">Generating Final Evaluation...</h3>
                  <p className="text-muted-foreground">Analyzing your interview performance</p>
                </Card>
              ) : finalEvaluation ? (
                <>
                  {/* Overall Score */}
                  <Card className="p-6 text-center bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
                    <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-primary/20 flex items-center justify-center">
                      <span className="text-4xl font-bold">{finalEvaluation.grade}</span>
                    </div>
                    <h2 className="text-2xl font-bold mb-2">Overall Score: {finalEvaluation.overallScore}/100</h2>
                    <Badge variant={finalEvaluation.readiness === "Ready" ? "default" : finalEvaluation.readiness === "Almost Ready" ? "secondary" : "destructive"} className="text-sm">
                      {finalEvaluation.readiness}
                    </Badge>
                    <p className="mt-4 text-muted-foreground max-w-2xl mx-auto">{finalEvaluation.summary}</p>
                  </Card>

                  {/* Strengths & Weaknesses */}
                  <div className="grid md:grid-cols-2 gap-6">
                    <Card className="p-6">
                      <h3 className="font-semibold mb-4 flex items-center gap-2 text-green-600"><CheckCircle2 className="w-5 h-5" />Strengths</h3>
                      <ul className="space-y-2">
                        {finalEvaluation.strengths?.map((s, i) => (
                          <li key={i} className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-green-500 mt-1 shrink-0" />{s}</li>
                        ))}
                      </ul>
                    </Card>
                    <Card className="p-6">
                      <h3 className="font-semibold mb-4 flex items-center gap-2 text-amber-600"><XCircle className="w-5 h-5" />Weaknesses</h3>
                      <ul className="space-y-2">
                        {finalEvaluation.weaknesses?.map((w, i) => (
                          <li key={i} className="flex items-start gap-2"><XCircle className="w-4 h-4 text-amber-500 mt-1 shrink-0" />{w}</li>
                        ))}
                      </ul>
                    </Card>
                  </div>

                  {/* Must Fix */}
                  <Card className="p-6 border-red-200 bg-red-50/50 dark:bg-red-950/20">
                    <h3 className="font-semibold mb-4 flex items-center gap-2 text-red-600"><AlertTriangle className="w-5 h-5" />Must Fix Before Applying</h3>
                    <ul className="space-y-2">
                      {finalEvaluation.mustFix?.map((fix, i) => (
                        <li key={i} className="flex items-start gap-2"><AlertTriangle className="w-4 h-4 text-red-500 mt-1 shrink-0" />{fix}</li>
                      ))}
                    </ul>
                  </Card>

                  {/* Improvement Plan */}
                  <Card className="p-6">
                    <h3 className="font-semibold mb-4 flex items-center gap-2"><Target className="w-5 h-5 text-primary" />Personalized Improvement Plan</h3>
                    <div className="space-y-4">
                      {finalEvaluation.improvementPlan?.map((item, i) => (
                        <div key={i} className="flex items-start gap-4 p-4 bg-muted/50 rounded-lg">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <span className="text-sm font-bold text-primary">{i + 1}</span>
                          </div>
                          <div className="flex-1">
                            <h4 className="font-medium">{item.area}</h4>
                            <p className="text-sm text-muted-foreground">{item.action}</p>
                            <Badge variant="outline" className="mt-2">{item.timeline}</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>

                  <div className="flex gap-4">
                    <Button onClick={resetInterview} variant="outline" className="flex-1">
                      <RotateCcw className="w-4 h-4 mr-2" />Practice Again
                    </Button>
                    <Button className="flex-1">
                      <Download className="w-4 h-4 mr-2" />Download Report
                    </Button>
                  </div>
                </>
              ) : null}
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  );
}
