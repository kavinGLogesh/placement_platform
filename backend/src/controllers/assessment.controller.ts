import { Request, Response, NextFunction } from 'express';
import { AssessmentService, assessmentService } from '../services/assessment.service.js';
import { sendSuccess } from '../utils/response.util.js';
import {
  AssessmentQueryFilters,
  AssessmentStatus,
} from '../types/assessment.types.js';
import {
  validateCreateAssessment,
  validateUpdateAssessment,
  validateScheduleAssessment,
} from '../validators/assessment.validator.js';

export class AssessmentController {
  constructor(private readonly service: AssessmentService = assessmentService) {}

  createAssessment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const validatedPayload = validateCreateAssessment(req.body);
      const createdById = req.user?.sub;
      const assessment = await this.service.createAssessment(validatedPayload, createdById);
      sendSuccess(res, 'Assessment created successfully', assessment, 201);
    } catch (error) {
      next(error);
    }
  };

  getAssessments = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const filters: AssessmentQueryFilters = {
        page: req.query.page ? Number(req.query.page) : undefined,
        limit: req.query.limit ? Number(req.query.limit) : undefined,
        search: req.query.search ? String(req.query.search) : undefined,
        status: req.query.status as AssessmentStatus | undefined,
        companyId: req.query.companyId ? String(req.query.companyId) : undefined,
        isCompanyAssessment: req.query.isCompanyAssessment !== undefined ? req.query.isCompanyAssessment === 'true' : undefined,
        sortBy: req.query.sortBy as AssessmentQueryFilters['sortBy'],
        sortOrder: req.query.sortOrder as AssessmentQueryFilters['sortOrder'],
      };

      const result = await this.service.getAssessments(filters);
      sendSuccess(res, 'Assessments retrieved successfully', result);
    } catch (error) {
      next(error);
    }
  };

  getAssessmentById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = String(req.params.id);
      const assessment = await this.service.getAssessmentById(id);
      sendSuccess(res, 'Assessment details retrieved successfully', assessment);
    } catch (error) {
      next(error);
    }
  };

  updateAssessment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = String(req.params.id);
      const validatedPayload = validateUpdateAssessment(req.body);
      const assessment = await this.service.updateAssessment(id, validatedPayload);
      sendSuccess(res, 'Assessment updated successfully', assessment);
    } catch (error) {
      next(error);
    }
  };

  deleteAssessment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = String(req.params.id);
      await this.service.deleteAssessment(id);
      sendSuccess(res, 'Assessment deleted successfully', null, 200);
    } catch (error) {
      next(error);
    }
  };

  generatePapers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = String(req.params.id);
      const result = await this.service.generatePapers(id);
      sendSuccess(res, 'Assessment examination papers generated successfully', result, 201);
    } catch (error) {
      next(error);
    }
  };

  publishAssessment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = String(req.params.id);
      const assessment = await this.service.publishAssessment(id);
      sendSuccess(res, 'Assessment published successfully', assessment);
    } catch (error) {
      next(error);
    }
  };

  unpublishAssessment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = String(req.params.id);
      const assessment = await this.service.unpublishAssessment(id);
      sendSuccess(res, 'Assessment unpublished and reverted to DRAFT status', assessment);
    } catch (error) {
      next(error);
    }
  };

  scheduleAssessment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = String(req.params.id);
      const { startDate, endDate } = validateScheduleAssessment(req.body);
      const assessment = await this.service.scheduleAssessment(id, startDate, endDate);
      sendSuccess(res, 'Assessment schedule updated successfully', assessment);
    } catch (error) {
      next(error);
    }
  };

  getAssessmentPapers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = String(req.params.id);
      const papers = await this.service.getAssessmentPapers(id);
      sendSuccess(res, 'Assessment papers retrieved successfully', papers);
    } catch (error) {
      next(error);
    }
  };

  assignStudents = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = String(req.params.id);
      const result = await this.service.assignStudents(id, req.body);
      sendSuccess(res, 'Students assigned to assessment successfully', result);
    } catch (error) {
      next(error);
    }
  };

  getAssessmentAssignments = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = String(req.params.id);
      const assignments = await this.service.getAssessmentAssignments(id);
      sendSuccess(res, 'Assessment student assignments retrieved successfully', assignments);
    } catch (error) {
      next(error);
    }
  };
}

export const assessmentController = new AssessmentController();
