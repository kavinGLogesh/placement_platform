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
  registrationId?: string;
  currentStage?: SelectionStage;
  stageRemarks?: string | null;
}

export interface DriveEligibilitySummary {
  drive: PlacementDriveDto;
  totalStudentsEvaluated: number;
  eligibleCount: number;
  notEligibleCount: number;
  missingDataCount: number;
  registeredCount: number;
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
    department?: { id: string; code: string; name: string };
    cgpa?: number | null;
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

export interface UpdateRegistrationStageDto {
  stage: SelectionStage;
  remarks?: string;
}
