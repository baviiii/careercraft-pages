/**
 * Audit Logging - Enterprise-grade security audit trail
 * Tracks security events, user actions, and suspicious activity
 */

// ============================================
// TYPES
// ============================================

export type AuditEventType = 
  | 'AUTH_LOGIN'
  | 'AUTH_LOGOUT'
  | 'AUTH_FAILED'
  | 'AUTH_PASSWORD_CHANGE'
  | 'AUTH_PASSWORD_RESET'
  | 'AUTH_MFA_ENABLED'
  | 'AUTH_MFA_DISABLED'
  | 'USER_CREATED'
  | 'USER_UPDATED'
  | 'USER_DELETED'
  | 'DATA_ACCESS'
  | 'DATA_EXPORT'
  | 'DATA_DELETE'
  | 'FILE_UPLOAD'
  | 'FILE_DOWNLOAD'
  | 'FILE_DELETE'
  | 'API_CALL'
  | 'API_ERROR'
  | 'RATE_LIMIT_EXCEEDED'
  | 'SECURITY_VIOLATION'
  | 'XSS_ATTEMPT'
  | 'SQL_INJECTION_ATTEMPT'
  | 'CSRF_VIOLATION'
  | 'SUSPICIOUS_ACTIVITY'
  | 'PERMISSION_DENIED'
  | 'SESSION_CREATED'
  | 'SESSION_EXPIRED'
  | 'SETTINGS_CHANGED';

export type AuditSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface AuditEvent {
  id: string;
  timestamp: string;
  type: AuditEventType;
  severity: AuditSeverity;
  userId?: string;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
  action: string;
  resource?: string;
  resourceId?: string;
  details?: Record<string, unknown>;
  success: boolean;
  errorMessage?: string;
  metadata?: Record<string, unknown>;
}

export interface AuditLogConfig {
  enabled: boolean;
  consoleLog: boolean;
  remoteLog: boolean;
  remoteEndpoint?: string;
  batchSize: number;
  flushIntervalMs: number;
  maxQueueSize: number;
  sensitiveFields: string[];
}

// ============================================
// DEFAULT CONFIGURATION
// ============================================

const DEFAULT_CONFIG: AuditLogConfig = {
  enabled: true,
  consoleLog: process.env.NODE_ENV === 'development',
  remoteLog: process.env.NODE_ENV === 'production',
  batchSize: 10,
  flushIntervalMs: 30000, // 30 seconds
  maxQueueSize: 1000,
  sensitiveFields: ['password', 'token', 'secret', 'apiKey', 'creditCard', 'ssn'],
};

// ============================================
// SEVERITY MAPPING
// ============================================

const EVENT_SEVERITY: Record<AuditEventType, AuditSeverity> = {
  AUTH_LOGIN: 'LOW',
  AUTH_LOGOUT: 'LOW',
  AUTH_FAILED: 'MEDIUM',
  AUTH_PASSWORD_CHANGE: 'MEDIUM',
  AUTH_PASSWORD_RESET: 'MEDIUM',
  AUTH_MFA_ENABLED: 'LOW',
  AUTH_MFA_DISABLED: 'MEDIUM',
  USER_CREATED: 'LOW',
  USER_UPDATED: 'LOW',
  USER_DELETED: 'HIGH',
  DATA_ACCESS: 'LOW',
  DATA_EXPORT: 'MEDIUM',
  DATA_DELETE: 'HIGH',
  FILE_UPLOAD: 'LOW',
  FILE_DOWNLOAD: 'LOW',
  FILE_DELETE: 'MEDIUM',
  API_CALL: 'LOW',
  API_ERROR: 'MEDIUM',
  RATE_LIMIT_EXCEEDED: 'MEDIUM',
  SECURITY_VIOLATION: 'CRITICAL',
  XSS_ATTEMPT: 'CRITICAL',
  SQL_INJECTION_ATTEMPT: 'CRITICAL',
  CSRF_VIOLATION: 'HIGH',
  SUSPICIOUS_ACTIVITY: 'HIGH',
  PERMISSION_DENIED: 'MEDIUM',
  SESSION_CREATED: 'LOW',
  SESSION_EXPIRED: 'LOW',
  SETTINGS_CHANGED: 'LOW',
};

