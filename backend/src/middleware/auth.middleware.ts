import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt.util.js';
import { Role } from '../types/auth.types.js';
import { AppError } from './errorHandler.js';

/**
 * Middleware: Authenticates JWT Bearer Token in Authorization header
 * Responds with HTTP 401 if missing, invalid, or expired
 */
export const authenticateToken = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AppError('Unauthorized: Missing or malformed Authorization header', 401));
  }

  const token = authHeader.split(' ')[1];

  if (!token) {
    return next(new AppError('Unauthorized: Missing access token', 401));
  }

  try {
    const payload = verifyAccessToken(token);
    req.user = payload;
    next();
  } catch (error) {
    const message =
      error instanceof Error && error.name === 'TokenExpiredError'
        ? 'Unauthorized: Access token has expired'
        : 'Unauthorized: Invalid token signature or format';
    return next(new AppError(message, 401));
  }
};

/**
 * Middleware: Enforces Role-Based Access Control (RBAC)
 * Responds with HTTP 403 if user lacks required role
 * Permissions are strictly granted if user's role is in allowedRoles
 */
export const requireRole = (...allowedRoles: Role[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new AppError('Unauthorized: User not authenticated', 401));
    }

    const userRole = req.user.role;

    if (allowedRoles.includes(userRole)) {
      return next();
    }

    // Role does not permit access
    return next(
      new AppError(
        `Forbidden: Role '${userRole}' does not have permission to access this resource`,
        403
      )
    );
  };
};
