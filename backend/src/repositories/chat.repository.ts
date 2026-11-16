import { prisma } from '../config/prisma.config.js';
import {
  ChatGroupDto,
  ChatGroupMemberDto,
  ChatMessageDto,
  CreateChatGroupInput,
  UpdateChatGroupInput,
  CreateChatMessageInput,
  ChatMemberRole,
} from '../types/chat.types.js';

export class ChatRepository {
  /**
   * Retrieve all groups that a user has access to, with last message, unread count, and metadata.
   */
  async getGroupsForUser(
    userId: string,
    filter?: string,
    search?: string
  ): Promise<ChatGroupDto[]> {
    // Find all memberships for this user
    const memberships = await prisma.chatGroupMember.findMany({
      where: { userId },
      select: {
        groupId: true,
        role: true,
        lastReadAt: true,
      },
    });

    const groupIds = memberships.map((m) => m.groupId);
    if (groupIds.length === 0) {
      return [];
    }

    const whereClause: any = {
      id: { in: groupIds },
      isArchived: false,
    };

    if (filter) {
      if (filter === 'DEPARTMENT') {
        whereClause.type = { in: ['DEPARTMENT', 'CROSS_DEPARTMENT'] };
      } else if (filter === 'PLACEMENT_DRIVE') {
        whereClause.type = 'PLACEMENT_DRIVE';
      } else if (filter === 'CUSTOM') {
        whereClause.type = { in: ['CUSTOM', 'UG_ALL', 'PG_ALL', 'BROADCAST'] };
      }
    }

    if (search && search.trim()) {
      whereClause.name = {
        contains: search.trim(),
      };
    }

    const groups = await prisma.chatGroup.findMany({
      where: whereClause,
      include: {
        createdBy: {
          select: {
            id: true,
            email: true,
            role: true,
          },
        },
        departments: {
          include: {
            department: {
              select: {
                id: true,
                name: true,
                code: true,
              },
            },
          },
        },
        _count: {
          select: {
            members: true,
          },
        },
        messages: {
          where: { isDeleted: false },
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: {
            sender: {
              select: {
                id: true,
                email: true,
                role: true,
                student: {
                  select: { name: true },
                },
              },
            },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const memberMap = new Map(memberships.map((m) => [m.groupId, m]));

    // Calculate unread counts for each group
    const results: ChatGroupDto[] = await Promise.all(
      groups.map(async (group) => {
        const member = memberMap.get(group.id);
        const lastReadAt = member?.lastReadAt || new Date(0);

        const unreadCount = await prisma.chatMessage.count({
          where: {
            groupId: group.id,
            isDeleted: false,
            senderId: { not: userId },
            createdAt: { gt: lastReadAt },
          },
        });

        const latestMsg = group.messages[0];
        let lastMessageDto: ChatMessageDto | null = null;
        if (latestMsg) {
          const senderName =
            latestMsg.senderName ||
            latestMsg.sender?.student?.name ||
            latestMsg.sender?.email.split('@')[0] ||
            'Unknown';

          lastMessageDto = {
            id: latestMsg.id,
            groupId: latestMsg.groupId,
            senderId: latestMsg.senderId,
            senderName,
            senderRole: latestMsg.senderRole || latestMsg.sender?.role || 'STUDENT',
            content: latestMsg.content,
            messageType: latestMsg.messageType,
            fileUrl: latestMsg.fileUrl,
            fileName: latestMsg.fileName,
            fileSize: latestMsg.fileSize,
            mimeType: latestMsg.mimeType,
            replyToId: latestMsg.replyToId,
            isDeleted: latestMsg.isDeleted,
            createdAt: latestMsg.createdAt,
            updatedAt: latestMsg.updatedAt,
          };
        }

        const creatorName = group.createdBy.email.split('@')[0];

        return {
          id: group.id,
          name: group.name,
          description: group.description,
          avatarUrl: group.avatarUrl,
          type: group.type,
          createdById: group.createdById,
          createdByName: creatorName,
          isArchived: group.isArchived,
          createdAt: group.createdAt,
          updatedAt: group.updatedAt,
          departments: group.departments.map((d) => ({
            id: d.id,
            departmentId: d.department.id,
            departmentName: d.department.name,
            departmentCode: d.department.code,
          })),
          memberCount: group._count.members,
          unreadCount,
          lastMessage: lastMessageDto,
          currentUserRole: member?.role || null,
        };
      })
    );

    if (filter === 'UNREAD') {
      return results.filter((g) => (g.unreadCount || 0) > 0);
    }

    return results;
  }

  /**
   * Get single group details with departments and membership.
   */
  async getGroupById(groupId: string, userId?: string): Promise<ChatGroupDto | null> {
    const group = await prisma.chatGroup.findUnique({
      where: { id: groupId },
      include: {
        createdBy: {
          select: {
            id: true,
            email: true,
            role: true,
          },
        },
        departments: {
          include: {
            department: {
              select: {
                id: true,
                name: true,
                code: true,
              },
            },
          },
        },
        _count: {
          select: {
            members: true,
          },
        },
        messages: {
          where: { isDeleted: false },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!group) return null;

    let currentUserRole: ChatMemberRole | null = null;
    let unreadCount = 0;

    if (userId) {
      const member = await prisma.chatGroupMember.findUnique({
        where: {
          groupId_userId: {
            groupId,
            userId,
          },
        },
      });
      currentUserRole = member?.role || null;

      if (member) {
        unreadCount = await prisma.chatMessage.count({
          where: {
            groupId,
            isDeleted: false,
            senderId: { not: userId },
            createdAt: { gt: member.lastReadAt },
          },
        });
      }
    }

    return {
      id: group.id,
      name: group.name,
      description: group.description,
      avatarUrl: group.avatarUrl,
      type: group.type,
      createdById: group.createdById,
      createdByName: group.createdBy.email.split('@')[0],
      isArchived: group.isArchived,
      createdAt: group.createdAt,
      updatedAt: group.updatedAt,
      departments: group.departments.map((d) => ({
        id: d.id,
        departmentId: d.department.id,
        departmentName: d.department.name,
        departmentCode: d.department.code,
      })),
      memberCount: group._count.members,
      unreadCount,
      currentUserRole,
    };
  }

  /**
   * Check if a specific user is a verified member of a group.
   */
  async isUserMember(groupId: string, userId: string): Promise<boolean> {
    const member = await prisma.chatGroupMember.findUnique({
      where: {
        groupId_userId: {
          groupId,
          userId,
        },
      },
    });
    return !!member;
  }

  /**
   * Get user's membership role in a group.
   */
  async getMemberRole(groupId: string, userId: string): Promise<ChatMemberRole | null> {
    const member = await prisma.chatGroupMember.findUnique({
      where: {
        groupId_userId: {
          groupId,
          userId,
        },
      },
      select: { role: true },
    });
    return member?.role || null;
  }

  /**
   * Create a new Chat Group, assign creator as ADMIN, map departments, and sync members.
   */
  async createGroup(input: CreateChatGroupInput): Promise<ChatGroupDto> {
    const createdGroup = await prisma.chatGroup.create({
      data: {
        name: input.name,
        description: input.description,
        avatarUrl: input.avatarUrl,
        type: input.type || 'CUSTOM',
        createdById: input.createdById,
        members: {
          create: {
            userId: input.createdById,
            role: 'ADMIN',
            isDirectAdded: true,
          },
        },
        departments:
          input.departmentIds && input.departmentIds.length > 0
            ? {
                create: input.departmentIds.map((deptId) => ({
                  departmentId: deptId,
                })),
              }
            : undefined,
      },
    });

    // Add additional direct members if provided
    if (input.initialMemberUserIds && input.initialMemberUserIds.length > 0) {
      const distinctUsers = input.initialMemberUserIds.filter(
        (id) => id !== input.createdById
      );
      for (const uid of distinctUsers) {
        await prisma.chatGroupMember.upsert({
          where: {
            groupId_userId: {
              groupId: createdGroup.id,
              userId: uid,
            },
          },
          update: {},
          create: {
            groupId: createdGroup.id,
            userId: uid,
            role: 'MEMBER',
            isDirectAdded: true,
          },
        });
      }
    }

    // If departments are mapped, synchronize students automatically
    if (input.departmentIds && input.departmentIds.length > 0) {
      await this.syncGroupDepartmentMembers(createdGroup.id);
    }

    const fullGroup = await this.getGroupById(createdGroup.id, input.createdById);
    return fullGroup!;
  }

  /**
   * Update Group settings (name, description, avatar, type, archive, departments).
   */
  async updateGroup(groupId: string, input: UpdateChatGroupInput): Promise<ChatGroupDto | null> {
    await prisma.chatGroup.update({
      where: { id: groupId },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.avatarUrl !== undefined ? { avatarUrl: input.avatarUrl } : {}),
        ...(input.type !== undefined ? { type: input.type } : {}),
        ...(input.isArchived !== undefined ? { isArchived: input.isArchived } : {}),
      },
    });

    if (input.departmentIds !== undefined) {
      const existingDepts = await prisma.chatGroupDepartment.findMany({
        where: { groupId },
        select: { departmentId: true },
      });
      const existingDeptIds = new Set(existingDepts.map((d) => d.departmentId));
      const targetDeptIds = new Set(input.departmentIds);

      const toRemove = [...existingDeptIds].filter((id) => !targetDeptIds.has(id));
      if (toRemove.length > 0) {
        await prisma.chatGroupDepartment.deleteMany({
          where: {
            groupId,
            departmentId: { in: toRemove },
          },
        });
      }

      const toAdd = [...targetDeptIds].filter((id) => !existingDeptIds.has(id));
      for (const deptId of toAdd) {
        await prisma.chatGroupDepartment.upsert({
          where: {
            groupId_departmentId: {
              groupId,
              departmentId: deptId,
            },
          },
          update: {},
          create: {
            groupId,
            departmentId: deptId,
          },
        });
      }

      await this.syncGroupDepartmentMembers(groupId);
    }

    return this.getGroupById(groupId);
  }

  /**
   * Delete a chat group.
   */
  async deleteGroup(groupId: string): Promise<boolean> {
    await prisma.chatGroup.delete({
      where: { id: groupId },
    });
    return true;
  }

  /**
   * Add a department to a group and auto-sync students belonging to that department.
   */
  async addDepartmentToGroup(groupId: string, departmentId: string): Promise<void> {
    await prisma.chatGroupDepartment.upsert({
      where: {
        groupId_departmentId: {
          groupId,
          departmentId,
        },
      },
      update: {},
      create: {
        groupId,
        departmentId,
      },
    });

    await this.syncGroupDepartmentMembers(groupId);
  }

  /**
   * Remove a department from a group and auto-remove department-synced students.
   */
  async removeDepartmentFromGroup(groupId: string, departmentId: string): Promise<void> {
    await prisma.chatGroupDepartment.deleteMany({
      where: {
        groupId,
        departmentId,
      },
    });

    await this.syncGroupDepartmentMembers(groupId);
  }

  /**
   * Synchronize group members with mapped academic departments:
   * - Students in mapped departments are added as group members (isDirectAdded: false).
   * - Students no longer in mapped departments are removed IF isDirectAdded == false.
   * - Directly added members (isDirectAdded == true) are preserved intact.
   */
  async syncGroupDepartmentMembers(groupId: string): Promise<number> {
    // 1. Get all mapped department IDs for this group
    const groupDepts = await prisma.chatGroupDepartment.findMany({
      where: { groupId },
      select: { departmentId: true },
    });

    const departmentIds = groupDepts.map((d) => d.departmentId);

    // If no departments mapped, remove all department-synced members
    if (departmentIds.length === 0) {
      const deleted = await prisma.chatGroupMember.deleteMany({
        where: {
          groupId,
          isDirectAdded: false,
        },
      });
      return deleted.count;
    }

    // 2. Fetch all active students belonging to these departments who have a valid user account
    const departmentStudents = await prisma.student.findMany({
      where: {
        departmentId: { in: departmentIds },
        userId: { not: null as any },
      },
      select: {
        id: true,
        userId: true,
      },
    });

    const activeUserIds = new Set(
      departmentStudents
        .map((s) => s.userId)
        .filter((id): id is string => Boolean(id))
    );

    // 3. Find current members of this group
    const currentMembers = await prisma.chatGroupMember.findMany({
      where: { groupId },
      select: {
        id: true,
        userId: true,
        isDirectAdded: true,
      },
    });

    const currentMemberUserIds = new Set(currentMembers.map((m) => m.userId));

    // 4. Add missing students
    const usersToAdd: string[] = [];
    for (const uid of activeUserIds) {
      if (!currentMemberUserIds.has(uid)) {
        usersToAdd.push(uid);
      }
    }

    if (usersToAdd.length > 0) {
      await prisma.chatGroupMember.createMany({
        data: usersToAdd.map((userId) => ({
          groupId,
          userId,
          role: 'MEMBER' as ChatMemberRole,
          isDirectAdded: false,
        })),
        skipDuplicates: true,
      });
    }

    // 5. Remove members whose department is no longer linked (only if isDirectAdded: false)
    const membersToRemove = currentMembers.filter(
      (m) => !m.isDirectAdded && !activeUserIds.has(m.userId)
    );

    if (membersToRemove.length > 0) {
      await prisma.chatGroupMember.deleteMany({
        where: {
          groupId,
          userId: { in: membersToRemove.map((m) => m.userId) },
          isDirectAdded: false,
        },
      });
    }

    return usersToAdd.length;
  }

  /**
   * Add individual users directly to the group.
   */
  async addMembersToGroup(
    groupId: string,
    userIds: string[],
    role: ChatMemberRole = 'MEMBER',
    isDirectAdded: boolean = true
  ): Promise<number> {
    let count = 0;
    for (const userId of userIds) {
      await prisma.chatGroupMember.upsert({
        where: {
          groupId_userId: {
            groupId,
            userId,
          },
        },
        update: {
          role,
          isDirectAdded: isDirectAdded ? true : undefined,
        },
        create: {
          groupId,
          userId,
          role,
          isDirectAdded,
        },
      });
      count++;
    }
    return count;
  }

  /**
   * Remove a member from the group.
   */
  async removeMemberFromGroup(groupId: string, userId: string): Promise<boolean> {
    await prisma.chatGroupMember.deleteMany({
      where: {
        groupId,
        userId,
      },
    });
    return true;
  }

  /**
   * List members of a group with user/student details.
   */
  async getGroupMembers(groupId: string, search?: string): Promise<ChatGroupMemberDto[]> {
    const members = await prisma.chatGroupMember.findMany({
      where: { groupId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
            student: {
              select: {
                name: true,
                registerNumber: true,
                department: {
                  select: { name: true },
                },
              },
            },
          },
        },
      },
      orderBy: [
        { role: 'asc' }, // ADMIN, MODERATOR, MEMBER
        { joinedAt: 'asc' },
      ],
    });

    const mapped = members.map((m) => {
      const student = m.user.student;
      const userName = student?.name || m.user.email.split('@')[0];
      return {
        id: m.id,
        groupId: m.groupId,
        userId: m.userId,
        userName,
        userEmail: m.user.email,
        userRole: m.user.role,
        departmentName: student?.department?.name || null,
        registerNumber: student?.registerNumber || null,
        role: m.role,
        joinedAt: m.joinedAt,
        lastReadAt: m.lastReadAt,
        isDirectAdded: m.isDirectAdded,
      };
    });

    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      return mapped.filter(
        (m) =>
          m.userName.toLowerCase().includes(q) ||
          m.userEmail.toLowerCase().includes(q) ||
          (m.registerNumber && m.registerNumber.toLowerCase().includes(q)) ||
          (m.departmentName && m.departmentName.toLowerCase().includes(q))
      );
    }

    return mapped;
  }

  /**
   * Fetch messages for a group with pagination and replies.
   */
  async getMessages(
    groupId: string,
    limit: number = 50,
    before?: string
  ): Promise<ChatMessageDto[]> {
    const whereClause: any = {
      groupId,
      isDeleted: false,
    };

    if (before) {
      const target = await prisma.chatMessage.findUnique({
        where: { id: before },
        select: { createdAt: true },
      });
      if (target) {
        whereClause.createdAt = { lt: target.createdAt };
      }
    }

    const messages = await prisma.chatMessage.findMany({
      where: whereClause,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        sender: {
          select: {
            id: true,
            email: true,
            role: true,
            student: {
              select: { name: true },
            },
          },
        },
        replyTo: {
          select: {
            id: true,
            senderName: true,
            content: true,
            messageType: true,
          },
        },
        _count: {
          select: {
            readReceipts: true,
          },
        },
      },
    });

    // Return in chronological order
    const ordered = messages.reverse();

    return ordered.map((msg) => {
      const senderName =
        msg.senderName ||
        msg.sender?.student?.name ||
        msg.sender?.email.split('@')[0] ||
        'User';

      return {
        id: msg.id,
        groupId: msg.groupId,
        senderId: msg.senderId,
        senderName,
        senderRole: msg.senderRole || msg.sender?.role || 'STUDENT',
        content: msg.content,
        messageType: msg.messageType,
        fileUrl: msg.fileUrl,
        fileName: msg.fileName,
        fileSize: msg.fileSize,
        mimeType: msg.mimeType,
        replyToId: msg.replyToId,
        replyTo: msg.replyTo
          ? {
              id: msg.replyTo.id,
              senderName: msg.replyTo.senderName || 'Member',
              content: msg.replyTo.content,
              messageType: msg.replyTo.messageType,
            }
          : null,
        isDeleted: msg.isDeleted,
        createdAt: msg.createdAt,
        updatedAt: msg.updatedAt,
        readByCount: msg._count.readReceipts,
      };
    });
  }

  /**
   * Post a new message to the group and update group's updatedAt.
   */
  async createMessage(input: CreateChatMessageInput): Promise<ChatMessageDto> {
    const message = await prisma.chatMessage.create({
      data: {
        groupId: input.groupId,
        senderId: input.senderId,
        senderName: input.senderName,
        senderRole: input.senderRole,
        content: input.content || null,
        messageType: input.messageType || 'TEXT',
        fileUrl: input.fileUrl || null,
        fileName: input.fileName || null,
        fileSize: input.fileSize || null,
        mimeType: input.mimeType || null,
        replyToId: input.replyToId || null,
      },
      include: {
        replyTo: {
          select: {
            id: true,
            senderName: true,
            content: true,
            messageType: true,
          },
        },
      },
    });

    // Update group's updatedAt so active chats float to the top
    await prisma.chatGroup.update({
      where: { id: input.groupId },
      data: { updatedAt: new Date() },
    });

    // Sender automatically marks their own lastReadAt
    await prisma.chatGroupMember.updateMany({
      where: {
        groupId: input.groupId,
        userId: input.senderId,
      },
      data: {
        lastReadAt: new Date(),
      },
    });

    return {
      id: message.id,
      groupId: message.groupId,
      senderId: message.senderId,
      senderName: message.senderName || 'User',
      senderRole: message.senderRole || 'STUDENT',
      content: message.content,
      messageType: message.messageType,
      fileUrl: message.fileUrl,
      fileName: message.fileName,
      fileSize: message.fileSize,
      mimeType: message.mimeType,
      replyToId: message.replyToId,
      replyTo: message.replyTo
        ? {
            id: message.replyTo.id,
            senderName: message.replyTo.senderName || 'Member',
            content: message.replyTo.content,
            messageType: message.replyTo.messageType,
          }
        : null,
      isDeleted: message.isDeleted,
      createdAt: message.createdAt,
      updatedAt: message.updatedAt,
      readByCount: 0,
    };
  }

  /**
   * Mark all unread messages in a group as read by this user.
   */
  async markGroupAsRead(groupId: string, userId: string): Promise<void> {
    const now = new Date();

    await prisma.chatGroupMember.updateMany({
      where: {
        groupId,
        userId,
      },
      data: {
        lastReadAt: now,
      },
    });

    // Also record receipt for recent messages
    const recentMessages = await prisma.chatMessage.findMany({
      where: {
        groupId,
        isDeleted: false,
        senderId: { not: userId },
      },
      select: { id: true },
      take: 50,
      orderBy: { createdAt: 'desc' },
    });

    for (const msg of recentMessages) {
      await prisma.chatMessageReceipt.upsert({
        where: {
          messageId_userId: {
            messageId: msg.id,
            userId,
          },
        },
        update: {
          readAt: now,
        },
        create: {
          messageId: msg.id,
          userId,
          readAt: now,
        },
      });
    }
  }

  /**
   * Fetch all academic departments for group creation / department mapping.
   */
  async getAvailableDepartments(): Promise<any[]> {
    return prisma.department.findMany({
      select: {
        id: true,
        name: true,
        code: true,
        _count: {
          select: {
            students: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Search potential users to add directly to groups (Admins, staff, students).
   */
  async searchUsers(search?: string, departmentId?: string, limit: number = 30): Promise<any[]> {
    const whereClause: any = {};

    if (departmentId) {
      whereClause.student = {
        departmentId,
      };
    }

    if (search && search.trim()) {
      const q = search.trim();
      whereClause.OR = [
        { email: { contains: q } },
        { student: { name: { contains: q } } },
        { student: { registerNumber: { contains: q } } },
      ];
    }

    const users = await prisma.user.findMany({
      where: whereClause,
      take: limit,
      select: {
        id: true,
        email: true,
        role: true,
        student: {
          select: {
            id: true,
            name: true,
            registerNumber: true,
            department: {
              select: {
                id: true,
                name: true,
                code: true,
              },
            },
          },
        },
      },
      orderBy: { email: 'asc' },
    });

    return users.map((u) => ({
      userId: u.id,
      email: u.email,
      role: u.role,
      name: u.student?.name || u.email.split('@')[0],
      registerNumber: u.student?.registerNumber || null,
      departmentName: u.student?.department?.name || null,
      departmentCode: u.student?.department?.code || null,
    }));
  }

  /**
   * Get member user IDs for a group (used for broadcasting SSE notifications).
   */
  async getGroupMemberUserIds(groupId: string): Promise<string[]> {
    const members = await prisma.chatGroupMember.findMany({
      where: { groupId },
      select: { userId: true },
    });
    return members.map((m) => m.userId);
  }
}

export const chatRepository = new ChatRepository();
