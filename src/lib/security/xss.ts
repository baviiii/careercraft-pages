/**
 * XSS Protection - Comprehensive Cross-Site Scripting prevention
 * Provides multiple layers of XSS protection
 */

import { encodeHTML, sanitizeHTML, stripHTML } from './sanitizers';
import { containsXSS } from './validators';
import { auditSecurityViolation } from './auditLog';

// ============================================
// XSS DETECTION
// ============================================

/**
 * Comprehensive XSS pattern detection
 */
const XSS_PATTERNS = [
  // Script tags
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /<script[^>]*>/gi,
  
  // Event handlers
  /\bon\w+\s*=\s*["']?[^"']*["']?/gi,
  /\bon\w+\s*=\s*[^\s>]*/gi,
  
  // JavaScript URLs
  /javascript\s*:/gi,
  /vbscript\s*:/gi,
  /livescript\s*:/gi,
  
  // Data URLs (can contain scripts)
  /data\s*:\s*text\/html/gi,
  /data\s*:\s*application\/javascript/gi,
  
  // Expression (IE)
  /expression\s*\(/gi,
  
  // Dangerous tags
  /<iframe[^>]*>/gi,
  /<object[^>]*>/gi,
  /<embed[^>]*>/gi,
  /<applet[^>]*>/gi,
  /<meta[^>]*>/gi,
  /<link[^>]*>/gi,
  /<base[^>]*>/gi,
  /<form[^>]*>/gi,
  
  // SVG attacks
  /<svg[^>]*onload/gi,
  /<svg[^>]*onerror/gi,
  
  // Image attacks
  /<img[^>]*onerror/gi,
  /<img[^>]*onload/gi,
  
  // Body attacks
  /<body[^>]*onload/gi,
  
  // Input attacks
  /<input[^>]*onfocus/gi,
  /<input[^>]*autofocus/gi,
  
  // Style attacks
  /<style[^>]*>/gi,
  /style\s*=\s*["'][^"']*expression/gi,
  /style\s*=\s*["'][^"']*javascript/gi,
  
  // HTML entities that could be XSS
  /&#x?0*(?:74|4a|106|6a);/gi, // 'j' character
  /&#x?0*(?:97|61|65|41);/gi,  // 'a' character
  
  // Unicode escapes
  /\\u0*(?:6a|4a)/gi, // 'j' in unicode
  /\\x(?:6a|4a)/gi,   // 'j' in hex
  
  // Null bytes
  /\x00/g,
  /%00/g,
];

/**
 * Detect XSS attempts in a string
 */
export function detectXSS(input: string): { detected: boolean; patterns: string[] } {
  if (typeof input !== 'string') {
    return { detected: false, patterns: [] };
  }
  
  const detectedPatterns: string[] = [];
  
  for (const pattern of XSS_PATTERNS) {
    const match = input.match(pattern);
    if (match) {
      detectedPatterns.push(match[0]);
    }
  }
  
  return {
    detected: detectedPatterns.length > 0,
    patterns: detectedPatterns,
  };
}

/**
 * Check and log XSS attempts
 */
export function checkAndLogXSS(
  input: string,
  context: string,
  userId?: string
): boolean {
  const result = detectXSS(input);
  
  if (result.detected) {
    auditSecurityViolation('XSS_ATTEMPT', {
      context,
      patterns: result.patterns,
      inputLength: input.length,
      inputPreview: input.slice(0, 100),
    }, userId);
    
    return true;
  }
  
  return false;
}

// ============================================
// XSS SANITIZATION
// ============================================

export interface XSSSanitizeOptions {
  allowedTags?: string[];
  allowedAttributes?: Record<string, string[]>;
  allowedProtocols?: string[];
  stripComments?: boolean;
  stripCDATA?: boolean;
}

const DEFAULT_ALLOWED_TAGS = [
  'p', 'br', 'b', 'i', 'u', 'strong', 'em', 'a', 'ul', 'ol', 'li',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'pre', 'code',
  'span', 'div', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
];

const DEFAULT_ALLOWED_ATTRIBUTES: Record<string, string[]> = {
  'a': ['href', 'title', 'target', 'rel'],
  'img': ['src', 'alt', 'title', 'width', 'height'],
  '*': ['class', 'id'],
};

const DEFAULT_ALLOWED_PROTOCOLS = ['http', 'https', 'mailto', 'tel'];

/**
 * Advanced XSS sanitization with whitelist approach
 */
export function sanitizeXSS(
  input: string,
  options: XSSSanitizeOptions = {}
): string {
  if (typeof input !== 'string') return '';
  
  const {
    allowedTags = DEFAULT_ALLOWED_TAGS,
    allowedAttributes = DEFAULT_ALLOWED_ATTRIBUTES,
    allowedProtocols = DEFAULT_ALLOWED_PROTOCOLS,
    stripComments = true,
    stripCDATA = true,
  } = options;
  
  let result = input;
  
  // Remove comments
  if (stripComments) {
    result = result.replace(/<!--[\s\S]*?-->/g, '');
  }
  
  // Remove CDATA
  if (stripCDATA) {
    result = result.replace(/<!\[CDATA\[[\s\S]*?\]\]>/g, '');
  }
  
  // Remove script tags and content
  result = result.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  
  // Remove style tags and content
  result = result.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
  
  // Remove event handlers
  result = result.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '');
  result = result.replace(/\s*on\w+\s*=\s*[^\s>]*/gi, '');
  
  // Remove javascript: and other dangerous protocols
  result = result.replace(/(?:javascript|vbscript|livescript|data)\s*:/gi, '');
  
  // Remove expression()
  result = result.replace(/expression\s*\([^)]*\)/gi, '');
  
  // Process tags
  result = result.replace(/<(\/?)([\w]+)([^>]*)>/gi, (match, closing, tag, attrs) => {
    const tagLower = tag.toLowerCase();
    
    // Check if tag is allowed
    if (!allowedTags.includes(tagLower)) {
      return '';
    }
    
    // For closing tags, just return the tag
    if (closing) {
      return `</${tagLower}>`;
    }
    
    // Process attributes
    const allowedAttrsForTag = [
      ...(allowedAttributes[tagLower] || []),
      ...(allowedAttributes['*'] || []),
    ];
    
    const sanitizedAttrs = attrs.replace(
      /(\w+)\s*=\s*["']([^"']*)["']/gi,
      (attrMatch: string, attrName: string, attrValue: string) => {
        const attrLower = attrName.toLowerCase();
        
        // Check if attribute is allowed
        if (!allowedAttrsForTag.includes(attrLower)) {
          return '';
        }
        
        // Check URLs for allowed protocols
        if (['href', 'src', 'action'].includes(attrLower)) {
          const protocol = attrValue.split(':')[0]?.toLowerCase();
          if (protocol && !allowedProtocols.includes(protocol) && attrValue.includes(':')) {
            return '';
          }
        }
        
        // Encode the attribute value
        const encodedValue = encodeHTML(attrValue);
        return `${attrLower}="${encodedValue}"`;
      }
    );
    
    return `<${tagLower}${sanitizedAttrs}>`;
  });
  
  return result;
}

// ============================================
// CONTEXT-SPECIFIC ENCODING
// ============================================

/**
 * Encode for HTML context
 */
export function encodeForHTML(input: string): string {
  return encodeHTML(input);
}

/**
 * Encode for HTML attribute context
 */
export function encodeForHTMLAttribute(input: string): string {
  if (typeof input !== 'string') return '';
  
  return input
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\//g, '&#x2F;')
    .replace(/\\/g, '&#x5C;')
    .replace(/`/g, '&#x60;');
}

/**
 * Encode for JavaScript context
 */
export function encodeForJavaScript(input: string): string {
  if (typeof input !== 'string') return '';
  
  return input
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t')
    .replace(/</g, '\\x3C')
    .replace(/>/g, '\\x3E')
    .replace(/\//g, '\\/')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

/**
 * Encode for URL context
 */
export function encodeForURL(input: string): string {
  if (typeof input !== 'string') return '';
  return encodeURIComponent(input);
}

/**
 * Encode for CSS context
 */
export function encodeForCSS(input: string): string {
  if (typeof input !== 'string') return '';
  
  return input.replace(/[^\w]/g, (char) => {
    return '\\' + char.charCodeAt(0).toString(16) + ' ';
  });
}

// ============================================
// SAFE RENDERING HELPERS
// ============================================

/**
 * Create safe HTML for dangerouslySetInnerHTML
 */
export function createSafeHTML(html: string): { __html: string } {
  return { __html: sanitizeXSS(html) };
}

/**
 * Safe text content (strips all HTML)
 */
export function safeTextContent(input: string): string {
  return stripHTML(input);
}

/**
 * Safe HTML content (sanitizes but keeps formatting)
 */
export function safeHTMLContent(input: string): string {
  return sanitizeXSS(input);
}

// ============================================
// URL VALIDATION
// ============================================

/**
 * Validate and sanitize URL to prevent XSS
 */
export function sanitizeURL(url: string): string {
  if (typeof url !== 'string') return '';
  
  try {
    const parsed = new URL(url);
    
    // Only allow safe protocols
    if (!['http:', 'https:', 'mailto:', 'tel:'].includes(parsed.protocol)) {
      return '';
    }
    
    // Remove credentials
    parsed.username = '';
    parsed.password = '';
    
    return parsed.toString();
  } catch {
    // If URL parsing fails, it might be a relative URL
    // Check for dangerous patterns
    if (/^(?:javascript|vbscript|data):/i.test(url)) {
      return '';
    }
    
    return encodeURI(url);
  }
}

/**
 * Check if URL is safe
 */
export function isURLSafe(url: string): boolean {
  if (typeof url !== 'string') return false;
  
  // Check for dangerous protocols
  if (/^(?:javascript|vbscript|data|file):/i.test(url.trim())) {
    return false;
  }
  
  try {
    const parsed = new URL(url);
    return ['http:', 'https:', 'mailto:', 'tel:'].includes(parsed.protocol);
  } catch {
    // Relative URLs are generally safe
    return !url.includes(':') || url.startsWith('/');
  }
}
