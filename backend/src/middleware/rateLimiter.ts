import { Request, Response, NextFunction } from 'express';
import { AppError } from './errorHandler.js';

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

const WINDOW_MS = 5 * 60 * 1000; // 5 minutes
const MAX_ATTEMPTS = 15; // Max 15 attempts per IP per window

const ipAttempts = new Map<string, RateLimitRecord>();

export const authRateLimiter = (req: Request, _res: Response, next: NextFunction): void => {
  // In development/test environments, permit higher throughput
  if (process.env.NODE_ENV === 'test') {
    return next();
  }

  const clientIp = req.ip || req.socket.remoteAddress || 'unknown-client';
  const now = Date.now();
  const record = ipAttempts.get(clientIp);

  if (!record || now > record.resetTime) {
    ipAttempts.set(clientIp, {
      count: 1,
      resetTime: now + WINDOW_MS,
    });
    return next();
  }

  if (record.count >= MAX_ATTEMPTS) {
    const retryAfterSec = Math.ceil((record.resetTime - now) / 1000);
    return next(
      new AppError(
        `Too many authentication attempts. Please try again after ${retryAfterSec} seconds.`,
        429
      )
    );
  }

  record.count += 1;
  next();
};
