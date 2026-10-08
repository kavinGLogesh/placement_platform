import { apiClient } from '../api/axios.client.js';
import { HealthResponse, DbHealthResponse } from '../types/health.types.js';

export const healthService = {
  /**
   * Calls GET /api/health
   */
  checkApiHealth: async (): Promise<HealthResponse> => {
    const response = await apiClient.get<HealthResponse>('/health');
    return response.data;
  },

  /**
   * Calls GET /api/health/db (optional database diagnostics)
   */
  checkDbHealth: async (): Promise<DbHealthResponse> => {
    const response = await apiClient.get<DbHealthResponse>('/health/db');
    return response.data;
  },
};
