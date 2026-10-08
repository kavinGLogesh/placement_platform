import { Request, Response, NextFunction } from 'express';
import { AppError } from '../middleware/errorHandler.js';
import {
  CATEGORY_TOPICS_MAP,
  QuestionCategory,
  QuestionDifficulty,
  QuestionType,
  QuestionStatus,
  CreateQuestionDto,
  UpdateQuestionDto,
  CreateQuestionOptionDto,
} from '../types/question.types.js';

const VALID_CATEGORIES = Object.keys(CATEGORY_TOPICS_MAP) as QuestionCategory[];
const VALID_DIFFICULTIES: QuestionDifficulty[] = ['EASY', 'MEDIUM', 'HARD'];
const VALID_QUESTION_TYPES: QuestionType[] = [
  'SINGLE_CHOICE',
  'MULTIPLE_CHOICE',
  'TRUE_FALSE',
  'FILL_BLANK',
  'DESCRIPTIVE',
];
const VALID_STATUSES: QuestionStatus[] = ['DRAFT', 'ACTIVE', 'INACTIVE', 'ARCHIVED'];
const VALID_SORT_FIELDS = ['createdAt', 'marks', 'difficulty', 'questionType', 'category'];

export function validateImageUrl(imageUrl?: string | null): void {
  if (!imageUrl) return;
  if (typeof imageUrl !== 'string') {
    throw new AppError('imageUrl must be a valid string', 400);
  }
  const trimmed = imageUrl.trim().toLowerCase();
  if (trimmed.startsWith('javascript:') || trimmed.startsWith('vbscript:') || trimmed.startsWith('data:text/html')) {
    throw new AppError('Invalid or disallowed image URL format', 400);
  }
}

export function validateCategoryTopic(category: QuestionCategory, topic: string): void {
  if (!VALID_CATEGORIES.includes(category)) {
    throw new AppError(`Invalid question category: '${category}'. Must be one of: ${VALID_CATEGORIES.join(', ')}`, 400);
  }

  const allowedTopics = CATEGORY_TOPICS_MAP[category];
  const matchedTopic = allowedTopics.find((t) => t.toLowerCase() === topic.trim().toLowerCase());

  if (!matchedTopic) {
    throw new AppError(
      `Invalid topic '${topic}' for category '${category}'. Allowed topics: ${allowedTopics.join(', ')}`,
      400
    );
  }
}

export function validateQuestionOptions(
  questionType: QuestionType,
  options?: CreateQuestionOptionDto[],
  correctAnswer?: string | null
): void {
  switch (questionType) {
    case 'SINGLE_CHOICE': {
      if (!options || options.length < 2) {
        throw new AppError('SINGLE_CHOICE questions require at least 2 options', 400);
      }
      const correctCount = options.filter((o) => o.isCorrect).length;
      if (correctCount !== 1) {
        throw new AppError(`SINGLE_CHOICE questions must have exactly 1 correct option (found ${correctCount})`, 400);
      }
      validateOptionListIntegrity(options);
      break;
    }
    case 'MULTIPLE_CHOICE': {
      if (!options || options.length < 2) {
        throw new AppError('MULTIPLE_CHOICE questions require at least 2 options', 400);
      }
      const correctCount = options.filter((o) => o.isCorrect).length;
      if (correctCount < 1) {
        throw new AppError('MULTIPLE_CHOICE questions must have at least 1 correct option', 400);
      }
      validateOptionListIntegrity(options);
      break;
    }
    case 'TRUE_FALSE': {
      if (!options || options.length !== 2) {
        throw new AppError('TRUE_FALSE questions must have exactly 2 options ("True" and "False")', 400);
      }
      const texts = options.map((o) => o.optionText.trim().toLowerCase());
      if (!texts.includes('true') || !texts.includes('false')) {
        throw new AppError('TRUE_FALSE options must be "True" and "False"', 400);
      }
      const correctCount = options.filter((o) => o.isCorrect).length;
      if (correctCount !== 1) {
        throw new AppError('TRUE_FALSE questions must have exactly 1 correct option', 400);
      }
      validateOptionListIntegrity(options);
      break;
    }
    case 'FILL_BLANK': {
      if (options && options.length > 0) {
        throw new AppError('FILL_BLANK questions must not have options', 400);
      }
      if (!correctAnswer || !correctAnswer.trim()) {
        throw new AppError('FILL_BLANK questions require a non-empty correctAnswer', 400);
      }
      break;
    }
    case 'DESCRIPTIVE': {
      if (options && options.length > 0) {
        throw new AppError('DESCRIPTIVE questions must not have options', 400);
      }
      break;
    }
  }
}

function validateOptionListIntegrity(options: CreateQuestionOptionDto[]): void {
  const seenOrders = new Set<number>();
  const seenTexts = new Set<string>();

  for (const opt of options) {
    if (!opt.optionText || !opt.optionText.trim()) {
      throw new AppError('All options must have non-empty optionText', 400);
    }
    if (typeof opt.optionOrder !== 'number' || opt.optionOrder < 1) {
      throw new AppError('Option order must be a positive integer', 400);
    }
    if (seenOrders.has(opt.optionOrder)) {
      throw new AppError(`Duplicate option order ${opt.optionOrder} detected`, 400);
    }
    seenOrders.add(opt.optionOrder);

    const normText = opt.optionText.trim().toLowerCase();
    if (seenTexts.has(normText)) {
      throw new AppError(`Duplicate option text detected: '${opt.optionText}'`, 400);
    }
    seenTexts.add(normText);
  }
}

