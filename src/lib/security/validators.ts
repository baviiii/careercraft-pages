/**
 * Input Validators - Enterprise-grade validation utilities
 * Comprehensive validation for all input types
 */

import { containsSQLInjection } from './sanitizers';

// ============================================
// TYPE VALIDATORS
// ============================================

export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

export function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value) && isFinite(value);
}

export function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

export function isArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isNull(value: unknown): value is null {
  return value === null;
}

export function isUndefined(value: unknown): value is undefined {
  return value === undefined;
}

export function isNullOrUndefined(value: unknown): value is null | undefined {
  return value === null || value === undefined;
}

// ============================================
// STRING VALIDATORS
// ============================================

export function isNonEmptyString(value: unknown): value is string {
  return isString(value) && value.trim().length > 0;
}

export function isEmail(value: unknown): boolean {
  if (!isString(value)) return false;
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  return emailRegex.test(value) && value.length <= 254;
}

export function isPhone(value: unknown): boolean {
  if (!isString(value)) return false;
  const phoneRegex = /^[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,4}[-\s\.]?[0-9]{1,9}$/;
  return phoneRegex.test(value.replace(/\s/g, ''));
}

export function isURL(value: unknown): boolean {
  if (!isString(value)) return false;
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol);
  } catch {
    return false;
  }
}

export function isUUID(value: unknown): boolean {
  if (!isString(value)) return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
}

export function isSlug(value: unknown): boolean {
  if (!isString(value)) return false;
  const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  return slugRegex.test(value);
}

export function isAlphanumeric(value: unknown): boolean {
  if (!isString(value)) return false;
  return /^[a-zA-Z0-9]+$/.test(value);
}

export function isAlpha(value: unknown): boolean {
  if (!isString(value)) return false;
  return /^[a-zA-Z]+$/.test(value);
}

export function isNumericString(value: unknown): boolean {
  if (!isString(value)) return false;
  return /^[0-9]+$/.test(value);
}

// ============================================
// NUMBER VALIDATORS
// ============================================

export function isPositiveNumber(value: unknown): boolean {
  return isNumber(value) && value > 0;
}

export function isNonNegativeNumber(value: unknown): boolean {
  return isNumber(value) && value >= 0;
}

export function isInteger(value: unknown): boolean {
  return isNumber(value) && Number.isInteger(value);
}

export function isPositiveInteger(value: unknown): boolean {
  return isInteger(value) && (value as number) > 0;
}

export function isInRange(value: unknown, min: number, max: number): boolean {
  return isNumber(value) && value >= min && value <= max;
}

// ============================================
// DATE VALIDATORS
// ============================================

export function isValidDate(value: unknown): boolean {
  if (value instanceof Date) {
    return !isNaN(value.getTime());
  }
  if (isString(value)) {
    const date = new Date(value);
    return !isNaN(date.getTime());
  }
  return false;
}

export function isISODateString(value: unknown): boolean {
  if (!isString(value)) return false;
  const isoRegex = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?(Z|[+-]\d{2}:\d{2})?)?$/;
  return isoRegex.test(value) && isValidDate(value);
}

export function isFutureDate(value: unknown): boolean {
  if (!isValidDate(value)) return false;
  const date = value instanceof Date ? value : new Date(value as string);
  return date.getTime() > Date.now();
}

export function isPastDate(value: unknown): boolean {
  if (!isValidDate(value)) return false;
  const date = value instanceof Date ? value : new Date(value as string);
  return date.getTime() < Date.now();
}

// ============================================
// SECURITY VALIDATORS
// ============================================

/**
 * Check if string contains XSS attack patterns
 */
export function containsXSS(value: unknown): boolean {
  if (!isString(value)) return false;
  
  const xssPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript\s*:/gi,
    /on\w+\s*=/gi,
    /data\s*:/gi,
    /vbscript\s*:/gi,
    /expression\s*\(/gi,
    /<iframe/gi,
    /<object/gi,
    /<embed/gi,
    /<svg\s+onload/gi,
    /<img\s+.*onerror/gi,
    /&#x?[0-9a-f]+;/gi, // HTML entities that could be used for XSS
  ];
  
  return xssPatterns.some(pattern => pattern.test(value));
}

/**
 * Check if string contains path traversal attempts
 */
