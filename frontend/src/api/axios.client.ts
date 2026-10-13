import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';

const baseURL = import.meta.env.VITE_API_BASE_URL || '/api';

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

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else if (token) {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Response Interceptor: Uniform error formatting & queued silent token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as
      (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;
    const isLoginEndpoint = originalRequest?.url?.includes('/auth/login');
    const isRefreshEndpoint = originalRequest?.url?.includes('/auth/refresh');

    // Automatic silent token refresh on 401 Unauthorized (except for /auth/login and /auth/refresh)
    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !isLoginEndpoint &&
      !isRefreshEndpoint
    ) {
      if (isRefreshing) {
        // Queue parallel requests that arrive while refresh is already in flight
        return new Promise<unknown>((resolve, reject) => {
          failedQueue.push({
            resolve: (token: string) => {
              originalRequest.headers.set('Authorization', `Bearer ${token}`);
              resolve(apiClient(originalRequest));
            },
            reject: (err: unknown) => {
              reject(err);
            },
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem('placement_refresh_token');
      if (!refreshToken) {
        isRefreshing = false;
        localStorage.removeItem('placement_access_token');
        localStorage.removeItem('placement_refresh_token');
        if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
          sessionStorage.setItem(
            'auth_expired_message',
            'Your session has expired. Please log in again.'
          );
          window.location.href = '/login?expired=true';
        }
        return Promise.reject(new Error('Session expired. Please log in again.'));
      }

      try {
        // Direct plain axios post to prevent circular interceptor invocation
        const refreshRes = await axios.post(`${baseURL}/auth/refresh`, { refreshToken });
        const newAccessToken = refreshRes.data?.data?.accessToken;
        const newRefreshToken = refreshRes.data?.data?.refreshToken;

        if (!newAccessToken) {
          throw new Error('Refresh response missing access token');
        }

        localStorage.setItem('placement_access_token', newAccessToken);
        if (newRefreshToken) {
          localStorage.setItem('placement_refresh_token', newRefreshToken);
        }
        apiClient.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`;
        originalRequest.headers.set('Authorization', `Bearer ${newAccessToken}`);

        processQueue(null, newAccessToken);
        isRefreshing = false;

        return apiClient(originalRequest);
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        isRefreshing = false;
        localStorage.removeItem('placement_access_token');
        localStorage.removeItem('placement_refresh_token');
        if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
          sessionStorage.setItem(
            'auth_expired_message',
            'Your session has expired. Please log in again.'
          );
          window.location.href = '/login?expired=true';
        }
        return Promise.reject(new Error('Session expired. Please log in again.'));
      }
    }

    const responseData = error.response?.data as Record<string, unknown> | undefined;
    const serverMessage =
      responseData && typeof responseData === 'object' && 'message' in responseData
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
