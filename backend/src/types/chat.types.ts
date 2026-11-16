import { ChatGroupType, ChatMemberRole, ChatMessageType } from '@prisma/client';

export { ChatGroupType, ChatMemberRole, ChatMessageType };

export interface ChatGroupDto {
  id: string;
  name: string;
  description?: string | null;
  avatarUrl?: string | null;
  type: ChatGroupType;
  createdById: string;
  createdByName?: string;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
  departments?: {
    id: string;
    departmentId: string;
    departmentName: string;
    departmentCode: string;
  }[];
  memberCount: number;
  unreadCount?: number;
  lastMessage?: ChatMessageDto | null;
  currentUserRole?: ChatMemberRole | null;
}

export interface ChatGroupMemberDto {
  id: string;
  groupId: string;
  userId: string;
  userName: string;
  userEmail: string;
  userRole: string; // SUPER_ADMIN, PLACEMENT_ADMIN, STUDENT
  departmentName?: string | null;
  registerNumber?: string | null;
  role: ChatMemberRole; // ADMIN, MODERATOR, MEMBER
  joinedAt: Date;
  lastReadAt: Date;
  isDirectAdded: boolean;
}

export interface ChatMessageDto {
  id: string;
  groupId: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  senderAvatar?: string | null;
  content: string | null;
  messageType: ChatMessageType;
  fileUrl?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
  mimeType?: string | null;
  replyToId?: string | null;
  replyTo?: {
    id: string;
    senderName: string;
    content: string | null;
    messageType: ChatMessageType;
  } | null;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
  readByCount?: number;
}

export interface CreateChatGroupInput {
  name: string;
  description?: string;
  avatarUrl?: string;
  type?: ChatGroupType;
  departmentIds?: string[];
  initialMemberUserIds?: string[];
  createdById: string;
}

export interface UpdateChatGroupInput {
  name?: string;
  description?: string;
  avatarUrl?: string;
  type?: ChatGroupType;
  isArchived?: boolean;
  departmentIds?: string[];
}

export interface CreateChatMessageInput {
  groupId: string;
  senderId: string;
  senderName?: string;
  senderRole?: string;
  content?: string;
  messageType?: ChatMessageType;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  replyToId?: string;
}

export interface ChatEventPayload {
  type: 'NEW_MESSAGE' | 'GROUP_UPDATED' | 'MEMBER_JOINED' | 'MEMBER_LEFT' | 'READ_RECEIPT';
  groupId: string;
  data: any;
}

