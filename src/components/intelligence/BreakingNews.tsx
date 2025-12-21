import { motion } from "framer-motion";
import { Newspaper, Clock, ExternalLink, Bookmark, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";

interface NewsItem {
  id: string;
  title: string;
  summary: string;
  source: string;
  time: string;
  category: string;
  isBreaking?: boolean;
}

const newsItems: NewsItem[] = [
  {
    id: "1",
    title: "SA Government announces $500M TAFE investment for critical skills",
    summary: "Major funding boost targets healthcare, defence and renewable energy training pathways across regional SA.",
    source: "Premier's Office",
    time: "2 hours ago",
    category: "Policy",
    isBreaking: true,
  },
  {
    id: "2",
    title: "Healthcare sector to add 8,000 jobs by 2027",
    summary: "New hospitals and aged care facilities driving unprecedented workforce demand in South Australia.",
    source: "Jobs & Skills SA",
    time: "5 hours ago",
    category: "Employment",
  },
  {
    id: "3",
    title: "Tech industry salary growth outpaces national average",
    summary: "Adelaide's tech workers seeing 12% year-on-year salary increases as demand for digital skills surges.",
    source: "Industry Report",
    time: "8 hours ago",
    category: "Salary",
  },
  {
    id: "4",
    title: "Defence contracts create 3,000 new apprenticeship opportunities",
    summary: "Naval shipbuilding program opening doors for young South Australians seeking skilled trades careers.",
    source: "Defence Industry SA",
    time: "1 day ago",
    category: "Training",
  },
];

export function BreakingNews() {
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
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Bookmark className="w-4 h-4" />
                  </Button>
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
