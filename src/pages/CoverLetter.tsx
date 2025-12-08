import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  FileText,
  Sparkles,
  Copy,
  Download,
  Loader2,
  Upload,
  Edit3,
  Save,
  Trash2,
  Search,
  Plus,
  X,
  Tag as TagIcon,
  FolderOpen,
  StickyNote,
  Eye,
  Mail,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { generateCoverLetter } from "@/lib/aiRewriter";
import { supabase } from "@/integrations/supabase/client";

interface SavedCoverLetter {
  id: string;
  content: string;
  job_description: string | null;
  tone: string | null;
  category: string | null;
  tags: string[] | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export default function CoverLetter() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [resumeText, setResumeText] = useState(
    sessionStorage.getItem("resumeText") || ""
  );
  const [jobDescription, setJobDescription] = useState(
    sessionStorage.getItem("jobDescription") || ""
  );
  const [tone, setTone] = useState<"professional" | "confident" | "casual">(
    "professional"
  );
  const [coverLetter, setCoverLetter] = useState("");
  const [existingLetter, setExistingLetter] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [mode, setMode] = useState<"generate" | "edit">("generate");
  const [isSaving, setIsSaving] = useState(false);

  // Library states
  const [savedLetters, setSavedLetters] = useState<SavedCoverLetter[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterTags, setFilterTags] = useState<string[]>([]);

  // Dialog states
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [letterToDelete, setLetterToDelete] = useState<string | null>(null);
  const [viewingLetter, setViewingLetter] = useState<SavedCoverLetter | null>(null);
  const [editingMetadata, setEditingMetadata] = useState<SavedCoverLetter | null>(null);
  const [newTag, setNewTag] = useState("");
  const [tempCategory, setTempCategory] = useState<string>("");
  const [tempTags, setTempTags] = useState<string[]>([]);
  const [tempNotes, setTempNotes] = useState<string>("");

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

  useEffect(() => {
    loadSavedLetters();
  }, []);

