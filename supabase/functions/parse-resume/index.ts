import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ParsedResume {
  // Personal Info
  personalInfo: {
    fullName: string | null
    email: string | null
    phone: string | null
    location: string | null
    linkedin: string | null
    website: string | null
    summary: string | null
  }
  // Work Experience
  workExperience: {
    company: string
    title: string
    location: string | null
    startDate: string | null
    endDate: string | null
    current: boolean
    bullets: string[]
  }[]
  // Education
  education: {
    institution: string
    degree: string
    field: string | null
    startDate: string | null
    endDate: string | null
    gpa: string | null
    achievements: string[]
  }[]
  // Skills
  skills: {
    category: string
    items: string[]
  }[]
  // Certifications
  certifications: {
    name: string
    issuer: string | null
    date: string | null
    expiryDate: string | null
  }[]
  // Languages
  languages: {
    language: string
    proficiency: string | null
  }[]
  // Projects
  projects: {
    name: string
    description: string | null
    technologies: string[]
    url: string | null
  }[]
  // Raw text for reference
  rawText: string
  // Confidence score
  confidence: number
  // Source file info
  sourceFile: {
    name: string
    type: string
    pages: number
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Detect if request contains file (FormData) or text (JSON)
    const contentType = req.headers.get('content-type') || ''
    let rawText = ''
    let fileName = 'document'
    let fileType = 'text/plain'
    let pageCount = 1

    // Method 1: JSON with pre-extracted text (from client-side PDF.js/Mammoth)
    if (contentType.includes('application/json')) {
      const body = await req.json()

      if (!body.rawText) {
        return new Response(
          JSON.stringify({ error: 'No rawText provided in JSON body' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      rawText = body.rawText
      fileName = body.fileName || 'document.txt'
      fileType = body.fileType || 'text/plain'
      pageCount = body.pageCount || 1

      console.log(`📝 Received pre-extracted text (${rawText.length} chars) from client`)
    }
    // Method 2: FormData with file (full Azure Document Intelligence processing)
    else {
      const formData = await req.formData()
      const file = formData.get('file') as File
      fileName = formData.get('fileName') as string || file?.name || 'document'

      if (!file) {
        return new Response(
          JSON.stringify({ error: 'No file provided in FormData' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      console.log(`📄 Received file upload: ${fileName}`)

      // Get Azure Document Intelligence credentials
      const docIntelEndpoint = Deno.env.get('AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT')
      const docIntelKey = Deno.env.get('AZURE_DOCUMENT_INTELLIGENCE_KEY')

      if (!docIntelEndpoint || !docIntelKey) {
        // Fallback: Return error but suggest using JSON method with pre-extracted text
        return new Response(
          JSON.stringify({ 
            success: false,
            error: 'Azure Document Intelligence not configured',
            details: 'Please configure AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT and AZURE_DOCUMENT_INTELLIGENCE_KEY in Supabase secrets, or use client-side text extraction first.'
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Convert file to base64
      const arrayBuffer = await file.arrayBuffer()
      const base64Content = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)))

      // Determine content type
      fileType = file.type || 'application/pdf'

      console.log(`📄 Processing file: ${fileName}, type: ${fileType}, size: ${file.size} bytes`)

    // Step 1: Use prebuilt-document model for general document extraction
    // This handles PDFs, images, and Office documents
    // Try multiple API paths/versions for compatibility
    // Ensure endpoint doesn't have trailing slash
    const cleanEndpoint = docIntelEndpoint.replace(/\/$/, '');
    const apiPaths = [
      { path: '/documentintelligence/documentModels/prebuilt-layout:analyze', version: '2024-11-30' },
      { path: '/documentintelligence/documentModels/prebuilt-layout:analyze', version: '2024-07-31-preview' },
      { path: '/documentintelligence/documentModels/prebuilt-layout:analyze', version: '2024-02-29-preview' },
      { path: '/formrecognizer/documentModels/prebuilt-layout:analyze', version: '2023-07-31' },
    ]

    let analyzeResponse = null
    let operationLocation = null
    let lastError = null

    // Try each API path until one works
    for (const apiPath of apiPaths) {
      try {
        const analyzeUrl = `${cleanEndpoint}${apiPath.path}?api-version=${apiPath.version}`
        console.log(`Trying API path: ${apiPath.path} with version ${apiPath.version}`)

        analyzeResponse = await fetch(analyzeUrl, {
          method: 'POST',
          headers: {
            'Ocp-Apim-Subscription-Key': docIntelKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            base64Source: base64Content
          })
        })

        if (analyzeResponse.ok) {
          operationLocation = analyzeResponse.headers.get('Operation-Location')
          if (operationLocation) {
            console.log(`✅ Successfully started analysis with ${apiPath.version}`)
            break
          }
        } else {
          const errorText = await analyzeResponse.text()
          lastError = `Status ${analyzeResponse.status}: ${errorText}`
          console.warn(`API path ${apiPath.path} (${apiPath.version}) failed: ${lastError}`)
        }
      } catch (err) {
        lastError = err instanceof Error ? err.message : String(err)
        console.warn(`API path ${apiPath.path} (${apiPath.version}) exception: ${lastError}`)
        continue
      }
    }

    if (!analyzeResponse || !analyzeResponse.ok || !operationLocation) {
      const errorMsg = lastError || 'All API paths failed'
      console.error('Document Intelligence error:', errorMsg)
      return new Response(
        JSON.stringify({ 
          success: false,
          error: `Document analysis failed: ${errorMsg}`,
          details: 'Please check Azure Document Intelligence configuration. The service may not support the API version, or credentials may be incorrect.'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Poll for results (operationLocation already set above)
    let result = null
    let attempts = 0
    const maxAttempts = 30

    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      const statusResponse = await fetch(operationLocation, {
        headers: {
          'Ocp-Apim-Subscription-Key': docIntelKey,
        }
      })

      const statusData = await statusResponse.json()

      if (statusData.status === 'succeeded') {
        result = statusData.analyzeResult
        break
      } else if (statusData.status === 'failed') {
        throw new Error('Document analysis failed')
      }

      attempts++
    }

    if (!result) {
      throw new Error('Document analysis timed out')
    }

      // Extract raw text from all pages
      rawText = result.content || ''
      pageCount = result.pages?.length || 1

      console.log(`✅ Extracted ${rawText.length} characters from ${pageCount} pages via Azure`)
    }

    // Step 2: Use GPT to intelligently parse the resume content (shared for both methods)
    const openAIEndpoint = Deno.env.get('AZURE_OPENAI_ENDPOINT')
    const openAIKey = Deno.env.get('AZURE_OPENAI_KEY')
    const chatDeployment = Deno.env.get('AZURE_OPENAI_CHAT_DEPLOYMENT') || 'gpt-4o-mini'

    if (!openAIEndpoint || !openAIKey) {
      // Return raw text if OpenAI not configured
      return new Response(
        JSON.stringify({
          success: true,
          parsed: {
            personalInfo: { fullName: null, email: null, phone: null, location: null, linkedin: null, website: null, summary: null },
            workExperience: [],
            education: [],
            skills: [],
            certifications: [],
            languages: [],
            projects: [],
            rawText,
            confidence: 0.5,
            sourceFile: { name: fileName, type: fileType, pages: pageCount }
          },
          message: 'Basic extraction only - AI parsing not available'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // AI-powered resume parsing with enhanced instructions
    const parsePrompt = `You are an expert resume parser. Extract ALL structured information from the following resume text. Be thorough and extract EVERY section.

CRITICAL REQUIREMENTS:
1. Extract ALL sections present in the resume - do not skip any
2. Extract ALL work experiences, even if they seem minor or old
3. Extract ALL education entries, including certifications if listed separately
4. Extract ALL skills mentioned anywhere in the resume
5. Parse dates consistently (YYYY-MM or YYYY format)
6. Extract contact information accurately (name, email, phone, location, LinkedIn, website)
7. If information is unclear, use null rather than guessing
8. Group skills by logical categories (Technical, Soft Skills, Languages, etc.)
9. Extract ALL bullet points for each work experience
10. Include projects, certifications, languages if present

RESUME TEXT:
${rawText.substring(0, 15000)}

Extract and return a JSON object with this exact structure. Include ALL data found:
{
  "personalInfo": {
    "fullName": "extracted full name or null",
    "email": "extracted email or null",
    "phone": "extracted phone or null",
    "location": "city, state/country or null",
    "linkedin": "linkedin URL or null",
    "website": "personal website or null",
    "summary": "professional summary/objective if present or null"
  },
  "workExperience": [
    {
      "company": "company name",
      "title": "job title",
      "location": "location or null",
      "startDate": "YYYY-MM or YYYY or null",
      "endDate": "YYYY-MM or YYYY or null",
      "current": true/false,
      "bullets": ["achievement 1", "achievement 2"]
    }
  ],
  "education": [
    {
      "institution": "school name",
      "degree": "degree type (Bachelor's, Master's, etc.)",
      "field": "field of study or null",
      "startDate": "YYYY or null",
      "endDate": "YYYY or null",
      "gpa": "GPA if mentioned or null",
      "achievements": ["honors", "relevant coursework"]
    }
  ],
  "skills": [
    {
      "category": "Technical Skills",
      "items": ["skill1", "skill2"]
    }
  ],
  "certifications": [
    {
      "name": "certification name",
      "issuer": "issuing organization or null",
      "date": "date obtained or null",
      "expiryDate": "expiry date or null"
    }
  ],
  "languages": [
    {
      "language": "language name",
      "proficiency": "Native/Fluent/Professional/Basic or null"
    }
  ],
  "projects": [
    {
      "name": "project name",
      "description": "brief description or null",
      "technologies": ["tech1", "tech2"],
      "url": "project URL or null"
    }
  ],
  "confidence": 0.0-1.0 (how confident you are in the extraction quality)
}

EXTRACTION GUIDELINES:
- Extract ALL work experiences in chronological order (most recent first if that's how they appear)
- For each experience, extract ALL bullet points - do not skip any
- Parse dates consistently: Use YYYY-MM for month/year, YYYY for year-only
- For "Present" or "Current" jobs, set "current": true and endDate to null
- Group skills by logical categories: Technical Skills, Soft Skills, Programming Languages, Tools, etc.
- Extract summary/objective if present (may be labeled as "Summary", "Professional Summary", "Objective", "Profile")
- Extract ALL education entries including incomplete degrees, certifications listed under education
- Extract projects with ALL details (name, description, technologies, URL if present)
- Extract certifications with issuer and dates if available
- Extract languages with proficiency levels if mentioned
- For contact info: Extract full name from header, email (look for @), phone (various formats), location (city, state/country)
- Set confidence score (0.0-1.0) based on:
  * How complete the extraction is (all sections found = higher score)
  * How clear and structured the resume was (well-formatted = higher score)
  * How much information was successfully extracted (more data = higher score)

Return ONLY valid JSON, no explanations. Ensure all arrays include ALL items found in the resume.`

    const chatResponse = await fetch(
      `${openAIEndpoint}/openai/deployments/${chatDeployment}/chat/completions?api-version=2024-02-15-preview`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': openAIKey,
        },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: 'You are a precise resume parsing assistant. Always return valid JSON.' },
            { role: 'user', content: parsePrompt }
          ],
          temperature: 0.1,
          max_tokens: 4000,
          response_format: { type: 'json_object' }
        })
      }
    )

    if (!chatResponse.ok) {
      const error = await chatResponse.text()
      console.error('OpenAI parsing error:', error)
      throw new Error('AI parsing failed')
    }

    const chatData = await chatResponse.json()
    const parsedContent = JSON.parse(chatData.choices[0].message.content)

    // Combine with source info
    const parsedResume: ParsedResume = {
      ...parsedContent,
      rawText,
      sourceFile: {
        name: fileName,
        type: fileType,
        pages: pageCount
      }
    }

    console.log(`Successfully parsed resume with confidence: ${parsedResume.confidence}`)

    return new Response(
      JSON.stringify({
        success: true,
        parsed: parsedResume,
        message: `Successfully parsed ${pageCount} page(s) with ${parsedResume.confidence * 100}% confidence`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Parse resume error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to parse document'
    return new Response(
      JSON.stringify({ 
        success: false,
        error: errorMessage,
        details: 'Please try uploading a different file format'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
