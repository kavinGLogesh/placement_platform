import { SUPPORTED_LANGUAGES, SupportedLanguage } from '../types/coding.types';
import { AppError } from '../middleware/errorHandler';

export const MAX_SOURCE_CODE_BYTES = 65536; // 64 KB

export class CodingValidationError extends AppError {
  constructor(message: string, statusCode: number = 400, details?: any) {
    super(message, statusCode, details);
    this.name = 'CodingValidationError';
  }
}

export function validateExecutionPayload(payload: any): {
  language: SupportedLanguage;
  sourceCode: string;
} {
  if (!payload || typeof payload !== 'object') {
    throw new CodingValidationError('Request body must be a valid JSON object');
  }

  const { language, sourceCode } = payload;

  if (!language || typeof language !== 'string') {
    throw new CodingValidationError('A valid programming language is required');
  }

  const normalizedLang = language.trim().toLowerCase() as SupportedLanguage;

  if (!SUPPORTED_LANGUAGES.includes(normalizedLang)) {
    throw new CodingValidationError(
      `Unsupported language "${language}". Permitted languages are: ${SUPPORTED_LANGUAGES.join(', ')}`,
      400
    );
  }

  if (sourceCode === undefined || sourceCode === null || typeof sourceCode !== 'string') {
    throw new CodingValidationError('Source code must be provided as a string');
  }

  if (sourceCode.trim().length === 0) {
    throw new CodingValidationError('Source code cannot be empty');
  }

  const byteLength = Buffer.byteLength(sourceCode, 'utf8');
  if (byteLength > MAX_SOURCE_CODE_BYTES) {
    throw new CodingValidationError(
      `Source code size (${byteLength} bytes) exceeds the maximum allowed limit of ${MAX_SOURCE_CODE_BYTES} bytes (64 KB)`,
      400
    );
  }

  return {
    language: normalizedLang,
    sourceCode,
  };
}

export function validateAttemptAndQuestionParams(attemptId: string, questionId: string): void {
  if (!attemptId || typeof attemptId !== 'string' || attemptId.trim().length === 0) {
    throw new CodingValidationError('Valid attempt ID is required', 400);
  }
  if (!questionId || typeof questionId !== 'string' || questionId.trim().length === 0) {
    throw new CodingValidationError('Valid question ID is required', 400);
  }
}
