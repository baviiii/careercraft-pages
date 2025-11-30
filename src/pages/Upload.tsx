import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useDropzone } from "react-dropzone";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Upload as UploadIcon, 
  FileText, 
  ArrowRight, 
  Sparkles, 
  Image as ImageIcon, 
  Linkedin,
  FolderOpen,
  Pencil,
  Trash2,
  Download,
  Search,
  Calendar,
  Tag
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { parseResume } from "@/lib/resumeParser";
import { parseLinkedInText } from "@/lib/linkedinParser";
import { supabase } from "@/integrations/supabase/client";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

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
  const [resumeText, setResumeText] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [fileName, setFileName] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadMethod, setUploadMethod] = useState<"file" | "image" | "linkedin" | "manager">("file");
  const [linkedinText, setLinkedinText] = useState("");
  const [ocrProgress, setOcrProgress] = useState(0);
  
  // Resume Manager states
  const [savedResumes, setSavedResumes] = useState<SavedResume[]>([]);
  const [isLoadingResumes, setIsLoadingResumes] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [resumeToDelete, setResumeToDelete] = useState<string | null>(null);
  const [editingResumeId, setEditingResumeId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  // Load saved resumes when manager tab is active
  useEffect(() => {
    if (uploadMethod === "manager") {
      loadSavedResumes();
    }
  }, [uploadMethod]);

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
      
      // Reload resumes if on manager tab
      if (uploadMethod === "manager") {
        loadSavedResumes();
      }
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

  const loadResumeIntoEditor = (resume: SavedResume) => {
    setResumeText(resume.content);
    setFileName(resume.name);
    setUploadMethod("file");
    toast({
      title: "Loaded",
      description: `${resume.name} loaded into editor`,
    });
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
      setResumeText(text);
      
      const fileType = file.type.startsWith('image/') ? 'image' : file.type === 'application/pdf' ? 'pdf' : 'doc';
      
      // Save to database
      await saveResumeToDatabase(text, file.name, fileType);
      
      const displayType = file.type.startsWith('image/') ? 'Image' : file.type === 'application/pdf' ? 'PDF' : 'Document';
      
      toast({
        title: `✓ ${displayType} processed successfully`,
        description: `${file.name} parsed and saved. ${text.split(/\s+/).length} words extracted.`,
      });
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
      setResumeText(formatted);
      setFileName("LinkedIn Profile");
      
      await saveResumeToDatabase(formatted, "LinkedIn Profile", "text/linkedin");
      
      toast({
        title: "✓ LinkedIn profile imported",
        description: `Profile text processed and saved. ${formatted.split(/\s+/).length} words extracted.`,
      });
      setLinkedinText('');
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

  const handleAnalyze = () => {
    if (!resumeText) {
      toast({
        title: "Missing resume",
        description: "Please upload your resume first.",
        variant: "destructive",
      });
      return;
    }

    if (!jobDescription) {
      toast({
        title: "Missing job description",
        description: "Please paste the job description to match against.",
        variant: "destructive",
      });
      return;
    }

    // Store data in sessionStorage for the analysis page
    sessionStorage.setItem("resumeText", resumeText);
    sessionStorage.setItem("jobDescription", jobDescription);
    sessionStorage.setItem("fileName", fileName);

    navigate("/analysis");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <button onClick={() => navigate("/")} className="text-2xl font-bold bg-gradient-hero bg-clip-text text-transparent">
            ResumeAI
          </button>
          <Button variant="ghost" onClick={() => navigate("/")}>
            Back to Home
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-6xl mx-auto"
        >
          <div className="text-center mb-12">
            <h1 className="text-4xl lg:text-5xl font-bold mb-4">
              Upload Your Resume
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Upload your resume and paste the job description to get instant ATS analysis and optimization
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Resume Upload */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="space-y-4"
            >
              <h2 className="text-2xl font-semibold flex items-center gap-2">
                <FileText className="w-6 h-6 text-primary" />
                Import Your Resume
              </h2>

              {/* Import Method Tabs */}
              <Tabs value={uploadMethod} onValueChange={(v) => setUploadMethod(v as any)}>
                <TabsList className="grid grid-cols-4 w-full">
                  <TabsTrigger value="file" className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    <span className="hidden sm:inline">File</span>
                  </TabsTrigger>
                  <TabsTrigger value="image" className="flex items-center gap-2">
                    <ImageIcon className="w-4 h-4" />
                    <span className="hidden sm:inline">Photo</span>
                  </TabsTrigger>
                  <TabsTrigger value="linkedin" className="flex items-center gap-2">
                    <Linkedin className="w-4 h-4" />
                    <span className="hidden sm:inline">LinkedIn</span>
                  </TabsTrigger>
                  <TabsTrigger value="manager" className="flex items-center gap-2">
                    <FolderOpen className="w-4 h-4" />
                    <span className="hidden sm:inline">Saved</span>
                  </TabsTrigger>
                </TabsList>

                {/* File Upload Tab */}
                <TabsContent value="file"  className="mt-4">
                  <Card className="p-4 bg-accent/30 mb-4">
                    <p className="text-sm text-muted-foreground">
                      Upload your resume as PDF, DOC, or DOCX. We'll automatically extract and structure the content.
                    </p>
                  </Card>
                  <div
                    {...getRootProps()}
                    className={`relative border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all duration-300 overflow-hidden ${
                      isDragActive
                        ? "border-primary bg-primary/10 scale-[1.02]"
                        : "border-border hover:border-primary hover:bg-accent/30"
                    }`}
                  >
                    <input {...getInputProps()} />
                    
                    {/* Background gradient effect */}
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 opacity-0 hover:opacity-100 transition-opacity duration-500" />
                    
                    <div className="relative z-10">
                      <motion.div
                        animate={isProcessing ? { scale: [1, 1.1, 1] } : {}}
                        transition={{ repeat: isProcessing ? Infinity : 0, duration: 1.5 }}
                      >
                        <UploadIcon className={`w-16 h-16 mx-auto mb-4 transition-colors ${
                          isDragActive ? "text-primary" : "text-muted-foreground"
                        }`} />
                      </motion.div>
                      
                      {isProcessing ? (
                        <motion.div 
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="space-y-3"
                        >
                          <p className="text-lg font-semibold">Parsing your resume...</p>
                          <div className="w-64 h-2 bg-muted rounded-full mx-auto overflow-hidden">
                            <motion.div 
                              className="h-full bg-gradient-hero"
                              initial={{ width: "0%" }}
                              animate={{ width: "100%" }}
                              transition={{ duration: 2, ease: "easeInOut" }}
                            />
                          </div>
                          <p className="text-xs text-muted-foreground">Extracting text and analyzing structure</p>
                        </motion.div>
                      ) : fileName ? (
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="space-y-2"
                        >
                          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full">
                            <FileText className="w-4 h-4 text-primary" />
                            <p className="text-sm font-medium">{fileName}</p>
                          </div>
                          <p className="text-xs text-muted-foreground">Click or drag to replace</p>
                        </motion.div>
                      ) : (
                        <div className="space-y-3">
                          <p className="text-lg font-semibold">
                            {isDragActive ? "Drop your resume here" : "Upload your resume"}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Drag & drop or click to browse
                          </p>
                          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                            <span className="px-2 py-1 bg-muted rounded">PDF</span>
                            <span className="px-2 py-1 bg-muted rounded">DOC</span>
                            <span className="px-2 py-1 bg-muted rounded">DOCX</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </TabsContent>

                {/* Image Upload Tab */}
                <TabsContent value="image" className="mt-4">
                  <Card className="p-4 bg-accent/30 mb-4">
                    <p className="text-sm text-muted-foreground">
                      📸 Take a photo or upload an image of your resume. Our OCR will extract the text automatically.
                    </p>
                  </Card>

                  <div
                    {...getRootProps()}
                    className={`relative border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all duration-300 overflow-hidden ${
                      isDragActive
                        ? "border-primary bg-primary/10 scale-[1.02]"
                        : "border-border hover:border-primary hover:bg-accent/30"
                    }`}
                  >
                    <input {...getInputProps()} />
                    
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 opacity-0 hover:opacity-100 transition-opacity duration-500" />
                    
                    <div className="relative z-10">
                      <motion.div
                        animate={isProcessing ? { scale: [1, 1.1, 1] } : {}}
                        transition={{ repeat: isProcessing ? Infinity : 0, duration: 1.5 }}
                      >
                        <ImageIcon className={`w-16 h-16 mx-auto mb-4 transition-colors ${
                          isDragActive ? "text-primary" : "text-muted-foreground"
                        }`} />
                      </motion.div>
                      
                      {isProcessing ? (
                        <motion.div 
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="space-y-3"
                        >
                          <p className="text-lg font-semibold">Scanning image with OCR...</p>
                          {ocrProgress > 0 && (
                            <div className="w-64 h-2 bg-muted rounded-full mx-auto overflow-hidden">
                              <motion.div 
                                className="h-full bg-gradient-hero"
                                style={{ width: `${ocrProgress}%` }}
                                transition={{ duration: 0.3 }}
                              />
                            </div>
                          )}
                          <p className="text-xs text-muted-foreground">
                            {ocrProgress > 0 ? `${ocrProgress}% complete` : 'Initializing OCR engine...'}
                          </p>
                        </motion.div>
                      ) : fileName ? (
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="space-y-2"
                        >
                          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full">
                            <ImageIcon className="w-4 h-4 text-primary" />
                            <p className="text-sm font-medium">{fileName}</p>
                          </div>
                          <p className="text-xs text-muted-foreground">Click or drag to replace</p>
                        </motion.div>
                      ) : (
                        <div className="space-y-3">
                          <p className="text-lg font-semibold">
                            {isDragActive ? "Drop your image here" : "Upload resume image"}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Drag & drop or click to browse
                          </p>
                          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                            <span className="px-2 py-1 bg-muted rounded">JPG</span>
                            <span className="px-2 py-1 bg-muted rounded">PNG</span>
                            <span className="px-2 py-1 bg-muted rounded">WEBP</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </TabsContent>

                {/* LinkedIn Tab */}
                <TabsContent value="linkedin" className="mt-4">
                  <Card className="p-4 bg-accent/30 mb-4">
                    <p className="text-sm text-muted-foreground mb-2">
                      💼 Copy your entire LinkedIn profile text and paste it below.
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Go to your LinkedIn profile → Select all text (Ctrl+A / Cmd+A) → Copy → Paste here
                    </p>
                  </Card>

                  <Textarea
                    placeholder="Paste your LinkedIn profile text here...&#10;&#10;Include your entire profile: headline, about, experience, education, skills, etc."
                    className="min-h-[300px] text-sm mb-4"
                    value={linkedinText}
                    onChange={(e) => setLinkedinText(e.target.value)}
                  />

                  <Button 
                    onClick={handleLinkedInImport}
                    className="w-full"
                    variant="hero"
                    disabled={!linkedinText.trim()}
                  >
                    <Linkedin className="w-4 h-4 mr-2" />
                    Import LinkedIn Profile
                  </Button>
                </TabsContent>

                {/* Resume Manager Tab */}
                <TabsContent value="manager" className="mt-4">
                  <Card className="p-4 bg-accent/30 mb-4">
                    <p className="text-sm text-muted-foreground">
                      📁 Manage all your saved resumes. Edit names, download, load into editor, or delete.
                    </p>
                  </Card>

                  {/* Search Bar */}
                  <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search resumes..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>

                  {/* Resumes List */}
                  <div className="space-y-3 max-h-[600px] overflow-y-auto">
                    {isLoadingResumes ? (
                      <div className="text-center py-12">
                        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">Loading resumes...</p>
                      </div>
                    ) : savedResumes.filter(resume => 
                      resume.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      resume.file_type.toLowerCase().includes(searchQuery.toLowerCase())
                    ).length === 0 ? (
                      <div className="text-center py-12">
                        <FolderOpen className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
                        <p className="text-lg font-semibold mb-2">No resumes found</p>
                        <p className="text-sm text-muted-foreground mb-4">
                          {searchQuery ? "Try a different search term" : "Upload your first resume to get started"}
                        </p>
                      </div>
                    ) : (
                      savedResumes
                        .filter(resume => 
                          resume.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          resume.file_type.toLowerCase().includes(searchQuery.toLowerCase())
                        )
                        .map((resume) => (
                          <motion.div
                            key={resume.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                          >
                            <Card className="p-4 hover:shadow-md transition-shadow">
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                  {editingResumeId === resume.id ? (
                                    <div className="flex gap-2 mb-2">
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
                                        size="sm"
                                        onClick={() => updateResumeName(resume.id, editingName)}
                                      >
                                        Save
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => setEditingResumeId(null)}
                                      >
                                        Cancel
                                      </Button>
                                    </div>
                                  ) : (
                                    <h3 className="font-semibold text-lg mb-2 flex items-center gap-2 truncate">
                                      <FileText className="w-5 h-5 text-primary flex-shrink-0" />
                                      <span className="truncate">{resume.name}</span>
                                    </h3>
                                  )}
                                  
                                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mb-3">
                                    <Badge variant="secondary" className="flex items-center gap-1">
                                      <Tag className="w-3 h-3" />
                                      {resume.file_type}
                                    </Badge>
                                    <span className="flex items-center gap-1">
                                      <Calendar className="w-3 h-3" />
                                      {new Date(resume.created_at).toLocaleDateString()}
                                    </span>
                                    <span>
                                      {resume.content.split(/\s+/).length} words
                                    </span>
                                  </div>

                                  <p className="text-sm text-muted-foreground line-clamp-2">
                                    {resume.content.substring(0, 150)}...
                                  </p>
                                </div>

                                <div className="flex flex-col gap-2">
                                  <Button
                                    size="sm"
                                    variant="default"
                                    onClick={() => loadResumeIntoEditor(resume)}
                                    className="whitespace-nowrap"
                                  >
                                    <ArrowRight className="w-4 h-4 mr-1" />
                                    Load
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setEditingResumeId(resume.id);
                                      setEditingName(resume.name);
                                    }}
                                  >
                                    <Pencil className="w-4 h-4 mr-1" />
                                    Edit
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => downloadResumeAsText(resume)}
                                  >
                                    <Download className="w-4 h-4 mr-1" />
                                    Download
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => {
                                      setResumeToDelete(resume.id);
                                      setDeleteDialogOpen(true);
                                    }}
                                  >
                                    <Trash2 className="w-4 h-4 mr-1" />
                                    Delete
                                  </Button>
                                </div>
                              </div>
                            </Card>
                          </motion.div>
                        ))
                    )}
                  </div>

                  {/* Stats */}
                  {savedResumes.length > 0 && (
                    <div className="mt-4 p-3 bg-accent/30 rounded-lg">
                      <p className="text-sm text-muted-foreground text-center">
                        Total: <span className="font-semibold text-foreground">{savedResumes.length}</span> saved resumes
                      </p>
                    </div>
                  )}
                </TabsContent>
              </Tabs>

              {resumeText && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-card border border-border rounded-lg p-4 shadow-sm"
                >
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-semibold flex items-center gap-2">
                      <FileText className="w-4 h-4 text-primary" />
                      Extracted Content
                    </p>
                    <span className="text-xs text-muted-foreground">
                      {resumeText.split(/\s+/).length} words
                    </span>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-4 max-h-48 overflow-y-auto border border-border/50">
                    <p className="text-sm text-foreground whitespace-pre-wrap line-clamp-6 leading-relaxed">
                      {resumeText}
                    </p>
                  </div>
                </motion.div>
              )}
            </motion.div>

            {/* Job Description */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="space-y-4"
            >
              <h2 className="text-2xl font-semibold flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-primary" />
                Job Description
              </h2>
              
              <div className="relative">
                <Textarea
                  placeholder="Paste the full job description here...&#10;&#10;Include requirements, qualifications, responsibilities, and any keywords that are important for this role. The more detail you provide, the better we can optimize your resume."
                  className="min-h-[400px] resize-none text-sm leading-relaxed"
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                />
                {jobDescription && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="absolute top-3 right-3 bg-background/80 backdrop-blur-sm px-3 py-1 rounded-full text-xs text-muted-foreground border border-border/50"
                  >
                    {jobDescription.split(/\s+/).filter(Boolean).length} words
                  </motion.div>
                )}
              </div>

              {jobDescription && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 text-sm text-muted-foreground"
                >
                  <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                    <motion.div 
                      className="h-full bg-gradient-hero"
                      initial={{ width: "0%" }}
                      animate={{ width: `${Math.min((jobDescription.split(/\s+/).filter(Boolean).length / 300) * 100, 100)}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                  <span className="text-xs">
                    {jobDescription.split(/\s+/).filter(Boolean).length < 100 ? "Add more details" : 
                     jobDescription.split(/\s+/).filter(Boolean).length < 300 ? "Good length" : "Excellent detail"}
                  </span>
                </motion.div>
              )}
            </motion.div>
          </div>

          {/* Analyze Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mt-12 text-center"
          >
            <Button
              variant="hero"
              size="lg"
              className="text-lg px-16 py-6 group shadow-lg hover:shadow-xl transition-all"
              onClick={handleAnalyze}
              disabled={!resumeText || !jobDescription}
            >
              <Sparkles className="w-5 h-5 mr-2" />
              Analyze & Optimize Resume
              <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
            
            {(!resumeText || !jobDescription) && (
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-sm text-muted-foreground mt-4"
              >
                {!resumeText && !jobDescription ? "Upload your resume and paste a job description to get started" :
                 !resumeText ? "Upload your resume to continue" :
                 "Paste a job description to continue"}
              </motion.p>
            )}
          </motion.div>
        </motion.div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this resume. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (resumeToDelete) {
                  deleteResume(resumeToDelete);
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
