import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useDropzone } from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Upload as UploadIcon, 
  FileText, 
  Image as ImageIcon, 
  Linkedin,
  Pencil,
  Trash2,
  Download,
  Search,
  Plus,
  X,
  Check,
  Eye,
  Filter,
  Tag as TagIcon,
  FolderOpen,
  StickyNote,
  Briefcase,
  Sparkles
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { parseResume } from "@/lib/resumeParser";
import { parseLinkedInText } from "@/lib/linkedinParser";
import { supabase } from "@/integrations/supabase/client";
import { createPDFFromText, downloadPDF } from "@/lib/pdfService";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ResumeEditor } from "@/components/ResumeEditor";

interface SavedResume {
  id: string;
  name: string;
  content: string;
  file_type: string;
  file_data?: string | null; // Base64 encoded original PDF
  category?: string | null;
  tags?: string[] | null;
  notes?: string | null;
  job_application_id?: string | null;
  created_at: string;
  updated_at: string;
}

interface CoverLetter {
  id: string;
  resume_id: string | null;
  content: string;
  job_description: string | null;
  tone: string | null;
  category: string | null;
  tags: string[];
  notes: string | null;
  created_at: string;
}

export default function Upload() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [fileName, setFileName] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadMethod, setUploadMethod] = useState<"file" | "image" | "linkedin">("file");
  const [linkedinText, setLinkedinText] = useState("");
  const [ocrProgress, setOcrProgress] = useState(0);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  
  // Resume Manager states
  const [savedResumes, setSavedResumes] = useState<SavedResume[]>([]);
  const [coverLetters, setCoverLetters] = useState<CoverLetter[]>([]);
  const [isLoadingResumes, setIsLoadingResumes] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterTags, setFilterTags] = useState<string[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [resumeToDelete, setResumeToDelete] = useState<string | null>(null);
  const [editingResumeId, setEditingResumeId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [viewingResume, setViewingResume] = useState<SavedResume | null>(null);
  const [editingContent, setEditingContent] = useState<SavedResume | null>(null);
  const [editedText, setEditedText] = useState("");
  const [editingMetadata, setEditingMetadata] = useState<SavedResume | null>(null);
  const [newTag, setNewTag] = useState("");
  const [tempCategory, setTempCategory] = useState<string>("");
  const [tempTags, setTempTags] = useState<string[]>([]);
  const [tempNotes, setTempNotes] = useState<string>("");
  const [sortBy, setSortBy] = useState<"date" | "name">("date");
  const [availableCategories] = useState([
    "Software Engineering",
    "Product Management",
    "Design & UX",
    "Marketing",
    "Sales",
    "Data Science",
    "Finance",
    "Operations",
    "Executive",
    "Other"
  ]);
  
  // Job description dialog states
  const [jobDescDialogOpen, setJobDescDialogOpen] = useState(false);
  const [jobDescriptionInput, setJobDescriptionInput] = useState("");
  const [resumeToAnalyze, setResumeToAnalyze] = useState<SavedResume | null>(null);
  const [actionType, setActionType] = useState<"analyze" | "rewrite">("analyze");
  
  // PDF preview state
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);

  // Load saved resumes on mount
  useEffect(() => {
    loadSavedResumes();
  }, []);

  const loadSavedResumes = async () => {
    setIsLoadingResumes(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('resumes')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Enrich resumes with PDF data from localStorage
      const enrichedResumes = (data || []).map(resume => {
        const storedPdf = localStorage.getItem(`resume_pdf_${resume.id}`);
        return {
          ...resume,
          file_data: storedPdf || null,
        };
      });
      
      setSavedResumes(enrichedResumes);

      // Fetch cover letters
      const { data: clData, error: clError } = await supabase
        .from('cover_letters')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (clError) throw clError;
      setCoverLetters(clData || []);
    } catch (error) {
      console.error("Error loading resumes:", error);
      toast({
        title: "Error",
        description: "Failed to load your resumes",
        variant: "destructive",
      });
    } finally {
      setIsLoadingResumes(false);
    }
  };

  const saveResumeToDatabase = async (content: string, filename: string, fileType: string, fileData?: string | null) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const insertData: any = {
        user_id: user.id,
        name: filename,
        content: content,
        original_filename: filename,
        file_type: fileType,
      };

      const { data, error } = await supabase.from('resumes').insert(insertData).select().single();

      if (error) throw error;
      
      // Store original PDF data in localStorage (since DB may not have file_data column)
      if (fileData && data?.id) {
        try {
          localStorage.setItem(`resume_pdf_${data.id}`, fileData);
        } catch (e) {
          console.warn('Could not store PDF in localStorage (may be too large):', e);
        }
      }
      
      // Reload resumes after saving
      loadSavedResumes();
    } catch (error) {
      console.error("Error saving resume:", error);
    }
  };

  const deleteResume = async (id: string) => {
    try {
      const { error } = await supabase
        .from('resumes')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      // Clean up localStorage PDF data
      localStorage.removeItem(`resume_pdf_${id}`);

      toast({
        title: "Deleted",
        description: "Resume deleted successfully",
      });
      
      loadSavedResumes();
    } catch (error) {
      console.error("Error deleting resume:", error);
      toast({
        title: "Error",
        description: "Failed to delete resume",
        variant: "destructive",
      });
    }
  };

  const updateResumeName = async (id: string, newName: string) => {
    try {
      const { error } = await supabase
        .from('resumes')
        .update({ name: newName })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Updated",
        description: "Resume name updated successfully",
      });
      
      loadSavedResumes();
      setEditingResumeId(null);
    } catch (error) {
      console.error("Error updating resume:", error);
      toast({
        title: "Error",
        description: "Failed to update resume name",
        variant: "destructive",
      });
    }
  };

  const viewResume = (resume: SavedResume) => {
    setViewingResume(resume);
  };

  const startEditingContent = (resume: SavedResume) => {
    setEditingContent(resume);
    setEditedText(resume.content);
  };

  const saveEditedContent = async () => {
    if (!editingContent) return;

    try {
      const { error } = await supabase
        .from('resumes')
        .update({ content: editedText })
        .eq('id', editingContent.id);

      if (error) throw error;

      toast({
        title: "Saved",
        description: "Resume content updated successfully",
      });

      loadSavedResumes();
      setEditingContent(null);
    } catch (error) {
      console.error("Error updating resume content:", error);
      toast({
        title: "Error",
        description: "Failed to save changes",
        variant: "destructive",
      });
    }
  };

  const downloadResumeAsText = (resume: SavedResume) => {
    const blob = new Blob([resume.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${resume.name}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadResumeAsPDF = async (resume: SavedResume) => {
    try {
      // If we have the original PDF, download it directly
      if (resume.file_data) {
        const binaryString = atob(resume.file_data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        
        const blob = new Blob([bytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = resume.name.endsWith('.pdf') ? resume.name : `${resume.name}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        toast({
          title: "✓ Original PDF Downloaded",
          description: `${resume.name} has been saved`,
        });
        return;
      }
      
      // Otherwise generate a new PDF from text
      toast({
        title: "Generating PDF...",
        description: "Creating PDF from extracted text",
      });
      
      const pdfBytes = await createPDFFromText(resume.content, {
        title: resume.name,
        author: 'CareerCraft User',
      });
      
      downloadPDF(pdfBytes, `${resume.name}.pdf`);
      
      toast({
        title: "✓ PDF Downloaded",
        description: `${resume.name}.pdf has been saved`,
      });
    } catch (error) {
      console.error('PDF generation error:', error);
      toast({
        title: "Error",
        description: "Failed to download PDF",
        variant: "destructive",
      });
    }
  };

  const onDrop = async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setIsProcessing(true);
    setOcrProgress(0);
    setFileName(file.name);

    try {
      const text = await parseResume(file, (progress) => {
        setOcrProgress(progress);
      });
      
      const fileType = file.type.startsWith('image/') ? 'image' : file.type === 'application/pdf' ? 'pdf' : 'doc';
      
      // Convert file to base64 for storage (for PDFs)
      let fileData: string | null = null;
      if (file.type === 'application/pdf') {
        const arrayBuffer = await file.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);
        fileData = btoa(bytes.reduce((data, byte) => data + String.fromCharCode(byte), ''));
      }
      
      // Save to database with original file data
      await saveResumeToDatabase(text, file.name, fileType, fileData);
      
      const displayType = file.type.startsWith('image/') ? 'Image' : file.type === 'application/pdf' ? 'PDF' : 'Document';
      
      toast({
        title: `✓ ${displayType} processed successfully`,
        description: `${file.name} parsed and saved. ${text.split(/\s+/).length} words extracted.`,
      });
      
      setShowUploadDialog(false);
      setFileName("");
    } catch (error) {
      console.error("Resume parsing error:", error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Could not parse the resume. Please try a different file.",
        variant: "destructive",
      });
      setFileName("");
    } finally {
      setIsProcessing(false);
      setOcrProgress(0);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: uploadMethod === "image" 
      ? {
          'image/png': ['.png'],
          'image/jpeg': ['.jpg', '.jpeg'],
          'image/webp': ['.webp'],
        }
      : {
          'application/pdf': ['.pdf'],
          'application/msword': ['.doc'],
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
        },
    maxFiles: 1,
  });

  const handleLinkedInImport = async () => {
    if (!linkedinText.trim()) {
      toast({
        title: "Error",
        description: "Please paste your LinkedIn profile text",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    try {
      const formatted = parseLinkedInText(linkedinText);
      
      await saveResumeToDatabase(formatted, "LinkedIn Profile", "text/linkedin");
      
      toast({
        title: "✓ LinkedIn profile imported",
        description: `Profile text processed and saved. ${formatted.split(/\s+/).length} words extracted.`,
      });
      setLinkedinText('');
      setShowUploadDialog(false);
    } catch (error) {
      console.error('LinkedIn import error:', error);
      toast({
        title: "Import failed",
        description: error instanceof Error ? error.message : "Failed to parse LinkedIn text",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const openMetadataEditor = (resume: SavedResume) => {
    setEditingMetadata(resume);
    setTempCategory(resume.category || "");
    setTempTags(resume.tags || []);
    setTempNotes(resume.notes || "");
  };

  const saveMetadata = async () => {
    if (!editingMetadata) return;

    try {
      const { error } = await supabase
        .from('resumes')
        .update({
          category: tempCategory || null,
          tags: tempTags,
          notes: tempNotes || null,
        })
        .eq('id', editingMetadata.id);

      if (error) throw error;

      toast({
        title: "✓ Saved",
        description: "Resume metadata updated successfully",
      });

      loadSavedResumes();
      setEditingMetadata(null);
    } catch (error) {
      console.error("Error updating metadata:", error);
      toast({
        title: "Error",
        description: "Failed to update metadata",
        variant: "destructive",
      });
    }
  };

  const addTag = (tag: string) => {
    if (tag.trim() && !tempTags.includes(tag.trim())) {
      setTempTags([...tempTags, tag.trim()]);
      setNewTag("");
    }
  };

  const removeTag = (tag: string) => {
    setTempTags(tempTags.filter(t => t !== tag));
  };

  // New functions for analyze and rewrite
  const analyzeResume = (resume: SavedResume) => {
    setResumeToAnalyze(resume);
    setActionType("analyze");
    setJobDescriptionInput("");
    setJobDescDialogOpen(true);
  };

  const rewriteResume = (resume: SavedResume) => {
    setResumeToAnalyze(resume);
    setActionType("rewrite");
    setJobDescriptionInput("");
    setJobDescDialogOpen(true);
  };

  const proceedWithAction = () => {
    if (!resumeToAnalyze || !jobDescriptionInput.trim()) {
      toast({
        title: "Missing Information",
        description: "Please provide a job description",
        variant: "destructive",
      });
      return;
    }

    // Set sessionStorage
    sessionStorage.setItem("resumeText", resumeToAnalyze.content);
    sessionStorage.setItem("jobDescription", jobDescriptionInput);
    sessionStorage.setItem("fileName", resumeToAnalyze.name);

    // Navigate
    if (actionType === "analyze") {
      navigate("/analysis");
    } else {
      navigate("/rewrite");
    }

    // Reset
    setJobDescDialogOpen(false);
    setResumeToAnalyze(null);
    setJobDescriptionInput("");
  };

  const allTags = Array.from(
    new Set(savedResumes.flatMap(r => r.tags || []))
  ).sort();

  const allCategories = Array.from(
    new Set(savedResumes.map(r => r.category).filter(Boolean))
  ).sort();

  const filteredResumes = savedResumes.filter(resume => {
    const matchesSearch = resume.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         resume.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (resume.notes && resume.notes.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesFileType = filterType === "all" || resume.file_type === filterType;
    const matchesCategory = filterCategory === "all" || resume.category === filterCategory;
    const matchesTags = filterTags.length === 0 || 
                        filterTags.every(tag => resume.tags?.includes(tag));
    return matchesSearch && matchesFileType && matchesCategory && matchesTags;
  });

  const sortedResumes = [...filteredResumes].sort((a, b) => {
    if (sortBy === "date") {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
    return a.name.localeCompare(b.name);
  });

  const getFileTypeIcon = (fileType: string) => {
    if (fileType === 'pdf') return <FileText className="w-4 h-4" />;
    if (fileType === 'image') return <ImageIcon className="w-4 h-4" />;
    if (fileType.includes('linkedin')) return <Linkedin className="w-4 h-4" />;
    return <FileText className="w-4 h-4" />;
  };

  const getFileTypeBadgeColor = (fileType: string) => {
    if (fileType === 'pdf') return 'bg-red-500/10 text-red-500 border-red-500/20';
    if (fileType === 'image') return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
    if (fileType.includes('linkedin')) return 'bg-blue-600/10 text-blue-600 border-blue-600/20';
    return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <button onClick={() => navigate("/dashboard")} className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center">
              <FileText className="w-4 h-4 text-white" />
            </div>
            <span className="text-xl font-bold">CareerCraft</span>
          </button>
          <Button variant="ghost" onClick={() => navigate("/dashboard")}>
            Back to Dashboard
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Header Section */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-4xl font-bold mb-2 bg-gradient-hero bg-clip-text text-transparent">
                Resume Manager
              </h1>
              <p className="text-muted-foreground">
                Organize, track, and manage all your resumes in one place
              </p>
            </div>
            <Button
              onClick={() => setShowUploadDialog(true)}
              size="lg"
              className="gap-2"
            >
              <Plus className="w-5 h-5" />
              Add Resume
            </Button>
          </div>

          {/* Dashboard Stats */}
          {savedResumes.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Resumes</p>
                    <p className="text-2xl font-bold">{savedResumes.length}</p>
                  </div>
                  <FileText className="w-8 h-8 text-primary/50" />
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Categories</p>
                    <p className="text-2xl font-bold">{allCategories.length}</p>
                  </div>
                  <FolderOpen className="w-8 h-8 text-blue-500/50" />
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Unique Tags</p>
                    <p className="text-2xl font-bold">{allTags.length}</p>
                  </div>
                  <TagIcon className="w-8 h-8 text-green-500/50" />
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">With Notes</p>
                    <p className="text-2xl font-bold">
                      {savedResumes.filter(r => r.notes).length}
                    </p>
                  </div>
                  <StickyNote className="w-8 h-8 text-yellow-500/50" />
                </div>
              </Card>
            </div>
          )}

          {/* Search and Filter Bar */}
          <Card className="p-4 mb-6">
            <div className="space-y-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, content, or notes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* Filters Row */}
              <div className="flex flex-wrap gap-3">
                {/* File Type Filter */}
                <div className="flex gap-2">
                  <Badge variant="outline" className="text-xs">File Type:</Badge>
                  <Button
                    variant={filterType === "all" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFilterType("all")}
                  >
                    All
                  </Button>
                  <Button
                    variant={filterType === "pdf" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFilterType("pdf")}
                  >
                    PDF
                  </Button>
                  <Button
                    variant={filterType === "image" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFilterType("image")}
                  >
                    Image
                  </Button>
                  <Button
                    variant={filterType === "text/linkedin" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFilterType("text/linkedin")}
                  >
                    LinkedIn
                  </Button>
                </div>

                {/* Category Filter */}
                {allCategories.length > 0 && (
                  <div className="flex gap-2 items-center border-l pl-3">
                    <Badge variant="outline" className="text-xs">Category:</Badge>
                    <Button
                      variant={filterCategory === "all" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setFilterCategory("all")}
                    >
                      All
                    </Button>
                    {allCategories.map((cat) => (
                      <Button
                        key={cat}
                        variant={filterCategory === cat ? "default" : "outline"}
                        size="sm"
                        onClick={() => setFilterCategory(cat || "all")}
                      >
                        {cat}
                      </Button>
                    ))}
                  </div>
                )}
              </div>

              {/* Tags Filter */}
              {allTags.length > 0 && (
                <div className="flex flex-wrap gap-2 items-center">
                  <Badge variant="outline" className="text-xs">Filter by Tags:</Badge>
                  {allTags.map((tag) => (
                    <Badge
                      key={tag}
                      variant={filterTags.includes(tag) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => {
                        if (filterTags.includes(tag)) {
                          setFilterTags(filterTags.filter(t => t !== tag));
                        } else {
                          setFilterTags([...filterTags, tag]);
                        }
                      }}
                    >
                      <TagIcon className="w-3 h-3 mr-1" />
                      {tag}
                    </Badge>
                  ))}
                  {filterTags.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setFilterTags([])}
                    >
                      Clear tags
                    </Button>
                  )}
                </div>
              )}

              {/* Results Count and Sort */}
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  Showing {filteredResumes.length} of {savedResumes.length} resumes
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Sort by:</span>
                  <Select value={sortBy} onValueChange={(v) => setSortBy(v as "date" | "name")}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="date">Date</SelectItem>
                      <SelectItem value="name">Name</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </Card>

          {/* Resume List */}
          {isLoadingResumes ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredResumes.length === 0 ? (
            <div className="text-center py-20">
              <FileText className="w-20 h-20 mx-auto text-muted-foreground/30 mb-6" />
              <h3 className="text-2xl font-semibold mb-2">
                {searchQuery || filterType !== "all" ? "No resumes found" : "No resumes yet"}
              </h3>
              <p className="text-muted-foreground mb-6">
                {searchQuery || filterType !== "all" 
                  ? "Try adjusting your search or filters" 
                  : "Upload your first resume to get started"}
              </p>
              <Button onClick={() => setShowUploadDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Resume
              </Button>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-6">
              <AnimatePresence>
                {sortedResumes.map((resume) => {
                  const pairedCoverLetters = coverLetters.filter(
                    (cl) => cl.resume_id === resume.id
                  );
                  return (
                    <motion.div
                      key={resume.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Card className="h-full hover:shadow-lg transition-all duration-300 border-2 hover:border-primary/50">
                        {/* PDF Preview Section */}
                        {resume.file_type === "pdf" && (
                          <div className="h-48 bg-gradient-to-br from-muted/50 to-muted/20 border-b border-border flex items-center justify-center overflow-hidden p-4">
                            <div className="text-center text-muted-foreground w-full">
                              <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                              <p className="text-xs line-clamp-4 leading-relaxed px-2">
                                {resume.content.substring(0, 200)}...
                              </p>
                            </div>
                          </div>
                        )}

                        <div className="p-6 space-y-4">
                        {/* Header */}
                        <div className="space-y-2">
                          {editingResumeId === resume.id ? (
                            <div className="flex gap-2">
                              <Input
                                value={editingName}
                                onChange={(e) => setEditingName(e.target.value)}
                                className="flex-1"
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    updateResumeName(resume.id, editingName);
                                  } else if (e.key === 'Escape') {
                                    setEditingResumeId(null);
                                  }
                                }}
                              />
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => updateResumeName(resume.id, editingName)}
                              >
                                <Check className="w-4 h-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => setEditingResumeId(null)}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-start justify-between gap-2">
                              <h3 className="font-bold text-lg line-clamp-2 flex-1">
                                {resume.name}
                              </h3>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8"
                                onClick={() => {
                                  setEditingResumeId(resume.id);
                                  setEditingName(resume.name);
                                }}
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                            </div>
                          )}

                          {/* Meta Info */}
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className={`${getFileTypeBadgeColor(resume.file_type)} flex items-center gap-1`}>
                              {getFileTypeIcon(resume.file_type)}
                              {resume.file_type}
                            </Badge>
                            {resume.file_data && (
                              <Badge variant="secondary" className="bg-green-500/10 text-green-600 border-green-500/20 flex items-center gap-1">
                                <Eye className="w-3 h-3" />
                                PDF Preview
                              </Badge>
                            )}
                            {resume.category && (
                              <Badge variant="outline" className="bg-purple-500/10 text-purple-600 border-purple-500/20 flex items-center gap-1">
                                <FolderOpen className="w-3 h-3" />
                                {resume.category}
                              </Badge>
                            )}
                            <span className="text-xs text-muted-foreground">
                              {new Date(resume.created_at).toLocaleDateString()}
                            </span>
                          </div>

                          {/* Tags */}
                          {resume.tags && resume.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {resume.tags.slice(0, 3).map((tag) => (
                                <Badge key={tag} variant="secondary" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                              {resume.tags.length > 3 && (
                                <Badge variant="secondary" className="text-xs">
                                  +{resume.tags.length - 3} more
                                </Badge>
                              )}
                            </div>
                          )}

                          {/* Notes Preview */}
                          {resume.notes && (
                            <div className="flex items-start gap-1 p-2 bg-yellow-500/10 border border-yellow-500/20 rounded text-xs">
                              <StickyNote className="w-3 h-3 text-yellow-600 flex-shrink-0 mt-0.5" />
                              <p className="text-yellow-700 dark:text-yellow-500 line-clamp-2">
                                {resume.notes}
                              </p>
                            </div>
                          )}

                          {/* Preview */}
                          <p className="text-sm text-muted-foreground line-clamp-3">
                            {resume.content.substring(0, 120)}...
                          </p>

                          {/* Word Count */}
                          <div className="text-xs text-muted-foreground">
                            {resume.content.split(/\s+/).length} words
                          </div>
                        </div>

                        {/* Paired Cover Letters */}
                        {pairedCoverLetters.length > 0 && (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                              <FileText className="w-3 h-3" />
                              <span className="font-medium">
                                {pairedCoverLetters.length} paired cover {pairedCoverLetters.length === 1 ? 'letter' : 'letters'}
                              </span>
                            </div>
                            <div className="space-y-2">
                              {pairedCoverLetters.map((cl) => (
                                <div key={cl.id} className="bg-accent/30 rounded-lg p-3 text-xs border border-border">
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="font-semibold text-foreground">Cover Letter</span>
                                    <span className="text-muted-foreground">
                                      {new Date(cl.created_at).toLocaleDateString()}
                                    </span>
                                  </div>
                                  <div className="flex flex-wrap gap-1">
                                    {cl.category && (
                                      <Badge variant="secondary" className="text-xs">
                                        <FolderOpen className="w-2.5 h-2.5 mr-1" />
                                        {cl.category}
                                      </Badge>
                                    )}
                                    {cl.tone && (
                                      <Badge variant="outline" className="text-xs">
                                        {cl.tone}
                                      </Badge>
                                    )}
                                    {cl.tags && cl.tags.length > 0 && cl.tags.slice(0, 2).map((tag) => (
                                      <Badge key={tag} variant="secondary" className="text-xs">
                                        {tag}
                                      </Badge>
                                    ))}
                                    {cl.tags && cl.tags.length > 2 && (
                                      <Badge variant="secondary" className="text-xs">
                                        +{cl.tags.length - 2}
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Actions */}
                        <div className="space-y-2 pt-2 border-t">
                          <div className="grid grid-cols-2 gap-2">
                            <Button
                              size="sm"
                              variant="hero"
                              onClick={() => analyzeResume(resume)}
                              className="gap-1"
                            >
                              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M3 3v18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                <path d="M18 17l-4-4-4 4-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                              Analyze
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => rewriteResume(resume)}
                              className="gap-1"
                            >
                              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M12 2L2 7l10 5 10-5-10-5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                <path d="M2 17l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                <path d="M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                              AI Rewrite
                            </Button>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => viewResume(resume)}
                              className="gap-1"
                            >
                              <Eye className="w-3 h-3" />
                              View
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => startEditingContent(resume)}
                              className="gap-1"
                            >
                              <Pencil className="w-3 h-3" />
                              Edit
                            </Button>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openMetadataEditor(resume)}
                              className="gap-1"
                            >
                              <TagIcon className="w-3 h-3" />
                              Organize
                            </Button>
                            <Button
                              size="sm"
                              variant="hero"
                              onClick={() => downloadResumeAsPDF(resume)}
                              className="gap-1"
                            >
                              <Download className="w-3 h-3" />
                              PDF
                            </Button>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => downloadResumeAsText(resume)}
                              className="gap-1"
                            >
                              <FileText className="w-3 h-3" />
                              TXT
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => {
                                setResumeToDelete(resume.id);
                                setDeleteDialogOpen(true);
                              }}
                              className="gap-1"
                            >
                              <Trash2 className="w-3 h-3" />
                              Delete
                            </Button>
                          </div>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </motion.div>
      </div>

      {/* Upload Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">Add New Resume</DialogTitle>
            <DialogDescription>
              Upload a resume file, scan an image, or import from LinkedIn
            </DialogDescription>
          </DialogHeader>

          <Tabs value={uploadMethod} onValueChange={(v) => setUploadMethod(v as any)}>
            <TabsList className="grid grid-cols-3 w-full">
              <TabsTrigger value="file" className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                File
              </TabsTrigger>
              <TabsTrigger value="image" className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4" />
                Photo
              </TabsTrigger>
              <TabsTrigger value="linkedin" className="flex items-center gap-2">
                <Linkedin className="w-4 h-4" />
                LinkedIn
              </TabsTrigger>
            </TabsList>

            {/* File Upload Tab */}
            <TabsContent value="file" className="mt-4">
              <div
                {...getRootProps()}
                className={`relative border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all duration-300 ${
                  isDragActive
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary hover:bg-accent/30"
                }`}
              >
                <input {...getInputProps()} />
                <motion.div
                  animate={isProcessing ? { scale: [1, 1.1, 1] } : {}}
                  transition={{ repeat: isProcessing ? Infinity : 0, duration: 1.5 }}
                >
                  <UploadIcon className={`w-16 h-16 mx-auto mb-4 ${
                    isDragActive ? "text-primary" : "text-muted-foreground"
                  }`} />
                </motion.div>
                
                {isProcessing ? (
                  <div className="space-y-3">
                    <p className="text-lg font-semibold">Processing...</p>
                    <div className="w-64 h-2 bg-muted rounded-full mx-auto overflow-hidden">
                      <motion.div 
                        className="h-full bg-gradient-hero"
                        initial={{ width: "0%" }}
                        animate={{ width: "100%" }}
                        transition={{ duration: 2, ease: "easeInOut", repeat: Infinity }}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-lg font-semibold">
                      {isDragActive ? "Drop your resume here" : "Upload resume file"}
                    </p>
                    <p className="text-sm text-muted-foreground">PDF, DOC, or DOCX</p>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Image Upload Tab */}
            <TabsContent value="image" className="mt-4">
              <div
                {...getRootProps()}
                className={`relative border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all duration-300 ${
                  isDragActive
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary hover:bg-accent/30"
                }`}
              >
                <input {...getInputProps()} />
                <motion.div
                  animate={isProcessing ? { scale: [1, 1.1, 1] } : {}}
                  transition={{ repeat: isProcessing ? Infinity : 0, duration: 1.5 }}
                >
                  <ImageIcon className={`w-16 h-16 mx-auto mb-4 ${
                    isDragActive ? "text-primary" : "text-muted-foreground"
                  }`} />
                </motion.div>
                
                {isProcessing ? (
                  <div className="space-y-3">
                    <p className="text-lg font-semibold">Scanning with OCR...</p>
                    {ocrProgress > 0 && (
                      <div className="w-64 h-2 bg-muted rounded-full mx-auto overflow-hidden">
                        <motion.div 
                          className="h-full bg-gradient-hero"
                          style={{ width: `${ocrProgress}%` }}
                        />
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {ocrProgress > 0 ? `${ocrProgress}% complete` : 'Starting OCR...'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-lg font-semibold">
                      {isDragActive ? "Drop your image here" : "Upload resume image"}
                    </p>
                    <p className="text-sm text-muted-foreground">JPG, PNG, or WEBP</p>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* LinkedIn Tab */}
            <TabsContent value="linkedin" className="mt-4 space-y-4">
              <Card className="p-4 bg-accent/30">
                <p className="text-sm text-muted-foreground">
                  Copy your entire LinkedIn profile and paste it here. We'll format it into a resume.
                </p>
              </Card>
              
              <Input
                placeholder="Paste your LinkedIn profile text..."
                value={linkedinText}
                onChange={(e) => setLinkedinText(e.target.value)}
                className="min-h-[200px]"
              />

              <Button 
                onClick={handleLinkedInImport}
                className="w-full"
                disabled={!linkedinText.trim() || isProcessing}
              >
                <Linkedin className="w-4 h-4 mr-2" />
                Import LinkedIn Profile
              </Button>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* View Resume Dialog - Full Content */}
      <Dialog open={!!viewingResume} onOpenChange={() => { setViewingResume(null); setPdfPreviewUrl(null); }}>
        <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">{viewingResume?.name}</DialogTitle>
            <DialogDescription>
              {viewingResume?.file_data ? 'Original PDF preview' : 'Extracted text content'}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 flex flex-col gap-4 min-h-0">
            {/* Stats Bar */}
            <div className="flex items-center gap-3 p-3 bg-accent/50 rounded-lg flex-wrap">
              <Badge variant="outline" className={getFileTypeBadgeColor(viewingResume?.file_type || '')}>
                {getFileTypeIcon(viewingResume?.file_type || '')}
                {viewingResume?.file_type}
              </Badge>
              {viewingResume?.file_data && (
                <Badge variant="secondary" className="bg-green-500/10 text-green-600 border-green-500/20">
                  <FileText className="w-3 h-3 mr-1" />
                  Original PDF
                </Badge>
              )}
              <span className="text-sm text-muted-foreground">
                {viewingResume && new Date(viewingResume.created_at).toLocaleDateString()}
              </span>
              <div className="flex items-center gap-3 ml-auto text-sm">
                <span className="font-medium">
                  {viewingResume?.content.split(/\s+/).filter(w => w.length > 0).length || 0} words
                </span>
                <span className="text-muted-foreground">•</span>
                <span className="font-medium">
                  {viewingResume?.content.length || 0} chars
                </span>
              </div>
            </div>

            {/* PDF Preview or Text Content */}
            {viewingResume?.file_data ? (
              <div className="flex-1 overflow-hidden rounded-lg border-2 min-h-[60vh] bg-gray-100 dark:bg-gray-900">
                <iframe
                  src={`data:application/pdf;base64,${viewingResume.file_data}`}
                  className="w-full h-full min-h-[60vh]"
                  title="PDF Preview"
                  style={{ border: 'none' }}
                />
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto border-2 rounded-lg p-8 bg-white dark:bg-gray-950 min-h-[60vh] shadow-inner">
                <div className="max-w-4xl mx-auto">
                  <div className="whitespace-pre-wrap text-sm leading-relaxed break-words">
                    {viewingResume?.content || "No content available"}
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2 pt-2 border-t">
              <Button
                onClick={() => {
                  if (viewingResume) {
                    startEditingContent(viewingResume);
                    setViewingResume(null);
                  }
                }}
                size="lg"
                className="flex-1 min-w-[140px]"
              >
                <Pencil className="w-4 h-4 mr-2" />
                Edit Content
              </Button>
              <Button
                onClick={() => viewingResume && downloadResumeAsPDF(viewingResume)}
                variant="hero"
                size="lg"
                className="flex-1 min-w-[140px]"
              >
                <Download className="w-4 h-4 mr-2" />
                Download PDF
              </Button>
              <Button
                onClick={() => viewingResume && downloadResumeAsText(viewingResume)}
                variant="outline"
                size="lg"
                className="flex-1 min-w-[140px]"
              >
                <FileText className="w-4 h-4 mr-2" />
                Download TXT
              </Button>
              <Button
                variant="ghost"
                onClick={() => setViewingResume(null)}
                size="lg"
              >
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Resume Content Dialog - Full Screen Editor */}
      <Dialog open={!!editingContent} onOpenChange={() => setEditingContent(null)}>
        <DialogContent className="max-w-[95vw] w-full max-h-[95vh] h-[95vh] p-0 overflow-hidden">
          {editingContent && (
            <ResumeEditor
              initialContent={editingContent.content}
              originalPdfData={editingContent.file_data}
              resumeName={editingContent.name}
              onSave={async (content) => {
                try {
                  const { error } = await supabase
                    .from('resumes')
                    .update({ content, updated_at: new Date().toISOString() })
                    .eq('id', editingContent.id);

                  if (error) throw error;

                  toast({
                    title: "✓ Resume Updated",
                    description: "Your changes have been saved",
                  });
                  
                  loadSavedResumes();
                  setEditingContent(null);
                } catch (error) {
                  console.error('Error saving resume:', error);
                  toast({
                    title: "Error",
                    description: "Failed to save changes",
                    variant: "destructive",
                  });
                }
              }}
              onClose={() => setEditingContent(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Metadata Editor Dialog - Improved UX */}
      <Dialog open={!!editingMetadata} onOpenChange={() => setEditingMetadata(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl flex items-center gap-2 pb-2">
              <TagIcon className="w-6 h-6 text-primary" />
              Organize Resume
            </DialogTitle>
            <DialogDescription className="text-base">
              {editingMetadata?.name}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Category Selection */}
            <div className="space-y-3">
              <label className="text-sm font-semibold flex items-center gap-2">
                <FolderOpen className="w-4 h-4 text-blue-600" />
                Category
              </label>
              <Select 
                value={tempCategory || "none"} 
                onValueChange={(val) => setTempCategory(val === "none" ? "" : val)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Category</SelectItem>
                  {availableCategories.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Tags Management */}
            <div className="space-y-3">
              <label className="text-sm font-semibold flex items-center gap-2">
                <TagIcon className="w-4 h-4 text-green-600" />
                Tags
              </label>
              
              {/* Current Tags */}
              <div className="flex flex-wrap gap-2 min-h-[60px] p-4 border-2 border-dashed rounded-lg bg-accent/20">
                {tempTags.length > 0 ? (
                  tempTags.map((tag) => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="gap-1 px-3 py-1.5 text-sm cursor-pointer hover:bg-destructive hover:text-destructive-foreground transition-colors"
                      onClick={() => removeTag(tag)}
                    >
                      {tag}
                      <X className="w-3.5 h-3.5" />
                    </Badge>
                  ))
                ) : (
                  <span className="text-sm text-muted-foreground">No tags yet - add some below</span>
                )}
              </div>

              {/* Add Tag Input */}
              <div className="flex gap-2">
                <Input
                  placeholder="Add tag (e.g., React, Senior, Remote)"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addTag(newTag);
                    }
                  }}
                  className="flex-1"
                />
                <Button
                  onClick={() => addTag(newTag)}
                  disabled={!newTag.trim()}
                  type="button"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add
                </Button>
              </div>

              {/* Suggested Tags */}
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Quick add:</p>
                <div className="flex flex-wrap gap-2">
                  {["React", "TypeScript", "Python", "Senior", "Mid-Level", "Junior", "Remote", "Full-time", "Contract", "Leadership"].map((suggestedTag) => (
                    <Badge
                      key={suggestedTag}
                      variant="outline"
                      className="cursor-pointer hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors"
                      onClick={() => addTag(suggestedTag)}
                    >
                      + {suggestedTag}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-3">
              <label className="text-sm font-semibold flex items-center gap-2">
                <StickyNote className="w-4 h-4 text-yellow-600" />
                Internal Notes
              </label>
              <textarea
                placeholder="Add internal notes or comments about this resume...&#10;&#10;For example:&#10;- Interview scheduled for next week&#10;- Strong Python background&#10;- Referred by John"
                className="w-full min-h-[120px] p-4 border-2 rounded-lg bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                value={tempNotes}
                onChange={(e) => setTempNotes(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                {tempNotes.length} / 1000 characters
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4 border-t">
              <Button
                onClick={saveMetadata}
                className="flex-1"
                size="lg"
              >
                <Check className="w-4 h-4 mr-2" />
                Save Changes
              </Button>
              <Button
                variant="outline"
                onClick={() => setEditingMetadata(null)}
                size="lg"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Resume?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this resume from your account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (resumeToDelete) {
                  deleteResume(resumeToDelete);
                  setDeleteDialogOpen(false);
                  setResumeToDelete(null);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Job Description Dialog */}
      <Dialog open={jobDescDialogOpen} onOpenChange={setJobDescDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl flex items-center gap-2">
              <Briefcase className="w-6 h-6 text-primary" />
              {actionType === "analyze" ? "Analyze Resume" : "AI Rewrite Resume"}
            </DialogTitle>
            <DialogDescription>
              Paste the job description to {actionType === "analyze" ? "analyze your resume's compatibility" : "optimize your resume with AI"}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold">
                Resume to {actionType}:
              </label>
              <Card className="p-4 bg-accent/30">
                <p className="font-semibold">{resumeToAnalyze?.name}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {resumeToAnalyze?.content.split(/\s+/).length} words
                </p>
              </Card>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold">
                Job Description <span className="text-destructive">*</span>
              </label>
              <textarea
                placeholder="Paste the complete job description here...&#10;&#10;Include:&#10;- Job responsibilities&#10;- Required skills and qualifications&#10;- Preferred qualifications&#10;- Company information"
                className="w-full min-h-[300px] p-4 border-2 rounded-lg bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                value={jobDescriptionInput}
                onChange={(e) => setJobDescriptionInput(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                {jobDescriptionInput.split(/\s+/).filter(w => w).length} words
              </p>
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => setJobDescDialogOpen(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              variant="hero"
              onClick={proceedWithAction}
              disabled={!jobDescriptionInput.trim()}
              className="flex-1"
            >
              {actionType === "analyze" ? (
                <>
                  <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M3 3v18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M18 17l-4-4-4 4-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Start Analysis
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Start AI Rewrite
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
