import { prisma } from '../config/prisma.config.js';
import { AppError } from '../middleware/errorHandler.js';
import {
  PlacementDriveDto,
  CreatePlacementDriveDto,
  UpdatePlacementDriveDto,
  DriveRegistrationDto,
  DriveStatus,
  SelectionStage,
} from '../types/placement-drive.types.js';

export class PlacementDriveRepository {
  // In-memory storage for isolated tests / offline
  private memDrives: Map<string, PlacementDriveDto> = new Map();
  private memRegistrations: Map<string, DriveRegistrationDto> = new Map();

  async createDrive(dto: CreatePlacementDriveDto, createdById?: string): Promise<PlacementDriveDto> {
    const driveDate = new Date(dto.driveDate);
    const registrationDeadline = new Date(dto.registrationDeadline);

    if (process.env.NODE_ENV === 'test') {
      const id = `drv-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const drive: PlacementDriveDto = {
        id,
        companyId: dto.companyId || null,
        companyName: dto.companyName.trim(),
        jobRole: dto.jobRole.trim(),
        jobDescription: dto.jobDescription?.trim() || null,
        location: dto.location?.trim() || null,
        packageDetails: dto.packageDetails?.trim() || null,
        vacancies: dto.vacancies !== undefined ? dto.vacancies : 1,
        driveDate,
        registrationDeadline,
        status: dto.status || DriveStatus.UPCOMING,
        minTenthPercentage: dto.minTenthPercentage ?? null,
        minTwelfthPercentage: dto.minTwelfthPercentage ?? null,
        minCgpa: dto.minCgpa ?? null,
        maxActiveBacklogs: dto.maxActiveBacklogs ?? 0,
        eligibleDepartments: dto.eligibleDepartments || [],
        eligibleBatchYears: dto.eligibleBatchYears || [],
        requiredSkills: dto.requiredSkills || [],
        selectionProcess: dto.selectionProcess || [
          'Online Assessment',
          'Technical Round',
          'HR Interview',
        ],
        createdById: createdById || null,
        _count: { registrations: 0 },
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.memDrives.set(id, drive);
      return drive;
    }

    const drive = await prisma.placementDrive.create({
      data: {
        companyId: dto.companyId || null,
        companyName: dto.companyName.trim(),
        jobRole: dto.jobRole.trim(),
        jobDescription: dto.jobDescription?.trim() || null,
        location: dto.location?.trim() || null,
        packageDetails: dto.packageDetails?.trim() || null,
        vacancies: dto.vacancies !== undefined ? dto.vacancies : 1,
        driveDate,
        registrationDeadline,
        status: dto.status || DriveStatus.UPCOMING,
        minTenthPercentage: dto.minTenthPercentage ?? null,
        minTwelfthPercentage: dto.minTwelfthPercentage ?? null,
        minCgpa: dto.minCgpa ?? null,
        maxActiveBacklogs: dto.maxActiveBacklogs ?? 0,
        eligibleDepartments: dto.eligibleDepartments ? (dto.eligibleDepartments as any) : [],
        eligibleBatchYears: dto.eligibleBatchYears ? (dto.eligibleBatchYears as any) : [],
        requiredSkills: dto.requiredSkills ? (dto.requiredSkills as any) : [],
        selectionProcess: dto.selectionProcess
          ? (dto.selectionProcess as any)
          : ['Online Assessment', 'Technical Round', 'HR Interview'],
        createdById: createdById || null,
      },
      include: {
        company: { select: { id: true, code: true, name: true } },
        _count: { select: { registrations: true } },
      },
    });

    return drive as unknown as PlacementDriveDto;
  }

  async findDrives(filters?: { status?: DriveStatus; search?: string }): Promise<PlacementDriveDto[]> {
    if (process.env.NODE_ENV === 'test') {
      let list = Array.from(this.memDrives.values());
      if (filters?.status) {
        list = list.filter((d) => d.status === filters.status);
      }
      if (filters?.search) {
        const lower = filters.search.toLowerCase();
        list = list.filter(
          (d) =>
            d.companyName.toLowerCase().includes(lower) ||
            d.jobRole.toLowerCase().includes(lower) ||
            (d.location && d.location.toLowerCase().includes(lower))
        );
      }
      return list.sort(
        (a, b) => new Date(b.driveDate).getTime() - new Date(a.driveDate).getTime()
      );
    }

    const where: any = {};
    if (filters?.status) where.status = filters.status;
    if (filters?.search) {
      where.OR = [
        { companyName: { contains: filters.search } },
        { jobRole: { contains: filters.search } },
        { location: { contains: filters.search } },
      ];
    }

    const drives = await prisma.placementDrive.findMany({
      where,
      include: {
        company: { select: { id: true, code: true, name: true } },
        _count: { select: { registrations: true } },
      },
      orderBy: { driveDate: 'desc' },
    });

    return drives as unknown as PlacementDriveDto[];
  }

  async findDriveById(id: string): Promise<PlacementDriveDto | null> {
    if (process.env.NODE_ENV === 'test') {
      const drive = this.memDrives.get(id);
      if (!drive) return null;
      const count = Array.from(this.memRegistrations.values()).filter(
        (r) => r.driveId === id
      ).length;
      return { ...drive, _count: { registrations: count } };
    }

    const drive = await prisma.placementDrive.findUnique({
      where: { id },
      include: {
        company: { select: { id: true, code: true, name: true } },
        _count: { select: { registrations: true } },
      },
    });

    return (drive as unknown as PlacementDriveDto) || null;
  }

  async updateDrive(id: string, dto: UpdatePlacementDriveDto): Promise<PlacementDriveDto> {
    if (process.env.NODE_ENV === 'test') {
      const existing = this.memDrives.get(id);
      if (!existing) throw new AppError('Placement drive not found', 404);

      const updated: PlacementDriveDto = {
        ...existing,
        companyId: dto.companyId !== undefined ? dto.companyId : existing.companyId,
        companyName: dto.companyName ? dto.companyName.trim() : existing.companyName,
        jobRole: dto.jobRole ? dto.jobRole.trim() : existing.jobRole,
        jobDescription:
          dto.jobDescription !== undefined
            ? dto.jobDescription?.trim() || null
            : existing.jobDescription,
        location: dto.location !== undefined ? dto.location?.trim() || null : existing.location,
        packageDetails:
          dto.packageDetails !== undefined
            ? dto.packageDetails?.trim() || null
            : existing.packageDetails,
        vacancies: dto.vacancies !== undefined ? dto.vacancies : existing.vacancies,
        driveDate: dto.driveDate ? new Date(dto.driveDate) : existing.driveDate,
        registrationDeadline: dto.registrationDeadline
          ? new Date(dto.registrationDeadline)
          : existing.registrationDeadline,
        status: dto.status || existing.status,
        minTenthPercentage:
          dto.minTenthPercentage !== undefined
            ? dto.minTenthPercentage
            : existing.minTenthPercentage,
        minTwelfthPercentage:
          dto.minTwelfthPercentage !== undefined
            ? dto.minTwelfthPercentage
            : existing.minTwelfthPercentage,
        minCgpa: dto.minCgpa !== undefined ? dto.minCgpa : existing.minCgpa,
        maxActiveBacklogs:
          dto.maxActiveBacklogs !== undefined
            ? dto.maxActiveBacklogs
            : existing.maxActiveBacklogs,
        eligibleDepartments:
          dto.eligibleDepartments !== undefined
            ? dto.eligibleDepartments
            : existing.eligibleDepartments,
        eligibleBatchYears:
          dto.eligibleBatchYears !== undefined
            ? dto.eligibleBatchYears
            : existing.eligibleBatchYears,
        requiredSkills:
          dto.requiredSkills !== undefined ? dto.requiredSkills : existing.requiredSkills,
        selectionProcess:
          dto.selectionProcess !== undefined
            ? dto.selectionProcess
            : existing.selectionProcess,
        updatedAt: new Date(),
      };
      this.memDrives.set(id, updated);
      return updated;
    }

    const drive = await prisma.placementDrive.update({
      where: { id },
      data: {
        ...(dto.companyId !== undefined ? { companyId: dto.companyId } : {}),
        ...(dto.companyName ? { companyName: dto.companyName.trim() } : {}),
        ...(dto.jobRole ? { jobRole: dto.jobRole.trim() } : {}),
        ...(dto.jobDescription !== undefined
          ? { jobDescription: dto.jobDescription?.trim() || null }
          : {}),
        ...(dto.location !== undefined ? { location: dto.location?.trim() || null } : {}),
        ...(dto.packageDetails !== undefined
          ? { packageDetails: dto.packageDetails?.trim() || null }
          : {}),
        ...(dto.vacancies !== undefined ? { vacancies: dto.vacancies } : {}),
        ...(dto.driveDate ? { driveDate: new Date(dto.driveDate) } : {}),
        ...(dto.registrationDeadline
          ? { registrationDeadline: new Date(dto.registrationDeadline) }
          : {}),
        ...(dto.status ? { status: dto.status } : {}),
        ...(dto.minTenthPercentage !== undefined
          ? { minTenthPercentage: dto.minTenthPercentage }
          : {}),
        ...(dto.minTwelfthPercentage !== undefined
          ? { minTwelfthPercentage: dto.minTwelfthPercentage }
          : {}),
        ...(dto.minCgpa !== undefined ? { minCgpa: dto.minCgpa } : {}),
        ...(dto.maxActiveBacklogs !== undefined
          ? { maxActiveBacklogs: dto.maxActiveBacklogs }
          : {}),
        ...(dto.eligibleDepartments !== undefined
          ? { eligibleDepartments: dto.eligibleDepartments as any }
          : {}),
        ...(dto.eligibleBatchYears !== undefined
          ? { eligibleBatchYears: dto.eligibleBatchYears as any }
          : {}),
        ...(dto.requiredSkills !== undefined
          ? { requiredSkills: dto.requiredSkills as any }
          : {}),
        ...(dto.selectionProcess !== undefined
          ? { selectionProcess: dto.selectionProcess as any }
          : {}),
      },
      include: {
        company: { select: { id: true, code: true, name: true } },
        _count: { select: { registrations: true } },
      },
    });

    return drive as unknown as PlacementDriveDto;
  }

  async deleteDrive(id: string): Promise<boolean> {
    if (process.env.NODE_ENV === 'test') {
      const exists = this.memDrives.has(id);
      if (!exists) throw new AppError('Placement drive not found', 404);
      this.memDrives.delete(id);
      // Remove registrations
      for (const [regId, reg] of this.memRegistrations.entries()) {
        if (reg.driveId === id) this.memRegistrations.delete(regId);
      }
      return true;
    }

    await prisma.placementDrive.delete({ where: { id } });
    return true;
  }

  // ===========================================================================
  // DRIVE REGISTRATIONS & SELECTION STAGE TRACKING
  // ===========================================================================
  async findRegistrationsByDriveId(driveId: string): Promise<DriveRegistrationDto[]> {
    if (process.env.NODE_ENV === 'test') {
      return Array.from(this.memRegistrations.values())
        .filter((r) => r.driveId === driveId)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    const registrations = await prisma.driveRegistration.findMany({
      where: { driveId },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            registerNumber: true,
            collegeEmail: true,
            cgpa: true,
            department: { select: { id: true, code: true, name: true } },
          },
        },
        drive: {
          select: {
            id: true,
            companyName: true,
            jobRole: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return registrations as unknown as DriveRegistrationDto[];
  }

  async findRegistration(driveId: string, studentId: string): Promise<DriveRegistrationDto | null> {
    if (process.env.NODE_ENV === 'test') {
      for (const r of this.memRegistrations.values()) {
        if (r.driveId === driveId && r.studentId === studentId) return r;
      }
      return null;
    }

    const reg = await prisma.driveRegistration.findUnique({
      where: {
        driveId_studentId: { driveId, studentId },
      },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            registerNumber: true,
            collegeEmail: true,
            cgpa: true,
            department: { select: { id: true, code: true, name: true } },
          },
        },
      },
    });

    return (reg as unknown as DriveRegistrationDto) || null;
  }

  async createRegistration(
    driveId: string,
    studentId: string,
    registeredBy: string,
    remarks?: string,
    studentInfo?: any
  ): Promise<DriveRegistrationDto> {
    if (process.env.NODE_ENV === 'test') {
      const existing = await this.findRegistration(driveId, studentId);
      if (existing) {
        throw new AppError('Student is already registered for this placement drive', 409);
      }
      const id = `reg-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const reg: DriveRegistrationDto = {
        id,
        driveId,
        studentId,
        registeredBy,
        currentStage: SelectionStage.REGISTERED,
        stageRemarks: remarks || null,
        createdAt: new Date(),
        updatedAt: new Date(),
        student: studentInfo
          ? {
              id: studentInfo.id,
              name: studentInfo.name,
              registerNumber: studentInfo.registerNumber,
              collegeEmail: studentInfo.collegeEmail,
              department: studentInfo.department,
              cgpa: studentInfo.cgpa,
            }
          : undefined,
      };
      this.memRegistrations.set(id, reg);
      return reg;
    }

    const existing = await prisma.driveRegistration.findUnique({
      where: { driveId_studentId: { driveId, studentId } },
    });
    if (existing) {
      throw new AppError('Student is already registered for this placement drive', 409);
    }

    const reg = await prisma.driveRegistration.create({
      data: {
        driveId,
        studentId,
        registeredBy,
        currentStage: SelectionStage.REGISTERED,
        stageRemarks: remarks || null,
      },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            registerNumber: true,
            collegeEmail: true,
            cgpa: true,
            department: { select: { id: true, code: true, name: true } },
          },
        },
      },
    });

    return reg as unknown as DriveRegistrationDto;
  }

  async updateRegistrationStage(
    registrationId: string,
    stage: SelectionStage,
    remarks?: string
  ): Promise<DriveRegistrationDto> {
    if (process.env.NODE_ENV === 'test') {
      const reg = this.memRegistrations.get(registrationId);
      if (!reg) throw new AppError('Registration not found', 404);

      const updated: DriveRegistrationDto = {
        ...reg,
        currentStage: stage,
        stageRemarks: remarks !== undefined ? remarks : reg.stageRemarks,
        updatedAt: new Date(),
      };
      this.memRegistrations.set(registrationId, updated);
      return updated;
    }

    const reg = await prisma.driveRegistration.update({
      where: { id: registrationId },
      data: {
        currentStage: stage,
        ...(remarks !== undefined ? { stageRemarks: remarks } : {}),
      },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            registerNumber: true,
            collegeEmail: true,
            cgpa: true,
            department: { select: { id: true, code: true, name: true } },
          },
        },
      },
    });

    return reg as unknown as DriveRegistrationDto;
  }

  async getStudentSelectionHistory(studentId: string): Promise<DriveRegistrationDto[]> {
    if (process.env.NODE_ENV === 'test') {
      return Array.from(this.memRegistrations.values())
        .filter((r) => r.studentId === studentId)
        .map((r) => {
          const drive = this.memDrives.get(r.driveId);
          return {
            ...r,
            drive: drive ? { id: drive.id, companyName: drive.companyName, jobRole: drive.jobRole } : undefined,
          };
        })
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    const list = await prisma.driveRegistration.findMany({
      where: { studentId },
      include: {
        drive: {
          select: {
            id: true,
            companyName: true,
            jobRole: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return list as unknown as DriveRegistrationDto[];
  }
}

export const placementDriveRepository = new PlacementDriveRepository();
