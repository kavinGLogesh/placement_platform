import { apiClient } from '../api/axios.client.js';
import {
  StudentAcademicRecord,
  UpsertAcademicRecordInput,
  StudentAuditLog,
  PersonalEmailUpdateResponse,
  VerifyPersonalEmailResponse,
  AcademicBulkImportPreviewResult,
  AcademicBulkImportConfirmRequest,
  AcademicBulkImportConfirmResult,
} from '../types/academic.types.js';

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export const academicService = {
  // ===========================================================================
  // ADMIN ACADEMIC RECORDS API
  // ===========================================================================

  async getAdminAcademicRecord(studentId: string): Promise<StudentAcademicRecord> {
    const res = await apiClient.get<ApiResponse<StudentAcademicRecord>>(`/students/${studentId}/academic-records`);
    return res.data.data;
  },

  async updateAdminAcademicRecord(
    studentId: string,
    data: UpsertAcademicRecordInput
  ): Promise<StudentAcademicRecord> {
    const res = await apiClient.put<ApiResponse<StudentAcademicRecord>>(
      `/students/${studentId}/academic-records`,
      data
    );
    return res.data.data;
  },

  async uploadMarksheet(
    studentId: string,
    docType: 'tenth' | 'twelfth' | 'semester',
    file: File,
    semesterNumber?: number
  ): Promise<StudentAcademicRecord> {
    const formData = new FormData();
    formData.append('marksheet', file);
    if (semesterNumber) {
      formData.append('semesterNumber', semesterNumber.toString());
    }

    const res = await apiClient.post<ApiResponse<StudentAcademicRecord>>(
      `/students/${studentId}/academic-records/documents/${docType}`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return res.data.data;
  },

  async downloadMarksheetBlob(
    studentId: string,
    docType: 'tenth' | 'twelfth' | 'semester',
    semesterNumber?: number
  ): Promise<{ blob: Blob; filename: string }> {
    const res = await apiClient.get(`/students/${studentId}/academic-records/documents/${docType}`, {
      params: semesterNumber ? { semesterNumber } : undefined,
      responseType: 'blob',
    });

    const disposition = res.headers['content-disposition'] || '';
    let filename = `marksheet_${docType}.pdf`;
    const match = disposition.match(/filename\*?=(?:UTF-8'')?["']?([^"';]+)["']?/i);
    if (match && match[1]) {
      filename = decodeURIComponent(match[1]);
    }

    return { blob: res.data, filename };
  },

  async updateAdminPersonalEmail(
    studentId: string,
    personalEmail: string | null,
    isVerified: boolean = false
  ): Promise<{ personalEmail: string | null; isPersonalEmailVerified: boolean }> {
    const res = await apiClient.put<
      ApiResponse<{ personalEmail: string | null; isPersonalEmailVerified: boolean }>
    >(`/students/${studentId}/personal-email`, {
      personalEmail,
      isVerified,
    });
    return res.data.data;
  },

  async getStudentAuditLogs(studentId: string): Promise<StudentAuditLog[]> {
    const res = await apiClient.get<ApiResponse<StudentAuditLog[]>>(`/students/${studentId}/audit-logs`);
    return res.data.data;
  },

  async previewAcademicBulkImport(file: File): Promise<AcademicBulkImportPreviewResult> {
    const formData = new FormData();
    formData.append('file', file);
    const res = await apiClient.post<ApiResponse<AcademicBulkImportPreviewResult>>(
      '/students/academic-records/bulk-import/preview',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return res.data.data;
  },

  async confirmAcademicBulkImport(
    data: AcademicBulkImportConfirmRequest
  ): Promise<AcademicBulkImportConfirmResult> {
    const res = await apiClient.post<ApiResponse<AcademicBulkImportConfirmResult>>(
      '/students/academic-records/bulk-import/confirm',
      data
    );
    return res.data.data;
  },

  // ===========================================================================
  // STUDENT SELF-SERVICE API
  // ===========================================================================

  async getOwnAcademicRecord(): Promise<StudentAcademicRecord> {
    const res = await apiClient.get<ApiResponse<StudentAcademicRecord>>('/student/academic-records');
    return res.data.data;
  },

  async downloadOwnMarksheetBlob(
    docType: 'tenth' | 'twelfth' | 'semester',
    semesterNumber?: number
  ): Promise<{ blob: Blob; filename: string }> {
    const res = await apiClient.get(`/student/academic-records/documents/${docType}`, {
      params: semesterNumber ? { semesterNumber } : undefined,
      responseType: 'blob',
    });

    const disposition = res.headers['content-disposition'] || '';
    let filename = `marksheet_${docType}.pdf`;
    const match = disposition.match(/filename\*?=(?:UTF-8'')?["']?([^"';]+)["']?/i);
    if (match && match[1]) {
      filename = decodeURIComponent(match[1]);
    }

    return { blob: res.data, filename };
  },

  async requestPersonalEmailUpdate(personalEmail: string): Promise<PersonalEmailUpdateResponse> {
    const res = await apiClient.put<ApiResponse<PersonalEmailUpdateResponse>>('/student/personal-email', {
      personalEmail,
    });
    return res.data.data;
  },

  async verifyPersonalEmail(verificationCode: string): Promise<VerifyPersonalEmailResponse> {
    const res = await apiClient.post<ApiResponse<VerifyPersonalEmailResponse>>(
      '/student/personal-email/verify',
      {
        verificationCode,
      }
    );
    return res.data.data;
  },

  async resendPersonalEmailCode(): Promise<PersonalEmailUpdateResponse> {
    const res = await apiClient.post<ApiResponse<PersonalEmailUpdateResponse>>(
      '/student/personal-email/resend-code'
    );
    return res.data.data;
  },
};
