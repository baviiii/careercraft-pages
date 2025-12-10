import { useEffect, useState, useRef } from "react";
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
  Gauge,
  BarChart3,
  Layout,
  Eye,
  Mail,
  Phone,
  MapPin,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Session } from "@supabase/supabase-js";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

// Import all templates for preview rendering
import { ModernTemplate1 } from "@/components/templates/ModernTemplate1";
import { ModernTemplate2 } from "@/components/templates/ModernTemplate2";
import { ModernTemplate3 } from "@/components/templates/ModernTemplate3";
import { ModernTemplate4 } from "@/components/templates/ModernTemplate4";
import { ModernTemplate5 } from "@/components/templates/ModernTemplate5";
import { ModernTemplate6 } from "@/components/templates/ModernTemplate6";
import { ModernTemplate7 } from "@/components/templates/ModernTemplate7";
import { ProfessionalTemplate } from "@/components/templates/ProfessionalTemplate";
import { ProfessionalTemplate2 } from "@/components/templates/ProfessionalTemplate2";
import { ProfessionalTemplate3 } from "@/components/templates/ProfessionalTemplate3";
import { ProfessionalTemplate4 } from "@/components/templates/ProfessionalTemplate4";
import { ProfessionalTemplate5 } from "@/components/templates/ProfessionalTemplate5";
import { ProfessionalTemplate6 } from "@/components/templates/ProfessionalTemplate6";
import { CreativeTemplate1 } from "@/components/templates/CreativeTemplate1";
import { CreativeTemplate2 } from "@/components/templates/CreativeTemplate2";
import { CreativeTemplate3 } from "@/components/templates/CreativeTemplate3";
import { CreativeTemplate4 } from "@/components/templates/CreativeTemplate4";
import { CreativeTemplate5 } from "@/components/templates/CreativeTemplate5";
import { CreativeTemplate6 } from "@/components/templates/CreativeTemplate6";
import { CreativeTemplate7 } from "@/components/templates/CreativeTemplate7";
import { MinimalTemplate1 } from "@/components/templates/MinimalTemplate1";
import { MinimalTemplate2 } from "@/components/templates/MinimalTemplate2";
import { MinimalTemplate3 } from "@/components/templates/MinimalTemplate3";
import { MinimalTemplate4 } from "@/components/templates/MinimalTemplate4";
import { MinimalTemplate5 } from "@/components/templates/MinimalTemplate5";
import { TemplateData } from "@/components/templates/types";

