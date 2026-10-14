import fs from 'fs';
import { Request, Response, NextFunction } from 'express';
import { academicService, AcademicService } from '../services/academic.service.js';
import { resolveStudentId } from './attempt.controller.js';
import { sendSuccess } from '../utils/response.util.js';
import { AppError } from '../middleware/errorHandler.js';
import { Role } from '../types/auth.types.js';

export class AcademicController {
  constructor(private readonly service: AcademicService = academicService) {}

  /**
   * Helper to check student record access permissions
   */
  private async verifyStudentAccess(req: Request, targetStudentId: string): Promise<void> {
    if (!req.user) {
      throw new AppError('Unauthorized: User not authenticated', 401);
    }
    const role = req.user.role;
    if (role === Role.SUPER_ADMIN || role === Role.PLACEMENT_ADMIN) {
      return;
    }
    if (role === Role.STUDENT) {
      const currentStudentId = await resolveStudentId(req);
      if (currentStudentId === targetStudentId) {
        return;
      }
      throw new AppError("Forbidden: Cannot access another candidate's academic record", 403);
    }
    throw new AppError('Forbidden: Role does not have permission', 403);
  }

  // ===========================================================================
  // ACADEMIC RECORDS HANDLERS
  // ===========================================================================

  getAcademicRecord = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const studentId = req.params.id as string;
      await this.verifyStudentAccess(req, studentId);
      const record = await this.service.getAcademicRecord(studentId);
      sendSuccess(res, 'Academic record retrieved successfully', record);
    } catch (err) {
      next(err);
    }
  };

  getOwnAcademicRecord = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const studentId = await resolveStudentId(req);
      const record = await this.service.getAcademicRecord(studentId);
      sendSuccess(res, 'Academic record retrieved successfully', record);
    } catch (err) {
      next(err);
    }
  };

  upsertAcademicRecord = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const studentId = req.params.id as string;
      const adminUser = { id: req.user!.sub, email: req.user!.email };
      const updated = await this.service.upsertAcademicRecord(studentId, req.body, adminUser);
      sendSuccess(res, 'Academic record saved successfully', updated);
    } catch (err) {
      next(err);
    }
  };

  uploadMarksheet = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const studentId = req.params.id as string;
      const docType = req.params.docType as 'tenth' | 'twelfth' | 'semester';
      const semesterNumber = req.body.semesterNumber ? Number(req.body.semesterNumber) : undefined;

      if (!req.file) {
        throw new AppError('Please select a marksheet document (PDF or image) to upload', 400);
      }

      const adminUser = { id: req.user!.sub, email: req.user!.email };
      const updated = await this.service.uploadMarksheet(
        studentId,
        docType,
        {
          originalname: req.file.originalname,
          mimetype: req.file.mimetype,
          buffer: req.file.buffer,
          path: req.file.path,
          size: req.file.size,
        },
        semesterNumber,
        adminUser
      );

      sendSuccess(res, 'Marksheet uploaded successfully', updated);
    } catch (err) {
      next(err);
    }
  };

  downloadMarksheet = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const studentId = req.params.id as string;
      await this.verifyStudentAccess(req, studentId);

      const docType = req.params.docType as 'tenth' | 'twelfth' | 'semester';
      const semesterNumber = req.query.semesterNumber ? Number(req.query.semesterNumber) : undefined;

      const fileInfo = await this.service.getMarksheetFile(studentId, docType, semesterNumber);

      const stat = fs.statSync(fileInfo.filePath);
      res.setHeader('Content-Type', fileInfo.mimeType);
      res.setHeader('Content-Length', stat.size);
      res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(fileInfo.fileName)}"`);

      const readStream = fs.createReadStream(fileInfo.filePath);
      readStream.pipe(res);
    } catch (err) {
      next(err);
    }
  };

  downloadOwnMarksheet = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const studentId = await resolveStudentId(req);
      const docType = req.params.docType as 'tenth' | 'twelfth' | 'semester';
      const semesterNumber = req.query.semesterNumber ? Number(req.query.semesterNumber) : undefined;

      const fileInfo = await this.service.getMarksheetFile(studentId, docType, semesterNumber);

      const stat = fs.statSync(fileInfo.filePath);
      res.setHeader('Content-Type', fileInfo.mimeType);
      res.setHeader('Content-Length', stat.size);
      res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(fileInfo.fileName)}"`);

      const readStream = fs.createReadStream(fileInfo.filePath);
      readStream.pipe(res);
    } catch (err) {
      next(err);
    }
  };

  // ===========================================================================
  // PERSONAL EMAIL HANDLERS
  // ===========================================================================

  studentRequestPersonalEmail = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const studentId = await resolveStudentId(req);
      const { personalEmail } = req.body;
      if (!personalEmail) {
        throw new AppError('Personal email address is required', 400);
      }
      const result = await this.service.requestPersonalEmailUpdate(studentId, personalEmail);
      sendSuccess(res, result.message, result);
    } catch (err) {
      next(err);
    }
  };

  studentVerifyPersonalEmail = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const studentId = await resolveStudentId(req);
      const { verificationCode } = req.body;
      if (!verificationCode) {
        throw new AppError('Verification code is required', 400);
      }
      const result = await this.service.verifyPersonalEmail(studentId, verificationCode);
      sendSuccess(res, result.message, result);
    } catch (err) {
      next(err);
    }
  };

  studentResendPersonalEmailCode = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const studentId = await resolveStudentId(req);
      const result = await this.service.resendPersonalEmailVerification(studentId);
      sendSuccess(res, 'New verification code generated', result);
    } catch (err) {
      next(err);
    }
  };

  adminUpdatePersonalEmail = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const studentId = req.params.id as string;
      const adminUser = { id: req.user!.sub, email: req.user!.email };
      const updated = await this.service.adminUpdatePersonalEmail(studentId, req.body, adminUser);
      sendSuccess(res, 'Personal email updated successfully', updated);
    } catch (err) {
      next(err);
    }
  };

  getAuditLogs = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const studentId = req.params.id as string;
      const logs = await this.service.getAuditLogs(studentId);
      sendSuccess(res, 'Audit logs retrieved successfully', logs);
    } catch (err) {
      next(err);
    }
  };

  previewAcademicImport = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.file) {
        throw new AppError('Excel file (.xlsx or .xls) is required', 400);
      }
      const preview = await this.service.generateAcademicImportPreview(
        req.file.buffer,
        req.file.originalname
      );
      sendSuccess(res, 'Academic import preview generated successfully', preview);
    } catch (err) {
      next(err);
    }
  };

  confirmAcademicImport = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.body || !req.body.importSessionId) {
        throw new AppError('Import session ID is required', 400);
      }
      const adminUser = { id: req.user!.sub, email: req.user!.email };
      const result = await this.service.confirmAcademicImport(req.body, adminUser);
      sendSuccess(res, 'Academic records imported successfully', result);
    } catch (err) {
      next(err);
    }
  };
}

export const academicController = new AcademicController();
