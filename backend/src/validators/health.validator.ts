import { Request, Response, NextFunction } from 'express';

/**
 * Health check validator (no-op for GET, serves as template for Phase 2 endpoints)
 */
export const validateHealthQuery = (
  _req: Request,
  _res: Response,
  next: NextFunction
): void => {
  // Pass through as no parameters are required
  next();
};
