/**
 * React Security Hooks - Easy integration of security features
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  validateFile,
  validateFiles,
  RESUME_UPLOAD_CONFIG,
  IMAGE_UPLOAD_CONFIG,
  type FileValidationResult,
  type FileUploadConfig,
} from '@/lib/security/fileUpload';
import {
  checkRateLimit,
  getRateLimitStatus,
  RATE_LIMITS,
  type RateLimitConfig,
  type RateLimitResult,
} from '@/lib/security/rateLimiter';
import {
  secureInvoke,
  secureFormSubmit,
  type SecureApiOptions,
  type SecureApiResponse,
} from '@/lib/security/secureApi';
import { sanitize, deepSanitize, type SanitizeOptions } from '@/lib/security/sanitizers';
import { validateInput, type ValidationResult } from '@/lib/security/schemas';
import { detectXSS, sanitizeXSS } from '@/lib/security/xss';
import { z } from 'zod';

// ============================================
// FILE UPLOAD HOOK
// ============================================

export interface UseSecureFileUploadOptions {
  config?: Partial<FileUploadConfig>;
  onValidationError?: (errors: string[]) => void;
  onSecurityThreat?: (threats: string[]) => void;
}

export interface UseSecureFileUploadResult {
  validateFile: (file: File) => Promise<FileValidationResult>;
  validateFiles: (files: File[]) => Promise<{ results: FileValidationResult[]; allValid: boolean }>;
  isValidating: boolean;
  lastResult: FileValidationResult | null;
}

export function useSecureFileUpload(
  options: UseSecureFileUploadOptions = {}
): UseSecureFileUploadResult {
  const [isValidating, setIsValidating] = useState(false);
  const [lastResult, setLastResult] = useState<FileValidationResult | null>(null);
  
  const handleValidateFile = useCallback(async (file: File): Promise<FileValidationResult> => {
    setIsValidating(true);
    try {
      const result = await validateFile(file, options.config);
      setLastResult(result);
      
      if (!result.isValid && options.onValidationError) {
        options.onValidationError(result.errors);
      }
      
      return result;
    } finally {
      setIsValidating(false);
    }
  }, [options]);
  
  const handleValidateFiles = useCallback(async (files: File[]) => {
    setIsValidating(true);
    try {
      const result = await validateFiles(files, options.config);
      
      if (!result.allValid && options.onValidationError) {
        const allErrors = result.results.flatMap(r => r.errors);
        options.onValidationError(allErrors);
      }
      
      return result;
    } finally {
      setIsValidating(false);
    }
  }, [options]);
  
  return {
    validateFile: handleValidateFile,
    validateFiles: handleValidateFiles,
    isValidating,
    lastResult,
  };
}

/**
 * Pre-configured hook for resume uploads
 */
export function useSecureResumeUpload(
  options: Omit<UseSecureFileUploadOptions, 'config'> = {}
) {
  return useSecureFileUpload({
    ...options,
    config: RESUME_UPLOAD_CONFIG,
  });
}

/**
 * Pre-configured hook for image uploads
 */
export function useSecureImageUpload(
  options: Omit<UseSecureFileUploadOptions, 'config'> = {}
) {
  return useSecureFileUpload({
    ...options,
    config: IMAGE_UPLOAD_CONFIG,
  });
}

// ============================================
// RATE LIMIT HOOK
// ============================================

export interface UseRateLimitOptions {
  key: string;
  config?: RateLimitConfig;
  onLimitExceeded?: (result: RateLimitResult) => void;
}

export interface UseRateLimitResult {
  checkLimit: () => RateLimitResult;
  getStatus: () => RateLimitResult;
  isLimited: boolean;
  remaining: number;
  retryAfter: number | null;
}

export function useRateLimit(options: UseRateLimitOptions): UseRateLimitResult {
  const [status, setStatus] = useState<RateLimitResult>(() => 
    getRateLimitStatus(options.key, options.config || RATE_LIMITS.API)
  );
  
  const checkLimit = useCallback(() => {
    const result = checkRateLimit(options.key, options.config || RATE_LIMITS.API);
    setStatus(result);
    
    if (!result.allowed && options.onLimitExceeded) {
      options.onLimitExceeded(result);
    }
    
    return result;
  }, [options]);
  
  const getStatus = useCallback(() => {
    const result = getRateLimitStatus(options.key, options.config || RATE_LIMITS.API);
    setStatus(result);
    return result;
  }, [options]);
  
  return {
    checkLimit,
    getStatus,
    isLimited: !status.allowed,
    remaining: status.remaining,
    retryAfter: status.retryAfter || null,
  };
}

// ============================================
// SECURE API HOOK
// ============================================

export interface UseSecureApiOptions<T> extends SecureApiOptions {
  onSuccess?: (data: T) => void;
  onError?: (error: string) => void;
  onRateLimited?: (retryAfter: number) => void;
}

export interface UseSecureApiResult<T> {
  invoke: (body: Record<string, unknown>) => Promise<SecureApiResponse<T>>;
  data: T | null;
  loading: boolean;
  error: string | null;
  rateLimited: boolean;
  retryAfter: number | null;
  reset: () => void;
}

