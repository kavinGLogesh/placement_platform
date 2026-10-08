import { QuestionRepository, questionRepository } from '../repositories/question.repository.js';
import { aiClassificationService } from './ai/ai-classification.service.js';
import {
  QuestionDto,
  CreateQuestionDto,
  UpdateQuestionDto,
  QuestionQueryFilters,
  QuestionUsageDto,
  CreateQuestionUsageDto,
  QuestionStatus,
  CATEGORY_TOPICS_MAP,
  AiClassifyQuestionInput,
  AiClassifyResult,
  AdminReviewClassificationDto,
  BatchClassifyResult,
} from '../types/question.types.js';
import { PaginatedResult } from '../types/management.types.js';
import { AppError } from '../middleware/errorHandler.js';
import { validateCategoryTopic, validateQuestionOptions } from '../validators/question.validator.js';

export class QuestionService {
  constructor(private readonly repository: QuestionRepository = questionRepository) {}

  async createQuestion(payload: CreateQuestionDto, createdById?: string): Promise<QuestionDto> {
    validateCategoryTopic(payload.category, payload.topic);
    validateQuestionOptions(payload.questionType || 'SINGLE_CHOICE', payload.options, payload.correctAnswer);
    const created = await this.repository.createQuestion(payload, createdById);

    // Auto-classify asynchronously if requested, without blocking question creation
    if (payload.autoClassify) {
      this.classifyQuestion(created.id).catch(() => {
        // Safe asynchronous classification
      });
    }

    return created;
  }

  async getQuestions(filters: QuestionQueryFilters = {}): Promise<PaginatedResult<QuestionDto>> {
    return this.repository.findQuestions(filters);
  }

  async getQuestionById(id: string): Promise<QuestionDto> {
    const question = await this.repository.findQuestionById(id);
    if (!question) {
      throw new AppError('Question not found', 404);
    }
    return question;
  }

  async updateQuestion(id: string, payload: UpdateQuestionDto): Promise<QuestionDto> {
    const existing = await this.getQuestionById(id);

    const category = payload.category ?? existing.category;
    const topic = payload.topic ?? existing.topic;
    validateCategoryTopic(category, topic);

    const qType = payload.questionType ?? existing.questionType;
    if (payload.options !== undefined || payload.correctAnswer !== undefined) {
      validateQuestionOptions(qType, payload.options, payload.correctAnswer ?? existing.correctAnswer);
    }

    return this.repository.updateQuestion(id, payload);
  }

  async updateQuestionStatus(id: string, status: QuestionStatus): Promise<QuestionDto> {
    await this.getQuestionById(id);
    return this.repository.updateQuestionStatus(id, status);
  }

  async deleteQuestion(id: string): Promise<void> {
    await this.getQuestionById(id);
    return this.repository.deleteQuestion(id);
  }

  async recordQuestionUsage(payload: CreateQuestionUsageDto): Promise<QuestionUsageDto> {
    await this.getQuestionById(payload.questionId);
    return this.repository.recordQuestionUsage(payload);
  }

  async bulkCreateQuestions(
    questions: CreateQuestionDto[],
    createdById?: string
  ): Promise<{ created: QuestionDto[]; failed: { index: number; reason: string }[] }> {
    const created: QuestionDto[] = [];
    const failed: { index: number; reason: string }[] = [];

    for (let i = 0; i < questions.length; i++) {
      try {
        const q = await this.createQuestion(questions[i], createdById);
        created.push(q);
      } catch (err: any) {
        failed.push({ index: i, reason: err.message || 'Validation error' });
      }
    }

    return { created, failed };
  }

  getCategoryTopicsMap(): typeof CATEGORY_TOPICS_MAP {
    return CATEGORY_TOPICS_MAP;
  }

  // ===========================================================================
  // AI CLASSIFICATION INTELLIGENCE
  // ===========================================================================

  /**
   * Triggers AI classification for a single existing question
   */
  async classifyQuestion(id: string): Promise<QuestionDto> {
    const question = await this.getQuestionById(id);

    const classificationResult = await aiClassificationService.classify({
      questionId: id,
      questionText: question.questionText,
      options: question.options,
      correctAnswer: question.correctAnswer,
      explanation: question.explanation,
    });

    await this.repository.upsertAiClassification(id, classificationResult);
    return this.getQuestionById(id);
  }

  /**
   * Interactive authoring assistant: classifies raw question text & options before saving
   */
  async autoDetectClassification(input: AiClassifyQuestionInput & { statement?: string }): Promise<AiClassifyResult> {
    const questionText = input.questionText || input.statement;
    if (!questionText || !questionText.trim()) {
      throw new AppError('Question text is required for AI classification', 400);
    }
    const normalizedInput: AiClassifyQuestionInput = {
      ...input,
      questionText: questionText.trim(),
      options: input.options?.map((opt: any) => ({
        optionText: opt.optionText || opt.text || '',
        isCorrect: opt.isCorrect,
      })),
    };
    return aiClassificationService.classify(normalizedInput);
  }

  /**
   * Batch classifies multiple questions with concurrency control
   */
  async batchClassifyQuestions(questionIds: string[]): Promise<BatchClassifyResult> {
    if (!Array.isArray(questionIds) || questionIds.length === 0) {
      throw new AppError('An array of question IDs is required', 400);
    }

    const inputs: Array<{ questionId: string; input: AiClassifyQuestionInput }> = [];

    for (const id of questionIds) {
      const q = await this.repository.findQuestionById(id);
      if (q) {
        inputs.push({
          questionId: id,
          input: {
            questionId: id,
            questionText: q.questionText,
            options: q.options,
            correctAnswer: q.correctAnswer,
            explanation: q.explanation,
          },
        });
      }
    }

    const batchResult = await aiClassificationService.batchClassify(inputs);

    // Save all successful/needs-review results to repository
    for (const item of batchResult.results) {
      if (item.classification) {
        await this.repository.upsertAiClassification(item.questionId, item.classification);
      }
    }

    return batchResult;
  }

  /**
   * Admin reviews, accepts, overrides, or approves classification
   */
  async reviewClassification(
    id: string,
    review: AdminReviewClassificationDto,
    adminId: string
  ): Promise<QuestionDto> {
    if (!review.action || !['APPROVE', 'ACCEPT_AI', 'ACCEPT', 'OVERRIDE', 'SEND_TO_REVIEW'].includes(review.action)) {
      throw new AppError("Review 'action' is required ('APPROVE', 'ACCEPT_AI', 'ACCEPT', 'OVERRIDE', 'SEND_TO_REVIEW')", 400);
    }

    if (review.action === 'OVERRIDE') {
      if (!review.category || !review.topic) {
        throw new AppError('Category and Topic are required when overriding classification', 400);
      }
      validateCategoryTopic(review.category, review.topic);
    }

    return this.repository.approveAiClassification(id, review, adminId);
  }

  /**
   * Returns questions flagged as NEEDS_REVIEW or AI_FAILED
   */
  async getQuestionsNeedingReview(page = 1, limit = 10): Promise<PaginatedResult<QuestionDto>> {
    return this.repository.findQuestionsNeedingReview(page, limit);
  }
}

export const questionService = new QuestionService();

