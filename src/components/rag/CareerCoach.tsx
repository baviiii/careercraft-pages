import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
/**
 * Horus Chat Component
 * 
 * SEPARATION OF CONCERNS:
 * - Hybrid RAG: Standard retrieval (useEnterpriseRAG)
 * - Agentic + Graph RAG: Multi-step reasoning with relationship discovery (useAgenticRAG)
 * - Users can toggle between modes via UI button
 * - Each mode uses its own hook for clean separation
 */
import { useEnterpriseRAG } from "@/hooks/useEnterpriseRAG";
import { useAgenticRAG } from "@/hooks/useAgenticRAG";
import {
  FollowUpQuestions,
  ProactiveInsightCard,
  ConfidenceIndicator,
  EmbeddedChart,
} from "./ChatEnhancements";
import { exportConversationToPDF } from "@/lib/pdfExport";
import {
  Send,
  Bot,
  User,
  Sparkles,
  FileText,
  ExternalLink,
  ThumbsUp,
  ThumbsDown,
  Copy,
  Check,
  Loader2,
  MessageSquare,
  Lightbulb,
  RefreshCw,
  ChevronDown,
  Brain,
  Zap,
  Download,
  TrendingUp,
  BarChart3,
  Clock,
  Star,
  AlertCircle,
  CheckCircle2,
  Maximize2,
  Minimize2,
  DollarSign,
  Shield,
  GraduationCap,
  Target,
  Briefcase,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
  timestamp: Date;
  isLoading?: boolean;
  rating?: "helpful" | "not-helpful" | null;
  tokens?: number;
  responseTime?: number;
  // Agentic-specific fields
  agentPlan?: {
    strategy: string;
    steps: Array<{
      step: number;
      query: string;
      method: string;
    }>;
  };
  graphConnections?: Array<{
    type: string;
    source: string;
    target: string;
    strength: number;
  }>;
  contradictions?: Array<{
    type: string;
    source1: string;
    source2: string;
    description: string;
    severity: "high" | "medium" | "low";
  }>;
}

interface Source {
  title: string;
  documentId: string;
  pageNumber?: number;
  url?: string;
  snippet: string;
  relevance?: number;
}

interface SuggestedQuestion {
  text: string;
  category: string;
  icon?: React.ElementType;
  popular?: boolean;
}

interface ConversationStats {
  totalMessages: number;
  totalTokens: number;
  avgResponseTime: number;
  helpfulCount: number;
}

interface PromptOption {
  id: string;
  focus_area: string;
  name: string;
  is_active: boolean;
  is_default: boolean;
}

type RAGMode = "hybrid" | "agentic" | "neo4j";

// ============================================================================
// PERSONA SYSTEM — Horus changes personality based on focus area
// ============================================================================

interface Persona {
  name: string;
  subtitle: string;
  accent: string;       // tailwind color token e.g. "purple"
  gradient: string;     // gradient classes for user bubble
  icon: React.ElementType;
  welcomeTitle: string;
  welcomeDescription: string;
  suggestedQuestions: SuggestedQuestion[];
  getFollowUps: (lastMessage: string) => string[];
}

