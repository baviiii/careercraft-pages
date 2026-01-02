import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, TrendingUp, TrendingDown, Briefcase, MapPin, DollarSign, FileText, Loader2, Sparkles, ExternalLink, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useRAGMetadata } from "@/hooks/useRAGMetadata";
import type { CareerOpportunity } from "@/contexts/IntelligenceContext";

interface CareerDetailModalProps {
  career: CareerOpportunity | null;
  isOpen: boolean;
  onClose: () => void;
}

export function CareerDetailModal({ career, isOpen, onClose }: CareerDetailModalProps) {
  const { chatQuery } = useRAGMetadata();
  const [insights, setInsights] = useState<string>("");
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [sources, setSources] = useState<any[]>([]);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (isOpen && career) {
      setLoadingInsights(true);
      setInsights("");
      setSources([]);

      // Cancel any previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      // Generate AI insights for this specific career
      const query = `Provide detailed insights about ${career.occupation} career in ${career.sector} sector in South Australia. Include: 
- Current demand and growth prospects${career.growth !== undefined ? ` (${career.growth > 0 ? '+' : ''}${career.growth}% growth)` : ''}
- Skills and qualifications needed
- Career pathways and progression
- Salary expectations if available${career.salary ? ` (currently: ${career.salary})` : ''}
- Why this career is important for South Australia
- Future outlook and opportunities
- Job market conditions${career.jobs ? ` (${career.jobs.toLocaleString()} positions mentioned)` : ''}`;

      console.log(`[CareerDetailModal] Querying insights for ${career.occupation}:`, query);
      
      // Use chatQuery directly (same backend as CareerCoach, but isolated state)
      chatQuery(query, null)
        .then((result) => {
          // Check if request was aborted
          if (abortControllerRef.current?.signal.aborted) {
            console.log(`[CareerDetailModal] Request was aborted`);
            return;
          }

          console.log(`[CareerDetailModal] Received response:`, result);
          
          if (result?.response) {
            setInsights(result.response);
          } else {
            console.warn(`[CareerDetailModal] No response in result:`, result);
            setInsights("No insights available. The system could not find relevant information about this career in the knowledge base.");
          }
          
          if (result?.sources && result.sources.length > 0) {
            console.log(`[CareerDetailModal] Found ${result.sources.length} sources`);
            setSources(result.sources.map(s => ({
              id: s.documentId || crypto.randomUUID(),
              title: s.title || 'Unknown Document',
              documentId: s.documentId || '',
              pageNumber: s.pageNumber,
              content: s.snippet || '',
              url: s.url,
              score: s.relevance,
            })));
          } else {
            console.warn(`[CareerDetailModal] No sources in result:`, result);
            setSources([]);
          }
        })
        .catch((error) => {
          // Don't show error if request was aborted
          if (abortControllerRef.current?.signal.aborted) {
            console.log(`[CareerDetailModal] Request was aborted`);
            return;
          }
          
          console.error("[CareerDetailModal] Error fetching insights:", error);
          setInsights(`Unable to generate insights: ${error.message || 'Please try again later.'}`);
        })
        .finally(() => {
          if (!abortControllerRef.current?.signal.aborted) {
            setLoadingInsights(false);
          }
        });
    } else {
      // Cancel request when modal closes
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    }

    // Cleanup on unmount
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [isOpen, career, chatQuery]);

  if (!career) return null;

  const demandColors = {
    high: "bg-emerald-500/20 text-emerald-300 border-emerald-400/40",
    medium: "bg-amber-500/20 text-amber-300 border-amber-400/40",
    low: "bg-slate-500/20 text-slate-300 border-slate-400/40",
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
          >
            <div className="relative w-full max-w-4xl max-h-[90vh] overflow-hidden pointer-events-auto rounded-2xl border border-pink-400/40 bg-gradient-to-br from-pink-500/20 via-purple-500/15 to-blue-500/20 backdrop-blur-xl shadow-xl">
              {/* Decorative elements */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-pink-400/20 to-purple-400/20 rounded-full blur-3xl opacity-50" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-br from-blue-400/20 to-indigo-400/20 rounded-full blur-3xl opacity-50" />

              {/* Content */}
              <div className="relative z-10 flex flex-col h-full max-h-[90vh]">
                {/* Header */}
                <div className="flex items-start justify-between p-6 border-b border-pink-400/30">
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold text-white mb-2">{career.occupation}</h2>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className="bg-purple-500/30 text-purple-100 border-purple-400/50">
                        {career.sector}
                      </Badge>
                      {career.demand && (
                        <Badge className={demandColors[career.demand]}>
                          {career.demand} demand
                        </Badge>
                      )}
                      {career.trending && (
                        <Badge className="bg-pink-500/30 text-pink-100 border-pink-400/50">
                          Trending
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onClose}
                    className="text-pink-200 hover:text-white hover:bg-pink-500/20"
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </div>

                {/* Scrollable content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  {/* Key Metrics */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {career.growth !== undefined && career.growth !== null && (
                      <div className="rounded-xl border border-pink-400/30 bg-gradient-to-br from-pink-500/15 to-purple-500/10 p-4 backdrop-blur-sm">
                        <div className="flex items-center gap-2 mb-2">
                          {career.growth > 0 ? (
                            <TrendingUp className="w-5 h-5 text-emerald-300" />
                          ) : (
                            <TrendingDown className="w-5 h-5 text-red-300" />
                          )}
                          <span className="text-sm text-pink-200">Growth</span>
                        </div>
                        <p className={`text-2xl font-bold ${career.growth > 0 ? 'text-emerald-300' : 'text-red-300'}`}>
                          {career.growth > 0 ? '+' : ''}{career.growth}%
                        </p>
                      </div>
                    )}
                    {career.jobs !== undefined && career.jobs > 0 && (
                      <div className="rounded-xl border border-blue-400/30 bg-gradient-to-br from-blue-500/15 to-indigo-500/10 p-4 backdrop-blur-sm">
                        <div className="flex items-center gap-2 mb-2">
                          <Briefcase className="w-5 h-5 text-blue-300" />
                          <span className="text-sm text-blue-200">Positions</span>
                        </div>
                        <p className="text-2xl font-bold text-blue-100">{career.jobs.toLocaleString()}</p>
                      </div>
                    )}
                    {career.salary && (
                      <div className="rounded-xl border border-emerald-400/30 bg-gradient-to-br from-emerald-500/15 to-green-500/10 p-4 backdrop-blur-sm">
                        <div className="flex items-center gap-2 mb-2">
                          <DollarSign className="w-5 h-5 text-emerald-300" />
                          <span className="text-sm text-emerald-200">Salary</span>
                        </div>
                        <p className="text-2xl font-bold text-emerald-100">{career.salary}</p>
                      </div>
                    )}
                    {career.location && (
                      <div className="rounded-xl border border-purple-400/30 bg-gradient-to-br from-purple-500/15 to-pink-500/10 p-4 backdrop-blur-sm">
                        <div className="flex items-center gap-2 mb-2">
                          <MapPin className="w-5 h-5 text-purple-300" />
                          <span className="text-sm text-purple-200">Location</span>
                        </div>
                        <p className="text-lg font-semibold text-purple-100">{career.location}</p>
                      </div>
                    )}
                  </div>

                  {/* AI Insights */}
                  <div className="rounded-xl border border-pink-400/30 bg-gradient-to-br from-pink-500/10 to-purple-500/5 p-6 backdrop-blur-sm">
                    <div className="flex items-center gap-2 mb-4">
                      <Sparkles className="w-5 h-5 text-pink-300" />
                      <h3 className="text-lg font-semibold text-white">AI Intelligence Insights</h3>
                    </div>
                    {loadingInsights ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-6 h-6 text-pink-300 animate-spin" />
                        <span className="ml-3 text-pink-200">Analyzing career data...</span>
                      </div>
                    ) : insights ? (
                      <div className="prose prose-invert max-w-none">
                        <p className="text-pink-100 whitespace-pre-wrap leading-relaxed">{insights}</p>
                      </div>
                    ) : (
                      <div className="text-center py-4">
                        <p className="text-pink-200/70 mb-2">Unable to generate AI insights at this time.</p>
                        <p className="text-xs text-pink-300/60">
                          The system could not find relevant information about <strong>{career.occupation}</strong> in the knowledge base.
                          {career.sources && career.sources.length > 0 && (
                            <span className="block mt-2">Check the "Evidence & Sources" section below for the original data sources.</span>
                          )}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Sources - Always show if available from career or search */}
                  {(sources.length > 0 || (career.sources && career.sources.length > 0)) && (
                    <div className="rounded-xl border border-blue-400/30 bg-gradient-to-br from-blue-500/10 to-indigo-500/5 p-6 backdrop-blur-sm">
                      <div className="flex items-center gap-2 mb-4">
                        <FileText className="w-5 h-5 text-blue-300" />
                        <h3 className="text-lg font-semibold text-white">Evidence & Sources</h3>
                        <Badge className="ml-auto bg-blue-500/30 text-blue-100 border-blue-400/50">
                          {(sources.length || career.sources?.length || 0)} source{(sources.length || career.sources?.length || 0) !== 1 ? 's' : ''}
                        </Badge>
                      </div>
                      <div className="space-y-3">
                        {/* Show sources from semantic search first (AI insights sources) */}
                        {sources.length > 0 && sources.map((source, index) => (
                          <div
                            key={`search-${index}`}
                            className="rounded-lg border border-blue-400/20 bg-blue-500/5 p-4 hover:bg-blue-500/10 transition-colors"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <CheckCircle2 className="w-4 h-4 text-blue-300 flex-shrink-0 mt-0.5" />
                                  <h4 className="font-semibold text-white text-sm">
                                    {source.title || source.documentId || 'Source'}
                                  </h4>
                                  <Badge className="ml-2 text-xs bg-pink-500/30 text-pink-100 border-pink-400/50">
                                    AI Insights Source
                                  </Badge>
                                </div>
                                {source.pageNumber && (
                                  <p className="text-xs text-blue-200 ml-6">Page {source.pageNumber}</p>
                                )}
                                {source.content && (
                                  <p className="text-xs text-blue-300/80 mt-2 ml-6 line-clamp-3">
                                    {source.content.substring(0, 300)}
                                    {source.content.length > 300 ? '...' : ''}
                                  </p>
                                )}
                                {source.score && (
                                  <p className="text-xs text-blue-400/70 ml-6 mt-1">
                                    Relevance: {Math.round(source.score)}%
                                  </p>
                                )}
                              </div>
                              {source.url && (
                                <a
                                  href={source.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-300 hover:text-blue-200 transition-colors flex-shrink-0"
                                >
                                  <ExternalLink className="w-4 h-4" />
                                </a>
                              )}
                            </div>
                          </div>
                        ))}
                        
                        {/* Show sources from career data extraction (original data sources) */}
                        {career.sources && career.sources.length > 0 && career.sources.map((source, index) => (
                          <div
                            key={`career-${index}`}
                            className="rounded-lg border border-emerald-400/20 bg-emerald-500/5 p-4 hover:bg-emerald-500/10 transition-colors"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <CheckCircle2 className="w-4 h-4 text-emerald-300 flex-shrink-0 mt-0.5" />
                                  <h4 className="font-semibold text-white text-sm">
                                    {source.title || source.documentId || 'Source'}
                                  </h4>
                                  <Badge className="ml-2 text-xs bg-emerald-500/30 text-emerald-100 border-emerald-400/50">
                                    Data Source
                                  </Badge>
                                </div>
                                {source.pageNumber && (
                                  <p className="text-xs text-emerald-200 ml-6">Page {source.pageNumber}</p>
                                )}
                                {source.content && (
                                  <p className="text-xs text-emerald-300/80 mt-2 ml-6 line-clamp-3">
                                    {source.content.substring(0, 300)}
                                    {source.content.length > 300 ? '...' : ''}
                                  </p>
                                )}
                                <p className="text-xs text-emerald-400/70 ml-6 mt-1">
                                  Where growth/jobs data was extracted
                                </p>
                              </div>
                              {source.url && (
                                <a
                                  href={source.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-emerald-300 hover:text-emerald-200 transition-colors flex-shrink-0"
                                >
                                  <ExternalLink className="w-4 h-4" />
                                </a>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Show message if no sources at all */}
                  {sources.length === 0 && (!career.sources || career.sources.length === 0) && !loadingInsights && (
                    <div className="rounded-xl border border-slate-400/30 bg-slate-500/5 p-6 backdrop-blur-sm">
                      <div className="flex items-start gap-3 text-slate-400">
                        <FileText className="w-5 h-5 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-sm mb-1">No source documents available for this career.</p>
                          <p className="text-xs text-slate-500">
                            This career data may have been extracted from general document analysis. 
                            Try using the AI Career Coach for more detailed information.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-pink-400/30">
                  <div className="flex items-center justify-end gap-3">
                    <Button
                      variant="outline"
                      onClick={onClose}
                      className="border-pink-400/50 text-pink-200 hover:bg-pink-500/20"
                    >
                      Close
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

