import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import { AppError } from '../middleware/errorHandler.js';

export const QUESTIONS_UPLOAD_DIR = path.resolve(process.cwd(), 'uploads', 'questions');

// Ensure directory exists at initialization
if (!fs.existsSync(QUESTIONS_UPLOAD_DIR)) {
  fs.mkdirSync(QUESTIONS_UPLOAD_DIR, { recursive: true });
}

export interface ValidatedImageInfo {
  isValid: boolean;
  detectedMime: string;
  ext: string;
}

/**
 * Validates image buffer using magic bytes (never trusts client MIME/extension alone).
 * Strictly allows JPG, JPEG, PNG, and WebP.
 * Blocks executable scripts, HTML, SVG, polyglots, and unsupported binaries.
 */
export function validateImageMagicBytes(buffer: Buffer): ValidatedImageInfo {
  if (!buffer || buffer.length < 12) {
    return { isValid: false, detectedMime: '', ext: '' };
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4E &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0D &&
    buffer[5] === 0x0A &&
    buffer[6] === 0x1A &&
    buffer[7] === 0x0A
  ) {
    return { isValid: true, detectedMime: 'image/png', ext: 'png' };
  }

  // JPEG / JPG: FF D8 FF
  if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
    return { isValid: true, detectedMime: 'image/jpeg', ext: 'jpg' };
  }

  // WebP: 52 49 46 46 (RIFF) .... 57 45 42 50 (WEBP)
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return { isValid: true, detectedMime: 'image/webp', ext: 'webp' };
  }

  return { isValid: false, detectedMime: '', ext: '' };
}

/**
 * Generates an unguessable, safe filename preventing directory traversal and collisions.
 */
export function generateSafeImageFilename(ext: string): string {
  const cleanExt = ext.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() || 'png';
  const randomHex = crypto.randomBytes(12).toString('hex');
  return `qimg_${Date.now()}_${randomHex}.${cleanExt}`;
}

/**
 * Verifies that a requested filename is strictly safe and stays within the uploads/questions directory.
 */
export function getSafeFilePath(filename: string): string {
  if (!filename || typeof filename !== 'string') {
    throw new AppError('Invalid filename', 400);
  }

  // Strictly enforce whitelist pattern: alphanumeric, hyphen, underscore, and dot
  if (!/^[a-zA-Z0-9_\-\.]+$/.test(filename) || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    throw new AppError('Path traversal or illegal filename detected', 400);
  }

  const resolved = path.resolve(QUESTIONS_UPLOAD_DIR, filename);

  // Strictly assert path confinement
  if (!resolved.startsWith(QUESTIONS_UPLOAD_DIR)) {
    throw new AppError('Unauthorized file access path', 403);
  }

  return resolved;
}
