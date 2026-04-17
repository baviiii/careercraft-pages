/**
 * Prompt Injection Security
 *
 * Detects and neutralises prompt injection attacks in user-authored
 * agent prompts, behaviour rules, and chat messages before they
 * reach the LLM.  PDFs and document uploads are NOT affected by
 * this module — it only operates on text strings destined for prompt
 * composition.
 */

import { auditSecurityViolation } from './auditLog';

// Patterns that attempt to override, ignore, or leak system instructions
const INJECTION_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  // Direct override attempts
  { pattern: /ignore\s+(all\s+)?(previous|prior|above|earlier)\s+(instructions?|prompts?|rules?|context)/i, label: 'ignore-previous' },
  { pattern: /disregard\s+(all\s+)?(previous|prior|above|earlier)\s+(instructions?|prompts?|rules?)/i, label: 'disregard-previous' },
  { pattern: /forget\s+(all\s+)?(previous|prior|above|your)\s+(instructions?|prompts?|rules?|context)/i, label: 'forget-previous' },
  { pattern: /override\s+(system|safety|security|content)\s*(prompt|filter|policy|instructions?)/i, label: 'override-system' },

  // Role hijack
  { pattern: /you\s+are\s+now\s+(a\s+)?(?!a career|a resume|an ats|an intelligence|a policy)/i, label: 'role-hijack' },
  { pattern: /act\s+as\s+(if\s+)?(you\s+are\s+)?(a\s+)?(different|new|unrestricted|jailbroken)/i, label: 'role-hijack' },
  { pattern: /pretend\s+(you|that)\s+(are|have)\s+(no|unrestricted|unlimited)/i, label: 'role-hijack' },
  { pattern: /switch\s+to\s+(developer|admin|unrestricted|god)\s*mode/i, label: 'role-hijack' },
  { pattern: /enter\s+(developer|debug|sudo|root|admin)\s*mode/i, label: 'role-hijack' },

  // System prompt leaking
  { pattern: /(?:show|reveal|print|output|repeat|echo|display)\s+(your|the|system)\s+(system\s+)?(prompt|instructions?|rules?|context)/i, label: 'leak-system-prompt' },
  { pattern: /what\s+(are|is)\s+your\s+(system|hidden|secret)\s+(prompt|instructions?)/i, label: 'leak-system-prompt' },

  // Token / separator manipulation
  { pattern: /\[SYSTEM\]/i, label: 'token-separator' },
  { pattern: /\[INST\]/i, label: 'token-separator' },
  { pattern: /<<SYS>>|<\|system\|>|<\|user\|>|<\|assistant\|>/i, label: 'token-separator' },
  { pattern: /```system|```instructions/i, label: 'token-separator' },

  // Dangerous code execution hints
  { pattern: /\bexec\s*\(|eval\s*\(|os\.system|subprocess|import\s+os\b/i, label: 'code-exec' },
  { pattern: /\bsystem\s*\(|shell_exec|passthru|popen\b/i, label: 'code-exec' },

  // Data exfiltration via markdown / links
  { pattern: /!\[.*?\]\(https?:\/\/[^)]+\)/i, label: 'data-exfil-image' },
];

export interface PromptScanResult {
  safe: boolean;
  threats: Array<{ label: string; match: string }>;
}

/**
 * Scan a string for prompt injection patterns.
 */
export function scanForPromptInjection(input: string): PromptScanResult {
  if (typeof input !== 'string' || input.length === 0) {
    return { safe: true, threats: [] };
  }

  const threats: Array<{ label: string; match: string }> = [];

  for (const { pattern, label } of INJECTION_PATTERNS) {
    const match = input.match(pattern);
    if (match) {
      threats.push({ label, match: match[0] });
    }
  }

  return { safe: threats.length === 0, threats };
}

/**
 * Scan and log.  Returns `true` when dangerous content is found.
 */
export function checkAndLogPromptInjection(
  input: string,
  context: string,
  userId?: string,
): boolean {
  const result = scanForPromptInjection(input);

  if (!result.safe) {
    auditSecurityViolation('SECURITY_VIOLATION', {
      subtype: 'PROMPT_INJECTION_ATTEMPT',
      context,
      threats: result.threats,
      inputPreview: input.slice(0, 200),
    }, userId);
  }

  return !result.safe;
}

/**
 * Strip known injection markers from user text while preserving benign content.
 * Does NOT block the request — call `scanForPromptInjection` first if you want to reject.
 */
export function sanitizePromptInput(input: string): string {
  if (typeof input !== 'string') return '';

  let clean = input;

  // Remove token separators
  clean = clean.replace(/\[SYSTEM\]|\[INST\]|<<SYS>>|<\|system\|>|<\|user\|>|<\|assistant\|>/gi, '');
  clean = clean.replace(/```system|```instructions/gi, '```');

  // Remove null bytes
  clean = clean.replace(/\x00/g, '');

  return clean.trim();
}

/**
 * Validate a full agent system prompt.  Returns errors array (empty = valid).
 */
export function validateAgentPrompt(prompt: string): string[] {
  const errors: string[] = [];

  if (typeof prompt !== 'string') {
    errors.push('Prompt must be a string.');
    return errors;
  }

  if (prompt.length > 8000) {
    errors.push('Prompt must be under 8 000 characters.');
  }

  if (prompt.trim().length === 0) {
    errors.push('Prompt cannot be empty.');
  }

  const scan = scanForPromptInjection(prompt);
  if (!scan.safe) {
    errors.push(
      `Prompt contains disallowed content: ${scan.threats.map(t => t.label).join(', ')}.`,
    );
  }

  return errors;
}
