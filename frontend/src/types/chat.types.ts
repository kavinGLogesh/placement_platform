export type ChatGroupType =
  | 'DEPARTMENT'
  | 'CROSS_DEPARTMENT'
  | 'UG_ALL'
  | 'PG_ALL'
  | 'CUSTOM'
  | 'BROADCAST'
  | 'PLACEMENT_DRIVE';

export type ChatMemberRole = 'ADMIN' | 'MODERATOR' | 'MEMBER';

export type ChatMessageType = 'TEXT' | 'IMAGE' | 'DOCUMENT' | 'FILE' | 'SYSTEM';

export interface ChatGroupDepartment {
  id: string;
  departmentId: string;
  departmentName: string;
  departmentCode: string;
}

export interface ChatMessage {
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
  createdAt: string;
  updatedAt: string;
  readByCount?: number;
}

export interface ChatGroup {
  id: string;
  name: string;
  description?: string | null;
  avatarUrl?: string | null;
  type: ChatGroupType;
  createdById: string;
  createdByName?: string;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
  departments?: ChatGroupDepartment[];
  memberCount: number;
  unreadCount?: number;
  lastMessage?: ChatMessage | null;
  currentUserRole?: ChatMemberRole | null;
}

export interface ChatGroupMember {
  id: string;
  groupId: string;
  userId: string;
  userName: string;
  userEmail: string;
  userRole: string;
  departmentName?: string | null;
  registerNumber?: string | null;
  role: ChatMemberRole;
  joinedAt: string;
  lastReadAt: string;
  isDirectAdded: boolean;
}

export interface CreateChatGroupInput {
  name: string;
  description?: string;
  avatarUrl?: string;
  type?: ChatGroupType;
  departmentIds?: string[];
  initialMemberUserIds?: string[];
}

export interface UpdateChatGroupInput {
  name?: string;
  description?: string;
  avatarUrl?: string;
  type?: ChatGroupType;
  isArchived?: boolean;
  departmentIds?: string[];
}

export interface SendChatMessageInput {
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

