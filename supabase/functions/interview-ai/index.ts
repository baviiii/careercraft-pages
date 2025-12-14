/**
 * ============================================================================
 * INTERVIEW AI - STATE OF THE ART INTERVIEW PREPARATION ENGINE
 * ============================================================================
 * 
 * A comprehensive AI-powered interview preparation system featuring:
 * - Adaptive question generation based on role, seniority, and job description
 * - Multi-dimensional answer evaluation with skill tagging
 * - Pattern detection and weakness identification
 * - Personalized improvement recommendations
 * - Weekly insight generation
 * - FAANG-level answer optimization
 * - Communication pattern analysis
 * - Confidence and readiness assessment
 * 
 * Security: Input validation, rate limiting awareness, sanitized outputs
 * ============================================================================
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ============================================================================
// CONFIGURATION
// ============================================================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const AI_MODEL = "google/gemini-2.5-flash";
const AI_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface QuestionConfig {
  field: string;
  seniority?: string;
  jobDescription?: string;
  focusAreas?: string[];
  questionTypes?: string[];
  difficulty?: string;
  count?: number;
}

interface EvaluationConfig {
  field: string;
  seniority?: string;
  question: string;
  questionType?: string;
  answer: string;
  expectedTopics?: string[];
  previousScores?: number[];
}

interface FinalEvaluationConfig {
  field: string;
  seniority?: string;
  questions: Array<{
    question: string;
    type: string;
    difficulty: string;
  }>;
  answers: string[];
  evaluations?: Array<{
    score: number;
    skillsTested: string[];
  }>;
  sessionDuration?: number;
}

interface PatternAnalysisConfig {
  userId: string;
  recentSessions: Array<{
    field: string;
    scores: number[];
    weaknesses: string[];
    date: string;
  }>;
  skillHistory: Array<{
    skill: string;
    scores: number[];
    dates: string[];
  }>;
}

interface WeeklyInsightConfig {
  userId: string;
  weekData: {
    sessionsCompleted: number;
    questionsAnswered: number;
    avgScore: number;
    previousWeekAvgScore: number;
    topSkills: string[];
    weakSkills: string[];
    streakDays: number;
    totalPracticeMinutes: number;
  };
  recentFeedback: string[];
}

// ============================================================================
// SKILL TAXONOMY - Comprehensive skill mapping for interview evaluation
// ============================================================================

const SKILL_TAXONOMY = {
  technical: {
    "Data Structures": ["arrays", "trees", "graphs", "hash tables", "linked lists", "stacks", "queues", "heaps"],
    "Algorithms": ["sorting", "searching", "dynamic programming", "recursion", "greedy", "backtracking", "BFS", "DFS"],
    "System Design": ["scalability", "load balancing", "caching", "database sharding", "microservices", "API design", "distributed systems"],
    "Databases": ["SQL", "NoSQL", "indexing", "normalization", "transactions", "ACID", "CAP theorem"],
    "Cloud Services": ["AWS", "Azure", "GCP", "serverless", "containers", "Kubernetes", "CI/CD"],
    "Security": ["authentication", "authorization", "encryption", "OWASP", "secure coding"],
    "Networking": ["TCP/IP", "HTTP", "DNS", "load balancers", "CDN", "firewalls"],
    "DevOps": ["CI/CD", "infrastructure as code", "monitoring", "logging", "deployment strategies"],
  },
  behavioral: {
    "Leadership": ["team management", "mentoring", "decision making", "conflict resolution", "delegation"],
    "Communication": ["clarity", "active listening", "presentation", "written communication", "stakeholder management"],
    "Problem Solving": ["analytical thinking", "root cause analysis", "creative solutions", "prioritization"],
    "Teamwork": ["collaboration", "cross-functional work", "feedback", "support", "knowledge sharing"],
    "Adaptability": ["change management", "learning agility", "flexibility", "resilience"],
    "Time Management": ["prioritization", "deadline management", "multitasking", "planning"],
    "STAR Method": ["situation", "task", "action", "result", "structured response"],
  },
  soft: {
    "Emotional Intelligence": ["self-awareness", "empathy", "social skills", "self-regulation"],
    "Critical Thinking": ["analysis", "evaluation", "inference", "explanation"],
    "Creativity": ["innovation", "brainstorming", "out-of-box thinking"],
    "Negotiation": ["persuasion", "compromise", "win-win solutions"],
    "Presentation": ["public speaking", "visual aids", "audience engagement"],
  }
};

// ============================================================================
// CAREER PATH CONFIGURATIONS
// ============================================================================

const CAREER_PATHS: Record<string, {
  technicalWeight: number;
  behavioralWeight: number;
  keySkills: string[];
  seniorityModifiers: Record<string, { technicalDepth: number; leadershipFocus: number }>;
}> = {
  "Software Engineering": {
    technicalWeight: 0.6,
    behavioralWeight: 0.4,
    keySkills: ["Data Structures", "Algorithms", "System Design", "Problem Solving", "Communication"],
    seniorityModifiers: {
      "Junior": { technicalDepth: 0.7, leadershipFocus: 0.1 },
      "Mid-Level": { technicalDepth: 0.8, leadershipFocus: 0.3 },
      "Senior": { technicalDepth: 0.9, leadershipFocus: 0.5 },
      "Lead": { technicalDepth: 0.85, leadershipFocus: 0.7 },
      "Manager": { technicalDepth: 0.6, leadershipFocus: 0.9 },
    }
  },
  "DevOps / SRE": {
    technicalWeight: 0.65,
    behavioralWeight: 0.35,
    keySkills: ["Cloud Services", "DevOps", "System Design", "Security", "Problem Solving"],
    seniorityModifiers: {
      "Junior": { technicalDepth: 0.7, leadershipFocus: 0.1 },
      "Mid-Level": { technicalDepth: 0.85, leadershipFocus: 0.25 },
      "Senior": { technicalDepth: 0.95, leadershipFocus: 0.5 },
      "Lead": { technicalDepth: 0.9, leadershipFocus: 0.7 },
    }
  },
  "Product Management": {
    technicalWeight: 0.3,
    behavioralWeight: 0.7,
    keySkills: ["Communication", "Leadership", "Problem Solving", "Critical Thinking", "Stakeholder Management"],
    seniorityModifiers: {
      "Junior": { technicalDepth: 0.4, leadershipFocus: 0.3 },
      "Mid-Level": { technicalDepth: 0.5, leadershipFocus: 0.5 },
      "Senior": { technicalDepth: 0.5, leadershipFocus: 0.7 },
      "Director": { technicalDepth: 0.4, leadershipFocus: 0.9 },
    }
  },
  "Data Science": {
    technicalWeight: 0.7,
    behavioralWeight: 0.3,
    keySkills: ["Algorithms", "Databases", "Problem Solving", "Communication", "Critical Thinking"],
    seniorityModifiers: {
      "Junior": { technicalDepth: 0.75, leadershipFocus: 0.1 },
      "Mid-Level": { technicalDepth: 0.85, leadershipFocus: 0.3 },
      "Senior": { technicalDepth: 0.9, leadershipFocus: 0.5 },
    }
  },
  // Default for other fields
  "default": {
    technicalWeight: 0.5,
    behavioralWeight: 0.5,
    keySkills: ["Communication", "Problem Solving", "Teamwork", "Adaptability"],
    seniorityModifiers: {
      "Junior": { technicalDepth: 0.6, leadershipFocus: 0.2 },
      "Mid-Level": { technicalDepth: 0.7, leadershipFocus: 0.4 },
      "Senior": { technicalDepth: 0.8, leadershipFocus: 0.6 },
    }
  }
};

// ============================================================================
// PROMPT TEMPLATES - Expert-crafted prompts for each action
// ============================================================================

const PROMPTS = {
  generateQuestions: (config: QuestionConfig) => {
    const careerPath = CAREER_PATHS[config.field] || CAREER_PATHS["default"];
    const seniorityMod = careerPath.seniorityModifiers[config.seniority || "Mid-Level"] || careerPath.seniorityModifiers["Mid-Level"];
    
    return {
      system: `You are a world-class interview coach and former FAANG hiring manager with 15+ years of experience conducting thousands of interviews across top tech companies.

Your expertise includes:
- Designing interview loops for Google, Meta, Amazon, Apple, and Microsoft
- Training hiring managers on effective interview techniques
- Understanding what separates good candidates from exceptional ones
- Crafting questions that reveal true competency, not just memorized answers

INTERVIEW DESIGN PRINCIPLES:
1. Questions should be open-ended to allow candidates to demonstrate depth
2. Mix question types to assess different competencies
3. Include at least one question that tests problem-solving under ambiguity
4. Behavioral questions should require specific examples, not hypotheticals
5. Technical questions should have multiple valid approaches
6. Difficulty should progressively increase

SKILL FOCUS FOR ${config.field.toUpperCase()} (${config.seniority || "Mid-Level"}):
- Technical Depth Weight: ${Math.round(seniorityMod.technicalDepth * 100)}%
- Leadership/Soft Skills Weight: ${Math.round(seniorityMod.leadershipFocus * 100)}%
- Key Skills to Assess: ${careerPath.keySkills.join(", ")}

QUESTION TYPE DISTRIBUTION:
- Technical: ${Math.round(careerPath.technicalWeight * 100)}%
- Behavioral: ${Math.round(careerPath.behavioralWeight * 100)}%

Return a JSON object with this EXACT structure:
{
  "sessionId": "unique-session-identifier",
  "analysis": {
    "roleUnderstanding": "Brief analysis of the role requirements",
    "hardSkills": ["skill1", "skill2", "skill3"],
    "softSkills": ["skill1", "skill2"],
    "frameworks": ["framework1", "framework2"],
    "seniorityExpectations": "What's expected at this level",
    "keyCompetencies": ["competency1", "competency2", "competency3"]
  },
  "questions": [
    {
      "id": 1,
      "question": "The full question text",
      "type": "technical|behavioral|situational|system_design|coding|case_study",
      "difficulty": "easy|medium|hard|expert",
      "category": "Primary skill category being tested",
      "skillsTested": ["skill1", "skill2"],
      "expectedTopics": ["topic1", "topic2", "topic3"],
      "timeAllocationMinutes": 5,
      "evaluationCriteria": ["criterion1", "criterion2"],
      "followUpQuestions": ["follow-up 1", "follow-up 2"],
      "redFlags": ["What would be concerning in an answer"],
      "excellenceIndicators": ["What would make an answer exceptional"]
    }
  ],
  "interviewStrategy": {
    "openingAdvice": "How to start the interview",
    "transitionTips": "How to move between questions",
    "closingQuestions": ["Good questions for the candidate to ask"],
    "totalEstimatedMinutes": 45
  }
}`,
      user: `Design a comprehensive interview for the following candidate:

ROLE: ${config.field}
SENIORITY: ${config.seniority || "Mid-Level"}
NUMBER OF QUESTIONS: ${config.count || 6}

${config.jobDescription ? `JOB DESCRIPTION:\n${config.jobDescription}\n` : ""}
${config.focusAreas?.length ? `FOCUS AREAS: ${config.focusAreas.join(", ")}\n` : ""}
${config.questionTypes?.length ? `PREFERRED QUESTION TYPES: ${config.questionTypes.join(", ")}\n` : ""}
${config.difficulty ? `TARGET DIFFICULTY: ${config.difficulty}\n` : ""}

Generate questions that will effectively assess this candidate's fit for the role. Ensure questions are specific, measurable, and reveal true competency.`
    };
  },

  evaluateAnswer: (config: EvaluationConfig) => ({
    system: `You are an elite interview evaluator with expertise in behavioral psychology, technical assessment, and communication analysis. You've evaluated thousands of interview responses and can identify subtle patterns that predict job success.

EVALUATION FRAMEWORK:

1. CONTENT ANALYSIS (40% of score)
   - Relevance to the question asked
   - Technical accuracy (if applicable)
   - Depth of knowledge demonstrated
   - Use of specific examples vs. generalizations
   - Logical reasoning and structure

2. COMMUNICATION QUALITY (30% of score)
   - Clarity and conciseness
   - Professional language
   - Confidence indicators
   - Active voice usage
   - Appropriate detail level

3. BEHAVIORAL INDICATORS (20% of score)
   - STAR method compliance (Situation, Task, Action, Result)
   - Ownership and accountability language ("I" vs "we" appropriately)
   - Growth mindset indicators
   - Self-awareness
   - Emotional intelligence signals

4. STRATEGIC ELEMENTS (10% of score)
   - Alignment with company values (if known)
   - Forward-thinking perspective
   - Impact quantification
   - Learning demonstration

SCORING GUIDELINES:
- 9-10: Exceptional - Would immediately advance to next round at FAANG
- 7-8: Strong - Solid answer with minor improvements possible
- 5-6: Adequate - Meets basic requirements but lacks depth
- 3-4: Weak - Significant gaps or concerns
- 1-2: Poor - Major red flags or completely off-topic

Return a JSON object with this EXACT structure:
{
  "score": 7.5,
  "scoreBreakdown": {
    "content": {
      "score": 8,
      "relevance": 8,
      "accuracy": 7,
      "depth": 8,
      "specificity": 7
    },
    "communication": {
      "score": 7,
      "clarity": 8,
      "conciseness": 6,
      "professionalism": 8,
      "confidence": 7
    },
    "behavioral": {
      "score": 7,
      "starCompliance": 6,
      "ownership": 8,
      "growthMindset": 7,
      "selfAwareness": 7
    },
    "strategic": {
      "score": 7,
      "impactFocus": 7,
      "forwardThinking": 7,
      "quantification": 6
    }
  },
  "skillsAssessed": [
    {
      "skill": "Communication",
      "category": "behavioral",
      "proficiencyDemonstrated": 75,
      "evidence": "Specific quote or observation from the answer"
    }
  ],
  "validation": {
    "strengths": ["What they did well - be specific"],
    "correct": ["Key points they covered correctly"],
    "missing": ["Important points they should have included"],
    "redFlags": ["Concerning elements, if any"],
    "opportunities": ["Ways to strengthen the answer"]
  },
  "answerAnalysis": {
    "wordCount": 150,
    "sentenceCount": 8,
    "avgSentenceLength": 18.75,
    "starComponents": {
      "situation": true,
      "task": true,
      "action": true,
      "result": false
    },
    "quantifiedResults": false,
    "specificExamples": true,
    "technicalTermsUsed": ["term1", "term2"],
    "powerVerbs": ["led", "implemented", "achieved"]
  },
  "improvedAnswer": {
    "rewritten": "A polished version of their answer maintaining their voice but improving structure and impact",
    "keyChanges": ["What was improved and why"]
  },
  "faangAnswer": {
    "example": "How a top FAANG candidate would answer this question",
    "whyItWorks": "Analysis of what makes this answer exceptional"
  },
  "confidenceAssessment": {
    "overall": 72,
    "indicators": {
      "positive": ["Confident language patterns observed"],
      "negative": ["Hedging or uncertainty patterns observed"]
    }
  },
  "coachingTips": [
    {
      "priority": "high",
      "area": "Skill or area to improve",
      "tip": "Specific, actionable advice",
      "example": "How to implement this tip"
    }
  ],
  "nextQuestionSuggestion": "A follow-up question to probe deeper based on their answer"
}`,
    user: `Evaluate this interview response:

QUESTION: ${config.question}
QUESTION TYPE: ${config.questionType || "general"}
FIELD: ${config.field}
SENIORITY: ${config.seniority || "Mid-Level"}

CANDIDATE'S ANSWER:
"${config.answer}"

${config.expectedTopics?.length ? `EXPECTED TOPICS: ${config.expectedTopics.join(", ")}` : ""}
${config.previousScores?.length ? `PREVIOUS SCORES IN SESSION: ${config.previousScores.join(", ")} (for context on trajectory)` : ""}

Provide a comprehensive evaluation that helps this candidate improve while being encouraging and constructive.`
  }),

  finalEvaluation: (config: FinalEvaluationConfig) => {
    const qaPairs = config.questions.map((q, i) => 
      `Q${i + 1} [${q.type}/${q.difficulty}]: ${q.question}\nA${i + 1}: ${config.answers[i] || "No answer provided"}`
    ).join("\n\n");

    return {
      system: `You are a senior talent acquisition leader providing a comprehensive interview debrief. Your evaluation will determine whether this candidate advances and what development they need.

EVALUATION PHILOSOPHY:
- Be honest but constructive
- Focus on potential, not just current state
- Provide actionable feedback
- Consider the whole person, not just technical skills
- Recognize that great candidates can have off moments

GRADING SCALE:
- A+ (95-100): Exceptional - Top 1% of candidates
- A  (90-94): Excellent - Strong hire recommendation
- A- (85-89): Very Good - Hire with minor development areas
- B+ (80-84): Good - Hire for right role/team
- B  (75-79): Solid - Consider with reservations
- B- (70-74): Adequate - Borderline, needs significant growth
- C+ (65-69): Below Average - Not recommended currently
- C  (60-64): Weak - Clear gaps
- C- (55-59): Poor - Major concerns
- D/F (<55): Unacceptable - Do not advance

READINESS LEVELS:
- "Ready": Can succeed in target role immediately
- "Almost Ready": 1-2 minor areas to develop, low risk hire
- "Needs Development": 3-6 months of focused preparation needed
- "Not Ready": Significant gaps, recommend 6+ months preparation

Return a JSON object with this EXACT structure:
{
  "overallScore": 78,
  "grade": "B+",
  "percentile": 72,
  "readiness": "Almost Ready",
  "recommendation": "Hire|Strong Hire|Lean Hire|No Hire|Strong No Hire",
  "confidenceInAssessment": 85,
  
  "executiveSummary": "2-3 sentence summary for a hiring manager",
  
  "scoreBreakdown": {
    "technical": {
      "score": 75,
      "weight": 0.4,
      "assessment": "Brief assessment"
    },
    "behavioral": {
      "score": 82,
      "weight": 0.3,
      "assessment": "Brief assessment"
    },
    "communication": {
      "score": 78,
      "weight": 0.2,
      "assessment": "Brief assessment"
    },
    "cultureFit": {
      "score": 80,
      "weight": 0.1,
      "assessment": "Brief assessment"
    }
  },
  
  "competencyMatrix": [
    {
      "competency": "Problem Solving",
      "score": 80,
      "level": "Proficient",
      "evidence": "Specific examples from answers",
      "developmentNeeded": false
    }
  ],
  
  "strengths": {
    "top": ["Primary strength with evidence"],
    "notable": ["Other strengths observed"],
    "potential": ["Strengths that could develop further"]
  },
  
  "developmentAreas": {
    "critical": ["Must address before interviews"],
    "important": ["Should address for success"],
    "minor": ["Nice to improve but not blocking"]
  },
  
  "patternAnalysis": {
    "consistentStrengths": ["Patterns of excellence"],
    "consistentWeaknesses": ["Recurring issues"],
    "trajectory": "improving|stable|declining",
    "confidencePattern": "Confidence trend through interview"
  },
  
  "improvementPlan": {
    "immediate": [
      {
        "area": "Skill to improve",
        "action": "Specific action to take",
        "resources": ["Recommended resources"],
        "timeline": "1 week",
        "expectedOutcome": "What success looks like"
      }
    ],
    "shortTerm": [],
    "longTerm": []
  },
  
  "interviewReadiness": {
    "technicalInterviews": {
      "ready": true,
      "preparation": "What to focus on"
    },
    "behavioralInterviews": {
      "ready": true,
      "preparation": "What to focus on"
    },
    "systemDesign": {
      "ready": false,
      "preparation": "What to focus on"
    }
  },
  
  "personalizedAdvice": {
    "forNextInterview": "Specific advice for their next interview",
    "forCareerGrowth": "Longer-term career advice",
    "encouragement": "Motivational message based on their performance"
  },
  
  "benchmarkComparison": {
    "vsAverageCandidate": "+12%",
    "vsSuccessfulHires": "-8%",
    "standoutAreas": ["Where they exceed benchmarks"],
    "gapAreas": ["Where they fall short of benchmarks"]
  }
}`,
      user: `Provide a comprehensive final evaluation for this interview session:

ROLE: ${config.field}
SENIORITY: ${config.seniority || "Mid-Level"}
SESSION DURATION: ${config.sessionDuration ? `${config.sessionDuration} minutes` : "Not tracked"}

INTERVIEW TRANSCRIPT:
${qaPairs}

${config.evaluations?.length ? `
INDIVIDUAL QUESTION SCORES:
${config.evaluations.map((e, i) => `Q${i + 1}: ${e.score}/10 - Skills: ${e.skillsTested.join(", ")}`).join("\n")}
` : ""}

Provide a thorough, fair, and actionable evaluation that will help this candidate succeed.`
    };
  },

  analyzePatterns: (config: PatternAnalysisConfig) => ({
    system: `You are an AI career coach specializing in identifying patterns and providing personalized improvement strategies. You analyze interview performance data to find actionable insights.

Your analysis should:
1. Identify recurring strengths and weaknesses
2. Detect improvement or decline trends
3. Find correlations between different skills
4. Suggest targeted practice areas
5. Predict areas of future difficulty

Return a JSON object with this structure:
{
  "patternSummary": "Overview of detected patterns",
  "strengths": {
    "consistent": ["Skills that are consistently strong"],
    "improving": ["Skills showing improvement"],
    "evidence": "Data points supporting this"
  },
  "weaknesses": {
    "persistent": ["Skills that remain weak"],
    "declining": ["Skills getting worse"],
    "evidence": "Data points supporting this"
  },
  "correlations": [
    {
      "observation": "When X is strong, Y tends to be weak",
      "implication": "What this means for preparation"
    }
  ],
  "riskAreas": ["Skills likely to cause problems in interviews"],
  "recommendations": [
    {
      "priority": 1,
      "skill": "Skill to focus on",
      "reason": "Why this is important",
      "suggestedPractice": "How to improve",
      "expectedTimeToImprove": "2 weeks"
    }
  ],
  "progressProjection": {
    "currentTrajectory": "Description of current path",
    "optimisticScenario": "If they follow recommendations",
    "pessimisticScenario": "If they don't change approach"
  }
}`,
    user: `Analyze the interview performance patterns for this user:

RECENT SESSIONS:
${config.recentSessions.map(s => 
  `- ${s.date}: ${s.field} - Scores: ${s.scores.join(", ")} - Weaknesses: ${s.weaknesses.join(", ")}`
).join("\n")}

SKILL HISTORY:
${config.skillHistory.map(s =>
  `- ${s.skill}: Scores over time: ${s.scores.join(" → ")}`
).join("\n")}

Identify patterns and provide actionable recommendations.`
  }),

  generateWeeklyInsight: (config: WeeklyInsightConfig) => ({
    system: `You are an encouraging AI career coach providing weekly progress summaries. Your tone should be:
- Motivating and positive
- Honest about areas for improvement
- Specific with actionable advice
- Celebratory of achievements
- Forward-looking

Return a JSON object with this structure:
{
  "headline": "Catchy, encouraging headline for the week",
  "summary": "2-3 sentence overview of the week",
  "highlights": [
    {
      "type": "achievement|improvement|milestone",
      "title": "What happened",
      "detail": "Why it matters",
      "emoji": "🎉"
    }
  ],
  "progressMetrics": {
    "scoreChange": "+5%",
    "interpretation": "What this change means"
  },
  "focusAreas": [
    {
      "skill": "Skill to focus on",
      "currentLevel": "Where they are",
      "targetLevel": "Where they should aim",
      "suggestedActions": ["Action 1", "Action 2"]
    }
  ],
  "weeklyGoals": [
    {
      "goal": "Specific, measurable goal",
      "reason": "Why this goal matters",
      "howToAchieve": "Steps to accomplish it"
    }
  ],
  "motivationalMessage": "Personalized encouragement based on their journey",
  "funFact": "An interesting interview or career fact to keep them engaged"
}`,
    user: `Generate a weekly insight summary:

THIS WEEK'S STATS:
- Sessions Completed: ${config.weekData.sessionsCompleted}
- Questions Answered: ${config.weekData.questionsAnswered}
- Average Score: ${config.weekData.avgScore}%
- Previous Week Average: ${config.weekData.previousWeekAvgScore}%
- Current Streak: ${config.weekData.streakDays} days
- Practice Time: ${config.weekData.totalPracticeMinutes} minutes

TOP SKILLS: ${config.weekData.topSkills.join(", ")}
SKILLS NEEDING WORK: ${config.weekData.weakSkills.join(", ")}

RECENT FEEDBACK THEMES:
${config.recentFeedback.join("\n")}

Create an engaging, personalized weekly summary.`
  })
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Validates and sanitizes input to prevent injection attacks
 */
