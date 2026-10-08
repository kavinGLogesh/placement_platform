import { Router } from 'express';
import { authenticateToken, requireRole } from '../middleware/auth.middleware.js';
import { Role } from '../types/auth.types.js';
import { reportController } from '../controllers/report.controller.js';

export const reportRouter = Router();

// All report endpoints require valid authentication token
reportRouter.use(authenticateToken);

// =============================================================================
// STUDENT OWN REPORT ENDPOINTS (STUDENT ONLY)
// =============================================================================
reportRouter.get(
  '/student/me',
  requireRole(Role.STUDENT),
  reportController.getStudentOwnReport
);

reportRouter.get(
  '/student/me/export',
  requireRole(Role.STUDENT),
  reportController.exportStudentOwnReport
);

// =============================================================================
// ADMIN REPORT ENDPOINTS (SUPER_ADMIN, PLACEMENT_ADMIN ONLY)
// =============================================================================
reportRouter.get(
  '/students',
  requireRole(Role.SUPER_ADMIN, Role.PLACEMENT_ADMIN),
  reportController.getStudentReport
);

reportRouter.get(
  '/assessments',
  requireRole(Role.SUPER_ADMIN, Role.PLACEMENT_ADMIN),
  reportController.getAssessmentReport
);

reportRouter.get(
  '/departments',
  requireRole(Role.SUPER_ADMIN, Role.PLACEMENT_ADMIN),
  reportController.getDepartmentReport
);

reportRouter.get(
  '/topics',
  requireRole(Role.SUPER_ADMIN, Role.PLACEMENT_ADMIN),
  reportController.getTopicReport
);

reportRouter.get(
  '/questions',
  requireRole(Role.SUPER_ADMIN, Role.PLACEMENT_ADMIN),
  reportController.getQuestionReport
);

reportRouter.get(
  '/coding',
  requireRole(Role.SUPER_ADMIN, Role.PLACEMENT_ADMIN),
  reportController.getCodingReport
);

reportRouter.get(
  '/funnel',
  requireRole(Role.SUPER_ADMIN, Role.PLACEMENT_ADMIN),
  reportController.getFunnelReport
);

reportRouter.get(
  '/gd',
  requireRole(Role.SUPER_ADMIN, Role.PLACEMENT_ADMIN),
  reportController.getGdReport
);

reportRouter.get(
  '/interviews',
  requireRole(Role.SUPER_ADMIN, Role.PLACEMENT_ADMIN),
  reportController.getInterviewReport
);

// Export endpoint for admin reports (must be defined after static routes)
reportRouter.get(
  '/:type/export',
  requireRole(Role.SUPER_ADMIN, Role.PLACEMENT_ADMIN),
  reportController.exportReport
);
