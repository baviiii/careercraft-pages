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
  Filter
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { parseResume } from "@/lib/resumeParser";
import { parseLinkedInText } from "@/lib/linkedinParser";
import { supabase } from "@/integrations/supabase/client";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface SavedResume {
  id: string;
  name: string;
  content: string;
  file_type: string;
  created_at: string;
  updated_at: string;
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
  const [isLoadingResumes, setIsLoadingResumes] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [resumeToDelete, setResumeToDelete] = useState<string | null>(null);
  const [editingResumeId, setEditingResumeId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [viewingResume, setViewingResume] = useState<SavedResume | null>(null);
  const [editingContent, setEditingContent] = useState<SavedResume | null>(null);
  const [editedText, setEditedText] = useState("");

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
      setSavedResumes(data || []);
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

  const saveResumeToDatabase = async (content: string, filename: string, fileType: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase.from('resumes').insert({
        user_id: user.id,
        name: filename,
        content: content,
        original_filename: filename,
        file_type: fileType,
      });

      if (error) throw error;
      
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
      
      // Save to database
      await saveResumeToDatabase(text, file.name, fileType);
      
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

  const filteredResumes = savedResumes.filter(resume => {
    const matchesSearch = resume.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterType === "all" || resume.file_type === filterType;
    return matchesSearch && matchesFilter;
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
          <button onClick={() => navigate("/dashboard")} className="text-2xl font-bold bg-gradient-hero bg-clip-text text-transparent">
            ResumeAI
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
          <div className="flex items-center justify-between mb-8">
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

          {/* Search and Filter Bar */}
          <Card className="p-4 mb-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search resumes by name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="flex gap-2">
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
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              <AnimatePresence>
                {filteredResumes.map((resume) => (
                  <motion.div
                    key={resume.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Card className="h-full hover:shadow-lg transition-all duration-300 border-2 hover:border-primary/50">
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
                            <span className="text-xs text-muted-foreground">
                              {new Date(resume.created_at).toLocaleDateString()}
                            </span>
                          </div>

                          {/* Preview */}
                          <p className="text-sm text-muted-foreground line-clamp-3">
                            {resume.content.substring(0, 120)}...
                          </p>

                          {/* Word Count */}
                          <div className="text-xs text-muted-foreground">
                            {resume.content.split(/\s+/).length} words
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="grid grid-cols-3 gap-2 pt-2 border-t">
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
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => downloadResumeAsText(resume)}
                            className="gap-1"
                          >
                            <Download className="w-3 h-3" />
                            Export
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              setResumeToDelete(resume.id);
                              setDeleteDialogOpen(true);
                            }}
                            className="col-span-3 gap-2"
                          >
                            <Trash2 className="w-4 h-4" />
                            Delete
                          </Button>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                ))}
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

      {/* View Resume Dialog */}
      <Dialog open={!!viewingResume} onOpenChange={() => setViewingResume(null)}>
        <DialogContent className="max-w-4xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="text-2xl">{viewingResume?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className={getFileTypeBadgeColor(viewingResume?.file_type || '')}>
                {getFileTypeIcon(viewingResume?.file_type || '')}
                {viewingResume?.file_type}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {viewingResume && new Date(viewingResume.created_at).toLocaleDateString()}
              </span>
              <span className="text-sm text-muted-foreground">
                {viewingResume?.content.split(/\s+/).length} words
              </span>
            </div>
            <div className="max-h-[55vh] overflow-y-auto border rounded-lg p-6 bg-background">
              <div className="whitespace-pre-wrap text-sm leading-relaxed">
                {viewingResume?.content || "No content available"}
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => {
                  if (viewingResume) {
                    startEditingContent(viewingResume);
                    setViewingResume(null);
                  }
                }}
                variant="default"
                className="flex-1"
              >
                <Pencil className="w-4 h-4 mr-2" />
                Edit Content
              </Button>
              <Button
                onClick={() => viewingResume && downloadResumeAsText(viewingResume)}
                variant="outline"
                className="flex-1"
              >
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
              <Button
                variant="outline"
                onClick={() => setViewingResume(null)}
              >
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Resume Content Dialog */}
      <Dialog open={!!editingContent} onOpenChange={() => setEditingContent(null)}>
        <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-2xl flex items-center gap-2">
              <Pencil className="w-6 h-6 text-primary" />
              Edit: {editingContent?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 flex flex-col gap-4 min-h-0">
            <div className="flex items-center gap-2 p-3 bg-accent/50 rounded-lg">
              <Badge variant="outline" className={getFileTypeBadgeColor(editingContent?.file_type || '')}>
                {getFileTypeIcon(editingContent?.file_type || '')}
                {editingContent?.file_type}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {editedText.split(/\s+/).length} words
              </span>
              <span className="text-xs text-muted-foreground ml-auto">
                Select text to edit, copy, paste, or rewrite your resume content
              </span>
            </div>
            
            <textarea
              value={editedText}
              onChange={(e) => setEditedText(e.target.value)}
              className="flex-1 w-full min-h-[50vh] p-4 border rounded-lg bg-background text-sm font-mono leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Resume content..."
              spellCheck={false}
            />

            <div className="flex gap-2 pt-2 border-t">
              <Button
                onClick={saveEditedContent}
                className="flex-1"
                size="lg"
              >
                <Check className="w-4 h-4 mr-2" />
                Save Changes
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setEditingContent(null);
                  setEditedText("");
                }}
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
    </div>
  );
}
