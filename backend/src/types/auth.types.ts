import { Role } from '@prisma/client';

export { Role };

export interface TokenPayload {
  sub: string;
  email: string;
  role: Role;
  studentId?: string;
  mustChangePassword?: boolean;
}

export interface StudentProfileDto {
  id: string;
  registerNumber: string;
  department: string;
  batchYear: number;
  cgpa: number | null;
}

export interface CurrentUserDto {
  id: string;
  email: string;
  role: Role;
  isActive: boolean;
  mustChangePassword?: boolean;
  student?: StudentProfileDto | null;
}

export interface AuthResponseData {
  user: CurrentUserDto;
  accessToken: string;
  refreshToken: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface RefreshDto {
  refreshToken: string;
}

export interface LogoutDto {
  refreshToken: string;
}

export interface ChangePasswordDto {
  currentPassword?: string;
  newPassword: string;
}

// Extend Express Request to include authenticated user
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}
