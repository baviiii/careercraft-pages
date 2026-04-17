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
  Languages,
  Heart,
  BookOpen,
  Users,
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

interface Certification {
  id: string;
  name: string;
  issuer?: string;
  date?: string;
  expiryDate?: string;
}

interface Reference {
  id: string;
  name: string;
  title?: string;
  company?: string;
  phone?: string;
  email?: string;
  relationship?: string;
}

interface Language {
  id: string;
  language: string;
  proficiency: string;
}

interface AwardType {
  id: string;
  title: string;
  issuer?: string;
  date?: string;
  description?: string;
}

interface Volunteer {
  id: string;
  role: string;
  organization: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  current?: boolean;
  description?: string;
}

interface Publication {
  id: string;
  title: string;
  publisher?: string;
  date?: string;
  url?: string;
  description?: string;
}

interface ResumeData {
  contact: ContactInfo;
  summary: string;
  experience: Experience[];
  education: Education[];
  skills: string[];
  // Optional sections
  projects?: { id: string; name: string; description: string; technologies: string[] }[];
  certifications?: Certification[];
  references?: Reference[];
  languages?: Language[];
  awards?: AwardType[];
  volunteer?: Volunteer[];
  publications?: Publication[];
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

  // Certifications CRUD
  const addCertification = () => {
    const newCert: Certification = {
      id: Date.now().toString(),
      name: '',
      issuer: '',
      date: '',
    };
    setResumeData(prev => ({
      ...prev,
      certifications: [...(prev.certifications || []), newCert]
    }));
  };

  const updateCertification = (id: string, field: keyof Certification, value: any) => {
    setResumeData(prev => ({
      ...prev,
      certifications: (prev.certifications || []).map(cert =>
        cert.id === id ? { ...cert, [field]: value } : cert
      )
    }));
  };

  const removeCertification = (id: string) => {
    setResumeData(prev => ({
      ...prev,
      certifications: (prev.certifications || []).filter(cert => cert.id !== id)
    }));
  };

  // References CRUD
  const addReference = () => {
    const newRef: Reference = {
      id: Date.now().toString(),
      name: '',
      title: '',
      company: '',
      phone: '',
      email: '',
      relationship: '',
    };
    setResumeData(prev => ({
      ...prev,
      references: [...(prev.references || []), newRef]
    }));
  };

  const updateReference = (id: string, field: keyof Reference, value: any) => {
    setResumeData(prev => ({
      ...prev,
      references: (prev.references || []).map(ref =>
        ref.id === id ? { ...ref, [field]: value } : ref
      )
    }));
  };

  const removeReference = (id: string) => {
    setResumeData(prev => ({
      ...prev,
      references: (prev.references || []).filter(ref => ref.id !== id)
    }));
  };

  // Languages CRUD
  const addLanguage = () => {
    const newLang: Language = {
      id: Date.now().toString(),
      language: '',
      proficiency: 'Professional',
    };
    setResumeData(prev => ({
      ...prev,
      languages: [...(prev.languages || []), newLang]
    }));
  };

  const updateLanguage = (id: string, field: keyof Language, value: any) => {
    setResumeData(prev => ({
      ...prev,
      languages: (prev.languages || []).map(lang =>
        lang.id === id ? { ...lang, [field]: value } : lang
      )
    }));
  };

  const removeLanguage = (id: string) => {
    setResumeData(prev => ({
      ...prev,
      languages: (prev.languages || []).filter(lang => lang.id !== id)
    }));
  };

  // Awards CRUD
  const addAward = () => {
    const newAward: AwardType = {
      id: Date.now().toString(),
      title: '',
      issuer: '',
      date: '',
    };
    setResumeData(prev => ({
      ...prev,
      awards: [...(prev.awards || []), newAward]
    }));
  };

  const updateAward = (id: string, field: keyof AwardType, value: any) => {
    setResumeData(prev => ({
      ...prev,
      awards: (prev.awards || []).map(award =>
        award.id === id ? { ...award, [field]: value } : award
      )
    }));
  };

