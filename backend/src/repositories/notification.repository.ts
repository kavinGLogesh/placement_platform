import { prisma } from '../config/prisma.config.js';
import { StudentNotificationDto } from '../types/placement-drive.types.js';

export interface CreateNotificationInput {
  studentId: string;
  title: string;
  message: string;
  type?: string;
  driveId?: string | null;
}

export class NotificationRepository {
  private memNotifications: Map<string, StudentNotificationDto> = new Map();

  async createNotification(input: CreateNotificationInput): Promise<StudentNotificationDto> {
    if (process.env.NODE_ENV === 'test') {
      const id = `notif-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
      const notif: StudentNotificationDto = {
        id,
        studentId: input.studentId,
        title: input.title,
        message: input.message,
        type: input.type || 'GENERAL',
        driveId: input.driveId || null,
        read: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.memNotifications.set(id, notif);
      return notif;
    }

    const created = await prisma.studentNotification.create({
      data: {
        studentId: input.studentId,
        title: input.title,
        message: input.message,
        type: input.type || 'GENERAL',
        driveId: input.driveId || null,
      },
      include: {
        drive: {
          select: {
            id: true,
            companyName: true,
            jobRole: true,
          },
        },
      },
    });

    return created as unknown as StudentNotificationDto;
  }

  async createBulkNotifications(inputs: CreateNotificationInput[]): Promise<number> {
    if (inputs.length === 0) return 0;

    if (process.env.NODE_ENV === 'test') {
      for (const input of inputs) {
        await this.createNotification(input);
      }
      return inputs.length;
    }

    const res = await prisma.studentNotification.createMany({
      data: inputs.map((i) => ({
        studentId: i.studentId,
        title: i.title,
        message: i.message,
        type: i.type || 'GENERAL',
        driveId: i.driveId || null,
      })),
    });

    return res.count;
  }

  async getStudentNotifications(studentId: string, limit: number = 50): Promise<StudentNotificationDto[]> {
    if (process.env.NODE_ENV === 'test') {
      const all = Array.from(this.memNotifications.values())
        .filter((n) => n.studentId === studentId)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, limit);
      return all;
    }

    const notifs = await prisma.studentNotification.findMany({
      where: { studentId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        drive: {
          select: {
            id: true,
            companyName: true,
            jobRole: true,
          },
        },
      },
    });

    return notifs as unknown as StudentNotificationDto[];
  }

  async getUnreadCount(studentId: string): Promise<number> {
    if (process.env.NODE_ENV === 'test') {
      return Array.from(this.memNotifications.values()).filter(
        (n) => n.studentId === studentId && !n.read
      ).length;
    }

    return prisma.studentNotification.count({
      where: { studentId, read: false },
    });
  }

  async markAsRead(notificationId: string, studentId: string): Promise<boolean> {
    if (process.env.NODE_ENV === 'test') {
      const notif = this.memNotifications.get(notificationId);
      if (notif && notif.studentId === studentId) {
        notif.read = true;
        notif.updatedAt = new Date();
        return true;
      }
      return false;
    }

    const updated = await prisma.studentNotification.updateMany({
      where: { id: notificationId, studentId },
      data: { read: true },
    });

    return updated.count > 0;
  }

  async markAllAsRead(studentId: string): Promise<number> {
    if (process.env.NODE_ENV === 'test') {
      let count = 0;
      for (const notif of this.memNotifications.values()) {
        if (notif.studentId === studentId && !notif.read) {
          notif.read = true;
          notif.updatedAt = new Date();
          count++;
        }
      }
      return count;
    }

    const updated = await prisma.studentNotification.updateMany({
      where: { studentId, read: false },
      data: { read: true },
    });

    return updated.count;
  }
}

export const notificationRepository = new NotificationRepository();
