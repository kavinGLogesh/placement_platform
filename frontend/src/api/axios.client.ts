import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';

const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

export const apiClient: AxiosInstance = axios.create({
  baseURL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// Request Interceptor: Attach timestamp and stored bearer token
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Add custom trace timestamp
    config.headers.set('X-Request-Timestamp', new Date().toISOString());

    // Authoritatively attach the current placement_access_token from localStorage
    const token = localStorage.getItem('placement_access_token');
    if (token) {
      config.headers.set('Authorization', `Bearer ${token}`);
    } else {
      config.headers.delete('Authorization');
    }

    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: Uniform error formatting & silent token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;
    const isLoginEndpoint = originalRequest?.url?.includes('/auth/login');

    // Automatic silent token refresh on 401 Unauthorized (except for /auth/login)
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry && !isLoginEndpoint) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('placement_refresh_token');
      if (refreshToken) {
        try {
          // Direct axios call to avoid circular interceptor triggers
          const refreshRes = await axios.post(`${baseURL}/auth/refresh`, { refreshToken });
          const newAccessToken = refreshRes.data?.data?.accessToken;
          const newRefreshToken = refreshRes.data?.data?.refreshToken;
          if (newAccessToken) {
            localStorage.setItem('placement_access_token', newAccessToken);
            if (newRefreshToken) {
              localStorage.setItem('placement_refresh_token', newRefreshToken);
            }
            apiClient.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`;
            originalRequest.headers.set('Authorization', `Bearer ${newAccessToken}`);
            return apiClient(originalRequest);
          }
        } catch {
          // Both access & refresh expired -> purge stored session
          localStorage.removeItem('placement_access_token');
          localStorage.removeItem('placement_refresh_token');
        }
      }
    }

    const responseData = error.response?.data as Record<string, unknown> | undefined;
    const serverMessage = responseData && typeof responseData === 'object' && 'message' in responseData
      ? String(responseData.message)
      : undefined;

    // Reject with an enhanced Error object that preserves response, data, and message
    const errorDetails = Object.assign(
      new Error(serverMessage || error.message || 'Network communication failure'),
      {
        message: serverMessage || error.message || 'Network communication failure',
        statusCode: error.response?.status,
        code: error.code,
        response: error.response,
        data: error.response?.data,
      }
    );

    return Promise.reject(errorDetails);
  }
);
