import { Router } from 'express';
import { authenticateToken, requireRole } from '../middleware/auth.middleware.js';
import { Role } from '../types/auth.types.js';
import { evaluationController } from '../controllers/evaluation.controller.js';

export const gdAdminRouter = Router();
export const interviewAdminRouter = Router();
export const studentEvaluationRouter = Router();
export const evaluationsAdminRouter = Router();

// =============================================================================
// GD ROUNDS (ADMIN & EVALUATOR)
// =============================================================================

gdAdminRouter.use(authenticateToken);

// View-only allowed for SUPER_ADMIN & PLACEMENT_ADMIN
gdAdminRouter.get(
  '/',
  requireRole(Role.SUPER_ADMIN, Role.PLACEMENT_ADMIN),
  evaluationController.getGdRounds
);

gdAdminRouter.get(
  '/:id',
  requireRole(Role.SUPER_ADMIN, Role.PLACEMENT_ADMIN),
  evaluationController.getGdRoundById
);

// Authoring & Modifications ONLY for PLACEMENT_ADMIN
gdAdminRouter.post(
  '/',
  requireRole(Role.PLACEMENT_ADMIN),
  evaluationController.createGdRound
);

gdAdminRouter.put(
  '/:id',
  requireRole(Role.PLACEMENT_ADMIN),
  evaluationController.updateGdRound
);

gdAdminRouter.delete(
  '/:id',
  requireRole(Role.PLACEMENT_ADMIN),
  evaluationController.deleteGdRound
);

gdAdminRouter.post(
  '/:id/students',
  requireRole(Role.PLACEMENT_ADMIN),
  evaluationController.assignStudentsToGd
);

gdAdminRouter.delete(
  '/:id/participants/:participantId',
  requireRole(Role.PLACEMENT_ADMIN),
  evaluationController.removeParticipantFromGd
);

gdAdminRouter.put(
  ['/:id/participants/:participantId/attendance', '/participants/:participantId/attendance'],
  requireRole(Role.PLACEMENT_ADMIN),
  evaluationController.updateGdAttendance
);

gdAdminRouter.post(
  ['/:id/attendance/batch', '/attendance/batch'],
  requireRole(Role.PLACEMENT_ADMIN),
  evaluationController.batchUpdateGdAttendance
);

gdAdminRouter.post(
  '/:id/evaluate',
  requireRole(Role.PLACEMENT_ADMIN),
  evaluationController.submitGdEvaluation
);

gdAdminRouter.post(
  '/:id/evaluations/bulk',
  requireRole(Role.PLACEMENT_ADMIN),
  evaluationController.bulkEvaluateGd
);

// =============================================================================
// INTERVIEW ROUNDS (ADMIN & EVALUATOR)
// =============================================================================

interviewAdminRouter.use(authenticateToken);

interviewAdminRouter.get(
  '/',
  requireRole(Role.SUPER_ADMIN, Role.PLACEMENT_ADMIN),
  evaluationController.getInterviewRounds
);

interviewAdminRouter.get(
  '/:id',
  requireRole(Role.SUPER_ADMIN, Role.PLACEMENT_ADMIN),
  evaluationController.getInterviewRoundById
);

interviewAdminRouter.post(
  '/',
  requireRole(Role.PLACEMENT_ADMIN),
  evaluationController.createInterviewRound
);

interviewAdminRouter.put(
  '/:id',
  requireRole(Role.PLACEMENT_ADMIN),
  evaluationController.updateInterviewRound
);

interviewAdminRouter.delete(
  '/:id',
  requireRole(Role.PLACEMENT_ADMIN),
  evaluationController.deleteInterviewRound
);

interviewAdminRouter.post(
  '/:id/students',
  requireRole(Role.PLACEMENT_ADMIN),
  evaluationController.assignStudentsToInterview
);

interviewAdminRouter.delete(
  '/:id/participants/:participantId',
  requireRole(Role.PLACEMENT_ADMIN),
  evaluationController.removeParticipantFromInterview
);

interviewAdminRouter.put(
  ['/:id/participants/:participantId/attendance', '/participants/:participantId/attendance'],
  requireRole(Role.PLACEMENT_ADMIN),
  evaluationController.updateInterviewAttendance
);

interviewAdminRouter.post(
  ['/:id/attendance/batch', '/attendance/batch'],
  requireRole(Role.PLACEMENT_ADMIN),
  evaluationController.batchUpdateInterviewAttendance
);

interviewAdminRouter.post(
  '/:id/evaluate',
  requireRole(Role.PLACEMENT_ADMIN),
  evaluationController.submitInterviewEvaluation
);

interviewAdminRouter.post(
  '/:id/evaluations/bulk',
  requireRole(Role.PLACEMENT_ADMIN),
  evaluationController.bulkEvaluateInterview
);

// =============================================================================
// STUDENT PORTAL (STUDENT ONLY - READ ONLY FOR OWN DATA)
// =============================================================================

studentEvaluationRouter.use(authenticateToken);
studentEvaluationRouter.use(requireRole(Role.STUDENT));

studentEvaluationRouter.get('/gd', evaluationController.getStudentOwnGdRounds);
studentEvaluationRouter.get('/interviews', evaluationController.getStudentOwnInterviewRounds);
studentEvaluationRouter.get('/summary', evaluationController.getStudentOwnHumanSummary);

// =============================================================================
// ADMIN DRILLDOWN (SUPER_ADMIN & PLACEMENT_ADMIN)
// =============================================================================

evaluationsAdminRouter.use(authenticateToken);
evaluationsAdminRouter.use(requireRole(Role.SUPER_ADMIN, Role.PLACEMENT_ADMIN));

evaluationsAdminRouter.get(
  '/students/:studentId',
  evaluationController.getStudentEvaluationHistoryForAdmin
);
