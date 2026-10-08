import { apiClient } from '../api/axios.client.js';
import { StudentResumeMetadataDto } from '../types/analytics.types.js';
import {
  College,
  CreateCollegeInput,
  Department,
  CreateDepartmentInput,
  Course,
  CreateCourseInput,
  ClassEntity,
  CreateClassInput,
  Section,
  CreateSectionInput,
  Student,
  StudentFullProfile,
  StudentResume,
  CreateStudentInput,
  UpdateStudentInput,
  StudentFilters,
  PaginatedResult,
  ExcelImportResult,
  ExcelImportRowError,
  ResetPasswordResponse,
  AiStudentImportPreviewResponse,
  AiStudentImportConfirmRequest,
  AiStudentImportConfirmResponse,
  StudentImportHistoryRecord,
} from '../types/management.types.js';

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export const managementService = {
  // 1. College
  async getColleges(): Promise<College[]> {
    const res = await apiClient.get<ApiResponse<College[]>>('/colleges');
    return res.data.data;
  },

  async getCollegeById(id: string): Promise<College> {
    const res = await apiClient.get<ApiResponse<College>>(`/colleges/${id}`);
    return res.data.data;
  },

  async createCollege(payload: CreateCollegeInput): Promise<College> {
    const res = await apiClient.post<ApiResponse<College>>('/colleges', payload);
    return res.data.data;
  },

  async updateCollege(id: string, payload: Partial<CreateCollegeInput>): Promise<College> {
    const res = await apiClient.put<ApiResponse<College>>(`/colleges/${id}`, payload);
    return res.data.data;
  },

  async deleteCollege(id: string): Promise<void> {
    await apiClient.delete(`/colleges/${id}`);
  },

  // 2. Department
  async getDepartments(collegeId?: string): Promise<Department[]> {
    const res = await apiClient.get<ApiResponse<Department[]>>('/departments', {
      params: collegeId ? { collegeId } : undefined,
    });
    return res.data.data;
  },

  async getDepartmentById(id: string): Promise<Department> {
    const res = await apiClient.get<ApiResponse<Department>>(`/departments/${id}`);
    return res.data.data;
  },

  async createDepartment(payload: CreateDepartmentInput): Promise<Department> {
    const res = await apiClient.post<ApiResponse<Department>>('/departments', payload);
    return res.data.data;
  },

  async updateDepartment(id: string, payload: { code?: string; name?: string }): Promise<Department> {
    const res = await apiClient.put<ApiResponse<Department>>(`/departments/${id}`, payload);
    return res.data.data;
  },

  async deleteDepartment(id: string): Promise<void> {
    await apiClient.delete(`/departments/${id}`);
  },

  // 3. Course
  async getCourses(departmentId?: string): Promise<Course[]> {
    const res = await apiClient.get<ApiResponse<Course[]>>('/courses', {
      params: departmentId ? { departmentId } : undefined,
    });
    return res.data.data;
  },

  async getCourseById(id: string): Promise<Course> {
    const res = await apiClient.get<ApiResponse<Course>>(`/courses/${id}`);
    return res.data.data;
  },

  async createCourse(payload: CreateCourseInput): Promise<Course> {
    const res = await apiClient.post<ApiResponse<Course>>('/courses', payload);
    return res.data.data;
  },

  async updateCourse(id: string, payload: { code?: string; name?: string; durationYears?: number }): Promise<Course> {
    const res = await apiClient.put<ApiResponse<Course>>(`/courses/${id}`, payload);
    return res.data.data;
  },

  async deleteCourse(id: string): Promise<void> {
    await apiClient.delete(`/courses/${id}`);
  },

  // 4. Class
  async getClasses(courseId?: string, departmentId?: string): Promise<ClassEntity[]> {
    const res = await apiClient.get<ApiResponse<ClassEntity[]>>('/classes', {
      params: { ...(courseId ? { courseId } : {}), ...(departmentId ? { departmentId } : {}) },
    });
    return res.data.data;
  },

  async getClassById(id: string): Promise<ClassEntity> {
    const res = await apiClient.get<ApiResponse<ClassEntity>>(`/classes/${id}`);
    return res.data.data;
  },

  async createClass(payload: CreateClassInput): Promise<ClassEntity> {
    const res = await apiClient.post<ApiResponse<ClassEntity>>('/classes', payload);
    return res.data.data;
  },

  async updateClass(id: string, payload: Partial<CreateClassInput>): Promise<ClassEntity> {
    const res = await apiClient.put<ApiResponse<ClassEntity>>(`/classes/${id}`, payload);
    return res.data.data;
  },

  async deleteClass(id: string): Promise<void> {
    await apiClient.delete(`/classes/${id}`);
  },

  // 5. Section
  async getSections(classId?: string): Promise<Section[]> {
    const res = await apiClient.get<ApiResponse<Section[]>>('/sections', {
      params: classId ? { classId } : undefined,
    });
    return res.data.data;
  },

  async getSectionById(id: string): Promise<Section> {
    const res = await apiClient.get<ApiResponse<Section>>(`/sections/${id}`);
    return res.data.data;
  },

  async createSection(payload: CreateSectionInput): Promise<Section> {
    const res = await apiClient.post<ApiResponse<Section>>('/sections', payload);
    return res.data.data;
  },

  async updateSection(id: string, payload: { name: string }): Promise<Section> {
    const res = await apiClient.put<ApiResponse<Section>>(`/sections/${id}`, payload);
    return res.data.data;
  },

  async deleteSection(id: string): Promise<void> {
    await apiClient.delete(`/sections/${id}`);
  },

  // 6. Student CRUD & Server-side Paginated List
  async getStudents(filters: StudentFilters = {}): Promise<PaginatedResult<Student>> {
    const res = await apiClient.get<ApiResponse<PaginatedResult<Student>>>('/students', {
      params: filters,
    });
    return res.data.data;
  },

  async getStudentById(id: string): Promise<Student> {
    const res = await apiClient.get<ApiResponse<Student>>(`/students/${id}`);
    return res.data.data;
  },

  async getStudentProfile(): Promise<StudentFullProfile> {
    const res = await apiClient.get<ApiResponse<StudentFullProfile>>('/student/profile');
    return res.data.data;
  },

  async updateStudentProfile(payload: { phone?: string; skills?: any[] }): Promise<StudentFullProfile> {
    const res = await apiClient.put<ApiResponse<StudentFullProfile>>('/student/profile', payload);
    return res.data.data;
  },

  async uploadResume(file: File): Promise<StudentResume> {
    const formData = new FormData();
    formData.append('resume', file);
    const res = await apiClient.post<ApiResponse<StudentResume>>('/student/resume', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return res.data.data;
  },

  async downloadResume(): Promise<Blob> {
    const res = await apiClient.get('/student/resume/download', {
      responseType: 'blob',
    });
    return res.data;
  },

  async getStudentResume(studentId: string): Promise<StudentResumeMetadataDto> {
    const res = await apiClient.get<ApiResponse<StudentResumeMetadataDto>>(`/students/${studentId}/resume`);
    return res.data.data;
  },

  async downloadStudentResume(studentId: string, inline = false): Promise<Blob> {
    const res = await apiClient.get(`/students/${studentId}/resume/download`, {
      params: inline ? { inline: true } : undefined,
      responseType: 'blob',
    });
    return res.data;
  },

  async createStudent(payload: CreateStudentInput): Promise<Student> {
    const res = await apiClient.post<ApiResponse<Student>>('/students', payload);
    return res.data.data;
  },

  async updateStudent(id: string, payload: UpdateStudentInput): Promise<Student> {
    const res = await apiClient.put<ApiResponse<Student>>(`/students/${id}`, payload);
    return res.data.data;
  },

  async deleteStudent(id: string): Promise<void> {
    await apiClient.delete(`/students/${id}`);
  },

  async resetStudentPassword(id: string): Promise<ResetPasswordResponse> {
    const res = await apiClient.post<ApiResponse<ResetPasswordResponse>>(`/students/${id}/reset-password`);
    return res.data.data;
  },

  // 7. Bulk Excel Import & Error Handling
  async importStudents(file: File): Promise<ExcelImportResult> {
    const formData = new FormData();
    formData.append('file', file);
    const res = await apiClient.post<ApiResponse<ExcelImportResult>>('/students/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return res.data.data;
  },

  async downloadTemplate(): Promise<Blob> {
    const res = await apiClient.get('/students/import/template', {
      responseType: 'blob',
    });
    return res.data as Blob;
  },

  async downloadErrorReport(errors: ExcelImportRowError[]): Promise<Blob> {
    const res = await apiClient.post('/students/import/error-report', { errors }, {
      responseType: 'blob',
    });
    return res.data as Blob;
  },

  // 8. AI Student Import & Organization
  async getAiImportPreview(file: File): Promise<AiStudentImportPreviewResponse> {
    const formData = new FormData();
    formData.append('file', file);
    const res = await apiClient.post<ApiResponse<AiStudentImportPreviewResponse>>(
      '/students/ai-import/preview',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return res.data.data;
  },

  async confirmAiImport(data: AiStudentImportConfirmRequest): Promise<AiStudentImportConfirmResponse> {
    const res = await apiClient.post<ApiResponse<AiStudentImportConfirmResponse>>(
      '/students/ai-import/confirm',
      data
    );
    return res.data.data;
  },

  async getImportHistory(): Promise<StudentImportHistoryRecord[]> {
    const res = await apiClient.get<ApiResponse<StudentImportHistoryRecord[]>>('/students/import-history');
    return res.data.data;
  },

  async getImportHistoryById(id: string): Promise<StudentImportHistoryRecord> {
    const res = await apiClient.get<ApiResponse<StudentImportHistoryRecord>>(`/students/import-history/${id}`);
    return res.data.data;
  },
};
