import { Request, Response, NextFunction } from 'express';
import { attemptService, AttemptService } from '../services/attempt.service.js';
import { managementRepository } from '../repositories/management.repository.js';
import { userRepository } from '../repositories/user.repository.js';
import {
  validateStartAttempt,
  validateSaveAnswer,
  validateBatchSyncAnswers,
  validateRecordViolation,
} from '../validators/attempt.validator.js';
import { sendSuccess } from '../utils/response.util.js';
import { AppError } from '../middleware/errorHandler.js';
import { StudentTestStatus } from '../types/attempt.types.js';

export const resolveStudentId = async (req: Request): Promise<string> => {
  if (!req.user) {
    throw new AppError('User not authenticated', 401);
  }
  if ((req.user as any).studentId) {
    return (req.user as any).studentId;
  }
  const email = req.user.email;
  if (email) {
    const student = await managementRepository.findStudentByEmail(email);
    if (student) return student.id;

    const user = await userRepository.findByEmail(email);
    if (user?.student) return user.student.id;
  }
  return req.user.sub;
};

export class AttemptController {
  constructor(private readonly service: AttemptService = attemptService) {}

  // GET /api/student/tests
  getStudentTests = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const studentId = await resolveStudentId(req);
      const filter = req.query.status as StudentTestStatus | undefined;
      const tests = await this.service.getStudentTests(studentId, filter);
      sendSuccess(res, 'Student tests retrieved successfully', tests);
    } catch (err) {
      next(err);
    }
  };

  // POST /api/student/assessments/:assessmentId/start
  startAssessment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const studentId = await resolveStudentId(req);
      const assessmentId = validateStartAttempt(req.params.assessmentId);
      const attempt = await this.service.startAssessment(studentId, assessmentId);
      sendSuccess(res, 'Assessment attempt started successfully', attempt, 201);
    } catch (err) {
      next(err);
    }
  };

  // GET /api/attempts/:attemptId or /api/student/attempts/:attemptId
  getAttempt = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const studentId = await resolveStudentId(req);
      const attemptId = String(req.params.attemptId);
      const attempt = await this.service.getAttempt(studentId, attemptId);
      sendSuccess(res, 'Attempt details retrieved successfully', attempt);
    } catch (err) {
      next(err);
    }
  };

  // POST /api/attempts/:attemptId/answers or /api/student/attempts/:attemptId/answers
  saveAnswer = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const studentId = await resolveStudentId(req);
      const attemptId = String(req.params.attemptId);

      // Handle batch sync or single save
      if (req.body && Array.isArray(req.body.answers)) {
        const batchDto = validateBatchSyncAnswers(req.body);
        const result = await this.service.batchSyncAnswers(studentId, attemptId, batchDto);
        sendSuccess(res, 'Answers synchronized successfully', result);
      } else {
        const singleDto = validateSaveAnswer(req.body);
        const saved = await this.service.saveAnswer(studentId, attemptId, singleDto);
        sendSuccess(res, 'Answer saved successfully', saved);
      }
    } catch (err) {
      next(err);
    }
  };

  // POST /api/attempts/:attemptId/submit or /api/student/attempts/:attemptId/submit
  submitAttempt = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const studentId = await resolveStudentId(req);
      const attemptId = String(req.params.attemptId);
      const result = await this.service.submitAttempt(studentId, attemptId);
      sendSuccess(res, 'Assessment submitted successfully', result);
    } catch (err) {
      next(err);
    }
  };

  // GET /api/student/results
  getStudentResults = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const studentId = await resolveStudentId(req);
      const results = await this.service.getStudentResults(studentId);
      sendSuccess(res, 'Student results retrieved successfully', results);
    } catch (err) {
      next(err);
    }
  };

  // GET /api/student/results/:id
  getResultDetail = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const studentId = await resolveStudentId(req);
      const resultId = String(req.params.id);
      const result = await this.service.getResultDetail(studentId, resultId);
      sendSuccess(res, 'Result details retrieved successfully', result);
    } catch (err) {
      next(err);
    }
  };

  // POST /api/attempts/:attemptId/violations or /api/student/attempts/:attemptId/violations
  recordViolation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const studentId = await resolveStudentId(req);
      const attemptId = String(req.params.attemptId);
      const dto = validateRecordViolation(req.body);
      const result = await this.service.recordViolation(studentId, attemptId, dto);
      sendSuccess(res, 'Integrity violation recorded successfully', result, 201);
    } catch (err) {
      next(err);
    }
  };

  // GET /api/attempts/:attemptId/violations or /api/student/attempts/:attemptId/violations
  getViolations = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const studentId = await resolveStudentId(req);
      const attemptId = String(req.params.attemptId);
      const violations = await this.service.getViolations(studentId, attemptId);
      sendSuccess(res, 'Attempt violations retrieved successfully', violations);
    } catch (err) {
      next(err);
    }
  };
}

export const attemptController = new AttemptController();
