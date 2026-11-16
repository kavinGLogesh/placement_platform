import { Response } from 'express';
import { chatRepository } from '../repositories/chat.repository.js';
import { prisma } from '../config/prisma.config.js';
import {
  ChatGroupDto,
  ChatGroupMemberDto,
  ChatMessageDto,
  CreateChatGroupInput,
  UpdateChatGroupInput,
  CreateChatMessageInput,
  ChatEventPayload,
} from '../types/chat.types.js';
import { AppError } from '../middleware/errorHandler.js';
import { Role } from '../types/auth.types.js';

/**
 * SSE Connection Manager for Real-Time WhatsApp-Style Chat Broadcasts
 */
class ChatEventManager {
  private userClients: Map<string, Set<Response>> = new Map();

  addClient(userId: string, res: Response): void {
    let clientSet = this.userClients.get(userId);
    if (!clientSet) {
      clientSet = new Set<Response>();
      this.userClients.set(userId, clientSet);
    }
    clientSet.add(res);

    // Keep connection alive with heartbeat comment every 25 seconds
    const heartbeat = setInterval(() => {
      try {
        res.write(': heartbeat\n\n');
      } catch (err) {
        clearInterval(heartbeat);
      }
    }, 25000);

    res.on('close', () => {
      clearInterval(heartbeat);
      clientSet?.delete(res);
      if (clientSet && clientSet.size === 0) {
        this.userClients.delete(userId);
      }
    });
  }

  /**
   * Broadcast an event to all connected members of a group
   */
  async broadcastToGroup(groupId: string, payload: ChatEventPayload): Promise<void> {
    try {
      const memberUserIds = await chatRepository.getGroupMemberUserIds(groupId);
      const dataStr = `event: chat_event\ndata: ${JSON.stringify(payload)}\n\n`;

      for (const userId of memberUserIds) {
        const clientSet = this.userClients.get(userId);
        if (clientSet && clientSet.size > 0) {
          for (const client of clientSet) {
            try {
              client.write(dataStr);
            } catch (err) {
              // Ignore broken connection; it will be pruned on 'close'
            }
          }
        }
      }
    } catch (error) {
      console.error('[ChatEventManager] Error broadcasting event:', error);
    }
  }

  /**
   * Send an event directly to a specific user (e.g. unread count or direct update)
   */
  sendToUser(userId: string, payload: ChatEventPayload): void {
    const clientSet = this.userClients.get(userId);
    if (!clientSet || clientSet.size === 0) return;

    const dataStr = `event: chat_event\ndata: ${JSON.stringify(payload)}\n\n`;
    for (const client of clientSet) {
      try {
        client.write(dataStr);
      } catch (err) {
        // Handled on close
      }
    }
  }
}

export const chatEventManager = new ChatEventManager();

export class ChatService {
  private isAdminRole(role: Role): boolean {
    return role === 'SUPER_ADMIN' || role === 'PLACEMENT_ADMIN';
  }

  /**
   * List all groups accessible to user
   */
  async getGroups(
    userId: string,
    filter?: string,
    search?: string
  ): Promise<ChatGroupDto[]> {
    return chatRepository.getGroupsForUser(userId, filter, search);
  }

  /**
   * Get specific group details with membership verification
   */
  async getGroupDetails(
    groupId: string,
    userId: string,
    userRole: Role
  ): Promise<ChatGroupDto> {
    const isMember = await chatRepository.isUserMember(groupId, userId);
    const isAdmin = this.isAdminRole(userRole);

    if (!isMember && !isAdmin) {
      throw new AppError('Forbidden: You are not a member of this chat group', 403);
    }

    const group = await chatRepository.getGroupById(groupId, userId);
    if (!group) {
      throw new AppError('Chat group not found', 404);
    }

    return group;
  }

