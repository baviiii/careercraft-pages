/**
 * Enterprise-Grade Centralized Security System
 * 
 * This module provides comprehensive security utilities including:
 * - Input validation & sanitization
 * - XSS protection
 * - SQL injection prevention
 * - File upload validation
 * - Rate limiting
 * - CSRF protection
 * - Content Security Policy helpers
 * - Audit logging
 * - Secure API client
 */

// Export from validators (includes ValidationResult interface)
export * from './validators';

// Export from sanitizers, excluding duplicates that exist in xss.ts
export { 
  encodeHTML,
  decodeHTML,
  stripHTML,
  sanitizeHTML,
  sanitizeForDisplay,
  escapeSQLString,
  containsSQLInjection,
  sanitizeForSQL,
  removeControlChars,
  normalizeWhitespace,
  sanitizeFilename,
  sanitizeURL,
  sanitizeEmail,
  sanitizePhone,
  sanitize,
  deepSanitize,
  type SanitizeOptions
} from './sanitizers';

// Export from fileUpload
export * from './fileUpload';

// Export from rateLimiter
export * from './rateLimiter';

// Export from auditLog
export * from './auditLog';

// Export from schemas (rename ValidationResult to avoid conflict)
export { 
  safeString,
  emailSchema,
  phoneSchema,
  urlSchema,
  uuidSchema,
  userProfileSchema,
  passwordSchema,
  loginSchema,
  signupSchema,
  contactInfoSchema,
  experienceSchema,
  educationSchema,
  projectSchema,
  resumeDataSchema,
  jobSearchSchema,
  jobApplicationSchema,
  newsQuerySchema,
  apiRequestSchema,
  fileMetadataSchema,
  feedbackSchema,
  supportTicketSchema,
  agentBehaviorRulesSchema,
  agentDefinitionSchema,
  chatMessageSchema,
  playgroundChatRequestSchema,
  collectionSchema,
  agentSuggestRequestSchema,
  validateInput,
  validateOrThrow,
  type ValidationResult as SchemaValidationResult
} from './schemas';

// Export from xss (excluding sanitizeURL which exists in sanitizers)
export {
  detectXSS,
  checkAndLogXSS,
  sanitizeXSS,
  encodeForHTML,
  encodeForHTMLAttribute,
  encodeForJavaScript,
  encodeForURL,
  encodeForCSS,
  createSafeHTML,
  safeTextContent,
  safeHTMLContent,
  isURLSafe,
  type XSSSanitizeOptions
} from './xss';

// Export from csrf
export * from './csrf';

// Export from secureApi (excluding sanitizeForDisplay which exists in sanitizers)
export {
  secureInvoke,
  secureFormSubmit,
  secureFetch,
  createSecureApiConfig,
  sanitizeForStorage,
  secureEmail,
  secureURL,
  checkInputSecurity,
  type SecureApiOptions,
  type SecureApiResponse,
  type UseSecureApiState
} from './secureApi';

// Export from promptSecurity
export {
  scanForPromptInjection,
  checkAndLogPromptInjection,
  sanitizePromptInput,
  validateAgentPrompt,
  type PromptScanResult,
} from './promptSecurity';
