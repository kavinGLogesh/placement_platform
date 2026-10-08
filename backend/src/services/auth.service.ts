import { UserRepository, userRepository } from '../repositories/user.repository.js';
import { verifyPassword, hashPassword } from '../utils/password.util.js';
import {
  generateAccessToken,
  generateRefreshToken,
  getRefreshTokenExpiry,
} from '../utils/jwt.util.js';
import {
  LoginDto,
  RefreshDto,
  LogoutDto,
  AuthResponseData,
  CurrentUserDto,
  ChangePasswordDto,
} from '../types/auth.types.js';
import { managementRepository } from '../repositories/management.repository.js';
import { StudentStatus } from '@prisma/client';
import { AppError } from '../middleware/errorHandler.js';

export class AuthService {
  constructor(private readonly userRepo: UserRepository = userRepository) {}

  /**
   * Authenticates user credentials and issues Access + Refresh tokens
   */
  async login(dto: LoginDto): Promise<AuthResponseData> {
    const rawIdentifier = (dto as any).identifier || dto.email;
    const identifier = typeof rawIdentifier === 'string' ? rawIdentifier.trim() : '';

    let user = identifier.includes('@')
      ? await this.userRepo.findByEmail(identifier)
      : await this.userRepo.findByRegisterNumber(identifier);

    // Fallback if not found initially
    if (!user) {
      if (identifier.includes('@')) {
        user = await this.userRepo.findByRegisterNumber(identifier);
      } else {
        user = await this.userRepo.findByEmail(identifier);
      }
    }

    if (!user) {
      throw new AppError('Invalid email or password', 401);
    }

    if (!user.isActive) {
      throw new AppError('Account is deactivated. Please contact support.', 401);
    }

    const isPasswordValid = await verifyPassword(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new AppError('Invalid email or password', 401);
    }

    const userDto = this.userRepo.toDto(user);

    // Generate tokens
    const accessToken = generateAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role,
      studentId: user.student?.id,
      mustChangePassword: userDto.mustChangePassword,
    });

    const refreshTokenString = generateRefreshToken();
    const expiresAt = getRefreshTokenExpiry();

    await this.userRepo.createRefreshToken(user.id, refreshTokenString, expiresAt);

    return {
      user: userDto,
      accessToken,
      refreshToken: refreshTokenString,
    };
  }

  /**
   * Refreshes access token using valid, non-revoked refresh token
   */
  async refreshToken(dto: RefreshDto): Promise<{ accessToken: string; refreshToken: string }> {
    const tokenRecord = await this.userRepo.findRefreshToken(dto.refreshToken);

    if (!tokenRecord) {
      throw new AppError('Invalid refresh token', 401);
    }

    if (tokenRecord.isRevoked) {
      throw new AppError('Refresh token has been revoked', 401);
    }

    if (new Date() > new Date(tokenRecord.expiresAt)) {
      throw new AppError('Refresh token has expired', 401);
    }

    const user = await this.userRepo.findById(tokenRecord.userId);
    if (!user || !user.isActive) {
      throw new AppError('User not found or deactivated', 401);
    }

    // Revoke used refresh token for rotation
    await this.userRepo.revokeRefreshToken(dto.refreshToken);

    // Issue new pair
    const newAccessToken = generateAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    const newRefreshToken = generateRefreshToken();
    await this.userRepo.createRefreshToken(user.id, newRefreshToken, getRefreshTokenExpiry());

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }

  /**
   * Revokes refresh token on user logout
   */
  async logout(dto: LogoutDto): Promise<void> {
    if (dto.refreshToken) {
      await this.userRepo.revokeRefreshToken(dto.refreshToken);
    }
  }

  /**
   * Retrieves profile details for currently authenticated user
   */
  async getCurrentUser(userId: string): Promise<CurrentUserDto> {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }
    return this.userRepo.toDto(user);
  }

  /**
   * Changes password for authenticated user and clears first-login required flag
   */
  async changePassword(userId: string, dto: ChangePasswordDto): Promise<void> {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    if (dto.currentPassword) {
      const isCurrentValid = await verifyPassword(dto.currentPassword, user.passwordHash);
      if (!isCurrentValid) {
        throw new AppError('Incorrect current password', 400);
      }

      if (dto.newPassword === dto.currentPassword) {
        throw new AppError('New password cannot be the same as current password', 400);
      }
    }

    // Password policy: min 8 chars, at least 1 uppercase, 1 lowercase, 1 digit, 1 special character
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,}$/;
    if (!passwordRegex.test(dto.newPassword)) {
      throw new AppError(
        'Password must be at least 8 characters long and include uppercase, lowercase, numbers, and special characters',
        400
      );
    }

    const newHash = await hashPassword(dto.newPassword);
    await this.userRepo.updatePassword(userId, newHash);
    await this.userRepo.setMustChangePassword(userId, false);

    // If linked student exists and was INACTIVE, activate them
    if (user.student?.id) {
      await managementRepository.updateStudent(user.student.id, { status: StudentStatus.ACTIVE });
    }
  }
}

export const authService = new AuthService();
