import { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
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
} from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
  timestamp: Date;
  isLoading?: boolean;
}

interface Source {
  title: string;
  documentId: string;
  pageNumber?: number;
  url?: string;
  snippet: string;
}

interface SuggestedQuestion {
  text: string;
  category: string;
}

export default function CareerCoach() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showSources, setShowSources] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const suggestedQuestions: SuggestedQuestion[] = [
    { text: "What healthcare jobs are available in South Australia?", category: "Jobs" },
    { text: "How do I write selection criteria for government applications?", category: "Application" },
    { text: "What training programs are available for skilled migrants?", category: "Training" },
    { text: "What's the job market outlook for IT professionals in SA?", category: "Trends" },
    { text: "How can I prepare for a public sector interview?", category: "Interview" },
    { text: "What are the budget allocations for education in 2025?", category: "Budget" },
  ];

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: content.trim(),
      timestamp: new Date(),
    };

    const loadingMessage: Message = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: "",
      timestamp: new Date(),
      isLoading: true,
    };

    setMessages((prev) => [...prev, userMessage, loadingMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("rag-chat", {
        body: {
          message: content.trim(),
          sessionId,
        },
      });

      if (error) throw error;

      // Remove loading message and add real response
      setMessages((prev) => {
        const filtered = prev.filter((m) => !m.isLoading);
        return [
          ...filtered,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content: data.response,
            sources: data.sources,
            timestamp: new Date(),
          },
        ];
      });

      if (data.sessionId) {
        setSessionId(data.sessionId);
      }
    } catch (error) {
      console.error("Chat error:", error);
      
      // Remove loading and add error message
      setMessages((prev) => {
        const filtered = prev.filter((m) => !m.isLoading);
        return [
          ...filtered,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content: "I'm sorry, I encountered an error processing your request. Please try again.",
            timestamp: new Date(),
          },
        ];
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const clearChat = () => {
    setMessages([]);
    setSessionId(null);
  };

  const formatMessage = (content: string) => {
    // Convert markdown-style formatting
    return content
      .split("\n")
      .map((line, i) => {
        // Bold text
        line = line.replace(/\*\*(.*?)\*\*/g, '<strong class="text-white">$1</strong>');
        // Source citations
        line = line.replace(/\[Source (\d+)\]/g, '<span class="text-blue-400 font-medium">[Source $1]</span>');
        // Bullet points
        if (line.startsWith("- ") || line.startsWith("• ")) {
          return `<li class="ml-4">${line.substring(2)}</li>`;
        }
        return line;
      })
      .join("<br />");
  };

  return (
    <div className="flex flex-col h-[calc(100vh-200px)] min-h-[600px]">
      {/* Header */}
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
            <p className="text-sm text-slate-400">Powered by SA Government resources</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {messages.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearChat}
              className="text-slate-400 hover:text-white"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              New Chat
            </Button>
          )}
        </div>
      </div>

      {/* Chat Container */}
      <Card className="flex-1 flex flex-col bg-slate-900/50 border-slate-800/50 overflow-hidden">
        {/* Messages Area */}
        <ScrollArea className="flex-1 p-4">
          {messages.length === 0 ? (
            /* Welcome State */
            <div className="h-full flex flex-col items-center justify-center text-center px-4">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center mb-6">
                <MessageSquare className="w-10 h-10 text-purple-400" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">Hi! I'm your Career Coach</h3>
              <p className="text-slate-400 max-w-md mb-8">
                I have access to 54+ SA Government documents, job listings, and career resources. 
                Ask me anything about careers in South Australia!
              </p>
              
              {/* Suggested Questions */}
              <div className="w-full max-w-2xl">
                <p className="text-sm text-slate-500 mb-3 flex items-center justify-center gap-2">
                  <Lightbulb className="w-4 h-4" />
                  Try asking:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {suggestedQuestions.map((q, i) => (
                    <button
                      key={i}
                      onClick={() => sendMessage(q.text)}
                      className="group flex items-center gap-3 p-3 rounded-xl bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 hover:border-purple-500/30 text-left transition-all"
                    >
                      <Badge className="bg-purple-500/20 text-purple-400 border-0 shrink-0">
                        {q.category}
                      </Badge>
                      <span className="text-sm text-slate-300 group-hover:text-white transition-colors line-clamp-1">
                        {q.text}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* Messages */
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  {message.role === "assistant" && (
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shrink-0">
                      <Bot className="w-4 h-4 text-white" />
                    </div>
                  )}
                  
                  <div className={`max-w-[80%] ${message.role === "user" ? "order-first" : ""}`}>
                    <div
                      className={`rounded-2xl p-4 ${
                        message.role === "user"
                          ? "bg-gradient-to-r from-blue-500 to-teal-500 text-white"
                          : "bg-slate-800/80 text-slate-200"
                      }`}
                    >
                      {message.isLoading ? (
                        <div className="flex items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span className="text-slate-400">Thinking...</span>
                        </div>
                      ) : (
                        <div
                          className="prose prose-invert prose-sm max-w-none"
                          dangerouslySetInnerHTML={{ __html: formatMessage(message.content) }}
                        />
                      )}
                    </div>
                    
                    {/* Sources */}
                    {message.sources && message.sources.length > 0 && (
                      <div className="mt-2">
                        <button
                          onClick={() => setShowSources(showSources === message.id ? null : message.id)}
                          className="flex items-center gap-2 text-xs text-slate-500 hover:text-slate-300 transition-colors"
                        >
                          <FileText className="w-3 h-3" />
                          {message.sources.length} source{message.sources.length > 1 ? "s" : ""}
                          <ChevronDown className={`w-3 h-3 transition-transform ${showSources === message.id ? "rotate-180" : ""}`} />
                        </button>
                        
                        {showSources === message.id && (
                          <div className="mt-2 space-y-2">
                            {message.sources.map((source, idx) => (
                              <div
                                key={idx}
                                className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/50"
                              >
                                <div className="flex items-start gap-2">
                                  <Badge className="bg-blue-500/20 text-blue-400 border-0 shrink-0">
                                    Source {idx + 1}
                                  </Badge>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-white truncate">{source.title}</p>
                                    <p className="text-xs text-slate-400 mt-1">{source.documentId}</p>
                                    {source.pageNumber && (
                                      <p className="text-xs text-slate-500">Page {source.pageNumber}</p>
                                    )}
                                  </div>
                                  {source.url && (
                                    <a
                                      href={source.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-blue-400 hover:text-blue-300"
                                    >
                                      <ExternalLink className="w-4 h-4" />
                                    </a>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Actions */}
                    {message.role === "assistant" && !message.isLoading && (
                      <div className="flex items-center gap-2 mt-2">
                        <button
                          onClick={() => copyToClipboard(message.content, message.id)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-slate-800 transition-all"
                          title="Copy response"
                        >
                          {copiedId === message.id ? (
                            <Check className="w-3.5 h-3.5 text-green-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <button className="p-1.5 rounded-lg text-slate-500 hover:text-green-400 hover:bg-slate-800 transition-all" title="Helpful">
                          <ThumbsUp className="w-3.5 h-3.5" />
                        </button>
                        <button className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-slate-800 transition-all" title="Not helpful">
                          <ThumbsDown className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                  
                  {message.role === "user" && (
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-teal-500 flex items-center justify-center shrink-0">
                      <User className="w-4 h-4 text-white" />
                    </div>
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </ScrollArea>

        {/* Input Area */}
        <div className="p-4 border-t border-slate-800/50">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <Input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about SA careers, jobs, training..."
                disabled={isLoading}
                className="pr-12 py-6 bg-slate-800/50 border-slate-700/50 focus:border-purple-500/50 rounded-xl"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <Sparkles className="w-5 h-5 text-purple-400/50" />
              </div>
            </div>
            <Button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="px-6 py-6 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-xl shadow-lg shadow-purple-500/25"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </Button>
          </form>
          
          <p className="text-xs text-slate-500 mt-2 text-center">
            Responses are based on SA Government documents. Always verify important information.
          </p>
        </div>
      </Card>
    </div>
  );
}

