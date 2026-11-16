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
  rollNo?: string | null;
  name: string;
  gender?: string | null;
  collegeEmail: string;
  personalEmail?: string | null;
  isPersonalEmailVerified?: boolean;
  phone?: string | null;
  whatsappNumber?: string | null;
  dob?: string | null;
  schoolName?: string | null;
  ugCollegeName?: string | null;
  nativePlace?: string | null;
  languagesKnown?: string | null;
  correspondenceAddress?: string | null;
  permanentAddress?: string | null;
  graduationYear?: number | null;
  arrearStatus?: string | null;
  placementWillingness?: string | null;
  specialization?: string | null;
  internshipExperience?: string | null;
  departmentId: string;
  courseId: string | null;
  classId: string | null;
  sectionId: string | null;
  year: number;
  cgpa?: number | null;
  status: StudentStatus;
  createdAt: Date;
  updatedAt: Date;
  department?: { id: string; code: string; name: string };
  course?: { id: string; code: string; name: string };
  class?: { id: string; name: string; batchYear: number; currentYear: number };
  section?: { id: string; name: string };
  academicRecord?: any;
  skills?: StudentSkillDto[];
}

export interface StudentSkillDto {
  id: string;
  studentId: string;
  name: string;
  category: string; // TECHNICAL, APTITUDE, COMMUNICATION, DOMAIN
  level: string; // BEGINNER, INTERMEDIATE, PROFICIENT, ADVANCED
  verified: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface CreateStudentSkillDto {
  name: string;
  category?: string;
  level?: string;
}

export interface UpdateStudentSkillDto {
  name?: string;
  category?: string;
  level?: string;
}

export interface CreateStudentDto {
  userId?: string | null;
  registerNumber: string;
  rollNo?: string | null;
  name: string;
  gender?: string | null;
  collegeEmail: string;
  personalEmail?: string;
  phone?: string;
  whatsappNumber?: string | null;
  dob?: string;
  schoolName?: string | null;
  ugCollegeName?: string | null;
  nativePlace?: string | null;
  languagesKnown?: string | null;
  correspondenceAddress?: string | null;
  permanentAddress?: string | null;
  graduationYear?: number | null;
  arrearStatus?: string | null;
  placementWillingness?: string | null;
  specialization?: string | null;
  internshipExperience?: string | null;
  skillsList?: string[] | null;
  password?: string;
  departmentId: string;
  courseId?: string | null;
  classId?: string | null;
  sectionId?: string | null;
  year: number;
  cgpa?: number;
  status?: StudentStatus;

  // 10th Standard Academic Credentials
  tenthBoard?: string | null;
  tenthPassingYear?: number | null;
  tenthObtainedMarks?: number | null;
  tenthTotalMarks?: number | null;
  tenthPercentage?: number | null;

  // 12th Standard Academic Credentials
  twelfthBoard?: string | null;
  twelfthPassingYear?: number | null;
  twelfthObtainedMarks?: number | null;
  twelfthTotalMarks?: number | null;
  twelfthPercentage?: number | null;

  // Academic Structure & Level
  degreeLevel?: string | null;
  currentSemester?: number | null;

  // Undergraduate (UG) Credentials
  ugDegree?: string | null;
  ugBranch?: string | null;
  ugStatus?: 'STUDYING' | 'COMPLETED' | string | null;
  ugCgpa?: number | null;
  ugPercentage?: number | null;
  activeBacklogs?: number | null;
  historyOfBacklogs?: number | null;

