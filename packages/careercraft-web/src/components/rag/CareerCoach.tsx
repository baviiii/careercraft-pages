import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
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
import { CAREER_SYSTEM_DISCLAIMER } from "@/lib/careerGuardrails";
import {
  Send,
  Sparkles,
  FileText,
  ExternalLink,
  ThumbsUp,
  ThumbsDown,
  Copy,
  Check,
  Loader2,
  MessageSquare,
  RefreshCw,
  ChevronDown,
  Brain,
  Zap,
  Download,
  TrendingUp,
  BarChart3,
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
  Lightbulb,
} from "lucide-react";
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
  const [viewMode, setViewMode] = useState<"chat" | "insights">("chat");
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
      isExpanded ? "h-[calc(100vh-40px)]" : "h-[calc(100vh-80px)] min-h-[780px]"
    )}>
      {/* ═══════════════════════════════════════════════════════════════════════
          GOD-TIER CHAT CONTAINER
          ═══════════════════════════════════════════════════════════════════════ */}
      <div className="flex-1 flex flex-col bg-black rounded-2xl border border-white/10 overflow-hidden min-h-0 shadow-2xl">

        {/* ── Command Bar ── */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/8">
          {/* Left: Identity */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <motion.div
                key={focusArea}
                className={cn("w-10 h-10 rounded-xl flex items-center justify-center", `bg-gradient-to-br ${persona.gradient}`)}
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 400 }}
              >
                <PersonaIcon className="w-5 h-5 text-white" />
              </motion.div>
              {/* Pulse ring */}
              <motion.div
                className={cn("absolute inset-0 rounded-xl", `bg-gradient-to-br ${persona.gradient}`)}
                animate={{ scale: [1, 1.4, 1], opacity: [0.3, 0, 0.3] }}
                transition={{ duration: 3, repeat: Infinity }}
                style={{ zIndex: -1 }}
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold text-white tracking-tight">HORUS</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              </div>
              <p className="text-[11px] text-white/40">{persona.subtitle}</p>
            </div>
          </div>

          {/* Center: Persona pill tabs */}
          <div className="hidden md:flex items-center gap-1 bg-white/5 rounded-xl p-1">
            {promptOptions.length > 1 ? (
              promptOptions.map((p) => {
                const pPersona = getPersona(p.focus_area);
                return (
                  <button
                    key={p.id}
                    onClick={() => setFocusArea(p.focus_area)}
                    disabled={isStreaming}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200",
                      focusArea === p.focus_area
                        ? cn("text-white shadow-md", `bg-gradient-to-r ${pPersona.gradient}`)
                        : "text-white/40 hover:text-white/70 hover:bg-white/5"
                    )}
                  >
                    {p.name}
                  </button>
                );
              })
            ) : (
              ['careers', 'analyst', 'funding', 'skills'].map((key) => {
                const pPersona = getPersona(key);
                return (
                  <button
                    key={key}
                    onClick={() => setFocusArea(key)}
                    disabled={isStreaming}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200",
                      focusArea === key
                        ? cn("text-white shadow-md", `bg-gradient-to-r ${pPersona.gradient}`)
                        : "text-white/40 hover:text-white/70 hover:bg-white/5"
                    )}
                  >
                    {pPersona.name}
                  </button>
                );
              })
            )}
          </div>

          {/* Right: View toggle + Actions */}
          <div className="flex items-center gap-1">
            {/* Chat / Insights toggle */}
            {messages.length > 0 && (
              <div className="flex items-center bg-white/5 rounded-lg p-0.5 mr-2">
                <button
                  onClick={() => setViewMode("chat")}
                  className={cn("px-3 py-1.5 rounded-md text-xs font-medium transition-all", viewMode === "chat" ? "bg-white/10 text-white" : "text-white/35 hover:text-white/60")}
                >
                  Chat
                </button>
                <button
                  onClick={() => setViewMode("insights")}
                  className={cn("px-3 py-1.5 rounded-md text-xs font-medium transition-all", viewMode === "insights" ? "bg-white/10 text-white" : "text-white/35 hover:text-white/60")}
                >
                  Insights
                </button>
              </div>
            )}
            {messages.length > 0 && (
              <>
                <button onClick={handleExportPDF} className="p-2 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/5 transition-all" title="Export PDF">
                  <Download className="w-4 h-4" />
                </button>
                <button onClick={clearChat} className="p-2 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/5 transition-all" title="New chat">
                  <RefreshCw className="w-4 h-4" />
                </button>
              </>
            )}
            <button onClick={() => setIsExpanded(!isExpanded)} className="p-2 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/5 transition-all" title={isExpanded ? "Minimize" : "Expand"}>
              {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {viewMode === "insights" && messages.length > 0 ? (
          /* ═══ INSIGHTS PANEL ═══ */
          <div className="flex-1 overflow-y-auto min-h-0 p-6 space-y-6">
            {/* Conversation Overview */}
            <div>
              <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-4">Conversation Overview</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: "Messages", value: messages.filter(m => !m.isLoading).length, color: "text-blue-400" },
                  { label: "Sources Cited", value: messages.reduce((sum, m) => sum + (m.sources?.length || 0), 0), color: "text-purple-400" },
                  { label: "Avg Response", value: `${Math.round(analytics.avgResponseTime)}ms`, color: "text-emerald-400" },
                  { label: "Tokens Used", value: messages.reduce((sum, m) => sum + (m.tokens || 0), 0).toLocaleString(), color: "text-amber-400" },
                ].map((stat) => (
                  <div key={stat.label} className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                    <p className={cn("text-2xl font-bold", stat.color)}>{stat.value}</p>
                    <p className="text-xs text-white/30 mt-1">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Topics Discussed */}
            <div>
              <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-3">Topics Discussed</h3>
              <div className="flex flex-wrap gap-2">
                {(() => {
                  const userMsgs = messages.filter(m => m.role === "user").map(m => m.content.toLowerCase());
                  const topics = new Set<string>();
                  const keywords = [
                    ["career", "job", "employment", "occupation"], ["salary", "pay", "wage", "income"],
                    ["health", "hospital", "medical", "nursing"], ["education", "training", "tafe", "university"],
                    ["budget", "funding", "allocation", "investment"], ["infrastructure", "transport", "road", "construction"],
                    ["skill", "workforce", "demand"], ["interview", "application", "resume"],
                    ["energy", "renewable", "hydrogen"], ["housing", "affordable", "home"],
                    ["technology", "digital", "cyber", "ai"], ["defence", "naval", "shipbuilding"],
                  ];
                  const labels = ["Careers", "Salaries", "Healthcare", "Education", "Budget", "Infrastructure", "Skills", "Interviews", "Energy", "Housing", "Technology", "Defence"];
                  userMsgs.forEach(msg => {
                    keywords.forEach((kws, i) => { if (kws.some(k => msg.includes(k))) topics.add(labels[i]); });
                  });
                  if (topics.size === 0) topics.add("General");
                  return Array.from(topics).map(topic => (
                    <span key={topic} className="px-3 py-1.5 rounded-full text-xs font-medium bg-white/[0.05] border border-white/[0.08] text-white/60">{topic}</span>
                  ));
                })()}
              </div>
            </div>

            {/* Sources Used */}
            <div>
              <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-3">Sources Referenced</h3>
              <div className="space-y-2">
                {(() => {
                  const sourceMap = new Map<string, { count: number; pages: Set<number> }>();
                  messages.forEach(m => {
                    m.sources?.forEach(s => {
                      const key = s.title || "Unknown";
                      const existing = sourceMap.get(key) || { count: 0, pages: new Set() };
                      existing.count++;
                      if (s.pageNumber) existing.pages.add(s.pageNumber);
                      sourceMap.set(key, existing);
                    });
                  });
                  const sorted = Array.from(sourceMap.entries()).sort((a, b) => b[1].count - a[1].count);
                  if (sorted.length === 0) return <p className="text-xs text-white/20">No sources cited yet.</p>;
                  return sorted.slice(0, 10).map(([title, data]) => (
                    <div key={title} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                      <FileText className="w-4 h-4 text-white/20 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white/70 truncate">{title}</p>
                        <p className="text-[11px] text-white/25">
                          Referenced {data.count}x{data.pages.size > 0 ? ` · Pages: ${Array.from(data.pages).sort((a,b) => a-b).join(", ")}` : ""}
                        </p>
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </div>

            {/* Key Findings */}
            <div>
              <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-3">Key Findings</h3>
              <div className="space-y-2">
                {messages.filter(m => m.role === "assistant" && !m.isLoading && m.content.length > 50).slice(-5).map((m, i) => {
                  const firstSentence = m.content.replace(/\*\*/g, "").split(/[.!?]\s/)[0];
                  return (
                    <div key={i} className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                      <p className="text-sm text-white/60 line-clamp-2">{firstSentence}.</p>
                      {m.confidence && (
                        <span className={cn("text-[10px] mt-1 inline-block px-2 py-0.5 rounded",
                          m.confidence === "high" ? "bg-emerald-500/10 text-emerald-400" :
                          m.confidence === "medium" ? "bg-blue-500/10 text-blue-400" :
                          "bg-amber-500/10 text-amber-400"
                        )}>{m.confidence} confidence</span>
                      )}
                    </div>
                  );
                })}
                {messages.filter(m => m.role === "assistant" && !m.isLoading && m.content.length > 50).length === 0 && (
                  <p className="text-xs text-white/20">No findings yet. Start a conversation to see insights.</p>
                )}
              </div>
            </div>
          </div>
        ) : (
        <>
        {/* ── Messages / Welcome ── */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {messages.length === 0 ? (
            /* ═══ CINEMATIC WELCOME STATE ═══ */
            <div className="h-full flex flex-col items-center justify-center px-6 py-10">
              {/* Orbital hero */}
              <motion.div
                key={focusArea + "-orb"}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 150, damping: 20 }}
                className="relative mb-8"
              >
                {/* Outer ring */}
                <motion.div
                  className="absolute inset-[-20px] rounded-full border border-white/5"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
                >
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-pink-500/60" />
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-1.5 h-1.5 rounded-full bg-purple-500/40" />
                </motion.div>
                {/* Middle ring */}
                <motion.div
                  className="absolute inset-[-12px] rounded-full border border-white/8"
                  animate={{ rotate: -360 }}
                  transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                >
                  <div className="absolute top-1/2 right-0 translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-cyan-500/50" />
                </motion.div>
                {/* Core icon */}
                <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center shadow-2xl relative z-10", `bg-gradient-to-br ${persona.gradient}`)}>
                  <PersonaIcon className="w-8 h-8 text-white" />
                </div>
              </motion.div>

              {/* Title */}
              <motion.h2
                key={persona.welcomeTitle}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="text-3xl font-bold text-white mb-2 tracking-tight text-center"
              >
                {persona.welcomeTitle}
              </motion.h2>

              {/* Live stats ticker */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="flex items-center gap-4 mb-8 text-white/30 text-xs"
              >
                <span className="flex items-center gap-1.5">
                  <FileText className="w-3 h-3" />
                  54 documents analyzed
                </span>
                <span className="w-1 h-1 rounded-full bg-white/20" />
                <span className="flex items-center gap-1.5">
                  <Brain className="w-3 h-3" />
                  Multi-step reasoning
                </span>
                <span className="w-1 h-1 rounded-full bg-white/20" />
                <span className="flex items-center gap-1.5">
                  <Zap className="w-3 h-3" />
                  Real-time analysis
                </span>
              </motion.div>

              {/* 3 Large prompt cards */}
              <div className="w-full max-w-2xl space-y-3">
                {persona.suggestedQuestions.slice(0, 3).map((q, i) => (
                  <motion.button
                    key={q.text}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 + i * 0.1 }}
                    onClick={() => sendMessage(q.text)}
                    className="group w-full flex items-center gap-4 p-5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.08] hover:border-white/15 text-left transition-all duration-200"
                  >
                    {q.icon && (
                      <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-all", `bg-gradient-to-br ${persona.gradient} shadow-lg`)}>
                        <q.icon className="w-5 h-5 text-white" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-[17px] text-white font-medium leading-snug">{q.text}</p>
                      <p className="text-xs text-white/30 mt-1">{q.category}{q.popular ? ' · Popular' : ''}</p>
                    </div>
                    <ChevronDown className="w-5 h-5 text-white/15 -rotate-90 group-hover:text-white/40 group-hover:translate-x-1 transition-all shrink-0" />
                  </motion.button>
                ))}
              </div>

              {/* More questions — smaller pills */}
              {persona.suggestedQuestions.length > 3 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.8 }}
                  className="flex flex-wrap justify-center gap-2 mt-5 max-w-2xl"
                >
                  {persona.suggestedQuestions.slice(3).map((q, i) => (
                    <button
                      key={q.text}
                      onClick={() => sendMessage(q.text)}
                      className="px-4 py-2 rounded-full text-xs text-white/40 hover:text-white/70 bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] hover:border-white/10 transition-all"
                    >
                      {q.text}
                    </button>
                  ))}
                </motion.div>
              )}
            </div>
          ) : (
            /* ═══ MESSAGES ═══ */
            <div className="px-6 py-6 space-y-1">
              <AnimatePresence mode="popLayout">
                {messages.map((message) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="py-4"
                  >
                    {message.role === "user" ? (
                      /* ── User message ── */
                      <div className="flex justify-end">
                        <div className={cn("max-w-[75%] rounded-2xl px-5 py-3.5 text-white text-[15px] leading-relaxed shadow-lg", `bg-gradient-to-r ${persona.gradient}`)}>
                          {message.content}
                        </div>
                      </div>
                    ) : (
                      /* ── Assistant message ── */
                      <div className="flex gap-3">
                        <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-1", `bg-gradient-to-br ${persona.gradient}`)}>
                          <PersonaIcon className="w-3.5 h-3.5 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          {message.isLoading ? (
                            /* Thinking indicator */
                            <div className="py-2">
                              <div className="flex items-center gap-3 mb-2">
                                <div className="h-[2px] w-32 rounded-full bg-white/5 overflow-hidden">
                                  <motion.div
                                    className={cn("h-full rounded-full", `bg-gradient-to-r ${persona.gradient}`)}
                                    animate={{ x: ["-100%", "100%"] }}
                                    transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                                    style={{ width: "50%" }}
                                  />
                                </div>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-white/30">
                                <Brain className="w-3 h-3" />
                                <motion.span
                                  animate={{ opacity: [0.3, 1, 0.3] }}
                                  transition={{ duration: 2, repeat: Infinity }}
                                >
                                  Analyzing documents...
                                </motion.span>
                              </div>
                            </div>
                          ) : (
                            <>
                              {/* Message content — clean, no box */}
                              <div
                                className="prose prose-invert max-w-none text-[15px] leading-[1.75] text-white/90 [&_strong]:text-white [&_strong]:font-semibold [&_li]:text-white/80 [&_p]:text-white/85"
                                dangerouslySetInnerHTML={{ __html: formatMessage(message.content) }}
                              />

                              {/* Inline source chips */}
                              {message.sources && message.sources.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 mt-3">
                                  {message.sources.slice(0, 4).map((source, idx) => (
                                    <button
                                      key={idx}
                                      onClick={() => setShowSources(showSources === message.id ? null : message.id)}
                                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-[11px] text-white/40 hover:text-white/60 transition-all"
                                    >
                                      <FileText className="w-3 h-3" />
                                      <span className="truncate max-w-[150px]">{source.title}</span>
                                      {source.pageNumber && <span className="text-white/25">p.{source.pageNumber}</span>}
                                    </button>
                                  ))}
                                  {message.sources.length > 4 && (
                                    <button
                                      onClick={() => setShowSources(showSources === message.id ? null : message.id)}
                                      className="inline-flex items-center px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-[11px] text-white/40 hover:text-white/60 transition-all"
                                    >
                                      +{message.sources.length - 4} more
                                    </button>
                                  )}
                                </div>
                              )}

                              {/* Expanded sources */}
                              <AnimatePresence>
                                {showSources === message.id && message.sources && (
                                  <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: "auto" }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="mt-3 space-y-2 overflow-hidden"
                                  >
                                    {message.sources.map((source, idx) => {
                                      const relevance = source.relevance ? (source.relevance <= 1 ? Math.round(source.relevance * 100) : Math.round(source.relevance)) : 0;
                                      return (
                                        <div key={idx} className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                                          <FileText className="w-4 h-4 text-white/20 shrink-0 mt-0.5" />
                                          <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                              <p className="text-sm font-medium text-white/80 truncate">{source.title}</p>
                                              {source.pageNumber && <span className="text-[10px] text-white/30 bg-white/5 px-1.5 py-0.5 rounded">p.{source.pageNumber}</span>}
                                              {relevance > 0 && <span className="text-[10px] text-white/25">{relevance}% match</span>}
                                              {source.url && (
                                                <a href={source.url} target="_blank" rel="noopener noreferrer" className="text-white/20 hover:text-white/50 ml-auto shrink-0">
                                                  <ExternalLink className="w-3 h-3" />
                                                </a>
                                              )}
                                            </div>
                                            {source.snippet && <p className="text-xs text-white/30 mt-1 line-clamp-2">{source.snippet}</p>}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </motion.div>
                                )}
                              </AnimatePresence>

                              {/* Agent Plan */}
                              {ragMode === "agentic" && (message as any).agentPlan && (
                                <div className="mt-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                                  <div className="flex items-center gap-2 mb-2">
                                    <Brain className="w-3.5 h-3.5 text-purple-400" />
                                    <span className="text-xs font-semibold text-white/50">Reasoning Steps</span>
                                  </div>
                                  <div className="space-y-1">
                                    {(message as any).agentPlan.steps.map((step: any, idx: number) => (
                                      <div key={idx} className="text-xs text-white/40 flex items-center gap-2">
                                        <span className="w-4 h-4 rounded-full bg-purple-500/20 text-purple-300 flex items-center justify-center text-[9px] font-bold">{step.step}</span>
                                        <span className="flex-1">{step.query}</span>
                                        <span className="text-[9px] text-white/20 bg-white/5 px-1.5 py-0.5 rounded">{step.method}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Graph Connections */}
                              {ragMode === "agentic" && (message as any).graphConnections && (message as any).graphConnections.length > 0 && (
                                <div className="mt-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                                  <div className="flex items-center gap-2 mb-2">
                                    <Zap className="w-3.5 h-3.5 text-blue-400" />
                                    <span className="text-xs font-semibold text-white/50">Graph Connections</span>
                                    <span className="text-[9px] text-white/20 bg-white/5 px-1.5 py-0.5 rounded">{(message as any).graphConnections.length}</span>
                                  </div>
                                  <div className="space-y-1">
                                    {(message as any).graphConnections.slice(0, 3).map((conn: any, idx: number) => (
                                      <div key={idx} className="text-xs text-white/40">
                                        <span className="text-blue-300/70">{conn.source}</span>
                                        <span className="mx-2 text-white/15">→</span>
                                        <span className="text-blue-300/70">{conn.target}</span>
                                        <span className="text-[9px] text-white/20 ml-2">{conn.type}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Contradictions */}
                              {ragMode === "agentic" && (message as any).contradictions && (message as any).contradictions.length > 0 && (
                                <div className="mt-3 p-3 rounded-xl bg-red-500/5 border border-red-500/15">
                                  <div className="flex items-center gap-2 mb-2">
                                    <AlertCircle className="w-3.5 h-3.5 text-red-400/70" />
                                    <span className="text-xs font-semibold text-red-300/70">Contradictions</span>
                                  </div>
                                  <div className="space-y-2">
                                    {(message as any).contradictions.map((contra: any, idx: number) => (
                                      <div key={idx} className="text-xs text-white/40">
                                        <span className={cn("text-[9px] px-1.5 py-0.5 rounded mr-2",
                                          contra.severity === "high" ? "bg-red-500/20 text-red-300" :
                                          contra.severity === "medium" ? "bg-yellow-500/20 text-yellow-300" :
                                          "bg-orange-500/20 text-orange-300"
                                        )}>{contra.severity.toUpperCase()}</span>
                                        <span className="text-white/50">{contra.description}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Confidence */}
                              {message.confidence && (
                                <div className="mt-3">
                                  <ConfidenceIndicator
                                    confidence={message.confidence}
                                    avgRelevance={
                                      message.sources && message.sources.length > 0
                                        ? (() => {
                                            const avg = message.sources.reduce((sum, s) => sum + (s.relevance || 0), 0) / message.sources.length;
                                            return avg <= 1 ? Math.round(avg * 100) : Math.round(avg);
                                          })()
                                        : undefined
                                    }
                                    sourceCount={message.sources?.length}
                                  />
                                </div>
                              )}

                              {/* Chart */}
                              {message.visualData && <EmbeddedChart visualData={message.visualData} />}

                              {/* Follow-ups from RAG */}
                              {message.followUpQuestions && message.followUpQuestions.length > 0 && (
                                <FollowUpQuestions questions={message.followUpQuestions} onSelect={(q) => { setInput(q); sendMessage(q); }} />
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

                              {/* Actions row */}
                              <div className="flex items-center gap-1 mt-3 opacity-0 hover:opacity-100 focus-within:opacity-100 transition-opacity">
                                <button onClick={() => copyToClipboard(message.content, message.id)} className={cn("p-1.5 rounded-lg transition-all", copiedId === message.id ? "text-emerald-400" : "text-white/20 hover:text-white/50 hover:bg-white/5")}>
                                  {copiedId === message.id ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                </button>
                                <button onClick={() => rateMessage(message.id, "helpful")} className={cn("p-1.5 rounded-lg transition-all", message.rating === "helpful" ? "text-emerald-400" : "text-white/20 hover:text-white/50 hover:bg-white/5")}>
                                  <ThumbsUp className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={() => rateMessage(message.id, "not-helpful")} className={cn("p-1.5 rounded-lg transition-all", message.rating === "not-helpful" ? "text-red-400" : "text-white/20 hover:text-white/50 hover:bg-white/5")}>
                                  <ThumbsDown className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* Smart follow-ups */}
              {smartFollowUps.length > 0 && !isStreaming && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="pt-2 pb-4 ml-10"
                >
                  <div className="flex flex-wrap gap-2">
                    {smartFollowUps.map((q, i) => (
                      <motion.button
                        key={q}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 + i * 0.08 }}
                        onClick={() => sendMessage(q)}
                        className="px-4 py-2.5 rounded-xl text-sm text-white/50 hover:text-white/80 bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] hover:border-white/10 transition-all text-left"
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

        {/* ── Input Area ── */}
        <div className="p-4 border-t border-white/[0.06]">
          <form onSubmit={handleSubmit}>
            <div className={cn(
              "flex items-center gap-3 rounded-2xl border transition-all duration-300 px-2",
              input.trim()
                ? "bg-white/[0.04] border-white/15 shadow-lg shadow-black/20"
                : "bg-white/[0.02] border-white/[0.08]"
            )}>
              <Input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={isStreaming ? `${persona.name} is analyzing...` : `Message ${persona.name}...`}
                disabled={isStreaming}
                className="flex-1 border-0 bg-transparent py-7 px-4 text-[16px] text-white placeholder:text-white/25 focus-visible:ring-0 focus-visible:ring-offset-0"
              />
              {/* RAG mode — tiny toggle */}
              <Select value={ragMode} onValueChange={(v: RAGMode) => setRagMode(v)} disabled={isStreaming}>
                <SelectTrigger className="w-auto h-8 px-2.5 bg-white/5 border-white/10 text-white/40 text-[10px] rounded-lg hover:bg-white/10 transition-all gap-1 shrink-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-black border-white/10 rounded-xl">
                  <SelectItem value="hybrid" className="text-white/60 focus:bg-white/10 text-xs">Hybrid</SelectItem>
                  <SelectItem value="agentic" className="text-white/60 focus:bg-white/10 text-xs">Agentic</SelectItem>
                  <SelectItem value="neo4j" className="text-white/60 focus:bg-white/10 text-xs">Neo4j</SelectItem>
                </SelectContent>
              </Select>
              <motion.button
                type="submit"
                disabled={!input.trim() || isStreaming}
                whileTap={{ scale: 0.92 }}
                className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all duration-200",
                  input.trim() && !isStreaming
                    ? cn("text-white shadow-lg", `bg-gradient-to-r ${persona.gradient}`)
                    : "bg-white/5 text-white/20"
                )}
              >
                {isStreaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </motion.button>
            </div>
          </form>
          <div className="flex items-center justify-between mt-2 px-2">
            <p className="text-[11px] text-white/35 max-w-xs line-clamp-2">
              {CAREER_SYSTEM_DISCLAIMER}
            </p>
            <span className="ml-2 text-[11px] text-white/25 whitespace-nowrap">⏎ to send</span>
          </div>
        </div>
        </>
        )}
      </div>
    </div>
  );
}
