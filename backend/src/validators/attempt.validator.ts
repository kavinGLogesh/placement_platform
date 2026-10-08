import { AppError } from '../middleware/errorHandler.js';
import {
  SaveAnswerDto,
  BatchSyncAnswersDto,
  RecordViolationDto,
  AttemptViolationType,
} from '../types/attempt.types.js';

export const validateStartAttempt = (assessmentId: unknown): string => {
  if (!assessmentId || typeof assessmentId !== 'string' || assessmentId.trim().length === 0) {
    throw new AppError('Assessment ID is required', 400);
  }
  return assessmentId.trim();
};

export const validateSaveAnswer = (body: unknown): SaveAnswerDto => {
  if (!body || typeof body !== 'object') {
    throw new AppError('Invalid answer payload', 400);
  }

  const { questionId, selectedOptionIds, textAnswer, isMarkedForReview, currentQuestion, version, clientTimestamp } = body as Record<string, unknown>;

  if (!questionId || typeof questionId !== 'string' || questionId.trim().length === 0) {
    throw new AppError('Question ID is required', 400);
  }

  if (selectedOptionIds !== undefined && selectedOptionIds !== null) {
    if (!Array.isArray(selectedOptionIds)) {
      throw new AppError('selectedOptionIds must be an array of option ID strings', 400);
    }
    for (const optId of selectedOptionIds) {
      if (typeof optId !== 'string') {
        throw new AppError('All items in selectedOptionIds must be strings', 400);
      }
    }
  }

  if (textAnswer !== undefined && textAnswer !== null && typeof textAnswer !== 'string') {
    throw new AppError('textAnswer must be a string', 400);
  }

  if (isMarkedForReview !== undefined && typeof isMarkedForReview !== 'boolean') {
    throw new AppError('isMarkedForReview must be a boolean', 400);
  }

  if (currentQuestion !== undefined && (typeof currentQuestion !== 'number' || currentQuestion < 1)) {
    throw new AppError('currentQuestion must be a positive integer', 400);
  }

  return {
    questionId: questionId.trim(),
    selectedOptionIds: (selectedOptionIds as string[]) || null,
    textAnswer: (textAnswer as string) || null,
    isMarkedForReview: Boolean(isMarkedForReview),
    currentQuestion: currentQuestion ? Number(currentQuestion) : undefined,
    version: typeof version === 'number' ? version : 1,
    clientTimestamp: typeof clientTimestamp === 'string' ? clientTimestamp : undefined,
  };
};

export const validateBatchSyncAnswers = (body: unknown): BatchSyncAnswersDto => {
  if (!body || typeof body !== 'object') {
    throw new AppError('Invalid sync payload', 400);
  }

  const { answers, currentQuestion } = body as Record<string, unknown>;

  if (!Array.isArray(answers)) {
    throw new AppError('answers must be an array of answers', 400);
  }

  const validatedAnswers: SaveAnswerDto[] = answers.map((a, idx) => {
    try {
      return validateSaveAnswer(a);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid answer format';
      throw new AppError(`Answer at index ${idx} is invalid: ${msg}`, 400);
    }
  });

  return {
    answers: validatedAnswers,
    currentQuestion: typeof currentQuestion === 'number' && currentQuestion >= 1 ? currentQuestion : undefined,
  };
};

const VALID_VIOLATION_TYPES = ['TAB_SWITCH', 'WINDOW_BLUR', 'FULLSCREEN_EXIT', 'SCREENSHOT_ATTEMPT'] as const;

export const validateRecordViolation = (body: unknown): RecordViolationDto => {
  if (!body || typeof body !== 'object') {
    throw new AppError('Invalid violation payload', 400);
  }

  const { violationType, details, clientTimestamp } = body as Record<string, unknown>;

  if (!violationType || typeof violationType !== 'string' || !VALID_VIOLATION_TYPES.includes(violationType as any)) {
    throw new AppError(
      `violationType must be one of: ${VALID_VIOLATION_TYPES.join(', ')}`,
      400
    );
  }

  if (details !== undefined && details !== null && typeof details !== 'string') {
    throw new AppError('details must be a string if provided', 400);
  }

  return {
    violationType: violationType as AttemptViolationType,
    details: details ? (details as string).trim() : undefined,
    clientTimestamp: typeof clientTimestamp === 'string' ? clientTimestamp : undefined,
  };
};

