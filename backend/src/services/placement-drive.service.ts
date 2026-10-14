import { AppError } from '../middleware/errorHandler.js';
import {
  PlacementDriveRepository,
  placementDriveRepository,
} from '../repositories/placement-drive.repository.js';
import {
  ManagementRepository,
  managementRepository,
} from '../repositories/management.repository.js';
import {
  AcademicRepository,
  academicRepository,
} from '../repositories/academic.repository.js';
import { calculateUniversityPercentage } from '../utils/cgpa-calculator.util.js';
import {
  PlacementDriveDto,
  CreatePlacementDriveDto,
  UpdatePlacementDriveDto,
  DriveEligibilitySummary,
  StudentEligibilityResult,
  DriveRegistrationDto,
  DriveStatus,
  SelectionStage,
} from '../types/placement-drive.types.js';

const SKILL_LEVEL_RANKS: Record<string, number> = {
  BEGINNER: 1,
  INTERMEDIATE: 2,
  PROFICIENT: 3,
  ADVANCED: 4,
};

export class PlacementDriveService {
  constructor(
    private driveRepo: PlacementDriveRepository = placementDriveRepository,
    private managementRepo: ManagementRepository = managementRepository,
    private academicRepo: AcademicRepository = academicRepository
  ) {}

  // ===========================================================================
  // 1. PLACEMENT DRIVE CRUD
  // ===========================================================================
  async createDrive(
    dto: CreatePlacementDriveDto,
    adminUser: { id: string; email: string }
  ): Promise<PlacementDriveDto> {
    if (!dto.companyName || !dto.companyName.trim()) {
      throw new AppError('Company name is required', 400);
    }
    if (!dto.jobRole || !dto.jobRole.trim()) {
      throw new AppError('Job role is required', 400);
    }
    if (!dto.driveDate) {
      throw new AppError('Drive date is required', 400);
    }
    if (!dto.registrationDeadline) {
      throw new AppError('Registration deadline is required', 400);
    }

    const driveDate = new Date(dto.driveDate);
    const deadline = new Date(dto.registrationDeadline);
    if (isNaN(driveDate.getTime())) {
      throw new AppError('Invalid drive date format', 400);
    }
    if (isNaN(deadline.getTime())) {
      throw new AppError('Invalid registration deadline format', 400);
    }
    if (deadline.getTime() > driveDate.getTime()) {
      throw new AppError('Registration deadline cannot be after the drive date', 400);
    }

    if (dto.minTenthPercentage !== undefined && dto.minTenthPercentage !== null) {
      if (dto.minTenthPercentage < 0 || dto.minTenthPercentage > 100) {
        throw new AppError('Minimum 10th percentage must be between 0 and 100', 400);
      }
    }
    if (dto.minTwelfthPercentage !== undefined && dto.minTwelfthPercentage !== null) {
      if (dto.minTwelfthPercentage < 0 || dto.minTwelfthPercentage > 100) {
        throw new AppError('Minimum 12th percentage must be between 0 and 100', 400);
      }
    }
    if (dto.minCgpa !== undefined && dto.minCgpa !== null) {
      if (dto.minCgpa < 0 || dto.minCgpa > 10) {
        throw new AppError('Minimum CGPA must be between 0 and 10', 400);
      }
    }
    if (dto.maxActiveBacklogs !== undefined && dto.maxActiveBacklogs !== null) {
      if (dto.maxActiveBacklogs < 0) {
        throw new AppError('Maximum active backlogs cannot be negative', 400);
      }
    }

    return this.driveRepo.createDrive(dto, adminUser.id);
  }

  async getDrives(filters?: { status?: DriveStatus; search?: string }): Promise<PlacementDriveDto[]> {
    return this.driveRepo.findDrives(filters);
  }

  async getDriveById(id: string): Promise<PlacementDriveDto> {
    const drive = await this.driveRepo.findDriveById(id);
    if (!drive) {
      throw new AppError('Placement drive not found', 404);
    }
    return drive;
  }

