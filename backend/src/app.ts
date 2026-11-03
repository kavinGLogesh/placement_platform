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
  const configuredOrigins =
    env.CORS_ORIGIN === '*'
      ? '*'
      : env.CORS_ORIGIN.split(',')
          .map((origin) => origin.trim())
          .filter(Boolean);

  const defaultAllowedOrigins = [
    'http://localhost:5000',
    'http://localhost:5173',
    'http://localhost:5174',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5174',
    'https://2ftgsjl0-5000.inc1.devtunnels.ms/',
    'https://2ftgsjl0-5173.inc1.devtunnels.ms/',
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
        const cleanOrigin = requestOrigin.replace(/\/$/, '');
        if (defaultAllowedOrigins.some(d => d.replace(/\/$/, '') === cleanOrigin) || cleanOrigin.includes('devtunnels.ms') || cleanOrigin.includes('localhost') || cleanOrigin.includes('127.0.0.1')) {
          return callback(null, true);
        }
        // In non-production environments, allow any localhost, loopback, or private LAN IP (10.x, 192.168.x, 172.16-31.x)
        if (env.NODE_ENV !== 'production') {
          const isLocalOrLan = /^https?:\/\/(localhost|127\.0\.0\.1|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})(:\d+)?$/.test(cleanOrigin);
          if (isLocalOrLan) {
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