  const removeAward = (id: string) => {
    setResumeData(prev => ({
      ...prev,
      awards: (prev.awards || []).filter(award => award.id !== id)
    }));
  };

  // Volunteer CRUD
  const addVolunteer = () => {
    const newVol: Volunteer = {
      id: Date.now().toString(),
      role: '',
      organization: '',
      location: '',
      startDate: '',
      endDate: '',
      current: false,
    };
    setResumeData(prev => ({
      ...prev,
      volunteer: [...(prev.volunteer || []), newVol]
    }));
  };

  const updateVolunteer = (id: string, field: keyof Volunteer, value: any) => {
    setResumeData(prev => ({
      ...prev,
      volunteer: (prev.volunteer || []).map(vol =>
        vol.id === id ? { ...vol, [field]: value } : vol
      )
    }));
  };

  const removeVolunteer = (id: string) => {
    setResumeData(prev => ({
      ...prev,
      volunteer: (prev.volunteer || []).filter(vol => vol.id !== id)
    }));
  };

  // Publications CRUD
  const addPublication = () => {
    const newPub: Publication = {
      id: Date.now().toString(),
      title: '',
      publisher: '',
      date: '',
      url: '',
    };
    setResumeData(prev => ({
      ...prev,
      publications: [...(prev.publications || []), newPub]
    }));
  };

  const updatePublication = (id: string, field: keyof Publication, value: any) => {
    setResumeData(prev => ({
      ...prev,
      publications: (prev.publications || []).map(pub =>
        pub.id === id ? { ...pub, [field]: value } : pub
      )
    }));
  };

