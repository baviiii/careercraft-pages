import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
/**
 * Horus Career Coach — the carbon console.
 *
 * SEPARATION OF CONCERNS:
 * - Hybrid RAG: Standard retrieval (useEnterpriseRAG)
 * - Agentic + Graph RAG: Multi-step reasoning with relationship discovery (useAgenticRAG)
 * - Users can toggle between modes via UI
 * - Each mode uses its own hook for clean separation
 *
 * VISUAL SYSTEM: `.cc-console` in craft.css. A dark instrument set into the
 * cream page — machine microtype in JetBrains Mono, prose in Inter, persona
 * names in Bricolage Grotesque, one accent at a time driven by `data-accent`.
 * Every ink is contrast-checked against the console ground; nothing sits below
 * AA for body text, which is what the old white/20-on-black chrome violated.
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
  ChevronRight,
  Brain,
  Zap,
  Download,
  TrendingUp,
  BarChart3,
  Star,
  AlertCircle,
  CheckCircle2,
  Maximize2,
  DollarSign,
  Shield,
  GraduationCap,
  Target,
  Briefcase,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

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

/** Console accents — house tones, not neon. Drives `data-accent`. */
type Accent = "cobalt" | "sage" | "wheat" | "rose";

// ============================================================================
// PERSONA SYSTEM — Horus changes personality based on focus area
// ============================================================================

interface Persona {
  name: string;
  subtitle: string;
  accent: Accent;
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
    accent: "cobalt",
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
    accent: "rose",
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
    accent: "sage",
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
    accent: "wheat",
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
    accent: "cobalt",
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
    accent: "cobalt",
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

const RAG_MODE_LABEL: Record<RAGMode, string> = {
  hybrid: "Hybrid",
  agentic: "Agentic",
  neo4j: "Neo4j",
};

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

  /** The persona list backing the lens selector — DB prompts, else the built-ins. */
  const lensOptions = useMemo(() => {
    if (promptOptions.length > 1) {
      return promptOptions.map((p) => ({ value: p.focus_area, label: p.name, key: p.id }));
    }
    return ['careers', 'analyst', 'funding', 'skills', 'policies', 'entrepreneurship'].map((key) => ({
      value: key,
      label: getPersona(key).name,
      key,
    }));
  }, [promptOptions]);

  // Generate follow-up questions from the last assistant message
  const smartFollowUps = useMemo(() => {
    const lastAssistant = [...messages].reverse().find(m => m.role === 'assistant' && !m.isLoading);
    if (!lastAssistant) return [];
    return persona.getFollowUps(lastAssistant.content);
  }, [messages, persona]);

