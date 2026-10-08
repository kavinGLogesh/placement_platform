import { Request, Response, NextFunction } from 'express';
import { codingService, CodingService } from '../services/coding.service';
import { resolveStudentId } from './attempt.controller';
import { sendSuccess } from '../utils/response.util';

export class CodingController {
  constructor(private readonly service: CodingService = codingService) {}

  // GET /api/attempts/:attemptId/coding/:questionId
  getCodingQuestion = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const studentId = await resolveStudentId(req);
      const attemptId = String(req.params.attemptId);
      const questionId = String(req.params.questionId);
      const question = await this.service.getCodingQuestion(studentId, attemptId, questionId);
      sendSuccess(res, 'Coding question retrieved successfully', question);
    } catch (err) {
      next(err);
    }
  };

  // POST /api/attempts/:attemptId/coding/:questionId/run
  runCode = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const studentId = await resolveStudentId(req);
      const attemptId = String(req.params.attemptId);
      const questionId = String(req.params.questionId);
      const result = await this.service.runCode(studentId, attemptId, questionId, req.body);
      sendSuccess(res, 'Code executed against sample tests', result, 200);
    } catch (err) {
      next(err);
    }
  };

  // POST /api/attempts/:attemptId/coding/:questionId/submit
  submitCode = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const studentId = await resolveStudentId(req);
      const attemptId = String(req.params.attemptId);
      const questionId = String(req.params.questionId);
      const result = await this.service.submitCode(studentId, attemptId, questionId, req.body);
      sendSuccess(res, 'Code evaluated and submitted successfully', result, 201);
    } catch (err) {
      next(err);
    }
  };

  // GET /api/attempts/:attemptId/coding/:questionId/submissions
  getSubmissions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const studentId = await resolveStudentId(req);
      const attemptId = String(req.params.attemptId);
      const questionId = String(req.params.questionId);
      const submissions = await this.service.getSubmissions(studentId, attemptId, questionId);
      sendSuccess(res, 'Coding submissions retrieved successfully', submissions);
    } catch (err) {
      next(err);
    }
  };

  // GET /api/attempts/:attemptId/coding/submissions/:submissionId
  getSubmissionDetail = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const studentId = await resolveStudentId(req);
      const attemptId = String(req.params.attemptId);
      const submissionId = String(req.params.submissionId);
      const detail = await this.service.getSubmissionDetail(studentId, attemptId, submissionId);
      sendSuccess(res, 'Coding submission details retrieved successfully', detail);
    } catch (err) {
      next(err);
    }
  };
}

export const codingController = new CodingController();
