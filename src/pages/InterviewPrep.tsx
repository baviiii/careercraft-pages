import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { usePersonalization } from "@/hooks/usePersonalization";
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
  ChevronLeft,
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
  Flame,
  Clock,
  Zap,
  GraduationCap,
  Video,
  FileQuestion,
  ExternalLink,
  Star,
  Users,
  ArrowRight,
  Info,
  HelpCircle,
  Mic,
  Timer,
  PauseCircle,
  PlayCircle,
  Volume2,
  Wand2,
  UserCheck,
  Settings,
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

interface LearningResource {
  id: string;
  title: string;
  description: string;
  type: 'video' | 'article' | 'course' | 'practice';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  duration: string;
  url: string;
  skill: string;
  provider: string;
  rating?: number;
}

// Onboarding steps for first-time users
const ONBOARDING_STEPS = [
  {
    title: "Welcome to Interview Prep",
    description: "Master your interviews with AI-powered practice sessions",
    icon: Brain,
  },
  {
    title: "Choose Your Path",
    description: "Select your field and seniority level for tailored questions",
    icon: Target,
  },
  {
    title: "Practice & Learn",
    description: "Answer questions and get instant AI feedback",
    icon: MessageSquare,
  },
  {
    title: "Track Progress",
    description: "Monitor your improvement over time",
    icon: TrendingUp,
  },
];

