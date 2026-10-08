import { Request, Response, NextFunction } from 'express';
import { reportService, ReportService } from '../services/report.service.js';
import { sendSuccess } from '../utils/response.util.js';
import { resolveStudentId } from './attempt.controller.js';
import { ExportFormat } from '../types/report.types.js';

export class ReportController {
  constructor(private readonly service: ReportService = reportService) {}

  // 1. GET /api/reports/students
  getStudentReport = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query = {
        page: req.query.page ? parseInt(String(req.query.page), 10) : 1,
        limit: req.query.limit ? parseInt(String(req.query.limit), 10) : 10,
        academicYear: req.query.academicYear ? parseInt(String(req.query.academicYear), 10) : undefined,
        departmentId: req.query.departmentId ? String(req.query.departmentId) : undefined,
        courseId: req.query.courseId ? String(req.query.courseId) : undefined,
        classId: req.query.classId ? String(req.query.classId) : undefined,
        sectionId: req.query.sectionId ? String(req.query.sectionId) : undefined,
        assessmentId: req.query.assessmentId ? String(req.query.assessmentId) : undefined,
        isPassed:
          req.query.isPassed !== undefined
            ? String(req.query.isPassed).toLowerCase() === 'true'
            : undefined,
        startDate: req.query.startDate ? String(req.query.startDate) : undefined,
        endDate: req.query.endDate ? String(req.query.endDate) : undefined,
        search: req.query.search ? String(req.query.search) : undefined,
      };