  // Scroll to bottom when new messages arrive. Expanding re-parents the shell
  // into a portal, which remounts the scroller — so re-pin the view then too.
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isExpanded]);

  // Expanded mode is a true overlay: lock the page behind it and let Escape out.
  useEffect(() => {
    if (!isExpanded) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsExpanded(false);
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [isExpanded]);

  // Clear chat when focus area changes (to avoid confusion with different prompts)
  useEffect(() => {
    if (messages.length > 0 && !loadingPrompts) {
      clearChat();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusArea]);

  // Clear chat when RAG mode changes (different systems, different context)
  useEffect(() => {
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
    const renderInline = (text: string, lineIndex: number) =>
      text.split(/(\*\*.*?\*\*|\[Source \d+\])/g).map((part, partIndex) => {
        if (/^\*\*.*\*\*$/.test(part)) {
          return (
            <strong key={`${lineIndex}-${partIndex}`} className="font-semibold text-[color:var(--con-ink)]">
              {part.slice(2, -2)}
            </strong>
          );
        }
        if (/^\[Source \d+\]$/.test(part)) {
          return (
            <span
              key={`${lineIndex}-${partIndex}`}
              className="cc-font-mono text-[0.85em] font-medium text-[color:var(--con-accent)]"
            >
              {part}
            </span>
          );
        }
        return part;
      });

    return content.split("\n").map((line, lineIndex) => {
      const isBullet = line.startsWith("- ") || line.startsWith("• ");
      const numbered = line.match(/^(\d+)\.\s(.*)$/);
      const body = isBullet ? line.slice(2) : numbered ? numbered[2] : line;

      return (
        <div
          key={lineIndex}
          className={cn(
            "min-h-[1.75em]",
            (isBullet || numbered) && "ml-1 flex items-start gap-2.5",
          )}
        >
          {isBullet && (
            <span aria-hidden className="mt-[0.7em] h-[3px] w-[3px] shrink-0 rounded-full bg-[color:var(--con-accent)]" />
          )}
          {numbered && (
            <span aria-hidden className="cc-font-mono mt-[0.15em] shrink-0 text-xs text-[color:var(--con-accent)]">
              {numbered[1].padStart(2, "0")}
            </span>
          )}
          <span>{renderInline(body, lineIndex)}</span>
        </div>
      );
    });
  }, []);

  const messageCount = messages.filter((m) => !m.isLoading).length;

  // ── Console chrome ───────────────────────────────────────────────────────
  const header = (
    <header className="relative z-10 flex shrink-0 flex-wrap items-center gap-x-4 gap-y-3 border-b border-[color:var(--con-line)] px-4 py-3 md:px-5">
      {/* Identity */}
      <div className="flex min-w-0 items-center gap-3">
        <motion.div
          key={focusArea}
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 400, damping: 26 }}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[color:var(--con-accent-line)] bg-[color:var(--con-accent-soft)]"
        >
          <PersonaIcon className="h-[18px] w-[18px] text-[color:var(--con-accent)]" />
        </motion.div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="cc-font-display text-[15px] leading-none tracking-tight text-[color:var(--con-ink)]">
              HORUS
            </span>
            <span className="con-pip" aria-hidden />
            <span className="con-mono text-[color:var(--con-ink-3)]">Live</span>
          </div>
          <p className="mt-1 truncate text-[12px] leading-none text-[color:var(--con-ink-2)]">
            {persona.subtitle}
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="ml-auto flex items-center gap-2">
        {/* Lens — which specialist is answering */}
        <div className="hidden items-center gap-2 sm:flex">
          <span className="con-mono text-[color:var(--con-ink-3)]">Lens</span>
          <Select value={focusArea} onValueChange={setFocusArea} disabled={isStreaming}>
            <SelectTrigger
              aria-label="Choose specialist"
              className="h-8 w-[152px] gap-1.5 rounded-lg border-[color:var(--con-line-2)] bg-[color:var(--con-raised)] px-2.5 text-[12px] font-medium text-[color:var(--con-ink)] focus:ring-1 focus:ring-[color:var(--con-accent)] focus:ring-offset-0"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-[color:var(--con-line-2)] bg-[color:var(--con-panel)] text-[color:var(--con-ink)]">
              {lensOptions.map((o) => (
                <SelectItem
                  key={o.key}
                  value={o.value}
                  className="text-[13px] text-[color:var(--con-ink-2)] focus:bg-[color:var(--con-accent-soft)] focus:text-[color:var(--con-ink)]"
                >
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Chat / Insights */}
        {messages.length > 0 && (
          <div className="flex items-center gap-0.5 rounded-lg border border-[color:var(--con-line)] bg-[color:var(--con-raised)] p-0.5">
            {(["chat", "insights"] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setViewMode(v)}
                data-active={viewMode === v}
                className="con-btn con-mono px-2.5 py-1.5"
              >
                {v === "chat" ? "Chat" : "Insights"}
              </button>
            ))}
          </div>
        )}

        {messages.length > 0 && (
          <>
            <button type="button" onClick={handleExportPDF} className="con-btn" title="Export conversation as PDF">
              <Download className="h-4 w-4" />
              <span className="sr-only">Export PDF</span>
            </button>
            <button type="button" onClick={clearChat} className="con-btn" title="Start a new conversation">
              <RefreshCw className="h-4 w-4" />
              <span className="sr-only">New chat</span>
            </button>
          </>
        )}

        {/* Expand / Exit — labelled on the way out, so there is always an obvious door. */}
        {isExpanded ? (
          <button
            type="button"
            onClick={() => setIsExpanded(false)}
            className="con-btn con-btn--accent con-mono px-3 py-1.5"
            title="Exit fullscreen (Esc)"
          >
            <X className="h-3.5 w-3.5" />
            Exit fullscreen
            <kbd className="ml-1 rounded border border-current/30 px-1 py-px text-[9px] opacity-70">Esc</kbd>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setIsExpanded(true)}
            className="con-btn"
            title="Expand to fullscreen"
          >
            <Maximize2 className="h-4 w-4" />
            <span className="sr-only">Expand to fullscreen</span>
          </button>
        )}
      </div>
    </header>
  );

  // ── Insights ─────────────────────────────────────────────────────────────
  const insightsPanel = (
    <div className="con-scroll relative z-10 min-h-0 flex-1 space-y-6 overflow-y-auto p-4 md:p-6">
      <section>
        <h3 className="con-mono mb-3 text-[color:var(--con-ink-3)]">Conversation overview</h3>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            { label: "Messages", value: messageCount },
            { label: "Sources cited", value: messages.reduce((sum, m) => sum + (m.sources?.length || 0), 0) },
            { label: "Avg response", value: `${Math.round(analytics.avgResponseTime)}ms` },
            { label: "Tokens used", value: messages.reduce((sum, m) => sum + (m.tokens || 0), 0).toLocaleString() },
          ].map((stat) => (
            <div key={stat.label} className="con-panel p-4">
              <p className="cc-font-display cc-tabular text-[26px] leading-none text-[color:var(--con-ink)]">
                {stat.value}
              </p>
              <p className="con-mono mt-2 text-[color:var(--con-ink-3)]">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h3 className="con-mono mb-3 text-[color:var(--con-ink-3)]">Topics discussed</h3>
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
              <span
                key={topic}
                className="con-mono rounded-full border border-[color:var(--con-line-2)] bg-[color:var(--con-raised)] px-3 py-1.5 text-[color:var(--con-ink-2)]"
              >
                {topic}
              </span>
            ));
          })()}
        </div>
      </section>

      <section>
        <h3 className="con-mono mb-3 text-[color:var(--con-ink-3)]">Sources referenced</h3>
        <div className="space-y-2">
          {(() => {
            const sourceMap = new Map<string, { count: number; pages: Set<number> }>();
            messages.forEach(m => {
              m.sources?.forEach(s => {
                const key = s.title || "Unknown";
                const existing = sourceMap.get(key) || { count: 0, pages: new Set<number>() };
                existing.count++;
                if (s.pageNumber) existing.pages.add(s.pageNumber);
                sourceMap.set(key, existing);
              });
            });
            const sorted = Array.from(sourceMap.entries()).sort((a, b) => b[1].count - a[1].count);
            if (sorted.length === 0) {
              return <p className="text-[13px] text-[color:var(--con-ink-3)]">No sources cited yet.</p>;
            }
            return sorted.slice(0, 10).map(([title, data]) => (
              <div key={title} className="con-panel flex items-center gap-3 p-3">
                <FileText className="h-4 w-4 shrink-0 text-[color:var(--con-accent)]" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] text-[color:var(--con-ink)]">{title}</p>
                  <p className="con-mono mt-1 text-[color:var(--con-ink-3)]">
                    {data.count}× referenced
                    {data.pages.size > 0 ? ` · p. ${Array.from(data.pages).sort((a, b) => a - b).join(", ")}` : ""}
                  </p>
                </div>
              </div>
            ));
          })()}
        </div>
      </section>

      <section>
        <h3 className="con-mono mb-3 text-[color:var(--con-ink-3)]">Key findings</h3>
        <div className="space-y-2">
          {messages.filter(m => m.role === "assistant" && !m.isLoading && m.content.length > 50).slice(-5).map((m, i) => {
            const firstSentence = m.content.replace(/\*\*/g, "").split(/[.!?]\s/)[0];
            return (
              <div key={i} className="con-panel border-l-2 border-l-[color:var(--con-accent)] p-3">
                <p className="line-clamp-2 text-[13px] leading-relaxed text-[color:var(--con-ink-2)]">{firstSentence}.</p>
                {m.confidence && (
                  <span className="con-mono mt-2 inline-block text-[color:var(--con-ink-3)]">
                    {m.confidence} confidence
                  </span>
                )}
              </div>
            );
          })}
          {messages.filter(m => m.role === "assistant" && !m.isLoading && m.content.length > 50).length === 0 && (
            <p className="text-[13px] text-[color:var(--con-ink-3)]">No findings yet. Start a conversation to see insights.</p>
          )}
        </div>
      </section>
    </div>
  );

  // ── Welcome ──────────────────────────────────────────────────────────────
  const welcome = (
    <div className="flex min-h-full flex-col items-center justify-center px-5 py-8 md:px-8">
      {/* Orbital mark */}
      <motion.div
        key={focusArea + "-orb"}
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 160, damping: 20 }}
        className="relative mb-6"
      >
        <motion.div
          className="absolute inset-[-22px] rounded-full border border-[color:var(--con-line-2)]"
          animate={{ rotate: 360 }}
          transition={{ duration: 34, repeat: Infinity, ease: "linear" }}
        >
          <span className="absolute left-1/2 top-0 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[color:var(--con-accent)]" />
        </motion.div>
        <motion.div
          className="absolute inset-[-12px] rounded-full border border-[color:var(--con-line)]"
          animate={{ rotate: -360 }}
          transition={{ duration: 22, repeat: Infinity, ease: "linear" }}
        >
          <span className="absolute right-0 top-1/2 h-1 w-1 -translate-y-1/2 translate-x-1/2 rounded-full bg-[color:var(--con-accent-2)]" />
        </motion.div>
        <div className="relative z-10 grid h-16 w-16 place-items-center rounded-2xl border border-[color:var(--con-accent-line)] bg-[color:var(--con-accent-soft)]">
          <PersonaIcon className="h-7 w-7 text-[color:var(--con-accent)]" />
        </div>
      </motion.div>

      <h2 className="cc-font-display max-w-lg text-center text-[26px] leading-[1.1] tracking-[-0.02em] text-[color:var(--con-ink)] md:text-[30px]">
        {persona.welcomeTitle}
      </h2>
      <p className="mt-3 max-w-md text-center text-[14px] leading-relaxed text-[color:var(--con-ink-2)]">
        {persona.welcomeDescription}
      </p>

      {/* Instrument readout */}
      <div className="con-mono mt-5 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[color:var(--con-ink-3)]">
        <span className="inline-flex items-center gap-1.5"><FileText className="h-3 w-3" />54 documents</span>
        <span className="h-3 w-px bg-[color:var(--con-line-2)]" aria-hidden />
        <span className="inline-flex items-center gap-1.5"><Brain className="h-3 w-3" />{RAG_MODE_LABEL[ragMode]} reasoning</span>
        <span className="h-3 w-px bg-[color:var(--con-line-2)]" aria-hidden />
        <span className="inline-flex items-center gap-1.5"><Zap className="h-3 w-3" />Cited answers</span>
      </div>

      {/* Primary prompts */}
      <div className="mt-7 w-full max-w-2xl space-y-2.5">
        {persona.suggestedQuestions.slice(0, 3).map((q, i) => (
          <button
            key={q.text}
            type="button"
            onClick={() => sendMessage(q.text)}
            className="con-rise group con-panel flex w-full items-center gap-3.5 p-3.5 text-left transition-colors hover:border-[color:var(--con-accent-line)] hover:bg-[color:var(--con-raised)]"
            style={{ animationDelay: `${120 + i * 80}ms` }}
          >
            {q.icon && (
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-[color:var(--con-accent-line)] bg-[color:var(--con-accent-soft)]">
                <q.icon className="h-[18px] w-[18px] text-[color:var(--con-accent)]" />
              </span>
            )}
            <span className="min-w-0 flex-1">
              <span className="block text-[14.5px] font-medium leading-snug text-[color:var(--con-ink)]">{q.text}</span>
              <span className="con-mono mt-1.5 block text-[color:var(--con-ink-3)]">
                {q.category}{q.popular ? " · Popular" : ""}
              </span>
            </span>
            <ChevronRight className="h-4 w-4 shrink-0 text-[color:var(--con-ink-3)] transition-transform group-hover:translate-x-0.5 group-hover:text-[color:var(--con-accent)]" />
          </button>
        ))}
      </div>

      {/* Secondary prompts */}
      {persona.suggestedQuestions.length > 3 && (
        <div className="mt-4 flex max-w-2xl flex-wrap justify-center gap-2">
          {persona.suggestedQuestions.slice(3).map((q, i) => (
            <button
              key={q.text}
              type="button"
              onClick={() => sendMessage(q.text)}
              className="con-rise rounded-full border border-[color:var(--con-line)] bg-[color:var(--con-panel)] px-3.5 py-2 text-[12.5px] text-[color:var(--con-ink-2)] transition-colors hover:border-[color:var(--con-accent-line)] hover:text-[color:var(--con-ink)]"
              style={{ animationDelay: `${380 + i * 60}ms` }}
            >
              {q.text}
            </button>
          ))}
        </div>
      )}
    </div>
  );

  // ── Transcript ───────────────────────────────────────────────────────────
  const transcript = (
    <div className="px-4 py-5 md:px-6">
      <AnimatePresence mode="popLayout">
        {messages.map((message) => (
          <motion.div
            key={message.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="py-3.5"
          >
            {message.role === "user" ? (
              <div className="flex justify-end">
                <div className="max-w-[78%] rounded-2xl rounded-br-md border border-[color:var(--con-accent-line)] bg-[color:var(--con-accent-soft)] px-4 py-3 text-[14.5px] leading-relaxed text-[color:var(--con-ink)]">
                  {message.content}
                </div>
              </div>
            ) : (
              <div className="flex gap-3">
                <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-[color:var(--con-accent-line)] bg-[color:var(--con-accent-soft)]">
                  <PersonaIcon className="h-3.5 w-3.5 text-[color:var(--con-accent)]" />
                </span>
                <div className="min-w-0 flex-1">
                  {message.isLoading ? (
                    <div className="py-2">
                      <div className="con-sweep w-40" />
                      <div className="con-mono mt-2.5 flex items-center gap-2 text-[color:var(--con-ink-3)]">
                        <Brain className="h-3 w-3" />
                        Analysing documents
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="max-w-none text-[14.5px] leading-[1.75] text-[color:var(--con-ink-2)]">
                        {formatMessage(message.content)}
                      </div>

                      {/* Source chips */}
                      {message.sources && message.sources.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {message.sources.slice(0, 4).map((source, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => setShowSources(showSources === message.id ? null : message.id)}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-[color:var(--con-line)] bg-[color:var(--con-panel)] px-2.5 py-1.5 text-[11.5px] text-[color:var(--con-ink-2)] transition-colors hover:border-[color:var(--con-accent-line)] hover:text-[color:var(--con-ink)]"
                            >
                              <FileText className="h-3 w-3 text-[color:var(--con-accent)]" />
                              <span className="max-w-[160px] truncate">{source.title}</span>
                              {source.pageNumber && (
                                <span className="cc-font-mono text-[10px] text-[color:var(--con-ink-3)]">p.{source.pageNumber}</span>
                              )}
                            </button>
                          ))}
                          {message.sources.length > 4 && (
                            <button
                              type="button"
                              onClick={() => setShowSources(showSources === message.id ? null : message.id)}
                              className="con-mono rounded-lg border border-[color:var(--con-line)] bg-[color:var(--con-panel)] px-2.5 py-1.5 text-[color:var(--con-ink-2)] transition-colors hover:text-[color:var(--con-ink)]"
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
                              const relevance = source.relevance
                                ? (source.relevance <= 1 ? Math.round(source.relevance * 100) : Math.round(source.relevance))
                                : 0;
                              return (
                                <div key={idx} className="con-panel flex items-start gap-3 p-3">
                                  <FileText className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--con-accent)]" />
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2">
                                      <p className="truncate text-[13px] font-medium text-[color:var(--con-ink)]">{source.title}</p>
                                      {source.pageNumber && (
                                        <span className="con-mono shrink-0 rounded bg-[color:var(--con-raised)] px-1.5 py-0.5 text-[color:var(--con-ink-3)]">
                                          p.{source.pageNumber}
                                        </span>
                                      )}
                                      {relevance > 0 && (
                                        <span className="con-mono shrink-0 text-[color:var(--con-accent)]">{relevance}%</span>
                                      )}
                                      {source.url && (
                                        <a
                                          href={source.url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="ml-auto shrink-0 text-[color:var(--con-ink-3)] transition-colors hover:text-[color:var(--con-accent)]"
                                          title="Open source"
                                        >
                                          <ExternalLink className="h-3.5 w-3.5" />
                                        </a>
                                      )}
                                    </div>
                                    {source.snippet && (
                                      <p className="mt-1.5 line-clamp-2 text-[12.5px] leading-relaxed text-[color:var(--con-ink-3)]">
                                        {source.snippet}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Reasoning steps */}
                      {ragMode === "agentic" && (message as any).agentPlan && (
                        <div className="con-panel mt-3 p-3">
                          <div className="con-mono mb-2.5 flex items-center gap-2 text-[color:var(--con-ink-3)]">
                            <Brain className="h-3.5 w-3.5 text-[color:var(--con-accent)]" />
                            Reasoning steps
                          </div>
                          <div className="space-y-1.5">
                            {(message as any).agentPlan.steps.map((step: any, idx: number) => (
                              <div key={idx} className="flex items-center gap-2.5 text-[12.5px] text-[color:var(--con-ink-2)]">
                                <span className="cc-font-mono grid h-5 w-5 shrink-0 place-items-center rounded border border-[color:var(--con-accent-line)] text-[10px] text-[color:var(--con-accent)]">
                                  {step.step}
                                </span>
                                <span className="min-w-0 flex-1 truncate">{step.query}</span>
                                <span className="con-mono shrink-0 text-[color:var(--con-ink-3)]">{step.method}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Graph connections */}
                      {ragMode === "agentic" && (message as any).graphConnections?.length > 0 && (
                        <div className="con-panel mt-3 p-3">
                          <div className="con-mono mb-2.5 flex items-center gap-2 text-[color:var(--con-ink-3)]">
                            <Zap className="h-3.5 w-3.5 text-[color:var(--con-accent)]" />
                            Graph connections
                            <span className="rounded bg-[color:var(--con-raised)] px-1.5 py-0.5">
                              {(message as any).graphConnections.length}
                            </span>
                          </div>
                          <div className="space-y-1.5">
                            {(message as any).graphConnections.slice(0, 3).map((conn: any, idx: number) => (
                              <div key={idx} className="flex items-center gap-2 text-[12.5px] text-[color:var(--con-ink-2)]">
                                <span className="truncate">{conn.source}</span>
                                <span className="shrink-0 text-[color:var(--con-accent)]">→</span>
                                <span className="truncate">{conn.target}</span>
                                <span className="con-mono ml-auto shrink-0 text-[color:var(--con-ink-3)]">{conn.type}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Contradictions */}
                      {ragMode === "agentic" && (message as any).contradictions?.length > 0 && (
                        <div className="mt-3 rounded-[0.85rem] border border-[color:var(--con-rose)]/35 bg-[color:var(--con-rose)]/10 p-3">
                          <div className="con-mono mb-2.5 flex items-center gap-2 text-[color:var(--con-rose)]">
                            <AlertCircle className="h-3.5 w-3.5" />
                            Contradictions
                          </div>
                          <div className="space-y-2">
                            {(message as any).contradictions.map((contra: any, idx: number) => (
                              <div key={idx} className="flex items-start gap-2 text-[12.5px] text-[color:var(--con-ink-2)]">
                                <span className="con-mono shrink-0 rounded bg-[color:var(--con-rose)]/20 px-1.5 py-0.5 text-[color:var(--con-rose)]">
                                  {contra.severity}
                                </span>
                                <span>{contra.description}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

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

                      {message.visualData && <EmbeddedChart visualData={message.visualData} />}

                      {message.followUpQuestions && message.followUpQuestions.length > 0 && (
                        <FollowUpQuestions
                          questions={message.followUpQuestions}
                          onSelect={(q) => { setInput(q); sendMessage(q); }}
                        />
                      )}

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

                      {/* Actions — visible on hover/focus, never fully hidden from keyboards */}
                      <div className="mt-2.5 flex items-center gap-1 opacity-60 transition-opacity focus-within:opacity-100 hover:opacity-100">
                        <button
                          type="button"
                          onClick={() => copyToClipboard(message.content, message.id)}
                          className={cn("con-btn p-1.5", copiedId === message.id && "text-[color:var(--con-sage)]")}
                          title="Copy answer"
                        >
                          {copiedId === message.id ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => rateMessage(message.id, "helpful")}
                          className={cn("con-btn p-1.5", message.rating === "helpful" && "text-[color:var(--con-sage)]")}
                          title="Helpful"
                        >
                          <ThumbsUp className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => rateMessage(message.id, "not-helpful")}
                          className={cn("con-btn p-1.5", message.rating === "not-helpful" && "text-[color:var(--con-rose)]")}
                          title="Not helpful"
                        >
                          <ThumbsDown className="h-3.5 w-3.5" />
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

      {smartFollowUps.length > 0 && !isStreaming && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="ml-10 pb-3 pt-1"
        >
          <div className="con-mono mb-2 text-[color:var(--con-ink-3)]">Follow up</div>
          <div className="flex flex-wrap gap-2">
            {smartFollowUps.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => sendMessage(q)}
                className="rounded-xl border border-[color:var(--con-line)] bg-[color:var(--con-panel)] px-3.5 py-2 text-left text-[13px] text-[color:var(--con-ink-2)] transition-colors hover:border-[color:var(--con-accent-line)] hover:text-[color:var(--con-ink)]"
              >
                {q}
              </button>
            ))}
          </div>
        </motion.div>
      )}

      <div ref={messagesEndRef} />
    </div>
  );

  // ── Composer ─────────────────────────────────────────────────────────────
  const composer = (
    <div className="relative z-10 shrink-0 border-t border-[color:var(--con-line)] px-4 py-3 md:px-5 md:py-4">
      <form onSubmit={handleSubmit}>
        <div
          className={cn(
            "flex items-center gap-2 rounded-2xl border px-2 transition-colors duration-200",
            input.trim()
              ? "border-[color:var(--con-accent-line)] bg-[color:var(--con-raised)]"
              : "border-[color:var(--con-line-2)] bg-[color:var(--con-panel)]",
          )}
        >
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={isStreaming ? `${persona.name} is analysing…` : `Ask the ${persona.name.toLowerCase()}…`}
            disabled={isStreaming}
            className="h-12 flex-1 border-0 bg-transparent px-2.5 text-[14.5px] text-[color:var(--con-ink)] placeholder:text-[color:var(--con-ink-3)] focus-visible:ring-0 focus-visible:ring-offset-0"
          />
          <Select value={ragMode} onValueChange={(v: RAGMode) => setRagMode(v)} disabled={isStreaming}>
            <SelectTrigger
              aria-label="Retrieval mode"
              className="con-mono h-8 w-auto shrink-0 gap-1.5 rounded-lg border-[color:var(--con-line-2)] bg-[color:var(--con-bg)] px-2.5 text-[color:var(--con-ink-2)] focus:ring-1 focus:ring-[color:var(--con-accent)] focus:ring-offset-0"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-[color:var(--con-line-2)] bg-[color:var(--con-panel)] text-[color:var(--con-ink)]">
              {(Object.keys(RAG_MODE_LABEL) as RAGMode[]).map((m) => (
                <SelectItem
                  key={m}
                  value={m}
                  className="text-[13px] text-[color:var(--con-ink-2)] focus:bg-[color:var(--con-accent-soft)] focus:text-[color:var(--con-ink)]"
                >
                  {RAG_MODE_LABEL[m]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <button
            type="submit"
            disabled={!input.trim() || isStreaming}
            className={cn(
              "grid h-10 w-10 shrink-0 place-items-center rounded-xl transition-colors",
              input.trim() && !isStreaming
                ? "bg-[color:var(--con-accent)] text-[color:var(--con-bg)] hover:bg-[color:var(--con-accent-2)]"
                : "bg-[color:var(--con-raised)] text-[color:var(--con-ink-3)]",
            )}
            title="Send"
          >
            {isStreaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </div>
      </form>
      <div className="mt-2.5 flex items-start justify-between gap-4 px-1">
        <p className="line-clamp-2 max-w-lg text-[11.5px] leading-relaxed text-[color:var(--con-ink-3)]">
          {CAREER_SYSTEM_DISCLAIMER}
        </p>
        <span className="con-mono shrink-0 text-[color:var(--con-ink-3)]">⏎ Send</span>
      </div>
    </div>
  );

  // The console shell. Inline it fills whatever height the page hands it —
  // CraftAppLayout's `fill` mode pins the page to one viewport, so no magic
  // offset is needed and the page itself never grows a second scrollbar.
  const shell = (
    <div
      className="cc-console relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-[1.25rem] border border-[color:var(--cc-hair-strong)] shadow-[0_30px_70px_-40px_rgba(20,22,26,0.75)]"
      data-accent={persona.accent}
    >
      <div className="cc-console__grid" aria-hidden />
      <span className="cc-console__reg cc-console__reg--tl" aria-hidden />
      <span className="cc-console__reg cc-console__reg--tr" aria-hidden />
      <span className="cc-console__reg cc-console__reg--bl" aria-hidden />
      <span className="cc-console__reg cc-console__reg--br" aria-hidden />

      {header}

      {viewMode === "insights" && messages.length > 0 ? (
        insightsPanel
      ) : (
        <>
          <div className="con-scroll relative z-10 min-h-0 flex-1 overflow-y-auto">
            {messages.length === 0 ? welcome : transcript}
          </div>
          {composer}
        </>
      )}
    </div>
  );

  // Expanded, the shell moves to a portal on <body>. It cannot stay in place: the
  // page wraps it in framer-motion elements, and a transformed ancestor becomes
  // the containing block for `position: fixed` — which would pin "fullscreen" to
  // the content column instead of the viewport.
  if (isExpanded) {
    return createPortal(
      <div
        className="fixed inset-0 z-[60] flex flex-col bg-[color:var(--cc-ink)]/70 p-3 backdrop-blur-sm md:p-5"
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) setIsExpanded(false);
        }}
      >
        {shell}
      </div>,
      document.body,
    );
  }

  return <div className="flex h-full min-h-0 flex-col">{shell}</div>;
}
