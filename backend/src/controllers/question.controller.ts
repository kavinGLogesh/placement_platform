import fs from 'fs';
import path from 'path';
import { Request, Response, NextFunction } from 'express';
import { QuestionService, questionService } from '../services/question.service.js';
import { geminiQuestionParserService } from '../services/gemini-question-parser.service.js';
import { sendSuccess } from '../utils/response.util.js';
import { QuestionQueryFilters, QuestionStatus } from '../types/question.types.js';
import { AppError } from '../middleware/errorHandler.js';
import {
  validateImageMagicBytes,
  generateSafeImageFilename,
  getSafeFilePath,
  QUESTIONS_UPLOAD_DIR,
} from '../utils/file-security.util.js';

export class QuestionController {
  constructor(private readonly service: QuestionService = questionService) {}

  createQuestion = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const createdById = req.user?.sub;
      const question = await this.service.createQuestion(req.body, createdById);
      sendSuccess(res, 'Question created successfully', question, 201);
    } catch (error) {
      next(error);
    }
  };

  getQuestions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const filters: QuestionQueryFilters = {
        page: req.query.page ? Number(req.query.page) : undefined,
        limit: req.query.limit ? Number(req.query.limit) : undefined,
        search: req.query.search ? String(req.query.search) : undefined,
        companyId: req.query.companyId ? String(req.query.companyId) : undefined,
        category: req.query.category as QuestionQueryFilters['category'],
        topic: req.query.topic ? String(req.query.topic) : undefined,
        difficulty: req.query.difficulty as QuestionQueryFilters['difficulty'],
        questionType: req.query.questionType as QuestionQueryFilters['questionType'],
        status: req.query.status as QuestionQueryFilters['status'],
        aiStatus: req.query.aiStatus as QuestionQueryFilters['aiStatus'],
        sortBy: req.query.sortBy as QuestionQueryFilters['sortBy'],
        sortOrder: req.query.sortOrder as QuestionQueryFilters['sortOrder'],
      };

      const result = await this.service.getQuestions(filters);
      sendSuccess(res, 'Questions retrieved successfully', result);
    } catch (error) {
      next(error);
    }
  };

  getQuestionById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = String(req.params.id);
      const question = await this.service.getQuestionById(id);
      sendSuccess(res, 'Question details retrieved', question);
    } catch (error) {
      next(error);
    }
  };

  updateQuestion = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = String(req.params.id);
      const question = await this.service.updateQuestion(id, req.body);
      sendSuccess(res, 'Question updated successfully', question);
    } catch (error) {
      next(error);
    }
  };

  updateQuestionStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = String(req.params.id);
      const { status } = req.body as { status?: QuestionStatus };
      if (!status) {
        throw new AppError("Field 'status' is required", 400);
      }
      const question = await this.service.updateQuestionStatus(id, status);
      sendSuccess(res, 'Question status updated successfully', question);
    } catch (error) {
      next(error);
    }
  };

  deleteQuestion = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = String(req.params.id);
      await this.service.deleteQuestion(id);
      sendSuccess(res, 'Question deleted successfully');
    } catch (error) {
      next(error);
    }
  };

  recordQuestionUsage = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = String(req.params.id);
      const { assessmentId, studentId, usageMonth, usageYear } = req.body;
      const usage = await this.service.recordQuestionUsage({
        questionId: id,
        assessmentId,
        studentId,
        usageMonth: Number(usageMonth) || new Date().getMonth() + 1,
        usageYear: Number(usageYear) || new Date().getFullYear(),
      });
      sendSuccess(res, 'Question usage recorded successfully', usage, 201);
    } catch (error) {
      next(error);
    }
  };

  bulkCreateQuestions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { questions } = req.body;
      if (!Array.isArray(questions) || questions.length === 0) {
        throw new AppError('Questions array is required and must not be empty', 400);
      }
      const createdById = req.user?.sub;
      const result = await this.service.bulkCreateQuestions(questions, createdById);
      sendSuccess(res, `Bulk questions processed: ${result.created.length} created, ${result.failed.length} failed.`, result, 201);
    } catch (error) {
      next(error);
    }
  };

  aiAnalyzeDocument = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const apiKey = req.body.apiKey || (req.headers['x-gemini-key'] as string);
      const text = req.body.text;
      const targetCompanyId = req.body.companyId;
      const file = req.file;

      if (!file && (!text || !text.trim())) {
        throw new AppError('Please select a file (PDF, DOCX, XLSX, CSV, JPG, PNG) or provide question text for analysis', 400);
      }

      const result = await geminiQuestionParserService.analyzeDocument({
        file,
        text,
        apiKey,
        targetCompanyId,
      });

      sendSuccess(res, `AI extraction completed: ${result.totalParsed} questions parsed`, result);
    } catch (error) {
      next(error);
    }
  };

  getCategories = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const map = this.service.getCategoryTopicsMap();
      sendSuccess(res, 'Category-topics mapping retrieved', map);
    } catch (error) {
      next(error);
    }
  };

  // ===========================================================================
  // AI INTELLIGENT CLASSIFICATION ENDPOINTS
  // ===========================================================================

  classifyQuestion = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = String(req.params.id);
      const result = await this.service.classifyQuestion(id);
      sendSuccess(res, 'Question classified successfully by AI', result);
    } catch (error) {
      next(error);
    }
  };

  autoDetectClassification = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.autoDetectClassification(req.body);
      sendSuccess(res, 'AI classification generated successfully', result);
    } catch (error) {
      next(error);
    }
  };

  batchClassifyQuestions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { questionIds } = req.body;
      const result = await this.service.batchClassifyQuestions(questionIds);
      sendSuccess(res, `Batch classification completed: ${result.classified} classified, ${result.needsReview} needs review, ${result.failed} failed.`, result);
    } catch (error) {
      next(error);
    }
  };

  reviewClassification = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = String(req.params.id);
      const adminId = req.user?.sub || 'admin';
      const result = await this.service.reviewClassification(id, req.body, adminId);
      sendSuccess(res, 'Classification review applied successfully', result);
    } catch (error) {
      next(error);
    }
  };

  getQuestionsNeedingReview = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const page = req.query.page ? Number(req.query.page) : 1;
      const limit = req.query.limit ? Number(req.query.limit) : 10;
      const result = await this.service.getQuestionsNeedingReview(page, limit);
      sendSuccess(res, 'Questions needing review retrieved successfully', result);
    } catch (error) {
      next(error);
    }
  };

  uploadImage = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const file = req.file;
      if (!file) {
        throw new AppError('No image file provided for upload', 400);
      }

      // 5MB limit validation
      if (file.size > 5 * 1024 * 1024) {
        throw new AppError('Image size exceeds the maximum limit of 5MB', 400);
      }

      // Buffer-level Magic Bytes validation
      const validation = validateImageMagicBytes(file.buffer);
      if (!validation.isValid) {
        throw new AppError(
          'Security check failed: File must be a valid PNG, JPG, JPEG, or WebP image.',
          400
        );
      }

      const safeFilename = generateSafeImageFilename(validation.ext);
      const filePath = path.resolve(QUESTIONS_UPLOAD_DIR, safeFilename);

      await fs.promises.writeFile(filePath, file.buffer);

      const imageUrl = `/api/questions/images/${safeFilename}`;
      sendSuccess(
        res,
        'Diagram image uploaded successfully',
        { imageUrl, filename: safeFilename },
        201
      );
    } catch (error) {
      next(error);
    }
  };

  serveImage = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const filename = String(req.params.filename);
      const filePath = getSafeFilePath(filename);

      if (!fs.existsSync(filePath)) {
        throw new AppError('Question diagram not found', 404);
      }

      const ext = path.extname(filename).toLowerCase().replace('.', '');
      let contentType = 'image/png';
      if (ext === 'jpg' || ext === 'jpeg') contentType = 'image/jpeg';
      else if (ext === 'webp') contentType = 'image/webp';

      res.setHeader('Content-Type', contentType);
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Content-Security-Policy', "default-src 'none'");
      res.setHeader('Cache-Control', 'private, max-age=86400');

      const stream = fs.createReadStream(filePath);
      stream.pipe(res);
    } catch (error) {
      next(error);
    }
  };
}

export const questionController = new QuestionController();
