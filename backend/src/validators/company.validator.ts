import { Request, Response, NextFunction } from 'express';
import { AppError } from '../middleware/errorHandler.js';

export function validateCreateCompany(req: Request, _res: Response, next: NextFunction): void {
  try {
    const { code, name } = req.body;

    if (!code || typeof code !== 'string' || !code.trim()) {
      throw new AppError('Company code is required (e.g. TCS, WIPRO, INFY)', 400);
    }

    if (code.trim().length < 2 || code.trim().length > 20) {
      throw new AppError('Company code must be between 2 and 20 characters', 400);
    }

    if (!name || typeof name !== 'string' || !name.trim()) {
      throw new AppError('Company name is required', 400);
    }

    if (name.trim().length < 2 || name.trim().length > 100) {
      throw new AppError('Company name must be between 2 and 100 characters', 400);
    }

    if (req.body.website && typeof req.body.website === 'string' && req.body.website.trim()) {
      const urlPattern = /^https?:\/\/.+/i;
      if (!urlPattern.test(req.body.website.trim())) {
        throw new AppError('Website must be a valid URL starting with http:// or https://', 400);
      }
    }

    next();
  } catch (err) {
    next(err);
  }
}

export function validateUpdateCompany(req: Request, _res: Response, next: NextFunction): void {
  try {
    const { code, name, website } = req.body;

    if (code !== undefined) {
      if (typeof code !== 'string' || !code.trim() || code.trim().length < 2 || code.trim().length > 20) {
        throw new AppError('Company code must be between 2 and 20 characters', 400);
      }
    }

    if (name !== undefined) {
      if (typeof name !== 'string' || !name.trim() || name.trim().length < 2 || name.trim().length > 100) {
        throw new AppError('Company name must be between 2 and 100 characters', 400);
      }
    }

    if (website !== undefined && website !== null && website.trim() !== '') {
      const urlPattern = /^https?:\/\/.+/i;
      if (!urlPattern.test(website.trim())) {
        throw new AppError('Website must be a valid URL starting with http:// or https://', 400);
      }
    }

    next();
  } catch (err) {
    next(err);
  }
}

export function validateCompanyQuery(req: Request, _res: Response, next: NextFunction): void {
  try {
    const { page, limit, sortBy, sortOrder } = req.query;

    if (page && (isNaN(Number(page)) || Number(page) < 1)) {
      throw new AppError('Page must be a positive integer >= 1', 400);
    }

    if (limit && (isNaN(Number(limit)) || Number(limit) < 1 || Number(limit) > 100)) {
      throw new AppError('Limit must be an integer between 1 and 100', 400);
    }

    if (sortBy && !['name', 'code', 'createdAt'].includes(String(sortBy))) {
      throw new AppError("Invalid sortBy field. Allowed: 'name', 'code', 'createdAt'", 400);
    }

    if (sortOrder && !['asc', 'desc'].includes(String(sortOrder).toLowerCase())) {
      throw new AppError("Invalid sortOrder. Allowed: 'asc' or 'desc'", 400);
    }

    next();
  } catch (err) {
    next(err);
  }
}
