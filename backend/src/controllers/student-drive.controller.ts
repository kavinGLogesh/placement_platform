import { Request, Response, NextFunction } from 'express';
import { placementDriveService } from '../services/placement-drive.service.js';
import { notificationRepository } from '../repositories/notification.repository.js';
import { resolveStudentId } from './attempt.controller.js';
import { sendSuccess } from '../utils/response.util.js';
import { AppError } from '../middleware/errorHandler.js';

export class StudentDriveController {
  private async getStudentInfo(req: Request): Promise<{ studentId: string; email: string }> {
    const user = (req as any).user;
    if (!user || user.role !== 'STUDENT') {
      throw new AppError('Unauthorized student workspace access', 403);
    }
    const studentId = await resolveStudentId(req);
    return {
      studentId,
      email: user.email,
    };
  }

  getDrives = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { studentId } = await this.getStudentInfo(req);
      const drives = await placementDriveService.getStudentDrives(studentId);
      sendSuccess(res, 'Student placement drives retrieved successfully', drives);
    } catch (error) {
      next(error);
    }
  };

  applyForDrive = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { studentId, email } = await this.getStudentInfo(req);
      const driveId = String(req.params.id);

      const registration = await placementDriveService.applyForDrive(driveId, studentId, email);
      sendSuccess(res, 'Application submitted successfully', registration, 201);
    } catch (error) {
      next(error);
    }
  };

  getNotifications = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { studentId } = await this.getStudentInfo(req);
      const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 50;

      const [notifications, unreadCount] = await Promise.all([
        notificationRepository.getStudentNotifications(studentId, limit),
        notificationRepository.getUnreadCount(studentId),
      ]);

      sendSuccess(res, 'Student notifications retrieved successfully', {
        notifications,
        unreadCount,
      });
    } catch (error) {
      next(error);
    }
  };

  markNotificationAsRead = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { studentId } = await this.getStudentInfo(req);
      const notifId = String(req.params.id);

      const success = await notificationRepository.markAsRead(notifId, studentId);
      if (!success) {
        throw new AppError('Notification not found or already read', 404);
      }

      sendSuccess(res, 'Notification marked as read', { success: true });
    } catch (error) {
      next(error);
    }
  };

  markAllNotificationsAsRead = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { studentId } = await this.getStudentInfo(req);
      const count = await notificationRepository.markAllAsRead(studentId);
      sendSuccess(res, 'All notifications marked as read', { markedCount: count });
    } catch (error) {
      next(error);
    }
  };
}

export const studentDriveController = new StudentDriveController();
