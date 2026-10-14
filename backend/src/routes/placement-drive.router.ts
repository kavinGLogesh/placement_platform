import { Router } from 'express';
import { authenticateToken, requireRole } from '../middleware/auth.middleware.js';
import { Role } from '../types/auth.types.js';
import { placementDriveController } from '../controllers/placement-drive.controller.js';

export const placementDriveRouter = Router();

// =============================================================================
// STRICT RBAC: EXCLUSIVELY ACCESSIBLE TO SUPER_ADMIN AND PLACEMENT_ADMIN
// Non-admin roles (including STUDENT) are strictly forbidden (HTTP 403)
// =============================================================================
placementDriveRouter.use(authenticateToken);
placementDriveRouter.use(requireRole(Role.SUPER_ADMIN, Role.PLACEMENT_ADMIN));

// Drive CRUD
placementDriveRouter.post('/', placementDriveController.createDrive);
placementDriveRouter.get('/', placementDriveController.getDrives);
placementDriveRouter.get('/:id', placementDriveController.getDriveById);
placementDriveRouter.put('/:id', placementDriveController.updateDrive);
placementDriveRouter.delete('/:id', placementDriveController.deleteDrive);

// Automatic Eligibility Analysis
placementDriveRouter.get('/:id/eligibility', placementDriveController.getEligibility);

// Student Selection & Registration
placementDriveRouter.post('/:id/register', placementDriveController.registerStudents);
placementDriveRouter.get('/:id/registrations', placementDriveController.getRegistrations);
placementDriveRouter.put(
  '/:id/registrations/:registrationId',
  placementDriveController.updateRegistrationStage
);

// Drive-wise selection history per student
placementDriveRouter.get(
  '/students/:studentId/history',
  placementDriveController.getStudentDriveHistory
);
