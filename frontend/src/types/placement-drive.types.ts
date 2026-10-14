import { StudentSkill } from './management.types.js';

export type DriveStatus = 'UPCOMING' | 'ONGOING' | 'COMPLETED' | 'CANCELLED';

export type SelectionStage =
  | 'REGISTERED'
  | 'ASSESSMENT_SHORTLISTED'
  | 'TECHNICAL_ROUND'
  | 'HR_ROUND'
  | 'SELECTED'
  | 'REJECTED'
  | 'OPTED_OUT';

export interface RequiredSkillCriterion {
  name: string;
  minLevel?: 'BEGINNER' | 'INTERMEDIATE' | 'PROFICIENT' | 'ADVANCED' | string;
}

export interface PlacementDrive {
  id: string;
  companyId?: string | null;
  companyName: string;
  jobRole: string;
  jobDescription?: string | null;
  location?: string | null;
  packageDetails?: string | null;
  vacancies?: number | null;
  driveDate: string;
  registrationDeadline: string;
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
  createdAt: string;
  updatedAt: string;
}

export interface CreatePlacementDriveInput {
  companyId?: string | null;
  companyName: string;
  jobRole: string;
  jobDescription?: string | null;
  location?: string | null;
  packageDetails?: string | null;
  vacancies?: number | null;
  driveDate: string;
  registrationDeadline: string;
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

export interface UpdatePlacementDriveInput {
  companyId?: string | null;
  companyName?: string;
  jobRole?: string;
  jobDescription?: string | null;
  location?: string | null;
  packageDetails?: string | null;
  vacancies?: number | null;
  driveDate?: string;
  registrationDeadline?: string;
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
  skills: StudentSkill[];
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
  drive: PlacementDrive;
  totalStudentsEvaluated: number;
  eligibleCount: number;
  notEligibleCount: number;
  missingDataCount: number;
  registeredCount: number;
  students: StudentEligibilityResult[];
}

export interface DriveRegistration {
  id: string;
  driveId: string;
  studentId: string;
  registeredBy: string;
  currentStage: SelectionStage;
  stageRemarks?: string | null;
  createdAt: string;
  updatedAt: string;
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

export interface RegisterStudentsInput {
  studentIds: string[];
  remarks?: string;
}

export interface UpdateRegistrationStageInput {
  stage: SelectionStage;
  remarks?: string;
}
