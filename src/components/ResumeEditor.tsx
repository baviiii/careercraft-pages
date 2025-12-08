import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  GraduationCap,
  Wrench,
  FileText,
  Plus,
  Trash2,
  Save,
  Download,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  Sparkles,
  RotateCcw,
  Loader2,
  Check,
  X,
  GripVertical,
  Award,
  Link as LinkIcon,
} from 'lucide-react';
import { createPDFFromText, downloadPDF } from '@/lib/pdfService';

interface ContactInfo {
  name: string;
  email: string;
  phone: string;
  location: string;
  linkedin?: string;
  website?: string;
}

interface Experience {
  id: string;
  title: string;
  company: string;
  location: string;
  startDate: string;
  endDate: string;
  current: boolean;
  bullets: string[];
}

interface Education {
  id: string;
  degree: string;
  school: string;
  location: string;
  graduationDate: string;
  gpa?: string;
  highlights?: string[];
}

interface ResumeData {
  contact: ContactInfo;
  summary: string;
  experience: Experience[];
  education: Education[];
  skills: string[];
  certifications?: string[];
  projects?: { id: string; name: string; description: string; technologies: string[] }[];
}

interface ResumeEditorProps {
  initialContent: string;
  originalPdfData?: string | null;
  resumeName: string;
  onSave: (content: string) => void;
  onClose: () => void;
}

// Parse raw text into structured resume data
function parseResumeText(text: string): ResumeData {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  
  const data: ResumeData = {
    contact: { name: '', email: '', phone: '', location: '' },
    summary: '',
    experience: [],
    education: [],
    skills: [],
  };

  // Try to extract contact info from first few lines
  const emailMatch = text.match(/[\w.-]+@[\w.-]+\.\w+/);
  const phoneMatch = text.match(/[\d\s\-().+]{10,}/);
  
  if (emailMatch) data.contact.email = emailMatch[0];
  if (phoneMatch) data.contact.phone = phoneMatch[0].trim();
  
  // First non-email/phone line is likely the name
  for (const line of lines.slice(0, 5)) {
    if (!line.includes('@') && !line.match(/^\d/) && line.length > 2 && line.length < 50) {
      data.contact.name = line;
      break;
    }
  }

  // Find sections
  let currentSection = '';
  let currentContent: string[] = [];
  
  const sectionKeywords = {
    summary: ['summary', 'objective', 'profile', 'about'],
    experience: ['experience', 'work history', 'employment', 'professional experience'],
    education: ['education', 'academic', 'qualifications'],
    skills: ['skills', 'technical skills', 'competencies', 'technologies'],
  };

  for (const line of lines) {
    const lowerLine = line.toLowerCase();
    
    // Check if this is a section header
    let foundSection = '';
    for (const [section, keywords] of Object.entries(sectionKeywords)) {
      if (keywords.some(k => lowerLine.includes(k) && line.length < 40)) {
        foundSection = section;
        break;
      }
    }

    if (foundSection) {
      // Save previous section
      if (currentSection === 'summary') {
        data.summary = currentContent.join(' ');
      } else if (currentSection === 'skills') {
        // Parse skills - split by commas, bullets, or newlines
        const skillText = currentContent.join(' ');
        data.skills = skillText.split(/[,•|·]/).map(s => s.trim()).filter(s => s.length > 1 && s.length < 50);
      }
      
      currentSection = foundSection;
      currentContent = [];
    } else if (currentSection) {
      currentContent.push(line);
    }
  }

  // Handle last section
  if (currentSection === 'summary') {
    data.summary = currentContent.join(' ');
  } else if (currentSection === 'skills') {
    const skillText = currentContent.join(' ');
    data.skills = skillText.split(/[,•|·]/).map(s => s.trim()).filter(s => s.length > 1 && s.length < 50);
  }

  // If no skills found, try to extract from entire text
  if (data.skills.length === 0) {
    const commonSkills = ['JavaScript', 'Python', 'Java', 'React', 'Node.js', 'SQL', 'AWS', 'Docker', 'Git', 'TypeScript', 'HTML', 'CSS', 'MongoDB', 'PostgreSQL', 'Kubernetes', 'Linux', 'Agile', 'Scrum'];
    data.skills = commonSkills.filter(skill => text.toLowerCase().includes(skill.toLowerCase()));
  }

  return data;
}

