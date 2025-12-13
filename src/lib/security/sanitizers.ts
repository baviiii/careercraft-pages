/**
 * Input Sanitization - Enterprise-grade sanitization utilities
 * Prevents XSS, SQL injection, and other injection attacks
 */

// ============================================
// HTML ENTITY ENCODING
// ============================================

const HTML_ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
  '`': '&#x60;',
  '=': '&#x3D;',
};

const HTML_DECODE_ENTITIES: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#x27;': "'",
  '&#x2F;': '/',
  '&#x60;': '`',
  '&#x3D;': '=',
  '&#39;': "'",
  '&apos;': "'",
};

/**
 * Encode HTML entities to prevent XSS
 */
export function encodeHTML(str: string): string {
  if (typeof str !== 'string') return '';
  return str.replace(/[&<>"'`=\/]/g, (char) => HTML_ENTITIES[char] || char);
}

/**
 * Decode HTML entities
 */
export function decodeHTML(str: string): string {
  if (typeof str !== 'string') return '';
  return str.replace(/&(?:amp|lt|gt|quot|#x27|#x2F|#x60|#x3D|#39|apos);/g, 
    (entity) => HTML_DECODE_ENTITIES[entity] || entity
  );
}

// ============================================
// XSS SANITIZATION
// ============================================

/**
 * Remove all HTML tags
 */
export function stripHTML(str: string): string {
  if (typeof str !== 'string') return '';
  return str
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .trim();
}

/**
 * Remove dangerous HTML while keeping safe formatting
 */
export function sanitizeHTML(str: string): string {
  if (typeof str !== 'string') return '';
  
  // Remove script tags and their content
  let clean = str.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  
  // Remove style tags and their content
  clean = clean.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
  
  // Remove event handlers
  clean = clean.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '');
  clean = clean.replace(/\s*on\w+\s*=\s*[^\s>]*/gi, '');
  
  // Remove javascript: URLs
  clean = clean.replace(/javascript\s*:/gi, '');
  
  // Remove data: URLs (can be used for XSS)
  clean = clean.replace(/data\s*:/gi, '');
  
  // Remove vbscript: URLs
  clean = clean.replace(/vbscript\s*:/gi, '');
  
  // Remove expression() CSS
  clean = clean.replace(/expression\s*\(/gi, '');
  
  // Remove dangerous attributes
  clean = clean.replace(/\s*(href|src|action|formaction)\s*=\s*["']?\s*javascript:/gi, '');
  
  return clean.trim();
}

/**
 * Comprehensive XSS sanitization - removes all potentially dangerous content
 */
export function sanitizeForDisplay(str: string): string {
  if (typeof str !== 'string') return '';
  
  // First strip dangerous HTML
  let clean = sanitizeHTML(str);
  
  // Then encode remaining HTML entities
  clean = encodeHTML(clean);
  
  return clean;
}

// ============================================
// SQL INJECTION PREVENTION
// ============================================

/**
 * Escape SQL special characters
 * Note: Always use parameterized queries - this is a backup measure
 */
export function escapeSQLString(str: string): string {
  if (typeof str !== 'string') return '';
  return str
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "''")
    .replace(/"/g, '\\"')
    .replace(/\x00/g, '\\0')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\x1a/g, '\\Z');
}

/**
 * Check for SQL injection patterns
 */
export function containsSQLInjection(str: string): boolean {
  if (typeof str !== 'string') return false;
  
  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|TRUNCATE|EXEC|EXECUTE)\b)/i,
    /(\b(UNION\s+SELECT|UNION\s+ALL\s+SELECT)\b)/i,
    /(\b(OR|AND)\s+\d+\s*=\s*\d+)/i,
    /(\b(OR|AND)\s+['"]?\w+['"]?\s*=\s*['"]?\w+['"]?)/i,
    /(--|\#|\/\*|\*\/)/,
    /(\bWAITFOR\s+DELAY\b)/i,
    /(\bBENCHMARK\s*\()/i,
    /(\bSLEEP\s*\()/i,
    /(\bLOAD_FILE\s*\()/i,
    /(\bINTO\s+OUTFILE\b)/i,
    /(\bINTO\s+DUMPFILE\b)/i,
    /(;\s*(SELECT|INSERT|UPDATE|DELETE|DROP))/i,
    /(\bCHAR\s*\(\d+\))/i,
    /(\bCONCAT\s*\()/i,
    /(\b0x[0-9a-fA-F]+)/,
  ];
  
  return sqlPatterns.some(pattern => pattern.test(str));
}

/**
 * Sanitize input for SQL safety
 */
export function sanitizeForSQL(str: string): string {
  if (typeof str !== 'string') return '';
  
  // Remove null bytes
  let clean = str.replace(/\x00/g, '');
  
  // Remove SQL comments
  clean = clean.replace(/--/g, '');
  clean = clean.replace(/\/\*/g, '');
  clean = clean.replace(/\*\//g, '');
  
  // Escape quotes
  clean = escapeSQLString(clean);
  
  return clean;
}

// ============================================
// GENERAL SANITIZATION
// ============================================

/**
 * Remove control characters
 */
export function removeControlChars(str: string): string {
  if (typeof str !== 'string') return '';
  // Remove all control characters except newline, carriage return, and tab
  return str.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
}

/**
 * Normalize whitespace
 */
export function normalizeWhitespace(str: string): string {
  if (typeof str !== 'string') return '';
  return str
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Sanitize filename
 */
export function sanitizeFilename(filename: string): string {
  if (typeof filename !== 'string') return '';
  
  // Remove path traversal attempts
  let clean = filename.replace(/\.\./g, '');
  
  // Remove directory separators
  clean = clean.replace(/[\/\\]/g, '');
  
  // Remove null bytes
  clean = clean.replace(/\x00/g, '');
  
  // Remove control characters
  clean = removeControlChars(clean);
  
  // Remove dangerous characters
  clean = clean.replace(/[<>:"|?*]/g, '');
  
  // Limit length
  if (clean.length > 255) {
    const ext = clean.split('.').pop() || '';
    const name = clean.slice(0, 255 - ext.length - 1);
    clean = `${name}.${ext}`;
  }
  
  return clean || 'unnamed';
}

/**
 * Sanitize URL
 */
export function sanitizeURL(url: string): string {
  if (typeof url !== 'string') return '';
  
  try {
    const parsed = new URL(url);
    
    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return '';
    }
    
    // Remove credentials from URL
    parsed.username = '';
    parsed.password = '';
    
    return parsed.toString();
  } catch {
    return '';
  }
}

/**
 * Sanitize email
 */
export function sanitizeEmail(email: string): string {
  if (typeof email !== 'string') return '';
  
  // Remove whitespace
  let clean = email.trim().toLowerCase();
  
  // Remove dangerous characters
  clean = clean.replace(/[<>'"]/g, '');
  
  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(clean)) {
    return '';
  }
  
  return clean;
}

/**
 * Sanitize phone number
 */
export function sanitizePhone(phone: string): string {
  if (typeof phone !== 'string') return '';
  
  // Keep only digits, plus sign, and common separators
  return phone.replace(/[^\d+\-\s().]/g, '').trim();
}

// ============================================
// COMPREHENSIVE SANITIZER
// ============================================

export interface SanitizeOptions {
  stripHTML?: boolean;
  encodeHTML?: boolean;
  removeControlChars?: boolean;
  normalizeWhitespace?: boolean;
  maxLength?: number;
  sqlSafe?: boolean;
}

/**
 * Comprehensive sanitization with configurable options
 */
export function sanitize(str: string, options: SanitizeOptions = {}): string {
  if (typeof str !== 'string') return '';
  
  const {
    stripHTML: shouldStripHTML = true,
    encodeHTML: shouldEncodeHTML = true,
    removeControlChars: shouldRemoveControlChars = true,
    normalizeWhitespace: shouldNormalizeWhitespace = true,
    maxLength = 10000,
    sqlSafe = true,
  } = options;
  
  let result = str;
  
  if (shouldRemoveControlChars) {
    result = removeControlChars(result);
  }
  
  if (shouldStripHTML) {
    result = stripHTML(result);
  } else if (shouldEncodeHTML) {
    result = sanitizeHTML(result);
  }
  
  if (sqlSafe) {
    result = sanitizeForSQL(result);
  }
  
  if (shouldNormalizeWhitespace) {
    result = normalizeWhitespace(result);
  }
  
  if (maxLength && result.length > maxLength) {
    result = result.slice(0, maxLength);
  }
  
  return result;
}

/**
 * Deep sanitize an object recursively
 */
export function deepSanitize<T extends Record<string, unknown>>(
  obj: T,
  options: SanitizeOptions = {}
): T {
  if (obj === null || obj === undefined) return obj;
  
  if (typeof obj === 'string') {
    return sanitize(obj, options) as unknown as T;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => deepSanitize(item as Record<string, unknown>, options)) as unknown as T;
  }
  
  if (typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      // Sanitize the key as well
      const sanitizedKey = sanitize(key, { ...options, maxLength: 100 });
      result[sanitizedKey] = deepSanitize(value as Record<string, unknown>, options);
    }
    return result as T;
  }
  
  return obj;
}
