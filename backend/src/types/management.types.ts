import { StudentStatus } from '@prisma/client';

export { StudentStatus };

// =============================================================================
// DTOs & Entity Interfaces
// =============================================================================

export interface CollegeDto {
  id: string;
  code: string;
  name: string;
  address?: string | null;
  website?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  createdAt: Date;
  updatedAt: Date;
  _count?: {
    departments: number;
  };
}

export interface CreateCollegeDto {
  code: string;
  name: string;
  address?: string;
  website?: string;
  contactEmail?: string;
  contactPhone?: string;
}

export interface UpdateCollegeDto {
  code?: string;
  name?: string;
  address?: string;
  website?: string;
  contactEmail?: string;
  contactPhone?: string;
}

export interface DepartmentDto {
  id: string;
  collegeId: string;
  code: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  college?: { id: string; code: string; name: string };
  courses?: { id: string; code: string; name: string }[];
  _count?: {
    courses: number;
    classes: number;
    students: number;
  };
}

export interface CreateDepartmentDto {
  collegeId: string;
  code: string;
  name: string;
}

export interface UpdateDepartmentDto {
  code?: string;
  name?: string;
}

export interface CourseDto {
  id: string;
  departmentId: string;
  code: string;
  name: string;
  durationYears: number;
  level?: 'UG' | 'PG' | string;
  createdAt: Date;
  updatedAt: Date;
  department?: { id: string; code: string; name: string };
  _count?: {
    classes: number;
    students: number;
  };
}

export interface CreateCourseDto {
  departmentId: string;
  code: string;
  name: string;
  durationYears?: number;
  level?: 'UG' | 'PG' | string;
}

export interface UpdateCourseDto {
  code?: string;
  name?: string;
  durationYears?: number;
  level?: 'UG' | 'PG' | string;
}

export interface ClassDto {
  id: string;
  departmentId: string;
  courseId: string;
  batchYear: number;
  currentYear: number;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  department?: { id: string; code: string; name: string };
  course?: { id: string; code: string; name: string };
  _count?: {
    sections: number;
    students: number;
  };
}

export interface CreateClassDto {
  departmentId: string;
  courseId: string;
  batchYear: number;
  currentYear: number;
  name?: string;
}

export interface UpdateClassDto {
  name?: string;
  currentYear?: number;
}

export interface SectionDto {
  id: string;
  classId: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  class?: {
    id: string;
    name: string;
    batchYear: number;
    currentYear: number;
    course?: { id: string; code: string; name: string };
  };
  _count?: {
    students: number;
  };
}

export interface CreateSectionDto {
  classId: string;
  name: string;
}

export interface UpdateSectionDto {
  name?: string;
}

export interface StudentDto {
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
  createdAt: Date;
  updatedAt: Date;
  department?: { id: string; code: string; name: string };
  course?: { id: string; code: string; name: string };
  class?: { id: string; name: string; batchYear: number; currentYear: number };
  section?: { id: string; name: string };
}

export interface CreateStudentDto {
  userId?: string | null;
  registerNumber: string;
  name: string;
  collegeEmail: string;
  phone?: string;
  dob?: string;
  password?: string;
  departmentId: string;
  courseId: string;
  classId: string;
  sectionId: string;
  year: number;
  cgpa?: number;
  status?: StudentStatus;
}

export interface StudentWithAccountDto extends StudentDto {
  temporaryPassword?: string;
}

export interface UpdateStudentDto {
  userId?: string | null;
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

// =============================================================================
// Server-side Query, Pagination & Filter Types
// =============================================================================

export interface StudentQueryFilters {
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

// =============================================================================
// Excel Import Types
// =============================================================================

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
  createdAt: Date | string;
}

