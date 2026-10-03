import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
/**
 * Career Coach — a briefing desk, not a chatbot skin.
 *
 * VISUAL SYSTEM: cream paper, ink, rust. Same Craft language as the rest of
 * the logged-in app. Thinking is a galley-proof ledger, not a spinner.
 *
 * ENGINE: the Horus agent, through the coach-chat edge function
 * (hooks/useCoachChat). The agent picks its own tools; the ledger records the
 * steps it actually took, and the answer streams in as it is written.
 */
import { useCoachChat, type ThinkingStep } from "@/hooks/useCoachChat";
import { exportConversationToPDF } from "@/lib/pdfExport";
import {
  Send,
  Square,
  Sparkles,
  FileText,
  ExternalLink,
  ThumbsUp,
  ThumbsDown,
  Copy,
  Check,
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
    welcomeTitle: "Ask about your next move.",
    welcomeDescription: "Occupations, pay, training pathways, and public-sector applications — answered from SA Government documents, cited to the page.",
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
    welcomeTitle: "Read across the papers.",
    welcomeDescription: "Budget papers, policy, and workforce reports — compared, contradicted, and cited. I look for the gap between what is said and what is funded.",
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
    welcomeTitle: "Where the money went.",
    welcomeDescription: "Allocations, grants, and year-on-year shifts across the SA budget — every figure tied back to the paper it came from.",
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
    welcomeTitle: "What SA actually needs.",
    welcomeDescription: "Skills gaps, TAFE pathways, and emerging demand — mapped from workforce reports, not job-board rumour.",
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
    welcomeTitle: "Policy, in plain English.",
    welcomeDescription: "How SA policy lands on industries, communities, and careers — read from the source documents, not the press release.",
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
    welcomeTitle: "Grants, hubs, first contracts.",
    welcomeDescription: "Startup support, Lot Fourteen, procurement pathways — the government programmes, with the eligibility buried in the papers.",
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
    welcomeTitle: "The SA papers, open.",
    welcomeDescription: "Budgets, careers, skills, policy — fifty-four government documents, one conversation. Ask anything. Every answer is cited.",
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

// ============================================================================
// REASONING LEDGER — the flight recorder.
//
// While a query runs, this is the loading state: each step the agent takes
// (a search, a graph lookup, writing) appears the moment it starts, with the
// agent's own query underneath, and is stamped with its time when it lands.
// After the answer arrives it collapses to a one-line receipt ("Thought for
// 12.4s · 4 steps") that expands on demand — the thinking stays auditable
// without crowding the answer.
// ============================================================================

function formatMs(ms?: number): string {
  if (ms == null) return "";
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;
}

/** Re-renders on an interval while `active`, so live clocks keep moving. */
function useNow(active: boolean, intervalMs = 100): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(id);
  }, [active, intervalMs]);
  return now;
}

/**
 * What to tell someone who has been watching one step for a while. Steps are
 * real tool calls and normally land in a few seconds, so a long one is worth
 * a word. Writing needs none — the answer is visibly arriving.
 */
function waitNote(step: ThinkingStep, elapsedMs: number): string | null {
  if (step.id === "write") return null;
  if (elapsedMs >= 45_000) return "Slower than usual — still waiting on the server.";
  if (elapsedMs >= 10_000) return "Taking longer than usual.";
  return null;
}

