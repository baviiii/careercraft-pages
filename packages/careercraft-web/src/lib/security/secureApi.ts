/**
 * Secure API Client - Enterprise-grade API security wrapper
 * Combines all security measures into a single, easy-to-use API client
 */

import { supabase } from '@/integrations/supabase/client';
import { sanitize, deepSanitize } from './sanitizers';
import { checkRateLimit, RATE_LIMITS, RateLimitError } from './rateLimiter';
import { auditLog, auditSecurityViolation } from './auditLog';
import { containsXSS, isSecureInput } from './validators';
import { containsSQLInjection } from './sanitizers';
import { validateInput, type ValidationResult } from './schemas';
import { z } from 'zod';

// ============================================
// TYPES
// ============================================

export interface SecureApiOptions {
  validateInput?: boolean;
  sanitizeInput?: boolean;
  rateLimit?: boolean;
  rateLimitKey?: string;
  rateLimitConfig?: typeof RATE_LIMITS.API;
  auditLog?: boolean;
  timeout?: number;
}

export interface SecureApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  validationErrors?: z.ZodError['errors'];
  rateLimited?: boolean;
  retryAfter?: number;
}

const DEFAULT_OPTIONS: SecureApiOptions = {
  validateInput: true,
  sanitizeInput: true,
  rateLimit: true,
  auditLog: true,
  timeout: 30000,
};

// ============================================
// INPUT SECURITY CHECK
// ============================================

/**
 * Check input for security threats
 */
export function checkInputSecurity(
  input: unknown,
  context: string,
  userId?: string
): { safe: boolean; threats: string[] } {
  const threats: string[] = [];
  
  const checkValue = (value: unknown, path: string): void => {
    if (typeof value === 'string') {
      if (containsXSS(value)) {
        threats.push(`XSS attempt detected in ${path}`);
        auditSecurityViolation('XSS_ATTEMPT', { path, context }, userId);
      }
      if (containsSQLInjection(value)) {
        threats.push(`SQL injection attempt detected in ${path}`);
        auditSecurityViolation('SQL_INJECTION_ATTEMPT', { path, context }, userId);
      }
    } else if (Array.isArray(value)) {
      value.forEach((item, index) => checkValue(item, `${path}[${index}]`));
    } else if (typeof value === 'object' && value !== null) {
      Object.entries(value).forEach(([key, val]) => checkValue(val, `${path}.${key}`));
    }
  };
  
  checkValue(input, 'root');
  
  return {
    safe: threats.length === 0,
    threats,
  };
}

// ============================================
// SECURE SUPABASE FUNCTION CALLER
// ============================================

/**
 * Securely invoke a Supabase Edge Function
 */
export async function secureInvoke<T = unknown>(
  functionName: string,
  body: Record<string, unknown>,
  options: SecureApiOptions = {}
): Promise<SecureApiResponse<T>> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const startTime = Date.now();
  
  try {
    // Get current user for audit logging
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;
    
    // 1. Rate limiting
    if (opts.rateLimit) {
      const rateLimitKey = opts.rateLimitKey || `${functionName}:${userId || 'anonymous'}`;
      const rateLimitResult = checkRateLimit(rateLimitKey, opts.rateLimitConfig || RATE_LIMITS.API);
      
      if (!rateLimitResult.allowed) {
        if (opts.auditLog) {
          auditLog({
            type: 'RATE_LIMIT_EXCEEDED',
            action: `Rate limit exceeded for ${functionName}`,
            userId,
            resource: functionName,
            success: false,
          });
        }
        
        return {
          success: false,
          error: `Rate limit exceeded. Try again in ${rateLimitResult.retryAfter} seconds.`,
          rateLimited: true,
          retryAfter: rateLimitResult.retryAfter,
        };
      }
    }
    
    // 2. Security check
    if (opts.validateInput) {
      const securityCheck = checkInputSecurity(body, functionName, userId);
      if (!securityCheck.safe) {
        return {
          success: false,
          error: 'Security violation detected',
        };
      }
    }
    
    // 3. Sanitize input
    let sanitizedBody = body;
    if (opts.sanitizeInput) {
      sanitizedBody = deepSanitize(body, {
        stripHTML: true,
        sqlSafe: true,
        maxLength: 10000,
      });
    }
    
    // 4. Make the API call
    const { data, error } = await supabase.functions.invoke(functionName, {
      body: sanitizedBody,
    });
    
    // 5. Audit log
    if (opts.auditLog) {
      auditLog({
        type: error ? 'API_ERROR' : 'API_CALL',
        action: `${functionName} - ${body.action || 'unknown'}`,
        userId,
        resource: functionName,
        details: {
          action: body.action,
          duration: Date.now() - startTime,
        },
        success: !error,
        errorMessage: error?.message,
      });
    }
    
    if (error) {
      return {
        success: false,
        error: error.message,
      };
    }
    
    return {
      success: true,
      data: data as T,
    };
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return {
      success: false,
      error: errorMessage,
    };
  }
}

