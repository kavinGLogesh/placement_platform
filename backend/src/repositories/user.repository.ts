import { prisma } from '../config/prisma.config.js';
import { Role, CurrentUserDto } from '../types/auth.types.js';
import { hashPassword } from '../utils/password.util.js';

export interface UserRecord {
  id: string;
  email: string;
  passwordHash: string;
  role: Role;
  isActive: boolean;
  mustChangePassword?: boolean;
  createdAt: Date;
  updatedAt: Date;
  student?: {
    id: string;
    userId: string;
    registerNumber: string;
    department: string;
    batchYear: number;
    cgpa: number | null;
    status?: string;
  } | null;
}

export interface RefreshTokenRecord {
  id: string;
  token: string;
  userId: string;
  isRevoked: boolean;
  expiresAt: Date;
  createdAt: Date;
}

// In-memory fallback cache for isolated testing / offline mode
class InMemoryUserStore {
  private users: Map<string, UserRecord> = new Map();
  private refreshTokens: Map<string, RefreshTokenRecord> = new Map();
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Seed default accounts
    const superAdminHash = await hashPassword('SuperAdmin@123');
    const placementAdminHash = await hashPassword('PlacementAdmin@123');
    const studentHash = await hashPassword('Student@123');

    const superAdmin: UserRecord = {
      id: 'usr-super-admin-001',
      email: 'superadmin@placement.edu',
      passwordHash: superAdminHash,
      role: Role.SUPER_ADMIN,
      isActive: true,
      mustChangePassword: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const placementAdmin: UserRecord = {
      id: 'usr-placement-admin-001',
      email: 'placementadmin@placement.edu',
      passwordHash: placementAdminHash,
      role: Role.PLACEMENT_ADMIN,
      isActive: true,
      mustChangePassword: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const studentUser: UserRecord = {
      id: 'usr-student-001',
      email: 'student@placement.edu',
      passwordHash: studentHash,
      role: Role.STUDENT,
      isActive: true,
      mustChangePassword: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      student: {
        id: 'stu-001',
        userId: 'usr-student-001',
        registerNumber: '2026CS101',
        department: 'Computer Science & Engineering',
        batchYear: 2026,
        cgpa: 8.92,
        status: 'ACTIVE',
      },
    };

    const priyaUser: UserRecord = {
      id: 'usr-student-002',
      email: 'priya@placement.edu',
      passwordHash: studentHash,
      role: Role.STUDENT,
      isActive: true,
      mustChangePassword: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      student: {
        id: 'stu-002',
        userId: 'usr-student-002',
        registerNumber: '2026CS102',
        department: 'Computer Science & Engineering',
        batchYear: 2026,
        cgpa: 9.15,
        status: 'ACTIVE',
      },
    };

    this.users.set(superAdmin.email.toLowerCase(), superAdmin);
    this.users.set(placementAdmin.email.toLowerCase(), placementAdmin);
    this.users.set(studentUser.email.toLowerCase(), studentUser);
    this.users.set(priyaUser.email.toLowerCase(), priyaUser);
    this.initialized = true;
  }

  findByEmail(email: string): UserRecord | null {
    return this.users.get(email.toLowerCase()) || null;
  }

  findByRegisterNumber(registerNumber: string): UserRecord | null {
    const regUpper = registerNumber.trim().toUpperCase();
    for (const u of this.users.values()) {
      if (u.student?.registerNumber && u.student.registerNumber.toUpperCase() === regUpper) {
        return u;
      }
    }
    return null;
  }

  findById(id: string): UserRecord | null {
    for (const u of this.users.values()) {
      if (u.id === id) return u;
    }
    return null;
  }

  createUser(user: UserRecord): void {
    this.users.set(user.email.toLowerCase(), user);
  }

  updatePassword(userId: string, newPasswordHash: string): void {
    for (const u of this.users.values()) {
      if (u.id === userId) {
        u.passwordHash = newPasswordHash;
        u.mustChangePassword = false;
        if (u.student) {
          u.student.status = 'ACTIVE';
        }
        break;
      }
    }
  }

  setMustChangePassword(userId: string, mustChange: boolean): void {
    for (const u of this.users.values()) {
      if (u.id === userId) {
        u.mustChangePassword = mustChange;
        break;
      }
    }
  }

  deleteUser(userId: string): void {
    for (const [email, u] of this.users.entries()) {
      if (u.id === userId) {
        this.users.delete(email);
        break;
      }
    }
  }

  saveRefreshToken(record: RefreshTokenRecord): void {
    this.refreshTokens.set(record.token, record);
  }

  findRefreshToken(token: string): RefreshTokenRecord | null {
    return this.refreshTokens.get(token) || null;
  }

  revokeRefreshToken(token: string): void {
    const record = this.refreshTokens.get(token);
    if (record) {
      record.isRevoked = true;
    }
  }
}

export class UserRepository {
  public memStore = new InMemoryUserStore();
  private mustChangeCache = new Map<string, boolean>();

  constructor() {
    // Proactively initialize memory store
    this.memStore.initialize().catch((err) => console.error('Error init memStore:', err));
  }