  const removePublication = (id: string) => {
    setResumeData(prev => ({
      ...prev,
      publications: (prev.publications || []).filter(pub => pub.id !== id)
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
            <div className="overflow-x-auto mb-4">
              <TabsList className="inline-flex flex-nowrap w-max min-w-full">
                <TabsTrigger value="contact" className="gap-2 flex-shrink-0">
                  <User className="w-4 h-4" />
                  <span className="hidden sm:inline">Contact</span>
                </TabsTrigger>
                <TabsTrigger value="summary" className="gap-2 flex-shrink-0">
                  <FileText className="w-4 h-4" />
                  <span className="hidden sm:inline">Summary</span>
                </TabsTrigger>
                <TabsTrigger value="experience" className="gap-2 flex-shrink-0">
                  <Briefcase className="w-4 h-4" />
                  <span className="hidden sm:inline">Experience</span>
                </TabsTrigger>
                <TabsTrigger value="education" className="gap-2 flex-shrink-0">
                  <GraduationCap className="w-4 h-4" />
                  <span className="hidden sm:inline">Education</span>
                </TabsTrigger>
                <TabsTrigger value="skills" className="gap-2 flex-shrink-0">
                  <Wrench className="w-4 h-4" />
                  <span className="hidden sm:inline">Skills</span>
                </TabsTrigger>
                <TabsTrigger value="certifications" className="gap-2 flex-shrink-0">
                  <Award className="w-4 h-4" />
                  <span className="hidden sm:inline">Certifications</span>
                </TabsTrigger>
                <TabsTrigger value="references" className="gap-2 flex-shrink-0">
                  <Users className="w-4 h-4" />
                  <span className="hidden sm:inline">References</span>
                </TabsTrigger>
                <TabsTrigger value="languages" className="gap-2 flex-shrink-0">
                  <Languages className="w-4 h-4" />
                  <span className="hidden sm:inline">Languages</span>
                </TabsTrigger>
                <TabsTrigger value="awards" className="gap-2 flex-shrink-0">
                  <Award className="w-4 h-4" />
                  <span className="hidden sm:inline">Awards</span>
                </TabsTrigger>
                <TabsTrigger value="volunteer" className="gap-2 flex-shrink-0">
                  <Heart className="w-4 h-4" />
                  <span className="hidden sm:inline">Volunteer</span>
                </TabsTrigger>
                <TabsTrigger value="publications" className="gap-2 flex-shrink-0">
                  <BookOpen className="w-4 h-4" />
                  <span className="hidden sm:inline">Publications</span>
                </TabsTrigger>
              </TabsList>
            </div>

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

            {/* Certifications Tab */}
            <TabsContent value="certifications" className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <Award className="w-4 h-4" />
                  Certifications
                </h3>
                <Button onClick={addCertification} size="sm" variant="outline">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Certification
                </Button>
              </div>

              <AnimatePresence>
                {(resumeData.certifications || []).map((cert) => (
                  <motion.div
                    key={cert.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                  >
                    <Card className="p-4 space-y-4">
                      <div className="flex justify-between items-start">
                        <h4 className="font-medium">Certification</h4>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeCertification(cert.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                          <label className="text-sm font-medium mb-1 block">Certification Name *</label>
                          <Input
                            value={cert.name}
                            onChange={(e) => updateCertification(cert.id, 'name', e.target.value)}
                            placeholder="AWS Certified Solutions Architect"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-1 block">Issuing Organization</label>
                          <Input
                            value={cert.issuer || ''}
                            onChange={(e) => updateCertification(cert.id, 'issuer', e.target.value)}
                            placeholder="Amazon Web Services"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-1 block">Date Obtained</label>
                          <Input
                            value={cert.date || ''}
                            onChange={(e) => updateCertification(cert.id, 'date', e.target.value)}
                            placeholder="January 2024"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-1 block">Expiry Date (Optional)</label>
                          <Input
                            value={cert.expiryDate || ''}
                            onChange={(e) => updateCertification(cert.id, 'expiryDate', e.target.value)}
                            placeholder="January 2027"
                          />
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>

              {(resumeData.certifications || []).length === 0 && (
                <Card className="p-8 text-center text-muted-foreground">
                  <Award className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No certifications added yet</p>
                  <p className="text-sm">Click "Add Certification" to get started</p>
                </Card>
              )}
            </TabsContent>

            {/* References Tab */}
            <TabsContent value="references" className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Professional References
                </h3>
                <Button onClick={addReference} size="sm" variant="outline">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Reference
                </Button>
              </div>

              <AnimatePresence>
                {(resumeData.references || []).map((ref) => (
                  <motion.div
                    key={ref.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                  >
                    <Card className="p-4 space-y-4">
                      <div className="flex justify-between items-start">
                        <h4 className="font-medium">Reference</h4>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeReference(ref.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium mb-1 block">Full Name *</label>
                          <Input
                            value={ref.name}
                            onChange={(e) => updateReference(ref.id, 'name', e.target.value)}
                            placeholder="John Smith"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-1 block">Job Title</label>
                          <Input
                            value={ref.title || ''}
                            onChange={(e) => updateReference(ref.id, 'title', e.target.value)}
                            placeholder="Senior Manager"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-1 block">Company</label>
                          <Input
                            value={ref.company || ''}
                            onChange={(e) => updateReference(ref.id, 'company', e.target.value)}
                            placeholder="Tech Corp"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-1 block">Phone</label>
                          <Input
                            value={ref.phone || ''}
                            onChange={(e) => updateReference(ref.id, 'phone', e.target.value)}
                            placeholder="(555) 123-4567"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-1 block">Email</label>
                          <Input
                            value={ref.email || ''}
                            onChange={(e) => updateReference(ref.id, 'email', e.target.value)}
                            placeholder="john@example.com"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-1 block">Relationship</label>
                          <Input
                            value={ref.relationship || ''}
                            onChange={(e) => updateReference(ref.id, 'relationship', e.target.value)}
                            placeholder="Former supervisor"
                          />
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>

              {(resumeData.references || []).length === 0 && (
                <Card className="p-8 text-center text-muted-foreground">
                  <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No references added yet</p>
                  <p className="text-sm">Click "Add Reference" to get started</p>
                </Card>
              )}
            </TabsContent>

            {/* Languages Tab */}
            <TabsContent value="languages" className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <Languages className="w-4 h-4" />
                  Languages
                </h3>
                <Button onClick={addLanguage} size="sm" variant="outline">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Language
                </Button>
              </div>

              <AnimatePresence>
                {(resumeData.languages || []).map((lang) => (
                  <motion.div
                    key={lang.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                  >
                    <Card className="p-4 space-y-4">
                      <div className="flex justify-between items-start">
                        <h4 className="font-medium">Language</h4>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeLanguage(lang.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium mb-1 block">Language *</label>
                          <Input
                            value={lang.language}
                            onChange={(e) => updateLanguage(lang.id, 'language', e.target.value)}
                            placeholder="Spanish"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-1 block">Proficiency Level</label>
                          <select
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                            value={lang.proficiency}
                            onChange={(e) => updateLanguage(lang.id, 'proficiency', e.target.value)}
                          >
                            <option value="Native">Native</option>
                            <option value="Fluent">Fluent</option>
                            <option value="Professional">Professional Working Proficiency</option>
                            <option value="Intermediate">Intermediate</option>
                            <option value="Basic">Basic</option>
                          </select>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>

              {(resumeData.languages || []).length === 0 && (
                <Card className="p-8 text-center text-muted-foreground">
                  <Languages className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No languages added yet</p>
                  <p className="text-sm">Click "Add Language" to get started</p>
                </Card>
              )}
            </TabsContent>

            {/* Awards Tab */}
            <TabsContent value="awards" className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <Award className="w-4 h-4" />
                  Awards & Honors
                </h3>
                <Button onClick={addAward} size="sm" variant="outline">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Award
                </Button>
              </div>

              <AnimatePresence>
                {(resumeData.awards || []).map((award) => (
                  <motion.div
                    key={award.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                  >
                    <Card className="p-4 space-y-4">
                      <div className="flex justify-between items-start">
                        <h4 className="font-medium">Award</h4>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeAward(award.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                          <label className="text-sm font-medium mb-1 block">Award Title *</label>
                          <Input
                            value={award.title}
                            onChange={(e) => updateAward(award.id, 'title', e.target.value)}
                            placeholder="Employee of the Year"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-1 block">Issuing Organization</label>
                          <Input
                            value={award.issuer || ''}
                            onChange={(e) => updateAward(award.id, 'issuer', e.target.value)}
                            placeholder="Company Name"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-1 block">Date Received</label>
                          <Input
                            value={award.date || ''}
                            onChange={(e) => updateAward(award.id, 'date', e.target.value)}
                            placeholder="December 2023"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="text-sm font-medium mb-1 block">Description (Optional)</label>
                          <Textarea
                            value={award.description || ''}
                            onChange={(e) => updateAward(award.id, 'description', e.target.value)}
                            placeholder="Brief description of the award and why it was received"
                            rows={2}
                          />
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>

              {(resumeData.awards || []).length === 0 && (
                <Card className="p-8 text-center text-muted-foreground">
                  <Award className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No awards added yet</p>
                  <p className="text-sm">Click "Add Award" to get started</p>
                </Card>
              )}
            </TabsContent>

            {/* Volunteer Tab */}
            <TabsContent value="volunteer" className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <Heart className="w-4 h-4" />
                  Volunteer Experience
                </h3>
                <Button onClick={addVolunteer} size="sm" variant="outline">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Volunteer Work
                </Button>
              </div>

              <AnimatePresence>
                {(resumeData.volunteer || []).map((vol) => (
                  <motion.div
                    key={vol.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                  >
                    <Card className="p-4 space-y-4">
                      <div className="flex justify-between items-start">
                        <h4 className="font-medium">Volunteer Position</h4>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeVolunteer(vol.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium mb-1 block">Role *</label>
                          <Input
                            value={vol.role}
                            onChange={(e) => updateVolunteer(vol.id, 'role', e.target.value)}
                            placeholder="Volunteer Coordinator"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-1 block">Organization *</label>
                          <Input
                            value={vol.organization}
                            onChange={(e) => updateVolunteer(vol.id, 'organization', e.target.value)}
                            placeholder="Local Food Bank"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-1 block">Location</label>
                          <Input
                            value={vol.location || ''}
                            onChange={(e) => updateVolunteer(vol.id, 'location', e.target.value)}
                            placeholder="San Francisco, CA"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={vol.current || false}
                            onChange={(e) => updateVolunteer(vol.id, 'current', e.target.checked)}
                            className="rounded"
                          />
                          <label className="text-sm font-medium">Currently volunteering here</label>
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-1 block">Start Date</label>
                          <Input
                            value={vol.startDate || ''}
                            onChange={(e) => updateVolunteer(vol.id, 'startDate', e.target.value)}
                            placeholder="January 2022"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-1 block">End Date</label>
                          <Input
                            value={vol.endDate || ''}
                            onChange={(e) => updateVolunteer(vol.id, 'endDate', e.target.value)}
                            placeholder="Present"
                            disabled={vol.current}
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="text-sm font-medium mb-1 block">Description</label>
                          <Textarea
                            value={vol.description || ''}
                            onChange={(e) => updateVolunteer(vol.id, 'description', e.target.value)}
                            placeholder="Describe your volunteer work and impact"
                            rows={3}
                          />
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>

              {(resumeData.volunteer || []).length === 0 && (
                <Card className="p-8 text-center text-muted-foreground">
                  <Heart className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No volunteer experience added yet</p>
                  <p className="text-sm">Click "Add Volunteer Work" to get started</p>
                </Card>
              )}
            </TabsContent>

            {/* Publications Tab */}
            <TabsContent value="publications" className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <BookOpen className="w-4 h-4" />
                  Publications
                </h3>
                <Button onClick={addPublication} size="sm" variant="outline">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Publication
                </Button>
              </div>

              <AnimatePresence>
                {(resumeData.publications || []).map((pub) => (
                  <motion.div
                    key={pub.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                  >
                    <Card className="p-4 space-y-4">
                      <div className="flex justify-between items-start">
                        <h4 className="font-medium">Publication</h4>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removePublication(pub.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                          <label className="text-sm font-medium mb-1 block">Title *</label>
                          <Input
                            value={pub.title}
                            onChange={(e) => updatePublication(pub.id, 'title', e.target.value)}
                            placeholder="Research Paper Title"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-1 block">Publisher/Journal</label>
                          <Input
                            value={pub.publisher || ''}
                            onChange={(e) => updatePublication(pub.id, 'publisher', e.target.value)}
                            placeholder="Journal Name"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-1 block">Publication Date</label>
                          <Input
                            value={pub.date || ''}
                            onChange={(e) => updatePublication(pub.id, 'date', e.target.value)}
                            placeholder="March 2024"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="text-sm font-medium mb-1 block">URL (Optional)</label>
                          <Input
                            value={pub.url || ''}
                            onChange={(e) => updatePublication(pub.id, 'url', e.target.value)}
                            placeholder="https://doi.org/..."
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="text-sm font-medium mb-1 block">Description (Optional)</label>
                          <Textarea
                            value={pub.description || ''}
                            onChange={(e) => updatePublication(pub.id, 'description', e.target.value)}
                            placeholder="Brief description of the publication"
                            rows={2}
                          />
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>

              {(resumeData.publications || []).length === 0 && (
                <Card className="p-8 text-center text-muted-foreground">
                  <BookOpen className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No publications added yet</p>
                  <p className="text-sm">Click "Add Publication" to get started</p>
                </Card>
              )}
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