function sanitizeInput(input: unknown): string {
  if (typeof input !== 'string') return '';
  return input
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/[<>'"]/g, '') // Remove potential injection characters
    .trim()
    .slice(0, 10000); // Limit length
}

/**
 * Validates the action type
 */
function isValidAction(action: string): boolean {
  const validActions = [
    'generate_questions',
    'evaluate_answer', 
    'final_evaluation',
    'analyze_patterns',
    'weekly_insight',
    'skill_assessment',
    'mock_interview_start',
    'get_follow_up'
  ];
  return validActions.includes(action);
}

/**
 * Makes a request to the AI gateway with retry logic
 */
async function callAI(
  systemPrompt: string, 
  userPrompt: string, 
  apiKey: string,
  retries = 2
): Promise<Record<string, unknown>> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(AI_GATEWAY, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: AI_MODEL,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
          ],
          response_format: { type: "json_object" },
          temperature: 0.7,
          max_tokens: 4000,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        
        if (response.status === 429) {
          throw { status: 429, message: "Rate limit exceeded. Please try again in a moment." };
        }
        if (response.status === 402) {
          throw { status: 402, message: "AI credits exhausted. Please contact support." };
        }
        if (response.status >= 500 && attempt < retries) {
          // Retry on server errors
          await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
          continue;
        }
        
        throw new Error(`AI gateway error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      
      if (!content) {
        throw new Error("Empty response from AI");
      }

      try {
        return JSON.parse(content);
      } catch {
        // If JSON parsing fails, return wrapped content
        console.warn("Failed to parse AI response as JSON, wrapping raw content");
        return { raw: content, parseError: true };
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt === retries) break;
    }
  }
  
  throw lastError || new Error("Unknown error in AI call");
}

/**
 * Enriches the AI response with metadata
 */
function enrichResponse(
  result: Record<string, unknown>, 
  action: string, 
  startTime: number
): Record<string, unknown> {
  return {
    ...result,
    _metadata: {
      action,
      processingTimeMs: Date.now() - startTime,
      model: AI_MODEL,
      version: "2.0.0",
      timestamp: new Date().toISOString(),
    }
  };
}

// ============================================================================
// MAIN REQUEST HANDLER
// ============================================================================

serve(async (req) => {
  const startTime = Date.now();
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse and validate request
    const body = await req.json();
    const { action } = body;

    // Validate action
    if (!action || !isValidAction(action)) {
      return new Response(
        JSON.stringify({ 
          error: "Invalid action",
          validActions: ["generate_questions", "evaluate_answer", "final_evaluation", "analyze_patterns", "weekly_insight"]
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get API key
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Service configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let result: Record<string, unknown>;
    let prompts: { system: string; user: string };

    // Route to appropriate handler
    switch (action) {
      case "generate_questions": {
        const config: QuestionConfig = {
          field: sanitizeInput(body.field) || "General",
          seniority: sanitizeInput(body.seniority),
          jobDescription: sanitizeInput(body.jobDescription),
          focusAreas: Array.isArray(body.focusAreas) ? body.focusAreas.map(sanitizeInput) : undefined,
          questionTypes: Array.isArray(body.questionTypes) ? body.questionTypes.map(sanitizeInput) : undefined,
          difficulty: sanitizeInput(body.difficulty),
          count: typeof body.count === 'number' ? Math.min(Math.max(body.count, 3), 10) : 6,
        };
        
        prompts = PROMPTS.generateQuestions(config);
        console.log(`Generating ${config.count} questions for ${config.field} (${config.seniority})`);
        break;
      }

      case "evaluate_answer": {
        const config: EvaluationConfig = {
          field: sanitizeInput(body.field) || "General",
          seniority: sanitizeInput(body.seniority),
          question: sanitizeInput(body.question),
          questionType: sanitizeInput(body.questionType),
          answer: sanitizeInput(body.answer),
          expectedTopics: Array.isArray(body.expectedTopics) ? body.expectedTopics.map(sanitizeInput) : undefined,
          previousScores: Array.isArray(body.previousScores) ? body.previousScores.filter((s: unknown) => typeof s === 'number') : undefined,
        };

        if (!config.question || !config.answer) {
          return new Response(
            JSON.stringify({ error: "Question and answer are required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        prompts = PROMPTS.evaluateAnswer(config);
        console.log(`Evaluating answer for ${config.field} question`);
        break;
      }

      case "final_evaluation": {
        const config: FinalEvaluationConfig = {
          field: sanitizeInput(body.field) || "General",
          seniority: sanitizeInput(body.seniority),
          questions: Array.isArray(body.questions) ? body.questions.map((q: any) => ({
            question: sanitizeInput(q.question),
            type: sanitizeInput(q.type) || "general",
            difficulty: sanitizeInput(q.difficulty) || "medium",
          })) : [],
          answers: Array.isArray(body.answers) ? body.answers.map(sanitizeInput) : [],
          evaluations: body.evaluations,
          sessionDuration: typeof body.sessionDuration === 'number' ? body.sessionDuration : undefined,
        };

        if (config.questions.length === 0) {
          return new Response(
            JSON.stringify({ error: "Questions are required for final evaluation" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        prompts = PROMPTS.finalEvaluation(config);
        console.log(`Generating final evaluation for ${config.questions.length} questions`);
        break;
      }

      case "analyze_patterns": {
        const config: PatternAnalysisConfig = {
          userId: sanitizeInput(body.userId),
          recentSessions: Array.isArray(body.recentSessions) ? body.recentSessions : [],
          skillHistory: Array.isArray(body.skillHistory) ? body.skillHistory : [],
        };

        prompts = PROMPTS.analyzePatterns(config);
        console.log(`Analyzing patterns for user`);
        break;
      }

      case "weekly_insight": {
        const config: WeeklyInsightConfig = {
          userId: sanitizeInput(body.userId),
          weekData: body.weekData || {
            sessionsCompleted: 0,
            questionsAnswered: 0,
            avgScore: 0,
            previousWeekAvgScore: 0,
            topSkills: [],
            weakSkills: [],
            streakDays: 0,
            totalPracticeMinutes: 0,
          },
          recentFeedback: Array.isArray(body.recentFeedback) ? body.recentFeedback.map(sanitizeInput) : [],
        };

        prompts = PROMPTS.generateWeeklyInsight(config);
        console.log(`Generating weekly insight`);
        break;
      }

      default:
        return new Response(
          JSON.stringify({ error: "Action not implemented" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    // Call AI
    result = await callAI(prompts.system, prompts.user, LOVABLE_API_KEY);

    // Enrich and return response
    const enrichedResult = enrichResponse(result, action, startTime);
    
    console.log(`Successfully processed ${action} in ${Date.now() - startTime}ms`);

    return new Response(
      JSON.stringify(enrichedResult),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const errorObj = error as { status?: number; message?: string };
    console.error("Interview AI error:", error);

    // Handle known error types
    if (errorObj.status === 429) {
      return new Response(
        JSON.stringify({ error: errorObj.message || "Rate limit exceeded" }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (errorObj.status === 402) {
      return new Response(
        JSON.stringify({ error: errorObj.message || "Payment required" }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generic error response
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "An unexpected error occurred",
        _metadata: {
          processingTimeMs: Date.now() - startTime,
          timestamp: new Date().toISOString(),
        }
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