export default function InterviewPrep() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Personalization
  const {
    profile: userProfile,
    loading: profileLoading,
    hasPersonalizationData,
    getInterviewDefaults,
    getPersonalizationSummary,
  } = usePersonalization();
  
  const [usePersonalizedSettings, setUsePersonalizedSettings] = useState(true);

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
  
  // Apply personalized defaults when profile loads
  useEffect(() => {
    if (hasPersonalizationData && !profileLoading && usePersonalizedSettings && !field) {
      const defaults = getInterviewDefaults();
      if (defaults.field) {
        // Map industry to field
        const fieldMap: Record<string, string> = {
          'technology': 'Software Engineering',
          'software': 'Software Engineering',
          'devops': 'DevOps / SRE',
          'cloud': 'Cloud / AWS',
          'data': 'Data Science',
          'product': 'Product Management',
          'design': 'UX/UI Design',
          'sales': 'Sales',
          'marketing': 'Marketing',
          'finance': 'Finance',
          'healthcare': 'Healthcare / Nursing',
          'hr': 'Human Resources',
          'legal': 'Legal',
        };
        const mappedField = Object.entries(fieldMap).find(([key]) => 
          defaults.field.toLowerCase().includes(key)
        )?.[1] || defaults.field;
        
        if (FIELDS.includes(mappedField)) {
          setField(mappedField);
        }
      }
      
      // Map career level to seniority
      if (userProfile.careerLevel) {
        const seniorityMap: Record<string, string> = {
          'entry': 'Junior',
          'junior': 'Junior',
          'mid': 'Mid-Level',
          'senior': 'Senior',
          'lead': 'Lead',
          'manager': 'Manager',
          'director': 'Director',
          'vp': 'VP',
          'executive': 'C-Level',
        };
        const mappedSeniority = Object.entries(seniorityMap).find(([key]) => 
          userProfile.careerLevel?.toLowerCase().includes(key)
        )?.[1];
        
        if (mappedSeniority && SENIORITY.includes(mappedSeniority)) {
          setSeniority(mappedSeniority);
        }
      }
    }
  }, [hasPersonalizationData, profileLoading, usePersonalizedSettings]);
  
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
  
  // Resources state
  const [resources, setResources] = useState<LearningResource[]>([]);
  const [loadingResources, setLoadingResources] = useState(false);
  const [selectedSkillFilter, setSelectedSkillFilter] = useState<string>('all');
  
  // UX state
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [interviewTimer, setInterviewTimer] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) navigate("/auth");
    });
    
    // Check if first visit
    const hasSeenOnboarding = localStorage.getItem('interview-prep-onboarding');
    if (!hasSeenOnboarding) {
      setShowOnboarding(true);
    }
  }, [navigate]);

  // Interview timer
  useEffect(() => {
    if (timerRunning) {
      timerRef.current = setInterval(() => {
        setInterviewTimer(prev => prev + 1);
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timerRunning]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const completeOnboarding = () => {
    localStorage.setItem('interview-prep-onboarding', 'true');
    setShowOnboarding(false);
  };

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
      setSearchParams({ tab: "interview" });
      
      // Start timer
      setInterviewTimer(0);
      setTimerRunning(true);
      
      toast({ title: "Interview simulation ready!", description: `${data.questions?.length} questions generated. Good luck!` });
    } catch (error: any) {
      console.error("Error generating questions:", error);
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // Fetch AI-powered learning resources
  const fetchResources = useCallback(async (skillFocus?: string) => {
    setLoadingResources(true);
    try {
      // Generate resources based on user's field and weaknesses
      const { data, error } = await supabase.functions.invoke("interview-ai", {
        body: { 
          action: "generate_resources",
          field: field || "Software Engineering",
          seniority: seniority || "Mid-Level",
          weaknesses: finalEvaluation?.weaknesses || [],
          skillFocus,
        },
      });

      if (error) throw error;
      
      // If AI resources work, use them; otherwise use curated fallback
      if (data?.resources) {
        setResources(data.resources);
      } else {
        // Curated fallback resources
        setResources(getCuratedResources(field || "Software Engineering", skillFocus));
      }
    } catch (error) {
      console.error("Error fetching resources:", error);
      // Use curated fallback
      setResources(getCuratedResources(field || "Software Engineering", skillFocus));
    } finally {
      setLoadingResources(false);
    }
  }, [field, seniority, finalEvaluation]);

  // Curated resources fallback (no AI needed)
  const getCuratedResources = (userField: string, skillFocus?: string): LearningResource[] => {
    const baseResources: LearningResource[] = [
      {
        id: '1',
        title: 'STAR Method Masterclass',
        description: 'Learn to structure behavioral answers that impress interviewers',
        type: 'video',
        difficulty: 'beginner',
        duration: '15 min',
        url: 'https://www.youtube.com/results?search_query=star+method+interview',
        skill: 'Behavioral',
        provider: 'YouTube',
        rating: 4.8,
      },
      {
        id: '2',
        title: 'Common Interview Questions & Answers',
        description: 'Top 50 questions with expert-crafted responses',
        type: 'article',
        difficulty: 'beginner',
        duration: '20 min read',
        url: 'https://www.indeed.com/career-advice/interviewing/top-interview-questions-and-answers',
        skill: 'General',
        provider: 'Indeed',
        rating: 4.6,
      },
      {
        id: '3',
        title: 'Body Language in Interviews',
        description: 'Non-verbal communication tips for confidence',
        type: 'video',
        difficulty: 'intermediate',
        duration: '12 min',
        url: 'https://www.youtube.com/results?search_query=interview+body+language',
        skill: 'Communication',
        provider: 'YouTube',
        rating: 4.5,
      },
      {
        id: '4',
        title: 'Salary Negotiation Guide',
        description: 'How to negotiate your offer with confidence',
        type: 'article',
        difficulty: 'advanced',
        duration: '15 min read',
        url: 'https://www.glassdoor.com/blog/guide/how-to-negotiate-salary/',
        skill: 'Negotiation',
        provider: 'Glassdoor',
        rating: 4.7,
      },
    ];

    // Add field-specific resources
    if (userField.includes('Software') || userField.includes('DevOps')) {
      baseResources.push(
        {
          id: '5',
          title: 'System Design Interview Prep',
          description: 'Learn to design scalable systems step by step',
          type: 'course',
          difficulty: 'advanced',
          duration: '4 hours',
          url: 'https://www.youtube.com/results?search_query=system+design+interview',
          skill: 'System Design',
          provider: 'YouTube',
          rating: 4.9,
        },
        {
          id: '6',
          title: 'LeetCode Top Interview Questions',
          description: 'Practice the most common coding problems',
          type: 'practice',
          difficulty: 'intermediate',
          duration: 'Self-paced',
          url: 'https://leetcode.com/problem-list/top-interview-questions/',
          skill: 'Coding',
          provider: 'LeetCode',
          rating: 4.8,
        }
      );
    }

    if (userField.includes('Product')) {
      baseResources.push(
        {
          id: '7',
          title: 'Product Sense Interview Guide',
          description: 'Framework for product design questions',
          type: 'article',
          difficulty: 'intermediate',
          duration: '25 min read',
          url: 'https://www.productmanagementexercises.com/',
          skill: 'Product Sense',
          provider: 'PM Exercises',
          rating: 4.7,
        }
      );
    }

    // Filter by skill if specified
    if (skillFocus && skillFocus !== 'all') {
      return baseResources.filter(r => 
        r.skill.toLowerCase().includes(skillFocus.toLowerCase())
      );
    }

    return baseResources;
  };

  // Load resources when tab changes to resources
  useEffect(() => {
    if (activeTab === 'resources' && resources.length === 0) {
      fetchResources();
    }
  }, [activeTab, fetchResources, resources.length]);

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
    setSearchParams({ tab: "setup" });
    setQuestions([]);
    setAnswers([]);
    setEvaluations([]);
    setCurrentQuestionIndex(0);
    setCurrentAnswer("");
    setCurrentEvaluation(null);
    setFinalEvaluation(null);
    setTimerRunning(false);
    setInterviewTimer(0);
  };

  const getResourceIcon = (type: string) => {
    switch (type) {
      case 'video': return Video;
      case 'article': return FileText;
      case 'course': return GraduationCap;
      case 'practice': return FileQuestion;
      default: return BookOpen;
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-500/10 text-green-600 border-green-500/20';
      case 'intermediate': return 'bg-amber-500/10 text-amber-600 border-amber-500/20';
      case 'advanced': return 'bg-red-500/10 text-red-600 border-red-500/20';
      default: return 'bg-muted';
    }
  };

  const currentQuestion = questions[currentQuestionIndex];
  const progress = questions.length > 0 ? ((currentQuestionIndex + 1) / questions.length) * 100 : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/40 to-sky-50/30 dark:from-slate-950 dark:via-blue-950/20 dark:to-slate-900 relative overflow-hidden">
      {/* Beautiful Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/80 via-white/50 to-sky-50/60 dark:from-blue-950/30 dark:via-slate-900/50 dark:to-slate-950" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(59,130,246,0.12),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(14,165,233,0.08),transparent_50%)]" />
        <div className="absolute top-20 right-[20%] w-[500px] h-[500px] bg-gradient-to-br from-blue-400/15 to-sky-300/10 rounded-full blur-[100px]" style={{ animation: "float-slow 10s ease-in-out infinite" }} />
        <div className="absolute bottom-20 left-[10%] w-[400px] h-[400px] bg-gradient-to-br from-sky-400/10 to-blue-300/10 rounded-full blur-[80px]" style={{ animation: "float-slower 12s ease-in-out infinite" }} />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(59,130,246,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.02)_1px,transparent_1px)] bg-[size:60px_60px]" />
      </div>
      {/* Onboarding Modal */}
      <AnimatePresence>
        {showOnboarding && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-card rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden"
            >
              <div className="p-8">
                {/* Progress dots */}
                <div className="flex justify-center gap-2 mb-8">
                  {ONBOARDING_STEPS.map((_, i) => (
                    <div 
                      key={i} 
                      className={`w-2 h-2 rounded-full transition-all ${i === onboardingStep ? 'w-8 bg-primary' : i < onboardingStep ? 'bg-primary/50' : 'bg-muted'}`}
                    />
                  ))}
                </div>

                {/* Content */}
                <div className="text-center">
                  <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                    {(() => {
                      const Icon = ONBOARDING_STEPS[onboardingStep].icon;
                      return <Icon className="w-10 h-10 text-primary" />;
                    })()}
                  </div>
                  <h2 className="text-2xl font-bold mb-3">{ONBOARDING_STEPS[onboardingStep].title}</h2>
                  <p className="text-muted-foreground mb-8">{ONBOARDING_STEPS[onboardingStep].description}</p>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  {onboardingStep > 0 && (
                    <Button variant="outline" onClick={() => setOnboardingStep(prev => prev - 1)} className="flex-1">
                      <ChevronLeft className="w-4 h-4 mr-2" />Back
                    </Button>
                  )}
                  {onboardingStep < ONBOARDING_STEPS.length - 1 ? (
                    <Button onClick={() => setOnboardingStep(prev => prev + 1)} className="flex-1">
                      Next<ChevronRight className="w-4 h-4 ml-2" />
                    </Button>
                  ) : (
                    <Button onClick={completeOnboarding} className="flex-1 bg-gradient-to-r from-primary to-primary/80">
                      <Sparkles className="w-4 h-4 mr-2" />Get Started
                    </Button>
                  )}
                </div>

                <button 
                  onClick={completeOnboarding}
                  className="w-full mt-4 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Skip tutorial
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 h-full w-72 z-50 transform transition-transform duration-300 lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="absolute inset-0 bg-gradient-to-b from-white via-blue-50/60 to-sky-50/50 dark:from-slate-900 dark:via-blue-950/40 dark:to-slate-900 backdrop-blur-xl border-r border-blue-100/80 dark:border-blue-900/50" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(59,130,246,0.08),transparent_60%)]" />
        <div className="relative p-6 h-full flex flex-col">
          <button onClick={() => navigate("/dashboard")} className="flex items-center gap-2 mb-8 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center group-hover:scale-105 transition-transform shadow-lg shadow-blue-500/25">
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
      <div className="lg:pl-72 relative z-10">
        <header className="sticky top-0 z-30 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border-b border-blue-100/50 dark:border-blue-900/30">
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
            <div className="flex items-center gap-3">
              {/* Interview Timer */}
              {questions.length > 0 && timerRunning && (
                <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-lg">
                  <Timer className="w-4 h-4 text-primary" />
                  <span className="font-mono font-semibold text-primary">{formatTime(interviewTimer)}</span>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6"
                    onClick={() => setTimerRunning(!timerRunning)}
                  >
                    {timerRunning ? <PauseCircle className="w-4 h-4" /> : <PlayCircle className="w-4 h-4" />}
                  </Button>
                </div>
              )}
              
              {questions.length > 0 && (
                <Button variant="outline" onClick={resetInterview}>
                  <RotateCcw className="w-4 h-4 mr-2" />Start Over
                </Button>
              )}
            </div>
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

            {/* SETUP TAB - Enhanced with clear steps */}
            <TabsContent value="setup" className="space-y-6">
              {/* How it works - Quick guide */}
              <Card className="p-6 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <HelpCircle className="w-5 h-5 text-primary" />
                  How It Works
                </h3>
                <div className="grid sm:grid-cols-3 gap-4">
                  {[
                    { step: 1, title: "Configure", desc: "Select your field & level", icon: Target },
                    { step: 2, title: "Practice", desc: "Answer AI-generated questions", icon: MessageSquare },
                    { step: 3, title: "Improve", desc: "Get detailed feedback & tips", icon: TrendingUp },
                  ].map(item => (
                    <div key={item.step} className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                        <span className="text-sm font-bold text-primary">{item.step}</span>
                      </div>
                      <div>
                        <p className="font-medium text-sm">{item.title}</p>
                        <p className="text-xs text-muted-foreground">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Personalization Banner */}
              {hasPersonalizationData && !profileLoading && (
                <Card className="p-4 bg-gradient-to-r from-purple-500/10 via-indigo-500/5 to-transparent border-purple-500/20">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
                        <Wand2 className="w-5 h-5 text-purple-600" />
                      </div>
                      <div>
                        <p className="font-medium text-sm flex items-center gap-2">
                          <UserCheck className="w-4 h-4 text-purple-600" />
                          Personalized settings applied
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {userProfile.industry && `Industry: ${userProfile.industry}`}
                          {userProfile.careerLevel && ` • Level: ${userProfile.careerLevel}`}
                          {userProfile.skills.length > 0 && ` • ${userProfile.skills.length} skills`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground">Use profile</span>
                      <Switch 
                        checked={usePersonalizedSettings} 
                        onCheckedChange={setUsePersonalizedSettings}
                      />
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => navigate('/settings')}
                        className="text-xs"
                      >
                        <Settings className="w-3 h-3 mr-1" />
                        Edit
                      </Button>
                    </div>
                  </div>
                </Card>
              )}

              {/* Profile Setup Prompt */}
              {!hasPersonalizationData && !profileLoading && (
                <Card className="p-4 bg-gradient-to-r from-blue-500/10 via-indigo-500/5 to-transparent border-blue-500/20">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                        <Star className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">Get personalized interview prep</p>
                        <p className="text-xs text-muted-foreground">
                          Set your industry and skills to auto-configure practice sessions
                        </p>
                      </div>
                    </div>
                    <Button 
                      size="sm" 
                      onClick={() => navigate('/settings')}
                      className="bg-gradient-to-r from-blue-500 to-indigo-600"
                    >
                      <UserCheck className="w-4 h-4 mr-2" />
                      Setup Profile
                    </Button>
                  </div>
                </Card>
              )}

              {/* Main Setup Card */}
              <Card className="p-6">
                <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                  <Sparkles className="w-6 h-6 text-primary" />
                  Start New Practice Session
                </h2>

                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                      Select Your Field <span className="text-red-500">*</span>
                    </label>
                    <Select value={field} onValueChange={setField}>
                      <SelectTrigger className="h-12">
                        <SelectValue placeholder="Choose your industry or role" />
                      </SelectTrigger>
                      <SelectContent>
                        {FIELDS.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">Questions will be tailored to this field</p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Experience Level</label>
                    <Select value={seniority} onValueChange={setSeniority}>
                      <SelectTrigger className="h-12">
                        <SelectValue placeholder="Select your level" />
                      </SelectTrigger>
                      <SelectContent>
                        {SENIORITY.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">Adjusts question difficulty</p>
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                      Job Description 
                      <Badge variant="outline" className="text-[10px]">Optional</Badge>
                    </label>
                    <Textarea
                      value={jobDescription}
                      onChange={(e) => setJobDescription(e.target.value)}
                      placeholder="Paste the job description here for highly targeted questions...

Example: 'We're looking for a Senior Software Engineer with 5+ years experience in React, Node.js, and AWS...'"
                      className="min-h-[120px]"
                    />
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Zap className="w-3 h-3" />
                      Pro tip: Adding a job description generates 3x more relevant questions
                    </p>
                  </div>
                </div>

                {/* What to expect */}
                <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm font-medium mb-2">What to expect:</p>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-500" />5-7 tailored interview questions</li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-500" />Instant AI feedback on each answer</li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-500" />FAANG-level example answers</li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-500" />Personalized improvement plan</li>
                  </ul>
                </div>

                <Button 
                  onClick={generateQuestions} 
                  disabled={loading || !field} 
                  className="mt-6 w-full sm:w-auto h-12 px-8 text-base bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70" 
                  size="lg"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Generating Questions...
                    </>
                  ) : (
                    <>
                      <Play className="w-5 h-5 mr-2" />
                      Start Interview Simulation
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </>
                  )}
                </Button>
              </Card>

              {/* Quick Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: "Avg. Session", value: "15 min", icon: Clock },
                  { label: "Questions", value: "5-7", icon: FileQuestion },
                  { label: "AI Model", value: "Gemini 2.5", icon: Brain },
                  { label: "Success Rate", value: "94%", icon: TrendingUp },
                ].map(stat => (
                  <Card key={stat.label} className="p-4 text-center">
                    <stat.icon className="w-5 h-5 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-lg font-bold">{stat.value}</p>
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                  </Card>
                ))}
              </div>
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
                                {currentEvaluation.validation?.redFlags && currentEvaluation.validation.redFlags.length > 0 ? (
                                  currentEvaluation.validation.redFlags.map((item, i) => (
                                    <li key={i} className="text-muted-foreground">• {item}</li>
                                  ))
                                ) : (
                                  <li className="text-muted-foreground text-green-600">✓ None detected</li>
                                )}
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

                  {/* Must Fix - Only show if there are items */}
                  {finalEvaluation.mustFix && finalEvaluation.mustFix.length > 0 && (
                    <Card className="p-6 border-red-200 bg-red-50/50 dark:bg-red-950/20">
                      <h3 className="font-semibold mb-4 flex items-center gap-2 text-red-600"><AlertTriangle className="w-5 h-5" />Must Fix Before Applying</h3>
                      <ul className="space-y-2">
                        {finalEvaluation.mustFix.map((fix, i) => (
                          <li key={i} className="flex items-start gap-2"><AlertTriangle className="w-4 h-4 text-red-500 mt-1 shrink-0" />{fix}</li>
                        ))}
                      </ul>
                    </Card>
                  )}

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
                    <Button onClick={() => handleTabChange("resources")} className="flex-1">
                      <BookOpen className="w-4 h-4 mr-2" />View Learning Resources
                    </Button>
                  </div>
                </>
              ) : null}
            </TabsContent>

            {/* RESOURCES TAB - AI-powered learning recommendations */}
            <TabsContent value="resources" className="space-y-6">
              {/* Header */}
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold flex items-center gap-2">
                    <GraduationCap className="w-7 h-7 text-primary" />
                    Learning Resources
                  </h2>
                  <p className="text-muted-foreground">Curated materials to improve your interview skills</p>
                </div>
                
                {/* Filter */}
                <Select value={selectedSkillFilter} onValueChange={(val) => {
                  setSelectedSkillFilter(val);
                  fetchResources(val === 'all' ? undefined : val);
                }}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by skill" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Resources</SelectItem>
                    <SelectItem value="behavioral">Behavioral</SelectItem>
                    <SelectItem value="communication">Communication</SelectItem>
                    <SelectItem value="technical">Technical</SelectItem>
                    <SelectItem value="system design">System Design</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Personalized recommendation banner */}
              {finalEvaluation && finalEvaluation.weaknesses?.length > 0 && (
                <Card className="p-4 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-amber-500/20">
                  <div className="flex items-start gap-3">
                    <Lightbulb className="w-5 h-5 text-amber-500 mt-0.5" />
                    <div>
                      <p className="font-medium text-sm">Based on your last interview</p>
                      <p className="text-xs text-muted-foreground">
                        We recommend focusing on: {finalEvaluation.weaknesses.slice(0, 2).join(", ")}
                      </p>
                    </div>
                  </div>
                </Card>
              )}

              {/* Resources Grid */}
              {loadingResources ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[1, 2, 3, 4, 5, 6].map(i => (
                    <Skeleton key={i} className="h-48 rounded-xl" />
                  ))}
                </div>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {resources.map(resource => {
                    const Icon = getResourceIcon(resource.type);
                    return (
                      <Card 
                        key={resource.id} 
                        className="p-5 hover:shadow-lg transition-all duration-300 hover:scale-[1.02] cursor-pointer group"
                        onClick={() => window.open(resource.url, '_blank')}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                            resource.type === 'video' ? 'bg-red-500/10' :
                            resource.type === 'article' ? 'bg-blue-500/10' :
                            resource.type === 'course' ? 'bg-purple-500/10' :
                            'bg-green-500/10'
                          }`}>
                            <Icon className={`w-5 h-5 ${
                              resource.type === 'video' ? 'text-red-500' :
                              resource.type === 'article' ? 'text-blue-500' :
                              resource.type === 'course' ? 'text-purple-500' :
                              'text-green-500'
                            }`} />
                          </div>
                          <ExternalLink className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        
                        <h3 className="font-semibold mb-1 group-hover:text-primary transition-colors">{resource.title}</h3>
                        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{resource.description}</p>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className={getDifficultyColor(resource.difficulty)}>
                              {resource.difficulty}
                            </Badge>
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="w-3 h-3" />{resource.duration}
                            </span>
                          </div>
                          {resource.rating && (
                            <div className="flex items-center gap-1 text-amber-500">
                              <Star className="w-3 h-3 fill-current" />
                              <span className="text-xs font-medium">{resource.rating}</span>
                            </div>
                          )}
                        </div>
                        
                        <div className="mt-3 pt-3 border-t flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">{resource.provider}</span>
                          <Badge variant="secondary" className="text-[10px]">{resource.skill}</Badge>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}

              {/* Empty state */}
              {!loadingResources && resources.length === 0 && (
                <Card className="p-12 text-center">
                  <BookOpen className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="text-lg font-semibold mb-2">No Resources Found</h3>
                  <p className="text-muted-foreground mb-4">Try a different filter or check back later</p>
                  <Button variant="outline" onClick={() => {
                    setSelectedSkillFilter('all');
                    fetchResources();
                  }}>
                    <RotateCcw className="w-4 h-4 mr-2" />Reset Filters
                  </Button>
                </Card>
              )}

              {/* Quick tips section */}
              <Card className="p-6">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Zap className="w-5 h-5 text-primary" />
                  Quick Interview Tips
                </h3>
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { tip: "Use the STAR method for behavioral questions", icon: Target },
                    { tip: "Research the company before your interview", icon: Users },
                    { tip: "Prepare 3-5 questions to ask the interviewer", icon: HelpCircle },
                    { tip: "Practice out loud, not just in your head", icon: Volume2 },
                  ].map((item, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                      <item.icon className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                      <p className="text-sm">{item.tip}</p>
                    </div>
                  ))}
                </div>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  );
}