  async updateDrive(
    id: string,
    dto: UpdatePlacementDriveDto,
    _adminUser: { id: string; email: string }
  ): Promise<PlacementDriveDto> {
    await this.getDriveById(id);

    if (dto.companyName !== undefined && !dto.companyName.trim()) {
      throw new AppError('Company name cannot be empty', 400);
    }
    if (dto.jobRole !== undefined && !dto.jobRole.trim()) {
      throw new AppError('Job role cannot be empty', 400);
    }

    if (dto.minTenthPercentage !== undefined && dto.minTenthPercentage !== null) {
      if (dto.minTenthPercentage < 0 || dto.minTenthPercentage > 100) {
        throw new AppError('Minimum 10th percentage must be between 0 and 100', 400);
      }
    }
    if (dto.minTwelfthPercentage !== undefined && dto.minTwelfthPercentage !== null) {
      if (dto.minTwelfthPercentage < 0 || dto.minTwelfthPercentage > 100) {
        throw new AppError('Minimum 12th percentage must be between 0 and 100', 400);
      }
    }
    if (dto.minCgpa !== undefined && dto.minCgpa !== null) {
      if (dto.minCgpa < 0 || dto.minCgpa > 10) {
        throw new AppError('Minimum CGPA must be between 0 and 10', 400);
      }
    }
    if (dto.maxActiveBacklogs !== undefined && dto.maxActiveBacklogs !== null) {
      if (dto.maxActiveBacklogs < 0) {
        throw new AppError('Maximum active backlogs cannot be negative', 400);
      }
    }

    return this.driveRepo.updateDrive(id, dto);
  }

  async deleteDrive(id: string, _adminUser: { id: string; email: string }): Promise<void> {
    await this.getDriveById(id);
    await this.driveRepo.deleteDrive(id);
  }

