import { Response } from 'express';
import { ApiResponse, ApiErrorResponse } from '../types/api.types.js';

export const sendSuccess = <T>(
  res: Response,
  message: string,
  data?: T,
  statusCode = 200
): Response => {
  const payload: ApiResponse<T> = {
    success: true,
    message,
    ...(data !== undefined ? { data } : {}),
  };
  return res.status(statusCode).json(payload);
};

export const sendError = (
  res: Response,
  message: string,
  statusCode = 500,
  details?: unknown
): Response => {
  const payload: ApiErrorResponse = {
    success: false,
    message,
    ...(details ? { error: { details } } : {}),
  };
  return res.status(statusCode).json(payload);
};
