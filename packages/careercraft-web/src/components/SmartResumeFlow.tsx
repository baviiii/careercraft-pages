import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  User,
  Briefcase,
  GraduationCap,
  Code,
  Award,
  Globe,
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Check,
  Sparkles,
  Edit3,
  Save,
  X,
} from 'lucide-react'
import SmartResumeUploader from './SmartResumeUploader'
import { ParsedResume, convertToTemplateFormat } from '@/hooks/useResumeParser'

interface SmartResumeFlowProps {
  onComplete: (templateData: ReturnType<typeof convertToTemplateFormat>) => void
  onCancel?: () => void
}

export default function SmartResumeFlow({ onComplete, onCancel }: SmartResumeFlowProps) {
  const [step, setStep] = useState<'upload' | 'edit'>('upload')
  const [parsedData, setParsedData] = useState<ParsedResume | null>(null)
  const [editedData, setEditedData] = useState<ReturnType<typeof convertToTemplateFormat> | null>(null)
  const [activeTab, setActiveTab] = useState('personal')

  const handleParsed = (parsed: ParsedResume, templateData: ReturnType<typeof convertToTemplateFormat>) => {
    setParsedData(parsed)
    setEditedData(templateData)
    setStep('edit')
  }

  const handleComplete = () => {
    if (editedData) {
      onComplete(editedData)
    }
  }

  const updatePersonalDetails = (field: string, value: string) => {
    if (!editedData) return
    setEditedData({
      ...editedData,
      personalDetails: {
        ...editedData.personalDetails,
        [field]: value
      }
    })
  }

  const updateExperience = (index: number, field: string, value: any) => {
    if (!editedData) return
    const newExp = [...editedData.experience]
    newExp[index] = { ...newExp[index], [field]: value }
    setEditedData({ ...editedData, experience: newExp })
  }

  const addExperience = () => {
    if (!editedData) return
    setEditedData({
      ...editedData,
      experience: [...editedData.experience, {
        id: `exp-${Date.now()}`,
        company: '',
        position: '',
        location: '',
        startDate: '',
        endDate: '',
        description: '',
        highlights: []
      }]
    })
  }

  const removeExperience = (index: number) => {
    if (!editedData) return
    setEditedData({
      ...editedData,
      experience: editedData.experience.filter((_, i) => i !== index)
    })
  }

  const updateEducation = (index: number, field: string, value: any) => {
    if (!editedData) return
    const newEdu = [...editedData.education]
    newEdu[index] = { ...newEdu[index], [field]: value }
    setEditedData({ ...editedData, education: newEdu })
  }

  const addEducation = () => {
    if (!editedData) return
    setEditedData({
      ...editedData,
      education: [...editedData.education, {
        id: `edu-${Date.now()}`,
        institution: '',
        degree: '',
        field: '',
        startDate: '',
        endDate: '',
        gpa: '',
        achievements: []
      }]
    })
  }

  const removeEducation = (index: number) => {
    if (!editedData) return
    setEditedData({
      ...editedData,
      education: editedData.education.filter((_, i) => i !== index)
    })
  }

  const addSkill = (skill: string) => {
    if (!editedData || !skill.trim()) return
    if (!editedData.skills.includes(skill.trim())) {
      setEditedData({
        ...editedData,
        skills: [...editedData.skills, skill.trim()]
      })
    }
  }

  const removeSkill = (skill: string) => {
    if (!editedData) return
    setEditedData({
      ...editedData,
      skills: editedData.skills.filter(s => s !== skill)
    })
  }

  // Upload step
  if (step === 'upload') {
    return (
      <SmartResumeUploader 
        onParsed={handleParsed}
        onCancel={onCancel}
      />
    )
  }

  // Edit step
  return (
    <Card className="bg-slate-900/50 border-slate-800/50 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-slate-800/50 flex items-center justify-between bg-slate-900/80">
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => setStep('upload')}
            className="text-slate-400 hover:text-white"
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div>
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Edit3 className="w-5 h-5 text-purple-400" />
              Review & Edit
            </h2>
            <p className="text-sm text-slate-400">
              Make any quick fixes before applying to your resume
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {parsedData && (
            <Badge className={`${
              parsedData.confidence >= 0.8 
                ? 'bg-green-500/20 text-green-400' 
                : parsedData.confidence >= 0.6 
                ? 'bg-yellow-500/20 text-yellow-400'
                : 'bg-orange-500/20 text-orange-400'
            }`}>
              {Math.round(parsedData.confidence * 100)}% confidence
            </Badge>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-[600px]">
        <TabsList className="w-full justify-start gap-1 px-4 py-2 bg-slate-900/50 border-b border-slate-800/50 rounded-none">
          <TabsTrigger value="personal" className="gap-2 data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-400">
            <User className="w-4 h-4" />
            Personal
          </TabsTrigger>
          <TabsTrigger value="experience" className="gap-2 data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-400">
            <Briefcase className="w-4 h-4" />
            Experience
            {editedData && editedData.experience.length > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs px-1.5">
                {editedData.experience.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="education" className="gap-2 data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-400">
            <GraduationCap className="w-4 h-4" />
            Education
            {editedData && editedData.education.length > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs px-1.5">
                {editedData.education.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="skills" className="gap-2 data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-400">
            <Code className="w-4 h-4" />
            Skills
            {editedData && editedData.skills.length > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs px-1.5">
                {editedData.skills.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <ScrollArea className="flex-1">
          {editedData && (
            <>
              {/* Personal Info Tab */}
              <TabsContent value="personal" className="p-4 m-0 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-slate-400">Full Name</Label>
                    <Input
                      value={editedData.personalDetails.fullName}
                      onChange={(e) => updatePersonalDetails('fullName', e.target.value)}
                      className="mt-1 bg-slate-800/50 border-slate-700"
                      placeholder="John Doe"
                    />
                  </div>
                  <div>
                    <Label className="text-slate-400">Email</Label>
                    <Input
                      value={editedData.personalDetails.email}
                      onChange={(e) => updatePersonalDetails('email', e.target.value)}
                      className="mt-1 bg-slate-800/50 border-slate-700"
                      placeholder="john@example.com"
                    />
                  </div>
                  <div>
                    <Label className="text-slate-400">Phone</Label>
                    <Input
                      value={editedData.personalDetails.phone}
                      onChange={(e) => updatePersonalDetails('phone', e.target.value)}
                      className="mt-1 bg-slate-800/50 border-slate-700"
                      placeholder="+61 400 000 000"
                    />
                  </div>
                  <div>
                    <Label className="text-slate-400">Location</Label>
                    <Input
                      value={editedData.personalDetails.location}
                      onChange={(e) => updatePersonalDetails('location', e.target.value)}
                      className="mt-1 bg-slate-800/50 border-slate-700"
                      placeholder="Adelaide, SA"
                    />
                  </div>
                  <div>
                    <Label className="text-slate-400">LinkedIn</Label>
                    <Input
                      value={editedData.personalDetails.linkedin}
                      onChange={(e) => updatePersonalDetails('linkedin', e.target.value)}
                      className="mt-1 bg-slate-800/50 border-slate-700"
                      placeholder="linkedin.com/in/johndoe"
                    />
                  </div>
                  <div>
                    <Label className="text-slate-400">Website</Label>
                    <Input
                      value={editedData.personalDetails.website}
                      onChange={(e) => updatePersonalDetails('website', e.target.value)}
                      className="mt-1 bg-slate-800/50 border-slate-700"
                      placeholder="johndoe.com"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-slate-400">Professional Summary</Label>
                  <Textarea
                    value={editedData.personalDetails.summary}
                    onChange={(e) => updatePersonalDetails('summary', e.target.value)}
                    className="mt-1 bg-slate-800/50 border-slate-700 min-h-[120px]"
                    placeholder="A brief summary of your professional background..."
                  />
                </div>
              </TabsContent>

              {/* Experience Tab */}
              <TabsContent value="experience" className="p-4 m-0 space-y-4">
                {editedData.experience.map((exp, index) => (
                  <Card key={exp.id} className="p-4 bg-slate-800/30 border-slate-700/50">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                          <Briefcase className="w-4 h-4 text-purple-400" />
                        </div>
                        <span className="text-sm text-slate-400">Experience {index + 1}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeExperience(index)}
                        className="text-slate-400 hover:text-red-400 h-8 w-8"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs text-slate-500">Job Title</Label>
                        <Input
                          value={exp.position}
                          onChange={(e) => updateExperience(index, 'position', e.target.value)}
                          className="mt-1 bg-slate-800/50 border-slate-700 h-9"
                          placeholder="Software Engineer"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-slate-500">Company</Label>
                        <Input
                          value={exp.company}
                          onChange={(e) => updateExperience(index, 'company', e.target.value)}
                          className="mt-1 bg-slate-800/50 border-slate-700 h-9"
                          placeholder="Company Name"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-slate-500">Start Date</Label>
                        <Input
                          value={exp.startDate}
                          onChange={(e) => updateExperience(index, 'startDate', e.target.value)}
                          className="mt-1 bg-slate-800/50 border-slate-700 h-9"
                          placeholder="Jan 2020"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-slate-500">End Date</Label>
                        <Input
                          value={exp.endDate}
                          onChange={(e) => updateExperience(index, 'endDate', e.target.value)}
                          className="mt-1 bg-slate-800/50 border-slate-700 h-9"
                          placeholder="Present"
                        />
                      </div>
                    </div>
                    <div className="mt-3">
                      <Label className="text-xs text-slate-500">Description / Achievements</Label>
                      <Textarea
                        value={exp.description}
                        onChange={(e) => updateExperience(index, 'description', e.target.value)}
                        className="mt-1 bg-slate-800/50 border-slate-700 min-h-[80px]"
                        placeholder="• Led a team of 5 engineers...&#10;• Increased efficiency by 40%..."
                      />
                    </div>
                  </Card>
                ))}
                <Button
                  variant="outline"
                  onClick={addExperience}
                  className="w-full border-dashed border-slate-700 text-slate-400 hover:text-white hover:border-purple-500/50"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Experience
                </Button>
              </TabsContent>

              {/* Education Tab */}
              <TabsContent value="education" className="p-4 m-0 space-y-4">
                {editedData.education.map((edu, index) => (
                  <Card key={edu.id} className="p-4 bg-slate-800/30 border-slate-700/50">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-teal-500/20 flex items-center justify-center">
                          <GraduationCap className="w-4 h-4 text-teal-400" />
                        </div>
                        <span className="text-sm text-slate-400">Education {index + 1}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeEducation(index)}
                        className="text-slate-400 hover:text-red-400 h-8 w-8"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs text-slate-500">Institution</Label>
                        <Input
                          value={edu.institution}
                          onChange={(e) => updateEducation(index, 'institution', e.target.value)}
                          className="mt-1 bg-slate-800/50 border-slate-700 h-9"
                          placeholder="University of Adelaide"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-slate-500">Degree</Label>
                        <Input
                          value={edu.degree}
                          onChange={(e) => updateEducation(index, 'degree', e.target.value)}
                          className="mt-1 bg-slate-800/50 border-slate-700 h-9"
                          placeholder="Bachelor of Science"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-slate-500">Field of Study</Label>
                        <Input
                          value={edu.field}
                          onChange={(e) => updateEducation(index, 'field', e.target.value)}
                          className="mt-1 bg-slate-800/50 border-slate-700 h-9"
                          placeholder="Computer Science"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-slate-500">Graduation Year</Label>
                        <Input
                          value={edu.endDate}
                          onChange={(e) => updateEducation(index, 'endDate', e.target.value)}
                          className="mt-1 bg-slate-800/50 border-slate-700 h-9"
                          placeholder="2023"
                        />
                      </div>
                    </div>
                  </Card>
                ))}
                <Button
                  variant="outline"
                  onClick={addEducation}
                  className="w-full border-dashed border-slate-700 text-slate-400 hover:text-white hover:border-teal-500/50"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Education
                </Button>
              </TabsContent>

              {/* Skills Tab */}
              <TabsContent value="skills" className="p-4 m-0">
                <div className="space-y-4">
                  {/* Existing Skills */}
                  <div>
                    <Label className="text-slate-400 mb-2 block">Your Skills</Label>
                    <div className="flex flex-wrap gap-2">
                      {editedData.skills.map((skill) => (
                        <Badge
                          key={skill}
                          className="bg-slate-800 text-slate-200 hover:bg-slate-700 pr-1 group"
                        >
                          {skill}
                          <button
                            onClick={() => removeSkill(skill)}
                            className="ml-2 p-0.5 rounded hover:bg-red-500/20 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      ))}
                      {editedData.skills.length === 0 && (
                        <p className="text-sm text-slate-500">No skills added yet</p>
                      )}
                    </div>
                  </div>

                  {/* Add Skill */}
                  <div>
                    <Label className="text-slate-400 mb-2 block">Add a Skill</Label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="e.g., React, Python, Project Management"
                        className="bg-slate-800/50 border-slate-700"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            addSkill((e.target as HTMLInputElement).value)
                            ;(e.target as HTMLInputElement).value = ''
                          }
                        }}
                      />
                      <Button
                        variant="outline"
                        className="border-slate-700"
                        onClick={(e) => {
                          const input = (e.target as HTMLElement).parentElement?.querySelector('input')
                          if (input) {
                            addSkill(input.value)
                            input.value = ''
                          }
                        }}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Suggested Skills */}
                  <div>
                    <Label className="text-slate-400 mb-2 block">Quick Add</Label>
                    <div className="flex flex-wrap gap-2">
                      {['JavaScript', 'Python', 'React', 'Node.js', 'SQL', 'AWS', 'Docker', 'Git', 
                        'Communication', 'Leadership', 'Problem Solving', 'Agile', 'Microsoft Office']
                        .filter(s => !editedData.skills.includes(s))
                        .slice(0, 8)
                        .map((skill) => (
                          <Badge
                            key={skill}
                            variant="outline"
                            className="border-slate-700 text-slate-400 cursor-pointer hover:border-purple-500/50 hover:text-purple-400"
                            onClick={() => addSkill(skill)}
                          >
                            <Plus className="w-3 h-3 mr-1" />
                            {skill}
                          </Badge>
                        ))}
                    </div>
                  </div>
                </div>
              </TabsContent>
            </>
          )}
        </ScrollArea>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800/50 bg-slate-900/80 flex justify-between">
          <Button
            variant="outline"
            onClick={() => setStep('upload')}
            className="border-slate-700"
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Upload Different
          </Button>
          <Button
            onClick={handleComplete}
            className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
          >
            <Check className="w-4 h-4 mr-2" />
            Apply to Resume
            <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </Tabs>
    </Card>
  )
}

