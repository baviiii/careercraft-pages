import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  FileText,
  Plus,
  Search,
  Filter,
  MoreVertical,
  Edit,
  Trash2,
  Download,
  Copy,
  Tag,
  Calendar,
  Clock,
  Star,
  StarOff,
  FolderOpen,
  Grid,
  List,
  SortAsc,
  SortDesc,
  ArrowLeft,
  Briefcase,
  GraduationCap,
  Code,
  Palette,
  Building,
  X,
  Check,
} from "lucide-react";
import { Session } from "@supabase/supabase-js";

interface Resume {
  id: string;
  name: string;
  content: any;
  created_at: string;
  updated_at: string;
  tags?: string[];
  is_favorite?: boolean;
  category?: string;
  job_title?: string;
  target_company?: string;
}

const CATEGORIES = [
  { id: "general", label: "General", icon: FileText, color: "bg-gray-500" },
  { id: "tech", label: "Tech/IT", icon: Code, color: "bg-blue-500" },
  { id: "business", label: "Business", icon: Building, color: "bg-green-500" },
  { id: "creative", label: "Creative", icon: Palette, color: "bg-purple-500" },
  { id: "academic", label: "Academic", icon: GraduationCap, color: "bg-orange-500" },
];

const PRESET_TAGS = [
  "Full-time", "Part-time", "Remote", "Hybrid", "Contract",
  "Entry-level", "Mid-level", "Senior", "Executive",
  "Updated", "Draft", "Final", "Submitted"
];

