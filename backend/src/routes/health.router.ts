import { Router } from 'express';
import { healthController } from '../controllers/health.controller.js';
import { validateHealthQuery } from '../validators/health.validator.js';

export const healthRouter = Router();

// GET /api/health
healthRouter.get('/', validateHealthQuery, healthController.getHealth);

// GET /api/health/db
healthRouter.get('/db', healthController.getDatabaseHealth);