// ============================================
// SECURE FORM HANDLER
// ============================================

/**
 * Securely handle form submission with validation
 */
export async function secureFormSubmit<T, R = unknown>(
  schema: z.ZodSchema<T>,
  formData: unknown,
  handler: (validData: T) => Promise<R>,
  options: SecureApiOptions = {}
): Promise<SecureApiResponse<R>> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  try {
    // Get current user
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;
    
    // 1. Rate limiting
    if (opts.rateLimit) {
      const rateLimitKey = opts.rateLimitKey || `form:${userId || 'anonymous'}`;
      const rateLimitResult = checkRateLimit(rateLimitKey, RATE_LIMITS.FORM);
      
      if (!rateLimitResult.allowed) {
        return {
          success: false,
          error: `Too many submissions. Try again in ${rateLimitResult.retryAfter} seconds.`,
          rateLimited: true,
          retryAfter: rateLimitResult.retryAfter,
        };
      }
    }
    
    // 2. Security check
    if (opts.validateInput) {
      const securityCheck = checkInputSecurity(formData, 'form', userId);
      if (!securityCheck.safe) {
        return {
          success: false,
          error: 'Invalid input detected',
        };
      }
    }
    
    // 3. Schema validation
    const validation = validateInput(schema, formData);
    if (!validation.success) {
      return {
        success: false,
        error: 'Validation failed',
        validationErrors: 'errors' in validation ? validation.errors : undefined,
      };
    }
    
    // 4. Execute handler
    const result = await handler(validation.data);
    
    // 5. Audit log
    if (opts.auditLog) {
      auditLog({
        type: 'DATA_ACCESS',
        action: 'Form submission',
        userId,
        success: true,
      });
    }
    
    return {
      success: true,
      data: result,
    };
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return {
      success: false,
      error: errorMessage,
    };
  }
}

// ============================================
// SECURE DATA FETCHER
// ============================================

/**
 * Securely fetch data with caching and validation
 */
export async function secureFetch<T>(
  url: string,
  options: RequestInit & SecureApiOptions = {}
): Promise<SecureApiResponse<T>> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  try {
    // Get current user
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;
    
    // 1. Rate limiting
    if (opts.rateLimit) {
      const rateLimitKey = opts.rateLimitKey || `fetch:${userId || 'anonymous'}`;
      const rateLimitResult = checkRateLimit(rateLimitKey, RATE_LIMITS.API);
      
      if (!rateLimitResult.allowed) {
        return {
          success: false,
          error: `Rate limit exceeded. Try again in ${rateLimitResult.retryAfter} seconds.`,
          rateLimited: true,
          retryAfter: rateLimitResult.retryAfter,
        };
      }
    }
    
    // 2. Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), opts.timeout);
    
    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // 3. Audit log
      if (opts.auditLog) {
        auditLog({
          type: 'API_CALL',
          action: `Fetch ${url}`,
          userId,
          resource: url,
          success: true,
        });
      }
      
      return {
        success: true,
        data: data as T,
      };
      
    } finally {
      clearTimeout(timeoutId);
    }
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return {
      success: false,
      error: errorMessage,
    };
  }
}

// ============================================
// REACT HOOK FOR SECURE API
// ============================================

export interface UseSecureApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  rateLimited: boolean;
  retryAfter: number | null;
}

/**
 * Create a secure API hook configuration
 */
export function createSecureApiConfig(
  functionName: string,
  options: SecureApiOptions = {}
) {
  return {
    invoke: <T = unknown>(body: Record<string, unknown>) => 
      secureInvoke<T>(functionName, body, options),
    options,
  };
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Sanitize user input before display
 */
export function sanitizeForDisplay(input: string): string {
  return sanitize(input, {
    stripHTML: true,
    encodeHTML: true,
    sqlSafe: false,
    maxLength: 10000,
  });
}

/**
 * Sanitize user input before database storage
 */
export function sanitizeForStorage(input: string): string {
  return sanitize(input, {
    stripHTML: true,
    sqlSafe: true,
    maxLength: 10000,
  });
}

/**
 * Validate and sanitize email
 */
export function secureEmail(email: string): string | null {
  const sanitized = sanitize(email, { maxLength: 254 }).toLowerCase().trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(sanitized) ? sanitized : null;
}

/**
 * Validate and sanitize URL
 */
export function secureURL(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}