  // ===========================================================================
  // 2. AUTOMATIC ELIGIBILITY ENGINE
  // ===========================================================================
  async calculateEligibility(driveId: string): Promise<DriveEligibilitySummary> {
    const drive = await this.getDriveById(driveId);

    // Fetch all active students
    const paginatedStudents = await this.managementRepo.findStudents({ limit: 10000 });
    const students = paginatedStudents.data;

    // Fetch existing registrations for this drive
    const existingRegistrations = await this.driveRepo.findRegistrationsByDriveId(driveId);
    const registrationMap = new Map<string, DriveRegistrationDto>();
    for (const reg of existingRegistrations) {
      registrationMap.set(reg.studentId, reg);
    }

    const results: StudentEligibilityResult[] = [];
    let eligibleCount = 0;
    let notEligibleCount = 0;
    let missingDataCount = 0;

    for (const student of students) {
      const studentFull = await this.managementRepo.findStudentById(student.id);
      const studentSkills = studentFull?.skills || (await this.managementRepo.findStudentSkills(student.id));
      const academicRecord =
        studentFull?.academicRecord || (await this.academicRepo.getAcademicRecord(student.id));

      const missingDetails: string[] = [];
      const failureReasons: string[] = [];

      // Check missing mandatory academic info
      let tenthPercentage: number | null = null;
      let twelfthPercentage: number | null = null;
      let cgpa: number | null = null;
      let overallPercentage: number | null = null;
      let activeBacklogs = 0;

      if (!academicRecord) {
        missingDetails.push('10th percentage/marks record not found');
        missingDetails.push('12th percentage/marks record not found');
        if (student.cgpa !== null && student.cgpa !== undefined) {
          cgpa = student.cgpa;
          overallPercentage = calculateUniversityPercentage(cgpa);
        } else {
          missingDetails.push('Current CGPA record not found');
        }
      } else {
        // 10th Standard
        if (
          academicRecord.tenthPercentage !== null &&
          academicRecord.tenthPercentage !== undefined
        ) {
          tenthPercentage = Number(academicRecord.tenthPercentage);
        } else if (
          academicRecord.tenthObtainedMarks !== null &&
          academicRecord.tenthTotalMarks &&
          academicRecord.tenthTotalMarks > 0
        ) {
          tenthPercentage = parseFloat(
            ((academicRecord.tenthObtainedMarks / academicRecord.tenthTotalMarks) * 100).toFixed(2)
          );
        } else {
          missingDetails.push('10th percentage not provided');
        }

        // 12th Standard
        if (
          academicRecord.twelfthPercentage !== null &&
          academicRecord.twelfthPercentage !== undefined
        ) {
          twelfthPercentage = Number(academicRecord.twelfthPercentage);
        } else if (
          academicRecord.twelfthObtainedMarks !== null &&
          academicRecord.twelfthTotalMarks &&
          academicRecord.twelfthTotalMarks > 0
        ) {
          twelfthPercentage = parseFloat(
            ((academicRecord.twelfthObtainedMarks / academicRecord.twelfthTotalMarks) * 100).toFixed(2)
          );
        } else {
          missingDetails.push('12th percentage not provided');
        }

        // Current CGPA
        if (
          academicRecord.currentCgpa !== null &&
          academicRecord.currentCgpa !== undefined
        ) {
          cgpa = Number(academicRecord.currentCgpa);
        } else if (student.cgpa !== null && student.cgpa !== undefined) {
          cgpa = Number(student.cgpa);
        } else {
          missingDetails.push('Current CGPA not recorded');
        }

        // Overall Percentage
        if (
          academicRecord.overallPercentage !== null &&
          academicRecord.overallPercentage !== undefined
        ) {
          overallPercentage = Number(academicRecord.overallPercentage);
        } else if (cgpa !== null) {
          overallPercentage = calculateUniversityPercentage(cgpa);
        }

        activeBacklogs = academicRecord.activeBacklogs || 0;
      }

      // Department Match
      const eligibleDepts = drive.eligibleDepartments || [];
      if (eligibleDepts.length > 0) {
        const studentDeptCode = student.department?.code?.toUpperCase() || '';
        const studentDeptId = student.departmentId;
        const matchesDept = eligibleDepts.some((d) => {
          const upper = String(d).toUpperCase().trim();
          return upper === studentDeptCode || upper === studentDeptId || upper === student.department?.name?.toUpperCase();
        });
        if (!matchesDept) {
          failureReasons.push(
            `Department "${student.department?.code || student.department?.name || student.departmentId}" is not eligible for this drive`
          );
        }
      }

      // Graduation Year / Batch Year Match
      const eligibleBatches = drive.eligibleBatchYears || [];
      if (eligibleBatches.length > 0) {
        const studentBatch = student.class?.batchYear;
        const matchesBatch = eligibleBatches.some((b) => Number(b) === Number(studentBatch));
        if (!matchesBatch) {
          failureReasons.push(
            `Graduation batch "${studentBatch || 'N/A'}" is not eligible (Eligible: ${eligibleBatches.join(', ')})`
          );
        }
      }

      // 10th Requirement Check
      if (drive.minTenthPercentage !== null && drive.minTenthPercentage !== undefined) {
        if (tenthPercentage !== null && tenthPercentage < drive.minTenthPercentage) {
          failureReasons.push(
            `10th percentage (${tenthPercentage}%) is below minimum requirement (${drive.minTenthPercentage}%)`
          );
        }
      }

      // 12th Requirement Check
      if (drive.minTwelfthPercentage !== null && drive.minTwelfthPercentage !== undefined) {
        if (twelfthPercentage !== null && twelfthPercentage < drive.minTwelfthPercentage) {
          failureReasons.push(
            `12th percentage (${twelfthPercentage}%) is below minimum requirement (${drive.minTwelfthPercentage}%)`
          );
        }
      }

      // CGPA Requirement Check
      if (drive.minCgpa !== null && drive.minCgpa !== undefined) {
        if (cgpa !== null && cgpa < drive.minCgpa) {
          failureReasons.push(
            `Current CGPA (${cgpa.toFixed(2)}) is below minimum requirement (${drive.minCgpa.toFixed(2)})`
          );
        }
      }

      // Active Backlogs Check
      if (drive.maxActiveBacklogs !== null && drive.maxActiveBacklogs !== undefined) {
        if (activeBacklogs > drive.maxActiveBacklogs) {
          failureReasons.push(
            `Active backlogs (${activeBacklogs}) exceed maximum allowed (${drive.maxActiveBacklogs})`
          );
        }
      }

      // Required Skills Check
      const reqSkills = drive.requiredSkills || [];
      if (reqSkills.length > 0) {
        for (const req of reqSkills) {
          const reqName = req.name.trim().toLowerCase();
          const reqMinLevel = req.minLevel ? req.minLevel.toUpperCase() : 'BEGINNER';
          const reqRank = SKILL_LEVEL_RANKS[reqMinLevel] || 1;

          const studentSkill = studentSkills.find((s) => {
            const sName = s.name.trim().toLowerCase();
            return sName === reqName || sName.includes(reqName) || reqName.includes(sName);
          });

          if (!studentSkill) {
            failureReasons.push(
              `Missing required skill: ${req.name}${req.minLevel ? ` (${req.minLevel}+)` : ''}`
            );
          } else {
            const studentRank = SKILL_LEVEL_RANKS[studentSkill.level.toUpperCase()] || 1;
            if (studentRank < reqRank) {
              failureReasons.push(
                `Skill level for "${req.name}" (${studentSkill.level}) is below required (${reqMinLevel})`
              );
            }
          }
        }
      }

      // Categorize
      let category: 'ELIGIBLE' | 'NOT_ELIGIBLE' | 'MISSING_DATA';
      let isEligible = false;

      if (missingDetails.length > 0) {
        category = 'MISSING_DATA';
        isEligible = false;
        missingDataCount++;
      } else if (failureReasons.length > 0) {
        category = 'NOT_ELIGIBLE';
        isEligible = false;
        notEligibleCount++;
      } else {
        category = 'ELIGIBLE';
        isEligible = true;
        eligibleCount++;
      }

      const existingReg = registrationMap.get(student.id);

      results.push({
        studentId: student.id,
        registerNumber: student.registerNumber,
        name: student.name,
        collegeEmail: student.collegeEmail,
        department: student.department?.name || student.department?.code || '',
        departmentId: student.departmentId,
        batchYear: student.class?.batchYear || 0,
        tenthPercentage,
        twelfthPercentage,
        cgpa,
        overallPercentage,
        activeBacklogs,
        skills: studentSkills,
        category,
        isEligible,
        failureReasons,
        missingDetails,
        isRegistered: !!existingReg,
        registrationId: existingReg?.id,
        currentStage: existingReg?.currentStage,
        stageRemarks: existingReg?.stageRemarks,
      });
    }

    return {
      drive,
      totalStudentsEvaluated: students.length,
      eligibleCount,
      notEligibleCount,
      missingDataCount,
      registeredCount: existingRegistrations.length,
      students: results,
    };
  }

