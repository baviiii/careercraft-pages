import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useEnterpriseRAG } from "@/hooks/useEnterpriseRAG";
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
  Bookmark,
  Download,
  Share2,
  History,
  Settings,
  TrendingUp,
  BarChart3,
  Clock,
  Star,
  AlertCircle,
  CheckCircle2,
  X,
  Maximize2,
  Minimize2,
  Search,
  Filter,
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

export default function CareerCoach() {
  const [input, setInput] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showSources, setShowSources] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<"chat" | "insights">("chat");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // FERRARI ENGINE: Enterprise RAG with all features
  const {
    messages,
    sendMessage,
    rateMessage,
    clearChat,
    context,
    analytics,
    isStreaming,
  } = useEnterpriseRAG();

  const suggestedQuestions: SuggestedQuestion[] = [
    { 
      text: "What healthcare jobs are available in South Australia?", 
      category: "Jobs",
      icon: TrendingUp,
      popular: true,
    },
    { 
      text: "How do I write selection criteria for government applications?", 
      category: "Application",
      icon: FileText,
      popular: true,
    },
    { 
      text: "What training programs are available for skilled migrants?", 
      category: "Training",
      icon: Zap,
    },
    { 
      text: "What's the job market outlook for IT professionals in SA?", 
      category: "Trends",
      icon: BarChart3,
    },
    { 
      text: "How can I prepare for a public sector interview?", 
      category: "Interview",
      icon: CheckCircle2,
      popular: true,
    },
    { 
      text: "What are the budget allocations for education in 2025?", 
      category: "Budget",
      icon: TrendingUp,
    },
  ];

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
      {/* Enhanced Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-slate-900 flex items-center justify-center">
              <Zap className="w-3 h-3 text-white" />
            </div>
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Career Coach AI</h2>
            <div className="flex items-center gap-2">
              <p className="text-sm text-slate-400">Azure-powered • 20+ sources • Real-time streaming</p>
              {isStreaming && (
                <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 text-[10px] animate-pulse">
                  ⚡ STREAMING
                </Badge>
              )}
              {analytics.cacheHitRate > 0 && (
                <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px]">
                  {Math.round(analytics.cacheHitRate * 100)}% cached
                </Badge>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
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

      {/* Stats Bar */}
      {messages.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <Card className="p-3 bg-slate-900/50 border-slate-800/50">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-blue-400" />
              <div>
                <p className="text-lg font-bold text-white">{conversationStats.totalMessages}</p>
                <p className="text-[10px] text-slate-400">Messages</p>
              </div>
            </div>
          </Card>
          <Card className="p-3 bg-slate-900/50 border-slate-800/50">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-purple-400" />
              <div>
                <p className="text-lg font-bold text-white">{conversationStats.totalTokens.toLocaleString()}</p>
                <p className="text-[10px] text-slate-400">Tokens</p>
              </div>
            </div>
          </Card>
          <Card className="p-3 bg-slate-900/50 border-slate-800/50">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-teal-400" />
              <div>
                <p className="text-lg font-bold text-white">{Math.round(conversationStats.avgResponseTime)}ms</p>
                <p className="text-[10px] text-slate-400">Avg Response</p>
              </div>
            </div>
          </Card>
          <Card className="p-3 bg-slate-900/50 border-slate-800/50">
            <div className="flex items-center gap-2">
              <ThumbsUp className="w-4 h-4 text-emerald-400" />
              <div>
                <p className="text-lg font-bold text-white">{conversationStats.helpfulCount}</p>
                <p className="text-[10px] text-slate-400">Helpful</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Chat Container */}
      <Card className="flex-1 flex flex-col bg-slate-900/50 border-slate-800/50 overflow-hidden min-h-0">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="flex-1 flex flex-col min-h-0">
          <TabsList className="mx-4 mt-4 bg-slate-800/50 border-slate-700/50 shrink-0">
            <TabsTrigger value="chat" className="flex-1">Chat</TabsTrigger>
            <TabsTrigger value="insights" className="flex-1">Insights</TabsTrigger>
          </TabsList>

          <TabsContent value="chat" className="flex-1 flex flex-col mt-0 overflow-hidden min-h-0">
            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto px-4 py-2 min-h-0">
              {messages.length === 0 ? (
                /* Enhanced Welcome State */
                <div className="h-full flex flex-col items-center justify-center text-center px-4">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 200, damping: 15 }}
                    className="w-20 h-20 rounded-3xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center mb-6"
                  >
                    <MessageSquare className="w-10 h-10 text-purple-400" />
                  </motion.div>
                  <h3 className="text-2xl font-bold text-white mb-2">Hi! I'm your Career Coach</h3>
                  <p className="text-slate-400 max-w-md mb-8">
                    I have access to 54+ SA Government documents, job listings, and career resources. 
                    Ask me anything about careers in South Australia!
                  </p>
                  
                  {/* Enhanced Suggested Questions */}
                  <div className="w-full max-w-3xl">
                    <p className="text-sm text-slate-500 mb-4 flex items-center justify-center gap-2">
                      <Lightbulb className="w-4 h-4" />
                      Try asking:
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {suggestedQuestions.map((q, i) => (
                        <motion.button
                          key={i}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.1 }}
                          onClick={() => sendMessage(q.text)}
                          className="group flex items-center gap-3 p-4 rounded-xl bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 hover:border-purple-500/30 text-left transition-all"
                        >
                          {q.icon && (
                            <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center shrink-0">
                              <q.icon className="w-5 h-5 text-purple-400" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge className="bg-purple-500/20 text-purple-400 border-0 text-[10px]">
                                {q.category}
                              </Badge>
                              {q.popular && (
                                <Badge className="bg-yellow-500/20 text-yellow-400 border-0 text-[10px]">
                                  <Star className="w-3 h-3 mr-1 fill-yellow-400" />
                                  Popular
                                </Badge>
                              )}
                            </div>
                            <span className="text-sm text-slate-300 group-hover:text-white transition-colors line-clamp-2">
                              {q.text}
                            </span>
                          </div>
                        </motion.button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                /* Enhanced Messages */
                <div className="space-y-4 pb-4">
                  <AnimatePresence mode="popLayout">
                    {messages.map((message) => (
                      <motion.div
                        key={message.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}
                      >
                        {message.role === "assistant" && (
                          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shrink-0">
                            <Bot className="w-4 h-4 text-white" />
                          </div>
                        )}
                        
                        <div className={`max-w-[80%] ${message.role === "user" ? "order-first" : ""}`}>
                          <div
                            className={cn(
                              "rounded-2xl p-4",
                              message.role === "user"
                                ? "bg-gradient-to-r from-blue-500 to-teal-500 text-white"
                                : "bg-slate-800/80 text-slate-200"
                            )}
                          >
                            {message.isLoading ? (
                              <div className="flex items-center gap-2">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span className="text-slate-400">Analyzing documents...</span>
                              </div>
                            ) : (
                              <div
                                className="prose prose-invert prose-sm max-w-none"
                                dangerouslySetInnerHTML={{ __html: formatMessage(message.content) }}
                              />
                            )}
                          </div>
                          
                          {/* Enhanced Sources */}
                          {message.sources && message.sources.length > 0 && (
                            <div className="mt-2">
                              <button
                                onClick={() => setShowSources(showSources === message.id ? null : message.id)}
                                className="flex items-center gap-2 text-xs text-slate-500 hover:text-slate-300 transition-colors"
                              >
                                <FileText className="w-3 h-3" />
                                {message.sources.length} source{message.sources.length > 1 ? "s" : ""}
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
                                    className="mt-2 space-y-2"
                                  >
                                    {message.sources.map((source, idx) => (
                                      <div
                                        key={idx}
                                        className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/50"
                                      >
                                        <div className="flex items-start gap-2">
                                          <Badge className="bg-blue-500/20 text-blue-400 border-0 shrink-0">
                                            Source {idx + 1}
                                            {source.relevance && (
                                              <span className="ml-1 text-[10px]">({source.relevance}%)</span>
                                            )}
                                          </Badge>
                                          <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-white truncate">{source.title}</p>
                                            <p className="text-xs text-slate-400 mt-1">{source.documentId}</p>
                                            {source.pageNumber && (
                                              <p className="text-xs text-slate-500">Page {source.pageNumber}</p>
                                            )}
                                            {source.snippet && (
                                              <p className="text-xs text-slate-500 mt-1 line-clamp-2">{source.snippet}</p>
                                            )}
                                          </div>
                                          {source.url && (
                                            <a
                                              href={source.url}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="text-blue-400 hover:text-blue-300 shrink-0"
                                            >
                                              <ExternalLink className="w-4 h-4" />
                                            </a>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          )}

                          {/* FERRARI FEATURES: Confidence, Charts, Insights, Follow-ups */}
                          {message.role === "assistant" && !message.isLoading && (
                            <>
                              {/* Confidence Indicator */}
                              {message.confidence && (
                                <div className="mt-3">
                                  <ConfidenceIndicator
                                    confidence={message.confidence}
                                    avgRelevance={
                                      message.sources
                                        ? message.sources.reduce((sum, s) => sum + (s.relevance || 0), 0) / message.sources.length
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
                          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-teal-500 flex items-center justify-center shrink-0">
                            <User className="w-4 h-4 text-white" />
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Enhanced Input Area */}
            <div className="p-4 border-t border-slate-800/50">
              <form onSubmit={handleSubmit} className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask about careers, jobs, training, budgets..."
                    disabled={isStreaming}
                    className="pr-12 py-6 bg-slate-800/50 border-slate-700/50 focus:border-purple-500/50 rounded-xl text-white placeholder:text-slate-500"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Sparkles className="w-5 h-5 text-purple-400/50" />
                  </div>
                </div>
                <Button
                  type="submit"
                  disabled={!input.trim() || isStreaming}
                  className="px-6 py-6 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-xl shadow-lg shadow-purple-500/25 disabled:opacity-50"
                >
                  {isStreaming ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </Button>
              </form>
              
              <div className="flex items-center justify-between mt-2">
                <p className="text-xs text-slate-500">
                  Responses are based on SA Government documents. Always verify important information.
                </p>
                {messages.length > 0 && (
                  <Badge variant="secondary" className="bg-slate-800 text-slate-300 text-[10px]">
                    Session active
                  </Badge>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="insights" className="flex-1 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="space-y-4 p-4">
              <h3 className="text-lg font-semibold text-white mb-4">Conversation Insights</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="p-4 bg-slate-800/50 border-slate-700/50">
                  <div className="flex items-center gap-3 mb-3">
                    <BarChart3 className="w-5 h-5 text-blue-400" />
                    <h4 className="font-semibold text-white">Usage Statistics</h4>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Total Messages:</span>
                      <span className="text-white font-semibold">{conversationStats.totalMessages}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Total Tokens:</span>
                      <span className="text-white font-semibold">{conversationStats.totalTokens.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Avg Response Time:</span>
                      <span className="text-white font-semibold">{Math.round(conversationStats.avgResponseTime)}ms</span>
                    </div>
                  </div>
                </Card>
                
                <Card className="p-4 bg-slate-800/50 border-slate-700/50">
                  <div className="flex items-center gap-3 mb-3">
                    <Star className="w-5 h-5 text-yellow-400" />
                    <h4 className="font-semibold text-white">Quality Metrics</h4>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Helpful Responses:</span>
                      <span className="text-emerald-400 font-semibold">{conversationStats.helpfulCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Response Rate:</span>
                      <span className="text-white font-semibold">
                        {conversationStats.totalMessages > 0 
                          ? Math.round((conversationStats.helpfulCount / conversationStats.totalMessages) * 100)
                          : 0}%
                      </span>
                    </div>
                  </div>
                </Card>
              </div>
              
              {messages.length === 0 && (
                <Card className="p-8 text-center bg-slate-800/30 border-slate-700/50">
                  <p className="text-slate-400">Start a conversation to see insights</p>
                </Card>
              )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}