export default function MyResumes() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [filteredResumes, setFilteredResumes] = useState<Resume[]>([]);
  
  // UI State
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [sortBy, setSortBy] = useState<"date" | "name" | "updated">("updated");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterTag, setFilterTag] = useState<string>("all");
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  
  // Dialog State
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; resume: Resume | null }>({ open: false, resume: null });
  const [tagDialog, setTagDialog] = useState<{ open: boolean; resume: Resume | null }>({ open: false, resume: null });
  const [newTag, setNewTag] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        if (!session) {
          navigate("/auth");
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (!session) {
        navigate("/auth");
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  // Fetch resumes
  useEffect(() => {
    const fetchResumes = async () => {
      if (!session?.user) return;
      
      try {
        const { data, error } = await supabase
          .from('resumes')
          .select('*')
          .eq('user_id', session.user.id)
          .order('updated_at', { ascending: false });

        if (error) throw error;
        
        // Parse content and extract metadata
        const parsedResumes = (data || []).map(r => {
          let content = null;
          
          // Safely parse content - it might be JSON string, object, or plain text
          try {
            if (typeof r.content === 'string') {
              // Try to parse as JSON
              content = JSON.parse(r.content);
            } else if (r.content && typeof r.content === 'object') {
              content = r.content;
            }
          } catch (e) {
            // Content is not valid JSON - might be plain text from old uploads
            console.warn(`Resume ${r.id} has non-JSON content, treating as legacy`);
            content = {
              contact: { name: r.name || 'Untitled' },
              rawText: r.content, // Store the raw text
            };
          }
          
          return {
            ...r,
            content: content || {},
            tags: content?.metadata?.tags || [],
            is_favorite: content?.metadata?.is_favorite || false,
            category: content?.metadata?.category || 'general',
            job_title: content?.experience?.[0]?.title || content?.contact?.name || 'Resume',
            target_company: content?.metadata?.target_company || '',
          };
        });
        
        setResumes(parsedResumes);
      } catch (error) {
        console.error('Error fetching resumes:', error);
        toast({
          title: "Error",
          description: "Failed to load resumes",
          variant: "destructive",
        });
      }
    };

    fetchResumes();
  }, [session, toast]);

  // Filter and sort resumes
  useEffect(() => {
    let filtered = [...resumes];
    
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(r => 
        r.name?.toLowerCase().includes(query) ||
        r.content?.contact?.name?.toLowerCase().includes(query) ||
        r.job_title?.toLowerCase().includes(query) ||
        r.target_company?.toLowerCase().includes(query) ||
        r.tags?.some(t => t.toLowerCase().includes(query))
      );
    }
    
    // Category filter
    if (filterCategory !== "all") {
      filtered = filtered.filter(r => r.category === filterCategory);
    }
    
    // Tag filter
    if (filterTag !== "all") {
      filtered = filtered.filter(r => r.tags?.includes(filterTag));
    }
    
    // Favorites filter
    if (showFavoritesOnly) {
      filtered = filtered.filter(r => r.is_favorite);
    }
    
    // Sort
    filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case "name":
          comparison = (a.name || "").localeCompare(b.name || "");
          break;
        case "date":
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
        case "updated":
          comparison = new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
          break;
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });
    
    setFilteredResumes(filtered);
  }, [resumes, searchQuery, filterCategory, filterTag, showFavoritesOnly, sortBy, sortOrder]);

  // Get all unique tags from resumes
  const allTags = [...new Set(resumes.flatMap(r => r.tags || []))];

  const handleDelete = async () => {
    if (!deleteDialog.resume) return;
    
    try {
      const { error } = await supabase
        .from('resumes')
        .delete()
        .eq('id', deleteDialog.resume.id);

      if (error) throw error;
      
      setResumes(prev => prev.filter(r => r.id !== deleteDialog.resume!.id));
      toast({
        title: "Resume deleted",
        description: "The resume has been permanently deleted.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete resume",
        variant: "destructive",
      });
    } finally {
      setDeleteDialog({ open: false, resume: null });
    }
  };

  const handleToggleFavorite = async (resume: Resume) => {
    const newFavorite = !resume.is_favorite;
    const updatedContent = {
      ...resume.content,
      metadata: {
        ...resume.content?.metadata,
        is_favorite: newFavorite,
      }
    };
    
    try {
      const { error } = await supabase
        .from('resumes')
        .update({ content: updatedContent, updated_at: new Date().toISOString() })
        .eq('id', resume.id);

      if (error) throw error;
      
      setResumes(prev => prev.map(r => 
        r.id === resume.id ? { ...r, is_favorite: newFavorite, content: updatedContent } : r
      ));
      
      toast({
        title: newFavorite ? "Added to favorites" : "Removed from favorites",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update favorite status",
        variant: "destructive",
      });
    }
  };

  const handleUpdateTags = async () => {
    if (!tagDialog.resume) return;
    
    const updatedContent = {
      ...tagDialog.resume.content,
      metadata: {
        ...tagDialog.resume.content?.metadata,
        tags: selectedTags,
      }
    };
    
    try {
      const { error } = await supabase
        .from('resumes')
        .update({ content: updatedContent, updated_at: new Date().toISOString() })
        .eq('id', tagDialog.resume.id);

      if (error) throw error;
      
      setResumes(prev => prev.map(r => 
        r.id === tagDialog.resume!.id ? { ...r, tags: selectedTags, content: updatedContent } : r
      ));
      
      toast({ title: "Tags updated" });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update tags",
        variant: "destructive",
      });
    } finally {
      setTagDialog({ open: false, resume: null });
      setSelectedTags([]);
      setNewTag("");
    }
  };

  const handleUpdateCategory = async (resume: Resume, category: string) => {
    const updatedContent = {
      ...resume.content,
      metadata: {
        ...resume.content?.metadata,
        category,
      }
    };
    
    try {
      const { error } = await supabase
        .from('resumes')
        .update({ content: updatedContent, updated_at: new Date().toISOString() })
        .eq('id', resume.id);

      if (error) throw error;
      
      setResumes(prev => prev.map(r => 
        r.id === resume.id ? { ...r, category, content: updatedContent } : r
      ));
      
      toast({ title: "Category updated" });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update category",
        variant: "destructive",
      });
    }
  };

  const handleDuplicate = async (resume: Resume) => {
    try {
      const { data, error } = await supabase
        .from('resumes')
        .insert({
          user_id: session!.user.id,
          name: `${resume.name} (Copy)`,
          content: resume.content,
        })
        .select()
        .single();

      if (error) throw error;
      
      const newResume = {
        ...data,
        content: resume.content,
        tags: resume.tags,
        is_favorite: false,
        category: resume.category,
        job_title: resume.job_title,
      };
      
      setResumes(prev => [newResume, ...prev]);
      toast({ title: "Resume duplicated" });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to duplicate resume",
        variant: "destructive",
      });
    }
  };

  const openTagDialog = (resume: Resume) => {
    setSelectedTags(resume.tags || []);
    setTagDialog({ open: true, resume });
  };

  const addTag = () => {
    if (newTag && !selectedTags.includes(newTag)) {
      setSelectedTags(prev => [...prev, newTag]);
      setNewTag("");
    }
  };

  const removeTag = (tag: string) => {
    setSelectedTags(prev => prev.filter(t => t !== tag));
  };

  const getCategoryInfo = (categoryId: string) => {
    return CATEGORIES.find(c => c.id === categoryId) || CATEGORIES[0];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-lg text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center">
                <FolderOpen className="w-4 h-4 text-white" />
              </div>
              <span className="text-xl font-bold">My Resumes</span>
            </div>
          </div>
          
          <Button onClick={() => navigate("/builder")} className="gap-2">
            <Plus className="w-4 h-4" />
            New Resume
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        {/* Stats Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="p-4">
            <p className="text-2xl font-bold">{resumes.length}</p>
            <p className="text-sm text-muted-foreground">Total Resumes</p>
          </Card>
          <Card className="p-4">
            <p className="text-2xl font-bold">{resumes.filter(r => r.is_favorite).length}</p>
            <p className="text-sm text-muted-foreground">Favorites</p>
          </Card>
          <Card className="p-4">
            <p className="text-2xl font-bold">{allTags.length}</p>
            <p className="text-sm text-muted-foreground">Tags Used</p>
          </Card>
          <Card className="p-4">
            <p className="text-2xl font-bold">
              {resumes.filter(r => {
                const updated = new Date(r.updated_at);
                const weekAgo = new Date();
                weekAgo.setDate(weekAgo.getDate() - 7);
                return updated > weekAgo;
              }).length}
            </p>
            <p className="text-sm text-muted-foreground">Updated This Week</p>
          </Card>
        </div>

        {/* Filters & Search */}
        <Card className="p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search resumes, tags, companies..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            {/* Category Filter */}
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {CATEGORIES.map(cat => (
                  <SelectItem key={cat.id} value={cat.id}>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${cat.color}`} />
                      {cat.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {/* Tag Filter */}
            <Select value={filterTag} onValueChange={setFilterTag}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="Tag" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tags</SelectItem>
                {allTags.map(tag => (
                  <SelectItem key={tag} value={tag}>{tag}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {/* Sort */}
            <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="updated">Last Updated</SelectItem>
                <SelectItem value="date">Date Created</SelectItem>
                <SelectItem value="name">Name</SelectItem>
              </SelectContent>
            </Select>
            
            {/* View Controls */}
            <div className="flex items-center gap-2">
              <Button
                variant={showFavoritesOnly ? "default" : "outline"}
                size="icon"
                onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                title="Show favorites only"
              >
                <Star className={`w-4 h-4 ${showFavoritesOnly ? "fill-current" : ""}`} />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                title={sortOrder === "asc" ? "Ascending" : "Descending"}
              >
                {sortOrder === "asc" ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />}
              </Button>
              <Button
                variant={viewMode === "grid" ? "default" : "outline"}
                size="icon"
                onClick={() => setViewMode("grid")}
              >
                <Grid className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "outline"}
                size="icon"
                onClick={() => setViewMode("list")}
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </Card>

        {/* Resumes Grid/List */}
        {filteredResumes.length === 0 ? (
          <Card className="p-12 text-center">
            <FolderOpen className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">
              {resumes.length === 0 ? "No resumes yet" : "No matching resumes"}
            </h3>
            <p className="text-muted-foreground mb-6">
              {resumes.length === 0 
                ? "Create your first resume to get started"
                : "Try adjusting your filters or search query"
              }
            </p>
            {resumes.length === 0 && (
              <Button onClick={() => navigate("/builder")}>
                <Plus className="w-4 h-4 mr-2" />
                Create Resume
              </Button>
            )}
          </Card>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence>
              {filteredResumes.map((resume, index) => {
                const category = getCategoryInfo(resume.category || "general");
                return (
                  <motion.div
                    key={resume.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card className="overflow-hidden hover:shadow-lg transition-all group">
                      {/* Preview Header */}
                      <div className={`h-2 bg-gradient-to-r ${category.color.replace('bg-', 'from-')} to-transparent`} />
                      
                      <div className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold truncate">{resume.name || "Untitled Resume"}</h3>
                              {resume.is_favorite && (
                                <Star className="w-4 h-4 text-yellow-500 fill-yellow-500 flex-shrink-0" />
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground truncate">
                              {resume.content?.contact?.name || "No name"}
                            </p>
                          </div>
                          
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => navigate(`/builder?id=${resume.id}`)}>
                                <Edit className="w-4 h-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDuplicate(resume)}>
                                <Copy className="w-4 h-4 mr-2" />
                                Duplicate
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openTagDialog(resume)}>
                                <Tag className="w-4 h-4 mr-2" />
                                Manage Tags
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleToggleFavorite(resume)}>
                                {resume.is_favorite ? (
                                  <>
                                    <StarOff className="w-4 h-4 mr-2" />
                                    Remove Favorite
                                  </>
                                ) : (
                                  <>
                                    <Star className="w-4 h-4 mr-2" />
                                    Add to Favorites
                                  </>
                                )}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => setDeleteDialog({ open: true, resume })}
                                className="text-destructive"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        
                        {/* Category Badge */}
                        <div className="flex items-center gap-2 mb-3">
                          <Badge variant="secondary" className="gap-1">
                            <category.icon className="w-3 h-3" />
                            {category.label}
                          </Badge>
                          <Select 
                            value={resume.category || "general"} 
                            onValueChange={(v) => handleUpdateCategory(resume, v)}
                          >
                            <SelectTrigger className="h-6 w-6 p-0 border-0 opacity-0 group-hover:opacity-100">
                              <Edit className="w-3 h-3" />
                            </SelectTrigger>
                            <SelectContent>
                              {CATEGORIES.map(cat => (
                                <SelectItem key={cat.id} value={cat.id}>{cat.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        
                        {/* Tags */}
                        {resume.tags && resume.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-3">
                            {resume.tags.slice(0, 3).map(tag => (
                              <Badge key={tag} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                            {resume.tags.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{resume.tags.length - 3}
                              </Badge>
                            )}
                          </div>
                        )}
                        
                        {/* Meta Info */}
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatDate(resume.created_at)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDate(resume.updated_at)}
                          </span>
                        </div>
                      </div>
                      
                      {/* Quick Actions */}
                      <div className="border-t p-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="flex-1"
                          onClick={() => navigate(`/builder?id=${resume.id}`)}
                        >
                          <Edit className="w-4 h-4 mr-1" />
                          Edit
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="flex-1"
                          onClick={() => navigate(`/analysis?id=${resume.id}`)}
                        >
                          <Briefcase className="w-4 h-4 mr-1" />
                          Analyze
                        </Button>
                      </div>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        ) : (
          <Card className="divide-y">
            <AnimatePresence>
              {filteredResumes.map((resume, index) => {
                const category = getCategoryInfo(resume.category || "general");
                return (
                  <motion.div
                    key={resume.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: index * 0.03 }}
                    className="p-4 flex items-center gap-4 hover:bg-muted/50 transition-colors group"
                  >
                    <div className={`w-10 h-10 rounded-lg ${category.color} flex items-center justify-center`}>
                      <category.icon className="w-5 h-5 text-white" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold truncate">{resume.name || "Untitled Resume"}</h3>
                        {resume.is_favorite && (
                          <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {resume.content?.contact?.name || "No name"} • {category.label}
                      </p>
                    </div>
                    
                    {resume.tags && resume.tags.length > 0 && (
                      <div className="hidden md:flex gap-1">
                        {resume.tags.slice(0, 2).map(tag => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                    
                    <div className="text-sm text-muted-foreground hidden sm:block">
                      {formatDate(resume.updated_at)}
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => navigate(`/builder?id=${resume.id}`)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleDuplicate(resume)}>
                            <Copy className="w-4 h-4 mr-2" />
                            Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openTagDialog(resume)}>
                            <Tag className="w-4 h-4 mr-2" />
                            Manage Tags
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleToggleFavorite(resume)}>
                            {resume.is_favorite ? <StarOff className="w-4 h-4 mr-2" /> : <Star className="w-4 h-4 mr-2" />}
                            {resume.is_favorite ? "Remove Favorite" : "Add to Favorites"}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => setDeleteDialog({ open: true, resume })}
                            className="text-destructive"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </Card>
        )}
      </main>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ open, resume: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Resume</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deleteDialog.resume?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog({ open: false, resume: null })}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Tag Management Dialog */}
      <Dialog open={tagDialog.open} onOpenChange={(open) => !open && setTagDialog({ open: false, resume: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage Tags</DialogTitle>
            <DialogDescription>
              Add tags to organize and filter your resumes.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Current Tags */}
            <div className="flex flex-wrap gap-2">
              {selectedTags.map(tag => (
                <Badge key={tag} variant="secondary" className="gap-1 pr-1">
                  {tag}
                  <button 
                    onClick={() => removeTag(tag)}
                    className="ml-1 hover:bg-muted rounded-full p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
              {selectedTags.length === 0 && (
                <p className="text-sm text-muted-foreground">No tags added</p>
              )}
            </div>
            
            {/* Add New Tag */}
            <div className="flex gap-2">
              <Input
                placeholder="Add new tag..."
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addTag()}
              />
              <Button onClick={addTag} disabled={!newTag}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            
            {/* Preset Tags */}
            <div>
              <p className="text-sm font-medium mb-2">Quick add:</p>
              <div className="flex flex-wrap gap-1">
                {PRESET_TAGS.filter(t => !selectedTags.includes(t)).slice(0, 8).map(tag => (
                  <Badge 
                    key={tag} 
                    variant="outline" 
                    className="cursor-pointer hover:bg-muted"
                    onClick={() => setSelectedTags(prev => [...prev, tag])}
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setTagDialog({ open: false, resume: null })}>
              Cancel
            </Button>
            <Button onClick={handleUpdateTags}>
              <Check className="w-4 h-4 mr-2" />
              Save Tags
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
