import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { FileText, Clock, ExternalLink, BookOpen, ArrowRight, Loader2, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { useRAGMetadata, DocumentMetadata } from "@/hooks/useRAGMetadata";
import { cn } from "@/lib/utils";

interface NewsItem {
  id: string;
  title: string;
  category: string;
  sector: string;
  url?: string;
  type: string;
  tags: string[];
}

const categoryColors: Record<string, string> = {
  "budget": "bg-amber-500/10 text-amber-600 border-amber-500/20",
  "strategy": "bg-blue-500/10 text-blue-600 border-blue-500/20",
  "workforce": "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  "career-guidance": "bg-purple-500/10 text-purple-600 border-purple-500/20",
  "education": "bg-indigo-500/10 text-indigo-600 border-indigo-500/20",
  "policy": "bg-rose-500/10 text-rose-600 border-rose-500/20",
  "report": "bg-cyan-500/10 text-cyan-600 border-cyan-500/20",
  "government-document": "bg-slate-500/10 text-slate-600 border-slate-500/20",
};

export function BreakingNews() {
  const { getDocuments, loading, error } = useRAGMetadata();
  const [news, setNews] = useState<NewsItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setFetchError(null);
      try {
        const result = await getDocuments({}, 8);
        if (result && result.documents.length > 0) {
          const items: NewsItem[] = result.documents.map((doc) => ({
            id: doc.documentId,
            title: doc.title || "Untitled Document",
            category: doc.category || "general",
            sector: doc.sector || "general",
            url: doc.url,
            type: doc.documentType || "pdf",
            tags: doc.tags || [],
          }));
          setNews(items);
        } else {
          setFetchError("No documents found. Please ensure documents are indexed in Azure Search.");
        }
      } catch (error) {
        console.error("Failed to fetch documents:", error);
        setFetchError(error instanceof Error ? error.message : "Failed to load documents");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const formatCategoryName = (category: string) => {
    return category
      .split("-")
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  if (isLoading || loading) {
    return (
      <div className="card-intelligence p-6">
        <div className="flex items-center justify-center h-32">
          <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
          <span className="ml-2 text-sm text-muted-foreground">Loading resources...</span>
        </div>
      </div>
    );
  }

  if (fetchError || error) {
    return (
      <div className="card-intelligence p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="font-display text-lg font-bold text-foreground">Document Library</h2>
            <p className="text-sm text-muted-foreground">Government documents & resources</p>
          </div>
        </div>
        <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
          <p className="text-sm text-destructive font-medium">Unable to load data</p>
          <p className="text-xs text-muted-foreground mt-1">
            {fetchError || error || "Please check your Azure Search configuration."}
          </p>
        </div>
      </div>
    );
  }

  if (news.length === 0) {
    return (
      <div className="card-intelligence p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="font-display text-lg font-bold text-foreground">Document Library</h2>
            <p className="text-sm text-muted-foreground">Government documents & resources</p>
          </div>
        </div>
        <div className="p-4 rounded-lg bg-muted/50 border border-border/50">
          <p className="text-sm text-muted-foreground text-center">No resources available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card-intelligence p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="font-display text-lg font-bold text-foreground">Document Library</h2>
            <p className="text-sm text-muted-foreground">
              {news.length} indexed government resources
            </p>
          </div>
        </div>
        <Link to="/career-coach">
          <Button variant="outline" size="sm" className="gap-1">
            Ask AI <ArrowRight className="w-4 h-4" />
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {news.map((item, index) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className={cn(
              "group p-4 rounded-xl border border-border/50 hover:border-border",
              "bg-card hover:shadow-md transition-all cursor-pointer"
            )}
            onClick={() => item.url && window.open(item.url, "_blank")}
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge 
                  variant="outline" 
                  className={cn(
                    "text-[10px] font-semibold border",
                    categoryColors[item.category] || "bg-muted text-muted-foreground"
                  )}
                >
                  {formatCategoryName(item.category)}
                </Badge>
                <Badge variant="outline" className="text-[10px]">
                  {item.type.toUpperCase()}
                </Badge>
              </div>
              {item.url && (
                <ExternalLink className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
              )}
            </div>
            
            <h3 className="font-medium text-sm text-foreground line-clamp-2 group-hover:text-primary transition-colors mb-2">
              {item.title}
            </h3>
            
            {item.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {item.tags.slice(0, 3).map((tag) => (
                  <span 
                    key={tag} 
                    className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground"
                  >
                    {tag}
                  </span>
                ))}
                {item.tags.length > 3 && (
                  <span className="text-[10px] px-1.5 py-0.5 text-muted-foreground">
                    +{item.tags.length - 3}
                  </span>
                )}
              </div>
            )}
          </motion.div>
        ))}
      </div>

      <div className="mt-4 flex justify-center">
        <Link to="/career-coach">
          <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground">
            <FileText className="w-4 h-4" />
            Explore All Documents with AI
          </Button>
        </Link>
      </div>
    </div>
  );
}
