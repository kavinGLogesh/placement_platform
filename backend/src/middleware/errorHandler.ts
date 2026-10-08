import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.util.js';
import { sendError } from '../utils/response.util.js';

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly details?: unknown;

  constructor(message: string, statusCode = 500, details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void => {
  const statusCode = err instanceof AppError ? err.statusCode : 500;
  const message = err.message || 'Internal Server Error';
  const details = err instanceof AppError ? err.details : undefined;

  logger.error(`[${req.method}] ${req.originalUrl} - ${message}`, {
    statusCode,
    stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined,
  });

  sendError(res, message, statusCode, details);
};