  // ===========================================================================
  // 3. STUDENT SELECTION & REGISTRATION MANAGEMENT
  // ===========================================================================
  async registerStudents(
    driveId: string,
    studentIds: string[],
    registeredBy: string,
    remarks?: string
  ): Promise<{ registeredCount: number; duplicateCount: number; registrations: DriveRegistrationDto[] }> {
    await this.getDriveById(driveId);

    if (!studentIds || studentIds.length === 0) {
      throw new AppError('At least one student must be selected for registration', 400);
    }

    const uniqueIds = Array.from(new Set(studentIds));
    const registrations: DriveRegistrationDto[] = [];
    let duplicateCount = 0;

    for (const studentId of uniqueIds) {
      const student = await this.managementRepo.findStudentById(studentId);
      if (!student) continue;

      const existing = await this.driveRepo.findRegistration(driveId, studentId);
      if (existing) {
        duplicateCount++;
        continue;
      }

      const reg = await this.driveRepo.createRegistration(
        driveId,
        studentId,
        registeredBy,
        remarks,
        student
      );
      registrations.push(reg);
    }

    return {
      registeredCount: registrations.length,
      duplicateCount,
      registrations,
    };
  }

  async getDriveRegistrations(driveId: string): Promise<DriveRegistrationDto[]> {
    await this.getDriveById(driveId);
    return this.driveRepo.findRegistrationsByDriveId(driveId);
  }

  async updateRegistrationStage(
    driveId: string,
    registrationId: string,
    stage: SelectionStage,
    remarks?: string
  ): Promise<DriveRegistrationDto> {
    await this.getDriveById(driveId);
    return this.driveRepo.updateRegistrationStage(registrationId, stage, remarks);
  }

  async getStudentDriveHistory(studentId: string): Promise<DriveRegistrationDto[]> {
    await this.managementRepo.findStudentById(studentId);
    return this.driveRepo.getStudentSelectionHistory(studentId);
  }
}

export const placementDriveService = new PlacementDriveService();
