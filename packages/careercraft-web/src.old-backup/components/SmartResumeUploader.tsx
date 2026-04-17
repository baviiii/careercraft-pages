import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Upload,
  FileText,
  Image,
  File,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Loader2,
  X,
  ChevronRight,
  Briefcase,
  GraduationCap,
  Code,
  Award,
  User,
  Zap,
  Brain,
  DollarSign,
  Clock,
} from 'lucide-react'
import { useResumeParser, ParsedResume, convertToTemplateFormat } from '@/hooks/useResumeParser'

interface SmartResumeUploaderProps {
  onParsed?: (data: ParsedResume, templateData: ReturnType<typeof convertToTemplateFormat>) => void
  onCancel?: () => void
}

type ParsingMode = 'quick' | 'advanced'

export default function SmartResumeUploader({ onParsed, onCancel }: SmartResumeUploaderProps) {
  const { parseResume, isLoading, error, progress, parsedData } = useResumeParser()
  const [file, setFile] = useState<File | null>(null)
  const [parsingMode, setParsingMode] = useState<ParsingMode>('quick')

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const uploadedFile = acceptedFiles[0]
      setFile(uploadedFile)

      const result = await parseResume(uploadedFile, parsingMode)

      if (result && onParsed) {
        const templateData = convertToTemplateFormat(result)
        onParsed(result, templateData)
      }
    }
  }, [parseResume, onParsed, parsingMode])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'image/*': ['.jpg', '.jpeg', '.png', '.webp', '.heic'],
      'text/plain': ['.txt'],
    },
    maxFiles: 1,
    disabled: isLoading,
  })

  const getFileIcon = (type: string) => {
    if (type.includes('pdf')) return FileText
    if (type.includes('image')) return Image
    return File
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-400 bg-green-500/20'
    if (confidence >= 0.6) return 'text-yellow-400 bg-yellow-500/20'
    return 'text-orange-400 bg-orange-500/20'
  }

  const reset = () => {
    setFile(null)
  }

  // Show parsed results
  if (parsedData && !isLoading) {
    const FileIcon = getFileIcon(parsedData.sourceFile.type)
    
    return (
      <Card className="p-6 bg-slate-900/50 border-slate-800/50">
        {/* Success Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6 text-green-400" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-lg font-semibold text-white">Resume Parsed Successfully!</h3>
              <Badge className={`${parsingMode === 'quick' ? 'bg-green-500/20 text-green-400' : 'bg-purple-500/20 text-purple-400'} text-xs`}>
                {parsingMode === 'quick' ? (
                  <>
                    <Zap className="w-3 h-3 mr-1" />
                    Quick
                  </>
                ) : (
                  <>
                    <Brain className="w-3 h-3 mr-1" />
                    Advanced
                  </>
                )}
              </Badge>
            </div>
            <p className="text-sm text-slate-400">
              {parsedData.sourceFile.pages} page{parsedData.sourceFile.pages > 1 ? 's' : ''} analyzed
            </p>
          </div>
          <Badge className={getConfidenceColor(parsedData.confidence)}>
            {Math.round(parsedData.confidence * 100)}% confidence
          </Badge>
        </div>

        {/* Extracted Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {parsedData.personalInfo.fullName && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-800/50">
              <User className="w-4 h-4 text-blue-400" />
              <span className="text-sm text-white truncate">{parsedData.personalInfo.fullName}</span>
            </div>
          )}
          {parsedData.workExperience.length > 0 && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-800/50">
              <Briefcase className="w-4 h-4 text-purple-400" />
              <span className="text-sm text-white">{parsedData.workExperience.length} jobs</span>
            </div>
          )}
          {parsedData.education.length > 0 && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-800/50">
              <GraduationCap className="w-4 h-4 text-teal-400" />
              <span className="text-sm text-white">{parsedData.education.length} degrees</span>
            </div>
          )}
          {parsedData.skills.length > 0 && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-800/50">
              <Code className="w-4 h-4 text-orange-400" />
              <span className="text-sm text-white">
                {parsedData.skills.reduce((acc, s) => acc + s.items.length, 0)} skills
              </span>
            </div>
          )}
        </div>

        {/* Preview Cards */}
        <div className="space-y-3 mb-6">
          {/* Work Experience Preview */}
          {parsedData.workExperience.length > 0 && (
            <div className="p-4 rounded-xl bg-slate-800/30 border border-slate-700/50">
              <h4 className="text-sm font-medium text-slate-400 mb-2 flex items-center gap-2">
                <Briefcase className="w-4 h-4" /> Work Experience
              </h4>
              <div className="space-y-2">
                {parsedData.workExperience.slice(0, 2).map((exp, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <div>
                      <p className="text-white font-medium">{exp.title}</p>
                      <p className="text-sm text-slate-400">{exp.company}</p>
                    </div>
                    <span className="text-xs text-slate-500">
                      {exp.startDate} - {exp.current ? 'Present' : exp.endDate}
                    </span>
                  </div>
                ))}
                {parsedData.workExperience.length > 2 && (
                  <p className="text-xs text-slate-500">
                    +{parsedData.workExperience.length - 2} more positions
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Skills Preview */}
          {parsedData.skills.length > 0 && (
            <div className="p-4 rounded-xl bg-slate-800/30 border border-slate-700/50">
              <h4 className="text-sm font-medium text-slate-400 mb-2 flex items-center gap-2">
                <Code className="w-4 h-4" /> Skills
              </h4>
              <div className="flex flex-wrap gap-2">
                {parsedData.skills.flatMap(s => s.items).slice(0, 8).map((skill, idx) => (
                  <Badge key={idx} variant="secondary" className="bg-slate-700/50 text-slate-300">
                    {skill}
                  </Badge>
                ))}
                {parsedData.skills.flatMap(s => s.items).length > 8 && (
                  <Badge variant="secondary" className="bg-slate-700/50 text-slate-400">
                    +{parsedData.skills.flatMap(s => s.items).length - 8} more
                  </Badge>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            onClick={() => {
              if (onParsed) {
                onParsed(parsedData, convertToTemplateFormat(parsedData))
              }
            }}
            className="flex-1 bg-gradient-to-r from-blue-500 to-teal-500 hover:from-blue-600 hover:to-teal-600"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Use This Data
            <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
          <Button variant="outline" onClick={reset} className="border-slate-700">
            Upload Different File
          </Button>
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-6 bg-slate-900/50 border-slate-800/50">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">AI Resume Parser</h3>
            <p className="text-sm text-slate-400">Upload any format - we'll extract everything</p>
          </div>
        </div>
        {onCancel && (
          <Button variant="ghost" size="icon" onClick={onCancel} className="text-slate-400">
            <X className="w-5 h-5" />
          </Button>
        )}
      </div>

      {/* Parsing Mode Selector */}
      <div className="mb-6">
        <p className="text-sm font-medium text-slate-300 mb-3">Choose Parsing Method:</p>
        <div className="grid grid-cols-2 gap-3">
          {/* Quick Mode */}
          <button
            onClick={() => setParsingMode('quick')}
            disabled={isLoading}
            className={`
              relative p-4 rounded-xl border-2 transition-all text-left
              ${parsingMode === 'quick'
                ? 'border-green-500 bg-green-500/10'
                : 'border-slate-700 bg-slate-800/30 hover:border-slate-600'
              }
              ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
          >
            {parsingMode === 'quick' && (
              <div className="absolute top-2 right-2">
                <CheckCircle2 className="w-5 h-5 text-green-400" />
              </div>
            )}
            <div className="flex items-start gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center flex-shrink-0">
                <Zap className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <h4 className="font-semibold text-white mb-1">Quick Parse</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Fast browser-based extraction. Best for standard PDFs and Word docs.
                </p>
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <Badge className="bg-green-500/20 text-green-400 text-xs border-0">
                <Clock className="w-3 h-3 mr-1" />
                3-5 sec
              </Badge>
              <Badge className="bg-blue-500/20 text-blue-400 text-xs border-0">
                <DollarSign className="w-3 h-3 mr-1" />
                Cheaper
              </Badge>
            </div>
          </button>

          {/* Advanced Mode */}
          <button
            onClick={() => setParsingMode('advanced')}
            disabled={isLoading}
            className={`
              relative p-4 rounded-xl border-2 transition-all text-left
              ${parsingMode === 'advanced'
                ? 'border-purple-500 bg-purple-500/10'
                : 'border-slate-700 bg-slate-800/30 hover:border-slate-600'
              }
              ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
          >
            {parsingMode === 'advanced' && (
              <div className="absolute top-2 right-2">
                <CheckCircle2 className="w-5 h-5 text-purple-400" />
              </div>
            )}
            <div className="flex items-start gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                <Brain className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <h4 className="font-semibold text-white mb-1">Advanced Parse</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Azure AI processing. Best for scanned documents and complex layouts.
                </p>
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <Badge className="bg-orange-500/20 text-orange-400 text-xs border-0">
                <Clock className="w-3 h-3 mr-1" />
                10-30 sec
              </Badge>
              <Badge className="bg-purple-500/20 text-purple-400 text-xs border-0">
                <Sparkles className="w-3 h-3 mr-1" />
                Max Quality
              </Badge>
            </div>
          </button>
        </div>
      </div>

      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={`
          relative p-8 rounded-2xl border-2 border-dashed transition-all cursor-pointer
          ${isDragActive 
            ? 'border-blue-500 bg-blue-500/10' 
            : 'border-slate-700 hover:border-slate-600 hover:bg-slate-800/30'
          }
          ${isLoading ? 'pointer-events-none opacity-75' : ''}
        `}
      >
        <input {...getInputProps()} />
        
        <div className="flex flex-col items-center text-center">
          {isLoading ? (
            <>
              <Loader2 className="w-12 h-12 text-blue-400 animate-spin mb-4" />
              <p className="text-white font-medium mb-2">{progress}</p>
              <Badge className={`mb-3 ${parsingMode === 'quick' ? 'bg-green-500/20 text-green-400' : 'bg-purple-500/20 text-purple-400'}`}>
                {parsingMode === 'quick' ? (
                  <>
                    <Zap className="w-3 h-3 mr-1" />
                    Quick Mode
                  </>
                ) : (
                  <>
                    <Brain className="w-3 h-3 mr-1" />
                    Advanced Mode
                  </>
                )}
              </Badge>
              <Progress value={50} className="w-48 h-2" />
            </>
          ) : error ? (
            <>
              <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
              <p className="text-red-400 font-medium mb-2">Failed to parse</p>
              <p className="text-sm text-slate-400 mb-4">{error}</p>
              <Button variant="outline" onClick={reset} className="border-slate-700">
                Try Again
              </Button>
            </>
          ) : file ? (
            <>
              {(() => {
                const Icon = getFileIcon(file.type)
                return <Icon className="w-12 h-12 text-blue-400 mb-4" />
              })()}
              <p className="text-white font-medium mb-1">{file.name}</p>
              <p className="text-sm text-slate-400">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </>
          ) : (
            <>
              <Upload className="w-12 h-12 text-slate-500 mb-4" />
              <p className="text-white font-medium mb-2">
                {isDragActive ? 'Drop your resume here' : 'Drag & drop your resume'}
              </p>
              <p className="text-sm text-slate-400 mb-4">or click to browse</p>
              <div className="flex flex-wrap justify-center gap-2">
                {['PDF', 'Word', 'Images', 'Text'].map((format) => (
                  <Badge key={format} variant="secondary" className="bg-slate-800 text-slate-300">
                    {format}
                  </Badge>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Features */}
      <div className="grid grid-cols-3 gap-4 mt-6">
        {(parsingMode === 'quick' ? [
          { icon: Zap, label: 'Lightning Fast', desc: '3-5 seconds', color: 'text-green-500' },
          { icon: FileText, label: 'Browser Based', desc: 'No server wait', color: 'text-blue-500' },
          { icon: DollarSign, label: 'Cost Effective', desc: '50% cheaper', color: 'text-emerald-500' },
        ] : [
          { icon: Brain, label: 'Azure AI', desc: 'Max accuracy', color: 'text-purple-500' },
          { icon: Image, label: 'OCR Powered', desc: 'Scans & images', color: 'text-orange-500' },
          { icon: Sparkles, label: 'Complex Layouts', desc: 'Tables & graphs', color: 'text-pink-500' },
        ]).map((feature) => (
          <div key={feature.label} className="flex flex-col items-center text-center p-3">
            <feature.icon className={`w-5 h-5 ${feature.color} mb-2`} />
            <p className="text-xs font-medium text-slate-300">{feature.label}</p>
            <p className="text-xs text-slate-500">{feature.desc}</p>
          </div>
        ))}
      </div>
    </Card>
  )
}

