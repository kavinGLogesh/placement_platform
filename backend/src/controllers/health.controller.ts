import { Request, Response, NextFunction } from 'express';
import { HealthService, healthService } from '../services/health.service.js';

export class HealthController {
  constructor(private readonly service: HealthService = healthService) {}

  /**
   * GET /api/health
   * Returns exact response contract: { "success": true, "message": "API is running" }
   */
  getHealth = (_req: Request, res: Response, next: NextFunction): void => {
    try {
      const result = this.service.getApiHealth();
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/health/db
   * Returns database connectivity diagnostics
   */
  getDatabaseHealth = async (
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const result = await this.service.getDatabaseHealth();
      const statusCode = result.success ? 200 : 503;
      res.status(statusCode).json(result);
    } catch (error) {
      next(error);
    }
  };
}

export const healthController = new HealthController();