  const loadSavedLetters = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('cover_letters')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSavedLetters(data || []);
    } catch (error) {
      console.error("Error loading cover letters:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!resumeText.trim() || !jobDescription.trim()) {
      toast({
        title: "Missing information",
        description: "Please provide both your resume and job description",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    try {
      const letter = await generateCoverLetter(resumeText, jobDescription, tone);
      setCoverLetter(letter);
      toast({
        title: "✓ Cover letter generated",
        description: "Your tailored cover letter is ready!",
      });
    } catch (error) {
      toast({
        title: "Generation failed",
        description:
          error instanceof Error ? error.message : "Could not generate cover letter",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!coverLetter.trim()) {
      toast({
        title: "Nothing to save",
        description: "Please generate or enter a cover letter first",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Not logged in",
          description: "Please sign in to save cover letters",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase.from('cover_letters').insert({
        user_id: user.id,
        content: coverLetter,
        job_description: jobDescription || null,
        tone: tone,
      });

      if (error) throw error;

      toast({
        title: "✓ Saved",
        description: "Cover letter saved to your library",
      });

      loadSavedLetters();
    } catch (error) {
      console.error("Error saving cover letter:", error);
      toast({
        title: "Save failed",
        description: "Could not save cover letter",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const deleteLetter = async (id: string) => {
    try {
      const { error } = await supabase
        .from('cover_letters')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Deleted",
        description: "Cover letter deleted successfully",
      });

      loadSavedLetters();
    } catch (error) {
      console.error("Error deleting cover letter:", error);
      toast({
        title: "Error",
        description: "Failed to delete cover letter",
        variant: "destructive",
      });
    }
  };

  const openMetadataEditor = (letter: SavedCoverLetter) => {
    setEditingMetadata(letter);
    setTempCategory(letter.category || "");
    setTempTags(letter.tags || []);
    setTempNotes(letter.notes || "");
  };

  const saveMetadata = async () => {
    if (!editingMetadata) return;

    try {
      const { error } = await supabase
        .from('cover_letters')
        .update({
          category: tempCategory || null,
          tags: tempTags,
          notes: tempNotes || null,
        })
        .eq('id', editingMetadata.id);

      if (error) throw error;

      toast({
        title: "✓ Saved",
        description: "Cover letter details updated",
      });

      loadSavedLetters();
      setEditingMetadata(null);
    } catch (error) {
      console.error("Error updating metadata:", error);
      toast({
        title: "Error",
        description: "Failed to update details",
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

  const loadLetterForEditing = (letter: SavedCoverLetter) => {
    setCoverLetter(letter.content);
    setJobDescription(letter.job_description || "");
    setTone((letter.tone as any) || "professional");
    setViewingLetter(null);
    toast({
      title: "✓ Loaded",
      description: "Cover letter loaded for editing",
    });
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(coverLetter);
    toast({
      title: "✓ Copied",
      description: "Cover letter copied to clipboard",
    });
  };

  const handleDownload = () => {
    const blob = new Blob([coverLetter], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "cover-letter.txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({
      title: "✓ Downloaded",
      description: "Cover letter saved to your device",
    });
  };

  const allTags = Array.from(
    new Set(savedLetters.flatMap(l => l.tags || []))
  ).sort();

  const allCategories = Array.from(
    new Set(savedLetters.map(l => l.category).filter(Boolean))
  ).sort();

  const filteredLetters = savedLetters.filter(letter => {
    const matchesSearch = letter.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (letter.notes && letter.notes.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (letter.job_description && letter.job_description.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = filterCategory === "all" || letter.category === filterCategory;
    const matchesTags = filterTags.length === 0 ||
      filterTags.every(tag => letter.tags?.includes(tag));
    return matchesSearch && matchesCategory && matchesTags;
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <button onClick={() => navigate("/dashboard")} className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center">
              <Mail className="w-4 h-4 text-white" />
            </div>
            <span className="text-xl font-bold">CareerCraft</span>
          </button>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Dashboard
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-7xl mx-auto"
        >
          {/* Hero Section */}
          <div className="text-center mb-8">
            <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-hero bg-clip-text text-transparent">
              AI Cover Letter Builder
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Generate tailored cover letters, edit existing ones, and organize your library.
            </p>
          </div>

          <Tabs defaultValue="create" className="w-full">
            <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 mb-8">
              <TabsTrigger value="create" className="flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                Create
              </TabsTrigger>
              <TabsTrigger value="library" className="flex items-center gap-2">
                <FolderOpen className="w-4 h-4" />
                Library ({savedLetters.length})
              </TabsTrigger>
            </TabsList>

            {/* CREATE TAB */}
            <TabsContent value="create">
              {/* Mode Toggle */}
              <div className="flex justify-center gap-4 mb-8">
                <Button
                  variant={mode === "generate" ? "default" : "outline"}
                  onClick={() => setMode("generate")}
                  className="flex items-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  Generate New
                </Button>
                <Button
                  variant={mode === "edit" ? "default" : "outline"}
                  onClick={() => setMode("edit")}
                  className="flex items-center gap-2"
                >
                  <Edit3 className="w-4 h-4" />
                  Edit Existing
                </Button>
              </div>

              <div className="grid lg:grid-cols-2 gap-8 mb-8">
                {/* Input Section */}
                <div className="space-y-6">
                  {mode === "generate" ? (
                    <>
                      <Card className="p-6">
                        <div className="flex items-center gap-2 mb-4">
                          <FileText className="w-5 h-5 text-primary" />
                          <h2 className="text-xl font-bold">Your Resume</h2>
                        </div>
                        <Textarea
                          placeholder="Paste your resume text here..."
                          value={resumeText}
                          onChange={(e) => setResumeText(e.target.value)}
                          className="min-h-[200px] font-mono text-sm"
                        />
                      </Card>

                      <Card className="p-6">
                        <div className="flex items-center gap-2 mb-4">
                          <FileText className="w-5 h-5 text-primary" />
                          <h2 className="text-xl font-bold">Job Description</h2>
                        </div>
                        <Textarea
                          placeholder="Paste the job description..."
                          value={jobDescription}
                          onChange={(e) => setJobDescription(e.target.value)}
                          className="min-h-[200px] font-mono text-sm"
                        />
                      </Card>

                      <Card className="p-6 bg-gradient-subtle">
                        <h2 className="text-xl font-bold mb-4">Tone</h2>
                        <Select
                          value={tone}
                          onValueChange={(value: any) => setTone(value)}
                        >
                          <SelectTrigger className="w-full mb-4">
                            <SelectValue placeholder="Select tone" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="professional">
                              💼 Professional
                            </SelectItem>
                            <SelectItem value="confident">
                              🚀 Confident
                            </SelectItem>
                            <SelectItem value="casual">
                              😊 Casual
                            </SelectItem>
                          </SelectContent>
                        </Select>

                        <Button
                          variant="hero"
                          size="lg"
                          className="w-full text-lg"
                          onClick={handleGenerate}
                          disabled={isGenerating}
                        >
                          {isGenerating ? (
                            <>
                              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                              Generating...
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-5 h-5 mr-2" />
                              Generate
                            </>
                          )}
                        </Button>
                      </Card>
                    </>
                  ) : (
                    <Card className="p-6">
                      <div className="flex items-center gap-2 mb-4">
                        <Upload className="w-5 h-5 text-primary" />
                        <h2 className="text-xl font-bold">Paste Existing Cover Letter</h2>
                      </div>
                      <Textarea
                        placeholder="Paste your existing cover letter here to edit..."
                        value={existingLetter}
                        onChange={(e) => setExistingLetter(e.target.value)}
                        className="min-h-[400px] font-mono text-sm"
                      />
                      <Button
                        variant="hero"
                        size="lg"
                        className="w-full text-lg mt-4"
                        onClick={() => {
                          setCoverLetter(existingLetter);
                          toast({
                            title: "✓ Loaded",
                            description: "Ready to edit",
                          });
                        }}
                        disabled={!existingLetter.trim()}
                      >
                        <Edit3 className="w-5 h-5 mr-2" />
                        Load for Editing
                      </Button>
                    </Card>
                  )}
                </div>

                {/* Output Section */}
                <div className="space-y-6">
                  <Card className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-xl font-bold">Cover Letter</h2>
                      {coverLetter && (
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleSave}
                            disabled={isSaving}
                          >
                            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleCopy}
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleDownload}
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>

                    {!coverLetter ? (
                      <div className="min-h-[500px] flex items-center justify-center border-2 border-dashed border-border rounded-lg">
                        <div className="text-center text-muted-foreground">
                          <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-50" />
                          <p>{mode === "generate" ? "Your AI-generated cover letter will appear here" : "Load your cover letter to start editing"}</p>
                        </div>
                      </div>
                    ) : (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                        <Textarea
                          value={coverLetter}
                          onChange={(e) => setCoverLetter(e.target.value)}
                          className="min-h-[500px] font-mono text-sm"
                          placeholder="Edit your cover letter here..."
                        />
                      </motion.div>
                    )}
                  </Card>

                  <Card className="p-6 bg-accent/50">
                    <h3 className="font-semibold mb-3">💡 Pro Tips</h3>
                    <ul className="text-sm text-muted-foreground space-y-2">
                      <li>• Save your cover letters to organize them with tags</li>
                      <li>• Professional tone works for most corporate jobs</li>
                      <li>• Always customize before sending</li>
                    </ul>
                  </Card>
                </div>
              </div>
            </TabsContent>

            {/* LIBRARY TAB */}
            <TabsContent value="library">
              {/* Filters */}
              <div className="flex flex-wrap gap-4 mb-6">
                <div className="flex-1 min-w-[200px]">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search cover letters..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <Select value={filterCategory} onValueChange={setFilterCategory}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {allCategories.map(cat => (
                      <SelectItem key={cat} value={cat!}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {allTags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {allTags.slice(0, 5).map(tag => (
                      <Badge
                        key={tag}
                        variant={filterTags.includes(tag) ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => {
                          setFilterTags(prev =>
                            prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
                          );
                        }}
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Cover Letters Grid */}
              {isLoading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : filteredLetters.length === 0 ? (
                <Card className="p-12 text-center">
                  <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="text-lg font-semibold mb-2">No cover letters yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Generate or paste a cover letter and save it to your library.
                  </p>
                </Card>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <AnimatePresence>
                    {filteredLetters.map((letter) => (
                      <motion.div
                        key={letter.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                      >
                        <Card className="p-4 hover:shadow-lg transition-shadow h-full flex flex-col">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <FileText className="w-4 h-4 text-primary" />
                              <span className="text-sm text-muted-foreground">
                                {new Date(letter.created_at).toLocaleDateString()}
                              </span>
                            </div>
                            {letter.tone && (
                              <Badge variant="outline" className="text-xs">
                                {letter.tone}
                              </Badge>
                            )}
                          </div>

                          <p className="text-sm text-muted-foreground line-clamp-4 flex-1 mb-3">
                            {letter.content.substring(0, 200)}...
                          </p>

                          {letter.category && (
                            <Badge variant="secondary" className="mb-2 w-fit">
                              {letter.category}
                            </Badge>
                          )}

                          {letter.tags && letter.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-3">
                              {letter.tags.slice(0, 3).map(tag => (
                                <Badge key={tag} variant="outline" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                              {letter.tags.length > 3 && (
                                <Badge variant="outline" className="text-xs">
                                  +{letter.tags.length - 3}
                                </Badge>
                              )}
                            </div>
                          )}

                          <div className="flex gap-2 mt-auto pt-3 border-t border-border">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setViewingLetter(letter)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openMetadataEditor(letter)}
                            >
                              <TagIcon className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                navigator.clipboard.writeText(letter.content);
                                toast({ title: "✓ Copied" });
                              }}
                            >
                              <Copy className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              onClick={() => {
                                setLetterToDelete(letter.id);
                                setDeleteDialogOpen(true);
                              }}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </Card>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>

      {/* View Letter Dialog */}
      <Dialog open={!!viewingLetter} onOpenChange={() => setViewingLetter(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Cover Letter</DialogTitle>
            <DialogDescription>
              Created {viewingLetter && new Date(viewingLetter.created_at).toLocaleDateString()}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {viewingLetter?.job_description && (
              <div>
                <h4 className="font-semibold mb-2">Job Description</h4>
                <p className="text-sm text-muted-foreground bg-muted p-3 rounded-lg line-clamp-3">
                  {viewingLetter.job_description}
                </p>
              </div>
            )}
            <div>
              <h4 className="font-semibold mb-2">Content</h4>
              <div className="whitespace-pre-wrap text-sm bg-muted p-4 rounded-lg">
                {viewingLetter?.content}
              </div>
            </div>
            <div className="flex gap-2 pt-4">
              <Button onClick={() => viewingLetter && loadLetterForEditing(viewingLetter)}>
                <Edit3 className="w-4 h-4 mr-2" />
                Edit
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  if (viewingLetter) {
                    navigator.clipboard.writeText(viewingLetter.content);
                    toast({ title: "✓ Copied" });
                  }
                }}
              >
                <Copy className="w-4 h-4 mr-2" />
                Copy
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Metadata Dialog */}
      <Dialog open={!!editingMetadata} onOpenChange={() => setEditingMetadata(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Details</DialogTitle>
            <DialogDescription>
              Add category, tags, and notes to organize your cover letter.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Category</label>
              <Select value={tempCategory} onValueChange={setTempCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {availableCategories.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Tags</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {tempTags.map(tag => (
                  <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                    {tag}
                    <X
                      className="w-3 h-3 cursor-pointer"
                      onClick={() => removeTag(tag)}
                    />
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Add tag..."
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addTag(newTag);
                    }
                  }}
                />
                <Button variant="outline" onClick={() => addTag(newTag)}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Notes</label>
              <Textarea
                placeholder="Add notes..."
                value={tempNotes}
                onChange={(e) => setTempNotes(e.target.value)}
                className="min-h-[100px]"
              />
            </div>

            <Button onClick={saveMetadata} className="w-full">
              <Save className="w-4 h-4 mr-2" />
              Save Details
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Cover Letter?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (letterToDelete) {
                  deleteLetter(letterToDelete);
                  setLetterToDelete(null);
                }
                setDeleteDialogOpen(false);
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