  /**
   * Create a new group (Admins only)
   */
  async createGroup(input: CreateChatGroupInput, userRole: Role): Promise<ChatGroupDto> {
    if (!this.isAdminRole(userRole)) {
      throw new AppError('Forbidden: Only Placement Admin or Super Admin can create groups', 403);
    }

    if (!input.name || !input.name.trim()) {
      throw new AppError('Group name is required', 400);
    }

    const group = await chatRepository.createGroup(input);

    // Broadcast group creation to members
    chatEventManager.broadcastToGroup(group.id, {
      type: 'GROUP_UPDATED',
      groupId: group.id,
      data: group,
    });

    return group;
  }

  /**
   * Update an existing group (Admins only)
   */
  async updateGroup(
    groupId: string,
    input: UpdateChatGroupInput,
    userRole: Role
  ): Promise<ChatGroupDto> {
    if (!this.isAdminRole(userRole)) {
      throw new AppError('Forbidden: Only Placement Admin or Super Admin can manage groups', 403);
    }

    const updated = await chatRepository.updateGroup(groupId, input);
    if (!updated) {
      throw new AppError('Chat group not found', 404);
    }

    chatEventManager.broadcastToGroup(groupId, {
      type: 'GROUP_UPDATED',
      groupId,
      data: updated,
    });

    return updated;
  }

  /**
   * Delete a chat group (Admins only)
   */
  async deleteGroup(groupId: string, userRole: Role): Promise<boolean> {
    if (!this.isAdminRole(userRole)) {
      throw new AppError('Forbidden: Only Placement Admin or Super Admin can delete groups', 403);
    }

    // Broadcast deletion before removing
    await chatEventManager.broadcastToGroup(groupId, {
      type: 'GROUP_UPDATED',
      groupId,
      data: { isDeleted: true, groupId },
    });

    return chatRepository.deleteGroup(groupId);
  }

  /**
   * Map academic department to group with student auto-sync (Admins only)
   */
  async addDepartmentToGroup(
    groupId: string,
    departmentId: string,
    userRole: Role
  ): Promise<void> {
    if (!this.isAdminRole(userRole)) {
      throw new AppError('Forbidden: Only admins can configure department mapping', 403);
    }

    await chatRepository.addDepartmentToGroup(groupId, departmentId);

    const updatedGroup = await chatRepository.getGroupById(groupId);
    chatEventManager.broadcastToGroup(groupId, {
      type: 'GROUP_UPDATED',
      groupId,
      data: updatedGroup,
    });
  }

  /**
   * Remove academic department from group with student auto-sync (Admins only)
   */
  async removeDepartmentFromGroup(
    groupId: string,
    departmentId: string,
    userRole: Role
  ): Promise<void> {
    if (!this.isAdminRole(userRole)) {
      throw new AppError('Forbidden: Only admins can configure department mapping', 403);
    }

    await chatRepository.removeDepartmentFromGroup(groupId, departmentId);

    const updatedGroup = await chatRepository.getGroupById(groupId);
    chatEventManager.broadcastToGroup(groupId, {
      type: 'GROUP_UPDATED',
      groupId,
      data: updatedGroup,
    });
  }

  /**
   * Manually trigger department synchronization for a group (Admins only)
   */
  async syncGroupDepartments(groupId: string, userRole: Role): Promise<{ count: number }> {
    if (!this.isAdminRole(userRole)) {
      throw new AppError('Forbidden: Only admins can trigger department synchronization', 403);
    }

    const count = await chatRepository.syncGroupDepartmentMembers(groupId);
    const updatedGroup = await chatRepository.getGroupById(groupId);

    chatEventManager.broadcastToGroup(groupId, {
      type: 'GROUP_UPDATED',
      groupId,
      data: updatedGroup,
    });

    return { count };
  }

  /**
   * Add direct members to group (Admins only)
   */
  async addMembers(
    groupId: string,
    userIds: string[],
    userRole: Role
  ): Promise<{ added: number }> {
    if (!this.isAdminRole(userRole)) {
      throw new AppError('Forbidden: Only admins can add members directly', 403);
    }

    if (!userIds || userIds.length === 0) {
      throw new AppError('User IDs are required to add members', 400);
    }

    const added = await chatRepository.addMembersToGroup(groupId, userIds, 'MEMBER', true);

    chatEventManager.broadcastToGroup(groupId, {
      type: 'MEMBER_JOINED',
      groupId,
      data: { userIds, count: added },
    });

    return { added };
  }

