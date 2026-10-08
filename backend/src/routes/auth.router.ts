import { Router } from 'express';
import { authController } from '../controllers/auth.controller.js';
import {
  validateLoginInput,
  validateRefreshInput,
  validateLogoutInput,
} from '../validators/auth.validator.js';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { authRateLimiter } from '../middleware/rateLimiter.js';

export const authRouter = Router();

// POST /api/auth/login
authRouter.post('/login', authRateLimiter, validateLoginInput, authController.login);

// POST /api/auth/refresh
authRouter.post('/refresh', validateRefreshInput, authController.refresh);

// POST /api/auth/logout
authRouter.post('/logout', validateLogoutInput, authController.logout);

// GET /api/auth/me
authRouter.get('/me', authenticateToken, authController.me);

// POST /api/auth/change-password
authRouter.post('/change-password', authenticateToken, authController.changePassword);

