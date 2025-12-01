import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Download,
  Copy,
  Sparkles,
  ArrowLeft,
  Check,
  Wand2,
  FileText,
  Zap,
  Upload,
  BarChart3,
  RefreshCw,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { rewriteBullet } from "@/lib/aiRewriter";
import jsPDF from "jspdf";

export default function Rewrite() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [resumeText, setResumeText] = useState("");
  const [optimizedText, setOptimizedText] = useState("");
  const [selectedText, setSelectedText] = useState("");
  const [isRewriting, setIsRewriting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [jobDescription, setJobDescription] = useState("");
  const [rewriteHistory, setRewriteHistory] = useState<Array<{ original: string; rewritten: string }>>([]);

  useEffect(() => {
    const storedResume = sessionStorage.getItem("resumeText");
    const storedJob = sessionStorage.getItem("jobDescription");

    if (storedResume && storedJob) {
      setResumeText(storedResume);
      setJobDescription(storedJob);
      setOptimizedText(storedResume);
    }
  }, []);

  // Show message if no data
  if (!resumeText || !jobDescription) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b border-border bg-background/95 backdrop-blur sticky top-0 z-50">
          <div className="container mx-auto px-4 py-4">
            <button
              onClick={() => navigate("/dashboard")}
              className="text-2xl font-bold bg-gradient-hero bg-clip-text text-transparent"
            >
              ResumeAI
            </button>
          </div>
        </header>
        <div className="container mx-auto px-4 py-12">
          <Card className="max-w-2xl mx-auto p-8 text-center">
            <Sparkles className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-2xl font-bold mb-2">No Resume Uploaded</h2>
            <p className="text-muted-foreground mb-6">
              Please upload your resume and job description first to use the AI Rewrite tool.
            </p>
            <Button onClick={() => navigate("/upload")}>
              <Upload className="w-4 h-4 mr-2" />
              Go to Resume Manager
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  const handleTextSelect = () => {
    const selection = window.getSelection();
    const text = selection?.toString().trim();
    if (text && text.length > 10) {
      setSelectedText(text);
    }
  };

  const handleRewrite = async () => {
    if (!selectedText) {
      toast({
        title: "No Text Selected",
        description: "Select a bullet point or sentence to rewrite.",
        variant: "destructive",
      });
      return;
    }

    setIsRewriting(true);

    try {
      const rewritten = await rewriteBullet(selectedText, jobDescription);

      // Add to history
      setRewriteHistory(prev => [...prev, { original: selectedText, rewritten }]);

      // Replace the selected text with the rewritten version
      const newText = optimizedText.replace(selectedText, rewritten);
      setOptimizedText(newText);

      toast({
        title: "✓ Text Optimized!",
        description: "The selected text has been rewritten for ATS compatibility.",
      });
    } catch (error) {
      toast({
        title: "Rewrite Failed",
        description: error instanceof Error ? error.message : "Could not optimize the text. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsRewriting(false);
      setSelectedText("");
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(optimizedText);
    setCopied(true);
    toast({
      title: "✓ Copied!",
      description: "Optimized resume text copied to clipboard.",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadPDF = () => {
    const doc = new jsPDF();
    const margin = 20;
    const lineHeight = 7;
    const pageHeight = doc.internal.pageSize.height;
    let yPosition = margin;

    const lines = doc.splitTextToSize(optimizedText, doc.internal.pageSize.width - 2 * margin);

    lines.forEach((line: string) => {
      if (yPosition + lineHeight > pageHeight - margin) {
        doc.addPage();
        yPosition = margin;
      }
      doc.text(line, margin, yPosition);
      yPosition += lineHeight;
    });

    doc.save("optimized-resume.pdf");

    toast({
      title: "✓ Download Started",
      description: "Your optimized resume is being downloaded as PDF.",
    });
  };

  const handleDownloadTxt = () => {
    const blob = new Blob([optimizedText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "optimized-resume.txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "✓ Download Started",
      description: "Your optimized resume is being downloaded as TXT.",
    });
  };

  const handleReset = () => {
    setOptimizedText(resumeText);
    setRewriteHistory([]);
    toast({
      title: "✓ Reset Complete",
      description: "Your resume has been reset to the original version.",
    });
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="border-b border-border bg-background/95 backdrop-blur sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={() => navigate("/dashboard")}
            className="text-2xl font-bold bg-gradient-hero bg-clip-text text-transparent"
          >
            ResumeAI
          </button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate("/analysis")}>
              <BarChart3 className="w-4 h-4 mr-2" />
              View Analysis
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-7xl mx-auto"
        >
          {/* Hero Section */}
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              className="inline-flex items-center gap-3 mb-4"
            >
              <div className="w-12 h-12 rounded-full bg-gradient-hero flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-4xl md:text-5xl font-black bg-gradient-hero bg-clip-text text-transparent">
                AI Resume Optimizer
              </h1>
            </motion.div>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Select any text to rewrite it with AI. Make your resume ATS-friendly and achievement-focused.
            </p>
          </div>

          {/* Stats Bar */}
          {rewriteHistory.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6"
            >
              <Card className="p-4 bg-gradient-to-r from-primary/5 to-accent/5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                      <Zap className="w-5 h-5 text-primary" />
                      <span className="font-semibold">{rewriteHistory.length} sections optimized</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleReset}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Reset to Original
                    </Button>
                  </div>
                </div>
              </Card>
            </motion.div>
          )}

          {/* Instructions Card */}
          <Card className="p-6 mb-6 bg-gradient-to-br from-primary/10 to-accent/10 border-2 border-primary/20">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                <Wand2 className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-lg mb-3">How to Use AI Rewrite</h3>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="flex items-start gap-2">
                    <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                      1
                    </div>
                    <p className="text-sm text-muted-foreground">
                      <span className="font-semibold text-foreground">Select text</span> - Highlight any bullet point or sentence in the optimized resume
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                      2
                    </div>
                    <p className="text-sm text-muted-foreground">
                      <span className="font-semibold text-foreground">AI rewrite</span> - Click the button to optimize with AI for ATS compatibility
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                      3
                    </div>
                    <p className="text-sm text-muted-foreground">
                      <span className="font-semibold text-foreground">Review & edit</span> - The AI will replace your text. Feel free to manually edit further
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                      4
                    </div>
                    <p className="text-sm text-muted-foreground">
                      <span className="font-semibold text-foreground">Export</span> - Download as PDF or TXT, or copy to clipboard when satisfied
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Main Content Grid */}
          <div className="grid lg:grid-cols-2 gap-6 mb-6">
            {/* Original Resume */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-muted-foreground" />
                  <h2 className="text-xl font-bold">Original Resume</h2>
                </div>
                <Badge variant="secondary">Read-only</Badge>
              </div>
              <Card className="relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-muted to-transparent" />
                <div className="p-6">
                  <pre className="whitespace-pre-wrap text-sm font-sans text-muted-foreground bg-muted/50 p-4 rounded-lg max-h-[700px] overflow-y-auto">
                    {resumeText}
                  </pre>
                </div>
              </Card>
            </div>

            {/* Optimized Resume */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  <h2 className="text-xl font-bold">AI-Optimized Resume</h2>
                </div>
                <Badge className="bg-gradient-hero">
                  <Zap className="w-3 h-3 mr-1" />
                  AI Enhanced
                </Badge>
              </div>
              <Card className="relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-hero" />
                <div className="p-6">
                  <Textarea
                    value={optimizedText}
                    onChange={(e) => setOptimizedText(e.target.value)}
                    onMouseUp={handleTextSelect}
                    className="min-h-[700px] resize-none text-sm font-mono border-0 focus-visible:ring-0 focus-visible:ring-offset-0 p-0 bg-transparent"
                    placeholder="Your optimized resume will appear here..."
                  />
                </div>
              </Card>
            </div>
          </div>

          {/* Rewrite History */}
          <AnimatePresence>
            {rewriteHistory.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
              >
                <Card className="p-6 mb-6">
                  <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-primary" />
                    Rewrite History ({rewriteHistory.length} changes)
                  </h3>
                  <div className="space-y-3 max-h-[300px] overflow-y-auto">
                    {rewriteHistory.map((item, idx) => (
                      <div key={idx} className="text-sm border-l-2 border-primary pl-4 py-2">
                        <p className="text-muted-foreground line-through mb-2">{item.original}</p>
                        <p className="text-foreground font-medium">{item.rewritten}</p>
                      </div>
                    ))}
                  </div>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Fixed Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur">
        <div className="container mx-auto px-4 py-4">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {selectedText ? (
                  <Badge variant="secondary" className="max-w-md truncate px-4 py-2">
                    <Sparkles className="w-3 h-3 mr-2 flex-shrink-0" />
                    <span className="truncate">"{selectedText.substring(0, 60)}..."</span>
                  </Badge>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Select text in the optimized resume to rewrite it with AI
                  </p>
                )}
              </div>

              <div className="flex flex-wrap gap-3">
                <Button
                  size="lg"
                  variant="hero"
                  onClick={handleRewrite}
                  disabled={!selectedText || isRewriting}
                  className="group"
                >
                  {isRewriting ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Rewriting...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5 mr-2" />
                      Rewrite Selected
                    </>
                  )}
                </Button>

                <Button variant="outline" size="lg" onClick={handleCopy}>
                  {copied ? (
                    <>
                      <Check className="w-5 h-5 mr-2" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-5 h-5 mr-2" />
                      Copy
                    </>
                  )}
                </Button>

                <Button variant="outline" size="lg" onClick={handleDownloadPDF}>
                  <Download className="w-5 h-5 mr-2" />
                  PDF
                </Button>

                <Button variant="outline" size="lg" onClick={handleDownloadTxt}>
                  <Download className="w-5 h-5 mr-2" />
                  TXT
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
