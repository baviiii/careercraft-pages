/**
 * CSRF Protection - Cross-Site Request Forgery prevention
 * Provides token generation, validation, and middleware
 */

import { auditSecurityViolation } from './auditLog';

// ============================================
// CONFIGURATION
// ============================================

export interface CSRFConfig {
  tokenLength: number;
  tokenExpiry: number; // milliseconds
  cookieName: string;
  headerName: string;
  secure: boolean;
  sameSite: 'strict' | 'lax' | 'none';
}

const DEFAULT_CONFIG: CSRFConfig = {
  tokenLength: 32,
  tokenExpiry: 60 * 60 * 1000, // 1 hour
  cookieName: 'csrf_token',
  headerName: 'X-CSRF-Token',
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
};

// ============================================
// TOKEN STORAGE
// ============================================

interface TokenEntry {
  token: string;
  createdAt: number;
  userId?: string;
}

class CSRFTokenStore {
  private tokens: Map<string, TokenEntry> = new Map();
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;
  
  constructor() {
    // Clean up expired tokens every 5 minutes
    this.cleanupInterval = setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }
  
  set(sessionId: string, entry: TokenEntry): void {
    this.tokens.set(sessionId, entry);
  }
  
  get(sessionId: string): TokenEntry | undefined {
    return this.tokens.get(sessionId);
  }
  
  delete(sessionId: string): void {
    this.tokens.delete(sessionId);
  }
  
  private cleanup(): void {
    const now = Date.now();
    const expiry = DEFAULT_CONFIG.tokenExpiry;
    
    for (const [key, entry] of this.tokens.entries()) {
      if (now - entry.createdAt > expiry) {
        this.tokens.delete(key);
      }
    }
  }
  
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.tokens.clear();
  }
}

let tokenStore: CSRFTokenStore | null = null;

function getTokenStore(): CSRFTokenStore {
  if (!tokenStore) {
    tokenStore = new CSRFTokenStore();
  }
  return tokenStore;
}

// ============================================
// TOKEN GENERATION
// ============================================

/**
 * Generate a cryptographically secure random token
 */
export function generateCSRFToken(length: number = DEFAULT_CONFIG.tokenLength): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Generate and store a CSRF token for a session
 */
export function createCSRFToken(sessionId: string, userId?: string): string {
  const token = generateCSRFToken();
  
  getTokenStore().set(sessionId, {
    token,
    createdAt: Date.now(),
    userId,
  });
  
  return token;
}

/**
 * Get or create CSRF token for session
 */
export function getOrCreateCSRFToken(sessionId: string, userId?: string): string {
  const existing = getTokenStore().get(sessionId);
  
  if (existing && Date.now() - existing.createdAt < DEFAULT_CONFIG.tokenExpiry) {
    return existing.token;
  }
  
  return createCSRFToken(sessionId, userId);
}

// ============================================
// TOKEN VALIDATION
// ============================================

export interface CSRFValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validate a CSRF token
 */
export function validateCSRFToken(
  sessionId: string,
  token: string,
  userId?: string
): CSRFValidationResult {
  if (!token) {
    return { valid: false, error: 'CSRF token missing' };
  }
  
  const entry = getTokenStore().get(sessionId);
  
  if (!entry) {
    return { valid: false, error: 'Session not found' };
  }
  
  // Check expiry
  if (Date.now() - entry.createdAt > DEFAULT_CONFIG.tokenExpiry) {
    getTokenStore().delete(sessionId);
    return { valid: false, error: 'CSRF token expired' };
  }
  
  // Constant-time comparison to prevent timing attacks
  if (!constantTimeCompare(entry.token, token)) {
    auditSecurityViolation('CSRF_VIOLATION', {
      sessionId,
      userId,
      providedToken: token.slice(0, 8) + '...',
    }, userId);
    
    return { valid: false, error: 'Invalid CSRF token' };
  }
  
  // Optional: Check user ID matches
  if (userId && entry.userId && entry.userId !== userId) {
    auditSecurityViolation('CSRF_VIOLATION', {
      sessionId,
      expectedUserId: entry.userId,
      providedUserId: userId,
    }, userId);
    
    return { valid: false, error: 'User mismatch' };
  }
  
  return { valid: true };
}

/**
 * Constant-time string comparison to prevent timing attacks
 */
function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  
  return result === 0;
}

// ============================================
// COOKIE HELPERS
// ============================================

/**
 * Generate CSRF cookie options
 */
export function getCSRFCookieOptions(config: Partial<CSRFConfig> = {}): string {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  
  const options = [
    `${cfg.cookieName}`,
    `Path=/`,
    `SameSite=${cfg.sameSite}`,
  ];
  
  if (cfg.secure) {
    options.push('Secure');
  }
  
  options.push('HttpOnly');
  
  return options.join('; ');
}