export function useSecureApi<T = unknown>(
  functionName: string,
  options: UseSecureApiOptions<T> = {}
): UseSecureApiResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rateLimited, setRateLimited] = useState(false);
  const [retryAfter, setRetryAfter] = useState<number | null>(null);
  
  const invoke = useCallback(async (body: Record<string, unknown>): Promise<SecureApiResponse<T>> => {
    setLoading(true);
    setError(null);
    setRateLimited(false);
    setRetryAfter(null);
    
    try {
      const result = await secureInvoke<T>(functionName, body, options);
      
      if (result.success && result.data) {
        setData(result.data);
        options.onSuccess?.(result.data);
      } else if (result.rateLimited) {
        setRateLimited(true);
        setRetryAfter(result.retryAfter || null);
        options.onRateLimited?.(result.retryAfter || 0);
      } else if (result.error) {
        setError(result.error);
        options.onError?.(result.error);
      }
      
      return result;
    } finally {
      setLoading(false);
    }
  }, [functionName, options]);
  
  const reset = useCallback(() => {
    setData(null);
    setLoading(false);
    setError(null);
    setRateLimited(false);
    setRetryAfter(null);
  }, []);
  
  return {
    invoke,
    data,
    loading,
    error,
    rateLimited,
    retryAfter,
    reset,
  };
}

// ============================================
// FORM VALIDATION HOOK
// ============================================

export interface UseSecureFormOptions<T> {
  schema: z.ZodSchema<T>;
  onValidationError?: (errors: z.ZodError['errors']) => void;
  sanitizeOptions?: SanitizeOptions;
}

export interface UseSecureFormResult<T> {
  validate: (data: unknown) => ValidationResult<T>;
  sanitize: (data: Record<string, unknown>) => Record<string, unknown>;
  errors: z.ZodError['errors'] | null;
  isValid: boolean;
}

export function useSecureForm<T>(options: UseSecureFormOptions<T>): UseSecureFormResult<T> {
  const [errors, setErrors] = useState<z.ZodError['errors'] | null>(null);
  const [isValid, setIsValid] = useState(true);
  
  const validate = useCallback((data: unknown): ValidationResult<T> => {
    const result = validateInput(options.schema, data);
    
    if (!result.success && 'errors' in result) {
      setErrors(result.errors);
      setIsValid(false);
      options.onValidationError?.(result.errors);
    } else {
      setErrors(null);
      setIsValid(true);
    }
    
    return result;
  }, [options]);
  
  const sanitizeData = useCallback((data: Record<string, unknown>): Record<string, unknown> => {
    return deepSanitize(data, options.sanitizeOptions);
  }, [options.sanitizeOptions]);
  
  return {
    validate,
    sanitize: sanitizeData,
    errors,
    isValid,
  };
}

// ============================================
// INPUT SANITIZATION HOOK
// ============================================

export interface UseSanitizeOptions extends SanitizeOptions {
  debounceMs?: number;
}

export function useSanitizedInput(
  initialValue: string = '',
  options: UseSanitizeOptions = {}
): [string, (value: string) => void, string] {
  const [rawValue, setRawValue] = useState(initialValue);
  const [sanitizedValue, setSanitizedValue] = useState(() => sanitize(initialValue, options));
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();
  
  const setValue = useCallback((value: string) => {
    setRawValue(value);
    
    if (options.debounceMs) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        setSanitizedValue(sanitize(value, options));
      }, options.debounceMs);
    } else {
      setSanitizedValue(sanitize(value, options));
    }
  }, [options]);
  
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);
  
  return [rawValue, setValue, sanitizedValue];
}

// ============================================
// XSS DETECTION HOOK
// ============================================

export interface UseXSSDetectionResult {
  checkForXSS: (input: string) => boolean;
  sanitizeHTML: (input: string) => string;
  lastDetection: { detected: boolean; patterns: string[] } | null;
}

export function useXSSDetection(): UseXSSDetectionResult {
  const [lastDetection, setLastDetection] = useState<{ detected: boolean; patterns: string[] } | null>(null);
  
  const checkForXSS = useCallback((input: string): boolean => {
    const result = detectXSS(input);
    setLastDetection(result);
    return result.detected;
  }, []);
  
  const sanitizeHTML = useCallback((input: string): string => {
    return sanitizeXSS(input);
  }, []);
  
  return {
    checkForXSS,
    sanitizeHTML,
    lastDetection,
  };
}

// ============================================
// COMBINED SECURITY HOOK
// ============================================

export interface UseSecurityResult {
  // File upload
  validateFile: (file: File, config?: Partial<FileUploadConfig>) => Promise<FileValidationResult>;
  
  // Rate limiting
  checkRateLimit: (key: string, config?: RateLimitConfig) => RateLimitResult;
  
  // Sanitization
  sanitize: (input: string, options?: SanitizeOptions) => string;
  deepSanitize: <T extends Record<string, unknown>>(obj: T, options?: SanitizeOptions) => T;
  
  // XSS
  detectXSS: (input: string) => { detected: boolean; patterns: string[] };
  sanitizeXSS: (input: string) => string;
  
  // Validation
  validateInput: <T>(schema: z.ZodSchema<T>, data: unknown) => ValidationResult<T>;
}

export function useSecurity(): UseSecurityResult {
  return {
    validateFile: (file, config) => validateFile(file, config),
    checkRateLimit: (key, config) => checkRateLimit(key, config || RATE_LIMITS.API),
    sanitize: (input, options) => sanitize(input, options),
    deepSanitize: (obj, options) => deepSanitize(obj, options),
    detectXSS: (input) => detectXSS(input),
    sanitizeXSS: (input) => sanitizeXSS(input),
    validateInput: (schema, data) => validateInput(schema, data),
  };
}
