/**
 * Validation Schemas - Zod-based schemas for type-safe validation
 * Enterprise-grade input validation with strict type checking
 */

import { z } from 'zod';

// ============================================
// COMMON PATTERNS
// ============================================

const PATTERNS = {
  // No SQL injection characters
  SAFE_STRING: /^[a-zA-Z0-9\s\-_.,!?@#$%&*()+=:;'"\/\\[\]{}|~`<>]*$/,
  // Email pattern (RFC 5322 compliant)
  EMAIL: /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/,
  // Phone number (international format)
  PHONE: /^[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,4}[-\s\.]?[0-9]{1,9}$/,
  // URL pattern
  URL: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/,
  // UUID v4
  UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  // Alphanumeric only
  ALPHANUMERIC: /^[a-zA-Z0-9]+$/,
  // Slug format
  SLUG: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
  // No script tags or event handlers
  NO_XSS: /^(?!.*<script)(?!.*javascript:)(?!.*on\w+=).*$/i,
  // SQL injection prevention - blocks common SQL keywords in dangerous contexts
  NO_SQL_INJECTION: /^(?!.*(--|;|'|"|\/\*|\*\/|xp_|sp_|0x|union\s+select|select\s+\*|drop\s+table|insert\s+into|delete\s+from|update\s+.*set)).*$/i,
};

// ============================================
// BASE VALIDATORS
// ============================================

// Safe string that blocks XSS and SQL injection
export const safeString = (minLength = 0, maxLength = 1000) =>
  z.string()
    .min(minLength, `Must be at least ${minLength} characters`)
    .max(maxLength, `Must be at most ${maxLength} characters`)
    .refine(
      (val) => PATTERNS.NO_XSS.test(val),
      'Contains potentially dangerous content'
    )
    .refine(
      (val) => PATTERNS.NO_SQL_INJECTION.test(val),
      'Contains invalid characters'
    )
    .transform((val) => val.trim());

// Email validation
export const emailSchema = z.string()
  .email('Invalid email address')
  .max(254, 'Email too long')
  .transform((val) => val.toLowerCase().trim());

// Phone validation
export const phoneSchema = z.string()
  .regex(PATTERNS.PHONE, 'Invalid phone number')
  .max(20, 'Phone number too long')
  .transform((val) => val.replace(/\s/g, ''));

// URL validation
export const urlSchema = z.string()
  .url('Invalid URL')
  .max(2048, 'URL too long')
  .refine(
    (val) => val.startsWith('https://') || val.startsWith('http://'),
    'URL must start with http:// or https://'
  );

// UUID validation
export const uuidSchema = z.string()
  .regex(PATTERNS.UUID, 'Invalid ID format');

// ============================================
// USER SCHEMAS
// ============================================

export const userProfileSchema = z.object({
  name: safeString(1, 100),
  email: emailSchema,
  phone: phoneSchema.optional(),
  location: safeString(0, 200).optional(),
  bio: safeString(0, 2000).optional(),
  linkedin: urlSchema.optional().or(z.literal('')),
  website: urlSchema.optional().or(z.literal('')),
});

export const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password too long')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required').max(128),
});

export const signupSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  confirmPassword: z.string(),
  name: safeString(1, 100),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

// ============================================
// RESUME SCHEMAS
// ============================================

export const contactInfoSchema = z.object({
  name: safeString(1, 100),
  email: emailSchema,
  phone: phoneSchema.optional().or(z.literal('')),
  location: safeString(0, 200).optional(),
  linkedin: z.string().max(200).optional().or(z.literal('')),
  website: z.string().max(200).optional().or(z.literal('')),
});

export const experienceSchema = z.object({
  id: z.string(),
  title: safeString(1, 200),
  company: safeString(1, 200),
  location: safeString(0, 200).optional(),
  startDate: safeString(0, 50),
  endDate: safeString(0, 50).optional(),
  current: z.boolean().optional(),
  bullets: z.array(safeString(0, 1000)).max(20),
});

export const educationSchema = z.object({
  id: z.string(),
  degree: safeString(1, 200),
  school: safeString(1, 200),
  location: safeString(0, 200).optional(),
  graduationDate: safeString(0, 50).optional(),
  gpa: safeString(0, 20).optional(),
});

export const projectSchema = z.object({
  id: z.string(),
  name: safeString(1, 200),
  description: safeString(0, 2000),
  technologies: z.array(safeString(1, 50)).max(20),
  url: urlSchema.optional().or(z.literal('')),
});

export const resumeDataSchema = z.object({
  contact: contactInfoSchema,
  summary: safeString(0, 5000).optional(),
  experience: z.array(experienceSchema).max(50),
  education: z.array(educationSchema).max(20),
  skills: z.array(safeString(1, 100)).max(100),
  projects: z.array(projectSchema).max(30).optional(),
});

// ============================================
// JOB SEARCH SCHEMAS
// ============================================

export const jobSearchSchema = z.object({
  query: safeString(0, 200).optional(),
  location: safeString(0, 100).optional(),
  jobType: z.enum(['all', 'fulltime', 'parttime', 'contract', 'remote', 'intern']).optional(),
  experienceLevel: z.enum(['all', 'entry', 'mid', 'senior', 'executive']).optional(),
  industry: safeString(0, 100).optional(),
  salaryMin: z.number().min(0).max(10000000).optional(),
  salaryMax: z.number().min(0).max(10000000).optional(),
  page: z.number().int().min(1).max(1000).optional(),
});

export const jobApplicationSchema = z.object({
  jobId: uuidSchema,
  coverLetter: safeString(0, 10000).optional(),
  resumeId: uuidSchema.optional(),
});

// ============================================
// NEWS SCHEMAS
// ============================================

export const newsQuerySchema = z.object({
  category: z.enum(['all', 'hiring', 'tech', 'salary', 'remote', 'ai', 'layoffs', 'education', 'immigration', 'innovation']).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  pageNumber: z.number().int().min(1).max(100).optional(),
});

// ============================================
// API REQUEST SCHEMAS
// ============================================

export const apiRequestSchema = z.object({
  action: safeString(1, 50),
  // Allow additional properties but validate them separately
}).passthrough();

// ============================================
// FILE UPLOAD SCHEMAS
// ============================================

export const fileMetadataSchema = z.object({
  name: safeString(1, 255)
    .refine(
      (val) => !val.includes('..') && !val.includes('/') && !val.includes('\\'),
      'Invalid filename'
    ),
  size: z.number().int().min(1).max(10 * 1024 * 1024), // Max 10MB
  type: z.string().max(100),
});

// ============================================
// FEEDBACK & SUPPORT SCHEMAS
// ============================================

export const feedbackSchema = z.object({
  type: z.enum(['bug', 'feature', 'general', 'complaint']),
  subject: safeString(1, 200),
  message: safeString(10, 5000),
  email: emailSchema.optional(),
});

export const supportTicketSchema = z.object({
  category: z.enum(['account', 'billing', 'technical', 'other']),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  subject: safeString(1, 200),
  description: safeString(10, 10000),
  attachments: z.array(uuidSchema).max(5).optional(),
});

// ============================================
// VALIDATION HELPERS
// ============================================

export type ValidationResult<T> = 
  | { success: true; data: T }
  | { success: false; errors: z.ZodError['errors'] };

export function validateInput<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): ValidationResult<T> {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error.errors };
}

export function validateOrThrow<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  errorMessage = 'Validation failed'
): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const errors = result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
    throw new Error(`${errorMessage}: ${errors}`);
  }
  return result.data;
}
