import { Request, Response, NextFunction } from 'express';
import {
  PlacementDriveService,
  placementDriveService,
} from '../services/placement-drive.service.js';
import { sendSuccess } from '../utils/response.util.js';
import { AppError } from '../middleware/errorHandler.js';
import { DriveStatus, SelectionStage } from '../types/placement-drive.types.js';

export class PlacementDriveController {
  constructor(private service: PlacementDriveService = placementDriveService) {}

  createDrive = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const adminUser = (req as any).user;
      if (!adminUser) throw new AppError('Unauthorized admin request', 401);

      const drive = await this.service.createDrive(req.body, adminUser);
      sendSuccess(res, 'Placement drive created successfully', drive, 201);
    } catch (error) {
      next(error);
    }
  };

  getDrives = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const status = req.query.status as DriveStatus | undefined;
      const search = req.query.search as string | undefined;

      const drives = await this.service.getDrives({ status, search });
      sendSuccess(res, 'Placement drives retrieved successfully', drives);
    } catch (error) {
      next(error);
    }
  };

  getDriveById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = String(req.params.id);
      const drive = await this.service.getDriveById(id);
      sendSuccess(res, 'Placement drive details retrieved', drive);
    } catch (error) {
      next(error);
    }
  };

  updateDrive = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = String(req.params.id);
      const adminUser = (req as any).user;
      const drive = await this.service.updateDrive(id, req.body, adminUser);
      sendSuccess(res, 'Placement drive updated successfully', drive);
    } catch (error) {
      next(error);
    }
  };

  deleteDrive = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = String(req.params.id);
      const adminUser = (req as any).user;
      await this.service.deleteDrive(id, adminUser);
      sendSuccess(res, 'Placement drive deleted successfully', { success: true });
    } catch (error) {
      next(error);
    }
  };

  getEligibility = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = String(req.params.id);
      const summary = await this.service.calculateEligibility(id);
      sendSuccess(res, 'Drive eligibility evaluated successfully', summary);
    } catch (error) {
      next(error);
    }
  };

  registerStudents = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = String(req.params.id);
      const adminUser = (req as any).user;
      const { studentIds, remarks } = req.body;

      if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
        throw new AppError('studentIds array is required', 400);
      }

      const result = await this.service.registerStudents(
        id,
        studentIds,
        adminUser?.email || 'admin@placement.edu',
        remarks
      );
      sendSuccess(res, 'Students registered for placement drive successfully', result, 201);
    } catch (error) {
      next(error);
    }
  };

  shortlistCandidates = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = String(req.params.id);
      const adminUser = (req as any).user;
      if (!adminUser) throw new AppError('Unauthorized admin request', 401);

      const result = await this.service.shortlistCandidates(id, req.body, adminUser);
      sendSuccess(
        res,
        `Successfully shortlisted ${result.shortlistedCount} candidates and published registration to Student Portals`,
        result,
        201
      );
    } catch (error) {
      next(error);
    }
  };

  getRegistrations = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = String(req.params.id);
      const registrations = await this.service.getDriveRegistrations(id);
      sendSuccess(res, 'Drive registrations retrieved successfully', registrations);
    } catch (error) {
      next(error);
    }
  };

  updateRegistrationStage = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = String(req.params.id);
      const registrationId = String(req.params.registrationId);
      const { stage, remarks } = req.body;

      if (!stage) {
        throw new AppError('Selection stage is required', 400);
      }
      if (!Object.values(SelectionStage).includes(stage)) {
        throw new AppError(`Invalid selection stage: ${stage}`, 400);
      }

      const adminUser = (req as any).user;
      const updated = await this.service.updateRegistrationStage(
        id,
        registrationId,
        stage,
        adminUser?.email || 'admin@placement.edu',
        remarks
      );
      sendSuccess(res, 'Recruitment stage updated successfully', updated);
    } catch (error) {
      next(error);
    }
  };

  bulkUpdateStage = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = String(req.params.id);
      const adminUser = (req as any).user;
      const { registrationIds, stage, remarks } = req.body;

      if (!registrationIds || !Array.isArray(registrationIds) || registrationIds.length === 0) {
        throw new AppError('registrationIds array is required', 400);
      }
      if (!stage || !Object.values(SelectionStage).includes(stage)) {
        throw new AppError(`Invalid selection stage: ${stage}`, 400);
      }

      const result = await this.service.bulkUpdateStage(
        id,
        registrationIds,
        stage,
        adminUser?.email || 'admin@placement.edu',
        remarks
      );
      sendSuccess(res, `Updated ${result.updatedCount} candidates to stage ${stage}`, result);
    } catch (error) {
      next(error);
    }
  };

  finalizeDriveSelections = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = String(req.params.id);
      const adminUser = (req as any).user;

      const result = await this.service.finalizeDriveSelections(
        id,
        adminUser?.email || 'admin@placement.edu'
      );
      sendSuccess(
        res,
        `Drive selections finalized. ${result.selectedCount} selected, ${result.rejectedCount} unselected candidates marked as Rejected.`,
        result
      );
    } catch (error) {
      next(error);
    }
  };

  notifyEligibleStudents = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = String(req.params.id);
      const result = await this.service.notifyEligibleStudents(id);
      sendSuccess(res, `Dispatched notifications to ${result.notifiedCount} eligible candidates`, result);
    } catch (error) {
      next(error);
    }
  };

  getDriveStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = String(req.params.id);
      const stats = await this.service.getDriveCandidateStats(id);
      sendSuccess(res, 'Drive candidate statistics retrieved successfully', stats);
    } catch (error) {
      next(error);
    }
  };

  getDriveAuditLogs = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = String(req.params.id);
      const logs = await this.service.getDriveAuditLogs(id);
      sendSuccess(res, 'Drive candidate audit logs retrieved successfully', logs);
    } catch (error) {
      next(error);
    }
  };

  getSelectionOverview = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = String(req.params.id);
      const overview = await this.service.getDriveSelectionOverview(id);
      sendSuccess(res, 'Drive selection overview retrieved successfully', overview);
    } catch (error) {
      next(error);
    }
  };

  markCandidatesSelection = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = String(req.params.id);
      const adminUser = (req as any).user;
      const { registrationIds, status, remarks, notifyStudents } = req.body;

      const result = await this.service.markCandidatesSelection(
        id,
        { registrationIds, status, remarks, notifyStudents },
        adminUser || { id: 'admin', email: 'admin@placement.edu' }
      );
      sendSuccess(res, `Successfully marked ${result.updatedCount} candidate(s) as ${result.status}`, result);
    } catch (error) {
      next(error);
    }
  };

  getStudentDriveHistory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const studentId = String(req.params.studentId);
      const history = await this.service.getStudentDriveHistory(studentId);
      sendSuccess(res, 'Student drive history retrieved successfully', history);
    } catch (error) {
      next(error);
    }
  };
}

export const placementDriveController = new PlacementDriveController();