// Convert structured data back to text
function resumeDataToText(data: ResumeData): string {
  const lines: string[] = [];
  
  // Contact
  if (data.contact.name) lines.push(data.contact.name);
  const contactLine = [data.contact.email, data.contact.phone, data.contact.location].filter(Boolean).join(' | ');
  if (contactLine) lines.push(contactLine);
  if (data.contact.linkedin) lines.push(data.contact.linkedin);
  if (data.contact.website) lines.push(data.contact.website);
  
  lines.push('');
  
  // Summary
  if (data.summary) {
    lines.push('SUMMARY');
    lines.push(data.summary);
    lines.push('');
  }
  
  // Experience
  if (data.experience.length > 0) {
    lines.push('EXPERIENCE');
    for (const exp of data.experience) {
      lines.push(`${exp.title} | ${exp.company}`);
      lines.push(`${exp.location} | ${exp.startDate} - ${exp.current ? 'Present' : exp.endDate}`);
      for (const bullet of exp.bullets) {
        lines.push(`• ${bullet}`);
      }
      lines.push('');
    }
  }
  
  // Education
  if (data.education.length > 0) {
    lines.push('EDUCATION');
    for (const edu of data.education) {
      lines.push(`${edu.degree}`);
      lines.push(`${edu.school} | ${edu.graduationDate}`);
      if (edu.gpa) lines.push(`GPA: ${edu.gpa}`);
      lines.push('');
    }
  }
  
  // Skills
  if (data.skills.length > 0) {
    lines.push('SKILLS');
    lines.push(data.skills.join(' • '));
  }
  
  return lines.join('\n');
}