// ============================================
// AUDIT LOGGER CLASS
// ============================================

class AuditLogger {
  private config: AuditLogConfig;
  private queue: AuditEvent[] = [];
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  
  constructor(config: Partial<AuditLogConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    if (this.config.enabled && this.config.remoteLog) {
      this.startFlushTimer();
    }
  }
  
  /**
   * Log an audit event
   */
  log(event: Omit<AuditEvent, 'id' | 'timestamp' | 'severity'>): void {
    if (!this.config.enabled) return;
    
    const fullEvent: AuditEvent = {
      ...event,
      id: this.generateId(),
      timestamp: new Date().toISOString(),
      severity: EVENT_SEVERITY[event.type] || 'LOW',
      details: this.sanitizeDetails(event.details),
    };
    
    // Console logging in development
    if (this.config.consoleLog) {
      this.consoleLog(fullEvent);
    }
    
    // Queue for remote logging
    if (this.config.remoteLog) {
      this.queueEvent(fullEvent);
    }
    
    // Immediate flush for critical events
    if (fullEvent.severity === 'CRITICAL') {
      this.flush();
    }
  }
  
  /**
   * Log a security violation
   */
  logSecurityViolation(
    type: 'XSS_ATTEMPT' | 'SQL_INJECTION_ATTEMPT' | 'CSRF_VIOLATION' | 'SECURITY_VIOLATION',
    details: Record<string, unknown>,
    userId?: string
  ): void {
    this.log({
      type,
      action: `Security violation detected: ${type}`,
      userId,
      details,
      success: false,
      errorMessage: 'Security violation blocked',
    });
  }
  
  /**
   * Log an authentication event
   */
  logAuth(
    type: 'AUTH_LOGIN' | 'AUTH_LOGOUT' | 'AUTH_FAILED',
    userId: string | undefined,
    success: boolean,
    details?: Record<string, unknown>
  ): void {
    this.log({
      type,
      action: type.replace('AUTH_', '').toLowerCase(),
      userId,
      success,
      details,
    });
  }
  
  /**
   * Log a data access event
   */
  logDataAccess(
    resource: string,
    resourceId: string,
    action: 'read' | 'write' | 'delete',
    userId?: string
  ): void {
    this.log({
      type: action === 'delete' ? 'DATA_DELETE' : 'DATA_ACCESS',
      action: `${action} ${resource}`,
      resource,
      resourceId,
      userId,
      success: true,
    });
  }
  
  /**
   * Log a file operation
   */
  logFileOperation(
    operation: 'upload' | 'download' | 'delete',
    filename: string,
    userId?: string,
    success: boolean = true,
    error?: string
  ): void {
    const typeMap = {
      upload: 'FILE_UPLOAD' as const,
      download: 'FILE_DOWNLOAD' as const,
      delete: 'FILE_DELETE' as const,
    };
    
    this.log({
      type: typeMap[operation],
      action: `${operation} file: ${filename}`,
      resource: 'file',
      resourceId: filename,
      userId,
      success,
      errorMessage: error,
    });
  }
  
  /**
   * Log rate limit exceeded
   */
  logRateLimitExceeded(
    endpoint: string,
    userId?: string,
    ipAddress?: string
  ): void {
    this.log({
      type: 'RATE_LIMIT_EXCEEDED',
      action: `Rate limit exceeded for ${endpoint}`,
      resource: endpoint,
      userId,
      ipAddress,
      success: false,
    });
  }
  
  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  /**
   * Sanitize sensitive data from details
   */
  private sanitizeDetails(details?: Record<string, unknown>): Record<string, unknown> | undefined {
    if (!details) return undefined;
    
    const sanitized: Record<string, unknown> = {};
    
    for (const [key, value] of Object.entries(details)) {
      if (this.config.sensitiveFields.some(f => key.toLowerCase().includes(f.toLowerCase()))) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeDetails(value as Record<string, unknown>);
      } else {
        sanitized[key] = value;
      }
    }
    
