import { Request, Response, NextFunction } from 'express';
import { chatService, chatEventManager } from '../services/chat.service.js';
import { verifyAccessToken } from '../utils/jwt.util.js';
import { AppError } from '../middleware/errorHandler.js';

export class ChatController {
  /**
   * Get all groups for current user
   */
  async getGroups(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.sub;
      const { filter, search } = req.query;

      const groups = await chatService.getGroups(
        userId,
        typeof filter === 'string' ? filter : undefined,
        typeof search === 'string' ? search : undefined
      );

      res.status(200).json({
        success: true,
        data: groups,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get specific group details
   */
  async getGroupDetails(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const groupId = String(req.params.groupId);
      const userId = req.user!.sub;
      const userRole = req.user!.role;

      const group = await chatService.getGroupDetails(groupId, userId, userRole);

      res.status(200).json({
        success: true,
        data: group,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create a new group (Admins only)
   */
  async createGroup(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.sub;
      const userRole = req.user!.role;
      const { name, description, avatarUrl, type, departmentIds, initialMemberUserIds } = req.body;

      const group = await chatService.createGroup(
        {
          name,
          description,
          avatarUrl,
          type,
          departmentIds,
          initialMemberUserIds,
          createdById: userId,
        },
        userRole
      );

      res.status(201).json({
        success: true,
        message: 'Chat group created successfully',
        data: group,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update an existing group
   */
  async updateGroup(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const groupId = String(req.params.groupId);
      const userRole = req.user!.role;
      const { name, description, avatarUrl, type, isArchived, departmentIds } = req.body;

      const group = await chatService.updateGroup(
        groupId,
        { name, description, avatarUrl, type, isArchived, departmentIds },
        userRole
      );

      res.status(200).json({
        success: true,
        message: 'Chat group updated successfully',
        data: group,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete a chat group
   */
  async deleteGroup(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const groupId = String(req.params.groupId);
      const userRole = req.user!.role;

      await chatService.deleteGroup(groupId, userRole);

      res.status(200).json({
        success: true,
        message: 'Chat group deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Add department mapping to group
   */
  async addDepartment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const groupId = String(req.params.groupId);
      const { departmentId } = req.body;
      const userRole = req.user!.role;

      if (!departmentId) {
        throw new AppError('departmentId is required', 400);
      }

      await chatService.addDepartmentToGroup(groupId, String(departmentId), userRole);

      res.status(200).json({
        success: true,
        message: 'Department added and student members synchronized',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Remove department mapping from group
   */
  async removeDepartment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const groupId = String(req.params.groupId);
      const departmentId = String(req.params.departmentId);
      const userRole = req.user!.role;

      await chatService.removeDepartmentFromGroup(groupId, departmentId, userRole);

      res.status(200).json({
        success: true,
        message: 'Department removed from group',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Re-sync department members
   */
  async syncDepartments(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const groupId = String(req.params.groupId);
      const userRole = req.user!.role;

      const result = await chatService.syncGroupDepartments(groupId, userRole);

      res.status(200).json({
        success: true,
        message: `Department membership synchronized (${result.count} students synced)`,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Add direct members to group
   */
  async addMembers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const groupId = String(req.params.groupId);
      const { userIds } = req.body;
      const userRole = req.user!.role;

      const result = await chatService.addMembers(groupId, userIds, userRole);

      res.status(200).json({
        success: true,
        message: `Successfully added ${result.added} member(s)`,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Remove member from group
   */
  async removeMember(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const groupId = String(req.params.groupId);
      const targetUserId = String(req.params.userId);
      const currentUserId = req.user!.sub;
      const currentUserRole = req.user!.role;

      await chatService.removeMember(groupId, targetUserId, currentUserId, currentUserRole);

      res.status(200).json({
        success: true,
        message: 'Member removed from group',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get members roster for group
   */
  async getMembers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const groupId = String(req.params.groupId);
      const userId = req.user!.sub;
      const userRole = req.user!.role;
      const { search } = req.query;

      const members = await chatService.getGroupMembers(
        groupId,
        userId,
        userRole,
        typeof search === 'string' ? search : undefined
      );

      res.status(200).json({
        success: true,
        data: members,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get messages for group
   */
  async getMessages(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const groupId = String(req.params.groupId);
      const userId = req.user!.sub;
      const userRole = req.user!.role;
      const { limit, before } = req.query;

      const parsedLimit = limit ? parseInt(limit as string, 10) : 50;
      const messages = await chatService.getMessages(
        groupId,
        userId,
        userRole,
        parsedLimit,
        typeof before === 'string' ? before : undefined
      );

      res.status(200).json({
        success: true,
        data: messages,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Send a new message or reply
   */
  async sendMessage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const groupId = String(req.params.groupId);
      const userId = req.user!.sub;
      const userRole = req.user!.role;
      const userEmail = req.user!.email;

      const { content, messageType, fileUrl, fileName, fileSize, mimeType, replyToId } = req.body;

      const message = await chatService.sendMessage(
        {
          groupId,
          content,
          messageType,
          fileUrl,
          fileName,
          fileSize,
          mimeType,
          replyToId,
        },
        userId,
        userRole,
        userEmail
      );

      res.status(201).json({
        success: true,
        message: 'Message sent',
        data: message,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Handle attachment file upload (images, docs, pdfs)
   */
  async uploadAttachment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.file) {
        throw new AppError('No file uploaded', 400);
      }

      const file = req.file;
      const fileUrl = `/uploads/chat/${file.filename}`;

      res.status(200).json({
        success: true,
        data: {
          fileUrl,
          fileName: file.originalname,
          fileSize: file.size,
          mimeType: file.mimetype,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Mark group read
   */
  async markAsRead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const groupId = String(req.params.groupId);
      const userId = req.user!.sub;

      await chatService.markGroupAsRead(groupId, userId);

      res.status(200).json({
        success: true,
        message: 'Group marked as read',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get available departments
   */
  async getDepartments(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const depts = await chatService.getDepartments();
      res.status(200).json({
        success: true,
        data: depts,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Search users to add directly to group
   */
  async searchUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { search, departmentId } = req.query;
      const users = await chatService.searchUsers(
        typeof search === 'string' ? search : undefined,
        typeof departmentId === 'string' ? departmentId : undefined
      );

      res.status(200).json({
        success: true,
        data: users,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Real-time Server-Sent Events (SSE) stream
   */
  async streamChatEvents(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Determine user from query param ?token=... or req.user
      let userId = req.user?.sub;

      if (!userId && req.query.token && typeof req.query.token === 'string') {
        try {
          const payload = verifyAccessToken(req.query.token);
          userId = payload.sub;
        } catch (err) {
          throw new AppError('Unauthorized: Invalid or expired stream token', 401);
        }
      }

      if (!userId) {
        throw new AppError('Unauthorized: Missing authentication for stream', 401);
      }

      // Configure headers for persistent HTTP Server-Sent Events
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache, no-transform');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');
      res.flushHeaders?.();

      // Initial connection ping
      res.write(': connected\n\n');

      chatEventManager.addClient(userId, res);
    } catch (error) {
      next(error);
    }
  }
}

export const chatController = new ChatController();
