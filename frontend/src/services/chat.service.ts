import { apiClient } from '../api/axios.client.js';
import {
  ChatGroup,
  ChatMessage,
  ChatGroupMember,
  CreateChatGroupInput,
  UpdateChatGroupInput,
  SendChatMessageInput,
  ChatEventPayload,
} from '../types/chat.types.js';

interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

export const chatService = {
  /**
   * Fetch all chat groups for the current user
   */
  async getGroups(filter?: string, search?: string): Promise<ChatGroup[]> {
    const params = new URLSearchParams();
    if (filter) params.append('filter', filter);
    if (search) params.append('search', search);

    const query = params.toString() ? `?${params.toString()}` : '';
    const res = await apiClient.get<ApiResponse<ChatGroup[]>>(`/chat/groups${query}`);
    return res.data.data;
  },

  /**
   * Fetch details of a specific chat group
   */
  async getGroupDetails(groupId: string): Promise<ChatGroup> {
    const res = await apiClient.get<ApiResponse<ChatGroup>>(`/chat/groups/${groupId}`);
    return res.data.data;
  },

  /**
   * Create a new chat group (Admins only)
   */
  async createGroup(input: CreateChatGroupInput): Promise<ChatGroup> {
    const res = await apiClient.post<ApiResponse<ChatGroup>>('/chat/groups', input);
    return res.data.data;
  },

  /**
   * Update an existing chat group
   */
  async updateGroup(groupId: string, input: UpdateChatGroupInput): Promise<ChatGroup> {
    const res = await apiClient.put<ApiResponse<ChatGroup>>(`/chat/groups/${groupId}`, input);
    return res.data.data;
  },

  /**
   * Delete a chat group
   */
  async deleteGroup(groupId: string): Promise<void> {
    await apiClient.delete<ApiResponse<void>>(`/chat/groups/${groupId}`);
  },

  /**
   * Add department to group
   */
  async addDepartment(groupId: string, departmentId: string): Promise<void> {
    await apiClient.post<ApiResponse<void>>(`/chat/groups/${groupId}/departments`, {
      departmentId,
    });
  },

  /**
   * Remove department from group
   */
  async removeDepartment(groupId: string, departmentId: string): Promise<void> {
    await apiClient.delete<ApiResponse<void>>(
      `/chat/groups/${groupId}/departments/${departmentId}`
    );
  },

  /**
   * Manually trigger department sync
   */
  async syncDepartments(groupId: string): Promise<{ count: number }> {
    const res = await apiClient.post<ApiResponse<{ count: number }>>(
      `/chat/groups/${groupId}/departments/sync`
    );
    return res.data.data;
  },

  /**
   * Get member roster of a group
   */
  async getGroupMembers(groupId: string, search?: string): Promise<ChatGroupMember[]> {
    const params = new URLSearchParams();
    if (search) params.append('search', search);

    const query = params.toString() ? `?${params.toString()}` : '';
    const res = await apiClient.get<ApiResponse<ChatGroupMember[]>>(
      `/chat/groups/${groupId}/members${query}`
    );
    return res.data.data;
  },

  /**
   * Add direct members to group
   */
  async addMembers(groupId: string, userIds: string[]): Promise<{ added: number }> {
    const res = await apiClient.post<ApiResponse<{ added: number }>>(
      `/chat/groups/${groupId}/members`,
      { userIds }
    );
    return res.data.data;
  },

  /**
   * Remove member from group
   */
  async removeMember(groupId: string, userId: string): Promise<void> {
    await apiClient.delete<ApiResponse<void>>(`/chat/groups/${groupId}/members/${userId}`);
  },

  /**
   * Get messages for a group
   */
  async getMessages(groupId: string, limit: number = 50, before?: string): Promise<ChatMessage[]> {
    const params = new URLSearchParams();
    params.append('limit', String(limit));
    if (before) params.append('before', before);

    const res = await apiClient.get<ApiResponse<ChatMessage[]>>(
      `/chat/groups/${groupId}/messages?${params.toString()}`
    );
    return res.data.data;
  },

  /**
   * Send a new message
   */
  async sendMessage(groupId: string, input: SendChatMessageInput): Promise<ChatMessage> {
    const res = await apiClient.post<ApiResponse<ChatMessage>>(
      `/chat/groups/${groupId}/messages`,
      input
    );
    return res.data.data;
  },

  /**
   * Upload an attachment
   */
  async uploadAttachment(
    file: File
  ): Promise<{ fileUrl: string; fileName: string; fileSize: number; mimeType: string }> {
    const formData = new FormData();
    formData.append('file', file);

    const res = await apiClient.post<
      ApiResponse<{ fileUrl: string; fileName: string; fileSize: number; mimeType: string }>
    >('/chat/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return res.data.data;
  },

  /**
   * Mark group as read
   */
  async markAsRead(groupId: string): Promise<void> {
    await apiClient.post<ApiResponse<void>>(`/chat/groups/${groupId}/read`);
  },

  /**
   * Get departments list
   */
  async getDepartments(): Promise<any[]> {
    const res = await apiClient.get<ApiResponse<any[]>>('/chat/departments');
    return res.data.data;
  },

  /**
   * Search users for group direct member addition
   */
  async searchUsers(search?: string, departmentId?: string): Promise<any[]> {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (departmentId) params.append('departmentId', departmentId);

    const res = await apiClient.get<ApiResponse<any[]>>(`/chat/users?${params.toString()}`);
    return res.data.data;
  },

  /**
   * Connect to real-time Server-Sent Events stream
   */
  subscribeToChatEvents(
    onEvent: (payload: ChatEventPayload) => void,
    onError?: (err: any) => void
  ): () => void {
    const token = localStorage.getItem('placement_access_token');
    if (!token) {
      return () => {};
    }

    const baseURL = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');
    const streamUrl = `${baseURL}/chat/stream?token=${encodeURIComponent(token)}`;

    const eventSource = new EventSource(streamUrl);

    eventSource.addEventListener('chat_event', (event: MessageEvent) => {
      try {
        const payload: ChatEventPayload = JSON.parse(event.data);
        onEvent(payload);
      } catch (err) {
        console.error('Failed to parse SSE chat event:', err);
      }
    });

    eventSource.onerror = (err) => {
      if (onError) onError(err);
    };

    return () => {
      eventSource.close();
    };
  },
};