export function containsPathTraversal(value: unknown): boolean {
  if (!isString(value)) return false;
  
  const patterns = [
    /\.\./,
    /%2e%2e/i,
    /%252e%252e/i,
    /\.\.%2f/i,
    /%2f\.\./i,
    /\.\.%5c/i,
    /%5c\.\./i,
  ];
  
  return patterns.some(pattern => pattern.test(value));
}

/**
 * Check if string contains command injection patterns
 */
export function containsCommandInjection(value: unknown): boolean {
  if (!isString(value)) return false;
  
  const patterns = [
    /[;&|`$]/,
    /\$\(/,
    /`.*`/,
    /\|\|/,
    /&&/,
    /\n/,
    /\r/,
  ];
  
  return patterns.some(pattern => pattern.test(value));
}

/**
 * Comprehensive security check
 */
export function isSecureInput(value: unknown): boolean {
  if (!isString(value)) return true; // Non-strings are handled elsewhere
  
  return !containsXSS(value) && 
         !containsSQLInjection(value) && 
         !containsPathTraversal(value) &&
         !containsCommandInjection(value);
}

// ============================================
// FILE VALIDATORS
// ============================================

const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
];

const ALLOWED_DOCUMENT_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'text/csv',
];

const DANGEROUS_EXTENSIONS = [
  '.exe', '.bat', '.cmd', '.sh', '.ps1', '.vbs', '.js', '.jar',
  '.msi', '.dll', '.scr', '.com', '.pif', '.application', '.gadget',
  '.msp', '.hta', '.cpl', '.msc', '.inf', '.reg', '.php', '.asp',
  '.aspx', '.jsp', '.py', '.rb', '.pl', '.cgi',
];

export function isAllowedImageType(mimeType: string): boolean {
  return ALLOWED_IMAGE_TYPES.includes(mimeType.toLowerCase());
}

export function isAllowedDocumentType(mimeType: string): boolean {
  return ALLOWED_DOCUMENT_TYPES.includes(mimeType.toLowerCase());
}

export function isDangerousExtension(filename: string): boolean {
  const ext = filename.toLowerCase().slice(filename.lastIndexOf('.'));
  return DANGEROUS_EXTENSIONS.includes(ext);
}

export function isValidFilename(filename: string): boolean {
  if (!isString(filename) || filename.length === 0 || filename.length > 255) {
    return false;
  }
  
  // Check for path traversal
  if (containsPathTraversal(filename)) {
    return false;
  }
  
  // Check for dangerous characters
  if (/[<>:"|?*\x00-\x1f]/.test(filename)) {
    return false;
  }
  
  // Check for dangerous extensions
  if (isDangerousExtension(filename)) {
    return false;
  }
  
  return true;
}

export function isValidFileSize(size: number, maxSizeMB: number = 10): boolean {
  return isPositiveNumber(size) && size <= maxSizeMB * 1024 * 1024;
}

// ============================================
// COMPOSITE VALIDATORS
// ============================================

export interface ValidationRule {
  validator: (value: unknown) => boolean;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Validate a value against multiple rules
 */
export function validate(value: unknown, rules: ValidationRule[]): ValidationResult {
  const errors: string[] = [];
  
  for (const rule of rules) {
    if (!rule.validator(value)) {
      errors.push(rule.message);
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Create a string validator with common rules
 */
export function createStringValidator(options: {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  patternMessage?: string;
  securityCheck?: boolean;
}): ValidationRule[] {
  const rules: ValidationRule[] = [];
  
  if (options.required) {
    rules.push({
      validator: isNonEmptyString,
      message: 'This field is required',
    });
  }
  
  if (options.minLength !== undefined) {
    rules.push({
      validator: (v) => !isString(v) || v.length >= options.minLength!,
      message: `Must be at least ${options.minLength} characters`,
    });
  }
  
  if (options.maxLength !== undefined) {
    rules.push({
      validator: (v) => !isString(v) || v.length <= options.maxLength!,
      message: `Must be at most ${options.maxLength} characters`,
    });
  }
  
  if (options.pattern) {
    rules.push({
      validator: (v) => !isString(v) || options.pattern!.test(v),
      message: options.patternMessage || 'Invalid format',
    });
  }
  
  if (options.securityCheck !== false) {
    rules.push({
      validator: isSecureInput,
      message: 'Input contains potentially dangerous content',
    });
  }
  
  return rules;
}