  // Postgraduate (PG) Credentials (Optional)
  pgDegree?: string | null;
  pgStatus?: 'STUDYING' | 'COMPLETED' | string | null;
  pgCgpa?: number | null;
  pgPercentage?: number | null;
}

export interface StudentWithAccountDto extends StudentDto {
  temporaryPassword?: string;
}

export interface UpdateStudentDto {
  userId?: string | null;
  name?: string;
  personalEmail?: string | null;
  isPersonalEmailVerified?: boolean;
  phone?: string;
  whatsappNumber?: string | null;
  dob?: string;
  rollNo?: string | null;
  gender?: string | null;
  schoolName?: string | null;
  ugCollegeName?: string | null;
  nativePlace?: string | null;
  languagesKnown?: string | null;
  correspondenceAddress?: string | null;
  permanentAddress?: string | null;
  graduationYear?: number | null;
  arrearStatus?: string | null;
  placementWillingness?: string | null;
  specialization?: string | null;
  internshipExperience?: string | null;
  password?: string;
  departmentId?: string;
  courseId?: string | null;
  classId?: string | null;
  sectionId?: string | null;
  year?: number;
  cgpa?: number;
  status?: StudentStatus;

  // 10th Standard Academic Credentials
  tenthObtainedMarks?: number | null;
  tenthTotalMarks?: number | null;
  tenthPercentage?: number | null;

  // 12th Standard Academic Credentials
  twelfthObtainedMarks?: number | null;
  twelfthTotalMarks?: number | null;
  twelfthPercentage?: number | null;

  // Undergraduate (UG) Credentials
  ugDegree?: string | null;
  ugStatus?: 'STUDYING' | 'COMPLETED' | string | null;
  ugCgpa?: number | null;
  ugPercentage?: number | null;

  // Postgraduate (PG) Credentials (Optional)
  pgDegree?: string | null;
  pgStatus?: 'STUDYING' | 'COMPLETED' | string | null;
  pgCgpa?: number | null;
  pgPercentage?: number | null;
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

  // Academic Credentials Mapping
  tenthBoard?: string | null;
  tenthPassingYear?: string | null;
  tenthMarksObtained?: string | null;
  tenthTotalMarks?: string | null;
  tenthPercentage?: string | null;

  twelfthBoard?: string | null;
  twelfthPassingYear?: string | null;
  twelfthMarksObtained?: string | null;
  twelfthTotalMarks?: string | null;
  twelfthPercentage?: string | null;

  degreeLevel?: string | null;
  currentSemester?: string | null;
  ugDegree?: string | null;
  ugBranch?: string | null;
  ugStatus?: string | null;
  ugCgpa?: string | null;
  ugPercentage?: string | null;
  activeBacklogs?: string | null;
  historyOfBacklogs?: string | null;

  pgDegree?: string | null;
  pgStatus?: string | null;
  pgCgpa?: string | null;
  pgPercentage?: string | null;

  // Comprehensive 30+2 Fields Mapping
  rollNo?: string | null;
  gender?: string | null;
  whatsappNumber?: string | null;
  personalEmail?: string | null;
  schoolName?: string | null;
  ugCollegeName?: string | null;
  nativePlace?: string | null;
  languagesKnown?: string | null;
  correspondenceAddress?: string | null;
  permanentAddress?: string | null;
  graduationYear?: string | null;
  arrearStatus?: string | null;
  studentStatus?: string | null;
  placementWillingness?: string | null;
  specialization?: string | null;
  skills?: string | null;
  internshipExperience?: string | null;

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

  // 10th Standard Academic Marks
  tenthBoard?: string;
  tenthPassingYear?: number;
  tenthMarksObtained?: number;
  tenthTotalMarks?: number;
  tenthPercentage?: number;

  // 12th Standard Academic Marks
  twelfthBoard?: string;
  twelfthPassingYear?: number;
  twelfthObtainedMarks?: number;
  twelfthTotalMarks?: number;
  twelfthPercentage?: number;

  // Academic Structure & Level
  degreeLevel?: string;
  currentSemester?: number;

  // Undergraduate (UG) Credentials
  ugDegree?: string;
  ugBranch?: string;
  ugStatus?: string;
  ugCgpa?: number;
  ugPercentage?: number;
  activeBacklogs?: number;
  historyOfBacklogs?: number;

  // Postgraduate (PG) Credentials
  pgDegree?: string;
  pgStatus?: string;
  pgCgpa?: number;
  pgPercentage?: number;

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