/**
 * Set CSRF token in cookie (for server-side use)
 */
export function setCSRFCookie(token: string, config: Partial<CSRFConfig> = {}): string {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const maxAge = Math.floor(cfg.tokenExpiry / 1000);
  
  return `${cfg.cookieName}=${token}; Path=/; Max-Age=${maxAge}; SameSite=${cfg.sameSite}${cfg.secure ? '; Secure' : ''}; HttpOnly`;
}

/**
 * Parse CSRF token from cookie string
 */
export function parseCSRFCookie(cookieString: string, config: Partial<CSRFConfig> = {}): string | null {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const cookies = cookieString.split(';').map(c => c.trim());
  
  for (const cookie of cookies) {
    const [name, value] = cookie.split('=');
    if (name === cfg.cookieName) {
      return value;
    }
  }
  
  return null;
}

// ============================================
// REACT INTEGRATION
// ============================================

/**
 * Get CSRF token from meta tag (for SPA)
 */
export function getCSRFTokenFromMeta(): string | null {
  if (typeof document === 'undefined') return null;
  
  const meta = document.querySelector('meta[name="csrf-token"]');
  return meta?.getAttribute('content') || null;
}

/**
 * Get CSRF token from localStorage
 */
export function getCSRFTokenFromStorage(): string | null {
  if (typeof localStorage === 'undefined') return null;
  return localStorage.getItem('csrf_token');
}

/**
 * Store CSRF token in localStorage
 */
export function storeCSRFToken(token: string): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem('csrf_token', token);
}

/**
 * Clear CSRF token from localStorage
 */
export function clearCSRFToken(): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.removeItem('csrf_token');
}

// ============================================
// FETCH WRAPPER WITH CSRF
// ============================================

/**
 * Create headers with CSRF token
 */
export function createCSRFHeaders(
  existingHeaders: HeadersInit = {},
  config: Partial<CSRFConfig> = {}
): Headers {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const headers = new Headers(existingHeaders);
  
  const token = getCSRFTokenFromStorage() || getCSRFTokenFromMeta();
  if (token) {
    headers.set(cfg.headerName, token);
  }
  
  return headers;
}

/**
 * Fetch wrapper that automatically includes CSRF token
 */
export async function csrfFetch(
  url: string,
  options: RequestInit = {},
  config: Partial<CSRFConfig> = {}
): Promise<Response> {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  
  // Only add CSRF for state-changing methods
  const method = options.method?.toUpperCase() || 'GET';
  const needsCSRF = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);
  
  if (needsCSRF) {
    const headers = createCSRFHeaders(options.headers, cfg);
    options.headers = headers;
  }
  
  return fetch(url, options);
}

// ============================================
// DOUBLE SUBMIT COOKIE PATTERN
// ============================================

/**
 * Generate double submit tokens (cookie + header must match)
 */
export function generateDoubleSubmitTokens(): { cookie: string; header: string } {
  const token = generateCSRFToken();
  return { cookie: token, header: token };
}

/**
 * Validate double submit tokens
 */
export function validateDoubleSubmit(cookieToken: string, headerToken: string): boolean {
  if (!cookieToken || !headerToken) {
    return false;
  }
  
  return constantTimeCompare(cookieToken, headerToken);
}

// ============================================
// SYNCHRONIZER TOKEN PATTERN (for forms)
// ============================================

/**
 * Generate a hidden input field with CSRF token
 */
export function generateCSRFInput(token: string): string {
  const encodedToken = token.replace(/"/g, '&quot;');
  return `<input type="hidden" name="_csrf" value="${encodedToken}" />`;
}

/**
 * React component props for CSRF input
 */
export function getCSRFInputProps(token: string): { type: 'hidden'; name: string; value: string } {
  return {
    type: 'hidden',
    name: '_csrf',
    value: token,
  };
}

// ============================================
// ORIGIN VALIDATION
// ============================================

/**
 * Validate request origin
 */
export function validateOrigin(
  origin: string | null,
  allowedOrigins: string[]
): boolean {
  if (!origin) {
    return false;
  }
  
  return allowedOrigins.some(allowed => {
    if (allowed === '*') return true;
    if (allowed === origin) return true;
    
    // Support wildcard subdomains
    if (allowed.startsWith('*.')) {
      const domain = allowed.slice(2);
      return origin.endsWith(domain) || origin.endsWith('.' + domain);
    }
    
    return false;
  });
}

/**
 * Validate referer header
 */
export function validateReferer(
  referer: string | null,
  allowedOrigins: string[]
): boolean {
  if (!referer) {
    return false;
  }
  
  try {
    const url = new URL(referer);
    return validateOrigin(url.origin, allowedOrigins);
  } catch {
    return false;
  }
}
