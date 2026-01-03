import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  MapPin,
  Briefcase,
  GraduationCap,
  Building2,
  Heart,
  Users,
  TrendingUp,
  FileText,
  ExternalLink,
  Sparkles,
  Filter,
  ChevronRight,
  Globe,
  BookOpen,
  Award,
  Plane,
  Download,
  Bookmark,
  BookmarkCheck,
  Star,
  Calendar,
  BarChart3,
  Zap,
  RefreshCw,
  X,
  CheckCircle2,
  Clock,
  Eye,
  Share2,
  Info,
  Loader2,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface Category {
  id: string;
  name: string;
  icon: React.ElementType;
  description: string;
  count: number;
  color: string;
  growth?: number;
}

interface Resource {
  id: string;
  title: string;
  description: string;
  category: string;
  source: string;
  url?: string;
  tags: string[];
  type: 'pdf' | 'web' | 'guide';
  date?: string;
  views?: number;
  relevance?: number;
  featured?: boolean;
}

export default function ExploreSA() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<Resource[]>([]);
  const [sortBy, setSortBy] = useState<"relevance" | "date" | "popular">("relevance");
  const [filterType, setFilterType] = useState<"all" | "pdf" | "web" | "guide">("all");
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showFilters, setShowFilters] = useState(false);
  const [categoryStats, setCategoryStats] = useState<{ category: string; count: number }[]>([]);
  const [totalDocuments, setTotalDocuments] = useState(0);
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  const categories: Category[] = [
    { id: "jobs", name: "Job Listings", icon: Briefcase, description: "Current SA Government vacancies", count: 150, color: "from-blue-500 to-blue-600", growth: 12 },
    { id: "health", name: "Health Careers", icon: Heart, description: "Healthcare & nursing roles", count: 45, color: "from-rose-500 to-pink-600", growth: 18 },
    { id: "education", name: "Education", icon: GraduationCap, description: "Teaching & education sector", count: 38, color: "from-purple-500 to-violet-600", growth: 8 },
    { id: "public-sector", name: "Public Sector", icon: Building2, description: "Government administration", count: 62, color: "from-teal-500 to-cyan-600", growth: 15 },
    { id: "training", name: "Training Programs", icon: BookOpen, description: "Skills & professional development", count: 28, color: "from-orange-500 to-amber-600", growth: 22 },
    { id: "migration", name: "Migrant Support", icon: Plane, description: "Resources for skilled migrants", count: 22, color: "from-emerald-500 to-green-600", growth: 25 },
    { id: "career-guidance", name: "Career Guidance", icon: Award, description: "Resume, interview & application tips", count: 35, color: "from-indigo-500 to-blue-600", growth: 10 },
    { id: "regional", name: "Regional Jobs", icon: MapPin, description: "Opportunities outside Adelaide", count: 40, color: "from-yellow-500 to-orange-600", growth: 14 },
  ];

  const featuredResources: Resource[] = [
    {
      id: "1",
      title: "2025 SA Jobs & Skills Report",
      description: "Comprehensive overview of employment trends and in-demand occupations in South Australia",
      category: "workforce",
      source: "jobs_and_skills_report_2025.pdf",
      tags: ["trends", "skills", "employment"],
      type: "pdf",
      date: "2025-01-15",
      views: 1240,
      relevance: 98,
      featured: true,
    },
    {
      id: "2",
      title: "How to Write Selection Criteria",
      description: "Step-by-step guide to responding to selection criteria for government job applications",
      category: "career-guidance",
      source: "addressing-selection-criteria.pdf",
      tags: ["application", "tips", "government"],
      type: "pdf",
      date: "2024-12-20",
      views: 890,
      relevance: 95,
      featured: true,
    },
    {
      id: "3",
      title: "SA Health Workforce Strategy",
      description: "Strategic plan for healthcare workforce development in South Australia",
      category: "health",
      source: "Workforce Strategy.pdf",
      tags: ["health", "strategy", "planning"],
      type: "pdf",
      date: "2024-11-10",
      views: 650,
      relevance: 92,
      featured: true,
    },
    {
      id: "4",
      title: "Interview Preparation Guide",
      description: "Tips and strategies for successful job interviews in the public sector",
      category: "career-guidance",
      source: "interview-preparation-guide.pdf",
      tags: ["interview", "tips", "preparation"],
      type: "pdf",
      date: "2024-10-05",
      views: 1120,
      relevance: 90,
    },
    {
      id: "5",
      title: "Career Education & Pathways Strategy",
      description: "Framework for career development and education pathways in SA",
      category: "education",
      source: "Career-Education-and-Pathways-Strategy.pdf",
      tags: ["education", "pathways", "career"],
      type: "pdf",
      date: "2024-09-18",
      views: 780,
      relevance: 88,
    },
    {
      id: "6",
      title: "Regional Jobs Support Program",
      description: "Incentive program for employment in regional South Australia",
      category: "regional",
      source: "Regional-Jobs-Support-and-Incentive-Program-Program-Guidelines_2022.pdf",
      tags: ["regional", "incentive", "support"],
      type: "pdf",
      date: "2024-08-22",
      views: 540,
      relevance: 85,
    },
  ];

  const quickSearches = [
    "Healthcare jobs in Adelaide",
    "How to apply for government jobs",
    "Training programs for migrants",
    "Selection criteria examples",
    "IT jobs in South Australia",
    "Education sector careers",
  ];

  // Load category stats from RAG system
  useEffect(() => {
    const loadStats = async () => {
      try {
        const { data, error } = await supabase.functions.invoke("rag-metadata", {
          body: { type: "categories" },
        });

        if (!error && data?.categories) {
          setCategoryStats(data.categories);
          setTotalDocuments(data.categories.reduce((sum: number, cat: any) => sum + cat.count, 0));
        }
      } catch (error) {
        console.error("Failed to load stats:", error);
      } finally {
        setIsLoadingStats(false);
      }
    };

    loadStats();
  }, []);

  // Update category counts from RAG stats
  const categoriesWithRealCounts = useMemo(() => {
    return categories.map(cat => {
      const stat = categoryStats.find(s => 
        s.category.toLowerCase() === cat.id.toLowerCase() ||
        s.category.toLowerCase().includes(cat.id.toLowerCase())
      );
      return {
        ...cat,
        count: stat?.count || cat.count,
      };
    });
  }, [categories, categoryStats]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    
    try {
      // Use RAG metadata function for search
      const { data, error } = await supabase.functions.invoke("rag-metadata", {
        body: {
          type: "search",
          query: searchQuery,
          filters: {
            category: selectedCategory || undefined,
            documentType: filterType !== "all" ? filterType : undefined,
          },
          top: 50,
        },
      });

      if (error) throw error;

      // Transform RAG results to Resource format
      const transformedResults: Resource[] = (data.results || []).map((doc: any) => ({
        id: doc.documentId,
        title: doc.title,
        description: `Document from ${doc.category || 'SA Government'} resources`,
        category: doc.category || 'general',
        source: doc.documentId,
        tags: doc.tags || [],
        type: doc.documentType === 'pdf' ? 'pdf' : doc.documentType === 'web' ? 'web' : 'guide',
        url: doc.url,
        relevance: Math.round(doc.score * 100),
      }));

      setSearchResults(transformedResults);
    } catch (error) {
      console.error("Search error:", error);
      // Fallback to local search
      const filtered = featuredResources.filter(r => 
        r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      );
      setSearchResults(filtered);
    } finally {
      setIsSearching(false);
    }
  };

  const toggleBookmark = (id: string) => {
    setBookmarkedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const displayedResources = useMemo(() => {
    let resources = searchQuery ? searchResults : featuredResources;
    
    // Filter by category
    if (selectedCategory) {
      resources = resources.filter(r => r.category === selectedCategory);
    }
    
    // Filter by type
    if (filterType !== "all") {
      resources = resources.filter(r => r.type === filterType);
    }
    
    // Sort
    resources = [...resources].sort((a, b) => {
      switch (sortBy) {
        case "relevance":
          return (b.relevance || 0) - (a.relevance || 0);
        case "date":
          return new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime();
        case "popular":
          return (b.views || 0) - (a.views || 0);
        default:
          return 0;
      }
    });
    
    return resources;
  }, [searchQuery, searchResults, selectedCategory, filterType, sortBy, featuredResources]);

  const totalResources = displayedResources.length;
  const bookmarkedCount = bookmarkedIds.size;

  return (
    <div className="space-y-6">
      {/* Enhanced Hero Search Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative rounded-3xl overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-teal-500 to-emerald-500" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:40px_40px] opacity-30" />
        
        <div className="relative px-6 py-12 md:px-12 md:py-16">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <Globe className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-3xl md:text-5xl font-bold text-white">Explore Careers</h1>
            </div>
            <p className="text-lg md:text-xl text-white/90 mb-8 text-center max-w-2xl mx-auto">
              Discover opportunities across government sectors, training programs, and career resources powered by AI
            </p>
            
            {/* Enhanced Search Bar */}
            <div className="relative max-w-3xl mx-auto">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    placeholder="Search jobs, careers, training programs, documents..."
                    className="pl-12 pr-4 py-6 text-lg bg-white/95 backdrop-blur border-0 rounded-xl shadow-lg focus:ring-2 focus:ring-white/50"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => {
                        setSearchQuery("");
                        setSearchResults([]);
                      }}
                      className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-lg hover:bg-slate-100 transition-colors"
                    >
                      <X className="w-4 h-4 text-slate-500" />
                    </button>
                  )}
                </div>
                <Button 
                  onClick={handleSearch}
                  disabled={isSearching || !searchQuery.trim()}
                  className="px-8 py-6 bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow-lg disabled:opacity-50"
                >
                  {isSearching ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5 mr-2" />
                      Search
                    </>
                  )}
                </Button>
              </div>
              
              {/* Quick Searches */}
              <div className="flex flex-wrap justify-center gap-2 mt-4">
                <span className="text-xs text-white/70 mr-2">Quick searches:</span>
                {quickSearches.slice(0, 4).map((term) => (
                  <button
                    key={term}
                    onClick={() => {
                      setSearchQuery(term);
                      handleSearch();
                    }}
                    className="px-3 py-1.5 text-sm bg-white/20 hover:bg-white/30 text-white rounded-full transition-colors flex items-center gap-1"
                  >
                    <Zap className="w-3 h-3" />
                    {term}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 bg-slate-900/50 border-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <FileText className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{totalResources}</p>
              <p className="text-xs text-slate-400">Resources Found</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 bg-slate-900/50 border-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
              <BookmarkCheck className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{bookmarkedCount}</p>
              <p className="text-xs text-slate-400">Bookmarked</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 bg-slate-900/50 border-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/20 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-teal-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{categories.length}</p>
              <p className="text-xs text-slate-400">Categories</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 bg-slate-900/50 border-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">
                {isLoadingStats ? "..." : totalDocuments || "54+"}
              </p>
              <p className="text-xs text-slate-400">Documents Indexed</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters and Controls */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <Filter className="w-5 h-5 text-blue-400" />
            Browse Resources
          </h2>
          {selectedCategory && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedCategory(null)}
              className="text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4 mr-1" />
              Clear filter
            </Button>
          )}
        </div>
        
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
            <SelectTrigger className="w-[140px] bg-slate-900/50 border-slate-800/50 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="relevance">Relevance</SelectItem>
              <SelectItem value="date">Newest</SelectItem>
              <SelectItem value="popular">Most Popular</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={filterType} onValueChange={(v) => setFilterType(v as any)}>
            <SelectTrigger className="w-[120px] bg-slate-900/50 border-slate-800/50 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="pdf">PDFs</SelectItem>
              <SelectItem value="web">Web</SelectItem>
              <SelectItem value="guide">Guides</SelectItem>
            </SelectContent>
          </Select>
          
          <div className="flex items-center gap-1 p-1 bg-slate-900/50 border border-slate-800/50 rounded-lg">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode("grid")}
              className={cn(
                "h-8 px-3",
                viewMode === "grid" && "bg-slate-800 text-white"
              )}
            >
              Grid
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode("list")}
              className={cn(
                "h-8 px-3",
                viewMode === "list" && "bg-slate-800 text-white"
              )}
            >
              List
            </Button>
          </div>
        </div>
      </div>

      {/* Categories Grid - Enhanced */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Categories</h3>
          <Badge variant="secondary" className="bg-slate-800 text-slate-300">
            {categories.length} categories
          </Badge>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {categoriesWithRealCounts.map((category) => (
            <motion.div
              key={category.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Card
              onClick={() => setSelectedCategory(selectedCategory === category.id ? null : category.id)}
                className={cn(
                  "group relative p-5 cursor-pointer transition-all duration-300 overflow-hidden border-0",
                selectedCategory === category.id
                  ? "bg-gradient-to-br " + category.color + " scale-[1.02] shadow-lg"
                  : "bg-slate-900/50 hover:bg-slate-800/50"
                )}
            >
                <div className={cn(
                  "absolute top-0 left-0 w-full h-1 bg-gradient-to-r " + category.color,
                selectedCategory === category.id ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                )} />
              
              <div className="flex items-start gap-3">
                  <div className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center",
                  selectedCategory === category.id 
                    ? "bg-white/20" 
                    : `bg-gradient-to-br ${category.color}`
                  )}>
                  <category.icon className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-semibold text-white truncate text-sm">{category.name}</h3>
                      {category.growth && (
                        <Badge className="bg-emerald-500/20 text-emerald-400 border-0 text-[10px] px-1.5">
                          +{category.growth}%
                        </Badge>
                      )}
                    </div>
                    <p className={cn(
                      "text-xs line-clamp-2 mb-2",
                      selectedCategory === category.id ? "text-white/80" : "text-slate-400"
                    )}>
                    {category.description}
                  </p>
                    <Badge className={cn(
                      "text-[10px]",
                    selectedCategory === category.id 
                      ? "bg-white/20 text-white" 
                      : "bg-slate-800 text-slate-300"
                    )}>
                    {category.count} resources
                  </Badge>
                </div>
              </div>
            </Card>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Resources Grid/List - Enhanced */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-teal-400" />
            {searchQuery ? "Search Results" : "Featured Resources"}
            {displayedResources.length > 0 && (
              <Badge variant="secondary" className="bg-slate-800 text-slate-300">
                {displayedResources.length}
              </Badge>
            )}
          </h3>
        </div>
        
        {displayedResources.length === 0 ? (
          <Card className="p-12 text-center bg-slate-900/50 border-slate-800/50">
            <div className="w-16 h-16 rounded-2xl bg-slate-800/50 flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-slate-500" />
            </div>
            <p className="text-slate-400 mb-2">No resources found</p>
            <p className="text-sm text-slate-500">Try adjusting your filters or search query</p>
          </Card>
        ) : (
          <div className={cn(
            viewMode === "grid" 
              ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
              : "space-y-4"
          )}>
            <AnimatePresence>
              {displayedResources.map((resource, index) => (
                <motion.div
              key={resource.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: index * 0.05 }}
            >
                  <Card className={cn(
                    "group relative p-5 bg-slate-900/50 border border-slate-800/50 hover:border-slate-700/50 transition-all duration-300 cursor-pointer overflow-hidden",
                    viewMode === "list" && "flex items-start gap-4"
                  )}>
              <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-blue-500 to-teal-500 opacity-0 group-hover:opacity-100 transition-opacity" />
              
                    {resource.featured && (
                      <div className="absolute top-3 right-3">
                        <Badge className="bg-yellow-500/20 text-yellow-400 border-0">
                          <Star className="w-3 h-3 mr-1 fill-yellow-400" />
                          Featured
                        </Badge>
                      </div>
                    )}
                    
                    <div className={cn("flex items-start gap-3 mb-3", viewMode === "list" && "mb-0")}>
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                  resource.type === 'pdf' 
                    ? "bg-red-500/20" 
                    : resource.type === 'web' 
                    ? "bg-blue-500/20" 
                    : "bg-purple-500/20"
                      )}>
                        <FileText className={cn(
                          "w-5 h-5",
                    resource.type === 'pdf' 
                      ? "text-red-400" 
                      : resource.type === 'web' 
                      ? "text-blue-400" 
                      : "text-purple-400"
                        )} />
                </div>
                <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-white group-hover:text-blue-400 transition-colors line-clamp-2 mb-1">
                    {resource.title}
                  </h3>
                        <p className="text-xs text-slate-500 mb-2">{resource.source}</p>
                        {viewMode === "list" && (
                          <p className="text-sm text-slate-400 line-clamp-2">
                            {resource.description}
                          </p>
                        )}
                </div>
              </div>
              
                    {viewMode === "grid" && (
              <p className="text-sm text-slate-400 mb-3 line-clamp-2">
                {resource.description}
              </p>
                    )}
              
                    <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex flex-wrap gap-1">
                        {resource.tags.slice(0, 3).map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-[10px] bg-slate-800 text-slate-300">
                      {tag}
                    </Badge>
                  ))}
                        {resource.tags.length > 3 && (
                          <Badge variant="secondary" className="text-[10px] bg-slate-800 text-slate-300">
                            +{resource.tags.length - 3}
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-1">
                        {resource.relevance && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>
                                <Badge className="bg-blue-500/20 text-blue-400 border-0 text-[10px]">
                                  {resource.relevance}% match
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Relevance score</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                        {resource.views && (
                          <div className="flex items-center gap-1 text-xs text-slate-500">
                            <Eye className="w-3 h-3" />
                            {resource.views}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-800/50">
                      <div className="flex items-center gap-2">
                        {resource.date && (
                          <div className="flex items-center gap-1 text-xs text-slate-500">
                            <Calendar className="w-3 h-3" />
                            {new Date(resource.date).toLocaleDateString('en-AU', { month: 'short', year: 'numeric' })}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleBookmark(resource.id);
                                }}
                              >
                                {bookmarkedIds.has(resource.id) ? (
                                  <BookmarkCheck className="w-4 h-4 text-yellow-400" />
                                ) : (
                                  <Bookmark className="w-4 h-4" />
                                )}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{bookmarkedIds.has(resource.id) ? "Remove bookmark" : "Bookmark"}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <Share2 className="w-4 h-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Share resource</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <ExternalLink className="w-4 h-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Open resource</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                </div>
              </div>
            </Card>
                </motion.div>
          ))}
            </AnimatePresence>
        </div>
        )}
      </div>

      {/* Quick Links - Enhanced */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Globe className="w-5 h-5 text-blue-400" />
          Official Resources
        </h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
            { title: "SA Government Jobs Portal", url: "https://jobs.sa.gov.au", icon: Briefcase, color: "blue", description: "Official job listings" },
            { title: "Skills SA Training", url: "https://www.skills.sa.gov.au", icon: GraduationCap, color: "purple", description: "Training programs" },
            { title: "Migration SA", url: "https://www.migration.sa.gov.au", icon: Users, color: "teal", description: "Migrant support" },
        ].map((link) => (
          <a
            key={link.title}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-4 p-4 rounded-xl bg-slate-900/50 border border-slate-800/50 hover:border-slate-700/50 transition-all"
          >
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-${link.color}-500/20`}>
              <link.icon className={`w-6 h-6 text-${link.color}-400`} />
            </div>
            <div className="flex-1">
              <h3 className="font-medium text-white group-hover:text-blue-400 transition-colors">{link.title}</h3>
                <p className="text-sm text-slate-400">{link.description}</p>
            </div>
            <ExternalLink className="w-4 h-4 text-slate-500 group-hover:text-blue-400" />
          </a>
        ))}
        </div>
      </div>
    </div>
  );
}

