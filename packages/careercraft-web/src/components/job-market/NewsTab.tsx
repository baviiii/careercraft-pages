import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Newspaper,
  Users,
  Zap,
  DollarSign,
  Globe,
  Sparkles,
  AlertTriangle,
  Lightbulb,
  ChevronRight,
  ExternalLink,
  Clock,
  TrendingUp,
  Flame,
  Eye,
  Share2,
  Bookmark,
  BookmarkCheck,
  X,
  ArrowUpRight,
  Building2,
  MapPin,
  Calendar,
  ChevronDown,
  Loader2,
} from "lucide-react";
import { NewsArticle } from "./types";
import { MatchMeter } from "@/components/craft/MatchMeter";
import type { MatchBand } from "@/hooks/usePersonalization";

const NEWS_CATEGORIES = [
  { name: "All News", value: "all", icon: Newspaper, color: "from-slate-500 to-slate-600" },
  { name: "Hiring Trends", value: "hiring", icon: Users, color: "from-emerald-500 to-teal-600" },
  { name: "Tech Industry", value: "tech", icon: Zap, color: "from-blue-500 to-indigo-600" },
  { name: "Salary Reports", value: "salary", icon: DollarSign, color: "from-amber-500 to-orange-600" },
  { name: "Remote Work", value: "remote", icon: Globe, color: "from-purple-500 to-violet-600" },
  { name: "AI & Automation", value: "ai", icon: Sparkles, color: "from-pink-500 to-rose-600" },
  { name: "Layoffs", value: "layoffs", icon: AlertTriangle, color: "from-red-500 to-rose-600" },
  { name: "Innovation", value: "innovation", icon: Lightbulb, color: "from-cyan-500 to-blue-600" },
];

const TIME_RANGES = [
  { label: "Today", value: "today", days: 1 },
  { label: "Past Week", value: "week", days: 7 },
  { label: "Past Month", value: "month", days: 30 },
  { label: "Past 3 Months", value: "3months", days: 90 },
  { label: "Past 6 Months", value: "6months", days: 180 },
  { label: "Past Year", value: "year", days: 365 },
];

interface NewsTabProps {
  news: NewsArticle[];
  loading: boolean;
  newsCategory: string;
  onCategoryChange: (category: string) => void;
  onTimeRangeChange?: (startDate: string, endDate: string, rangeValue?: string) => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
  loadingMore?: boolean;
  currentTimeRange?: string;
  /** Optional per-article likeliness rating, shown when the profile is set. */
  rateArticle?: (a: NewsArticle) => { match: number; band: MatchBand; reasons?: string[] } | null;
}

