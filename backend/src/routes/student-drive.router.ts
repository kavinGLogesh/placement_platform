import { Router } from 'express';
import { authenticateToken, requireRole } from '../middleware/auth.middleware.js';
import { Role } from '../types/auth.types.js';
import { studentDriveController } from '../controllers/student-drive.controller.js';

export const studentPlacementRouter = Router();

// =============================================================================
// STRICT RBAC: STUDENT ROLE EXCLUSIVELY
// =============================================================================
studentPlacementRouter.use(authenticateToken);
studentPlacementRouter.use(requireRole(Role.STUDENT));

// Placement Drives
studentPlacementRouter.get('/placement-drives', studentDriveController.getDrives);
studentPlacementRouter.post('/placement-drives/:id/apply', studentDriveController.applyForDrive);

// Notifications Center
studentPlacementRouter.get('/notifications', studentDriveController.getNotifications);
studentPlacementRouter.put('/notifications/:id/read', studentDriveController.markNotificationAsRead);
studentPlacementRouter.put('/notifications/read-all', studentDriveController.markAllNotificationsAsRead);
