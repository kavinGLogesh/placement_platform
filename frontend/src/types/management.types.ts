export type StudentStatus = 'ACTIVE' | 'INACTIVE' | 'PLACED' | 'BLOCKED';

export interface College {
  id: string;
  code: string;
  name: string;
  address?: string | null;
  website?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: {
    departments: number;
  };
}

export interface CreateCollegeInput {
  code: string;
  name: string;
  address?: string;
  website?: string;
  contactEmail?: string;
  contactPhone?: string;
}

export interface Department {
  id: string;
  collegeId: string;
  code: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  college?: { id: string; code: string; name: string };
  courses?: { id: string; code: string; name: string }[];
  _count?: {
    courses: number;
    classes: number;
    students: number;
  };
}

export interface CreateDepartmentInput {
  collegeId: string;
  code: string;
  name: string;
}

export interface Course {
  id: string;
  departmentId: string;
  code: string;
  name: string;
  durationYears: number;
  level?: 'UG' | 'PG' | string;
  createdAt: string;
  updatedAt: string;
  department?: { id: string; code: string; name: string };
  _count?: {
    classes: number;
    students: number;
  };
}

export interface CreateCourseInput {
  departmentId: string;
  code: string;
  name: string;
  durationYears?: number;
  level?: 'UG' | 'PG' | string;
}

export interface UpdateCourseInput {
  code?: string;
  name?: string;
  durationYears?: number;
  level?: 'UG' | 'PG' | string;
}

export interface ClassEntity {
  id: string;
  departmentId: string;
  courseId: string;
  batchYear: number;
  currentYear: number;
  name: string;
  createdAt: string;
  updatedAt: string;
  department?: { id: string; code: string; name: string };
  course?: { id: string; code: string; name: string };
  _count?: {
    sections: number;
    students: number;
  };
}

export interface CreateClassInput {
  departmentId: string;
  courseId: string;
  batchYear: number;
  currentYear: number;
  name: string;
}

export interface Section {
  id: string;
  classId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  class?: { id: string; name: string; batchYear: number; currentYear: number };
  _count?: {
    students: number;
  };
}

export interface CreateSectionInput {
  classId: string;
  name: string;
}

export interface Student {
  id: string;
  userId?: string | null;
  registerNumber: string;
  name: string;
  collegeEmail: string;
  phone?: string | null;
  dob?: string | null;
  departmentId: string;
  courseId: string;
  classId: string;
  sectionId: string;
  year: number;
  cgpa?: number | null;
  status: StudentStatus;
  temporaryPassword?: string;
  createdAt: string;
  updatedAt: string;
  department?: { id: string; code: string; name: string };
  course?: { id: string; code: string; name: string };
  class?: { id: string; name: string; batchYear: number; currentYear: number };
  section?: { id: string; name: string };
}

export interface ResetPasswordResponse {
  temporaryPassword: string;
  email: string;
}

export interface CreateStudentInput {
  registerNumber: string;
  name: string;
  collegeEmail: string;
  phone?: string;
  dob?: string;
  password?: string;
  departmentId?: string;
  courseId?: string;
  classId?: string;
  sectionId?: string;
  year: number;
  cgpa?: number;
  status?: StudentStatus;
}

export interface UpdateStudentInput {
  name?: string;
  phone?: string;
  dob?: string;
  password?: string;
  departmentId?: string;
  courseId?: string;
  classId?: string;
  sectionId?: string;
  year?: number;
  cgpa?: number;
  status?: StudentStatus;
}

