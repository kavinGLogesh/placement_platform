import { useQuery } from '@tanstack/react-query';
import { healthService } from '../services/health.service.js';
import { HealthResponse } from '../types/health.types.js';

export interface HealthCheckState {
  data?: HealthResponse;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  latencyMs: number | null;
  lastChecked: Date | null;
  refetch: () => void;
  isFetching: boolean;
}

export const useHealthCheck = (): HealthCheckState => {
  const query = useQuery<HealthResponse, Error>({
    queryKey: ['system-health'],
    queryFn: async () => {
      const startTime = performance.now();
      const result = await healthService.checkApiHealth();
      const endTime = performance.now();
      // Store latency in session/local state if desired
      (result as HealthResponse & { latencyMs?: number }).latencyMs = Math.round(endTime - startTime);
      return result;
    },
    retry: 2,
    retryDelay: 1000,
    refetchInterval: 30000, // Background poll every 30 seconds
    staleTime: 5000,
  });

  const latencyMs = (query.data as (HealthResponse & { latencyMs?: number }) | undefined)?.latencyMs ?? null;

  return {
    data: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    latencyMs,
    lastChecked: query.dataUpdatedAt ? new Date(query.dataUpdatedAt) : null,
    refetch: query.refetch,
    isFetching: query.isFetching,
  };
};
