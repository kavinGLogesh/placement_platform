export type Role = 'SUPER_ADMIN' | 'PLACEMENT_ADMIN' | 'STUDENT';

export interface StudentProfile {
  id: string;
  registerNumber: string;
  department: string;
  batchYear: number;
  cgpa: number | null;
}

export interface User {
  id: string;
  email: string;
  role: Role;
  isActive: boolean;
  mustChangePassword?: boolean;
  student?: StudentProfile | null;
}

export interface AuthResponseData {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface RefreshResponseData {
  accessToken: string;
  refreshToken: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthContextType {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<User>;
  logout: () => Promise<void>;
  updatePasswordCompleted: () => void;
}