export const validateCreateQuestion = (req: Request, _res: Response, next: NextFunction): void => {
  try {
    const body = req.body as CreateQuestionDto;

    if (body.companyId && typeof body.companyId !== 'string') {
      throw new AppError('companyId must be a valid string', 400);
    }

    if (!body.category) throw new AppError('Question category is required', 400);
    if (!body.topic) throw new AppError('Question topic is required', 400);
    if (!body.questionText || !body.questionText.trim()) {
      throw new AppError('Question text is required', 400);
    }

    validateCategoryTopic(body.category, body.topic);

    const qType = body.questionType || 'SINGLE_CHOICE';
    if (!VALID_QUESTION_TYPES.includes(qType)) {
      throw new AppError(`Invalid questionType '${qType}'. Allowed: ${VALID_QUESTION_TYPES.join(', ')}`, 400);
    }

    const difficulty = body.difficulty || 'MEDIUM';
    if (!VALID_DIFFICULTIES.includes(difficulty)) {
      throw new AppError(`Invalid difficulty '${difficulty}'. Allowed: ${VALID_DIFFICULTIES.join(', ')}`, 400);
    }

    if (body.marks !== undefined) {
      if (typeof body.marks !== 'number' || body.marks <= 0) {
        throw new AppError('Marks must be a positive number greater than 0', 400);
      }
    }

    if (body.negativeMarks !== undefined) {
      if (typeof body.negativeMarks !== 'number' || body.negativeMarks < 0) {
        throw new AppError('Negative marks cannot be negative', 400);
      }
      const marks = body.marks ?? 1.0;
      if (body.negativeMarks > marks) {
        throw new AppError('Negative marks cannot exceed total marks', 400);
      }
    }

    if (body.status !== undefined && !VALID_STATUSES.includes(body.status)) {
      throw new AppError(`Invalid status '${body.status}'. Allowed: ${VALID_STATUSES.join(', ')}`, 400);
    }

    validateImageUrl(body.imageUrl);
    validateQuestionOptions(qType, body.options, body.correctAnswer);

    next();
  } catch (error) {
    next(error);
  }
};

export const validateUpdateQuestion = (req: Request, _res: Response, next: NextFunction): void => {
  try {
    const body = req.body as UpdateQuestionDto;

    if (body.imageUrl !== undefined) {
      validateImageUrl(body.imageUrl);
    }

    if (body.category && body.topic) {
      validateCategoryTopic(body.category, body.topic);
    }

    if (body.questionType && !VALID_QUESTION_TYPES.includes(body.questionType)) {
      throw new AppError(`Invalid questionType '${body.questionType}'. Allowed: ${VALID_QUESTION_TYPES.join(', ')}`, 400);
    }

    if (body.difficulty && !VALID_DIFFICULTIES.includes(body.difficulty)) {
      throw new AppError(`Invalid difficulty '${body.difficulty}'. Allowed: ${VALID_DIFFICULTIES.join(', ')}`, 400);
    }

    if (body.marks !== undefined) {
      if (typeof body.marks !== 'number' || body.marks <= 0) {
        throw new AppError('Marks must be a positive number greater than 0', 400);
      }
    }

    if (body.negativeMarks !== undefined) {
      if (typeof body.negativeMarks !== 'number' || body.negativeMarks < 0) {
        throw new AppError('Negative marks cannot be negative', 400);
      }
    }

    if (body.status && !VALID_STATUSES.includes(body.status)) {
      throw new AppError(`Invalid status '${body.status}'. Allowed: ${VALID_STATUSES.join(', ')}`, 400);
    }

    if (body.questionType && body.options) {
      validateQuestionOptions(body.questionType, body.options, body.correctAnswer);
    }

    next();
  } catch (error) {
    next(error);
  }
};

export const validateQuestionQuery = (req: Request, _res: Response, next: NextFunction): void => {
  try {
    const { page, limit, sortBy, sortOrder, category, difficulty, questionType, status, aiStatus } = req.query;

    if (page && (isNaN(Number(page)) || Number(page) < 1)) {
      throw new AppError('Page must be a positive integer >= 1', 400);
    }

    if (limit && (isNaN(Number(limit)) || Number(limit) < 1 || Number(limit) > 100)) {
      throw new AppError('Limit must be an integer between 1 and 100', 400);
    }

    if (sortBy && !VALID_SORT_FIELDS.includes(String(sortBy))) {
      throw new AppError(`Invalid sortBy field. Allowed: ${VALID_SORT_FIELDS.join(', ')}`, 400);
    }

    if (sortOrder && !['asc', 'desc'].includes(String(sortOrder).toLowerCase())) {
      throw new AppError("Invalid sortOrder. Allowed: 'asc' or 'desc'", 400);
    }

    if (category && !VALID_CATEGORIES.includes(category as QuestionCategory)) {
      throw new AppError(`Invalid category filter '${category}'`, 400);
    }

    if (difficulty && !VALID_DIFFICULTIES.includes(difficulty as QuestionDifficulty)) {
      throw new AppError(`Invalid difficulty filter '${difficulty}'`, 400);
    }

    if (questionType && !VALID_QUESTION_TYPES.includes(questionType as QuestionType)) {
      throw new AppError(`Invalid questionType filter '${questionType}'`, 400);
    }

    if (status && !VALID_STATUSES.includes(status as QuestionStatus)) {
      throw new AppError(`Invalid status filter '${status}'`, 400);
    }

    const VALID_AI_STATUSES = ['AI_PENDING', 'CLASSIFIED', 'NEEDS_REVIEW', 'AI_FAILED'];
    if (aiStatus && !VALID_AI_STATUSES.includes(String(aiStatus))) {
      throw new AppError(`Invalid aiStatus filter '${aiStatus}'. Allowed: ${VALID_AI_STATUSES.join(', ')}`, 400);
    }

    next();
  } catch (error) {
    next(error);
  }
};
