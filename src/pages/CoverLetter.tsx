import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
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
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { generateCoverLetter } from "@/lib/aiRewriter";

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
            <Button variant="ghost" onClick={() => navigate("/")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-6xl mx-auto"
        >
          {/* Hero Section */}
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-hero bg-clip-text text-transparent">
              AI Cover Letter Builder
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Generate tailored cover letters in seconds. Just paste your resume and job
              description, pick a tone, and let AI do the rest.
            </p>
          </div>

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
                  {/* Resume Input */}
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

                  {/* Job Description */}
                  <Card className="p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <FileText className="w-5 h-5 text-primary" />
                      <h2 className="text-xl font-bold">Job Description</h2>
                    </div>
                    <Textarea
                      placeholder="Paste the job description or job link..."
                      value={jobDescription}
                      onChange={(e) => setJobDescription(e.target.value)}
                      className="min-h-[200px] font-mono text-sm"
                    />
                  </Card>

                  {/* Tone Selector & Generate */}
                  <Card className="p-6 bg-gradient-subtle">
                    <h2 className="text-xl font-bold mb-4">Cover Letter Tone</h2>
                    <Select
                      value={tone}
                      onValueChange={(value: any) => setTone(value)}
                    >
                      <SelectTrigger className="w-full mb-4">
                        <SelectValue placeholder="Select tone" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="professional">
                          💼 Professional - Traditional & formal
                        </SelectItem>
                        <SelectItem value="confident">
                          🚀 Confident - Bold & assertive
                        </SelectItem>
                        <SelectItem value="casual">
                          😊 Casual - Friendly & conversational
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
                          Generate Cover Letter
                        </>
                      )}
                    </Button>
                  </Card>
                </>
              ) : (
                <>
                  {/* Upload/Edit Existing Cover Letter */}
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
                          description: "Your cover letter is ready to edit",
                        });
                      }}
                      disabled={!existingLetter.trim()}
                    >
                      <Edit3 className="w-5 h-5 mr-2" />
                      Load for Editing
                    </Button>
                  </Card>
                </>
              )}
            </div>

            {/* Output Section */}
            <div className="space-y-6">
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold">Generated Cover Letter</h2>
                  {coverLetter && (
                    <div className="flex gap-2">
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
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    <Textarea
                      value={coverLetter}
                      onChange={(e) => setCoverLetter(e.target.value)}
                      className="min-h-[500px] font-mono text-sm"
                      placeholder="Edit your cover letter here..."
                    />
                  </motion.div>
                )}
              </Card>

              {/* Tips Card */}
              <Card className="p-6 bg-accent/50">
                <h3 className="font-semibold mb-3">💡 Pro Tips</h3>
                <ul className="text-sm text-muted-foreground space-y-2">
                  <li>• AI auto-injects metrics from your resume</li>
                  <li>• Professional tone works for most corporate jobs</li>
                  <li>• Confident tone is great for startups & leadership roles</li>
                  <li>• Casual tone fits creative & tech-forward companies</li>
                  <li>• Always customize the generated letter before sending</li>
                </ul>
              </Card>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
