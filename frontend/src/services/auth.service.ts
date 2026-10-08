import { apiClient } from '../api/axios.client.js';
import {
  LoginCredentials,
  AuthResponseData,
  RefreshResponseData,
  User,
} from '../types/auth.types.js';
import { ApiResponse } from '../types/api.types.js';

export const authService = {
  /**
   * Authenticates user credentials
   */
  login: async (credentials: LoginCredentials): Promise<AuthResponseData> => {
    const response = await apiClient.post<ApiResponse<AuthResponseData>>(
      '/auth/login',
      credentials
    );
    if (!response.data.data) {
      throw new Error('Missing authentication data in server response');
    }
    return response.data.data;
  },

  /**
   * Refreshes access token
   */
  refresh: async (refreshToken: string): Promise<RefreshResponseData> => {
    const response = await apiClient.post<ApiResponse<RefreshResponseData>>('/auth/refresh', {
      refreshToken,
    });
    if (!response.data.data) {
      throw new Error('Missing token data in refresh response');
    }
    return response.data.data;
  },

  /**
   * Revokes refresh token on logout
   */
  logout: async (refreshToken: string): Promise<void> => {
    await apiClient.post('/auth/logout', { refreshToken });
  },

  /**
   * Retrieves profile for currently authenticated user
   */
  getMe: async (accessToken: string): Promise<User> => {
    const response = await apiClient.get<ApiResponse<{ user: User }>>('/auth/me', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    if (!response.data.data?.user) {
      throw new Error('User details not returned by /auth/me');
    }
    return response.data.data.user;
  },

  /**
   * Changes password for authenticated user (e.g. from Account page or on first login)
   */
  changePassword: async (currentPasswordOrNew: string, maybeNewPassword?: string): Promise<void> => {
    let currentPassword: string | undefined;
    let newPassword = currentPasswordOrNew;

    if (maybeNewPassword !== undefined) {
      currentPassword = currentPasswordOrNew;
      newPassword = maybeNewPassword;
    }

    await apiClient.post('/auth/change-password', {
      currentPassword: currentPassword || undefined,
      newPassword,
    });
  },
};

