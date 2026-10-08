import { Request, Response, NextFunction } from 'express';
import { companyService } from '../services/company.service.js';
import { CompanyQueryFilters, CompanyQuestionFilter } from '../types/company.types.js';
import { QuestionCategory, QuestionDifficulty, QuestionType } from '../types/question.types.js';
import { AppError } from '../middleware/errorHandler.js';

export class CompanyController {
  async getCompanies(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const filters: CompanyQueryFilters = {
        page: req.query.page ? Number(req.query.page) : undefined,
        limit: req.query.limit ? Number(req.query.limit) : undefined,
        search: req.query.search ? String(req.query.search) : undefined,
        isActive: req.query.isActive !== undefined ? req.query.isActive === 'true' : undefined,
        sortBy: req.query.sortBy as 'name' | 'code' | 'createdAt' | undefined,
        sortOrder: req.query.sortOrder as 'asc' | 'desc' | undefined,
      };

      const result = await companyService.getCompanies(filters);
      res.status(200).json({
        success: true,
        message: 'Companies retrieved successfully',
        data: result.data,
        pagination: result.pagination,
      });
    } catch (err) {
      next(err);
    }
  }

  async getCompanyById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = String(req.params.id);
      const company = await companyService.getCompanyById(id);
      res.status(200).json({
        success: true,
        message: 'Company retrieved successfully',
        data: company,
      });
    } catch (err) {
      next(err);
    }
  }

  async createCompany(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const company = await companyService.createCompany(req.body);
      res.status(201).json({
        success: true,
        message: 'Company created successfully',
        data: company,
      });
    } catch (err) {
      next(err);
    }
  }

  async updateCompany(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = String(req.params.id);
      const company = await companyService.updateCompany(id, req.body);
      res.status(200).json({
        success: true,
        message: 'Company updated successfully',
        data: company,
      });
    } catch (err) {
      next(err);
    }
  }

  async updateCompanyStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = String(req.params.id);
      const { isActive } = req.body;
      if (typeof isActive !== 'boolean') {
        throw new AppError("Invalid 'isActive' field. Must be a boolean (true or false).", 400);
      }
      const company = await companyService.updateCompanyStatus(id, isActive);
      res.status(200).json({
        success: true,
        message: `Company ${isActive ? 'activated' : 'deactivated'} successfully`,
        data: company,
      });
    } catch (err) {
      next(err);
    }
  }

  async deleteCompany(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = String(req.params.id);
      await companyService.deleteCompany(id);
      res.status(200).json({
        success: true,
        message: 'Company deleted successfully',
      });
    } catch (err) {
      next(err);
    }
  }

  async getCompanyIntelligence(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = String(req.params.id);
      const intelligence = await companyService.getCompanyIntelligence(id);
      res.status(200).json({
        success: true,
        message: 'Company question intelligence retrieved successfully',
        data: intelligence,
      });
    } catch (err) {
      next(err);
    }
  }

  async getCompanyQuestions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = String(req.params.id);
      const filters: CompanyQuestionFilter = {
        page: req.query.page ? Number(req.query.page) : undefined,
        limit: req.query.limit ? Number(req.query.limit) : undefined,
        category: req.query.category as QuestionCategory | undefined,
        topic: req.query.topic ? String(req.query.topic) : undefined,
        difficulty: req.query.difficulty as QuestionDifficulty | undefined,
        questionType: req.query.questionType as QuestionType | undefined,
        source: req.query.source ? String(req.query.source) : undefined,
        year: req.query.year ? Number(req.query.year) : undefined,
        label: req.query.label ? String(req.query.label) : undefined,
        usageStatus: req.query.usageStatus as 'USED' | 'UNUSED' | 'ALL' | undefined,
        search: req.query.search ? String(req.query.search) : undefined,
      };

      const result = await companyService.getCompanyQuestions(id, filters);
      res.status(200).json({
        success: true,
        message: 'Company questions retrieved successfully',
        data: result.data,
        pagination: result.pagination,
      });
    } catch (err) {
      next(err);
    }
  }

  async uploadCompanyQuestions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = String(req.params.id);
      const file = req.file;

      if (!file) {
        throw new AppError('No file uploaded. Please upload a valid .xlsx, .csv, or .json file.', 400);
      }

      const result = await companyService.uploadCompanyQuestions(
        companyId,
        file.buffer,
        file.originalname,
        req.user?.sub
      );

      res.status(200).json({
        success: true,
        message: 'Question upload processed with duplicate detection',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  async getDuplicateCandidates(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = req.params.id ? String(req.params.id) : undefined;
      const candidates = await companyService.getDuplicateCandidates(companyId);
      res.status(200).json({
        success: true,
        message: 'Duplicate candidates retrieved successfully',
        data: candidates,
      });
    } catch (err) {
      next(err);
    }
  }

  async resolveDuplicateCandidate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const candidateId = String(req.params.candidateId);
      const { status } = req.body;
      if (status !== 'CONFIRMED_DUPLICATE' && status !== 'REJECTED') {
        throw new AppError("Invalid status. Must be 'CONFIRMED_DUPLICATE' or 'REJECTED'.", 400);
      }

      const updated = await companyService.resolveDuplicateCandidate(candidateId, status);
      res.status(200).json({
        success: true,
        message: `Duplicate candidate marked as ${status}`,
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }
}

export const companyController = new CompanyController();
