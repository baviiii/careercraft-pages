/**
 * File Upload Security - Enterprise-grade file upload validation
 * Prevents malicious file uploads, validates file types, and scans content
 */

import { sanitizeFilename } from './sanitizers';
import { isValidFilename, isValidFileSize, isDangerousExtension } from './validators';

// ============================================
// CONFIGURATION
// ============================================

export interface FileUploadConfig {
  maxSizeMB: number;
  allowedMimeTypes: string[];
  allowedExtensions: string[];
  scanContent: boolean;
  generateSafeFilename: boolean;
}

const DEFAULT_CONFIG: FileUploadConfig = {
  maxSizeMB: 20,
  allowedMimeTypes: [
    // Images
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    // Documents
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'text/csv',
  ],
  allowedExtensions: [
    '.jpg', '.jpeg', '.png', '.gif', '.webp',
    '.pdf', '.doc', '.docx', '.txt', '.csv',
  ],
  scanContent: true,
  generateSafeFilename: true,
};

// Resume-specific config
// Security: scanContent is enabled but PDFs bypass text scanning (see scanFileContent)
// PDFs are validated by: (1) magic bytes, (2) Azure Document Intelligence sandboxing, (3) size limits
export const RESUME_UPLOAD_CONFIG: FileUploadConfig = {
  maxSizeMB: 20,
  allowedMimeTypes: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
  ],
  allowedExtensions: ['.pdf', '.doc', '.docx', '.txt'],
  scanContent: true, // Safe for PDFs - they skip text scanning (see scanFileContent docs)
  generateSafeFilename: true,
};

// Playground config — accepts career docs AND general documents (policies, reports, etc.)
// Same security pipeline: magic bytes + Azure sandboxing + size limits
export const PLAYGROUND_UPLOAD_CONFIG: FileUploadConfig = {
  maxSizeMB: 25,
  allowedMimeTypes: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'text/plain',
    'text/csv',
    'text/markdown',
    'image/jpeg',
    'image/png',
  ],
  allowedExtensions: [
    '.pdf', '.doc', '.docx', '.xlsx', '.xls',
    '.txt', '.csv', '.md',
    '.jpg', '.jpeg', '.png',
  ],
  scanContent: true,
  generateSafeFilename: true,
};

// Image-specific config
export const IMAGE_UPLOAD_CONFIG: FileUploadConfig = {
  maxSizeMB: 20,
  allowedMimeTypes: [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
  ],
  allowedExtensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
  scanContent: true,
  generateSafeFilename: true,
};

// ============================================
// FILE VALIDATION
// ============================================

export interface FileValidationResult {
  isValid: boolean;
  errors: string[];
  sanitizedFilename?: string;
  warnings?: string[];
}

/**
 * Magic bytes signatures for file type verification
 */
const FILE_SIGNATURES: Record<string, number[][]> = {
  'image/jpeg': [[0xFF, 0xD8, 0xFF]],
  'image/png': [[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]],
  'image/gif': [[0x47, 0x49, 0x46, 0x38, 0x37, 0x61], [0x47, 0x49, 0x46, 0x38, 0x39, 0x61]],
  'image/webp': [[0x52, 0x49, 0x46, 0x46]], // RIFF header
  'application/pdf': [[0x25, 0x50, 0x44, 0x46]], // %PDF
  'application/msword': [[0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1]],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': [[0x50, 0x4B, 0x03, 0x04]], // ZIP (DOCX is a ZIP)
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': [[0x50, 0x4B, 0x03, 0x04]], // ZIP (XLSX is a ZIP)
  'application/vnd.ms-excel': [[0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1]], // OLE2 compound
};

/**
 * Verify file type by checking magic bytes
 */
export async function verifyFileSignature(file: File, expectedType: string): Promise<boolean> {
  const signatures = FILE_SIGNATURES[expectedType];
  if (!signatures) return true; // No signature to check
  
  try {
    const buffer = await file.slice(0, 16).arrayBuffer();
    const bytes = new Uint8Array(buffer);
    
    return signatures.some(signature => 
      signature.every((byte, index) => bytes[index] === byte)
    );
  } catch {
    return false;
  }
}

/**
 * Scan file content for malicious patterns
 *
 * SECURITY NOTE:
 * - PDFs and binary documents are NOT scanned here - they're processed by Azure Document Intelligence
 * - Azure provides enterprise-grade security and sandboxed processing
 * - This scanner only validates text files where script injection is a real risk
 * - Binary format exploits are handled by Azure, not client-side scanning
 */