// Template mapping
const TEMPLATE_MAP: Record<string, React.ComponentType<{ data?: TemplateData; isPreview?: boolean }>> = {
  modern1: ModernTemplate1,
  modern2: ModernTemplate2,
  modern3: ModernTemplate3,
  modern4: ModernTemplate4,
  modern5: ModernTemplate5,
  modern6: ModernTemplate6,
  modern7: ModernTemplate7,
  professional: ProfessionalTemplate,
  professional2: ProfessionalTemplate2,
  professional3: ProfessionalTemplate3,
  professional4: ProfessionalTemplate4,
  professional5: ProfessionalTemplate5,
  professional6: ProfessionalTemplate6,
  creative1: CreativeTemplate1,
  creative2: CreativeTemplate2,
  creative3: CreativeTemplate3,
  creative4: CreativeTemplate4,
  creative5: CreativeTemplate5,
  creative6: CreativeTemplate6,
  creative7: CreativeTemplate7,
  minimal1: MinimalTemplate1,
  minimal2: MinimalTemplate2,
  minimal3: MinimalTemplate3,
  minimal4: MinimalTemplate4,
  minimal5: MinimalTemplate5,
};

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
  ats_score?: number;
  last_analyzed_at?: string;
  template_id?: string;
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
  const [previewDialog, setPreviewDialog] = useState<{ open: boolean; resume: Resume | null }>({ open: false, resume: null });
  const [newTag, setNewTag] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [previewMode, setPreviewMode] = useState<"template" | "text">("template");
  const previewRef = useRef<HTMLDivElement>(null);
  const exportRef = useRef<HTMLDivElement>(null);

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

  // Convert resume content to TemplateData format
  const getTemplateData = (resume: Resume): TemplateData => {
    const content = resume.content || {};
    return {
      contact: {
        name: content.contact?.name || '',
        email: content.contact?.email || '',
        phone: content.contact?.phone || '',
        location: content.contact?.location || '',
        linkedin: content.contact?.linkedin || '',
        website: content.contact?.website || '',
      },
      summary: content.summary || '',
      experience: (content.experience || []).map((exp: any, i: number) => ({
        id: exp.id || `exp-${i}`,
        title: exp.title || '',
        company: exp.company || '',
        location: exp.location || '',
        startDate: exp.startDate || '',
        endDate: exp.endDate || '',
        current: exp.current || false,
        bullets: exp.bullets || [],
      })),
      education: (content.education || []).map((edu: any, i: number) => ({
        id: edu.id || `edu-${i}`,
        degree: edu.degree || '',
        school: edu.school || '',
        location: edu.location || '',
        graduationDate: edu.graduationDate || '',
        gpa: edu.gpa || '',
      })),
      skills: content.skills || [],
    };
  };

  // Export resume to PDF with proper A4 sizing and high quality
  const exportToPDF = async (resume: Resume) => {
    if (!resume.template_id || !TEMPLATE_MAP[resume.template_id]) {
      toast({ title: "Export failed", description: "No template found", variant: "destructive" });
      return;
    }

    setIsExporting(true);
    
    try {
      // Create a temporary container with exact A4 pixel dimensions (96 DPI)
      const tempContainer = document.createElement('div');
      tempContainer.style.position = 'absolute';
      tempContainer.style.left = '-9999px';
      tempContainer.style.top = '0';
      tempContainer.style.width = '794px'; // A4 width at 96 DPI
      tempContainer.style.minHeight = '1123px'; // A4 height at 96 DPI
      tempContainer.style.backgroundColor = '#ffffff';
      tempContainer.style.boxSizing = 'border-box';
      document.body.appendChild(tempContainer);

      // Render the template into the temp container using React
      const { createRoot } = await import('react-dom/client');
      const TemplateComponent = TEMPLATE_MAP[resume.template_id];
      const templateData = getTemplateData(resume);
      
      const root = createRoot(tempContainer);
      // CRITICAL: Pass isPreview={false} to render at full A4 size, not scaled down
      root.render(<TemplateComponent data={templateData} isPreview={false} />);
      
      // Wait for render and fonts to load
      await new Promise(resolve => setTimeout(resolve, 800));

      // Capture at high quality (scale 4 for crisp text)
      const canvas = await html2canvas(tempContainer, {
        scale: 4,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        width: 794,
        height: tempContainer.scrollHeight,
        windowWidth: 794,
      });

      // Clean up
      root.unmount();
      document.body.removeChild(tempContainer);

      const imgData = canvas.toDataURL("image/jpeg", 0.95);
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
        compress: true,
      });

      const pageWidth = 210;
      const pageHeight = 297;
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * pageWidth) / canvas.width;

      // Handle multi-page if content is longer than one page
      let heightLeft = imgHeight;
      let position = 0;
      let pageCount = 0;

      while (heightLeft > 0) {
        if (pageCount > 0) {
          pdf.addPage();
        }
        
        pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight, undefined, "FAST");
        heightLeft -= pageHeight;
        position -= pageHeight;
        pageCount++;
      }

      pdf.save(`${resume.content?.contact?.name || resume.name || "resume"}.pdf`);

      toast({
        title: "✓ PDF Downloaded",
        description: `High-quality resume exported (${pageCount} page${pageCount > 1 ? 's' : ''})`,
      });
    } catch (error) {
      console.error("Export error:", error);
      toast({
        title: "Export failed",
        description: "Could not generate PDF. Try using Edit in Builder to export.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  // Open resume in builder with template
  const openInBuilder = (resume: Resume) => {
    // Store resume data in session storage for builder to pick up
    sessionStorage.setItem('atsResumeData', JSON.stringify(resume.content));
    if (resume.template_id) {
      sessionStorage.setItem('atsResumeTemplate', resume.template_id);
    }
    sessionStorage.setItem('atsResumeName', resume.name);
    sessionStorage.setItem('atsResumeId', resume.id);
    navigate(`/builder?from=manager&id=${resume.id}`);
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
                    <Card className="overflow-hidden hover:shadow-lg transition-all group border-2 hover:border-primary/30">
                      {/* Mini Preview Area */}
                      <div 
                        className="relative h-32 bg-gradient-to-br from-muted/50 to-muted cursor-pointer overflow-hidden"
                        onClick={() => setPreviewDialog({ open: true, resume })}
                      >
                        {/* Mini resume preview */}
                        <div className="absolute inset-2 bg-white dark:bg-card rounded shadow-sm p-2 text-[6px] leading-tight overflow-hidden">
                          <div className="font-bold text-[8px] mb-1 truncate">
                            {resume.content?.contact?.name || "Your Name"}
                          </div>
                          <div className="text-muted-foreground mb-1 truncate">
                            {resume.content?.contact?.email || "email@example.com"}
                          </div>
                          {resume.content?.summary && (
                            <div className="text-muted-foreground line-clamp-2 mb-1">
                              {resume.content.summary.substring(0, 80)}...
                            </div>
                          )}
                          {resume.content?.experience?.[0] && (
                            <div className="border-t pt-1 mt-1">
                              <div className="font-semibold truncate">{resume.content.experience[0].title}</div>
                              <div className="text-muted-foreground truncate">{resume.content.experience[0].company}</div>
                            </div>
                          )}
                        </div>
                        
                        {/* Hover overlay */}
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Button size="sm" variant="secondary" className="gap-1">
                            <Eye className="w-4 h-4" />
                            Preview
                          </Button>
                        </div>
                        
                        {/* Category indicator */}
                        <div className={`absolute top-2 right-2 w-6 h-6 rounded-full ${category.color} flex items-center justify-center shadow`}>
                          <category.icon className="w-3 h-3 text-white" />
                        </div>
                        
                        {/* Favorite star */}
                        {resume.is_favorite && (
                          <div className="absolute top-2 left-2">
                            <Star className="w-5 h-5 text-yellow-500 fill-yellow-500 drop-shadow" />
                          </div>
                        )}
                      </div>
                      
                      <div className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold truncate text-sm">{resume.name || "Untitled Resume"}</h3>
                            <p className="text-xs text-muted-foreground truncate">
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
                              <DropdownMenuItem onClick={() => setPreviewDialog({ open: true, resume })}>
                                <Eye className="w-4 h-4 mr-2" />
                                Preview
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => navigate(`/builder?id=${resume.id}`)}>
                                <Edit className="w-4 h-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => navigate(`/analysis?id=${resume.id}`)}>
                                <BarChart3 className="w-4 h-4 mr-2" />
                                Analyze
                              </DropdownMenuItem>
                              {resume.template_id && TEMPLATE_MAP[resume.template_id] && (
                                <DropdownMenuItem onClick={() => {
                                  setPreviewDialog({ open: true, resume });
                                  // Small delay to let dialog render, then export
                                  setTimeout(() => exportToPDF(resume), 500);
                                }}>
                                  <Download className="w-4 h-4 mr-2" />
                                  Download PDF
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
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
                        
                        {/* ATS Score & Badges */}
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          {resume.ats_score !== undefined && resume.ats_score !== null ? (
                            <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-semibold ${
                              resume.ats_score >= 80 ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
                              resume.ats_score >= 60 ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" :
                              "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                            }`}>
                              <Gauge className="w-3 h-3" />
                              {resume.ats_score}%
                            </div>
                          ) : (
                            <Badge variant="outline" className="text-xs gap-1">
                              <Target className="w-3 h-3" />
                              Not analyzed
                            </Badge>
                          )}
                          {resume.template_id && (
                            <Badge variant="outline" className="text-xs gap-1 border-primary/50 text-primary">
                              <Layout className="w-3 h-3" />
                              Template
                            </Badge>
                          )}
                        </div>
                        
                        {/* Tags */}
                        {resume.tags && resume.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-2">
                            {resume.tags.slice(0, 2).map(tag => (
                              <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0">
                                {tag}
                              </Badge>
                            ))}
                            {resume.tags.length > 2 && (
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                +{resume.tags.length - 2}
                              </Badge>
                            )}
                          </div>
                        )}
                        
                        {/* Meta Info */}
                        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDate(resume.updated_at)}
                          </span>
                        </div>
                      </div>
                      
                      {/* Quick Actions - Always visible */}
                      <div className="border-t p-2 flex gap-1 bg-muted/30">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="flex-1 h-8 text-xs"
                          onClick={() => setPreviewDialog({ open: true, resume })}
                        >
                          <Eye className="w-3 h-3 mr-1" />
                          Preview
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="flex-1 h-8 text-xs"
                          onClick={() => navigate(`/builder?id=${resume.id}`)}
                        >
                          <Edit className="w-4 h-4 mr-1" />
                          Edit
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="flex-1 h-8 text-xs"
                          onClick={() => navigate(`/analysis?id=${resume.id}`)}
                        >
                          <BarChart3 className="w-3 h-3 mr-1" />
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
                    
                    {resume.template_id && (
                      <Badge variant="outline" className="hidden sm:flex gap-1 border-primary/50 text-primary">
                        <Layout className="w-3 h-3" />
                        Template
                      </Badge>
                    )}

                    {resume.ats_score !== undefined && resume.ats_score !== null && (
                      <Badge 
                        variant="outline" 
                        className={`hidden sm:flex gap-1 ${
                          resume.ats_score >= 80 ? "border-green-500 text-green-600" :
                          resume.ats_score >= 60 ? "border-yellow-500 text-yellow-600" :
                          "border-red-500 text-red-600"
                        }`}
                      >
                        <Gauge className="w-3 h-3" />
                        {resume.ats_score}%
                      </Badge>
                    )}

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
                        onClick={() => setPreviewDialog({ open: true, resume })}
                        title="Preview"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => navigate(`/builder?id=${resume.id}`)}
                        title="Edit"
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
                          <DropdownMenuItem onClick={() => setPreviewDialog({ open: true, resume })}>
                            <Eye className="w-4 h-4 mr-2" />
                            Preview
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => navigate(`/analysis?id=${resume.id}`)}>
                            <BarChart3 className="w-4 h-4 mr-2" />
                            Analyze
                          </DropdownMenuItem>
                          {resume.template_id && TEMPLATE_MAP[resume.template_id] && (
                            <DropdownMenuItem onClick={() => {
                              setPreviewDialog({ open: true, resume });
                              setTimeout(() => exportToPDF(resume), 500);
                            }}>
                              <Download className="w-4 h-4 mr-2" />
                              Download PDF
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
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

      {/* Resume Preview Dialog */}
      <Dialog open={previewDialog.open} onOpenChange={(open) => { setPreviewDialog({ open, resume: null }); setPreviewMode("template"); }}>
        <DialogContent className="max-w-[95vw] w-[900px] max-h-[95vh] p-0 overflow-hidden">
          {previewDialog.resume && (
            <>
              {/* Header */}
              <div className="p-4 border-b bg-muted/30 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div>
                    <h2 className="font-bold text-lg">{previewDialog.resume.name || "Untitled Resume"}</h2>
                    <p className="text-sm text-muted-foreground">
                      Last updated: {formatDate(previewDialog.resume.updated_at)}
                    </p>
                  </div>
                  {/* View mode toggle */}
                  <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
                    <Button
                      size="sm"
                      variant={previewMode === "template" ? "secondary" : "ghost"}
                      className="h-7 text-xs"
                      onClick={() => setPreviewMode("template")}
                    >
                      <Layout className="w-3 h-3 mr-1" />
                      Template
                    </Button>
                    <Button
                      size="sm"
                      variant={previewMode === "text" ? "secondary" : "ghost"}
                      className="h-7 text-xs"
                      onClick={() => setPreviewMode("text")}
                    >
                      <FileText className="w-3 h-3 mr-1" />
                      Text
                    </Button>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {previewDialog.resume.ats_score !== undefined && previewDialog.resume.ats_score !== null && (
                    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold ${
                      previewDialog.resume.ats_score >= 80 ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
                      previewDialog.resume.ats_score >= 60 ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" :
                      "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                    }`}>
                      <Gauge className="w-4 h-4" />
                      {previewDialog.resume.ats_score}%
                    </div>
                  )}
                  {previewDialog.resume.template_id && (
                    <Badge variant="outline" className="gap-1 capitalize">
                      <Layout className="w-3 h-3" />
                      {previewDialog.resume.template_id.replace(/(\d+)/, ' $1')}
                    </Badge>
                  )}
                </div>
              </div>
              
              {/* Preview Content */}
              <div className="h-[70vh] overflow-auto bg-gray-100 dark:bg-gray-900">
                {previewMode === "template" && previewDialog.resume.template_id && TEMPLATE_MAP[previewDialog.resume.template_id] ? (
                  // Template View - A4 sized for accurate preview and export
                  <div className="p-6 flex justify-center" style={{ minWidth: "fit-content" }}>
                    <div 
                      ref={previewRef}
                      className="bg-white shadow-2xl"
                      style={{ 
                        transform: "scale(0.75)",
                        transformOrigin: "top center",
                      }}
                    >
                      {(() => {
                        const TemplateComponent = TEMPLATE_MAP[previewDialog.resume.template_id!];
                        return <TemplateComponent data={getTemplateData(previewDialog.resume)} isPreview={false} />;
                      })()}
                    </div>
                  </div>
                ) : (
                  // Text View (fallback)
                  <div className="p-6">
                    {/* Contact Section */}
                    <div className="mb-6 pb-6 border-b">
                      <h1 className="text-2xl font-bold mb-2">
                        {previewDialog.resume.content?.contact?.name || "Your Name"}
                      </h1>
                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                        {previewDialog.resume.content?.contact?.email && (
                          <span className="flex items-center gap-1">
                            <Mail className="w-4 h-4" />
                          {previewDialog.resume.content.contact.email}
                        </span>
                      )}
                      {previewDialog.resume.content?.contact?.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-4 h-4" />
                          {previewDialog.resume.content.contact.phone}
                        </span>
                      )}
                      {previewDialog.resume.content?.contact?.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          {previewDialog.resume.content.contact.location}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {/* Summary */}
                  {previewDialog.resume.content?.summary && (
                    <div className="mb-6">
                      <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-primary" />
                        Professional Summary
                      </h2>
                      <p className="text-muted-foreground leading-relaxed">
                        {previewDialog.resume.content.summary}
                      </p>
                    </div>
                  )}
                  
                  {/* Experience */}
                  {previewDialog.resume.content?.experience?.length > 0 && (
                    <div className="mb-6">
                      <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                        <Briefcase className="w-4 h-4 text-primary" />
                        Work Experience
                      </h2>
                      <div className="space-y-4">
                        {previewDialog.resume.content.experience.map((exp: any, i: number) => (
                          <div key={i} className="border-l-2 border-primary/30 pl-4">
                            <div className="flex justify-between items-start mb-1">
                              <div>
                                <h3 className="font-semibold">{exp.title}</h3>
                                <p className="text-sm text-muted-foreground">{exp.company}{exp.location ? ` • ${exp.location}` : ''}</p>
                              </div>
                              <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                                {exp.startDate} - {exp.current ? "Present" : exp.endDate}
                              </span>
                            </div>
                            {exp.bullets && exp.bullets.length > 0 && (
                              <ul className="mt-2 space-y-1">
                                {exp.bullets.map((bullet: string, j: number) => (
                                  <li key={j} className="text-sm text-muted-foreground flex gap-2">
                                    <span className="text-primary">•</span>
                                    {bullet}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Education */}
                  {previewDialog.resume.content?.education?.length > 0 && (
                    <div className="mb-6">
                      <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                        <GraduationCap className="w-4 h-4 text-primary" />
                        Education
                      </h2>
                      <div className="space-y-3">
                        {previewDialog.resume.content.education.map((edu: any, i: number) => (
                          <div key={i} className="flex justify-between items-start">
                            <div>
                              <h3 className="font-semibold">{edu.degree}</h3>
                              <p className="text-sm text-muted-foreground">{edu.school}{edu.location ? ` • ${edu.location}` : ''}</p>
                            </div>
                            <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                              {edu.graduationDate}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Skills */}
                  {previewDialog.resume.content?.skills?.length > 0 && (
                    <div className="mb-6">
                      <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-primary" />
                        Skills
                      </h2>
                      <div className="flex flex-wrap gap-2">
                        {previewDialog.resume.content.skills.map((skill: string, i: number) => (
                          <Badge key={i} variant="secondary">{skill}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Raw text fallback */}
                  {previewDialog.resume.content?.rawText && !previewDialog.resume.content?.contact?.name && (
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {previewDialog.resume.content.rawText}
                      </p>
                    </div>
                  )}
                  
                  {/* No template message */}
                  {!previewDialog.resume.template_id && (
                    <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                      <p className="text-sm text-yellow-800 dark:text-yellow-200 flex items-center gap-2">
                        <Layout className="w-4 h-4" />
                        This resume doesn't have a template. Click "Edit in Builder" to choose one.
                      </p>
                    </div>
                  )}
                </div>
                )}
              </div>
              
              {/* Footer Actions */}
              <div className="p-4 border-t bg-muted/30 flex justify-between">
                <Button variant="outline" onClick={() => setPreviewDialog({ open: false, resume: null })}>
                  Close
                </Button>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => {
                    setPreviewDialog({ open: false, resume: null });
                    navigate(`/analysis?id=${previewDialog.resume?.id}`);
                  }}>
                    <BarChart3 className="w-4 h-4 mr-2" />
                    Analyze
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => openInBuilder(previewDialog.resume!)}
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Edit in Builder
                  </Button>
                  {previewDialog.resume.template_id && TEMPLATE_MAP[previewDialog.resume.template_id] && (
                    <Button 
                      onClick={() => exportToPDF(previewDialog.resume!)}
                      disabled={isExporting}
                    >
                      {isExporting ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                          Exporting...
                        </>
                      ) : (
                        <>
                          <Download className="w-4 h-4 mr-2" />
                          Download PDF
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
