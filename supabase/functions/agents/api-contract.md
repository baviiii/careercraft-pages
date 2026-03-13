# Agents & Collections API Contracts (Conceptual)

These contracts describe how the frontend playground will talk to backend services for agents, collections, chat, and AI-assisted agent design. They are written as HTTP-style contracts and can be implemented via Supabase Edge Functions or Azure Functions.

## 1. Agents API

### GET /agents

List available career agents for the current user/tenant, including built-in templates.

**Query params**
- `domain` (optional): `"career"` — future-proof for other domains.

**Response**
- `200 OK`
- Body:
  ```json
  {
    "agents": [
      {
        "id": "career-ats-critic",
        "name": "ATS Critic",
        "emoji": "🧠",
        "shortTagline": "Brutally honest ATS reviewer.",
        "careerUseCase": "ats_reviewer",
        "isTemplate": true
      }
    ]
  }
  ```

### POST /agents

Create a new `CareerAgentDefinition` from the playground.

**Body**
```json
{
  "name": "My SA Government Coach",
  "emoji": "🏛️",
  "shortTagline": "Helps me target SAGov roles.",
  "careerUseCase": "storyteller",
  "behaviorRules": {
    "do": [
      "Always cite specific SA government documents when giving advice.",
      "Focus on public sector selection criteria and examples."
    ],
    "dont": [
      "Invent roles or programs that are not backed by documents."
    ]
  },
  "toneStyle": "coach",
  "defaultTools": ["career_rag", "ats_scorer"],
  "linkedCollections": ["user-resumes", "user-job-descriptions"]
}
```

**Response**
- `201 Created` with full `CareerAgentDefinition`.

### PUT /agents/{id}

Update an existing agent definition (e.g. tweak rules, collections).

**Body**
- Partial `CareerAgentDefinition` fields to update.

**Response**
- `200 OK` with updated agent.

## 2. Collections & Documents API

### GET /collections?domain=career

Return logical groupings of career documents that the playground can attach to agents.

**Response**
```json
{
  "collections": [
    {
      "id": "user-resumes",
      "name": "My Resumes",
      "type": "resumes",
      "documentCount": 3
    },
    {
      "id": "user-job-descriptions",
      "name": "Job Descriptions",
      "type": "job_descriptions",
      "documentCount": 5
    }
  ]
}
```

### POST /collections/{id}/attach-docs

Associate uploaded documents (from existing ingestion pipelines) with a logical collection.

**Body**
```json
{
  "documentIds": ["blob-resume-123", "blob-resume-456"]
}
```

**Response**
- `200 OK` with updated `CareerCollection`.

## 3. Chat API

### POST /chat

Chat with a configured career agent using the existing RAG stack.

**Body**
```json
{
  "agentId": "career-ats-critic",
  "collectionIds": ["user-resumes", "user-job-descriptions"],
  "messages": [
    { "role": "system", "content": "You are an ATS reviewer..." },
    { "role": "user", "content": "Review my resume for this SA government policy officer role." }
  ]
}
```

**Response**
```json
{
  "answer": "Here is an ATS-style review...",
  "citations": [
    {
      "title": "SA Government Careers Guide 2025",
      "documentId": "policy-001",
      "pageNumber": 7,
      "snippet": "Public sector selection criteria require..."
    }
  ],
  "careerInsights": {
    "atsScore": 74,
    "gaps": [
      "No explicit mention of STAR examples.",
      "Lacks SA public sector terminology."
    ],
    "suggestedBullets": [
      "Led a cross-agency project aligning procurement policy with new SA regulations..."
    ]
  }
}
```

## 4. AI-Assisted Agent Design Endpoint

### POST /agents/suggest

Use the existing LLM stack to help a user design an agent from a plain-language description.

**Body**
```json
{
  "description": "I want a brutally honest SA government ATS reviewer who focuses on selection criteria.",
  "careerUseCase": "ats_reviewer"
}
```

**Response**
```json
{
  "suggestedAgent": {
    "name": "SA ATS Critic",
    "emoji": "🧠",
    "shortTagline": "Brutally honest SAGov ATS reviewer.",
    "systemPrompt": "You are a specialist SA Government ATS reviewer...",
    "behaviorRules": {
      "do": [
        "Score resumes like an ATS used by SA government.",
        "Highlight specific gaps against the provided job description."
      ],
      "dont": [
        "Invent roles or SA programs that are not in the documents."
      ]
    },
    "toneStyle": "direct",
    "defaultTools": ["career_rag", "ats_scorer"]
  }
}
```

