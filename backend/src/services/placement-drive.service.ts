import { AppError } from '../middleware/errorHandler.js';
import { prisma } from '../config/prisma.config.js';
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
import {
  NotificationRepository,
  notificationRepository,
} from '../repositories/notification.repository.js';
import { calculateUniversityPercentage } from '../utils/cgpa-calculator.util.js';
import { logger } from '../utils/logger.util.js';
import {
  PlacementDriveDto,
  CreatePlacementDriveDto,
  UpdatePlacementDriveDto,
  DriveEligibilitySummary,
  StudentEligibilityResult,
  DriveRegistrationDto,
  DriveStatus,
  SelectionStage,
  EligibilityCategory,
  CandidateStatsDto,
  CandidateAuditLogDto,
  StudentDriveListingDto,
  ShortlistCandidatesDto,
  DepartmentEligibilityBreakdown,
  DriveSelectionOverviewDto,
  DriveSelectedCandidateDto,
  MarkCandidateSelectionDto,
  CandidateSelectionStatus,
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
    private academicRepo: AcademicRepository = academicRepository,
    private notificationRepo: NotificationRepository = notificationRepository
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

    const createdDrive = await this.driveRepo.createDrive(dto, adminUser.id);

    // Non-blocking auto-notification to all matching eligible students
    this.notifyEligibleStudents(createdDrive.id).catch((err) => {
      logger.warn(`Auto-notification on drive creation skipped or had warning: ${err.message}`);
    });

    return createdDrive;
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
    const existing = await this.getDriveById(id);

    if (dto.driveDate && dto.registrationDeadline) {
      const dDate = new Date(dto.driveDate);
      const dLine = new Date(dto.registrationDeadline);
      if (dLine.getTime() > dDate.getTime()) {
        throw new AppError('Registration deadline cannot be after the drive date', 400);
      }
    } else if (dto.registrationDeadline) {
      const dLine = new Date(dto.registrationDeadline);
      const dDate = new Date(existing.driveDate);
      if (dLine.getTime() > dDate.getTime()) {
        throw new AppError('Registration deadline cannot be after the drive date', 400);
      }
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
  // 2. ELIGIBILITY EVALUATION ENGINE
  // ===========================================================================
  public evaluateSingleStudent(
    drive: PlacementDriveDto,
    student: any
  ): {
    isEligible: boolean;
    category: EligibilityCategory;
    failureReasons: string[];
    missingDetails: string[];
    tenthPercentage: number | null;
    twelfthPercentage: number | null;
    cgpa: number | null;
    overallPercentage: number | null;
    activeBacklogs: number;
    batchYear: number;
  } {
    const studentSkills = student.skills || [];
    const academicRecord = student.academicRecord || null;

    const missingDetails: string[] = [];
    const failureReasons: string[] = [];

    // 1. Extract Academic Information
    let tenthPercentage: number | null = null;
    let twelfthPercentage: number | null = null;
    let cgpa: number | null = null;
    let overallPercentage: number | null = null;
    let activeBacklogs = 0;

    if (academicRecord) {
      if (academicRecord.tenthPercentage !== null && academicRecord.tenthPercentage !== undefined) {
        tenthPercentage = Number(academicRecord.tenthPercentage);
      } else if (
        academicRecord.tenthObtainedMarks !== null &&
        academicRecord.tenthTotalMarks &&
        academicRecord.tenthTotalMarks > 0
      ) {
        tenthPercentage = parseFloat(
          ((academicRecord.tenthObtainedMarks / academicRecord.tenthTotalMarks) * 100).toFixed(2)
        );
      }

      if (academicRecord.twelfthPercentage !== null && academicRecord.twelfthPercentage !== undefined) {
        twelfthPercentage = Number(academicRecord.twelfthPercentage);
      } else if (
        academicRecord.twelfthObtainedMarks !== null &&
        academicRecord.twelfthTotalMarks &&
        academicRecord.twelfthTotalMarks > 0
      ) {
        twelfthPercentage = parseFloat(
          ((academicRecord.twelfthObtainedMarks / academicRecord.twelfthTotalMarks) * 100).toFixed(2)
        );
      }

      if (academicRecord.currentCgpa !== null && academicRecord.currentCgpa !== undefined) {
        cgpa = Number(academicRecord.currentCgpa);
      } else if (academicRecord.ugCgpa !== null && academicRecord.ugCgpa !== undefined) {
        cgpa = Number(academicRecord.ugCgpa);
      } else if (student.cgpa !== null && student.cgpa !== undefined) {
        cgpa = Number(student.cgpa);
      }

      if (academicRecord.overallPercentage !== null && academicRecord.overallPercentage !== undefined) {
        overallPercentage = Number(academicRecord.overallPercentage);
      } else if (academicRecord.ugPercentage !== null && academicRecord.ugPercentage !== undefined) {
        overallPercentage = Number(academicRecord.ugPercentage);
      } else if (cgpa !== null) {
        overallPercentage = calculateUniversityPercentage(cgpa);
      }

      activeBacklogs = academicRecord.activeBacklogs || 0;
    } else {
      if (student.cgpa !== null && student.cgpa !== undefined) {
        cgpa = Number(student.cgpa);
        overallPercentage = calculateUniversityPercentage(cgpa);
      }
      activeBacklogs = 0;
    }

    // 2. Department & Course Criteria Evaluation
    const eligibleDepts = drive.eligibleDepartments || [];
    const studentDept = student.department;
    const studentCourse = student.course;

    if (eligibleDepts.length > 0) {
      const studentDeptCode = studentDept?.code?.toUpperCase() || '';
      const studentDeptId = student.departmentId;
      const studentDeptName = studentDept?.name?.toUpperCase() || '';
      const studentCourseCode = studentCourse?.code?.toUpperCase() || '';
      const studentCourseName = studentCourse?.name?.toUpperCase() || '';
      const ugDegree = (academicRecord?.ugDegree || '').toUpperCase().trim();
      const ugBranch = (academicRecord?.ugBranch || '').toUpperCase().trim();
      const pgDegree = (academicRecord?.pgDegree || '').toUpperCase().trim();

      const clean = (s: string) => s.replace(/[^A-Z0-9]/g, '');

      const matchesDept = eligibleDepts.some((d) => {
        const upper = String(d).toUpperCase().trim();
        const cleanD = clean(upper);
        return (
          upper === studentDeptCode ||
          upper === studentDeptId ||
          upper === studentDeptName ||
          upper === studentCourseCode ||
          upper === studentCourseName ||
          (cleanD.length > 0 &&
            (cleanD === clean(studentDeptCode) ||
              cleanD === clean(studentCourseCode) ||
              cleanD === clean(ugDegree) ||
              cleanD === clean(ugBranch) ||
              cleanD === clean(pgDegree) ||
              clean(studentDeptName).includes(cleanD) ||
              cleanD.includes(clean(studentDeptName)) ||
              clean(studentCourseName).includes(cleanD) ||
              cleanD.includes(clean(studentCourseName)) ||
              clean(ugBranch).includes(cleanD) ||
              cleanD.includes(clean(ugBranch))))
        );
      });

      if (!matchesDept) {
        failureReasons.push(
          `Department "${studentDept?.name || studentDept?.code || student.departmentId}" is not eligible for this drive`
        );
      }
    }

    // Student Account Status Check
    if (student.status && student.status !== 'ACTIVE') {
      failureReasons.push(`Student account status is "${student.status}" (must be ACTIVE)`);
    }

    // 3. Graduation Batch Year Match
    const eligibleBatches = drive.eligibleBatchYears || [];
    const studentClass = student.class;
    const courseDuration =
      student.course?.durationYears || (academicRecord?.degreeLevel === 'PG' ? 2 : 3);
    const studentBatch =
      studentClass?.batchYear ||
      (student.year ? new Date().getFullYear() + (courseDuration - student.year) : 0);

    if (eligibleBatches.length > 0) {
      const matchesBatch =
        studentBatch !== 0 && eligibleBatches.some((b) => Number(b) === Number(studentBatch));
      if (!matchesBatch) {
        failureReasons.push(
          `Graduation batch "${studentBatch || 'N/A'}" is not eligible (Eligible: ${eligibleBatches.join(', ')})`
        );
      }
    }

    // 4. 10th Requirement Check
    if (
      drive.minTenthPercentage !== null &&
      drive.minTenthPercentage !== undefined &&
      drive.minTenthPercentage > 0
    ) {
      if (tenthPercentage === null) {
        missingDetails.push('10th percentage/marks record not found');
      } else if (tenthPercentage < drive.minTenthPercentage) {
        failureReasons.push(
          `10th percentage (${tenthPercentage}%) is below minimum requirement (${drive.minTenthPercentage}%)`
        );
      }
    }

    // 5. 12th Requirement Check
    if (
      drive.minTwelfthPercentage !== null &&
      drive.minTwelfthPercentage !== undefined &&
      drive.minTwelfthPercentage > 0
    ) {
      if (twelfthPercentage === null) {
        missingDetails.push('12th percentage/marks record not found');
      } else if (twelfthPercentage < drive.minTwelfthPercentage) {
        failureReasons.push(
          `12th percentage (${twelfthPercentage}%) is below minimum requirement (${drive.minTwelfthPercentage}%)`
        );
      }
    }

    // 6. CGPA Requirement Check
    if (drive.minCgpa !== null && drive.minCgpa !== undefined && drive.minCgpa > 0) {
      if (cgpa === null) {
        missingDetails.push('Current CGPA record not found');
      } else if (cgpa < drive.minCgpa) {
        failureReasons.push(
          `Current CGPA (${cgpa.toFixed(2)}) is below minimum requirement (${drive.minCgpa.toFixed(2)})`
        );
      }
    }

    // 7. Active Backlogs Check
    if (drive.maxActiveBacklogs !== null && drive.maxActiveBacklogs !== undefined) {
      if (activeBacklogs > drive.maxActiveBacklogs) {
        failureReasons.push(
          `Active backlogs (${activeBacklogs}) exceed maximum allowed (${drive.maxActiveBacklogs})`
        );
      }
    }

    // 8. Required Skills Check
    const reqSkills = drive.requiredSkills || [];
    if (reqSkills.length > 0) {
      for (const req of reqSkills) {
        const reqName = req.name.trim().toLowerCase();
        const reqMinLevel = req.minLevel ? req.minLevel.toUpperCase() : 'BEGINNER';
        const reqRank = SKILL_LEVEL_RANKS[reqMinLevel] || 1;

        const studentSkill = studentSkills.find((s: any) => {
          const sName = s.name.trim().toLowerCase();
          return sName === reqName || sName.includes(reqName) || reqName.includes(sName);
        });

        if (!studentSkill) {
          failureReasons.push(
            `Missing required skill "${req.name}" (Required level: ${reqMinLevel})`
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

    // 9. Categorize
    let category: EligibilityCategory;
    let isEligible = false;

    if (missingDetails.length > 0) {
      category = 'MISSING_DATA';
      isEligible = false;
    } else if (failureReasons.length > 0) {
      category = 'NOT_ELIGIBLE';
      isEligible = false;
    } else {
      category = 'ELIGIBLE';
      isEligible = true;
    }

    return {
      isEligible,
      category,
      failureReasons,
      missingDetails,
      tenthPercentage,
      twelfthPercentage,
      cgpa,
      overallPercentage,
      activeBacklogs,
      batchYear: studentBatch || 0,
    };
  }

  async calculateEligibility(driveId: string): Promise<DriveEligibilitySummary> {
    const drive = await this.getDriveById(driveId);

    // 1. Overall College Statistics
    let collegeTotalStudents = 0;
    let allCollegeDepartments: Array<{ id: string; code: string; name: string }> = [];

    if (process.env.NODE_ENV === 'test') {
      const allStudents = await this.managementRepo.findStudents({ limit: 10000 });
      collegeTotalStudents = allStudents.data.length;
      allCollegeDepartments = await prisma.department.findMany({
        select: { id: true, code: true, name: true },
        orderBy: { name: 'asc' },
      });
    } else {
      [collegeTotalStudents, allCollegeDepartments] = await Promise.all([
        prisma.student.count({ where: { status: 'ACTIVE' } }),
        prisma.department.findMany({
          select: { id: true, code: true, name: true },
          orderBy: { name: 'asc' },
        }),
      ]);
    }
    const collegeDepartmentsCount = allCollegeDepartments.length;

    // 2. Department-Based Student Filtering:
    // Resolve matching departments based on drive.eligibleDepartments
    const configuredDepts = drive.eligibleDepartments || [];
    const clean = (s: string) => (s || '').replace(/[^A-Z0-9]/gi, '').toUpperCase();

    let selectedDepts: Array<{ id: string; code: string; name: string }> = [];

    if (configuredDepts.length > 0) {
      selectedDepts = allCollegeDepartments.filter((dept) => {
        return configuredDepts.some((item) => {
          const s = String(item).trim();
          const cleanItem = clean(s);
          return (
            dept.id === s ||
            dept.code.toUpperCase() === s.toUpperCase() ||
            dept.name.toUpperCase() === s.toUpperCase() ||
            (cleanItem.length > 0 &&
              (clean(dept.code) === cleanItem ||
                clean(dept.name) === cleanItem ||
                clean(dept.name).includes(cleanItem) ||
                cleanItem.includes(clean(dept.name))))
          );
        });
      });
    } else {
      // If none explicitly selected, all college departments are considered
      selectedDepts = allCollegeDepartments;
    }

    const selectedDeptIds = selectedDepts.map((d) => d.id);
    const selectedDeptNames = selectedDepts.map((d) => d.name);

    // 3. Query Students belonging STRICTLY to selected departments
    let students: any[] = [];
    if (selectedDeptIds.length > 0) {
      if (process.env.NODE_ENV === 'test') {
        const paginatedStudents = await this.managementRepo.findStudents({ limit: 10000 });
        const filtered = paginatedStudents.data.filter(
          (s) => !configuredDepts.length || selectedDeptIds.includes(s.departmentId)
        );
        students = await Promise.all(
          filtered.map(async (s) => {
            const detailed = await this.managementRepo.findStudentById(s.id);
            const acad = await this.academicRepo.getAcademicRecord(s.id);
            return {
              ...s,
              skills: detailed?.skills || [],
              academicRecord: acad || null,
            };
          })
        );
      } else {
        students = await prisma.student.findMany({
          where: {
            departmentId: { in: selectedDeptIds },
            status: 'ACTIVE',
          },
          include: {
            department: { select: { id: true, code: true, name: true } },
            course: { select: { id: true, code: true, name: true, durationYears: true } },
            class: { select: { id: true, name: true, batchYear: true } },
            section: { select: { id: true, name: true } },
            skills: {
              select: {
                id: true,
                name: true,
                category: true,
                level: true,
                verified: true,
              },
            },
            academicRecord: {
              include: {
                semesters: true,
              },
            },
          },
          orderBy: { name: 'asc' },
        });
      }
    }

    const existingRegistrations = await this.driveRepo.findRegistrationsByDriveId(driveId);
    const registrationMap = new Map<string, DriveRegistrationDto>();
    for (const reg of existingRegistrations) {
      registrationMap.set(reg.studentId, reg);
    }

    // 4. Department-Wise Statistics Breakdown Tracker
    const deptBreakdownMap = new Map<string, DepartmentEligibilityBreakdown>();
    for (const dept of selectedDepts) {
      deptBreakdownMap.set(dept.id, {
        departmentId: dept.id,
        departmentName: dept.name,
        departmentCode: dept.code,
        totalStudents: 0,
        eligibleCount: 0,
        notEligibleCount: 0,
        missingDataCount: 0,
        shortlistedCount: 0,
        appliedCount: 0,
      });
    }

    const results: StudentEligibilityResult[] = [];
    let eligibleCount = 0;
    let notEligibleCount = 0;
    let missingDataCount = 0;
    let shortlistedCount = 0;
    let appliedCount = 0;

    for (const student of students) {
      const evalResult = this.evaluateSingleStudent(drive, student);
      const deptStat = deptBreakdownMap.get(student.departmentId);
      if (deptStat) {
        deptStat.totalStudents++;
      }

      if (evalResult.category === 'MISSING_DATA') {
        missingDataCount++;
        if (deptStat) deptStat.missingDataCount++;
      } else if (evalResult.category === 'NOT_ELIGIBLE') {
        notEligibleCount++;
        if (deptStat) deptStat.notEligibleCount++;
      } else {
        eligibleCount++;
        if (deptStat) deptStat.eligibleCount++;
      }

      const existingReg = registrationMap.get(student.id);
      const isShortlisted = existingReg?.currentStage === SelectionStage.SHORTLISTED;
      const isApplied = existingReg?.currentStage === SelectionStage.APPLIED;

      if (isShortlisted) {
        shortlistedCount++;
        if (deptStat) deptStat.shortlistedCount++;
      }
      if (isApplied) {
        appliedCount++;
        if (deptStat) deptStat.appliedCount++;
      }

      results.push({
        studentId: student.id,
        registerNumber: student.registerNumber,
        name: student.name,
        collegeEmail: student.collegeEmail,
        department: student.department?.name || student.department?.code || '',
        departmentId: student.departmentId,
        batchYear: evalResult.batchYear,
        tenthPercentage: evalResult.tenthPercentage,
        twelfthPercentage: evalResult.twelfthPercentage,
        cgpa: evalResult.cgpa,
        overallPercentage: evalResult.overallPercentage,
        activeBacklogs: evalResult.activeBacklogs,
        skills: student.skills || [],
        category: evalResult.category,
        isEligible: evalResult.isEligible,
        failureReasons: evalResult.failureReasons,
        missingDetails: evalResult.missingDetails,
        isRegistered: !!existingReg,
        isShortlisted,
        isApplied,
        registrationId: existingReg?.id,
        currentStage: existingReg?.currentStage,
        stageRemarks: existingReg?.stageRemarks,
      });
    }

    return {
      drive,
      collegeTotalStudents,
      collegeDepartmentsCount,
      selectedDepartments: selectedDeptNames,
      selectedDeptTotalStudents: students.length,
      totalStudentsEvaluated: students.length,
      eligibleCount,
      notEligibleCount,
      missingDataCount,
      registeredCount: existingRegistrations.length,
      shortlistedCount,
      appliedCount,
      departmentBreakdown: Array.from(deptBreakdownMap.values()),
      students: results,
    };
  }

  // ===========================================================================
  // 3. CANDIDATE NOTIFICATIONS & AUTOMATION
  // ===========================================================================
  async notifyEligibleStudents(driveId: string): Promise<{ notifiedCount: number }> {
    const drive = await this.getDriveById(driveId);
    const eligibility = await this.calculateEligibility(driveId);
    const eligibleStudents = eligibility.students.filter((s) => s.category === 'ELIGIBLE');

    const deadlineFormatted = new Date(drive.registrationDeadline).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

    const notifInputs = eligibleStudents.map((s) => ({
      studentId: s.studentId,
      title: `Placement Drive Open: ${drive.companyName}`,
      message: `${drive.companyName} is hiring for ${drive.jobRole}. Package: ${
        drive.packageDetails || 'Competitive'
      }. You are eligible! Apply before ${deadlineFormatted} through your Student Portal.`,
      type: 'DRIVE_AVAILABLE',
      driveId: drive.id,
    }));

    const count = await this.notificationRepo.createBulkNotifications(notifInputs);
    return { notifiedCount: count };
  }

  // ===========================================================================
  // 4. CANDIDATE SELECTION, BULK STAGES, AUDIT LOGS & FINALIZATION
  // ===========================================================================
  async registerStudents(
    driveId: string,
    studentIds: string[],
    registeredBy: string,
    remarks?: string
  ): Promise<{ registeredCount: number; duplicateCount: number; registrations: DriveRegistrationDto[] }> {
    const drive = await this.getDriveById(driveId);

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

      // Record audit log
      await this.driveRepo.recordCandidateAuditLog({
        driveId,
        studentId,
        previousStage: null,
        newStage: SelectionStage.REGISTERED,
        changedBy: registeredBy,
        remarks: remarks || 'Candidate enrolled in placement drive by administration',
      });

      // Notify candidate
      await this.notificationRepo.createNotification({
        studentId,
        title: `Enrolled in Drive: ${drive.companyName}`,
        message: `You have been registered for ${drive.companyName} (${drive.jobRole}) campus placement drive.`,
        type: 'STATUS_CHANGED',
        driveId: drive.id,
      });
    }

    return {
      registeredCount: registrations.length,
      duplicateCount,
      registrations,
    };
  }

  async shortlistCandidates(
    driveId: string,
    dto: ShortlistCandidatesDto,
    adminUser: { id: string; email: string }
  ): Promise<{
    shortlistedCount: number;
    notifiedCount: number;
    registrations: DriveRegistrationDto[];
  }> {
    const drive = await this.getDriveById(driveId);

    if (!dto.studentIds || !Array.isArray(dto.studentIds) || dto.studentIds.length === 0) {
      throw new AppError('At least one candidate must be selected for shortlisting', 400);
    }

    // 1. Update Drive details if provided
    const updateData: any = {};
    if (dto.registrationLink !== undefined) updateData.registrationLink = dto.registrationLink;
    if (dto.instructions !== undefined) updateData.instructions = dto.instructions;
    if (dto.packageDetails !== undefined) updateData.packageDetails = dto.packageDetails;
    if (dto.jobDescription !== undefined) updateData.jobDescription = dto.jobDescription;
    if (dto.location !== undefined) updateData.location = dto.location;

    if (Object.keys(updateData).length > 0) {
      await this.driveRepo.updateDrive(driveId, updateData);
    }

    const uniqueIds = Array.from(new Set(dto.studentIds));
    const registrations: DriveRegistrationDto[] = [];
    const notifInputs: Array<{
      studentId: string;
      title: string;
      message: string;
      type: string;
      driveId: string;
    }> = [];

    const deadlineFormatted = new Date(drive.registrationDeadline).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

    for (const studentId of uniqueIds) {
      const student = await this.managementRepo.findStudentById(studentId);
      if (!student) continue;

      const reg = await this.driveRepo.upsertRegistration(
        driveId,
        studentId,
        adminUser.email,
        SelectionStage.SHORTLISTED,
        'Candidate shortlisted by placement administration. Registration published to Student Portal.',
        student
      );
      registrations.push(reg);

      // Record candidate audit log
      await this.driveRepo.recordCandidateAuditLog({
        driveId,
        studentId,
        previousStage: null,
        newStage: SelectionStage.SHORTLISTED,
        changedBy: adminUser.email,
        remarks: 'Candidate shortlisted for placement drive. Registration link and instructions published.',
      });

      if (dto.notifyCandidates !== false) {
        notifInputs.push({
          studentId,
          title: `Shortlisted for Placement Drive: ${drive.companyName}`,
          message: `Congratulations! You have been shortlisted for ${drive.companyName} (${drive.jobRole}). Review instructions and confirm your registration before ${deadlineFormatted} in your Student Portal.`,
          type: 'DRIVE_SHORTLISTED',
          driveId: drive.id,
        });
      }
    }

    let notifiedCount = 0;
    if (notifInputs.length > 0) {
      notifiedCount = await this.notificationRepo.createBulkNotifications(notifInputs);
    }

    return {
      shortlistedCount: registrations.length,
      notifiedCount,
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
    remarksOrChangedBy?: string,
    explicitRemarks?: string
  ): Promise<DriveRegistrationDto> {
    const drive = await this.getDriveById(driveId);
    const regs = await this.driveRepo.findRegistrationsByDriveId(driveId);
    const currentReg = regs.find((r) => r.id === registrationId);
    if (!currentReg) {
      throw new AppError('Registration not found', 404);
    }

    let changedBy = 'PLACEMENT_ADMIN';
    let remarks: string | undefined = undefined;
    if (explicitRemarks !== undefined) {
      changedBy = remarksOrChangedBy || 'PLACEMENT_ADMIN';
      remarks = explicitRemarks;
    } else {
      remarks = remarksOrChangedBy;
    }

    const previousStage = currentReg.currentStage;
    const updated = await this.driveRepo.updateRegistrationStage(registrationId, stage, remarks);

    // Record candidate audit log
    await this.driveRepo.recordCandidateAuditLog({
      driveId,
      studentId: currentReg.studentId,
      previousStage,
      newStage: stage,
      changedBy,
      remarks: remarks || `Recruitment stage updated to ${stage}`,
    });

    // Notify candidate
    let notifTitle = `Placement Update: ${drive.companyName}`;
    let notifMessage = `Your application for ${drive.companyName} (${drive.jobRole}) has progressed to: ${stage}.`;

    if (stage === SelectionStage.ASSESSMENT_SHORTLISTED) {
      notifTitle = `Shortlisted: ${drive.companyName}`;
      notifMessage = `Congratulations! You have been shortlisted for the assessment/interview stage with ${drive.companyName} (${drive.jobRole}).`;
    } else if (stage === SelectionStage.TECHNICAL_ROUND) {
      notifTitle = `Interview Scheduled: Technical Round - ${drive.companyName}`;
      notifMessage = `Your Technical Interview round for ${drive.companyName} (${drive.jobRole}) has been scheduled. Check your interview schedule.`;
    } else if (stage === SelectionStage.HR_ROUND) {
      notifTitle = `Interview Scheduled: HR Round - ${drive.companyName}`;
      notifMessage = `You have progressed to the HR Interview round for ${drive.companyName} (${drive.jobRole}). Best wishes!`;
    } else if (stage === SelectionStage.SELECTED) {
      notifTitle = `Selected! Offer for ${drive.companyName}`;
      notifMessage = `Congratulations! You have been officially selected for ${drive.companyName} as ${drive.jobRole}! The placement cell will share official offer details.`;
    } else if (stage === SelectionStage.REJECTED) {
      notifTitle = `Application Status: ${drive.companyName}`;
      notifMessage = `Thank you for participating in the ${drive.companyName} recruitment process. While you were not selected for this drive, we encourage you to apply for upcoming placement drives.`;
    }

    await this.notificationRepo.createNotification({
      studentId: currentReg.studentId,
      title: notifTitle,
      message: notifMessage,
      type: stage === SelectionStage.SELECTED ? 'DRIVE_RESULT' : 'STATUS_CHANGED',
      driveId: drive.id,
    });

    return updated;
  }

  async bulkUpdateStage(
    driveId: string,
    registrationIds: string[],
    stage: SelectionStage,
    changedBy: string,
    remarks?: string
  ): Promise<{ updatedCount: number }> {
    await this.getDriveById(driveId);
    const regs = await this.driveRepo.findRegistrationsByDriveId(driveId);
    const targetRegs = regs.filter((r) => registrationIds.includes(r.id));

    for (const reg of targetRegs) {
      await this.updateRegistrationStage(driveId, reg.id, stage, changedBy, remarks);
    }

    return { updatedCount: targetRegs.length };
  }

  async finalizeDriveSelections(
    driveId: string,
    finalizedBy: string
  ): Promise<{ finalizedCount: number; rejectedCount: number; selectedCount: number }> {
    await this.getDriveById(driveId);
    const regs = await this.driveRepo.findRegistrationsByDriveId(driveId);

    // Unselected candidates who are neither SELECTED, REJECTED, nor OPTED_OUT
    const unselectedRegs = regs.filter(
      (r) =>
        r.currentStage !== SelectionStage.SELECTED &&
        r.currentStage !== SelectionStage.REJECTED &&
        r.currentStage !== SelectionStage.OPTED_OUT
    );

    const selectedCount = regs.filter((r) => r.currentStage === SelectionStage.SELECTED).length;

    for (const reg of unselectedRegs) {
      await this.updateRegistrationStage(
        driveId,
        reg.id,
        SelectionStage.REJECTED,
        finalizedBy,
        'Recruitment drive concluded by placement administration. Candidate not selected.'
      );
    }

    // Automatically mark drive as completed
    await this.driveRepo.updateDrive(driveId, { status: DriveStatus.COMPLETED });

    return {
      finalizedCount: regs.length,
      rejectedCount: unselectedRegs.length,
      selectedCount,
    };
  }

  async getDriveSelectionOverview(driveId: string): Promise<DriveSelectionOverviewDto> {
    const drive = await this.getDriveById(driveId);
    const regs = await this.driveRepo.findRegistrationsByDriveId(driveId);

    const candidates: DriveSelectedCandidateDto[] = regs.map((reg) => {
      let selectionStatus: CandidateSelectionStatus = 'PENDING';
      if (reg.currentStage === SelectionStage.SELECTED) {
        selectionStatus = 'SELECTED';
      } else if (reg.currentStage === SelectionStage.REJECTED) {
        selectionStatus = 'NOT_SELECTED';
      }

      const st = reg.student;
      const ac = st?.academicRecord;

      return {
        registrationId: reg.id,
        studentId: reg.studentId,
        name: st?.name || 'Candidate',
        registerNumber: st?.registerNumber || '',
        collegeEmail: st?.collegeEmail || '',
        departmentId: st?.department?.id,
        departmentCode: st?.department?.code,
        departmentName: st?.department?.name,
        year: st?.year,
        cgpa: st?.cgpa ?? ac?.ugCgpa ?? null,
        tenthPercentage: ac?.tenthPercentage ?? null,
        twelfthPercentage: ac?.twelfthPercentage ?? null,
        standingArrears: ac?.activeBacklogs ?? 0,
        historyOfArrears: ac?.historyOfBacklogs ?? 0,
        activeBacklogs: ac?.activeBacklogs ?? 0,
        historyOfBacklogs: ac?.historyOfBacklogs ?? 0,
        ugCgpa: ac?.ugCgpa ?? st?.cgpa ?? null,
        currentStage: reg.currentStage,
        selectionStatus,
        stageRemarks: reg.stageRemarks,
        registeredBy: reg.registeredBy,
        selectedAt: reg.currentStage === SelectionStage.SELECTED ? reg.updatedAt : null,
        registeredAt: reg.createdAt,
        updatedAt: reg.updatedAt,
      };
    });

    const totalShortlisted = candidates.length;
    const selectedCount = candidates.filter((c) => c.selectionStatus === 'SELECTED').length;
    const notSelectedCount = candidates.filter((c) => c.selectionStatus === 'NOT_SELECTED').length;
    const pendingCount = candidates.filter((c) => c.selectionStatus === 'PENDING').length;
    const selectionRate = totalShortlisted > 0 ? Number(((selectedCount / totalShortlisted) * 100).toFixed(1)) : 0;

    return {
      driveId: drive.id,
      companyName: drive.companyName,
      jobRole: drive.jobRole,
      totalShortlisted,
      selectedCount,
      notSelectedCount,
      pendingCount,
      selectionRate,
      candidates,
    };
  }

  async markCandidatesSelection(
    driveId: string,
    dto: MarkCandidateSelectionDto,
    adminUser: { id: string; email: string }
  ): Promise<{ updatedCount: number; status: string }> {
    if (!dto.registrationIds || !Array.isArray(dto.registrationIds) || dto.registrationIds.length === 0) {
      throw new AppError('registrationIds array is required', 400);
    }
    const validStatuses = ['SELECTED', 'NOT_SELECTED', 'PENDING', 'RESET'];
    if (!dto.status || !validStatuses.includes(dto.status)) {
      throw new AppError(`Invalid selection status: ${dto.status}. Expected one of: ${validStatuses.join(', ')}`, 400);
    }

    const drive = await this.getDriveById(driveId);
    const regs = await this.driveRepo.findRegistrationsByDriveId(driveId);
    const targetRegs = regs.filter((r) => dto.registrationIds.includes(r.id));

    if (targetRegs.length === 0) {
      throw new AppError('No matching candidates found for this placement drive', 404);
    }

    let targetStage: SelectionStage;
    if (dto.status === 'SELECTED') {
      targetStage = SelectionStage.SELECTED;
    } else if (dto.status === 'NOT_SELECTED') {
      targetStage = SelectionStage.REJECTED;
    } else {
      // RESET or PENDING -> revert back to SHORTLISTED
      targetStage = SelectionStage.SHORTLISTED;
    }

    for (const reg of targetRegs) {
      const prevStage = reg.currentStage;
      if (prevStage === targetStage) continue;

      const remarks =
        dto.remarks ||
        (dto.status === 'SELECTED'
          ? `Candidate manually marked as Selected for ${drive.companyName} (${drive.jobRole})`
          : dto.status === 'NOT_SELECTED'
          ? `Candidate manually marked as Not Selected for ${drive.companyName}`
          : `Candidate selection status reset to Shortlisted`);

      await this.driveRepo.updateRegistrationStage(reg.id, targetStage, remarks);

      // Audit Log
      await this.driveRepo.recordCandidateAuditLog({
        driveId,
        studentId: reg.studentId,
        previousStage: prevStage,
        newStage: targetStage,
        changedBy: adminUser.email,
        remarks,
      });

      // Notification
      if (dto.notifyStudents !== false) {
        let notifTitle = `Placement Update: ${drive.companyName}`;
        let notifMessage = `Your selection status for ${drive.companyName} (${drive.jobRole}) has been updated.`;
        let notifType = 'STATUS_CHANGED';

        if (targetStage === SelectionStage.SELECTED) {
          notifTitle = `🎉 Congratulations! Selected for ${drive.companyName}`;
          notifMessage = `Congratulations! You have been officially selected for ${drive.companyName} (${drive.jobRole}). The placement administration will follow up regarding your formal offer letter and onboarding process.`;
          notifType = 'DRIVE_RESULT';
        } else if (targetStage === SelectionStage.REJECTED) {
          notifTitle = `Placement Drive Update: ${drive.companyName}`;
          notifMessage = `Thank you for participating in the recruitment process for ${drive.companyName} (${drive.jobRole}). You were not selected for this drive, but continue to participate in upcoming campus placement drives!`;
          notifType = 'DRIVE_RESULT';
        } else {
          notifTitle = `Placement Status Reset: ${drive.companyName}`;
          notifMessage = `Your candidate status for ${drive.companyName} (${drive.jobRole}) has been reset to Shortlisted / Under Review.`;
          notifType = 'STATUS_CHANGED';
        }

        await this.notificationRepo.createNotification({
          studentId: reg.studentId,
          title: notifTitle,
          message: notifMessage,
          type: notifType,
          driveId,
        });
      }
    }

    return { updatedCount: targetRegs.length, status: dto.status };
  }

  async getDriveCandidateStats(driveId: string): Promise<CandidateStatsDto> {
    const eligibility = await this.calculateEligibility(driveId);
    const regs = await this.driveRepo.findRegistrationsByDriveId(driveId);

    const totalEligible = eligibility.eligibleCount;
    const applied = regs.filter((r) => r.currentStage === SelectionStage.APPLIED).length;
    const shortlisted = regs.filter((r) => r.currentStage === SelectionStage.SHORTLISTED).length;
    const interviewScheduled = regs.filter(
      (r) =>
        r.currentStage === SelectionStage.ASSESSMENT_SHORTLISTED ||
        r.currentStage === SelectionStage.TECHNICAL_ROUND ||
        r.currentStage === SelectionStage.HR_ROUND
    ).length;
    const selected = regs.filter((r) => r.currentStage === SelectionStage.SELECTED).length;
    const rejected = regs.filter((r) => r.currentStage === SelectionStage.REJECTED).length;
    const pending = regs.filter(
      (r) =>
        r.currentStage === SelectionStage.REGISTERED ||
        r.currentStage === SelectionStage.SHORTLISTED ||
        r.currentStage === SelectionStage.APPLIED
    ).length;

    return {
      totalEligible,
      applied,
      shortlisted,
      interviewScheduled,
      selected,
      rejected,
      pending,
    };
  }

  async getDriveAuditLogs(driveId: string): Promise<CandidateAuditLogDto[]> {
    await this.getDriveById(driveId);
    return this.driveRepo.getDriveAuditLogs(driveId);
  }

  async getStudentDriveHistory(studentId: string): Promise<DriveRegistrationDto[]> {
    await this.managementRepo.findStudentById(studentId);
    return this.driveRepo.getStudentSelectionHistory(studentId);
  }

  // ===========================================================================
  // 5. STUDENT PORTAL PLACEMENT DRIVES & DIRECT APPLICATION
  // ===========================================================================
  async getStudentDrives(studentId: string): Promise<StudentDriveListingDto[]> {
    let student: any;
    if (process.env.NODE_ENV === 'test') {
      const detailed = await this.managementRepo.findStudentById(studentId);
      const acad = await this.academicRepo.getAcademicRecord(studentId);
      student = {
        ...detailed,
        academicRecord: acad || null,
      };
    } else {
      student = await prisma.student.findUnique({
        where: { id: studentId },
        include: {
          department: { select: { id: true, code: true, name: true } },
          course: { select: { id: true, code: true, name: true, durationYears: true } },
          class: { select: { id: true, name: true, batchYear: true } },
          section: { select: { id: true, name: true } },
          skills: {
            select: {
              id: true,
              name: true,
              category: true,
              level: true,
              verified: true,
            },
          },
          academicRecord: {
            include: {
              semesters: true,
            },
          },
        },
      });
    }

    if (!student) {
      throw new AppError('Student profile not found', 404);
    }

    const drives = await this.driveRepo.findDrives();
    const studentRegistrations = await this.driveRepo.getStudentSelectionHistory(studentId);
    const regMap = new Map(studentRegistrations.map((r) => [r.driveId, r]));

    const listings: StudentDriveListingDto[] = [];
    for (const drive of drives) {
      if (drive.status === DriveStatus.CANCELLED) continue;

      const evalResult = this.evaluateSingleStudent(drive, student);
      const reg = regMap.get(drive.id);
      const isShortlisted = reg?.currentStage === SelectionStage.SHORTLISTED;
      const isApplied = !!reg && reg.currentStage !== SelectionStage.SHORTLISTED;

      listings.push({
        drive,
        isEligible: evalResult.isEligible,
        category: evalResult.category,
        failureReasons: evalResult.failureReasons,
        missingDetails: evalResult.missingDetails,
        isApplied,
        isShortlisted,
        registrationId: reg?.id,
        currentStage: reg?.currentStage,
        stageRemarks: reg?.stageRemarks,
        appliedAt: reg?.createdAt,
      });
    }

    // Sort: shortlisted first, then applied, then eligible, then driveDate desc
    listings.sort((a, b) => {
      if (a.isShortlisted && !b.isShortlisted) return -1;
      if (!a.isShortlisted && b.isShortlisted) return 1;
      if (a.isApplied && !b.isApplied) return -1;
      if (!a.isApplied && b.isApplied) return 1;
      if (a.isEligible && !b.isEligible) return -1;
      if (!a.isEligible && b.isEligible) return 1;
      return new Date(b.drive.driveDate).getTime() - new Date(a.drive.driveDate).getTime();
    });

    return listings;
  }

  async applyForDrive(
    driveId: string,
    studentId: string,
    studentEmail: string
  ): Promise<DriveRegistrationDto> {
    const drive = await this.getDriveById(driveId);

    if (drive.status === DriveStatus.CANCELLED) {
      throw new AppError('This placement drive has been cancelled', 400);
    }
    if (drive.status === DriveStatus.COMPLETED) {
      throw new AppError('This placement drive has concluded and is no longer accepting applications', 400);
    }

    const now = new Date();
    if (now.getTime() > new Date(drive.registrationDeadline).getTime()) {
      throw new AppError('The application deadline for this placement drive has passed', 400);
    }

    const existing = await this.driveRepo.findRegistrationByDriveAndStudent(driveId, studentId);
    if (existing) {
      if (existing.currentStage === SelectionStage.SHORTLISTED) {
        // Candidate was shortlisted by admin, now confirming application
        const updated = await this.driveRepo.updateRegistrationStage(
          existing.id,
          SelectionStage.APPLIED,
          'Candidate confirmed application through Student Portal'
        );

        // Record audit log
        await this.driveRepo.recordCandidateAuditLog({
          driveId,
          studentId,
          previousStage: SelectionStage.SHORTLISTED,
          newStage: SelectionStage.APPLIED,
          changedBy: studentEmail || 'STUDENT_PORTAL',
          remarks: 'Application confirmed by candidate via Student Portal',
        });

        // Confirmation notification
        await this.notificationRepo.createNotification({
          studentId,
          title: `Application Confirmed: ${drive.companyName}`,
          message: `Your application for ${drive.companyName} (${drive.jobRole}) has been successfully confirmed and registered! Best wishes for the upcoming rounds.`,
          type: 'STATUS_CHANGED',
          driveId: drive.id,
        });

        return updated;
      }

      throw new AppError('You have already applied or registered for this placement drive', 409);
    }

    let student: any;
    if (process.env.NODE_ENV === 'test') {
      const detailed = await this.managementRepo.findStudentById(studentId);
      const acad = await this.academicRepo.getAcademicRecord(studentId);
      student = { ...detailed, academicRecord: acad || null };
    } else {
      student = await prisma.student.findUnique({
        where: { id: studentId },
        include: {
          department: { select: { id: true, code: true, name: true } },
          course: { select: { id: true, code: true, name: true, durationYears: true } },
          class: { select: { id: true, name: true, batchYear: true } },
          skills: true,
          academicRecord: true,
        },
      });
    }

    if (!student) {
      throw new AppError('Student profile not found', 404);
    }

    const evalResult = this.evaluateSingleStudent(drive, student);
    if (!evalResult.isEligible) {
      const reasonText = evalResult.failureReasons.join(', ') || 'Eligibility criteria not met';
      throw new AppError(`You are not eligible for this placement drive: ${reasonText}`, 400);
    }

    const reg = await this.driveRepo.createRegistration(
      driveId,
      studentId,
      'STUDENT_PORTAL',
      'Applied directly via Student Portal',
      student,
      SelectionStage.APPLIED
    );

    // Record audit log
    await this.driveRepo.recordCandidateAuditLog({
      driveId,
      studentId,
      previousStage: null,
      newStage: SelectionStage.APPLIED,
      changedBy: studentEmail || 'STUDENT_PORTAL',
      remarks: 'Application submitted directly by candidate via Student Portal',
    });

    // Confirmation notification
    await this.notificationRepo.createNotification({
      studentId,
      title: `Application Confirmed: ${drive.companyName}`,
      message: `Your application for ${drive.companyName} (${drive.jobRole}) has been successfully submitted and is under review.`,
      type: 'STATUS_CHANGED',
      driveId: drive.id,
    });

    return reg;
  }
}

export const placementDriveService = new PlacementDriveService();
