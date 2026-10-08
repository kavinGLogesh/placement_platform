import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env.config.js';
import { requestLogger } from './middleware/requestLogger.js';
import { errorHandler } from './middleware/errorHandler.js';
import { notFoundHandler } from './middleware/notFoundHandler.js';
import { apiRouter } from './routes/api.router.js';

export const createApp = (): Express => {
  const app = express();

  // Security headers
  app.use(helmet());

  // Cross-Origin Resource Sharing
  const configuredOrigins = env.CORS_ORIGIN === '*'
    ? '*'
    : env.CORS_ORIGIN.split(',').map((origin) => origin.trim()).filter(Boolean);

  const defaultAllowedOrigins = [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5174',
  ];

  app.use(
    cors({
      origin: (requestOrigin, callback) => {
        // Allow requests with no origin (such as mobile apps, curl, server-to-server)
        if (!requestOrigin) {
          return callback(null, true);
        }
        if (configuredOrigins === '*') {
          return callback(null, true);
        }
        if (Array.isArray(configuredOrigins) && configuredOrigins.includes(requestOrigin)) {
          return callback(null, true);
        }
        if (defaultAllowedOrigins.includes(requestOrigin)) {
          return callback(null, true);
        }
        // In non-production environments, allow any localhost/127.0.0.1 port (e.g., dynamic Vite ports)
        if (env.NODE_ENV !== 'production') {
          const isLocalhost = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(requestOrigin);
          if (isLocalhost) {
            return callback(null, true);
          }
        }
        return callback(null, false);
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Timestamp'],
      exposedHeaders: ['Content-Disposition'],
    })
  );

  // Request parsing middlewares
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // HTTP Request Logger
  app.use(requestLogger);

  // Mount REST API routes
  app.use('/api', apiRouter);

  // 404 Route Handler
  app.use(notFoundHandler);

  // Centralized Error Handling Middleware
  app.use(errorHandler);

  return app;
};

export const app = createApp();
