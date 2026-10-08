import { prisma } from '../config/prisma.config.js';

export interface DatabasePingResult {
  connected: boolean;
  latencyMs: number;
  details?: string;
}

export class HealthRepository {
  async pingDatabase(): Promise<DatabasePingResult> {
    const startTime = Date.now();
    try {
      await prisma.$queryRaw`SELECT 1`;
      const latencyMs = Date.now() - startTime;
      return {
        connected: true,
        latencyMs,
      };
    } catch (error) {
      const latencyMs = Date.now() - startTime;
      const message = error instanceof Error ? error.message : 'Unknown database error';
      return {
        connected: false,
        latencyMs,
        details: message,
      };
    }
  }
}

export const healthRepository = new HealthRepository();