      const result = await this.service.getStudentPerformanceReport(query);
      sendSuccess(res, 'Student performance report generated successfully', result);
    } catch (err) {
      next(err);
    }
  };

  // 2. GET /api/reports/assessments
  getAssessmentReport = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query = {
        page: req.query.page ? parseInt(String(req.query.page), 10) : 1,
        limit: req.query.limit ? parseInt(String(req.query.limit), 10) : 10,
        assessmentId: req.query.assessmentId ? String(req.query.assessmentId) : undefined,
        departmentId: req.query.departmentId ? String(req.query.departmentId) : undefined,
        courseId: req.query.courseId ? String(req.query.courseId) : undefined,
        classId: req.query.classId ? String(req.query.classId) : undefined,
        sectionId: req.query.sectionId ? String(req.query.sectionId) : undefined,
        isPassed:
          req.query.isPassed !== undefined
            ? String(req.query.isPassed).toLowerCase() === 'true'
            : undefined,
        startDate: req.query.startDate ? String(req.query.startDate) : undefined,
        endDate: req.query.endDate ? String(req.query.endDate) : undefined,
        search: req.query.search ? String(req.query.search) : undefined,
      };

      const result = await this.service.getAssessmentResultReport(query);
      sendSuccess(res, 'Assessment result report generated successfully', result);
    } catch (err) {
      next(err);
    }
  };

  // 3. GET /api/reports/departments
  getDepartmentReport = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query = {
        assessmentId: req.query.assessmentId ? String(req.query.assessmentId) : undefined,
        academicYear: req.query.academicYear ? parseInt(String(req.query.academicYear), 10) : undefined,
        startDate: req.query.startDate ? String(req.query.startDate) : undefined,
        endDate: req.query.endDate ? String(req.query.endDate) : undefined,
      };

      const result = await this.service.getDepartmentPerformanceReport(query);
      sendSuccess(res, 'Department performance report generated successfully', result);
    } catch (err) {
      next(err);
    }
  };

  // 4. GET /api/reports/topics
  getTopicReport = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query = {
        assessmentId: req.query.assessmentId ? String(req.query.assessmentId) : undefined,
        departmentId: req.query.departmentId ? String(req.query.departmentId) : undefined,
        category: req.query.category ? String(req.query.category) : undefined,
        topic: req.query.topic ? String(req.query.topic) : undefined,
        startDate: req.query.startDate ? String(req.query.startDate) : undefined,
        endDate: req.query.endDate ? String(req.query.endDate) : undefined,
      };

      const result = await this.service.getTopicPerformanceReport(query);
      sendSuccess(res, 'Topic performance report generated successfully', result);
    } catch (err) {
      next(err);
    }
  };

  // 5. GET /api/reports/questions
  getQuestionReport = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query = {
        page: req.query.page ? parseInt(String(req.query.page), 10) : 1,
        limit: req.query.limit ? parseInt(String(req.query.limit), 10) : 10,
        assessmentId: req.query.assessmentId ? String(req.query.assessmentId) : undefined,
        category: req.query.category ? String(req.query.category) : undefined,
        difficulty: req.query.difficulty ? String(req.query.difficulty) : undefined,
        topic: req.query.topic ? String(req.query.topic) : undefined,
        search: req.query.search ? String(req.query.search) : undefined,
      };

      const result = await this.service.getQuestionAnalysisReport(query);
      sendSuccess(res, 'Question analysis report generated successfully', result);
    } catch (err) {
      next(err);
    }
  };

  // 6. GET /api/reports/coding
  getCodingReport = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query = {
        page: req.query.page ? parseInt(String(req.query.page), 10) : 1,
        limit: req.query.limit ? parseInt(String(req.query.limit), 10) : 10,
        assessmentId: req.query.assessmentId ? String(req.query.assessmentId) : undefined,
        studentId: req.query.studentId ? String(req.query.studentId) : undefined,
        language: req.query.language ? String(req.query.language) : undefined,
        status: req.query.status ? String(req.query.status) : undefined,
        departmentId: req.query.departmentId ? String(req.query.departmentId) : undefined,
        startDate: req.query.startDate ? String(req.query.startDate) : undefined,
        endDate: req.query.endDate ? String(req.query.endDate) : undefined,
      };

      const result = await this.service.getCodingAssessmentReport(query);
      sendSuccess(res, 'Coding assessment report generated successfully', result);
    } catch (err) {
      next(err);
    }
  };

  // 7. GET /api/reports/funnel
  getFunnelReport = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query = {
        assessmentId: req.query.assessmentId ? String(req.query.assessmentId) : undefined,
        departmentId: req.query.departmentId ? String(req.query.departmentId) : undefined,
        batchYear: req.query.batchYear ? parseInt(String(req.query.batchYear), 10) : undefined,
      };

      const result = await this.service.getPlacementFunnelReport(query);
      sendSuccess(res, 'Placement funnel report generated successfully', result);
    } catch (err) {
      next(err);
    }
  };

  // 7a. GET /api/reports/gd
  getGdReport = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query = {
        page: req.query.page ? parseInt(String(req.query.page), 10) : 1,
        limit: req.query.limit ? parseInt(String(req.query.limit), 10) : 10,
        departmentId: req.query.departmentId ? String(req.query.departmentId) : undefined,
        evaluatorId: req.query.evaluatorId ? String(req.query.evaluatorId) : undefined,
        status: req.query.status ? String(req.query.status) : undefined,
        startDate: req.query.startDate ? String(req.query.startDate) : undefined,
        endDate: req.query.endDate ? String(req.query.endDate) : undefined,
        search: req.query.search ? String(req.query.search) : undefined,
      };

      const result = await this.service.getGdPerformanceReport(query);
      sendSuccess(res, 'GD performance report generated successfully', result);
    } catch (err) {
      next(err);
    }
  };

  // 7b. GET /api/reports/interviews
  getInterviewReport = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query = {
        page: req.query.page ? parseInt(String(req.query.page), 10) : 1,
        limit: req.query.limit ? parseInt(String(req.query.limit), 10) : 10,
        departmentId: req.query.departmentId ? String(req.query.departmentId) : undefined,
        interviewType: req.query.interviewType ? String(req.query.interviewType) : undefined,
        evaluatorId: req.query.evaluatorId ? String(req.query.evaluatorId) : undefined,
        status: req.query.status ? String(req.query.status) : undefined,
        startDate: req.query.startDate ? String(req.query.startDate) : undefined,
        endDate: req.query.endDate ? String(req.query.endDate) : undefined,
        search: req.query.search ? String(req.query.search) : undefined,
      };

      const result = await this.service.getInterviewPerformanceReport(query);
      sendSuccess(res, 'Interview performance report generated successfully', result);
    } catch (err) {
      next(err);
    }
  };

  // 8. GET /api/reports/:type/export
  exportReport = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const reportType = String(req.params.type);
      const format = (String(req.query.format || 'xlsx').toLowerCase()) as ExportFormat;
      const userEmail = (req as any).user?.email || 'admin@placement.edu';

      const exportResult = await this.service.exportReport(
        reportType,
        format,
        req.query,
        userEmail
      );

      res.setHeader('Content-Type', exportResult.contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${exportResult.filename}"`);
      res.send(exportResult.content);
    } catch (err) {
      next(err);
    }
  };

  // 9. GET /api/reports/student/me (Student's own report)
  getStudentOwnReport = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const studentId = await resolveStudentId(req);
      const query = {
        assessmentId: req.query.assessmentId ? String(req.query.assessmentId) : undefined,
        startDate: req.query.startDate ? String(req.query.startDate) : undefined,
        endDate: req.query.endDate ? String(req.query.endDate) : undefined,
      };

      const result = await this.service.getStudentOwnReport(studentId, query);
      sendSuccess(res, 'Student own performance report retrieved successfully', result);
    } catch (err) {
      next(err);
    }
  };

  // 10. GET /api/reports/student/me/export
  exportStudentOwnReport = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const studentId = await resolveStudentId(req);
      const format = (String(req.query.format || 'xlsx').toLowerCase()) as ExportFormat;
      const userEmail = (req as any).user?.email || 'student@placement.edu';

      const exportResult = await this.service.exportStudentOwnReport(
        studentId,
        format,
        req.query,
        userEmail
      );

      res.setHeader('Content-Type', exportResult.contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${exportResult.filename}"`);
      res.send(exportResult.content);
    } catch (err) {
      next(err);
    }
  };
}

export const reportController = new ReportController();