function ThinkingLedger({
  steps,
  live,
  elapsedMs,
}: {
  steps: ThinkingStep[];
  live?: boolean;
  /** Wall-clock time for the whole answer. Steps can run in parallel, so
   *  their durations do not add up to it. */
  elapsedMs?: number;
}) {
  const [open, setOpen] = useState(false);
  const expanded = live || open;
  const now = useNow(!!live);

  if (!steps || steps.length === 0) return null;

  const totalMs = elapsedMs ?? steps.reduce((sum, s) => sum + (s.ms || 0), 0);
  const failed = steps.some((s) => s.status === "failed");
  const state = live ? "live" : failed ? "failed" : "done";
  const firstStart = steps.reduce<number | undefined>(
    (min, s) => (s.startedAt != null && (min == null || s.startedAt < min) ? s.startedAt : min),
    undefined,
  );
  const liveElapsed = live && firstStart != null ? Math.max(0, now - firstStart) : undefined;

  return (
    <div className={cn("con-ledger", live && "con-ledger--live")}>
      <button
        type="button"
        onClick={() => !live && setOpen((v) => !v)}
        className="con-ledger__head"
        aria-expanded={expanded}
        disabled={live}
      >
        <span className="con-ledger__pulse" data-state={state} aria-hidden />
        <span className="con-mono">
          {live ? "Working" : `Thought for ${formatMs(totalMs) || "<1s"}`}
        </span>
        {liveElapsed != null && (
          <span className="con-mono cc-tabular con-ledger__clock" aria-hidden>
            {(liveElapsed / 1000).toFixed(1)}s
          </span>
        )}
        <span className="con-mono con-ledger__count">
          {steps.length} step{steps.length === 1 ? "" : "s"}
        </span>
        {!live && (
          <ChevronRight
            className={cn("h-3 w-3 shrink-0 text-[color:var(--con-ink-3)] transition-transform duration-200", expanded && "rotate-90")}
          />
        )}
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.2, 0.8, 0.2, 1] }}
            className="overflow-hidden"
          >
            <ol className="con-ledger__list">
              {steps.map((step) => {
                const running = live && step.status === "active";
                const stepElapsed = running && step.startedAt != null ? Math.max(0, now - step.startedAt) : undefined;
                const note = stepElapsed != null ? waitNote(step, stepElapsed) : null;
                return (
                  <li key={step.id} className="con-ledger__step" data-status={step.status}>
                    <span className="con-ledger__node" aria-hidden />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-3">
                        <span className={cn("con-ledger__label", running && "con-ledger__label--live")}>{step.label}</span>
                        <span className="con-mono cc-tabular con-ledger__ms">
                          {stepElapsed != null
                            ? `${(stepElapsed / 1000).toFixed(1)}s`
                            : step.status === "active" ? "· · ·" : formatMs(step.ms)}
                        </span>
                      </div>
                      {step.detail && <p className="con-ledger__detail">{step.detail}</p>}
                      {note && (
                        <motion.p
                          key={note}
                          initial={{ opacity: 0, y: 2 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="con-ledger__note"
                        >
                          {note}
                        </motion.p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
            {live && <div className="con-sweep mx-3 mb-3" />}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function CareerCoach() {
  const [input, setInput] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showSources, setShowSources] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [viewMode, setViewMode] = useState<"chat" | "insights">("chat");
  const [focusArea, setFocusArea] = useState<string>("careers");
  const [promptOptions, setPromptOptions] = useState<PromptOption[]>([]);
  const [loadingPrompts, setLoadingPrompts] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const location = useLocation();
  const bootstrappedQuery = useRef(false);
  const prevFocus = useRef(focusArea);

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

  // Active persona based on focus area — fuzzy maps any DB value to best persona
  const persona = useMemo(() => getPersona(focusArea), [focusArea]);
  const PersonaIcon = persona.icon;

  // One engine: the Horus agent. The focus area picks the admin-edited persona
  // server-side; the persona's display name rides along for the agent's voice.
  const {
    messages,
    send: sendMessage,
    stop,
    rateMessage,
    clearChat,
    isStreaming,
  } = useCoachChat(focusArea, persona.name);

  // The default lens arrives with the prompt table. Sending before it lands
  // used to lose the message: the lens switch that followed wiped the thread.
  const ready = !loadingPrompts;

  /** The persona list backing the lens selector — DB prompts, else the built-ins. */
  const lensOptions = useMemo(() => {
    if (promptOptions.length > 1) {
      // DB names are slugs ("career_coach"); show the persona's own name.
      return promptOptions.map((p) => ({ value: p.focus_area, label: getPersona(p.focus_area).name, key: p.id }));
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

  // Only wipe the thread when the user actually changes lens —
  // not on the initial prompt-table load, which used to eat deep-linked questions.
  useEffect(() => {
    if (prevFocus.current !== focusArea) {
      prevFocus.current = focusArea;
      if (messages.length > 0) clearChat();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusArea]);

  // Deep links from other dashboards: /career-coach?q=… or location.state.initialQuestion
  useEffect(() => {
    if (bootstrappedQuery.current || loadingPrompts) return;
    const stateQ = (location.state as { initialQuestion?: string } | null)?.initialQuestion;
    const urlQ = new URLSearchParams(location.search).get("q");
    const q = (stateQ || urlQ || "").trim();
    if (!q) return;
    bootstrappedQuery.current = true;
    sendMessage(q);
  }, [loadingPrompts, location, sendMessage]);

  const resizeComposer = useCallback(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 168)}px`;
  }, []);

  useEffect(() => {
    resizeComposer();
  }, [input, resizeComposer]);

  const handleSubmit = useCallback((e?: React.FormEvent) => {
    e?.preventDefault();
    if (input.trim() && !isStreaming && ready) {
      sendMessage(input.trim());
      setInput("");
    }
  }, [input, isStreaming, ready, sendMessage]);

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
    // Citations: the agent writes [n]; older persona prompts still ask for
    // [Source n]. Both render as the same mark.
    const renderInline = (text: string, lineIndex: number) =>
      text.split(/(\*\*.*?\*\*|\[(?:Source )?\d+\])/g).map((part, partIndex) => {
        if (/^\*\*.*\*\*$/.test(part)) {
          return (
            <strong key={`${lineIndex}-${partIndex}`} className="font-semibold text-[color:var(--con-ink)]">
              {part.slice(2, -2)}
            </strong>
          );
        }
        if (/^\[(?:Source )?\d+\]$/.test(part)) {
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
      // The agent writes markdown: headings, and "-", "*" or "•" bullets.
      const heading = line.match(/^#{1,4}\s+(.*)$/);
      if (heading) {
        return (
          <div key={lineIndex} className="mt-2 min-h-[1.75em] font-semibold text-[color:var(--con-ink)]">
            {renderInline(heading[1].replace(/^\*\*(.*)\*\*$/, "$1"), lineIndex)}
          </div>
        );
      }
      const bullet = line.match(/^\s*[-*•]\s+(.*)$/);
      const isBullet = Boolean(bullet);
      const numbered = line.match(/^\s*(\d+)\.\s(.*)$/);
      const body = bullet ? bullet[1] : numbered ? numbered[2] : line;

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
    <header className="relative z-10 flex shrink-0 flex-wrap items-center gap-x-4 gap-y-3 border-b border-[color:var(--con-line)] px-4 py-3 md:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <motion.div
          key={focusArea}
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 400, damping: 26 }}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-[color:var(--con-accent-line)] bg-[color:var(--con-accent-soft)]"
        >
          <PersonaIcon className="h-4 w-4 text-[color:var(--con-accent)]" />
        </motion.div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="cc-font-display text-[15px] leading-none tracking-tight text-[color:var(--con-ink)]">
              {persona.name}
            </span>
            <span className="con-pip" aria-hidden />
          </div>
          <p className="mt-1 truncate text-[12px] leading-none text-[color:var(--con-ink-3)]">
            {persona.subtitle}
          </p>
        </div>
      </div>

      <div className="ml-auto flex items-center gap-1.5">
        <div className="hidden items-center gap-2 sm:flex">
          <span className="con-mono text-[color:var(--con-ink-3)]">Lens</span>
          <Select value={focusArea} onValueChange={setFocusArea} disabled={isStreaming}>
            <SelectTrigger
              aria-label="Choose specialist"
              className="h-8 w-[158px] gap-1.5 rounded-lg border-[color:var(--con-line)] bg-[color:var(--con-panel)] px-2.5 text-[12px] font-medium text-[color:var(--con-ink)] focus:ring-1 focus:ring-[color:var(--con-accent)] focus:ring-offset-0"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-[color:var(--con-line)] bg-[color:var(--con-panel)] text-[color:var(--con-ink)]">
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

        {messages.length > 0 && (
          <div className="flex items-center gap-0.5 rounded-lg border border-[color:var(--con-line)] bg-[color:var(--con-panel)] p-0.5">
            {(["chat", "insights"] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setViewMode(v)}
                data-active={viewMode === v}
                className="con-btn con-mono px-2.5 py-1.5"
              >
                {v === "chat" ? "Chat" : "Notes"}
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

        {isExpanded ? (
          <button
            type="button"
            onClick={() => setIsExpanded(false)}
            className="con-btn con-btn--accent con-mono px-3 py-1.5"
            title="Exit fullscreen (Esc)"
          >
            <X className="h-3.5 w-3.5" />
            Exit
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
            {
              label: "Avg response",
              value: (() => {
                const times = messages.map((m) => m.responseTime).filter((t): t is number => t != null);
                return times.length ? formatMs(Math.round(times.reduce((a, b) => a + b, 0) / times.length)) : "—";
              })(),
            },
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
          {messages.filter(m => m.role === "assistant" && !m.isLoading && !m.failed && m.content.length > 50).slice(-5).map((m, i) => {
            const firstSentence = m.content.replace(/\*\*/g, "").split(/[.!?]\s/)[0];
            return (
              <div key={i} className="con-panel border-l-2 border-l-[color:var(--con-accent)] p-3">
                <p className="line-clamp-2 text-[13px] leading-relaxed text-[color:var(--con-ink-2)]">{firstSentence}.</p>
                {m.sources && m.sources.length > 0 && (
                  <span className="con-mono mt-2 inline-block text-[color:var(--con-ink-3)]">
                    {m.sources.length} source{m.sources.length === 1 ? "" : "s"} cited
                  </span>
                )}
              </div>
            );
          })}
          {messages.filter(m => m.role === "assistant" && !m.isLoading && !m.failed && m.content.length > 50).length === 0 && (
            <p className="text-[13px] text-[color:var(--con-ink-3)]">No findings yet. Start a conversation to see insights.</p>
          )}
        </div>
      </section>
    </div>
  );

  // ── Welcome ──────────────────────────────────────────────────────────────
  // An editorial opening spread instead of a widget pile: eyebrow rule, one
  // big display line, and the starter questions set like a numbered index.
  const welcome = (
    <div key={focusArea} className="flex min-h-full flex-col justify-center px-5 py-10 md:px-12">
      <div className="mx-auto w-full max-w-[42rem]">
        <div className="con-rise con-mono flex items-center gap-3 text-[color:var(--con-ink-3)]" style={{ animationDelay: "40ms" }}>
          <span>{persona.name}</span>
          <span className="h-px flex-1 bg-[color:var(--con-line)]" aria-hidden />
          <span>54 documents · cited</span>
        </div>

        <h2
          className="con-rise cc-font-display mt-5 max-w-xl text-[clamp(28px,4.6vw,44px)] leading-[0.98] tracking-[-0.035em] text-[color:var(--con-ink)]"
          style={{ animationDelay: "110ms" }}
        >
          {persona.welcomeTitle}
        </h2>
        <p
          className="con-rise mt-4 max-w-lg text-[15px] leading-relaxed text-[color:var(--con-ink-2)]"
          style={{ animationDelay: "170ms" }}
        >
          {persona.welcomeDescription}
        </p>

        <div className="mt-8 grid gap-2 md:grid-cols-2">
          {persona.suggestedQuestions.slice(0, 4).map((q, i) => (
            <button
              key={q.text}
              type="button"
              onClick={() => sendMessage(q.text)}
              disabled={!ready}
              className="con-rise con-prompt group"
              style={{ animationDelay: `${240 + i * 70}ms` }}
            >
              <span className="con-mono con-prompt__idx">{String(i + 1).padStart(2, "0")}</span>
              <span className="con-prompt__text">{q.text}</span>
              <ChevronRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[color:var(--con-ink-3)] transition-all group-hover:translate-x-0.5 group-hover:text-[color:var(--con-accent)]" />
            </button>
          ))}
        </div>

        {persona.suggestedQuestions.length > 4 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {persona.suggestedQuestions.slice(4).map((q, i) => (
              <button
                key={q.text}
                type="button"
                onClick={() => sendMessage(q.text)}
              disabled={!ready}
                className="con-rise rounded-full border border-[color:var(--con-line)] bg-[color:var(--con-panel)] px-3.5 py-2 text-[12.5px] text-[color:var(--con-ink-2)] transition-colors hover:border-[color:var(--con-accent-line)] hover:text-[color:var(--con-ink)]"
                style={{ animationDelay: `${540 + i * 60}ms` }}
              >
                {q.text}
              </button>
            ))}
          </div>
        )}
      </div>
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
                <div className="max-w-[72%] rounded-[1.15rem] rounded-br-md bg-[color:var(--con-raised)] px-4 py-3 text-[15px] leading-relaxed text-[color:var(--con-ink)]">
                  {message.content}
                </div>
              </div>
            ) : (
              <div className="flex gap-3">
                <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-[color:var(--con-accent-line)] bg-[color:var(--con-accent-soft)]">
                  <PersonaIcon className="h-3.5 w-3.5 text-[color:var(--con-accent)]" />
                </span>
                <div className="min-w-0 flex-1">
                  {message.isLoading && !message.thinking?.length && !message.content ? (
                    // Between send and the agent's first step.
                    <div className="py-2" role="status" aria-live="polite">
                      <div className="con-sweep w-40" />
                      <div className="con-mono mt-2.5 flex items-center gap-2 text-[color:var(--con-ink-3)]">
                        <Brain className="h-3 w-3" />
                        Reading your question
                      </div>
                    </div>
                  ) : (
                    <>
                      {message.thinking && message.thinking.length > 0 && (
                        <div
                          {...(message.isLoading && {
                            role: "status",
                            "aria-live": "polite" as const,
                            "aria-label": `${persona.name} is working on an answer`,
                          })}
                        >
                          <ThinkingLedger
                            steps={message.thinking}
                            live={message.isLoading}
                            elapsedMs={message.isLoading ? undefined : message.responseTime}
                          />
                        </div>
                      )}

                      {message.content ? (
                        <div
                          className={cn(
                            "max-w-none text-[14.5px] leading-[1.75] text-[color:var(--con-ink-2)]",
                            message.failed && "text-[color:var(--con-ink-3)]",
                          )}
                        >
                          {formatMessage(message.content)}
                        </div>
                      ) : message.isLoading ? (
                        /* Where the answer will land — shaped like prose, not a spinner. */
                        <div className="con-draft" aria-hidden>
                          <span style={{ width: "92%" }} />
                          <span style={{ width: "86%" }} />
                          <span style={{ width: "58%" }} />
                        </div>
                      ) : null}

                      {!message.isLoading && (
                        <>
                          {/* Answer receipt — what was cited and how long it took, nothing inferred */}
                          <div className="con-mono mt-3 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[color:var(--con-ink-3)]">
                            {message.failed ? (
                              <span className="inline-flex items-center gap-1.5 text-[color:var(--con-rose)]">
                                <AlertCircle className="h-3 w-3" />
                                Not answered
                              </span>
                            ) : message.sources && message.sources.length > 0 ? (
                              <span className="inline-flex items-center gap-1.5">
                                <CheckCircle2 className="h-3 w-3 text-[color:var(--con-sage)]" />
                                {message.sources.length} source{message.sources.length === 1 ? "" : "s"} cited
                              </span>
                            ) : (
                              <span>No sources cited</span>
                            )}
                            {message.responseTime ? <span>· {formatMs(message.responseTime)}</span> : null}
                          </div>

                          {/* Source chips, numbered as the answer cites them */}
                          {message.sources && message.sources.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-1.5">
                              {message.sources.slice(0, 4).map((source) => (
                                <button
                                  key={source.n}
                                  type="button"
                                  onClick={() => setShowSources(showSources === message.id ? null : message.id)}
                                  className="inline-flex items-center gap-1.5 rounded-lg border border-[color:var(--con-line)] bg-[color:var(--con-panel)] px-2.5 py-1.5 text-[11.5px] text-[color:var(--con-ink-2)] transition-colors hover:border-[color:var(--con-accent-line)] hover:text-[color:var(--con-ink)]"
                                >
                                  <span className="cc-font-mono text-[10px] text-[color:var(--con-accent)]">{source.n}</span>
                                  <span className="max-w-[160px] truncate">{source.title}</span>
                                  {source.pageNumber != null && (
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
                                {message.sources.map((source) => (
                                  <div key={source.n} className="con-panel flex items-start gap-3 p-3">
                                    <span className="cc-font-mono mt-0.5 w-4 shrink-0 text-right text-[11px] text-[color:var(--con-accent)]">
                                      {source.n}
                                    </span>
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-center gap-2">
                                        <p className="truncate text-[13px] font-medium text-[color:var(--con-ink)]">{source.title}</p>
                                        {source.pageNumber != null && (
                                          <span className="con-mono shrink-0 rounded bg-[color:var(--con-raised)] px-1.5 py-0.5 text-[color:var(--con-ink-3)]">
                                            p.{source.pageNumber}
                                          </span>
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
                                ))}
                              </motion.div>
                            )}
                          </AnimatePresence>

                          {/* Actions — visible on hover/focus, never fully hidden from keyboards */}
                          {!message.failed && (
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
                          )}
                        </>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        ))}
      </AnimatePresence>

      {(() => {
        const chips = smartFollowUps;
        if (!chips.length || isStreaming) return null;
        return (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="ml-10 pb-3 pt-1"
          >
            <div className="con-mono mb-2 text-[color:var(--con-ink-3)]">Try next</div>
            <div className="flex flex-wrap gap-2">
              {chips.map((q) => (
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
        );
      })()}

      <div ref={messagesEndRef} />
    </div>
  );

  // ── Composer ─────────────────────────────────────────────────────────────
  const composer = (
    <div className="relative z-10 shrink-0 px-4 pb-4 pt-1 md:px-6 md:pb-5">
      <form onSubmit={handleSubmit}>
        <div className="con-composer">
          <textarea
            ref={inputRef}
            value={input}
            rows={1}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            placeholder={isStreaming ? `${persona.name} is working…` : `Ask ${persona.name.toLowerCase()}…`}
            disabled={isStreaming}
            aria-label="Message"
          />
          {isStreaming ? (
            // While the agent works, the send button stops it.
            <button type="button" onClick={stop} className="con-send con-send--armed mb-0.5" title="Stop">
              <Square className="h-3.5 w-3.5 fill-current" />
              <span className="sr-only">Stop</span>
            </button>
          ) : (
            <button
              type="submit"
              disabled={!input.trim() || !ready}
              className={cn("con-send mb-0.5", input.trim() && ready && "con-send--armed")}
              title="Send"
            >
              <Send className="h-4 w-4" />
            </button>
          )}
        </div>
      </form>
      <div className="mt-2.5 flex items-start justify-between gap-4 px-1">
        <p className="line-clamp-2 max-w-lg text-[11.5px] leading-relaxed text-[color:var(--con-ink-3)]">
          Grounded in SA Government documents. Not personal legal, medical, or financial advice.
        </p>
        <span className="con-mono shrink-0 text-[color:var(--con-ink-3)]">⏎ send · ⇧⏎ line</span>
      </div>
    </div>
  );

  // The console shell. Inline it fills whatever height the page hands it —
  // CraftAppLayout's `fill` mode pins the page to one viewport, so no magic
  // offset is needed and the page itself never grows a second scrollbar.
  const shell = (
    <div
      className="cc-console relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-[1.35rem] border border-[color:var(--cc-hair)] shadow-[0_24px_60px_-36px_rgba(20,22,26,0.35)]"
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

  return <div className="flex h-full min-h-[36rem] flex-1 flex-col">{shell}</div>;
}
