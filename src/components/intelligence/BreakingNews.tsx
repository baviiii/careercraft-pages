/**
 * BreakingNews - Latest intelligence updates
 * Uses IntelligenceContext for data
 */

import { useMemo } from "react";
import { motion } from "framer-motion";
import { 
  Newspaper, 
  TrendingUp, 
  Clock, 
  ExternalLink,
  AlertCircle,
  Sparkles,
  Bell,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useIntelligence } from "@/contexts/IntelligenceContext";

interface NewsItem {
  id: string;
  title: string;
  summary: string;
  category: string;
  timestamp: string;
  type: "insight" | "update" | "alert" | "trend";
  source?: string;
}

export function BreakingNews() {
  const { 
    crossTabInsights, 
    fundingAllocations, 
    careerOpportunities,
    skillsDemand,
    globalLoading,
    metrics,
  } = useIntelligence();

  // Generate news items from context data
  const newsItems = useMemo<NewsItem[]>(() => {
    const items: NewsItem[] = [];
    const now = new Date();

    // Cross-tab insights as news
    crossTabInsights.slice(0, 2).forEach((insight, idx) => {
      items.push({
        id: `insight-${idx}`,
        title: insight.title,
        summary: insight.description,
        category: insight.type.replace("-", " → "),
        timestamp: "Just now",
        type: "insight",
        source: "AI Analysis",
      });
    });

    // Top funding changes as news
    const topFunding = fundingAllocations
      .filter(f => f.change !== undefined && typeof f.change === 'number' && Math.abs(f.change) > 5)
      .slice(0, 2);
    topFunding.forEach((funding, idx) => {
      const changeValue = funding.change || 0;
      const amountValue = funding.amount || 0;
      items.push({
        id: `funding-${idx}`,
        title: `${funding.sector} Budget ${changeValue > 0 ? "Increase" : "Adjustment"}`,
        summary: `${funding.sector} sees ${changeValue > 0 ? "+" : ""}${changeValue.toFixed(1)}% change${amountValue > 0 ? ` with $${(amountValue / 1000).toFixed(1)}B allocated` : ''}`,
        category: "Budget",
        timestamp: "Today",
        type: Math.abs(changeValue) > 10 ? "alert" : "update",
        source: "Budget Analysis",
      });
    });

    // Trending careers as news
    const trendingCareers = careerOpportunities.filter(c => c.trending).slice(0, 2);
    trendingCareers.forEach((career, idx) => {
      const growthText = career.growth !== undefined && typeof career.growth === 'number'
        ? `+${career.growth.toFixed(1)}% growth`
        : 'growth data available';
      const jobsText = career.jobs !== undefined && typeof career.jobs === 'number' && career.jobs > 0
        ? `${career.jobs.toLocaleString()} opportunities`
        : 'opportunities available';
      
      items.push({
        id: `career-${idx}`,
        title: `${career.occupation} Demand Surge`,
        summary: `${career.occupation} in ${career.sector} showing ${growthText} with ${jobsText}`,
        category: "Workforce",
        timestamp: "This week",
        type: "trend",
        source: "Labour Market",
      });
    });

    // Emerging skills as news
    const emergingSkills = skillsDemand.filter(s => s.category === "emerging").slice(0, 2);
    emergingSkills.forEach((skill, idx) => {
      const demandValue = skill.demand !== undefined && typeof skill.demand === 'number' ? skill.demand : 0;
      items.push({
        id: `skill-${idx}`,
        title: `${skill.name} Skills Emerging`,
        summary: `${skill.name} identified as emerging skill${demandValue > 0 ? ` with ${demandValue}% demand` : ''} in ${skill.sector || 'various sectors'}`,
        category: "Skills",
        timestamp: "This week",
        type: "update",
        source: "Skills Analysis",
      });
    });

    return items.slice(0, 6);
  }, [crossTabInsights, fundingAllocations, careerOpportunities, skillsDemand]);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "insight": return <Sparkles className="w-4 h-4 text-purple-500" />;
      case "alert": return <AlertCircle className="w-4 h-4 text-amber-500" />;
      case "trend": return <TrendingUp className="w-4 h-4 text-emerald-500" />;
      default: return <Bell className="w-4 h-4 text-blue-500" />;
    }
  };

  const getTypeStyle = (type: string) => {
    switch (type) {
      case "insight": return "bg-purple-500/10 border-purple-500/20";
      case "alert": return "bg-amber-500/10 border-amber-500/20";
      case "trend": return "bg-emerald-500/10 border-emerald-500/20";
      default: return "bg-blue-500/10 border-blue-500/20";
    }
  };

  if (globalLoading) {
    return (
      <div className="card-intelligence p-6">
        <div className="flex items-center justify-center h-48">
          <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
        </div>
      </div>
    );
  }

  return (
    <div className="card-intelligence p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Newspaper className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="font-display text-lg font-bold text-foreground">Intelligence Updates</h2>
            <p className="text-sm text-muted-foreground">Latest insights from {metrics?.totalDocuments || 0} documents</p>
          </div>
        </div>
        <Badge variant="secondary" className="gap-1">
          <Clock className="w-3 h-3" />
          Live
        </Badge>
      </div>

      {/* News Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {newsItems.map((item, index) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className={cn(
              "group p-4 rounded-xl border transition-all hover:shadow-md cursor-pointer",
              getTypeStyle(item.type)
            )}
          >
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-background/80 flex items-center justify-center flex-shrink-0">
                {getTypeIcon(item.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="text-[10px]">{item.category}</Badge>
                  <span className="text-[10px] text-muted-foreground">{item.timestamp}</span>
                </div>
                <h4 className="font-semibold text-foreground text-sm mb-1 line-clamp-2">
                  {item.title}
                </h4>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {item.summary}
                </p>
                {item.source && (
                  <p className="text-[10px] text-muted-foreground mt-2 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    {item.source}
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {newsItems.length === 0 && (
        <div className="text-center py-12">
          <Newspaper className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
          <p className="text-muted-foreground">No updates available</p>
          <p className="text-xs text-muted-foreground mt-1">Check back soon for new insights</p>
        </div>
      )}

      {/* View All Button */}
      {newsItems.length > 0 && (
        <div className="mt-6 text-center">
          <Button variant="outline" size="sm" className="gap-2">
            View All Updates
            <ExternalLink className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

export default BreakingNews;