export interface StudentFilters {
  page?: number;
  limit?: number;
  search?: string;
  departmentId?: string;
  courseId?: string;
  classId?: string;
  sectionId?: string;
  year?: number;
  status?: StudentStatus;
  sortBy?: 'name' | 'registerNumber' | 'collegeEmail' | 'cgpa' | 'year' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

export interface PaginationMeta {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: PaginationMeta;
}

export interface ExcelImportRowError {
  row: number;
  registerNumber?: string;
  field?: string;
  message: string;
}

export interface ExcelImportCredential {
  registerNumber: string;
  name: string;
  email: string;
  temporaryPassword?: string;
}

export interface ExcelImportResult {
  importedCount: number;
  failedCount: number;
  duplicateCount: number;
  errors: ExcelImportRowError[];
  credentials?: ExcelImportCredential[];
}

export interface StudentSkill {
  name: string;
  category: 'TECHNICAL' | 'APTITUDE' | 'COMMUNICATION' | 'DOMAIN';
  level: 'BEGINNER' | 'INTERMEDIATE' | 'PROFICIENT' | 'ADVANCED';
  verified: boolean;
}

export interface StudentCertification {
  title: string;
  issuer: string;
  issueDate: string;
  credentialId: string;
  verified: boolean;
}

export interface StudentResume {
  fileName: string;
  fileUrl: string;
  lastUpdated: string;
  status: 'VERIFIED' | 'PENDING' | 'REJECTED';
  fileSize: string;
}

export interface PlacementRecommendation {
  type: 'PRACTICE' | 'ASSESSMENT' | 'READINESS';
  priority: 'HIGH' | 'MEDIUM' | 'INFO';
  title: string;
  description: string;
}

export interface StudentFullProfile extends Student {
  skills?: StudentSkill[];
  certifications?: StudentCertification[];
  resume?: StudentResume;
  recommendations?: PlacementRecommendation[];
}

// =============================================================================
// AI Student Import & Organization Types
// =============================================================================

export type StudentImportRecordStatus = 'VALID' | 'WARNING' | 'INVALID' | 'DUPLICATE';

export interface ColumnMappingResult {
  department: string | null;
  course: string | null;
  className: string | null;
  section: string | null;
  studentName: string | null;
  registerNumber: string | null;
  mobileNumber: string | null;
  dateOfBirth: string | null;
  collegeEmail: string | null;
  year: string | null;
  cgpa: string | null;
  rawHeaders: string[];
  aiAssisted: boolean;
  confidence: number;
}

export interface StudentImportItem {
  id: string;
  rowNumber: number;
  department: string;
  course: string;
  className?: string;
  section?: string;
  studentName: string;
  registerNumber: string;
  mobileNumber?: string;
  dateOfBirth?: string;
  collegeEmail: string;
  year?: number;
  cgpa?: number;
  status: StudentImportRecordStatus;
  statusReasons: string[];
  isDuplicate: boolean;
  duplicateReason?: string;
  existingStudentInfo?: {
    id: string;
    name: string;
    registerNumber: string;
    collegeEmail: string;
  };
}

export interface CourseGroupPreview {
  courseName: string;
  courseCode: string;
  studentCount: number;
  students: StudentImportItem[];
}

export interface DepartmentGroupPreview {
  departmentName: string;
  departmentCode: string;
  studentCount: number;
  courses: CourseGroupPreview[];
}

export interface AiStudentImportPreviewResponse {
  importSessionId: string;
  fileName: string;
  totalRecords: number;
  validRecords: number;
  duplicateRecords: number;
  invalidRecords: number;
  warningRecords: number;
  departmentsFound: number;
  coursesFound: number;
  columnMapping: ColumnMappingResult;
  aiAssisted: boolean;
  aiNotes?: string;
  hierarchicalData: DepartmentGroupPreview[];
  flatRecords: StudentImportItem[];
}

export interface AiStudentImportConfirmRequest {
  importSessionId: string;
  fileName: string;
  selectedStudentIds?: string[];
  skipDuplicates?: boolean;
  commonTemporaryPassword?: string;
}

export interface AiStudentImportConfirmResponse {
  historyId: string;
  totalProcessed: number;
  importedCount: number;
  duplicateCount: number;
  invalidCount: number;
  status: string;
  commonTemporaryPassword?: string;
  credentials?: ExcelImportCredential[];
  message: string;
}

export interface StudentImportHistoryRecord {
  id: string;
  fileName: string;
  uploadedByEmail: string;
  totalRecords: number;
  importedCount: number;
  duplicateCount: number;
  invalidCount: number;
  status: string;
  detailsJson?: string | null;
  createdAt: string;
}