const PERSONAS: Record<string, Persona> = {
  careers: {
    name: "Career Coach",
    subtitle: "Job market intelligence & career guidance",
    accent: "purple",
    gradient: "from-purple-500 to-pink-500",
    icon: Briefcase,
    welcomeTitle: "Your SA Career Intelligence Agent",
    welcomeDescription: "I analyze 54+ SA Government documents to give you real career insights — job growth, salary data, sector demand, and interview preparation.",
    suggestedQuestions: [
      { text: "What are the fastest growing careers in South Australia right now?", category: "Growth", icon: TrendingUp, popular: true },
      { text: "How do I write selection criteria for SA government jobs?", category: "Application", icon: FileText, popular: true },
      { text: "What training programs are available for skilled migrants in SA?", category: "Training", icon: GraduationCap },
      { text: "What's the job market outlook for IT professionals in SA?", category: "Trends", icon: BarChart3 },
      { text: "How can I prepare for a public sector interview?", category: "Interview", icon: CheckCircle2, popular: true },
      { text: "Which SA sectors have the most job openings in 2025?", category: "Sectors", icon: Target },
    ],
    getFollowUps: (msg) => {
      const lower = msg.toLowerCase();
      const qs: string[] = [];
      if (lower.includes("health") || lower.includes("nurs")) qs.push("What qualifications do I need for healthcare roles in SA?");
      if (lower.includes("salary") || lower.includes("pay")) qs.push("How do SA salaries compare to other states?");
      if (lower.includes("growth") || lower.includes("trend")) qs.push("Which sectors are declining in SA?");
      if (lower.includes("interview")) qs.push("Give me sample STAR method answers for government interviews");
      qs.push("What government-funded retraining programs exist?");
      qs.push("Show me the top 5 in-demand occupations");
      return qs.slice(0, 3);
    },
  },
  analyst: {
    name: "Intelligence Analyst",
    subtitle: "Deep document analysis & cross-sector intelligence",
    accent: "blue",
    gradient: "from-blue-500 to-cyan-500",
    icon: Brain,
    welcomeTitle: "HORUS Intelligence Analyst",
    welcomeDescription: "I perform deep analysis across SA Government budget papers, policy documents, and workforce reports — detecting patterns, contradictions, and strategic signals.",
    suggestedQuestions: [
      { text: "What contradictions exist between stated government priorities and actual budget allocations?", category: "Analysis", icon: AlertCircle, popular: true },
      { text: "Compare infrastructure spending across the last 3 budget cycles", category: "Comparison", icon: BarChart3, popular: true },
      { text: "What are the cross-sector dependencies between health, education, and workforce?", category: "Connections", icon: Zap },
      { text: "Identify the top 5 policy risks in the current SA budget", category: "Risk", icon: Shield },
      { text: "Which sectors show the biggest gap between funding and workforce demand?", category: "Gap Analysis", icon: Target, popular: true },
      { text: "Summarize the key strategic themes across all SA government documents", category: "Strategy", icon: Brain },
    ],
    getFollowUps: (msg) => {
      const lower = msg.toLowerCase();
      const qs: string[] = [];
      if (lower.includes("budget") || lower.includes("funding")) qs.push("What are the year-on-year changes in these allocations?");
      if (lower.includes("contradict")) qs.push("Which documents are the primary sources of these contradictions?");
      if (lower.includes("risk")) qs.push("What mitigation strategies does the government propose?");
      qs.push("What patterns emerge when comparing this to previous years?");
      qs.push("Which source documents support these findings?");
      return qs.slice(0, 3);
    },
  },
  funding: {
    name: "Funding Expert",
    subtitle: "Budget allocations, grants & investment tracking",
    accent: "emerald",
    gradient: "from-emerald-500 to-teal-500",
    icon: DollarSign,
    welcomeTitle: "SA Funding & Budget Expert",
    welcomeDescription: "I track every dollar in the SA Government budget — sector allocations, program funding, grants, and investment trends across all departments.",
    suggestedQuestions: [
      { text: "What are the largest budget allocations in the 2024-25 SA budget?", category: "Budget", icon: DollarSign, popular: true },
      { text: "Which sectors received the biggest funding increases this year?", category: "Growth", icon: TrendingUp, popular: true },
      { text: "What grants are available for small businesses in South Australia?", category: "Grants", icon: Star },
      { text: "How much is allocated to renewable energy and hydrogen projects?", category: "Energy", icon: Zap },
      { text: "Break down the education and training budget by program", category: "Education", icon: GraduationCap, popular: true },
      { text: "What infrastructure projects are funded in the current budget?", category: "Infrastructure", icon: Target },
    ],
    getFollowUps: (msg) => {
      const lower = msg.toLowerCase();
      const qs: string[] = [];
      if (lower.includes("billion") || lower.includes("million")) qs.push("How does this compare to last year's allocation?");
      if (lower.includes("education") || lower.includes("training")) qs.push("What specific TAFE programs are funded?");
      if (lower.includes("health")) qs.push("Break down the health budget by hospital vs community care");
      qs.push("Which programs have the highest ROI based on employment outcomes?");
      qs.push("Are there any underfunded areas relative to demand?");
      return qs.slice(0, 3);
    },
  },
  skills: {
    name: "Skills Advisor",
    subtitle: "Workforce skills demand & training pathways",
    accent: "amber",
    gradient: "from-amber-500 to-orange-500",
    icon: GraduationCap,
    welcomeTitle: "SA Skills & Training Advisor",
    welcomeDescription: "I analyze workforce skills gaps, training program effectiveness, and emerging skill demands across South Australia's key industries.",
    suggestedQuestions: [
      { text: "What are the most in-demand technical skills in SA right now?", category: "Demand", icon: TrendingUp, popular: true },
      { text: "Which emerging skills should I learn for future-proof careers?", category: "Emerging", icon: Sparkles, popular: true },
      { text: "What TAFE and university programs align with workforce gaps?", category: "Training", icon: GraduationCap },
      { text: "How is AI and automation changing skill requirements in SA?", category: "AI Impact", icon: Brain, popular: true },
      { text: "What micro-credentials are recognized by SA employers?", category: "Credentials", icon: CheckCircle2 },
      { text: "Which industries have the biggest skills shortages?", category: "Gaps", icon: AlertCircle },
    ],
    getFollowUps: (msg) => {
      const lower = msg.toLowerCase();
      const qs: string[] = [];
      if (lower.includes("ai") || lower.includes("tech")) qs.push("What specific AI/data skills are SA employers looking for?");
      if (lower.includes("tafe") || lower.includes("training")) qs.push("Which training programs have the best employment outcomes?");
      if (lower.includes("shortage")) qs.push("What government initiatives address these shortages?");
      qs.push("How do I build a skills development plan for my career?");
      qs.push("What free training programs does the SA government offer?");
      return qs.slice(0, 3);
    },
  },
  policies: {
    name: "Policy Analyst",
    subtitle: "Government policy analysis & regulatory intelligence",
    accent: "indigo",
    gradient: "from-indigo-500 to-violet-500",
    icon: Shield,
    welcomeTitle: "SA Government Policy Analyst",
    welcomeDescription: "I analyze SA Government policies, regulations, and strategic frameworks — helping you understand how policy decisions impact industries, communities, and careers.",
    suggestedQuestions: [
      { text: "What are the key policy priorities in the current SA Government agenda?", category: "Priorities", icon: Target, popular: true },
      { text: "How do SA housing policies affect workforce mobility?", category: "Housing", icon: Shield, popular: true },
      { text: "What regulatory changes are planned for the health sector in SA?", category: "Health", icon: AlertCircle },
      { text: "How does SA's migration policy compare to other states?", category: "Migration", icon: TrendingUp },
      { text: "What environmental policies impact the mining and energy sectors?", category: "Environment", icon: Zap, popular: true },
      { text: "Summarize the SA Government's digital transformation strategy", category: "Digital", icon: Brain },
    ],
    getFollowUps: (msg) => {
      const lower = msg.toLowerCase();
      const qs: string[] = [];
      if (lower.includes("housing") || lower.includes("afford")) qs.push("What funding is allocated to housing affordability programs?");
      if (lower.includes("health")) qs.push("How do these policies affect healthcare workforce planning?");
      if (lower.includes("education")) qs.push("What policy changes are planned for vocational training?");
      qs.push("Which stakeholders are most affected by these policies?");
      qs.push("What are the implementation timelines for these initiatives?");
      return qs.slice(0, 3);
    },
  },
  entrepreneurship: {
    name: "Startup Advisor",
    subtitle: "Business grants, startup support & innovation programs",
    accent: "rose",
    gradient: "from-rose-500 to-pink-500",
    icon: Sparkles,
    welcomeTitle: "SA Entrepreneurship & Innovation Advisor",
    welcomeDescription: "I help entrepreneurs navigate SA Government grants, startup programs, innovation hubs, and business support — from idea to scale-up.",
    suggestedQuestions: [
      { text: "What government grants are available for startups in South Australia?", category: "Grants", icon: DollarSign, popular: true },
      { text: "How do I access the SA Innovation Hub and Lot Fourteen programs?", category: "Innovation", icon: Sparkles, popular: true },
      { text: "What support exists for Aboriginal-owned businesses in SA?", category: "Indigenous", icon: Star },
      { text: "How can I get government contracts as a small business?", category: "Procurement", icon: FileText },
      { text: "What export assistance programs does SA Trade offer?", category: "Export", icon: TrendingUp, popular: true },
      { text: "Which SA industries have the best startup success rates?", category: "Sectors", icon: BarChart3 },
    ],
    getFollowUps: (msg) => {
      const lower = msg.toLowerCase();
      const qs: string[] = [];
      if (lower.includes("grant") || lower.includes("fund")) qs.push("What are the eligibility criteria and deadlines?");
      if (lower.includes("tech") || lower.includes("innovat")) qs.push("What tech incubators and accelerators operate in SA?");
      if (lower.includes("export")) qs.push("Which SA products have the strongest international demand?");
      qs.push("What mentorship programs are available for SA entrepreneurs?");
      qs.push("How do I register a business and access ABN support in SA?");
      return qs.slice(0, 3);
    },
  },
  basic: {
    name: "General Assistant",
    subtitle: "All-purpose SA Government intelligence",
    accent: "pink",
    gradient: "from-pink-500 to-fuchsia-500",
    icon: MessageSquare,
    welcomeTitle: "HORUS General Intelligence",
    welcomeDescription: "I have access to 54+ SA Government documents covering budgets, careers, skills, policies, and more. Ask me anything about South Australia!",
    suggestedQuestions: [
      { text: "Give me an overview of the SA Government's key priorities for 2025", category: "Overview", icon: Brain, popular: true },
      { text: "What are the biggest changes in this year's SA budget?", category: "Budget", icon: DollarSign, popular: true },
      { text: "How is South Australia's economy performing compared to other states?", category: "Economy", icon: TrendingUp },
      { text: "What major infrastructure projects are underway in SA?", category: "Infrastructure", icon: Target },
      { text: "What support services does the SA Government offer for new residents?", category: "Services", icon: Star, popular: true },
      { text: "How is SA addressing climate change and renewable energy?", category: "Climate", icon: Zap },
    ],
    getFollowUps: (msg) => {
      const lower = msg.toLowerCase();
      const qs: string[] = [];
      if (lower.includes("budget") || lower.includes("fund")) qs.push("Which sectors received the most funding?");
      if (lower.includes("job") || lower.includes("career")) qs.push("What are the fastest growing occupations in SA?");
      if (lower.includes("health") || lower.includes("hospital")) qs.push("What's the government's health workforce strategy?");
      qs.push("Tell me more about SA Government support programs");
      qs.push("What are the key documents you have access to?");
      return qs.slice(0, 3);
    },
  },
};

