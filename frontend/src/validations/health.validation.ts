import { HealthResponse } from '../types/health.types.js';

/**
 * Validates whether an unknown object conforms to HealthResponse contract
 */
export const isValidHealthResponse = (data: unknown): data is HealthResponse => {
  if (typeof data !== 'object' || data === null) {
    return false;
  }
  const obj = data as Record<string, unknown>;
  return typeof obj.success === 'boolean' && typeof obj.message === 'string';
};
