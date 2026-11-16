import { DriveStatus, SelectionStage } from '@prisma/client';

export { DriveStatus, SelectionStage };

export interface RequiredSkillCriterion {
  name: string;
  minLevel?: 'BEGINNER' | 'INTERMEDIATE' | 'PROFICIENT' | 'ADVANCED' | string;
}

export interface PlacementDriveDto {
  id: string;
  companyId?: string | null;
  companyName: string;
  jobRole: string;
  jobDescription?: string | null;
  location?: string | null;
  packageDetails?: string | null;
  vacancies?: number | null;
  driveDate: Date | string;
  registrationDeadline: Date | string;
  status: DriveStatus;
  minTenthPercentage?: number | null;
  minTwelfthPercentage?: number | null;
  minCgpa?: number | null;
  maxActiveBacklogs?: number | null;
  eligibleDepartments?: string[];
  eligibleBatchYears?: number[];
  requiredSkills?: RequiredSkillCriterion[];
  selectionProcess?: string[];
  registrationLink?: string | null;
  instructions?: string | null;
  createdById?: string | null;
  company?: { id: string; code: string; name: string } | null;
  _count?: {
    registrations: number;
  };
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface CreatePlacementDriveDto {
  companyId?: string | null;
  companyName: string;
  jobRole: string;
  jobDescription?: string | null;
  location?: string | null;
  packageDetails?: string | null;
  vacancies?: number | null;
  driveDate: Date | string;
  registrationDeadline: Date | string;
  status?: DriveStatus;
  minTenthPercentage?: number | null;
  minTwelfthPercentage?: number | null;
  minCgpa?: number | null;
  maxActiveBacklogs?: number | null;
  eligibleDepartments?: string[];
  eligibleBatchYears?: number[];
  requiredSkills?: RequiredSkillCriterion[];
  selectionProcess?: string[];
  registrationLink?: string | null;
  instructions?: string | null;
}

export interface UpdatePlacementDriveDto {
  companyId?: string | null;
  companyName?: string;
  jobRole?: string;
  jobDescription?: string | null;
  location?: string | null;
  packageDetails?: string | null;
  vacancies?: number | null;
  driveDate?: Date | string;
  registrationDeadline?: Date | string;
  status?: DriveStatus;
  minTenthPercentage?: number | null;
  minTwelfthPercentage?: number | null;
  minCgpa?: number | null;
  maxActiveBacklogs?: number | null;
  eligibleDepartments?: string[];
  eligibleBatchYears?: number[];
  requiredSkills?: RequiredSkillCriterion[];
  selectionProcess?: string[];
  registrationLink?: string | null;
  instructions?: string | null;
}

export type EligibilityCategory = 'ELIGIBLE' | 'NOT_ELIGIBLE' | 'MISSING_DATA';

export interface StudentEligibilityResult {
  studentId: string;
  registerNumber: string;
  name: string;
  collegeEmail: string;
  department: string;
  departmentId: string;
  batchYear: number;
  tenthPercentage: number | null;
  twelfthPercentage: number | null;
  cgpa: number | null;
  overallPercentage: number | null;
  activeBacklogs: number;
  skills: Array<{
    id: string;
    name: string;
    category: string;
    level: string;
    verified: boolean;
  }>;
  category: EligibilityCategory;
  isEligible: boolean;
  failureReasons: string[];
  missingDetails: string[];
  isRegistered: boolean;
  isShortlisted: boolean;
  isApplied: boolean;
  registrationId?: string;
  currentStage?: SelectionStage;
  stageRemarks?: string | null;
}

export interface DepartmentEligibilityBreakdown {
  departmentId: string;
  departmentName: string;
  departmentCode: string;
  totalStudents: number;
  eligibleCount: number;
  notEligibleCount: number;
  missingDataCount: number;
  shortlistedCount: number;
  appliedCount: number;
}

export interface DriveEligibilitySummary {
  drive: PlacementDriveDto;
  collegeTotalStudents: number;
  collegeDepartmentsCount: number;
  selectedDepartments: string[];
  selectedDeptTotalStudents: number;
  totalStudentsEvaluated: number;
  eligibleCount: number;
  notEligibleCount: number;
  missingDataCount: number;
  registeredCount: number;
  shortlistedCount: number;
  appliedCount: number;
  departmentBreakdown: DepartmentEligibilityBreakdown[];
  students: StudentEligibilityResult[];
}

export interface DriveRegistrationDto {
  id: string;
  driveId: string;
  studentId: string;
  registeredBy: string;
  currentStage: SelectionStage;
  stageRemarks?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  student?: {
    id: string;
    name: string;
    registerNumber: string;
    collegeEmail: string;
    year?: number;
    department?: { id: string; code: string; name: string };
    cgpa?: number | null;
    academicRecord?: {
      tenthPercentage?: number | null;
      twelfthPercentage?: number | null;
      activeBacklogs?: number | null;
      historyOfBacklogs?: number | null;
      ugCgpa?: number | null;
    } | null;
  };
  drive?: {
    id: string;
    companyName: string;
    jobRole: string;
  };
}

export interface RegisterStudentsDto {
  studentIds: string[];
  remarks?: string;
}

export interface ShortlistCandidatesDto {
  studentIds: string[];
  registrationLink?: string;
  instructions?: string;
  packageDetails?: string;
  jobDescription?: string;
  location?: string;
  notifyCandidates?: boolean;
}

export interface UpdateRegistrationStageDto {
  stage: SelectionStage;
  remarks?: string;
}

export interface BulkUpdateStageDto {
  registrationIds: string[];
  stage: SelectionStage;
  remarks?: string;
}

export type CandidateSelectionStatus = 'SELECTED' | 'NOT_SELECTED' | 'PENDING';

export interface MarkCandidateSelectionDto {
  registrationIds: string[];
  status: CandidateSelectionStatus | 'RESET';
  remarks?: string;
  notifyStudents?: boolean;
}

export interface DriveSelectedCandidateDto {
  registrationId: string;
  studentId: string;
  name: string;
  registerNumber: string;
  collegeEmail: string;
  departmentId?: string;
  departmentCode?: string;
  departmentName?: string;
  year?: number;
  cgpa?: number | null;
  tenthPercentage?: number | null;
  twelfthPercentage?: number | null;
  standingArrears?: number | null;
  historyOfArrears?: number | null;
  activeBacklogs?: number | null;
  historyOfBacklogs?: number | null;
  ugCgpa?: number | null;
  currentStage: SelectionStage;
  selectionStatus: CandidateSelectionStatus;
  stageRemarks?: string | null;
  registeredBy: string;
  selectedAt?: Date | string | null;
  registeredAt: Date | string;
  updatedAt: Date | string;
}

export interface DriveSelectionOverviewDto {
  driveId: string;
  companyName: string;
  jobRole: string;
  totalShortlisted: number;
  selectedCount: number;
  notSelectedCount: number;
  pendingCount: number;
  selectionRate: number;
  candidates: DriveSelectedCandidateDto[];
}

export interface CandidateStatsDto {
  totalEligible: number;
  applied: number;
  shortlisted: number;
  interviewScheduled: number;
  selected: number;
  rejected: number;
  pending: number;
}

export interface CandidateAuditLogDto {
  id: string;
  driveId: string;
  studentId: string;
  previousStage: SelectionStage | null;
  newStage: SelectionStage;
  changedBy: string;
  remarks?: string | null;
  createdAt: Date | string;
  student?: {
    id: string;
    name: string;
    registerNumber: string;
    collegeEmail: string;
  };
}

export interface StudentNotificationDto {
  id: string;
  studentId: string;
  title: string;
  message: string;
  type: string;
  driveId?: string | null;
  read: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
  drive?: {
    id: string;
    companyName: string;
    jobRole: string;
  };
}

export interface StudentDriveListingDto {
  drive: PlacementDriveDto;
  isEligible: boolean;
  category: EligibilityCategory;
  failureReasons: string[];
  missingDetails: string[];
  isApplied: boolean;
  isShortlisted: boolean;
  registrationId?: string;
  currentStage?: SelectionStage;
  stageRemarks?: string | null;
  appliedAt?: Date | string;
}
