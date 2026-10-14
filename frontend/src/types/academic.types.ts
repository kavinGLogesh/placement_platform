export interface StudentSemesterRecord {
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
  createdAt: string;
  updatedAt: string;
}

export interface StudentAcademicRecord {
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

  ugDegree: string | null;
  ugBranch: string | null;
  degreeLevel?: string | null;
  studyStatus?: string | null;
  currentSemester?: number | null;
  currentCgpa: number | null;
  overallPercentage?: number | null;
  calculatedCgpa?: number | null;
  activeBacklogs: number;
  historyOfBacklogs: number;

  semesters: StudentSemesterRecord[];
  createdAt: string;
  updatedAt: string;
}

export interface UpsertSemesterInput {
  semesterNumber: number;
  sgpa?: number | null;
  cgpa?: number | null;
  totalCredits?: number | null;
  creditsEarned?: number | null;
  backlogsCount?: number;
}

export interface UpsertAcademicRecordInput {
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

  ugDegree?: string | null;
  ugBranch?: string | null;
  degreeLevel?: string | null;
  studyStatus?: string | null;
  currentSemester?: number | null;
  currentCgpa?: number | null;
  overallPercentage?: number | null;
  activeBacklogs?: number;
  historyOfBacklogs?: number;

  semesters?: UpsertSemesterInput[];
}

export interface StudentAuditLog {
  id: string;
  studentId: string;
  performedBy: string;
  action: string;
  fieldChanged?: string | null;
  oldValue?: string | null;
  newValue?: string | null;
  details?: string | null;
  createdAt: string;
}

export interface PersonalEmailUpdateResponse {
  message: string;
  personalEmail: string;
  expiresInMinutes: number;
  devCode?: string;
}

export interface VerifyPersonalEmailResponse {
  message: string;
  personalEmail: string;
  isPersonalEmailVerified: boolean;
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
  selectedRegisterNumbers?: string[];
}

export interface AcademicBulkImportConfirmResult {
  totalProcessed: number;
  successCount: number;
  failedCount: number;
  errors: Array<{ registerNumber: string; message: string }>;
}