// Alias: "general" maps to "basic"
PERSONAS.general = PERSONAS.basic;

// Fuzzy mapper: match any DB focus_area to the best persona
function getPersona(focusArea: string): Persona {
  // Exact match first
  if (PERSONAS[focusArea]) return PERSONAS[focusArea];
  
  // Fuzzy keyword matching
  const lower = focusArea.toLowerCase();
  if (lower.includes("career") || lower.includes("job") || lower.includes("workforce")) return PERSONAS.careers;
  if (lower.includes("analyst") || lower.includes("intellig") || lower.includes("research")) return PERSONAS.analyst;
  if (lower.includes("fund") || lower.includes("budget") || lower.includes("financ")) return PERSONAS.funding;
  if (lower.includes("skill") || lower.includes("train") || lower.includes("education")) return PERSONAS.skills;
  if (lower.includes("polic") || lower.includes("regulat") || lower.includes("govern")) return PERSONAS.policies;
  if (lower.includes("entrepre") || lower.includes("startup") || lower.includes("business") || lower.includes("innovat")) return PERSONAS.entrepreneurship;
  
  // Default fallback
  return PERSONAS.basic;
}

export default function CareerCoach() {
  const [input, setInput] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showSources, setShowSources] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [focusArea, setFocusArea] = useState<string>("careers");
  const [ragMode, setRagMode] = useState<RAGMode>("agentic");
  const [promptOptions, setPromptOptions] = useState<PromptOption[]>([]);
  const [loadingPrompts, setLoadingPrompts] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load all available prompts from database
  useEffect(() => {
    const loadPrompts = async () => {
      try {
        setLoadingPrompts(true);
        const { data, error } = await (supabase
          .from('chat_prompts' as any)
          .select('id, focus_area, name, is_active, is_default')
          .eq('is_active', true)
          .order('is_default', { ascending: false })
          .order('focus_area')
          .order('name'));

        if (error) throw error;

        const prompts: PromptOption[] = (data || []).map((prompt: any) => ({
          id: prompt.id,
          focus_area: prompt.focus_area,
          name: prompt.name || prompt.focus_area,
          is_active: prompt.is_active,
          is_default: prompt.is_default,
        }));

        setPromptOptions(prompts);

        // Set initial focus area to default or first available
        if (prompts.length > 0) {
          const defaultPrompt = prompts.find(p => p.is_default) || prompts[0];
          setFocusArea(defaultPrompt.focus_area);
        }
      } catch (error) {
        console.error('Error loading prompts:', error);
        // Fallback to default
        setPromptOptions([{ id: 'default', focus_area: 'careers', name: 'Career Coach', is_active: true, is_default: true }]);
      } finally {
        setLoadingPrompts(false);
      }
    };

    loadPrompts();
  }, []);

  // SEPARATION OF CONCERNS: Switch between Hybrid RAG, Agentic RAG (Cosmos), and Neo4j RAG
  const hybridRAG = useEnterpriseRAG(focusArea);
  const agenticRAG = useAgenticRAG(focusArea);
  const neo4jRAG = useAgenticRAG(focusArea, { graphBackend: 'neo4j' }); // Neo4j backend
  
  // Select active RAG system based on mode
  const getActiveRAG = () => {
    switch (ragMode) {
      case 'neo4j': return neo4jRAG;
      case 'agentic': return agenticRAG;
      default: return hybridRAG;
    }
  };
  
  const {
    messages,
    sendMessage,
    rateMessage,
    clearChat,
    context,
    analytics,
    isStreaming,
  } = getActiveRAG();

  // Active persona based on focus area — fuzzy maps any DB value to best persona
  const persona = useMemo(() => getPersona(focusArea), [focusArea]);
  const PersonaIcon = persona.icon;

  // Generate follow-up questions from the last assistant message
  const smartFollowUps = useMemo(() => {
    const lastAssistant = [...messages].reverse().find(m => m.role === 'assistant' && !m.isLoading);
    if (!lastAssistant) return [];
    return persona.getFollowUps(lastAssistant.content);
  }, [messages, persona]);

  const conversationStats: ConversationStats = useMemo(() => {
    const totalMessages = messages.filter(m => !m.isLoading && !m.isStreaming).length;
    const totalTokens = messages.reduce((sum, m) => sum + (m.tokens || 0), 0);
    const avgResponseTime = analytics.avgResponseTime;
    const helpfulCount = messages.filter(m => m.rating === "helpful").length;

    return { totalMessages, totalTokens, avgResponseTime, helpfulCount };
  }, [messages, analytics]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Clear chat when focus area changes (to avoid confusion with different prompts)
  useEffect(() => {
    console.log(`[CareerCoach] 🔄 Focus area changed to: "${focusArea}"`);
    if (messages.length > 0 && !loadingPrompts) {
      clearChat();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusArea]);

  // Clear chat when RAG mode changes (different systems, different context)
  useEffect(() => {
    console.log(`[CareerCoach] 🔄 RAG mode changed to: "${ragMode}"`);
    if (messages.length > 0) {
      clearChat();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ragMode]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isStreaming) {
      sendMessage(input.trim());
      setInput("");
    }
  }, [input, isStreaming, sendMessage]);

  const copyToClipboard = useCallback(async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }, []);

  const handleExportPDF = useCallback(() => {
    exportConversationToPDF(messages, {
      includeSources: true,
      includeMetadata: true,
      includeAnalytics: false,
    });
  }, [messages]);

  const formatMessage = useCallback((content: string) => {
    // Convert markdown-style formatting
    return content
      .split("\n")
      .map((line, i) => {
        // Bold text
        line = line.replace(/\*\*(.*?)\*\*/g, '<strong class="text-white font-semibold">$1</strong>');
        // Source citations
        line = line.replace(/\[Source (\d+)\]/g, '<span class="text-blue-400 font-medium">[Source $1]</span>');
        // Bullet points
        if (line.startsWith("- ") || line.startsWith("• ")) {
          return `<li class="ml-4 mb-1">${line.substring(2)}</li>`;
        }
        // Numbered lists
        if (/^\d+\.\s/.test(line)) {
          return `<li class="ml-4 mb-1">${line.replace(/^\d+\.\s/, '')}</li>`;
        }
        return line;
      })
      .join("<br />");
  }, []);

  return (
    <div className={cn(
      "flex flex-col transition-all duration-300",
      isExpanded ? "h-[calc(100vh-100px)]" : "h-[calc(100vh-200px)] min-h-[600px]"
    )}>
      {/* Premium Header — persona-aware */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <motion.div 
              key={focusArea}
              className={cn("w-12 h-12 rounded-2xl flex items-center justify-center shadow-xl", `bg-gradient-to-br ${persona.gradient}`)}
              initial={{ scale: 0.8, rotate: -10 }}
              animate={{ scale: 1, rotate: 0 }}
              whileHover={{ scale: 1.05, rotate: 3 }}
              transition={{ type: "spring", stiffness: 400 }}
            >
              <PersonaIcon className="w-6 h-6 text-white" />
            </motion.div>
            <motion.div 
              className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full border-2 border-slate-900 flex items-center justify-center"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Zap className="w-3 h-3 text-white" />
            </motion.div>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-white">Horus</h2>
              <motion.div key={persona.name} initial={{ opacity: 0, x: -5 }} animate={{ opacity: 1, x: 0 }}>
                <Badge className={cn("text-[10px] font-semibold", `bg-gradient-to-r ${persona.gradient} bg-clip-padding border-white/20 text-white`)}>
                  <PersonaIcon className="w-3 h-3 mr-1 inline" />
                  {persona.name}
                </Badge>
              </motion.div>
              {isStreaming && (
                <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 text-[10px] animate-pulse">
                  Thinking...
                </Badge>
              )}
            </div>
            <motion.p key={persona.subtitle} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-slate-400 mt-0.5">
              {persona.subtitle}
            </motion.p>
            <div className="flex items-center gap-3 mt-1">
              <span className="flex items-center gap-1.5 text-xs text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Online
              </span>
              <span className="text-xs text-slate-500">54+ documents</span>
              {analytics.cacheHitRate > 0 && (
                <span className="text-xs text-slate-500">{Math.round(analytics.cacheHitRate * 100)}% cached</span>
              )}
            </div>
            {/* Focus Area Selector */}
            {promptOptions.length > 1 && (
              <div className="mt-2">
                <Select
                  value={focusArea}
                  onValueChange={setFocusArea}
                  disabled={loadingPrompts || isStreaming}
                >
                  <SelectTrigger className="w-[200px] h-8 bg-white/5 backdrop-blur-xl border border-white/10 text-white text-xs rounded-lg hover:bg-white/10 hover:border-purple-400/40 transition-all">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-3 h-3 text-purple-400" />
                      <SelectValue>
                        {promptOptions.find(p => p.focus_area === focusArea)?.name || 'Focus area...'}
                      </SelectValue>
                    </div>
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl">
                    {promptOptions.map((prompt) => (
                      <SelectItem 
                        key={prompt.id} 
                        value={prompt.focus_area}
                        className="text-white hover:bg-purple-500/20 focus:bg-purple-500/20 rounded-lg mx-1 my-0.5 cursor-pointer text-sm"
                      >
                        <div className="flex items-center gap-2">
                          <span>{prompt.name}</span>
                          {prompt.is_default && (
                            <Badge className="bg-purple-500/20 text-purple-300 border-0 text-[9px] px-1.5 py-0">default</Badge>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* RAG Mode Selector - Compare Cosmos vs Neo4j */}
          <Select value={ragMode} onValueChange={(value: RAGMode) => setRagMode(value)} disabled={isStreaming || loadingPrompts}>
            <SelectTrigger className={cn(
              "w-[160px] h-9 text-xs font-medium transition-all",
              ragMode === "neo4j"
                ? "bg-gradient-to-r from-green-500/20 to-emerald-500/20 border-green-400/50 text-green-300"
                : ragMode === "agentic"
                  ? "bg-gradient-to-r from-purple-500/20 to-pink-500/20 border-purple-400/50 text-purple-300"
                  : "bg-blue-500/10 border-blue-400/30 text-blue-300"
            )}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-slate-700">
              <SelectItem value="hybrid" className="text-blue-300 focus:bg-blue-500/20">
                <div className="flex items-center gap-2">
                  <Zap className="w-3 h-3" />
                  <span>Hybrid RAG</span>
                </div>
              </SelectItem>
              <SelectItem value="agentic" className="text-purple-300 focus:bg-purple-500/20">
                <div className="flex items-center gap-2">
                  <Brain className="w-3 h-3" />
                  <span>Agentic (Cosmos)</span>
                </div>
              </SelectItem>
              <SelectItem value="neo4j" className="text-green-300 focus:bg-green-500/20">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-3 h-3" />
                  <span>Neo4j Graph</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>

          {messages.length > 0 && (
            <>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleExportPDF}
                      className="text-slate-400 hover:text-white"
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Export conversation</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearChat}
                      className="text-slate-400 hover:text-white"
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      New Chat
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Start new conversation</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </>
          )}
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="text-slate-400 hover:text-white"
                >
                  {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{isExpanded ? "Minimize" : "Expand"}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Sleek Stats Strip */}
      {messages.length > 0 && (
        <div className="flex items-center gap-4 mb-3 px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.06]">
          <span className="flex items-center gap-1.5 text-xs text-slate-400">
            <MessageSquare className="w-3 h-3 text-blue-400" />
            {conversationStats.totalMessages} msgs
          </span>
          <span className="flex items-center gap-1.5 text-xs text-slate-400">
            <Clock className="w-3 h-3 text-teal-400" />
            {Math.round(conversationStats.avgResponseTime)}ms avg
          </span>
          {conversationStats.helpfulCount > 0 && (
            <span className="flex items-center gap-1.5 text-xs text-emerald-400">
              <ThumbsUp className="w-3 h-3" />
              {conversationStats.helpfulCount}
            </span>
          )}
          {conversationStats.totalTokens > 0 && (
            <span className="text-xs text-slate-500 ml-auto">{conversationStats.totalTokens.toLocaleString()} tokens</span>
          )}
        </div>
      )}

      {/* Chat Container */}
      <Card className="flex-1 flex flex-col bg-gradient-to-br from-pink-950/60 via-purple-950/50 to-fuchsia-950/40 backdrop-blur-xl border border-pink-500/20 rounded-2xl overflow-hidden min-h-0 shadow-2xl shadow-pink-500/10">
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 flex flex-col min-h-0">
            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto px-6 py-6 min-h-0">
              {messages.length === 0 ? (
                /* Premium Welcome State */
                <div className="h-full flex flex-col items-center justify-center text-center px-4">
                  {/* Animated Hero — persona-aware */}
                  <motion.div
                    key={focusArea + "-hero"}
                    initial={{ scale: 0, rotate: -10 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", stiffness: 200, damping: 15 }}
                    className="relative mb-6"
                  >
                    <div className={cn("w-20 h-20 rounded-3xl flex items-center justify-center shadow-2xl", `bg-gradient-to-br ${persona.gradient}`)}>
                      <PersonaIcon className="w-10 h-10 text-white" />
                    </div>
                    <motion.div
                      className="absolute inset-0 rounded-3xl border-2 border-white/20"
                      animate={{ scale: [1, 1.3, 1], opacity: [0.6, 0, 0.6] }}
                      transition={{ duration: 2.5, repeat: Infinity }}
                    />
                  </motion.div>

                  <motion.h3
                    key={persona.welcomeTitle}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="text-2xl font-bold text-white mb-1"
                  >
                    {persona.welcomeTitle}
                  </motion.h3>
                  <motion.p
                    key={persona.welcomeDescription}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="text-sm text-slate-400 max-w-lg mb-6"
                  >
                    {persona.welcomeDescription}
                  </motion.p>

                  {/* Capability Pills */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="flex flex-wrap items-center justify-center gap-2 mb-8"
                  >
                    {[
                      { icon: FileText, label: "Document Analysis", color: "text-blue-400 bg-blue-500/10 border-blue-500/20" },
                      { icon: Brain, label: "Multi-step Reasoning", color: "text-purple-400 bg-purple-500/10 border-purple-500/20" },
                      { icon: AlertCircle, label: "Contradiction Detection", color: "text-amber-400 bg-amber-500/10 border-amber-500/20" },
                      { icon: TrendingUp, label: "Career Insights", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
                    ].map((cap, i) => (
                      <motion.span
                        key={cap.label}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.5 + i * 0.08 }}
                        className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border", cap.color)}
                      >
                        <cap.icon className="w-3 h-3" />
                        {cap.label}
                      </motion.span>
                    ))}
                  </motion.div>
                  
                  {/* Suggested Questions */}
                  <div className="w-full max-w-3xl">
                    <p className="text-xs text-pink-300/60 mb-4 uppercase tracking-widest font-semibold">Suggested questions</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {persona.suggestedQuestions.map((q, i) => (
                        <motion.button
                          key={i}
                          initial={{ opacity: 0, y: 15 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.6 + i * 0.07 }}
                          onClick={() => sendMessage(q.text)}
                          className="group flex items-center gap-3.5 p-4 rounded-2xl bg-gradient-to-br from-pink-500/10 via-purple-500/8 to-fuchsia-500/10 hover:from-pink-500/20 hover:via-purple-500/15 hover:to-fuchsia-500/20 border border-pink-400/20 hover:border-pink-400/40 text-left transition-all hover:shadow-lg hover:shadow-pink-500/10 hover:scale-[1.02]"
                        >
                          {q.icon && (
                            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-pink-500/25 to-purple-500/25 flex items-center justify-center shrink-0 group-hover:from-pink-500/40 group-hover:to-purple-500/40 transition-all shadow-inner">
                              <q.icon className="w-5 h-5 text-pink-300" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <span className="text-[15px] leading-snug text-white/90 group-hover:text-white transition-colors line-clamp-2 font-medium">
                              {q.text}
                            </span>
                            <div className="flex items-center gap-2 mt-1.5">
                              <span className="text-[11px] text-pink-300/50 font-medium">{q.category}</span>
                              {q.popular && (
                                <span className="text-[11px] text-amber-300/80 flex items-center gap-0.5">
                                  <Star className="w-3 h-3 fill-amber-300/80" />
                                  Popular
                                </span>
                              )}
                            </div>
                          </div>
                          <ChevronDown className="w-5 h-5 text-pink-400/40 -rotate-90 group-hover:text-pink-300 transition-colors shrink-0" />
                        </motion.button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                /* Enhanced Messages */
                <div className="space-y-6 pb-4">
                  <AnimatePresence mode="popLayout">
                    {messages.map((message, msgIdx) => (
                      <motion.div
                        key={message.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}
                      >
                        {message.role === "assistant" && (
                          <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-lg mt-1", `bg-gradient-to-br ${persona.gradient}`)}>
                            <PersonaIcon className="w-4 h-4 text-white" />
                          </div>
                        )}
                        
                        <div className={`max-w-[80%] ${message.role === "user" ? "order-first" : ""}`}>
                          <div
                            className={cn(
                              "rounded-2xl px-5 py-4",
                              message.role === "user"
                                ? cn("text-white shadow-lg", `bg-gradient-to-r ${persona.gradient}`)
                                : "bg-gradient-to-br from-pink-500/10 via-purple-500/8 to-fuchsia-500/10 border border-pink-400/20 text-white/95"
                            )}
                          >
                            {message.isLoading ? (
                              <div className="flex items-center gap-3 py-1">
                                <div className="flex gap-1.5">
                                  <motion.span className="w-2.5 h-2.5 rounded-full bg-purple-400" animate={{ scale: [1, 1.4, 1], opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.2, repeat: Infinity, delay: 0 }} />
                                  <motion.span className="w-2.5 h-2.5 rounded-full bg-pink-400" animate={{ scale: [1, 1.4, 1], opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.2, repeat: Infinity, delay: 0.2 }} />
                                  <motion.span className="w-2.5 h-2.5 rounded-full bg-fuchsia-400" animate={{ scale: [1, 1.4, 1], opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.2, repeat: Infinity, delay: 0.4 }} />
                                </div>
                                <span className="text-sm text-pink-200/70">{persona.name} is reasoning...</span>
                              </div>
                            ) : (
                              <div
                                className="prose prose-invert prose-sm max-w-none [&_strong]:text-pink-200 [&_strong]:font-semibold [&_li]:text-white/85 [&_p]:text-white/85 leading-relaxed text-[15px]"
                                dangerouslySetInnerHTML={{ __html: formatMessage(message.content) }}
                              />
                            )}
                          </div>
                          
                          {/* Source Citations */}
                          {message.sources && message.sources.length > 0 && (
                            <div className="mt-2">
                              <button
                                onClick={() => setShowSources(showSources === message.id ? null : message.id)}
                                className="flex items-center gap-2 text-xs text-pink-300/50 hover:text-pink-200 transition-colors group"
                              >
                                <FileText className="w-3.5 h-3.5 group-hover:text-pink-300" />
                                <span>{message.sources.length} source{message.sources.length > 1 ? "s" : ""} cited</span>
                                <ChevronDown className={cn(
                                  "w-3 h-3 transition-transform",
                                  showSources === message.id && "rotate-180"
                                )} />
                              </button>
                              
                              <AnimatePresence>
                                {showSources === message.id && (
                                  <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: "auto" }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="mt-2 space-y-2 overflow-hidden"
                                  >
                                    {message.sources.map((source, idx) => {
                                      const relevance = source.relevance ? (source.relevance <= 1 ? Math.round(source.relevance * 100) : Math.round(source.relevance)) : 0;
                                      return (
                                        <motion.div
                                          key={idx}
                                          initial={{ opacity: 0, x: -10 }}
                                          animate={{ opacity: 1, x: 0 }}
                                          transition={{ delay: idx * 0.05 }}
                                          className="p-3 rounded-xl bg-pink-500/5 border border-pink-400/15 hover:border-pink-400/30 transition-all group/src"
                                        >
                                          <div className="flex items-start gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-pink-500/25 to-purple-500/25 flex items-center justify-center shrink-0">
                                              <FileText className="w-3.5 h-3.5 text-pink-300" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                              <div className="flex items-center gap-2">
                                                <p className="text-sm font-medium text-white truncate">{source.title}</p>
                                                {source.url && (
                                                  <a href={source.url} target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:text-purple-300 shrink-0 opacity-0 group-hover/src:opacity-100 transition-opacity">
                                                    <ExternalLink className="w-3.5 h-3.5" />
                                                  </a>
                                                )}
                                              </div>
                                              <div className="flex items-center gap-2 mt-1">
                                                {source.pageNumber && (
                                                  <span className="text-[10px] text-pink-300/80 bg-pink-500/15 px-1.5 py-0.5 rounded">p.{source.pageNumber}</span>
                                                )}
                                                {relevance > 0 && (
                                                  <div className="flex items-center gap-1.5 flex-1">
                                                    <div className="h-1 flex-1 max-w-[80px] rounded-full bg-pink-500/10 overflow-hidden">
                                                      <motion.div
                                                        className="h-full rounded-full bg-gradient-to-r from-purple-500 to-pink-500"
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${relevance}%` }}
                                                        transition={{ delay: idx * 0.05 + 0.2, duration: 0.5 }}
                                                      />
                                                    </div>
                                                    <span className="text-[10px] text-slate-500">{relevance}%</span>
                                                  </div>
                                                )}
                                              </div>
                                              {source.snippet && (
                                                <p className="text-xs text-pink-100/40 mt-1.5 line-clamp-2 leading-relaxed">{source.snippet}</p>
                                              )}
                                            </div>
                                          </div>
                                        </motion.div>
                                      );
                                    })}
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          )}

                          {/* FERRARI FEATURES: Confidence, Charts, Insights, Follow-ups */}
                          {message.role === "assistant" && !message.isLoading && (
                            <>
                              {/* AGENTIC MODE: Agent Plan Display */}
                              {ragMode === "agentic" && (message as any).agentPlan && (
                                <div className="mt-3 p-3 rounded-xl bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-400/30">
                                  <div className="flex items-center gap-2 mb-2">
                                    <Brain className="w-4 h-4 text-purple-400" />
                                    <span className="text-xs font-semibold text-purple-300">Agent Plan</span>
                                  </div>
                                  <div className="space-y-1">
                                    {(message as any).agentPlan.steps.map((step: any, idx: number) => (
                                      <div key={idx} className="text-xs text-slate-400 flex items-center gap-2">
                                        <span className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-300 flex items-center justify-center text-[10px] font-semibold">
                                          {step.step}
                                        </span>
                                        <span>{step.query}</span>
                                        <Badge className="bg-purple-500/20 text-purple-300 border-0 text-[9px] ml-auto">
                                          {step.method}
                                        </Badge>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* AGENTIC MODE: Graph Connections */}
                              {ragMode === "agentic" && (message as any).graphConnections && (message as any).graphConnections.length > 0 && (
                                <div className="mt-3 p-3 rounded-xl bg-blue-500/10 border border-blue-400/30">
                                  <div className="flex items-center gap-2 mb-2">
                                    <Zap className="w-4 h-4 text-blue-400" />
                                    <span className="text-xs font-semibold text-blue-300">Graph Connections</span>
                                    <Badge className="bg-blue-500/20 text-blue-300 border-0 text-[9px]">
                                      {(message as any).graphConnections.length}
                                    </Badge>
                                  </div>
                                  <div className="space-y-1">
                                    {(message as any).graphConnections.slice(0, 3).map((conn: any, idx: number) => (
                                      <div key={idx} className="text-xs text-slate-400">
                                        <span className="text-blue-300">{conn.source}</span>
                                        <span className="mx-2">→</span>
                                        <span className="text-blue-300">{conn.target}</span>
                                        <Badge className="bg-blue-500/20 text-blue-300 border-0 text-[9px] ml-2">
                                          {conn.type}
                                        </Badge>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* AGENTIC MODE: Contradictions */}
                              {ragMode === "agentic" && (message as any).contradictions && (message as any).contradictions.length > 0 && (
                                <div className="mt-3 p-3 rounded-xl bg-red-500/10 border border-red-400/30">
                                  <div className="flex items-center gap-2 mb-2">
                                    <AlertCircle className="w-4 h-4 text-red-400" />
                                    <span className="text-xs font-semibold text-red-300">Contradictions Detected</span>
                                    <Badge className="bg-red-500/20 text-red-300 border-0 text-[9px]">
                                      {(message as any).contradictions.length}
                                    </Badge>
                                  </div>
                                  <div className="space-y-2">
                                    {(message as any).contradictions.map((contra: any, idx: number) => (
                                      <div key={idx} className="text-xs text-slate-400">
                                        <div className="flex items-center gap-2 mb-1">
                                          <Badge className={cn(
                                            "text-[9px] border-0",
                                            contra.severity === "high" ? "bg-red-500/30 text-red-300" :
                                            contra.severity === "medium" ? "bg-yellow-500/30 text-yellow-300" :
                                            "bg-orange-500/30 text-orange-300"
                                          )}>
                                            {contra.severity.toUpperCase()}
                                          </Badge>
                                          <span className="text-slate-500">{contra.type}</span>
                                        </div>
                                        <p className="text-slate-300">{contra.description}</p>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Confidence Indicator */}
                              {message.confidence && (
                                <div className="mt-3">
                                  <ConfidenceIndicator
                                    confidence={message.confidence}
                                    avgRelevance={
                                      message.sources && message.sources.length > 0
                                        ? (() => {
                                            const avg = message.sources.reduce((sum, s) => sum + (s.relevance || 0), 0) / message.sources.length;
                                            // Normalize: if avg <= 1 it's a 0-1 score, multiply by 100
                                            return avg <= 1 ? Math.round(avg * 100) : Math.round(avg);
                                          })()
                                        : undefined
                                    }
                                    sourceCount={message.sources?.length}
                                  />
                                </div>
                              )}

                              {/* Embedded Chart */}
                              {message.visualData && (
                                <EmbeddedChart visualData={message.visualData} />
                              )}

                              {/* Follow-up Questions */}
                              {message.followUpQuestions && message.followUpQuestions.length > 0 && (
                                <FollowUpQuestions
                                  questions={message.followUpQuestions}
                                  onSelect={(q) => {
                                    setInput(q);
                                    sendMessage(q);
                                  }}
                                />
                              )}

                              {/* Proactive Insight */}
                              {message.proactiveInsight && (
                                <ProactiveInsightCard
                                  insight={message.proactiveInsight}
                                  onClickAction={() => {
                                    if (message.proactiveInsight?.relatedQuery) {
                                      setInput(message.proactiveInsight.relatedQuery);
                                      sendMessage(message.proactiveInsight.relatedQuery);
                                    }
                                  }}
                                />
                              )}
                            </>
                          )}

                          {/* Enhanced Actions */}
                          {message.role === "assistant" && !message.isLoading && (
                            <div className="flex items-center gap-2 mt-2">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button
                                      onClick={() => copyToClipboard(message.content, message.id)}
                                      className={cn(
                                        "p-1.5 rounded-lg transition-all",
                                        copiedId === message.id
                                          ? "text-green-400 bg-green-500/10"
                                          : "text-slate-500 hover:text-white hover:bg-slate-800"
                                      )}
                                    >
                                      {copiedId === message.id ? (
                                        <Check className="w-3.5 h-3.5" />
                                      ) : (
                                        <Copy className="w-3.5 h-3.5" />
                                      )}
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Copy response</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                              
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button
                                      onClick={() => rateMessage(message.id, "helpful")}
                                      className={cn(
                                        "p-1.5 rounded-lg transition-all",
                                        message.rating === "helpful"
                                          ? "text-green-400 bg-green-500/10"
                                          : "text-slate-500 hover:text-green-400 hover:bg-slate-800"
                                      )}
                                    >
                                      <ThumbsUp className="w-3.5 h-3.5" />
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Mark as helpful</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                              
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button
                                      onClick={() => rateMessage(message.id, "not-helpful")}
                                      className={cn(
                                        "p-1.5 rounded-lg transition-all",
                                        message.rating === "not-helpful"
                                          ? "text-red-400 bg-red-500/10"
                                          : "text-slate-500 hover:text-red-400 hover:bg-slate-800"
                                      )}
                                    >
                                      <ThumbsDown className="w-3.5 h-3.5" />
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Mark as not helpful</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                              
                              {message.tokens && (
                                <span className="text-[10px] text-slate-500 ml-auto">
                                  {message.tokens.toLocaleString()} tokens
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                        
                        {message.role === "user" && (
                          <div className="w-8 h-8 rounded-xl bg-slate-700 flex items-center justify-center shrink-0 mt-1">
                            <User className="w-4 h-4 text-slate-300" />
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </AnimatePresence>

                  {/* Smart Follow-up Pills — shown after last assistant message */}
                  {smartFollowUps.length > 0 && !isStreaming && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                      className="mt-4 ml-11"
                    >
                      <p className="text-[11px] text-slate-500 mb-2 flex items-center gap-1.5">
                        <Lightbulb className="w-3 h-3 text-amber-400" />
                        Continue exploring
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {smartFollowUps.map((q, i) => (
                          <motion.button
                            key={q}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.4 + i * 0.1 }}
                            onClick={() => sendMessage(q)}
                            className={cn(
                              "px-3.5 py-2.5 rounded-xl text-[13px] font-medium text-left transition-all",
                              "bg-pink-500/8 border border-pink-400/20 text-pink-100/80",
                              "hover:bg-pink-500/15 hover:text-white hover:border-pink-400/40"
                            )}
                          >
                            {q}
                          </motion.button>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Input Area */}
            <div className="p-5 border-t border-pink-500/15 bg-gradient-to-t from-pink-950/30 to-transparent">
              <form onSubmit={handleSubmit} className="relative">
                <div className={cn(
                  "flex items-center gap-2 rounded-2xl border transition-all duration-300",
                  input.trim()
                    ? "bg-pink-500/10 border-pink-400/40 shadow-lg shadow-pink-500/15"
                    : "bg-pink-500/5 border-pink-400/20"
                )}>
                  <Input
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={isStreaming ? `${persona.name} is reasoning...` : `Ask ${persona.name.toLowerCase()} anything...`}
                    disabled={isStreaming}
                    className="flex-1 border-0 bg-transparent py-7 px-6 text-base text-white placeholder:text-pink-200/40 focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                  <Button
                    type="submit"
                    disabled={!input.trim() || isStreaming}
                    size="sm"
                    className={cn(
                      "mr-3 rounded-xl px-5 py-6 transition-all duration-300",
                      input.trim() && !isStreaming
                        ? "bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white shadow-lg shadow-pink-500/30"
                        : "bg-pink-500/10 text-pink-300/40 border border-pink-400/20"
                    )}
                  >
                    {isStreaming ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Send className="w-5 h-5" />
                    )}
                  </Button>
                </div>
              </form>
              
              <div className="flex items-center justify-between mt-2.5 px-2">
                <p className="text-[11px] text-pink-200/30">
                  Based on SA Government documents · Always verify important information
                </p>
                <span className="text-[11px] text-pink-200/30">⏎ to send</span>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
