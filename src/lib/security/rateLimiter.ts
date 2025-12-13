/**
 * Rate Limiter - Client-side rate limiting for API protection
 * Prevents abuse and protects against DoS attacks
 */

// ============================================
// TYPES
// ============================================

export interface RateLimitConfig {
  maxRequests: number;      // Maximum requests allowed
  windowMs: number;         // Time window in milliseconds
  blockDurationMs?: number; // How long to block after limit exceeded
  keyPrefix?: string;       // Prefix for storage keys
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
}

interface RateLimitEntry {
  count: number;
  windowStart: number;
  blocked?: boolean;
  blockedUntil?: number;
}

// ============================================
// DEFAULT CONFIGURATIONS
// ============================================

export const RATE_LIMITS = {
  // API calls - 100 requests per minute
  API: {
    maxRequests: 100,
    windowMs: 60 * 1000,
    blockDurationMs: 5 * 60 * 1000, // 5 min block
  },
  // Auth attempts - 5 per minute
  AUTH: {
    maxRequests: 5,
    windowMs: 60 * 1000,
    blockDurationMs: 15 * 60 * 1000, // 15 min block
  },
  // File uploads - 10 per minute
  UPLOAD: {
    maxRequests: 10,
    windowMs: 60 * 1000,
    blockDurationMs: 5 * 60 * 1000,
  },
  // AI/expensive operations - 20 per minute
  AI: {
    maxRequests: 20,
    windowMs: 60 * 1000,
    blockDurationMs: 2 * 60 * 1000,
  },
  // Search - 30 per minute
  SEARCH: {
    maxRequests: 30,
    windowMs: 60 * 1000,
    blockDurationMs: 60 * 1000,
  },
  // Form submissions - 10 per minute
  FORM: {
    maxRequests: 10,
    windowMs: 60 * 1000,
    blockDurationMs: 5 * 60 * 1000,
  },
} as const;

// ============================================
// RATE LIMITER CLASS
// ============================================

class RateLimiter {
  private storage: Map<string, RateLimitEntry> = new Map();
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;
  
  constructor() {
    // Clean up expired entries every minute
    this.cleanupInterval = setInterval(() => this.cleanup(), 60 * 1000);
  }
  
  /**
   * Check if a request is allowed
   */
  check(key: string, config: RateLimitConfig): RateLimitResult {
    const now = Date.now();
    const fullKey = config.keyPrefix ? `${config.keyPrefix}:${key}` : key;
    
    let entry = this.storage.get(fullKey);
    
    // Check if blocked
    if (entry?.blocked && entry.blockedUntil && entry.blockedUntil > now) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: entry.blockedUntil,
        retryAfter: Math.ceil((entry.blockedUntil - now) / 1000),
      };
    }
    
    // Reset if window expired
    if (!entry || now - entry.windowStart >= config.windowMs) {
      entry = {
        count: 0,
        windowStart: now,
        blocked: false,
      };
    }
    
    // Increment count
    entry.count++;
    
    // Check if limit exceeded
    if (entry.count > config.maxRequests) {
      if (config.blockDurationMs) {
        entry.blocked = true;
        entry.blockedUntil = now + config.blockDurationMs;
      }
      
      this.storage.set(fullKey, entry);
      
      return {
        allowed: false,
        remaining: 0,
        resetTime: entry.blockedUntil || entry.windowStart + config.windowMs,
        retryAfter: Math.ceil(
          ((entry.blockedUntil || entry.windowStart + config.windowMs) - now) / 1000
        ),
      };
    }
    
    this.storage.set(fullKey, entry);
    
    return {
      allowed: true,
      remaining: config.maxRequests - entry.count,
      resetTime: entry.windowStart + config.windowMs,
    };
  }
  
  /**
   * Reset rate limit for a key
   */
  reset(key: string, keyPrefix?: string): void {
    const fullKey = keyPrefix ? `${keyPrefix}:${key}` : key;
    this.storage.delete(fullKey);
  }
  
  /**
   * Get current status for a key
   */
  getStatus(key: string, config: RateLimitConfig): RateLimitResult {
    const now = Date.now();
    const fullKey = config.keyPrefix ? `${config.keyPrefix}:${key}` : key;
    const entry = this.storage.get(fullKey);
    
    if (!entry) {
      return {
        allowed: true,
        remaining: config.maxRequests,
        resetTime: now + config.windowMs,
      };
    }
    
    if (entry.blocked && entry.blockedUntil && entry.blockedUntil > now) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: entry.blockedUntil,
        retryAfter: Math.ceil((entry.blockedUntil - now) / 1000),
      };
    }
    
    if (now - entry.windowStart >= config.windowMs) {
      return {
        allowed: true,
        remaining: config.maxRequests,
        resetTime: now + config.windowMs,
      };
    }
    
    return {
      allowed: entry.count < config.maxRequests,
      remaining: Math.max(0, config.maxRequests - entry.count),
      resetTime: entry.windowStart + config.windowMs,
    };
  }
  
  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    const maxAge = 30 * 60 * 1000; // 30 minutes
    
    for (const [key, entry] of this.storage.entries()) {
      if (now - entry.windowStart > maxAge) {
        this.storage.delete(key);
      }
    }
  }
  
  /**
   * Destroy the rate limiter
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.storage.clear();
  }
}

// Singleton instance
let rateLimiterInstance: RateLimiter | null = null;

function getRateLimiter(): RateLimiter {
  if (!rateLimiterInstance) {
    rateLimiterInstance = new RateLimiter();
  }
  return rateLimiterInstance;
}

// ============================================
// PUBLIC API
// ============================================

/**
 * Check if a request is allowed under rate limits
 */
