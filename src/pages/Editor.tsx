import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Download,
  ArrowLeft,
  Sparkles,
  FileText,
  Briefcase,
  GraduationCap,
  Award,
  Code,
  User,
  Mail,
  Phone,
  MapPin,
  Save,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import jsPDF from "jspdf";

interface ResumeSection {
  id: string;
  title: string;
  icon: any;
  content: string;
}

export default function Editor() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [sections, setSections] = useState<ResumeSection[]>([]);
  const [activeSection, setActiveSection] = useState("summary");
  const [jobKeywords, setJobKeywords] = useState<string[]>([]);
  
  // Contact Info
  const [contactInfo, setContactInfo] = useState({
    name: "",
    email: "",
    phone: "",
    location: "",
  });

  useEffect(() => {
    const resumeText = sessionStorage.getItem("resumeText");
    const jobDescription = sessionStorage.getItem("jobDescription");

    if (!resumeText || !jobDescription) {
      navigate("/upload");
      return;
    }

    // Extract keywords from job description
    const keywords = extractKeywords(jobDescription);
    setJobKeywords(keywords);

    // Parse resume into sections
    const parsedSections = parseResumeIntoSections(resumeText);
    setSections(parsedSections);
    
    // Try to extract contact info
    extractContactInfo(resumeText);
  }, [navigate]);

  const extractKeywords = (text: string): string[] => {
    const words = text.toLowerCase().match(/\b\w+\b/g) || [];
    const stopWords = new Set(["the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with", "is", "are", "was", "were", "be", "been", "being"]);
    const wordFreq = new Map<string, number>();
    
    words.forEach(word => {
      if (word.length > 3 && !stopWords.has(word)) {
        wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
      }
    });
    
    return Array.from(wordFreq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word]) => word);
  };

  const parseResumeIntoSections = (text: string): ResumeSection[] => {
    const lines = text.split("\n");
    const sectionMap: { [key: string]: string[] } = {
      summary: [],
      experience: [],
      education: [],
      skills: [],
      other: [],
    };
    
    let currentSection = "other";
    
    lines.forEach(line => {
      const lowerLine = line.toLowerCase();
      
      if (lowerLine.includes("summary") || lowerLine.includes("objective") || lowerLine.includes("profile")) {
        currentSection = "summary";
      } else if (lowerLine.includes("experience") || lowerLine.includes("work") || lowerLine.includes("employment")) {
        currentSection = "experience";
      } else if (lowerLine.includes("education") || lowerLine.includes("academic")) {
        currentSection = "education";
      } else if (lowerLine.includes("skill") || lowerLine.includes("technical") || lowerLine.includes("technologies")) {
        currentSection = "skills";
      } else if (line.trim()) {
        sectionMap[currentSection].push(line);
      }
    });

    return [
      { id: "summary", title: "Professional Summary", icon: User, content: sectionMap.summary.join("\n") },
      { id: "experience", title: "Work Experience", icon: Briefcase, content: sectionMap.experience.join("\n") },
      { id: "education", title: "Education", icon: GraduationCap, content: sectionMap.education.join("\n") },
      { id: "skills", title: "Skills", icon: Code, content: sectionMap.skills.join("\n") },
    ];
  };

  const extractContactInfo = (text: string) => {
    const emailMatch = text.match(/[\w.-]+@[\w.-]+\.\w+/);
    const phoneMatch = text.match(/\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
    
    setContactInfo({
      name: "",
      email: emailMatch ? emailMatch[0] : "",
      phone: phoneMatch ? phoneMatch[0] : "",
      location: "",
    });
  };

  const updateSection = (sectionId: string, content: string) => {
    setSections(prev => 
      prev.map(section => 
        section.id === sectionId ? { ...section, content } : section
      )
    );
  };

  const highlightKeywords = (text: string) => {
    let highlightedText = text;
    jobKeywords.forEach(keyword => {
      const regex = new RegExp(`\\b${keyword}\\b`, "gi");
      if (regex.test(text)) {
        highlightedText = highlightedText.replace(regex, match => `**${match}**`);
      }
    });
    return highlightedText;
  };

  const handleSave = () => {
    const fullResume = `${contactInfo.name}\n${contactInfo.email} | ${contactInfo.phone} | ${contactInfo.location}\n\n` +
      sections.map(s => `${s.title.toUpperCase()}\n${s.content}`).join("\n\n");
    
    sessionStorage.setItem("resumeText", fullResume);
    toast({
      title: "Changes saved",
      description: "Your resume edits have been saved.",
    });
  };

  const handleDownloadPDF = () => {
    const doc = new jsPDF();
    const margin = 20;
    let yPosition = margin;

    // Contact Info
    doc.setFontSize(16);
    doc.text(contactInfo.name || "Your Name", margin, yPosition);
    yPosition += 7;
    
    doc.setFontSize(10);
    doc.text(`${contactInfo.email} | ${contactInfo.phone} | ${contactInfo.location}`, margin, yPosition);
    yPosition += 10;

    // Sections
    sections.forEach(section => {
      doc.setFontSize(12);
      doc.text(section.title.toUpperCase(), margin, yPosition);
      yPosition += 7;
      
      doc.setFontSize(10);
      const lines = doc.splitTextToSize(section.content, doc.internal.pageSize.width - 2 * margin);
      lines.forEach((line: string) => {
        if (yPosition > doc.internal.pageSize.height - margin) {
          doc.addPage();
          yPosition = margin;
        }
        doc.text(line, margin, yPosition);
        yPosition += 5;
      });
      yPosition += 5;
    });

    doc.save("resume-edited.pdf");
    toast({
      title: "Download started",
      description: "Your resume is being downloaded as PDF.",
    });
  };

  const currentSection = sections.find(s => s.id === activeSection);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-background/95 backdrop-blur sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <button onClick={() => navigate("/")} className="text-2xl font-bold bg-gradient-hero bg-clip-text text-transparent">
            ResumeAI
          </button>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => navigate("/analysis")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Analysis
            </Button>
            <Button onClick={handleSave}>
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-7xl mx-auto">
          
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-3 flex items-center justify-center gap-3">
              <FileText className="w-8 h-8 text-primary" />
              Resume Editor
            </h1>
            <p className="text-lg text-muted-foreground">
              Edit each section of your resume with keyword highlighting based on the job description
            </p>
          </div>

          {/* Contact Info */}
          <Card className="p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              Contact Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Full Name</label>
                <Input 
                  placeholder="John Doe" 
                  value={contactInfo.name}
                  onChange={(e) => setContactInfo(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Email</label>
                <Input 
                  type="email" 
                  placeholder="john@example.com"
                  value={contactInfo.email}
                  onChange={(e) => setContactInfo(prev => ({ ...prev, email: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Phone</label>
                <Input 
                  placeholder="(555) 123-4567"
                  value={contactInfo.phone}
                  onChange={(e) => setContactInfo(prev => ({ ...prev, phone: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Location</label>
                <Input 
                  placeholder="New York, NY"
                  value={contactInfo.location}
                  onChange={(e) => setContactInfo(prev => ({ ...prev, location: e.target.value }))}
                />
              </div>
            </div>
          </Card>

          {/* Keywords Reference */}
          <Card className="p-4 mb-6 bg-accent/50">
            <div className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-primary mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold mb-2">Job Keywords to Include:</p>
                <div className="flex flex-wrap gap-2">
                  {jobKeywords.map((keyword, i) => (
                    <Badge key={i} variant="secondary" className="bg-primary/10 text-primary">
                      {keyword}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </Card>

          {/* Section Editor */}
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Left: Section Tabs */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Edit Sections</h2>
              <Tabs value={activeSection} onValueChange={setActiveSection}>
                <TabsList className="grid grid-cols-4 w-full">
                  {sections.map(section => {
                    const Icon = section.icon;
                    return (
                      <TabsTrigger key={section.id} value={section.id} className="flex items-center gap-2">
                        <Icon className="w-4 h-4" />
                        <span className="hidden sm:inline">{section.title.split(" ")[0]}</span>
                      </TabsTrigger>
                    );
                  })}
                </TabsList>

                {sections.map(section => (
                  <TabsContent key={section.id} value={section.id}>
                    <Card className="p-6">
                      <h3 className="font-semibold mb-3 flex items-center gap-2">
                        {section.title}
                      </h3>
                      <Textarea
                        value={section.content}
                        onChange={(e) => updateSection(section.id, e.target.value)}
                        className="min-h-[400px] text-sm"
                        placeholder={`Enter your ${section.title.toLowerCase()} here...`}
                      />
                    </Card>
                  </TabsContent>
                ))}
              </Tabs>
            </div>

            {/* Right: Live Preview with Keyword Highlighting */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Preview with Keywords</h2>
                <Badge className="bg-gradient-hero">Live Preview</Badge>
              </div>
              <Card className="p-6">
                <div className="prose prose-sm max-w-none">
                  <div className="mb-6 pb-4 border-b border-border">
                    <h2 className="text-2xl font-bold mb-1">{contactInfo.name || "Your Name"}</h2>
                    <p className="text-sm text-muted-foreground">
                      {contactInfo.email} {contactInfo.email && contactInfo.phone && "|"} {contactInfo.phone} {(contactInfo.email || contactInfo.phone) && contactInfo.location && "|"} {contactInfo.location}
                    </p>
                  </div>

                  {currentSection && (
                    <div>
                      <h3 className="text-lg font-bold mb-3 uppercase">{currentSection.title}</h3>
                      <pre className="whitespace-pre-wrap text-sm font-sans leading-relaxed">
                        {currentSection.content.split(" ").map((word, i) => {
                          const cleanWord = word.toLowerCase().replace(/[^\w]/g, "");
                          const isKeyword = jobKeywords.includes(cleanWord);
                          return (
                            <span 
                              key={i}
                              className={isKeyword ? "bg-primary/20 text-primary font-semibold px-1 rounded" : ""}
                            >
                              {word}{" "}
                            </span>
                          );
                        })}
                      </pre>
                    </div>
                  )}
                </div>
              </Card>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
            <Button variant="hero" size="lg" onClick={handleDownloadPDF}>
              <Download className="w-5 h-5 mr-2" />
              Download as PDF
            </Button>
            <Button variant="outline" size="lg" onClick={() => navigate("/rewrite")}>
              <Sparkles className="w-5 h-5 mr-2" />
              AI Rewrite Mode
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
