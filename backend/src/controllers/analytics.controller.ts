import { Request, Response, NextFunction } from 'express';
import { analyticsService, AnalyticsService } from '../services/analytics.service.js';
import { sendSuccess } from '../utils/response.util.js';
import { resolveStudentId } from './attempt.controller.js';
import { ResultsFilterQuery } from '../types/analytics.types.js';

export class AnalyticsController {
  constructor(private readonly service: AnalyticsService = analyticsService) {}

  // GET /api/results
  getResults = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query: ResultsFilterQuery = {
        page: req.query.page ? parseInt(String(req.query.page), 10) : 1,
        limit: req.query.limit ? parseInt(String(req.query.limit), 10) : 10,
        search: req.query.search ? String(req.query.search) : undefined,
        departmentId: req.query.departmentId ? String(req.query.departmentId) : undefined,
        assessmentId: req.query.assessmentId ? String(req.query.assessmentId) : undefined,
        isPassed:
          req.query.isPassed !== undefined
            ? String(req.query.isPassed).toLowerCase() === 'true'
            : undefined,
        startDate: req.query.startDate ? String(req.query.startDate) : undefined,
        endDate: req.query.endDate ? String(req.query.endDate) : undefined,
        sortBy: req.query.sortBy as ResultsFilterQuery['sortBy'],
        sortOrder: req.query.sortOrder === 'asc' ? 'asc' : 'desc',
      };

      const result = await this.service.getPaginatedResults(query);
      sendSuccess(res, 'Assessment results retrieved successfully', result);
    } catch (err) {
      next(err);
    }
  };

  // GET /api/analytics
  getAdminOverview = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const summary = await this.service.getAdminOverview();
      sendSuccess(res, 'Admin analytics summary retrieved successfully', summary);
    } catch (err) {
      next(err);
    }
  };

  // GET /api/analytics/departments
  getDepartmentAnalytics = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const filters = {
        assessmentId: req.query.assessmentId ? String(req.query.assessmentId) : undefined,
        startDate: req.query.startDate ? String(req.query.startDate) : undefined,
        endDate: req.query.endDate ? String(req.query.endDate) : undefined,
      };

      const data = await this.service.getDepartmentAnalytics(filters);
      sendSuccess(res, 'Department analytics retrieved successfully', data);
    } catch (err) {
      next(err);
    }
  };

  // GET /api/analytics/topics
  getTopicAnalytics = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const filters = {
        assessmentId: req.query.assessmentId ? String(req.query.assessmentId) : undefined,
        departmentId: req.query.departmentId ? String(req.query.departmentId) : undefined,
        startDate: req.query.startDate ? String(req.query.startDate) : undefined,
        endDate: req.query.endDate ? String(req.query.endDate) : undefined,
      };

      const data = await this.service.getTopicAnalytics(filters);
      sendSuccess(res, 'Topic analytics retrieved successfully', data);
    } catch (err) {
      next(err);
    }
  };

  // GET /api/analytics/funnel
  getPlacementFunnel = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const filters = {
        assessmentId: req.query.assessmentId ? String(req.query.assessmentId) : undefined,
        departmentId: req.query.departmentId ? String(req.query.departmentId) : undefined,
        batchYear: req.query.batchYear ? parseInt(String(req.query.batchYear), 10) : undefined,
      };

      const funnel = await this.service.getPlacementFunnel(filters);
      sendSuccess(res, 'Placement funnel analytics retrieved successfully', funnel);
    } catch (err) {
      next(err);
    }
  };

  // GET /api/analytics/students/:id
  getStudentDrilldown = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const studentId = String(req.params.id);
      const drilldown = await this.service.getStudentDrilldown(studentId);
      sendSuccess(res, 'Student performance drilldown retrieved successfully', drilldown);
    } catch (err) {
      next(err);
    }
  };

  // GET /api/student/dashboard
  getStudentDashboard = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const studentId = await resolveStudentId(req);
      const dashboard = await this.service.getStudentDashboard(studentId);
      sendSuccess(res, 'Student dashboard retrieved successfully', dashboard);
    } catch (err) {
      next(err);
    }
  };

  // GET /api/student/performance
  getStudentPerformance = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const studentId = await resolveStudentId(req);
      const performance = await this.service.getStudentPerformance(studentId);
      sendSuccess(res, 'Student performance retrieved successfully', performance);
    } catch (err) {
      next(err);
    }
  };
}

export const analyticsController = new AnalyticsController();
