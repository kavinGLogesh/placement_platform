import { Request, Response, NextFunction } from 'express';
import { evaluationService, EvaluationService } from '../services/evaluation.service.js';
import { resolveStudentId } from './attempt.controller.js';
import { sendSuccess } from '../utils/response.util.js';
import { AppError } from '../middleware/errorHandler.js';
import {
  validateCreateGdRound,
  validateUpdateGdRound,
  validateSubmitGdEvaluation,
  validateCreateInterviewRound,
  validateUpdateInterviewRound,
  validateSubmitInterviewEvaluation,
  validateAttendanceStatus,
} from '../validators/evaluation.validator.js';

export class EvaluationController {
  constructor(private readonly service: EvaluationService = evaluationService) {}

  // ===========================================================================
  // GD ROUNDS (ADMIN / EVALUATOR)
  // ===========================================================================

  createGdRound = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const validated = validateCreateGdRound(req.body);
      const creatorUserId = req.user?.sub;
      const created = await this.service.createGdRound(validated, creatorUserId);
      sendSuccess(res, 'GD round created successfully', created, 201);
    } catch (err) {
      next(err);
    }
  };

  getGdRounds = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const filters = {
        status: req.query.status ? String(req.query.status) : undefined,
        evaluatorId: req.query.evaluatorId ? String(req.query.evaluatorId) : undefined,
        departmentId: req.query.departmentId ? String(req.query.departmentId) : undefined,
      };
      const rounds = await this.service.getGdRounds(filters);
      sendSuccess(res, 'GD rounds retrieved successfully', rounds);
    } catch (err) {
      next(err);
    }
  };

  getGdRoundById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const round = await this.service.getGdRoundById(String(req.params.id));
      sendSuccess(res, 'GD round retrieved successfully', round);
    } catch (err) {
      next(err);
    }
  };

  updateGdRound = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const validated = validateUpdateGdRound(req.body);
      const updated = await this.service.updateGdRound(String(req.params.id), validated);
      sendSuccess(res, 'GD round updated successfully', updated);
    } catch (err) {
      next(err);
    }
  };

  deleteGdRound = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await this.service.deleteGdRound(String(req.params.id));
      sendSuccess(res, 'GD round deleted successfully', null);
    } catch (err) {
      next(err);
    }
  };

  assignStudentsToGd = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const studentIds = req.body.studentIds;
      if (!Array.isArray(studentIds) || studentIds.length === 0) {
        throw new AppError('studentIds must be a non-empty array of student IDs', 400);
      }
      const result = await this.service.assignStudentsToGd(String(req.params.id), studentIds);
      sendSuccess(res, `${result.assignedCount} students assigned successfully to GD round`, result);
    } catch (err) {
      next(err);
    }
  };

  removeParticipantFromGd = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await this.service.removeParticipantFromGd(String(req.params.id), String(req.params.participantId));
      sendSuccess(res, 'Participant removed from GD round successfully', null);
    } catch (err) {
      next(err);
    }
  };

  updateGdAttendance = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const attendance = validateAttendanceStatus(req.body.attendance);
      await this.service.updateGdAttendance(String(req.params.participantId), attendance);
      sendSuccess(res, 'Attendance updated successfully', { attendance });
    } catch (err) {
      next(err);
    }
  };

  batchUpdateGdAttendance = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const records = req.body.records;
      if (!Array.isArray(records) || records.length === 0) {
        throw new AppError('records must be a non-empty array of attendance records', 400);
      }
      const validated = records.map((r: any) => ({
        participantId: String(r.participantId).trim(),
        attendance: validateAttendanceStatus(r.attendance),
      }));
      await this.service.batchUpdateGdAttendance(validated);
      sendSuccess(res, 'Batch attendance updated successfully', { count: validated.length });
    } catch (err) {
      next(err);
    }
  };

  submitGdEvaluation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const round = await this.service.getGdRoundById(String(req.params.id));
      const validated = validateSubmitGdEvaluation(req.body, round.criteria);

      const evaluatorUserId = req.user?.sub || 'usr-placement-admin-001';
      const isPlacementAdmin = req.user?.role === 'PLACEMENT_ADMIN' || req.user?.role === 'SUPER_ADMIN';

      const evaluation = await this.service.evaluateGdParticipant(
        validated,
        evaluatorUserId,
        isPlacementAdmin
      );
      sendSuccess(res, 'GD evaluation recorded successfully', evaluation, 201);
    } catch (err) {
      next(err);
    }
  };

  bulkEvaluateGd = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const roundId = String(req.params.id);
      const evaluatorUserId = req.user?.sub || 'usr-placement-admin-001';
      const isPlacementAdmin = req.user?.role === 'PLACEMENT_ADMIN';

      const result = await this.service.bulkEvaluateGd(
        roundId,
        evaluatorUserId,
        isPlacementAdmin,
        req.body
      );

      const msg = result.isDraft
        ? `Bulk GD evaluation draft saved for ${result.evaluatedCount} student(s)`
        : `Bulk GD evaluations submitted successfully for ${result.evaluatedCount} student(s)`;
      sendSuccess(res, msg, result, result.isDraft ? 200 : 201);
    } catch (err) {
      next(err);
    }
  };

  // ===========================================================================
  // INTERVIEW ROUNDS (ADMIN / EVALUATOR)
  // ===========================================================================

  createInterviewRound = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const validated = validateCreateInterviewRound(req.body);
      const creatorUserId = req.user?.sub;
      const created = await this.service.createInterviewRound(validated, creatorUserId);
      sendSuccess(res, 'Interview round created successfully', created, 201);
    } catch (err) {
      next(err);
    }
  };

  getInterviewRounds = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const filters = {
        status: req.query.status ? String(req.query.status) : undefined,
        interviewType: req.query.interviewType ? String(req.query.interviewType) : undefined,
        evaluatorId: req.query.evaluatorId ? String(req.query.evaluatorId) : undefined,
        departmentId: req.query.departmentId ? String(req.query.departmentId) : undefined,
      };
      const rounds = await this.service.getInterviewRounds(filters);
      sendSuccess(res, 'Interview rounds retrieved successfully', rounds);
    } catch (err) {
      next(err);
    }
  };

  getInterviewRoundById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const round = await this.service.getInterviewRoundById(String(req.params.id));
      sendSuccess(res, 'Interview round retrieved successfully', round);
    } catch (err) {
      next(err);
    }
  };

  updateInterviewRound = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const validated = validateUpdateInterviewRound(req.body);
      const updated = await this.service.updateInterviewRound(String(req.params.id), validated);
      sendSuccess(res, 'Interview round updated successfully', updated);
    } catch (err) {
      next(err);
    }
  };

  deleteInterviewRound = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await this.service.deleteInterviewRound(String(req.params.id));
      sendSuccess(res, 'Interview round deleted successfully', null);
    } catch (err) {
      next(err);
    }
  };

  assignStudentsToInterview = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const studentIds = req.body.studentIds;
      if (!Array.isArray(studentIds) || studentIds.length === 0) {
        throw new AppError('studentIds must be a non-empty array of student IDs', 400);
      }
      const result = await this.service.assignStudentsToInterview(String(req.params.id), studentIds);
      sendSuccess(res, `${result.assignedCount} students assigned successfully to interview round`, result);
    } catch (err) {
      next(err);
    }
  };

  removeParticipantFromInterview = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await this.service.removeParticipantFromInterview(String(req.params.id), String(req.params.participantId));
      sendSuccess(res, 'Participant removed from interview round successfully', null);
    } catch (err) {
      next(err);
    }
  };

  updateInterviewAttendance = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const attendance = validateAttendanceStatus(req.body.attendance);
      await this.service.updateInterviewAttendance(String(req.params.participantId), attendance);
      sendSuccess(res, 'Attendance updated successfully', { attendance });
    } catch (err) {
      next(err);
    }
  };

  batchUpdateInterviewAttendance = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const records = req.body.records;
      if (!Array.isArray(records) || records.length === 0) {
        throw new AppError('records must be a non-empty array of attendance records', 400);
      }
      const validated = records.map((r: any) => ({
        participantId: String(r.participantId).trim(),
        attendance: validateAttendanceStatus(r.attendance),
      }));
      await this.service.batchUpdateInterviewAttendance(validated);
      sendSuccess(res, 'Batch attendance updated successfully', { count: validated.length });
    } catch (err) {
      next(err);
    }
  };

  submitInterviewEvaluation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const round = await this.service.getInterviewRoundById(String(req.params.id));
      const validated = validateSubmitInterviewEvaluation(req.body, round.criteria);

      const evaluatorUserId = req.user?.sub || 'usr-placement-admin-001';
      const isPlacementAdmin = req.user?.role === 'PLACEMENT_ADMIN' || req.user?.role === 'SUPER_ADMIN';

      const evaluation = await this.service.evaluateInterviewParticipant(
        validated,
        evaluatorUserId,
        isPlacementAdmin
      );
      sendSuccess(res, 'Interview evaluation recorded successfully', evaluation, 201);
    } catch (err) {
      next(err);
    }
  };

  bulkEvaluateInterview = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const roundId = String(req.params.id);
      const evaluatorUserId = req.user?.sub || 'usr-placement-admin-001';
      const isPlacementAdmin = req.user?.role === 'PLACEMENT_ADMIN';

      const result = await this.service.bulkEvaluateInterview(
        roundId,
        evaluatorUserId,
        isPlacementAdmin,
        req.body
      );

      const msg = result.isDraft
        ? `Bulk interview evaluation draft saved for ${result.evaluatedCount} student(s)`
        : `Bulk interview evaluations submitted successfully for ${result.evaluatedCount} student(s)`;
      sendSuccess(res, msg, result, result.isDraft ? 200 : 201);
    } catch (err) {
      next(err);
    }
  };

  // ===========================================================================
  // STUDENT PORTAL (READ-ONLY FOR OWN ENROLLED ROUNDS & EVALUATIONS)
  // ===========================================================================

  getStudentOwnGdRounds = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const studentId = await resolveStudentId(req);
      const data = await this.service.getStudentGdRounds(studentId);
      sendSuccess(res, 'Student GD rounds retrieved successfully', data);
    } catch (err) {
      next(err);
    }
  };

  getStudentOwnInterviewRounds = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const studentId = await resolveStudentId(req);
      const data = await this.service.getStudentInterviewRounds(studentId);
      sendSuccess(res, 'Student interview rounds retrieved successfully', data);
    } catch (err) {
      next(err);
    }
  };

  getStudentOwnHumanSummary = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const studentId = await resolveStudentId(req);
      const data = await this.service.getStudentHumanEvaluationSummary(studentId);
      sendSuccess(res, 'Student human evaluations summary retrieved successfully', data);
    } catch (err) {
      next(err);
    }
  };

  // ===========================================================================
  // ADMIN DRILLDOWN (STUDENT EVALUATION HISTORY)
  // ===========================================================================

  getStudentEvaluationHistoryForAdmin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const studentId = String(req.params.studentId);
      if (!studentId) {
        throw new AppError('Student ID is required', 400);
      }
      const data = await this.service.getStudentHumanEvaluationSummary(studentId);
      sendSuccess(res, 'Student evaluation history retrieved successfully', data);
    } catch (err) {
      next(err);
    }
  };
}

export const evaluationController = new EvaluationController();