export async function scanFileContent(file: File): Promise<{ safe: boolean; threats: string[] }> {
  const threats: string[] = [];

  try {
    // ONLY scan actual text files - not binary documents like PDFs
    // PDFs are binary formats and cannot be safely scanned as text
    // They're processed securely by Azure Document Intelligence
    if (file.type.startsWith('text/') && !file.type.includes('pdf')) {
      const text = await file.text();

      // Check for script tags
      if (/<script/i.test(text)) {
        threats.push('Contains script tags');
      }

      // Check for JavaScript URLs
      if (/javascript:/i.test(text)) {
        threats.push('Contains JavaScript URLs');
      }

      // Check for event handlers
      if (/on\w+\s*=/i.test(text)) {
        threats.push('Contains event handlers');
      }

      // Check for PHP code
      if (/<\?php/i.test(text)) {
        threats.push('Contains PHP code');
      }

      // Check for shell commands
      if (/\b(eval|exec|system|shell_exec|passthru)\s*\(/i.test(text)) {
        threats.push('Contains shell commands');
      }
    }

    // For images, check for polyglot attacks
    // Images are validated by magic bytes, but also check for script injection
    if (file.type.startsWith('image/')) {
      const buffer = await file.arrayBuffer();
      const text = new TextDecoder('utf-8', { fatal: false }).decode(buffer);

      // Check for HTML/JS in image
      if (/<script|<html|<body/i.test(text)) {
        threats.push('Image contains HTML/JavaScript');
      }
    }

    // NOTE: PDFs, Word docs, and other binary formats are NOT scanned here
    // They are processed by:
    // 1. Azure Document Intelligence (secure, sandboxed OCR)
    // 2. Magic byte verification (ensures file matches declared type)
    // 3. File size limits (prevents resource exhaustion)
    // This multi-layer approach is more secure than naive text scanning

  } catch (error) {
    // If we can't scan text files, treat as potentially unsafe
    // But allow PDFs/docs to pass (they're validated elsewhere)
    if (file.type.startsWith('text/')) {
      threats.push('Unable to scan file content');
    }
  }

  return {
    safe: threats.length === 0,
    threats,
  };
}

/**
 * Generate a safe, unique filename
 */
export function generateSafeFilename(originalFilename: string): string {
  // Sanitize the filename
  const sanitized = sanitizeFilename(originalFilename);
  
  // Get extension
  const lastDot = sanitized.lastIndexOf('.');
  const ext = lastDot > 0 ? sanitized.slice(lastDot).toLowerCase() : '';
  const name = lastDot > 0 ? sanitized.slice(0, lastDot) : sanitized;
  
  // Generate unique prefix
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  
  // Create safe filename
  const safeName = name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50);
  
  return `${safeName}-${timestamp}-${random}${ext}`;
}

/**
 * Comprehensive file validation
 */
export async function validateFile(
  file: File,
  config: Partial<FileUploadConfig> = {}
): Promise<FileValidationResult> {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // 1. Check if file exists
  if (!file) {
    return { isValid: false, errors: ['No file provided'] };
  }
  
  // 2. Validate filename
  if (!isValidFilename(file.name)) {
    errors.push('Invalid filename');
  }
  
  // 3. Check for dangerous extensions
  if (isDangerousExtension(file.name)) {
    errors.push('File type not allowed for security reasons');
  }
  
  // 4. Check file extension
  const ext = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));
  if (!cfg.allowedExtensions.includes(ext)) {
    errors.push(`File extension ${ext} is not allowed. Allowed: ${cfg.allowedExtensions.join(', ')}`);
  }
  
  // 5. Check MIME type
  if (!cfg.allowedMimeTypes.includes(file.type)) {
    errors.push(`File type ${file.type} is not allowed`);
  }
  
  // 6. Check file size
  if (!isValidFileSize(file.size, cfg.maxSizeMB)) {
    errors.push(`File size exceeds ${cfg.maxSizeMB}MB limit`);
  }
  
  // 7. Verify file signature (magic bytes)
  const signatureValid = await verifyFileSignature(file, file.type);
  if (!signatureValid) {
    errors.push('File content does not match declared type');
  }
  
  // 8. Scan content for malicious patterns
  if (cfg.scanContent) {
    const scanResult = await scanFileContent(file);
    if (!scanResult.safe) {
      errors.push(...scanResult.threats.map(t => `Security threat: ${t}`));
    }
  }
  
  // Generate safe filename
  const sanitizedFilename = cfg.generateSafeFilename 
    ? generateSafeFilename(file.name)
    : sanitizeFilename(file.name);
  
  return {
    isValid: errors.length === 0,
    errors,
    sanitizedFilename,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

/**
 * Validate multiple files
 */
export async function validateFiles(
  files: File[],
  config: Partial<FileUploadConfig> = {},
  maxFiles: number = 10
): Promise<{ results: FileValidationResult[]; allValid: boolean }> {
  if (files.length > maxFiles) {
    return {
      results: [{ isValid: false, errors: [`Maximum ${maxFiles} files allowed`] }],
      allValid: false,
    };
  }
  
  const results = await Promise.all(
    files.map(file => validateFile(file, config))
  );
  
  return {
    results,
    allValid: results.every(r => r.isValid),
  };
}

// ============================================
// SECURE FILE READER
// ============================================

/**
 * Securely read file as text with size limits
 */
export async function secureReadAsText(
  file: File,
  maxSizeMB: number = 5
): Promise<{ success: boolean; content?: string; error?: string }> {
  if (file.size > maxSizeMB * 1024 * 1024) {
    return { success: false, error: `File exceeds ${maxSizeMB}MB limit` };
  }
  
  try {
    const content = await file.text();
    return { success: true, content };
  } catch (error) {
    return { success: false, error: 'Failed to read file' };
  }
}

/**
 * Securely read file as data URL with validation
 */
export async function secureReadAsDataURL(
  file: File,
  config: Partial<FileUploadConfig> = IMAGE_UPLOAD_CONFIG
): Promise<{ success: boolean; dataURL?: string; error?: string }> {
  const validation = await validateFile(file, config);
  
  if (!validation.isValid) {
    return { success: false, error: validation.errors.join(', ') };
  }
  
  return new Promise((resolve) => {
    const reader = new FileReader();
    
    reader.onload = () => {
      resolve({ success: true, dataURL: reader.result as string });
    };
    
    reader.onerror = () => {
      resolve({ success: false, error: 'Failed to read file' });
    };
    
    reader.readAsDataURL(file);
  });
}
