import React, { createContext, useState, useEffect } from 'react';
import { User, LoginCredentials, AuthContextType } from '../types/auth.types.js';
import { authService } from '../services/auth.service.js';
import { apiClient } from '../api/axios.client.js';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'placement_access_token';
const REFRESH_KEY = 'placement_refresh_token';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Synchronize Axios default Authorization header whenever token changes
  useEffect(() => {
    if (accessToken) {
      apiClient.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
    } else {
      delete apiClient.defaults.headers.common['Authorization'];
    }
  }, [accessToken]);

  // Attempt session restoration on initial mount
  useEffect(() => {
    const restoreSession = async () => {
      const storedToken = localStorage.getItem(TOKEN_KEY);
      const storedRefresh = localStorage.getItem(REFRESH_KEY);

      if (!storedToken) {
        setIsLoading(false);
        return;
      }

      try {
        const currentUser = await authService.getMe(storedToken);
        setUser(currentUser);
        setAccessToken(storedToken);
      } catch {
        // Access token might be expired; try refreshing with refresh token
        if (storedRefresh) {
          try {
            const { accessToken: newToken, refreshToken: newRefresh } = await authService.refresh(storedRefresh);
            localStorage.setItem(TOKEN_KEY, newToken);
            localStorage.setItem(REFRESH_KEY, newRefresh);
            setAccessToken(newToken);
            const currentUser = await authService.getMe(newToken);
            setUser(currentUser);
          } catch {
            // Both expired, clear session
            localStorage.removeItem(TOKEN_KEY);
            localStorage.removeItem(REFRESH_KEY);
            setUser(null);
            setAccessToken(null);
          }
        } else {
          localStorage.removeItem(TOKEN_KEY);
          setUser(null);
          setAccessToken(null);
        }
      } finally {
        setIsLoading(false);
      }
    };

    restoreSession();
  }, []);

  const login = async (credentials: LoginCredentials): Promise<User> => {
    const data = await authService.login(credentials);
    localStorage.setItem(TOKEN_KEY, data.accessToken);
    localStorage.setItem(REFRESH_KEY, data.refreshToken);
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${data.accessToken}`;
    setAccessToken(data.accessToken);
    setUser(data.user);
    return data.user;
  };

  const logout = async (): Promise<void> => {
    const storedRefresh = localStorage.getItem(REFRESH_KEY);
    if (storedRefresh) {
      try {
        await authService.logout(storedRefresh);
      } catch {
        // Ignore network errors during logout
      }
    }
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
    delete apiClient.defaults.headers.common['Authorization'];
    setUser(null);
    setAccessToken(null);
  };

  const updatePasswordCompleted = (): void => {
    setUser((prev) => (prev ? { ...prev, mustChangePassword: false } : null));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        updatePasswordCompleted,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};


export { AuthContext };