  async findByEmail(email: string): Promise<UserRecord | null> {
    if (process.env.NODE_ENV === 'test') {
      await this.memStore.initialize();
      return this.memStore.findByEmail(email);
    }
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: { student: true },
    });
    if (!user) return null;
    const record = user as unknown as UserRecord;
    const isCached = this.mustChangeCache.get(user.id);
    record.mustChangePassword = isCached !== undefined ? isCached : Boolean(user.mustChangePassword ?? (record.student?.status === 'INACTIVE'));
    return record;
  }

  async findByRegisterNumber(registerNumber: string): Promise<UserRecord | null> {
    if (process.env.NODE_ENV === 'test') {
      await this.memStore.initialize();
      return this.memStore.findByRegisterNumber(registerNumber);
    }
    const student = await prisma.student.findFirst({
      where: {
        registerNumber: {
          equals: registerNumber.trim(),
        },
      },
      include: {
        user: {
          include: { student: true },
        },
      },
    });
    if (!student || !student.user) return null;
    const record = student.user as unknown as UserRecord;
    const isCached = this.mustChangeCache.get(student.user.id);
    record.mustChangePassword = isCached !== undefined ? isCached : Boolean(student.user.mustChangePassword ?? (student.status === 'INACTIVE'));
    return record;
  }

  async findById(id: string): Promise<UserRecord | null> {
    if (process.env.NODE_ENV === 'test') {
      await this.memStore.initialize();
      return this.memStore.findById(id);
    }
    const user = await prisma.user.findUnique({
      where: { id },
      include: { student: true },
    });
    if (!user) return null;
    const record = user as unknown as UserRecord;
    const isCached = this.mustChangeCache.get(user.id);
    record.mustChangePassword = isCached !== undefined ? isCached : Boolean(user.mustChangePassword ?? (record.student?.status === 'INACTIVE'));
    return record;
  }

  async createUser(data: {
    id?: string;
    email: string;
    passwordHash: string;
    role: Role;
    isActive?: boolean;
    mustChangePassword?: boolean;
    student?: any;
  }): Promise<UserRecord> {
    const id = data.id || `usr-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const record: UserRecord = {
      id,
      email: data.email.toLowerCase(),
      passwordHash: data.passwordHash,
      role: data.role,
      isActive: data.isActive ?? true,
      mustChangePassword: data.mustChangePassword ?? (data.role === Role.STUDENT),
      createdAt: new Date(),
      updatedAt: new Date(),
      student: data.student || null,
    };

    if (process.env.NODE_ENV === 'test') {
      await this.memStore.initialize();
      this.memStore.createUser(record);
      return record;
    }

    const created = await prisma.user.create({
      data: {
        id: record.id,
        email: record.email,
        passwordHash: record.passwordHash,
        role: record.role,
        isActive: record.isActive,
        mustChangePassword: Boolean(record.mustChangePassword),
      },
      include: { student: true },
    });

    this.mustChangeCache.set(created.id, record.mustChangePassword ?? true);
    return { ...(created as unknown as UserRecord), mustChangePassword: record.mustChangePassword };
  }

  async updatePassword(userId: string, newPasswordHash: string): Promise<void> {
    if (process.env.NODE_ENV === 'test') {
      this.memStore.updatePassword(userId, newPasswordHash);
      return;
    }

    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newPasswordHash, mustChangePassword: false },
    });
    this.mustChangeCache.set(userId, false);
  }

  async setMustChangePassword(userId: string, mustChange: boolean): Promise<void> {
    this.mustChangeCache.set(userId, mustChange);
    if (process.env.NODE_ENV === 'test') {
      this.memStore.setMustChangePassword(userId, mustChange);
      return;
    }
    try {
      await prisma.user.update({
        where: { id: userId },
        data: { mustChangePassword: mustChange },
      });
    } catch (e) {
      console.warn('Failed to update mustChangePassword in DB:', e);
    }
  }

  async deleteUser(userId: string): Promise<void> {
    this.mustChangeCache.delete(userId);
    if (process.env.NODE_ENV === 'test') {
      this.memStore.deleteUser(userId);
      return;
    }
    await prisma.user.delete({ where: { id: userId } });
  }

  async createRefreshToken(userId: string, token: string, expiresAt: Date): Promise<RefreshTokenRecord> {
    const record: RefreshTokenRecord = {
      id: `rt-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      token,
      userId,
      isRevoked: false,
      expiresAt,
      createdAt: new Date(),
    };

    if (process.env.NODE_ENV === 'test') {
      this.memStore.saveRefreshToken(record);
      return record;
    }

    const created = await prisma.refreshToken.create({
      data: {
        token,
        userId,
        expiresAt,
      },
    });
    return created as RefreshTokenRecord;
  }

  async findRefreshToken(token: string): Promise<RefreshTokenRecord | null> {
    if (process.env.NODE_ENV === 'test') {
      return this.memStore.findRefreshToken(token);
    }
    const record = await prisma.refreshToken.findUnique({
      where: { token },
    });
    return (record as RefreshTokenRecord) || null;
  }

  async revokeRefreshToken(token: string): Promise<void> {
    if (process.env.NODE_ENV === 'test') {
      this.memStore.revokeRefreshToken(token);
      return;
    }
    await prisma.refreshToken.update({
      where: { token },
      data: { isRevoked: true },
    });
  }

  toDto(user: UserRecord): CurrentUserDto {
    const mustChange = user.mustChangePassword ?? (user.role === Role.STUDENT && user.student?.status === 'INACTIVE');
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      mustChangePassword: Boolean(mustChange),
      student: user.student
        ? {
            id: user.student.id,
            registerNumber: user.student.registerNumber,
            department: user.student.department,
            batchYear: user.student.batchYear,
            cgpa: user.student.cgpa,
          }
        : null,
    };
  }
}

export const userRepository = new UserRepository();
