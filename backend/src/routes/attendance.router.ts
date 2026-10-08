import { Router } from 'express';
import { attendanceController } from '../controllers/attendance.controller.js';
import { authenticateToken, requireRole } from '../middleware/auth.middleware.js';
import { Role } from '../types/auth.types.js';

export const attendanceRouter = Router();

// All attendance routes require valid authentication
attendanceRouter.use(authenticateToken);

// =============================================================================
// 1. STUDENT SELF-SERVICE ROUTE (STUDENT ROLE ONLY)
// =============================================================================
attendanceRouter.get(
  '/student/me',
  requireRole(Role.STUDENT),
  attendanceController.getStudentOwnAttendance
);

// =============================================================================
// 2. ADMIN MONITORING & READ-ONLY ROUTES (SUPER_ADMIN + PLACEMENT_ADMIN)
// =============================================================================
attendanceRouter.get(
  '/assessments/overview',
  requireRole(Role.SUPER_ADMIN, Role.PLACEMENT_ADMIN),
  attendanceController.getAllOverviews
);

attendanceRouter.get(
  '/assessments/:id/overview',
  requireRole(Role.SUPER_ADMIN, Role.PLACEMENT_ADMIN),
  attendanceController.getAssessmentOverview
);

attendanceRouter.get(
  '/records',
  requireRole(Role.SUPER_ADMIN, Role.PLACEMENT_ADMIN),
  attendanceController.getStudentAttendanceList
);

attendanceRouter.get(
  '/assessments/:id/not-attended',
  requireRole(Role.SUPER_ADMIN, Role.PLACEMENT_ADMIN),
  attendanceController.getNotAttendedStudents
);

attendanceRouter.get(
  '/assessments/:id/export',
  requireRole(Role.SUPER_ADMIN, Role.PLACEMENT_ADMIN),
  attendanceController.exportNotAttendedExcel
);

attendanceRouter.get(
  '/alerts',
  requireRole(Role.SUPER_ADMIN, Role.PLACEMENT_ADMIN),
  attendanceController.getActiveAlerts
);

attendanceRouter.get(
  '/repeated-non-attendance',
  requireRole(Role.SUPER_ADMIN, Role.PLACEMENT_ADMIN),
  attendanceController.getRepeatedNonAttendance
);

attendanceRouter.get(
  '/assessments/:id/config',
  requireRole(Role.SUPER_ADMIN, Role.PLACEMENT_ADMIN),
  attendanceController.getAttendanceConfig
);

// =============================================================================
// 3. OPERATIONAL MUTATION ROUTES (STRICTLY PLACEMENT_ADMIN ONLY)
// =============================================================================
attendanceRouter.post(
  '/assessments/:id/reminders',
  requireRole(Role.PLACEMENT_ADMIN),
  attendanceController.sendReminders
);

attendanceRouter.patch(
  '/alerts/:id/resolve',
  requireRole(Role.PLACEMENT_ADMIN),
  attendanceController.resolveAlert
);

attendanceRouter.post(
  '/sync',
  requireRole(Role.PLACEMENT_ADMIN),
  attendanceController.syncAssessments
);

attendanceRouter.put(
  '/assessments/:id/config',
  requireRole(Role.PLACEMENT_ADMIN),
  attendanceController.updateAttendanceConfig
);
