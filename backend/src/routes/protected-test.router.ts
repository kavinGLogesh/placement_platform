import { Router, Request, Response } from 'express';
import { authenticateToken, requireRole } from '../middleware/auth.middleware.js';
import { Role } from '../types/auth.types.js';
import { sendSuccess } from '../utils/response.util.js';

export const adminRouter = Router();
export const studentRouter = Router();

// -----------------------------------------------------------------------------
// ADMIN PROTECTED ROUTES (/api/admin)
// -----------------------------------------------------------------------------
adminRouter.use(authenticateToken);

// Accessible by SUPER_ADMIN and PLACEMENT_ADMIN
adminRouter.get(
  '/overview',
  requireRole(Role.SUPER_ADMIN, Role.PLACEMENT_ADMIN),
  (req: Request, res: Response) => {
    sendSuccess(res, 'Admin overview data retrieved successfully', {
      scope: 'PLACEMENT_ADMINISTRATION',
      currentUser: req.user,
      metrics: {
        activeDrives: 12,
        eligibleStudents: 340,
        interviewsScheduled: 45,
      },
    });
  }
);

// Accessible ONLY by SUPER_ADMIN
adminRouter.get(
  '/system',
  requireRole(Role.SUPER_ADMIN),
  (req: Request, res: Response) => {
    sendSuccess(res, 'Super Admin system control accessed successfully', {
      scope: 'SYSTEM_AUDIT_AND_SETTINGS',
      currentUser: req.user,
      auditLog: 'Clean',
    });
  }
);

// -----------------------------------------------------------------------------
// STUDENT PROTECTED ROUTES (/api/student)
// -----------------------------------------------------------------------------
studentRouter.use(authenticateToken);

// Accessible ONLY by STUDENT
studentRouter.get(
  '/portal',
  requireRole(Role.STUDENT),
  (req: Request, res: Response) => {
    sendSuccess(res, 'Student portal retrieved successfully', {
      scope: 'STUDENT_PORTAL',
      currentUser: req.user,
      upcomingAssessments: [
        { id: 'asmt-01', title: 'Technical Aptitude Diagnostic', duration: '60 mins' },
      ],
    });
  }
);
