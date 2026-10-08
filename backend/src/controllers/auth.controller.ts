import { Request, Response, NextFunction } from 'express';
import { AuthService, authService } from '../services/auth.service.js';
import { sendSuccess } from '../utils/response.util.js';
import { AppError } from '../middleware/errorHandler.js';

export class AuthController {
  constructor(private readonly service: AuthService = authService) {}

  /**
   * POST /api/auth/login
   */
  login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { email, password } = req.body;
      const data = await this.service.login({ email, password });
      sendSuccess(res, 'Login successful', data, 200);
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/auth/refresh
   */
  refresh = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { refreshToken } = req.body;
      const data = await this.service.refreshToken({ refreshToken });
      sendSuccess(res, 'Token refreshed successfully', data, 200);
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/auth/logout
   */
  logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { refreshToken } = req.body;
      await this.service.logout({ refreshToken });
      sendSuccess(res, 'Logged out successfully', null, 200);
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/auth/me
   */
  me = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new AppError('Unauthorized', 401);
      }
      const user = await this.service.getCurrentUser(req.user.sub);
      sendSuccess(res, 'Current user profile retrieved', { user }, 200);
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/auth/change-password
   */
  changePassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new AppError('Unauthorized', 401);
      }
      const { currentPassword, newPassword } = req.body;
      if (!newPassword || typeof newPassword !== 'string' || !newPassword.trim()) {
        throw new AppError('New password is required', 400);
      }
      await this.service.changePassword(req.user.sub, { currentPassword, newPassword: newPassword.trim() });
      sendSuccess(res, 'Password changed successfully', null, 200);
    } catch (error) {
      next(error);
    }
  };
}

export const authController = new AuthController();