export function ResumeEditor({ initialContent, originalPdfData, resumeName, onSave, onClose }: ResumeEditorProps) {
  const [resumeData, setResumeData] = useState<ResumeData>(() => parseResumeText(initialContent));
  const [activeTab, setActiveTab] = useState('contact');
  const [showPreview, setShowPreview] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [previewMode, setPreviewMode] = useState<'pdf' | 'text'>('text');

  // Track changes
  useEffect(() => {
    const currentText = resumeDataToText(resumeData);
    setHasChanges(currentText !== initialContent);
  }, [resumeData, initialContent]);

  const updateContact = (field: keyof ContactInfo, value: string) => {
    setResumeData(prev => ({
      ...prev,
      contact: { ...prev.contact, [field]: value }
    }));
  };

  const updateSummary = (value: string) => {
    setResumeData(prev => ({ ...prev, summary: value }));
  };

  const addExperience = () => {
    const newExp: Experience = {
      id: Date.now().toString(),
      title: '',
      company: '',
      location: '',
      startDate: '',
      endDate: '',
      current: false,
      bullets: [''],
    };
    setResumeData(prev => ({
      ...prev,
      experience: [...prev.experience, newExp]
    }));
  };

  const updateExperience = (id: string, field: keyof Experience, value: any) => {
    setResumeData(prev => ({
      ...prev,
      experience: prev.experience.map(exp =>
        exp.id === id ? { ...exp, [field]: value } : exp
      )
    }));
  };

  const removeExperience = (id: string) => {
    setResumeData(prev => ({
      ...prev,
      experience: prev.experience.filter(exp => exp.id !== id)
    }));
  };

  const addBullet = (expId: string) => {
    setResumeData(prev => ({
      ...prev,
      experience: prev.experience.map(exp =>
        exp.id === expId ? { ...exp, bullets: [...exp.bullets, ''] } : exp
      )
    }));
  };

  const updateBullet = (expId: string, index: number, value: string) => {
    setResumeData(prev => ({
      ...prev,
      experience: prev.experience.map(exp =>
        exp.id === expId
          ? { ...exp, bullets: exp.bullets.map((b, i) => i === index ? value : b) }
          : exp
      )
    }));
  };

  const removeBullet = (expId: string, index: number) => {
    setResumeData(prev => ({
      ...prev,
      experience: prev.experience.map(exp =>
        exp.id === expId
          ? { ...exp, bullets: exp.bullets.filter((_, i) => i !== index) }
          : exp
      )
    }));
  };

  const addEducation = () => {
    const newEdu: Education = {
      id: Date.now().toString(),
      degree: '',
      school: '',
      location: '',
      graduationDate: '',
    };
    setResumeData(prev => ({
      ...prev,
      education: [...prev.education, newEdu]
    }));
  };

  const updateEducation = (id: string, field: keyof Education, value: any) => {
    setResumeData(prev => ({
      ...prev,
      education: prev.education.map(edu =>
        edu.id === id ? { ...edu, [field]: value } : edu
      )
    }));
  };

  const removeEducation = (id: string) => {
    setResumeData(prev => ({
      ...prev,
      education: prev.education.filter(edu => edu.id !== id)
    }));
  };

  const addSkill = (skill: string) => {
    if (skill.trim() && !resumeData.skills.includes(skill.trim())) {
      setResumeData(prev => ({
        ...prev,
        skills: [...prev.skills, skill.trim()]
      }));
    }
  };

  const removeSkill = (skill: string) => {
    setResumeData(prev => ({
      ...prev,
      skills: prev.skills.filter(s => s !== skill)
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const content = resumeDataToText(resumeData);
      await onSave(content);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownloadPDF = async () => {
    const content = resumeDataToText(resumeData);
    const pdfBytes = await createPDFFromText(content, {
      title: resumeName,
      author: resumeData.contact.name || 'CareerCraft User',
    });
    downloadPDF(pdfBytes, `${resumeName}.pdf`);
  };

  const handleReset = () => {
    if (confirm('Reset all changes to original content?')) {
      setResumeData(parseResumeText(initialContent));
    }
  };

  const previewContent = resumeDataToText(resumeData);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-background/95 backdrop-blur">
        <div className="flex items-center gap-3">
          <FileText className="w-6 h-6 text-primary" />
          <div>
            <h2 className="text-lg font-bold">{resumeName}</h2>
            <p className="text-sm text-muted-foreground">
              {hasChanges ? 'Unsaved changes' : 'All changes saved'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowPreview(!showPreview)}
          >
            {showPreview ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
            {showPreview ? 'Hide' : 'Show'} Preview
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            disabled={!hasChanges}
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadPDF}
          >
            <Download className="w-4 h-4 mr-2" />
            Export PDF
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={isSaving || !hasChanges}
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Save
          </Button>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Editor Panel */}
        <div className={`flex-1 overflow-y-auto p-4 ${showPreview ? 'border-r' : ''}`}>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-5 w-full mb-4">
              <TabsTrigger value="contact" className="gap-2">
                <User className="w-4 h-4" />
                <span className="hidden sm:inline">Contact</span>
              </TabsTrigger>
              <TabsTrigger value="summary" className="gap-2">
                <FileText className="w-4 h-4" />
                <span className="hidden sm:inline">Summary</span>
              </TabsTrigger>
              <TabsTrigger value="experience" className="gap-2">
                <Briefcase className="w-4 h-4" />
                <span className="hidden sm:inline">Experience</span>
              </TabsTrigger>
              <TabsTrigger value="education" className="gap-2">
                <GraduationCap className="w-4 h-4" />
                <span className="hidden sm:inline">Education</span>
              </TabsTrigger>
              <TabsTrigger value="skills" className="gap-2">
                <Wrench className="w-4 h-4" />
                <span className="hidden sm:inline">Skills</span>
              </TabsTrigger>
            </TabsList>

            {/* Contact Tab */}
            <TabsContent value="contact" className="space-y-4">
              <Card className="p-4 space-y-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Personal Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-1 block">Full Name</label>
                    <Input
                      value={resumeData.contact.name}
                      onChange={(e) => updateContact('name', e.target.value)}
                      placeholder="John Doe"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Email</label>
                    <Input
                      type="email"
                      value={resumeData.contact.email}
                      onChange={(e) => updateContact('email', e.target.value)}
                      placeholder="john@example.com"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Phone</label>
                    <Input
                      value={resumeData.contact.phone}
                      onChange={(e) => updateContact('phone', e.target.value)}
                      placeholder="+1 (555) 123-4567"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Location</label>
                    <Input
                      value={resumeData.contact.location}
                      onChange={(e) => updateContact('location', e.target.value)}
                      placeholder="San Francisco, CA"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">LinkedIn</label>
                    <Input
                      value={resumeData.contact.linkedin || ''}
                      onChange={(e) => updateContact('linkedin', e.target.value)}
                      placeholder="linkedin.com/in/johndoe"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Website</label>
                    <Input
                      value={resumeData.contact.website || ''}
                      onChange={(e) => updateContact('website', e.target.value)}
                      placeholder="johndoe.com"
                    />
                  </div>
                </div>
              </Card>
            </TabsContent>

            {/* Summary Tab */}
            <TabsContent value="summary" className="space-y-4">
              <Card className="p-4 space-y-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Professional Summary
                </h3>
                <Textarea
                  value={resumeData.summary}
                  onChange={(e) => updateSummary(e.target.value)}
                  placeholder="A brief summary of your professional background, key achievements, and career goals..."
                  className="min-h-[200px]"
                />
                <p className="text-xs text-muted-foreground">
                  {resumeData.summary.split(/\s+/).filter(Boolean).length} words • Aim for 50-150 words
                </p>
              </Card>
            </TabsContent>

            {/* Experience Tab */}
            <TabsContent value="experience" className="space-y-4">
              <AnimatePresence>
                {resumeData.experience.map((exp, index) => (
                  <motion.div
                    key={exp.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                  >
                    <Card className="p-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold flex items-center gap-2">
                          <Briefcase className="w-4 h-4" />
                          Position {index + 1}
                        </h3>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeExperience(exp.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium mb-1 block">Job Title</label>
                          <Input
                            value={exp.title}
                            onChange={(e) => updateExperience(exp.id, 'title', e.target.value)}
                            placeholder="Software Engineer"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-1 block">Company</label>
                          <Input
                            value={exp.company}
                            onChange={(e) => updateExperience(exp.id, 'company', e.target.value)}
                            placeholder="Tech Company Inc."
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-1 block">Location</label>
                          <Input
                            value={exp.location}
                            onChange={(e) => updateExperience(exp.id, 'location', e.target.value)}
                            placeholder="San Francisco, CA"
                          />
                        </div>
                        <div className="flex gap-2">
                          <div className="flex-1">
                            <label className="text-sm font-medium mb-1 block">Start Date</label>
                            <Input
                              value={exp.startDate}
                              onChange={(e) => updateExperience(exp.id, 'startDate', e.target.value)}
                              placeholder="Jan 2020"
                            />
                          </div>
                          <div className="flex-1">
                            <label className="text-sm font-medium mb-1 block">End Date</label>
                            <Input
                              value={exp.current ? 'Present' : exp.endDate}
                              onChange={(e) => updateExperience(exp.id, 'endDate', e.target.value)}
                              placeholder="Present"
                              disabled={exp.current}
                            />
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="text-sm font-medium mb-2 block">Achievements & Responsibilities</label>
                        <div className="space-y-2">
                          {exp.bullets.map((bullet, bulletIndex) => (
                            <div key={bulletIndex} className="flex gap-2">
                              <span className="text-muted-foreground mt-2">•</span>
                              <Textarea
                                value={bullet}
                                onChange={(e) => updateBullet(exp.id, bulletIndex, e.target.value)}
                                placeholder="Describe an achievement or responsibility..."
                                className="flex-1 min-h-[60px]"
                              />
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => removeBullet(exp.id, bulletIndex)}
                                disabled={exp.bullets.length <= 1}
                                className="text-muted-foreground hover:text-destructive"
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => addBullet(exp.id)}
                          className="mt-2"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Add Bullet Point
                        </Button>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>

              <Button onClick={addExperience} variant="outline" className="w-full">
                <Plus className="w-4 h-4 mr-2" />
                Add Experience
              </Button>
            </TabsContent>

            {/* Education Tab */}
            <TabsContent value="education" className="space-y-4">
              <AnimatePresence>
                {resumeData.education.map((edu, index) => (
                  <motion.div
                    key={edu.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                  >
                    <Card className="p-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold flex items-center gap-2">
                          <GraduationCap className="w-4 h-4" />
                          Education {index + 1}
                        </h3>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeEducation(edu.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                          <label className="text-sm font-medium mb-1 block">Degree</label>
                          <Input
                            value={edu.degree}
                            onChange={(e) => updateEducation(edu.id, 'degree', e.target.value)}
                            placeholder="Bachelor of Science in Computer Science"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-1 block">School</label>
                          <Input
                            value={edu.school}
                            onChange={(e) => updateEducation(edu.id, 'school', e.target.value)}
                            placeholder="University of California"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-1 block">Graduation Date</label>
                          <Input
                            value={edu.graduationDate}
                            onChange={(e) => updateEducation(edu.id, 'graduationDate', e.target.value)}
                            placeholder="May 2020"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-1 block">GPA (Optional)</label>
                          <Input
                            value={edu.gpa || ''}
                            onChange={(e) => updateEducation(edu.id, 'gpa', e.target.value)}
                            placeholder="3.8/4.0"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-1 block">Location</label>
                          <Input
                            value={edu.location}
                            onChange={(e) => updateEducation(edu.id, 'location', e.target.value)}
                            placeholder="Berkeley, CA"
                          />
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>

              <Button onClick={addEducation} variant="outline" className="w-full">
                <Plus className="w-4 h-4 mr-2" />
                Add Education
              </Button>
            </TabsContent>

            {/* Skills Tab */}
            <TabsContent value="skills" className="space-y-4">
              <Card className="p-4 space-y-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <Wrench className="w-4 h-4" />
                  Skills & Technologies
                </h3>
                
                <div className="flex flex-wrap gap-2">
                  {resumeData.skills.map((skill) => (
                    <Badge
                      key={skill}
                      variant="secondary"
                      className="px-3 py-1 text-sm cursor-pointer hover:bg-destructive/20 group"
                      onClick={() => removeSkill(skill)}
                    >
                      {skill}
                      <X className="w-3 h-3 ml-2 opacity-0 group-hover:opacity-100" />
                    </Badge>
                  ))}
                </div>

                <div className="flex gap-2">
                  <Input
                    placeholder="Add a skill..."
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        addSkill((e.target as HTMLInputElement).value);
                        (e.target as HTMLInputElement).value = '';
                      }
                    }}
                  />
                  <Button
                    variant="outline"
                    onClick={(e) => {
                      const input = (e.target as HTMLElement).previousElementSibling as HTMLInputElement;
                      if (input) {
                        addSkill(input.value);
                        input.value = '';
                      }
                    }}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>

                <p className="text-xs text-muted-foreground">
                  Click on a skill to remove it. Press Enter to add new skills.
                </p>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Preview Panel */}
        {showPreview && (
          <div className="w-1/2 overflow-hidden flex flex-col bg-muted/30">
            <div className="p-2 border-b bg-background flex items-center justify-between">
              <span className="text-sm font-medium">Live Preview</span>
              <div className="flex gap-1">
                <Button
                  variant={previewMode === 'text' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setPreviewMode('text')}
                >
                  Text
                </Button>
                {originalPdfData && (
                  <Button
                    variant={previewMode === 'pdf' ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => setPreviewMode('pdf')}
                  >
                    Original PDF
                  </Button>
                )}
              </div>
            </div>
            <div className="flex-1 overflow-auto p-4">
              {previewMode === 'pdf' && originalPdfData ? (
                <iframe
                  src={`data:application/pdf;base64,${originalPdfData}`}
                  className="w-full h-full min-h-[600px] rounded border"
                  title="Original PDF"
                />
              ) : (
                <Card className="p-6 bg-white dark:bg-gray-950 min-h-full">
                  <div className="whitespace-pre-wrap text-sm leading-relaxed font-mono">
                    {previewContent || 'Start editing to see preview...'}
                  </div>
                </Card>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
