import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
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
        title: "No text selected",
        description: "Select a bullet point or sentence to rewrite.",
        variant: "destructive",
      });
      return;
    }

    setIsRewriting(true);

    try {
      const jobDescription = sessionStorage.getItem("jobDescription") || "";
      const rewritten = await rewriteBullet(selectedText, jobDescription);

      // Replace the selected text with the rewritten version
      const newText = optimizedText.replace(selectedText, rewritten);
      setOptimizedText(newText);

      toast({
        title: "Text optimized!",
        description: "The selected text has been rewritten for ATS compatibility.",
      });
    } catch (error) {
      toast({
        title: "Rewrite failed",
        description: "Could not optimize the text. Please try again.",
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
      title: "Copied!",
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

    // Split text into lines that fit the page width
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
      title: "Download started",
      description: "Your optimized resume is being downloaded as PDF.",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={() => navigate("/")}
            className="text-2xl font-bold bg-gradient-hero bg-clip-text text-transparent"
          >
            ResumeAI
          </button>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => navigate("/analysis")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Analysis
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-6xl mx-auto"
        >
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-3 flex items-center justify-center gap-3">
              <Sparkles className="w-8 h-8 text-primary" />
              AI Resume Optimizer
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Select any text to rewrite it with AI. Make your resume ATS-friendly and achievement-focused.
            </p>
          </div>

          {/* Instructions */}
          <Card className="p-4 mb-6 bg-accent/50 border-primary/20">
            <div className="flex items-start gap-3">
              <Wand2 className="w-5 h-5 text-primary mt-0.5" />
              <div>
                <p className="font-semibold mb-1">How to use:</p>
                <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                  <li>Select any bullet point or sentence in the text below</li>
                  <li>Click "Rewrite Selected Text" to optimize it with AI</li>
                  <li>Review and edit the optimized version</li>
                  <li>Download or copy when you're satisfied</li>
                </ol>
              </div>
            </div>
          </Card>

          <div className="grid lg:grid-cols-2 gap-6 mb-8">
            {/* Original Resume */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Original Resume</h2>
                <Badge variant="secondary">Read-only</Badge>
              </div>
              <Card className="p-6">
                <div className="prose prose-sm max-w-none">
                  <pre className="whitespace-pre-wrap text-sm font-sans text-muted-foreground bg-muted p-4 rounded-lg max-h-[600px] overflow-y-auto">
                    {resumeText}
                  </pre>
                </div>
              </Card>
            </div>

            {/* Optimized Resume */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Optimized Resume</h2>
                <Badge className="bg-gradient-hero">AI Enhanced</Badge>
              </div>
              <Card className="p-6">
                <Textarea
                  value={optimizedText}
                  onChange={(e) => setOptimizedText(e.target.value)}
                  onMouseUp={handleTextSelect}
                  className="min-h-[600px] resize-none text-sm font-mono"
                  placeholder="Your optimized resume will appear here..."
                />
              </Card>
            </div>
          </div>

          {/* Action Bar */}
          <div className="sticky bottom-4 z-10">
            <Card className="p-4 bg-background/95 backdrop-blur border-2 shadow-elegant">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  {selectedText && (
                    <Badge variant="secondary" className="max-w-xs truncate">
                      "{selectedText.substring(0, 50)}..."
                    </Badge>
                  )}
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button
                    variant="hero"
                    onClick={handleRewrite}
                    disabled={!selectedText || isRewriting}
                    className="group"
                  >
                    {isRewriting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                        Rewriting...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        Rewrite Selected Text
                      </>
                    )}
                  </Button>

                  <Button variant="outline" onClick={handleCopy}>
                    {copied ? (
                      <>
                        <Check className="w-4 h-4 mr-2" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 mr-2" />
                        Copy Text
                      </>
                    )}
                  </Button>

                  <Button variant="outline" onClick={handleDownloadPDF}>
                    <Download className="w-4 h-4 mr-2" />
                    Download PDF
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