    return sanitized;
  }
  
  /**
   * Console log with formatting
   */
  private consoleLog(event: AuditEvent): void {
    const severityColors: Record<AuditSeverity, string> = {
      LOW: '\x1b[32m',      // Green
      MEDIUM: '\x1b[33m',   // Yellow
      HIGH: '\x1b[31m',     // Red
      CRITICAL: '\x1b[35m', // Magenta
    };
    
    const reset = '\x1b[0m';
    const color = severityColors[event.severity];
    
    console.log(
      `${color}[AUDIT ${event.severity}]${reset} ${event.timestamp} - ${event.type}: ${event.action}`,
      event.details ? JSON.stringify(event.details) : ''
    );
  }
  
  /**
   * Queue event for batch sending
   */
  private queueEvent(event: AuditEvent): void {
    if (this.queue.length >= this.config.maxQueueSize) {
      // Remove oldest events if queue is full
      this.queue.shift();
    }
    
    this.queue.push(event);
    
    if (this.queue.length >= this.config.batchSize) {
      this.flush();
    }
  }
  
  /**
   * Start flush timer
   */
  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.config.flushIntervalMs);
  }
  
  /**
   * Flush queued events to remote endpoint
   */
  async flush(): Promise<void> {
    if (this.queue.length === 0) return;
    if (!this.config.remoteEndpoint) return;
    
    const events = [...this.queue];
    this.queue = [];
    
    try {
      await fetch(this.config.remoteEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ events }),
      });
    } catch (error) {
      // Re-queue events on failure
      this.queue = [...events, ...this.queue].slice(0, this.config.maxQueueSize);
      console.error('Failed to send audit logs:', error);
    }
  }
  
  /**
   * Get recent events (for debugging)
   */
  getRecentEvents(count: number = 100): AuditEvent[] {
    return this.queue.slice(-count);
  }
  
  /**
   * Destroy the logger
   */
  destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    this.flush();
  }
}

// ============================================
// SINGLETON INSTANCE
// ============================================

let auditLoggerInstance: AuditLogger | null = null;

export function getAuditLogger(config?: Partial<AuditLogConfig>): AuditLogger {
  if (!auditLoggerInstance) {
    auditLoggerInstance = new AuditLogger(config);
  }
  return auditLoggerInstance;
}

// ============================================
// CONVENIENCE FUNCTIONS
// ============================================

export function auditLog(event: Omit<AuditEvent, 'id' | 'timestamp' | 'severity'>): void {
  getAuditLogger().log(event);
}

export function auditSecurityViolation(
  type: 'XSS_ATTEMPT' | 'SQL_INJECTION_ATTEMPT' | 'CSRF_VIOLATION' | 'SECURITY_VIOLATION',
  details: Record<string, unknown>,
  userId?: string
): void {
  getAuditLogger().logSecurityViolation(type, details, userId);
}

export function auditAuth(
  type: 'AUTH_LOGIN' | 'AUTH_LOGOUT' | 'AUTH_FAILED',
  userId: string | undefined,
  success: boolean,
  details?: Record<string, unknown>
): void {
  getAuditLogger().logAuth(type, userId, success, details);
}

export function auditDataAccess(
  resource: string,
  resourceId: string,
  action: 'read' | 'write' | 'delete',
  userId?: string
): void {
  getAuditLogger().logDataAccess(resource, resourceId, action, userId);
}

export function auditFileOperation(
  operation: 'upload' | 'download' | 'delete',
  filename: string,
  userId?: string,
  success: boolean = true,
  error?: string
): void {
  getAuditLogger().logFileOperation(operation, filename, userId, success, error);
}

export function auditRateLimitExceeded(
  endpoint: string,
  userId?: string,
  ipAddress?: string
): void {
  getAuditLogger().logRateLimitExceeded(endpoint, userId, ipAddress);
}