export function checkRateLimit(
  key: string,
  config: RateLimitConfig = RATE_LIMITS.API
): RateLimitResult {
  return getRateLimiter().check(key, config);
}

/**
 * Reset rate limit for a key
 */
export function resetRateLimit(key: string, keyPrefix?: string): void {
  getRateLimiter().reset(key, keyPrefix);
}

/**
 * Get current rate limit status
 */
export function getRateLimitStatus(
  key: string,
  config: RateLimitConfig = RATE_LIMITS.API
): RateLimitResult {
  return getRateLimiter().getStatus(key, config);
}

/**
 * Higher-order function to wrap async functions with rate limiting
 */
export function withRateLimit<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  key: string,
  config: RateLimitConfig = RATE_LIMITS.API
): T {
  return (async (...args: Parameters<T>) => {
    const result = checkRateLimit(key, config);
    
    if (!result.allowed) {
      throw new RateLimitError(
        `Rate limit exceeded. Try again in ${result.retryAfter} seconds.`,
        result
      );
    }
    
    return fn(...args);
  }) as T;
}

/**
 * Rate limit error class
 */
export class RateLimitError extends Error {
  public readonly rateLimitResult: RateLimitResult;
  
  constructor(message: string, result: RateLimitResult) {
    super(message);
    this.name = 'RateLimitError';
    this.rateLimitResult = result;
  }
}

// ============================================
// REACT HOOK
// ============================================

/**
 * React hook for rate limiting
 * Usage: const { checkLimit, isLimited, remaining } = useRateLimit('api-call', RATE_LIMITS.API);
 */
export function createRateLimitHook(key: string, config: RateLimitConfig = RATE_LIMITS.API) {
  return {
    checkLimit: () => checkRateLimit(key, config),
    getStatus: () => getRateLimitStatus(key, config),
    reset: () => resetRateLimit(key, config.keyPrefix),
  };
}

// ============================================
// SLIDING WINDOW RATE LIMITER (More accurate)
// ============================================

class SlidingWindowRateLimiter {
  private requests: Map<string, number[]> = new Map();
  
  check(key: string, config: RateLimitConfig): RateLimitResult {
    const now = Date.now();
    const windowStart = now - config.windowMs;
    
    // Get existing requests and filter to current window
    let timestamps = this.requests.get(key) || [];
    timestamps = timestamps.filter(t => t > windowStart);
    
    // Check if limit exceeded
    if (timestamps.length >= config.maxRequests) {
      const oldestInWindow = Math.min(...timestamps);
      const resetTime = oldestInWindow + config.windowMs;
      
      return {
        allowed: false,
        remaining: 0,
        resetTime,
        retryAfter: Math.ceil((resetTime - now) / 1000),
      };
    }
    
    // Add current request
    timestamps.push(now);
    this.requests.set(key, timestamps);
    
    return {
      allowed: true,
      remaining: config.maxRequests - timestamps.length,
      resetTime: now + config.windowMs,
    };
  }
}

let slidingWindowInstance: SlidingWindowRateLimiter | null = null;

export function checkSlidingWindowRateLimit(
  key: string,
  config: RateLimitConfig
): RateLimitResult {
  if (!slidingWindowInstance) {
    slidingWindowInstance = new SlidingWindowRateLimiter();
  }
  return slidingWindowInstance.check(key, config);
}
