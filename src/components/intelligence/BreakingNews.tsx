import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Newspaper, Clock, ExternalLink, Bookmark, Share2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { useRAGMetadata } from "@/hooks/useRAGMetadata";

interface NewsItem {
  id: string;
  title: string;
  summary: string;
  source: string;
  time: string;
  category: string;
  isBreaking?: boolean;
  url?: string;
}

export function BreakingNews() {
  const { getDocuments, loading } = useRAGMetadata();
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const result = await getDocuments({ documentType: "pdf" }, 5);
        if (result && result.documents.length > 0) {
          const items: NewsItem[] = result.documents.slice(0, 4).map((doc, index) => ({
            id: doc.documentId,
            title: doc.title || "Untitled Document",
            summary: `${doc.category || "Government"} document from ${doc.sector || "various"} sector`,
            source: doc.sector ? `${doc.sector.charAt(0).toUpperCase() + doc.sector.slice(1)} Sector` : "SA Government",
            time: doc.lastModified ? new Date(doc.lastModified).toLocaleDateString() : "Recently",
            category: doc.category || "Document",
            isBreaking: index === 0,
            url: doc.url,
          }));
          setNewsItems(items);
        }
      } catch (error) {
        console.error("Failed to fetch news:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  if (isLoading || loading) {
    return (
      <div className="card-intelligence p-6">
        <div className="flex items-center justify-center h-32">
          <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
        </div>
      </div>
    );
  }
  return (
    <div className="card-intelligence p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-gradient-teal flex items-center justify-center shadow-lg shadow-accent-teal/20">
          <Newspaper className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1">
          <h2 className="font-display text-lg font-bold text-foreground">Career Intelligence Feed</h2>
          <p className="text-sm text-muted-foreground">AI-summarised, policy-backed news</p>
        </div>
        <Link to="/job-news">
          <Button variant="outline" size="sm">
            View all news
          </Button>
        </Link>
      </div>

      <div className="space-y-4">
        {newsItems.map((item, index) => (
          <motion.article
            key={item.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="group cursor-pointer"
          >
            <div className="p-4 rounded-xl border border-border/50 hover:border-border hover:bg-muted/30 transition-premium">
              <div className="flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    {item.isBreaking && (
                      <Badge variant="destructive" className="text-[10px] uppercase">
                        Breaking
                      </Badge>
                    )}
                    <Badge variant="secondary" className="text-[10px]">
                      {item.category}
                    </Badge>
                  </div>
                  <h3 className="font-semibold text-foreground mb-2 group-hover:text-primary transition-colors line-clamp-2">
                    {item.title}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                    {item.summary}
                  </p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="font-medium">{item.source}</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {item.time}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {item.url && (
                    <a href={item.url} target="_blank" rel="noopener noreferrer">
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    </a>
                  )}
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Share2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </motion.article>
        ))}
      </div>
    </div>
  );
}
