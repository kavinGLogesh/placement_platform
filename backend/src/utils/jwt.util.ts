import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { env } from '../config/env.config.js';
import { TokenPayload } from '../types/auth.types.js';

/**
 * Signs a short-lived JWT access token (15 minutes)
 */
export const generateAccessToken = (payload: TokenPayload): string => {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });
};

/**
 * Verifies and decodes a JWT access token
 * Throws JsonWebTokenError or TokenExpiredError on failure
 */
export const verifyAccessToken = (token: string): TokenPayload => {
  return jwt.verify(token, env.JWT_SECRET) as TokenPayload;
};

/**
 * Generates a cryptographically random, unguessable refresh token string
 */
export const generateRefreshToken = (): string => {
  return crypto.randomBytes(40).toString('hex');
};

/**
 * Computes expiration date for a new refresh token (defaults to 7 days)
 */
export const getRefreshTokenExpiry = (): Date => {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now
  return expiresAt;
};
