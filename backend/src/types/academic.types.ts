export interface StudentSemesterRecordDto {
  id: string;
  academicRecordId: string;
  semesterNumber: number;
  sgpa: number | null;
  cgpa: number | null;
  totalCredits: number | null;
  creditsEarned: number | null;
  backlogsCount: number;
  marksheetPath: string | null;
  marksheetName: string | null;
  marksheetMime: string | null;
  hasMarksheet: boolean;
  marksheetUrl?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface StudentAcademicRecordDto {
  id: string;
  studentId: string;
  tenthBoard: string | null;
  tenthPassingYear: number | null;
  tenthTotalMarks: number | null;
  tenthObtainedMarks: number | null;
  tenthPercentage: number | null;
  tenthMarksheetPath: string | null;
  tenthMarksheetName: string | null;
  tenthMarksheetMime: string | null;
  hasTenthMarksheet: boolean;
  tenthMarksheetUrl?: string | null;

  twelfthBoard: string | null;
  twelfthPassingYear: number | null;
  twelfthTotalMarks: number | null;
  twelfthObtainedMarks: number | null;
  twelfthPercentage: number | null;
  twelfthMarksheetPath: string | null;
  twelfthMarksheetName: string | null;
  twelfthMarksheetMime: string | null;
  hasTwelfthMarksheet: boolean;
  twelfthMarksheetUrl?: string | null;

  degreeLevel?: string | null; // e.g. "UG", "PG"
  studyStatus?: string | null; // e.g. "STUDYING", "COMPLETED"
  currentSemester?: number | null; // e.g. 1 through 8
  ugDegree: string | null;
  ugBranch: string | null;
  ugStatus?: string | null;
  ugCgpa?: number | null;
  ugPercentage?: number | null;
  pgDegree?: string | null;
  pgStatus?: string | null;
  pgCgpa?: number | null;
  pgPercentage?: number | null;
  currentCgpa: number | null;
  overallPercentage?: number | null;
  calculatedCgpa?: number | null;
  activeBacklogs: number;
  historyOfBacklogs: number;

  semesters: StudentSemesterRecordDto[];
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface UpsertSemesterInput {
  semesterNumber: number;
  sgpa?: number | null;
  cgpa?: number | null;
  totalCredits?: number | null;
  creditsEarned?: number | null;
  backlogsCount?: number;
}

export interface UpsertAcademicRecordDto {
  tenthBoard?: string | null;
  tenthPassingYear?: number | null;
  tenthTotalMarks?: number | null;
  tenthObtainedMarks?: number | null;
  tenthPercentage?: number | null;

  twelfthBoard?: string | null;
  twelfthPassingYear?: number | null;
  twelfthTotalMarks?: number | null;
  twelfthObtainedMarks?: number | null;
  twelfthPercentage?: number | null;

  degreeLevel?: string | null;
  studyStatus?: string | null;
  currentSemester?: number | null;
  ugDegree?: string | null;
  ugBranch?: string | null;
  ugStatus?: string | null;
  ugCgpa?: number | null;
  ugPercentage?: number | null;
  pgDegree?: string | null;
  pgStatus?: string | null;
  pgCgpa?: number | null;
  pgPercentage?: number | null;
  currentCgpa?: number | null;
  overallPercentage?: number | null;
  activeBacklogs?: number;
  historyOfBacklogs?: number;

  semesters?: UpsertSemesterInput[];
}

export interface StudentAuditLogDto {
  id: string;
  studentId: string;
  performedBy: string;
  action: string;
  fieldChanged?: string | null;
  oldValue?: string | null;
  newValue?: string | null;
  details?: string | null;
  createdAt: Date | string;
}

export interface PersonalEmailUpdateDto {
  personalEmail: string;
}

export interface AdminPersonalEmailUpdateDto {
  personalEmail: string | null;
  isVerified?: boolean;
}

export interface VerifyPersonalEmailDto {
  verificationCode: string;
}

export interface AcademicBulkImportRowPreview {
  rowNumber: number;
  registerNumber: string;
  studentName?: string;
  studentFound: boolean;
  tenthPercentage?: number;
  twelfthPercentage?: number;
  degreeLevel?: string;
  studyStatus?: string;
  currentSemester?: number;
  currentCgpa?: number;
  activeBacklogs?: number;
  status: 'VALID' | 'WARNING' | 'ERROR';
  errors?: string[];
}

export interface AcademicBulkImportPreviewResult {
  importSessionId: string;
  fileName: string;
  totalRows: number;
  validRowsCount: number;
  errorRowsCount: number;
  duplicateRowsCount: number;
  columnMapping: Record<string, string>;
  previewRecords: AcademicBulkImportRowPreview[];
}

export interface AcademicBulkImportConfirmRequest {
  importSessionId: string;
  fileName?: string;
  selectedRegisterNumbers?: string[];
}

export interface AcademicBulkImportConfirmResult {
  totalProcessed: number;
  successCount: number;
  failedCount: number;
  errors: Array<{ registerNumber: string; message: string }>;
}
