import { app } from './app.js';
import { env } from './config/env.config.js';
import { logger } from './utils/logger.util.js';
import { disconnectPrisma } from './config/prisma.config.js';

const server = app.listen(env.PORT, () => {
  logger.info('====================================================');
  logger.info(`🚀 College Placement API Server running on port ${env.PORT}`);
  logger.info(`🌐 Environment: ${env.NODE_ENV}`);
  logger.info(`🔗 Health Check: http://localhost:${env.PORT}/api/health`);
  logger.info('====================================================');
});

// Graceful shutdown handling
const shutdown = async (signal: string) => {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);

  server.close(async () => {
    logger.info('HTTP server closed.');
    await disconnectPrisma();
    logger.info('Database connection closed.');
    process.exit(0);
  });

  // Force exit if shutdown takes longer than 10 seconds
  setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