  /**
   * Remove member from group (Admin can remove anyone; member can leave themselves)
   */
  async removeMember(
    groupId: string,
    targetUserId: string,
    currentUserId: string,
    currentUserRole: Role
  ): Promise<boolean> {
    const isAdmin = this.isAdminRole(currentUserRole);
    const isSelf = targetUserId === currentUserId;

    if (!isAdmin && !isSelf) {
      throw new AppError('Forbidden: You can only remove yourself from this group', 403);
    }

    await chatRepository.removeMemberFromGroup(groupId, targetUserId);

    chatEventManager.broadcastToGroup(groupId, {
      type: 'MEMBER_LEFT',
      groupId,
      data: { userId: targetUserId },
    });

    return true;
  }

  /**
   * Get members roster for group
   */
  async getGroupMembers(
    groupId: string,
    userId: string,
    userRole: Role,
    search?: string
  ): Promise<ChatGroupMemberDto[]> {
    const isMember = await chatRepository.isUserMember(groupId, userId);
    const isAdmin = this.isAdminRole(userRole);

    if (!isMember && !isAdmin) {
      throw new AppError('Forbidden: Access denied to group members list', 403);
    }

    return chatRepository.getGroupMembers(groupId, search);
  }

  /**
   * Get messages for a group with permission verification
   */
  async getMessages(
    groupId: string,
    userId: string,
    userRole: Role,
    limit: number = 50,
    before?: string
  ): Promise<ChatMessageDto[]> {
    const isMember = await chatRepository.isUserMember(groupId, userId);
    const isAdmin = this.isAdminRole(userRole);

    if (!isMember && !isAdmin) {
      throw new AppError('Forbidden: You cannot view messages for a group you are not a member of', 403);
    }

    // Automatically mark read when loading messages
    await chatRepository.markGroupAsRead(groupId, userId);

    return chatRepository.getMessages(groupId, limit, before);
  }

  /**
   * Send a new message, upload attachment or reply
   */
  async sendMessage(
    input: Omit<CreateChatMessageInput, 'senderId'>,
    userId: string,
    userRole: Role,
    userEmail: string
  ): Promise<ChatMessageDto> {
    const isMember = await chatRepository.isUserMember(input.groupId, userId);
    const isAdmin = this.isAdminRole(userRole);

    if (!isMember && !isAdmin) {
      throw new AppError('Forbidden: You must be a group member to send messages', 403);
    }

    // Lookup user display name
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        role: true,
        student: {
          select: { name: true },
        },
      },
    });

    const senderName =
      user?.student?.name ||
      userEmail.split('@')[0] ||
      'User';

    const senderRole = user?.role || userRole;

    const message = await chatRepository.createMessage({
      groupId: input.groupId,
      senderId: userId,
      senderName,
      senderRole,
      content: input.content,
      messageType: input.messageType || 'TEXT',
      fileUrl: input.fileUrl,
      fileName: input.fileName,
      fileSize: input.fileSize,
      mimeType: input.mimeType,
      replyToId: input.replyToId,
    });

    // Real-time broadcast to all online group members via SSE
    chatEventManager.broadcastToGroup(input.groupId, {
      type: 'NEW_MESSAGE',
      groupId: input.groupId,
      data: message,
    });

    return message;
  }

  /**
   * Mark group as read by user
   */
  async markGroupAsRead(groupId: string, userId: string): Promise<void> {
    await chatRepository.markGroupAsRead(groupId, userId);

    chatEventManager.sendToUser(userId, {
      type: 'READ_RECEIPT',
      groupId,
      data: { groupId, userId, readAt: new Date() },
    });
  }

  /**
   * Get all departments for group setup
   */
  async getDepartments(): Promise<any[]> {
    return chatRepository.getAvailableDepartments();
  }

  /**
   * Search eligible users to add to group
   */
  async searchUsers(search?: string, departmentId?: string): Promise<any[]> {
    return chatRepository.searchUsers(search, departmentId);
  }
}

export const chatService = new ChatService();

