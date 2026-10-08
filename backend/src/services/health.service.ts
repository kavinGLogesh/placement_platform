import { HealthRepository, healthRepository } from '../repositories/health.repository.js';
import { HealthResponse, DbHealthResponse } from '../types/health.types.js';

export class HealthService {
  constructor(private readonly repository: HealthRepository = healthRepository) {}

  getApiHealth(): HealthResponse {
    return {
      success: true,
      message: 'API is running',
    };
  }

  async getDatabaseHealth(): Promise<DbHealthResponse> {
    const dbStatus = await this.repository.pingDatabase();

    return {
      success: dbStatus.connected,
      message: dbStatus.connected ? 'Database is connected' : 'Database connection failed',
      data: {
        database: 'MySQL 8.x',
        status: dbStatus.connected ? 'CONNECTED' : 'DISCONNECTED',
        latencyMs: dbStatus.latencyMs,
        timestamp: new Date().toISOString(),
        details: dbStatus.details,
      },
    };
  }
}

export const healthService = new HealthService();
