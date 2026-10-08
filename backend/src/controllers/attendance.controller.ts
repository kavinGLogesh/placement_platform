import { Request, Response, NextFunction } from 'express';
import { attendanceService, AttendanceService } from '../services/attendance.service.js';
import { resolveStudentId } from './attempt.controller.js';
import { sendSuccess } from '../utils/response.util.js';
import { AppError } from '../middleware/errorHandler.js';

export class AttendanceController {
  constructor(private service: AttendanceService = attendanceService) {}

  // 1. GET /api/attendance/assessments/:id/overview
  getAssessmentOverview = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const assessmentId = String(req.params.id);
      const overview = await this.service.getAssessmentAttendanceOverview(assessmentId);
      sendSuccess(res, 'Assessment attendance overview retrieved successfully', overview);
    } catch (err) {
      next(err);
    }
  };

  // 2. GET /api/attendance/assessments/overview
  getAllOverviews = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const overviews = await this.service.getAllAssessmentsAttendanceOverview();
      sendSuccess(res, 'All assessment attendance overviews retrieved successfully', overviews);
    } catch (err) {
      next(err);
    }
  };

  // 3. GET /api/attendance/records
  getStudentAttendanceList = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query = {
        assessmentId: req.query.assessmentId ? String(req.query.assessmentId) : undefined,
        departmentId: req.query.departmentId ? String(req.query.departmentId) : undefined,
        classId: req.query.classId ? String(req.query.classId) : undefined,
        status: req.query.status ? String(req.query.status) : undefined,
        search: req.query.search ? String(req.query.search) : undefined,
        page: req.query.page ? parseInt(String(req.query.page), 10) : 1,
        limit: req.query.limit ? parseInt(String(req.query.limit), 10) : 20,
        sortBy: req.query.sortBy as any,
        sortOrder: req.query.sortOrder as any,
      };

      const result = await this.service.getStudentAttendanceList(query);
      sendSuccess(res, 'Attendance records retrieved successfully', result);
    } catch (err) {
      next(err);
    }
  };

  // 4. GET /api/attendance/assessments/:id/not-attended
  getNotAttendedStudents = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const assessmentId = String(req.params.id);
      const records = await this.service.getNotAttendedStudents(assessmentId);
      sendSuccess(res, 'Not-attended students retrieved successfully', records);
    } catch (err) {
      next(err);
    }
  };

  // 5. GET /api/attendance/assessments/:id/export
  exportNotAttendedExcel = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const assessmentId = String(req.params.id);
      const userEmail = (req as any).user?.email || 'placementadmin@placement.edu';

      const exportResult = await this.service.exportNotAttendedStudentsExcel(assessmentId, userEmail);

      res.setHeader('Content-Type', exportResult.contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${exportResult.filename}"`);
      res.send(exportResult.buffer);
    } catch (err) {
      next(err);
    }
  };

  // 6. POST /api/attendance/assessments/:id/reminders
  sendReminders = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const assessmentId = String(req.params.id);
      const { studentIds, customSubject, customMessage } = req.body || {};

      if (studentIds && !Array.isArray(studentIds)) {
        throw new AppError('studentIds must be an array of strings if provided', 400);
      }

      const result = await this.service.sendRemindersToNotAttended({
        assessmentId,
        studentIds,
        customSubject,
        customMessage,
      });

      sendSuccess(res, 'Attendance follow-up reminders processed successfully', result);
    } catch (err) {
      next(err);
    }
  };

  // 7. GET /api/attendance/alerts
  getActiveAlerts = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const alerts = await this.service.getActiveAlerts();
      sendSuccess(res, 'Active attendance alerts retrieved successfully', alerts);
    } catch (err) {
      next(err);
    }
  };

  // 8. PATCH /api/attendance/alerts/:id/resolve
  resolveAlert = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const alertId = String(req.params.id);
      await this.service.resolveAlert(alertId);
      sendSuccess(res, 'Attendance alert resolved successfully', { resolved: true });
    } catch (err) {
      next(err);
    }
  };

  // 9. POST /api/attendance/sync
  syncAssessments = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const syncResult = await this.service.syncAssessments();
      sendSuccess(res, 'Assessment attendance closure sweep completed successfully', syncResult);
    } catch (err) {
      next(err);
    }
  };

  // 10. GET /api/attendance/repeated-non-attendance
  getRepeatedNonAttendance = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const insights = await this.service.getRepeatedNonAttendanceStudents();
      sendSuccess(res, 'Repeated non-attendance insights retrieved successfully', insights);
    } catch (err) {
      next(err);
    }
  };

  // 11. GET /api/attendance/assessments/:id/config
  getAttendanceConfig = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const assessmentId = String(req.params.id);
      const config = await this.service.getAttendanceConfig(assessmentId);
      sendSuccess(res, 'Attendance configuration retrieved successfully', config);
    } catch (err) {
      next(err);
    }
  };

  // 12. PUT /api/attendance/assessments/:id/config
  updateAttendanceConfig = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const assessmentId = String(req.params.id);
      const config = await this.service.updateAttendanceConfig(assessmentId, req.body || {});
      sendSuccess(res, 'Attendance configuration updated successfully', config);
    } catch (err) {
      next(err);
    }
  };

  // 13. GET /api/attendance/student/me (Student Role Only)
  getStudentOwnAttendance = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const studentId = await resolveStudentId(req);
      const records = await this.service.getStudentOwnAttendance(studentId);
      sendSuccess(res, 'Student attendance history retrieved successfully', records);
    } catch (err) {
      next(err);
    }
  };
}

export const attendanceController = new AttendanceController();
