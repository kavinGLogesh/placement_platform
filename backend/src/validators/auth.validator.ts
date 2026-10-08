import { Request, Response, NextFunction } from 'express';
import { AppError } from '../middleware/errorHandler.js';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const validateLoginInput = (req: Request, _res: Response, next: NextFunction): void => {
  const identifier = req.body?.identifier || req.body?.email;
  const { password } = req.body || {};

  if (!identifier || typeof identifier !== 'string' || !identifier.trim()) {
    return next(new AppError('Email or Register Number is required', 400));
  }

  const trimmed = identifier.trim();
  if (trimmed.includes('@')) {
    if (!EMAIL_REGEX.test(trimmed)) {
      return next(new AppError('Please provide a valid email address', 400));
    }
  } else {
    if (trimmed.length < 2) {
      return next(new AppError('Please provide a valid Register Number or Email address', 400));
    }
  }

  // Normalize so downstream receives identifier in both fields
  req.body.email = trimmed;
  req.body.identifier = trimmed;

  if (!password || typeof password !== 'string' || password.length === 0) {
    return next(new AppError('Password is required', 400));
  }

  next();
};

export const validateRefreshInput = (req: Request, _res: Response, next: NextFunction): void => {
  const { refreshToken } = req.body || {};

  if (!refreshToken || typeof refreshToken !== 'string' || !refreshToken.trim()) {
    return next(new AppError('Refresh token is required', 400));
  }

  next();
};

export const validateLogoutInput = (req: Request, _res: Response, next: NextFunction): void => {
  const { refreshToken } = req.body || {};

  if (!refreshToken || typeof refreshToken !== 'string' || !refreshToken.trim()) {
    return next(new AppError('Refresh token is required to logout', 400));
  }

  next();
};
