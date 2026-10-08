
import { Router } from 'express';
import multer from 'multer';
import { questionController } from '../controllers/question.controller.js';
import { authenticateToken, requireRole } from '../middleware/auth.middleware.js';
import { Role } from '../types/auth.types.js';
import {
  validateCreateQuestion,
  validateUpdateQuestion,
  validateQuestionQuery,
} from '../validators/question.validator.js';

import { AppError } from '../middleware/errorHandler.js';

import { verifyAccessToken } from '../utils/jwt.util.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit for bulk documents, images, and spreadsheets
  fileFilter: (_req, file, cb) => {
    const ext = file.originalname.split('.').pop()?.toLowerCase() || '';
    const allowed = ['pdf', 'docx', 'doc', 'xlsx', 'xls', 'csv', 'xml', 'png', 'jpg', 'jpeg', 'webp', 'txt'];
    if (
      allowed.includes(ext) ||
      file.mimetype.startsWith('image/') ||
      file.mimetype.includes('pdf') ||
      file.mimetype.includes('sheet') ||
      file.mimetype.includes('word') ||
      file.mimetype.includes('csv') ||
      file.mimetype.includes('xml')
    ) {
      cb(null, true);
    } else {
      cb(new AppError(`Unsupported file format '.${ext}'. Supported formats: PDF, DOCX, XLSX, CSV, XML, JPG, JPEG, PNG.`, 400));
    }
  },
});

export const questionRouter = Router();

/**
 * Middleware: Authenticates question diagram image access.
 * Accepts JWT in Authorization header or 'token' query param.
 * Grants access to PLACEMENT_ADMIN, SUPER_ADMIN, and enrolled STUDENTS.
 */
const authenticateImageAccess = (req: any, _res: any, next: any) => {
  let token: string | undefined;

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (typeof req.query.token === 'string' && req.query.token.trim()) {
    token = req.query.token.trim();
  }

  if (!token) {
    return next(new AppError('Unauthorized: Authentication required to view question diagram', 401));
  }

  try {
    const payload = verifyAccessToken(token);
    req.user = payload;
    if (
      payload.role !== Role.PLACEMENT_ADMIN &&
      payload.role !== Role.STUDENT &&
      payload.role !== Role.SUPER_ADMIN
    ) {
      return next(new AppError('Forbidden: Unauthorized role for viewing question visuals', 403));
    }
    next();
  } catch {
    return next(new AppError('Unauthorized: Invalid or expired access token', 401));
  }
};

// 1. Secure Image Serving (Accessible to Admins and Students with valid token)
questionRouter.get('/images/:filename', authenticateImageAccess, questionController.serveImage);

// 2. Question bank management routes are strictly restricted to operational PLACEMENT_ADMIN
questionRouter.use(authenticateToken);
questionRouter.use(requireRole(Role.PLACEMENT_ADMIN));

// Diagram / Image Upload for Admin Question Bank
questionRouter.post('/upload-image', upload.single('image'), questionController.uploadImage);

// AI-powered document analysis and question extraction (Gemini multimodal)
questionRouter.post('/ai-analyze', upload.single('file'), questionController.aiAnalyzeDocument);

// Bulk question creation
questionRouter.post('/bulk', questionController.bulkCreateQuestions);

// Category-Topics master dictionary lookup
questionRouter.get('/categories', questionController.getCategories);

// AI-powered classification routes (placed before /:id)
questionRouter.post('/ai/detect', questionController.autoDetectClassification);
questionRouter.post('/ai/batch-classify', questionController.batchClassifyQuestions);
questionRouter.get('/ai/needs-review', questionController.getQuestionsNeedingReview);

// Core Question Bank CRUD
questionRouter.post('/', validateCreateQuestion, questionController.createQuestion);
questionRouter.get('/', validateQuestionQuery, questionController.getQuestions);
questionRouter.get('/:id', questionController.getQuestionById);
questionRouter.put('/:id', validateUpdateQuestion, questionController.updateQuestion);
questionRouter.patch('/:id/status', questionController.updateQuestionStatus);
questionRouter.delete('/:id', questionController.deleteQuestion);

// AI Single Question Classification & Admin Review
questionRouter.post('/:id/classify', questionController.classifyQuestion);
questionRouter.post('/:id/review-classification', questionController.reviewClassification);

// Question Usage Tracking (Phase 5 preparation)
questionRouter.post('/:id/usage', questionController.recordQuestionUsage);