export default function NewsTab({
  news,
  loading,
  newsCategory,
  onCategoryChange,
  onTimeRangeChange,
  onLoadMore,
  hasMore,
  loadingMore,
  currentTimeRange = "week",
  rateArticle,
}: NewsTabProps) {
  const [timeRange, setTimeRange] = useState(currentTimeRange);
  const [selectedArticle, setSelectedArticle] = useState<NewsArticle | null>(null);
  const [savedArticles, setSavedArticles] = useState<string[]>([]);
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

  const handleTimeRangeChange = (value: string) => {
    setTimeRange(value);
    if (onTimeRangeChange) {
      const range = TIME_RANGES.find(r => r.value === value);
      if (range) {
        const endDate = new Date().toISOString();
        const startDate = new Date(Date.now() - range.days * 24 * 60 * 60 * 1000).toISOString();
        onTimeRangeChange(startDate, endDate, value);
      }
    }
  };

  const getTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffHours < 1) return "Just now";
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  const getCategoryConfig = (category: string) => {
    const configs: Record<string, { bg: string; text: string; icon: any; gradient: string }> = {
      hiring: { bg: "bg-emerald-500/10", text: "text-emerald-600", icon: Users, gradient: "from-emerald-500 to-teal-600" },
      tech: { bg: "bg-blue-500/10", text: "text-blue-600", icon: Zap, gradient: "from-blue-500 to-indigo-600" },
      salary: { bg: "bg-amber-500/10", text: "text-amber-600", icon: DollarSign, gradient: "from-amber-500 to-orange-600" },
      remote: { bg: "bg-purple-500/10", text: "text-purple-600", icon: Globe, gradient: "from-purple-500 to-violet-600" },
      ai: { bg: "bg-pink-500/10", text: "text-pink-600", icon: Sparkles, gradient: "from-pink-500 to-rose-600" },
      layoffs: { bg: "bg-red-500/10", text: "text-red-600", icon: AlertTriangle, gradient: "from-red-500 to-rose-600" },
      innovation: { bg: "bg-cyan-500/10", text: "text-cyan-600", icon: Lightbulb, gradient: "from-cyan-500 to-blue-600" },
      immigration: { bg: "bg-indigo-500/10", text: "text-indigo-600", icon: Globe, gradient: "from-indigo-500 to-purple-600" },
    };
    return configs[category] || { bg: "bg-slate-500/10", text: "text-slate-600", icon: Newspaper, gradient: "from-slate-500 to-slate-600" };
  };

  const toggleSave = (articleId: string) => {
    setSavedArticles(prev => 
      prev.includes(articleId) 
        ? prev.filter(id => id !== articleId)
        : [...prev, articleId]
    );
  };

  const isTrending = (index: number) => index < 3;
  const isUrgent = (category: string) => ["layoffs", "hiring"].includes(category);

  return (
    <div className="space-y-8">
      {/* Premium Category Filter */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-indigo-500/5 to-purple-500/5 rounded-3xl blur-xl" />
        <div className="relative bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-3xl p-6 border border-slate-200/50 dark:border-slate-700/50 shadow-xl shadow-slate-200/20 dark:shadow-slate-900/20">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg shadow-blue-500/25">
                <Newspaper className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white">News Categories</h3>
                <p className="text-xs text-muted-foreground">Filter by topic & time</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* Time Range Selector */}
              <Select value={timeRange} onValueChange={handleTimeRangeChange}>
                <SelectTrigger className="w-[160px] rounded-xl bg-white/80 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700">
                  <Calendar className="w-4 h-4 mr-2 text-blue-500" />
                  <SelectValue placeholder="Time range" />
                </SelectTrigger>
                <SelectContent>
                  {TIME_RANGES.map((range) => (
                    <SelectItem key={range.value} value={range.value}>
                      {range.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Badge variant="outline" className="gap-1.5 rounded-full">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                {news.length} articles
              </Badge>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {NEWS_CATEGORIES.map((cat) => {
              const isActive = newsCategory === cat.value;
              return (
                <button
                  key={cat.value}
                  onClick={() => onCategoryChange(cat.value)}
                  className={`group relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 ${
                    isActive
                      ? "text-white shadow-lg"
                      : "bg-slate-100/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                  }`}
                >
                  {isActive && (
                    <div className={`absolute inset-0 bg-gradient-to-r ${cat.color} rounded-xl`} />
                  )}
                  <cat.icon className={`relative w-4 h-4 ${isActive ? "text-white" : ""}`} />
                  <span className="relative">{cat.name}</span>
                  {isActive && (
                    <span className="relative ml-1 px-1.5 py-0.5 bg-white/20 rounded-md text-xs">
                      {news.filter(n => cat.value === "all" || n.category === cat.value).length}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Featured Article - First Article Gets Special Treatment */}
      {!loading && news.length > 0 && (
        <div 
          className="group relative overflow-hidden rounded-3xl cursor-pointer"
          onClick={() => setSelectedArticle(news[0])}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent z-10" />
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 to-purple-600/20 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <img
            src={news[0].imageUrl || "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=1200&q=80"}
            alt={news[0].title}
            className="w-full h-80 md:h-96 object-cover group-hover:scale-105 transition-transform duration-700"
          />
          
          {/* Floating Badges */}
          <div className="absolute top-6 left-6 z-20 flex items-center gap-2">
            <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 shadow-lg shadow-amber-500/30 gap-1.5">
              <Flame className="w-3.5 h-3.5" /> Featured
            </Badge>
            {isUrgent(news[0].category) && (
              <Badge className="bg-gradient-to-r from-red-500 to-rose-500 text-white border-0 animate-pulse">
                Breaking
              </Badge>
            )}
          </div>
          
          <div className="absolute top-6 right-6 z-20 flex items-center gap-2">
            <button 
              onClick={(e) => { e.stopPropagation(); toggleSave(news[0].id); }}
              className="p-2.5 bg-white/20 backdrop-blur-md rounded-xl hover:bg-white/30 transition-colors"
            >
              {savedArticles.includes(news[0].id) ? (
                <BookmarkCheck className="w-5 h-5 text-white" />
              ) : (
                <Bookmark className="w-5 h-5 text-white" />
              )}
            </button>
            <button 
              onClick={(e) => e.stopPropagation()}
              className="p-2.5 bg-white/20 backdrop-blur-md rounded-xl hover:bg-white/30 transition-colors"
            >
              <Share2 className="w-5 h-5 text-white" />
            </button>
          </div>

          <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8 z-20">
            <div className="flex items-center gap-3 mb-4">
              <Badge className={`${getCategoryConfig(news[0].category).bg} ${getCategoryConfig(news[0].category).text} border-0`}>
                {news[0].category}
              </Badge>
              <span className="text-white/70 text-sm flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                {getTimeAgo(news[0].publishedAt)}
              </span>
              <span className="text-white/70 text-sm">{news[0].source}</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-3 group-hover:text-blue-200 transition-colors">
              {news[0].title}
            </h2>
            <p className="text-white/80 text-sm md:text-base line-clamp-2 mb-4 max-w-3xl">
              {news[0].description}
            </p>
            <div className="flex items-center gap-4">
              <Button className="bg-white text-slate-900 hover:bg-white/90 rounded-xl gap-2">
                Read Full Article <ArrowUpRight className="w-4 h-4" />
              </Button>
              <span className="text-white/60 text-sm flex items-center gap-1.5">
                <Eye className="w-4 h-4" /> 2.4k views
              </span>
            </div>
          </div>
        </div>
      )}

      {/* News Grid */}
      {loading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="overflow-hidden rounded-2xl">
              <Skeleton className="h-48 w-full" />
              <div className="p-5 space-y-3">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {news.slice(1).map((article, index) => {
            const config = getCategoryConfig(article.category);
            const isHovered = hoveredCard === article.id;
            const rated = rateArticle ? rateArticle(article) : null;

            return (
              <div
                key={article.id}
                className="group relative"
                onMouseEnter={() => setHoveredCard(article.id)}
                onMouseLeave={() => setHoveredCard(null)}
              >
                {/* Glow Effect */}
                <div className={`absolute -inset-1 bg-gradient-to-r ${config.gradient} rounded-3xl blur-xl opacity-0 group-hover:opacity-30 transition-opacity duration-500`} />
                
                <Card
                  className="relative overflow-hidden rounded-2xl border-0 bg-white dark:bg-slate-900 shadow-lg shadow-slate-200/50 dark:shadow-slate-900/50 hover:shadow-2xl hover:shadow-slate-300/50 dark:hover:shadow-slate-800/50 transition-all duration-500 cursor-pointer"
                  onClick={() => setSelectedArticle(article)}
                >
                  {/* Image Section */}
                  <div className="relative h-48 overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent z-10" />
                    <img
                      src={article.imageUrl || "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&q=80"}
                      alt={article.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                    />
                    
                    {/* Trending Badge */}
                    {isTrending(index) && (
                      <div className="absolute top-3 left-3 z-20">
                        <Badge className="bg-gradient-to-r from-orange-500 to-red-500 text-white border-0 shadow-lg gap-1">
                          <TrendingUp className="w-3 h-3" /> Trending
                        </Badge>
                      </div>
                    )}
                    
                    {/* Category Badge */}
                    <div className="absolute top-3 right-3 z-20">
                      <div className={`p-2 rounded-xl bg-gradient-to-br ${config.gradient} shadow-lg`}>
                        <config.icon className="w-4 h-4 text-white" />
                      </div>
                    </div>

                    {/* Bottom Info */}
                    <div className="absolute bottom-3 left-3 right-3 z-20 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-white/90 text-xs font-medium bg-black/30 backdrop-blur-sm px-2 py-1 rounded-lg">
                          {article.source}
                        </span>
                      </div>
                      <span className="text-white/80 text-xs flex items-center gap-1 bg-black/30 backdrop-blur-sm px-2 py-1 rounded-lg">
                        <Clock className="w-3 h-3" />
                        {getTimeAgo(article.publishedAt)}
                      </span>
                    </div>

                    {/* Hover Overlay */}
                    <div className={`absolute inset-0 z-15 bg-gradient-to-br ${config.gradient} opacity-0 group-hover:opacity-20 transition-opacity duration-500`} />
                  </div>

                  {/* Content Section */}
                  <div className="p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <Badge variant="outline" className={`${config.bg} ${config.text} border-0 text-xs`}>
                        {article.category}
                      </Badge>
                      {isUrgent(article.category) && (
                        <Badge variant="outline" className="bg-red-500/10 text-red-600 border-0 text-xs animate-pulse">
                          Urgent
                        </Badge>
                      )}
                    </div>
                    
                    <h3 className="font-bold text-lg leading-tight mb-2 text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2">
                      {article.title}
                    </h3>
                    
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                      {article.description}
                    </p>

                    {/* Action Bar */}
                    <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-3">
                        <button 
                          onClick={(e) => { e.stopPropagation(); toggleSave(article.id); }}
                          className={`p-2 rounded-lg transition-colors ${
                            savedArticles.includes(article.id)
                              ? "bg-blue-500/10 text-blue-600"
                              : "hover:bg-slate-100 dark:hover:bg-slate-800 text-muted-foreground"
                          }`}
                        >
                          {savedArticles.includes(article.id) ? (
                            <BookmarkCheck className="w-4 h-4" />
                          ) : (
                            <Bookmark className="w-4 h-4" />
                          )}
                        </button>
                        <button 
                          onClick={(e) => e.stopPropagation()}
                          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-muted-foreground transition-colors"
                        >
                          <Share2 className="w-4 h-4" />
                        </button>
                      </div>
                      {rated ? (
                        <MatchMeter match={rated.match} band={rated.band} reasons={rated.reasons} size={34} />
                      ) : (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Eye className="w-3.5 h-3.5" />
                          {Math.floor(Math.random() * 5000) + 500}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Animated Border */}
                  <div className={`absolute inset-0 rounded-2xl border-2 border-transparent group-hover:border-blue-500/30 transition-colors duration-500 pointer-events-none`} />
                </Card>
              </div>
            );
          })}
        </div>
      )}

      {/* Load More Button */}
      {!loading && news.length > 0 && (hasMore || onLoadMore) && (
        <div className="flex justify-center pt-4">
          <Button
            onClick={onLoadMore}
            disabled={loadingMore}
            className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl px-8 py-6 text-base font-medium shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all duration-300 hover:scale-105"
          >
            {loadingMore ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Loading more articles...
              </>
            ) : (
              <>
                <ChevronDown className="w-5 h-5 mr-2" />
                Load More Articles
              </>
            )}
          </Button>
        </div>
      )}

      {/* No Results Message */}
      {!loading && news.length === 0 && (
        <div className="text-center py-16">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
            <Newspaper className="w-10 h-10 text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">No articles found</h3>
          <p className="text-muted-foreground max-w-md mx-auto">
            Try adjusting your filters or selecting a different time range to find more news articles.
          </p>
        </div>
      )}

      {/* Article Detail Modal */}
      <Dialog open={!!selectedArticle} onOpenChange={() => setSelectedArticle(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0 rounded-3xl">
          {selectedArticle && (
            <>
              {/* Hero Image */}
              <div className="relative h-64 md:h-80">
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent z-10" />
                <img
                  src={selectedArticle.imageUrl || "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=1200&q=80"}
                  alt={selectedArticle.title}
                  className="w-full h-full object-cover"
                />
                <button
                  onClick={() => setSelectedArticle(null)}
                  className="absolute top-4 right-4 z-20 p-2 bg-white/20 backdrop-blur-md rounded-xl hover:bg-white/30 transition-colors"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
                
                <div className="absolute bottom-6 left-6 right-6 z-20">
                  <div className="flex items-center gap-3 mb-3">
                    <Badge className={`${getCategoryConfig(selectedArticle.category).bg} ${getCategoryConfig(selectedArticle.category).text} border-0`}>
                      {selectedArticle.category}
                    </Badge>
                    <span className="text-white/70 text-sm">{selectedArticle.source}</span>
                    <span className="text-white/70 text-sm flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {getTimeAgo(selectedArticle.publishedAt)}
                    </span>
                  </div>
                  <h2 className="text-2xl md:text-3xl font-bold text-white">
                    {selectedArticle.title}
                  </h2>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 md:p-8">
                <p className="text-lg text-muted-foreground mb-6 leading-relaxed">
                  {selectedArticle.description}
                </p>

                {/* Key Insights */}
                <div className="grid md:grid-cols-3 gap-4 mb-6">
                  <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-2xl">
                    <div className="flex items-center gap-2 mb-2">
                      <Building2 className="w-4 h-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-600">Industry Impact</span>
                    </div>
                    <p className="text-sm text-muted-foreground">Technology, Finance sectors most affected</p>
                  </div>
                  <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 rounded-2xl">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="w-4 h-4 text-emerald-600" />
                      <span className="text-sm font-medium text-emerald-600">Market Trend</span>
                    </div>
                    <p className="text-sm text-muted-foreground">+15% job growth expected</p>
                  </div>
                  <div className="p-4 bg-purple-50 dark:bg-purple-950/30 rounded-2xl">
                    <div className="flex items-center gap-2 mb-2">
                      <MapPin className="w-4 h-4 text-purple-600" />
                      <span className="text-sm font-medium text-purple-600">Top Locations</span>
                    </div>
                    <p className="text-sm text-muted-foreground">Sydney, Melbourne, Brisbane</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-4 pt-6 border-t border-slate-200 dark:border-slate-800">
                  <Button 
                    className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl gap-2"
                    onClick={() => window.open(selectedArticle.url, '_blank')}
                  >
                    Read Full Article <ExternalLink className="w-4 h-4" />
                  </Button>
                  <Button 
                    variant="outline" 
                    className="rounded-xl gap-2"
                    onClick={() => toggleSave(selectedArticle.id)}
                  >
                    {savedArticles.includes(selectedArticle.id) ? (
                      <>
                        <BookmarkCheck className="w-4 h-4" /> Saved
                      </>
                    ) : (
                      <>
                        <Bookmark className="w-4 h-4" /> Save
                      </>
                    )}
                  </Button>
                  <Button variant="outline" className="rounded-xl">
                    <Share2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
