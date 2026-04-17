import { useState } from 'react'
import { supabase } from '@/integrations/supabase/client'

export interface ParsedPersonalInfo {
  fullName: string | null
  email: string | null
  phone: string | null
  location: string | null
  linkedin: string | null
  website: string | null
  summary: string | null
}

export interface ParsedWorkExperience {
  company: string
  title: string
  location: string | null
  startDate: string | null
  endDate: string | null
  current: boolean
  bullets: string[]
}

export interface ParsedEducation {
  institution: string
  degree: string
  field: string | null
  startDate: string | null
  endDate: string | null
  gpa: string | null
  achievements: string[]
}

export interface ParsedSkill {
  category: string
  items: string[]
}

export interface ParsedCertification {
  name: string
  issuer: string | null
  date: string | null
  expiryDate: string | null
}

export interface ParsedLanguage {
  language: string
  proficiency: string | null
}

export interface ParsedProject {
  name: string
  description: string | null
  technologies: string[]
  url: string | null
}

export interface ParsedResume {
  personalInfo: ParsedPersonalInfo
  workExperience: ParsedWorkExperience[]
  education: ParsedEducation[]
  skills: ParsedSkill[]
  certifications: ParsedCertification[]
  languages: ParsedLanguage[]
  projects: ParsedProject[]
  rawText: string
  confidence: number
  sourceFile: {
    name: string
    type: string
    pages: number
  }
}

interface UseResumeParserResult {
  parseResume: (file: File, mode?: 'quick' | 'advanced') => Promise<ParsedResume | null>
  isLoading: boolean
  error: string | null
  progress: string
  parsedData: ParsedResume | null
}

export function useResumeParser(): UseResumeParserResult {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState('')
  const [parsedData, setParsedData] = useState<ParsedResume | null>(null)

  const parseResume = async (file: File, mode: 'quick' | 'advanced' = 'advanced'): Promise<ParsedResume | null> => {
    setIsLoading(true)
    setError(null)
    setParsedData(null)

    try {
      // Validate file
      const allowedTypes = [
        'application/pdf',
        'image/jpeg',
        'image/png',
        'image/webp',
        'image/heic',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain'
      ]

      if (!allowedTypes.includes(file.type) && !file.name.match(/\.(pdf|jpg|jpeg|png|webp|heic|doc|docx|txt)$/i)) {
        throw new Error('Unsupported file format. Please upload PDF, Word, image, or text files.')
      }

      // Check file size (max 20MB)
      if (file.size > 20 * 1024 * 1024) {
        throw new Error('File too large. Maximum size is 20MB.')
      }

      let parsedResult: ParsedResume | null = null

      if (mode === 'quick') {
        // Quick mode: Use client-side extraction
        setProgress('Extracting text from document...')

        // Import the parseResumeWithAI function
        const { parseResumeWithAI } = await import('@/lib/resumeParser')

        const aiData = await parseResumeWithAI(file, (prog) => {
          setProgress(`Processing: ${prog}%`)
        })

        setProgress('Transforming to resume format...')

        // Transform AIResumeData to ParsedResume format
        parsedResult = {
          personalInfo: {
            fullName: aiData.contact.name || null,
            email: aiData.contact.email || null,
            phone: aiData.contact.phone || null,
            location: aiData.contact.location || null,
            linkedin: aiData.contact.linkedin || null,
            website: aiData.contact.website || null,
            summary: aiData.summary || null,
          },
          workExperience: aiData.experience.map(exp => ({
            company: exp.company,
            title: exp.title,
            location: exp.location || null,
            startDate: exp.startDate || null,
            endDate: exp.endDate || null,
            current: exp.current,
            bullets: exp.bullets,
          })),
          education: aiData.education.map(edu => ({
            institution: edu.school,
            degree: edu.degree,
            field: edu.location || null, // Note: AIResumeData uses location for field
            startDate: null,
            endDate: edu.graduationDate || null,
            gpa: edu.gpa || null,
            achievements: [],
          })),
          skills: aiData.skills.length > 0
            ? [{ category: 'Skills', items: aiData.skills }]
            : [],
          certifications: (aiData.certifications || []).map(cert => ({
            name: typeof cert === 'string' ? cert : cert,
            issuer: null,
            date: null,
            expiryDate: null,
          })),
          languages: [],
          projects: (aiData.projects || []).map(proj => ({
            name: proj.name,
            description: proj.description || null,
            technologies: proj.technologies || [],
            url: null,
          })),
          rawText: '',
          confidence: 0.85,
          sourceFile: {
            name: file.name,
            type: file.type,
            pages: 1,
          },
        }
      } else {
        // Advanced mode: Use Azure Document Intelligence
        setProgress('Uploading document...')

        // Create form data
        const formData = new FormData()
        formData.append('file', file)
        formData.append('fileName', file.name)

        setProgress('Analyzing document with Azure AI...')

        // Call the Edge Function
        const { data, error: fnError } = await supabase.functions.invoke('parse-resume', {
          body: formData,
        })

        if (fnError) {
          throw new Error(fnError.message || 'Failed to parse document')
        }

        if (!data.success) {
          throw new Error(data.error || 'Parsing failed')
        }

        parsedResult = data.parsed
      }

      setProgress('Processing complete!')
      setParsedData(parsedResult)

      return parsedResult

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to parse document'
      setError(message)
      return null
    } finally {
      setIsLoading(false)
    }
  }

  return {
    parseResume,
    isLoading,
    error,
    progress,
    parsedData
  }
}

// Utility function to convert parsed data to template builder format
export function convertToTemplateFormat(parsed: ParsedResume) {
  return {
    personalDetails: {
      fullName: parsed.personalInfo.fullName || '',
      email: parsed.personalInfo.email || '',
      phone: parsed.personalInfo.phone || '',
      location: parsed.personalInfo.location || '',
      linkedin: parsed.personalInfo.linkedin || '',
      website: parsed.personalInfo.website || '',
      summary: parsed.personalInfo.summary || '',
    },
    experience: parsed.workExperience.map((exp, index) => ({
      id: `exp-${index}`,
      company: exp.company,
      position: exp.title,
      location: exp.location || '',
      startDate: exp.startDate || '',
      endDate: exp.current ? 'Present' : (exp.endDate || ''),
      description: exp.bullets.join('\n• '),
      highlights: exp.bullets,
    })),
    education: parsed.education.map((edu, index) => ({
      id: `edu-${index}`,
      institution: edu.institution,
      degree: edu.degree,
      field: edu.field || '',
      startDate: edu.startDate || '',
      endDate: edu.endDate || '',
      gpa: edu.gpa || '',
      achievements: edu.achievements,
    })),
    skills: parsed.skills.flatMap(skillGroup => skillGroup.items),
    skillCategories: parsed.skills,
    certifications: parsed.certifications.map((cert, index) => ({
      id: `cert-${index}`,
      name: cert.name,
      issuer: cert.issuer || '',
      date: cert.date || '',
    })),
    languages: parsed.languages.map((lang, index) => ({
      id: `lang-${index}`,
      language: lang.language,
      proficiency: lang.proficiency || 'Professional',
    })),
    projects: parsed.projects.map((proj, index) => ({
      id: `proj-${index}`,
      name: proj.name,
      description: proj.description || '',
      technologies: proj.technologies,
      url: proj.url || '',
    })),
  }
}

