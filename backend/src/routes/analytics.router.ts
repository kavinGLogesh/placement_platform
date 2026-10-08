import { Router } from 'express';
import { authenticateToken, requireRole } from '../middleware/auth.middleware.js';
import { Role } from '../types/auth.types.js';
import { analyticsController } from '../controllers/analytics.controller.js';

export const analyticsRouter = Router();
export const resultsRouter = Router();

// Protect results endpoints: SUPER_ADMIN, PLACEMENT_ADMIN
resultsRouter.use(authenticateToken);
resultsRouter.use(requireRole(Role.SUPER_ADMIN, Role.PLACEMENT_ADMIN));
resultsRouter.get('/', analyticsController.getResults);

// Protect analytics endpoints: SUPER_ADMIN, PLACEMENT_ADMIN
analyticsRouter.use(authenticateToken);
analyticsRouter.use(requireRole(Role.SUPER_ADMIN, Role.PLACEMENT_ADMIN));

analyticsRouter.get('/', analyticsController.getAdminOverview);
analyticsRouter.get('/departments', analyticsController.getDepartmentAnalytics);
analyticsRouter.get('/topics', analyticsController.getTopicAnalytics);
analyticsRouter.get('/funnel', analyticsController.getPlacementFunnel);
analyticsRouter.get('/students/:id', analyticsController.getStudentDrilldown);
