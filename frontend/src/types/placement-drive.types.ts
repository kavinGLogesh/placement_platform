import { StudentSkill } from './management.types.js';

export type DriveStatus = 'UPCOMING' | 'ONGOING' | 'COMPLETED' | 'CANCELLED';

export type SelectionStage =
  | 'SHORTLISTED'
  | 'APPLIED'
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
  registrationLink?: string | null;
  instructions?: string | null;
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
  registrationLink?: string | null;
  instructions?: string | null;
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
  skills: StudentSkill[];
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
  drive: PlacementDrive;
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

export interface RegisterStudentsInput {
  studentIds: string[];
  remarks?: string;
}

export interface ShortlistCandidatesInput {
  studentIds: string[];
  registrationLink?: string;
  instructions?: string;
  packageDetails?: string;
  jobDescription?: string;
  location?: string;
  notifyCandidates?: boolean;
}

export interface UpdateRegistrationStageInput {
  stage: SelectionStage;
  remarks?: string;
}

export type CandidateSelectionStatus = 'SELECTED' | 'NOT_SELECTED' | 'PENDING';

export interface MarkCandidateSelectionInput {
  registrationIds: string[];
  status: CandidateSelectionStatus | 'RESET';
  remarks?: string;
  notifyStudents?: boolean;
}

export interface DriveSelectedCandidate {
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
  selectedAt?: string | null;
  registeredAt: string;
  updatedAt: string;
}

export interface DriveSelectionOverview {
  driveId: string;
  companyName: string;
  jobRole: string;
  totalShortlisted: number;
  selectedCount: number;
  notSelectedCount: number;
  pendingCount: number;
  selectionRate: number;
  candidates: DriveSelectedCandidate[];
}
