import { apiClient } from '../api/axios.client.js';
import {
  AssessmentAttendanceOverviewDto,
  StudentAttendanceRecordDto,
  AttendanceFilterQuery,
  PaginatedAttendanceDto,
  AttendanceAlertDto,
  RepeatedNonAttendanceStudentDto,
  AttendanceAutomationConfigDto,
  SendReminderResultDto,
} from '../types/attendance.types.js';

export class AttendanceService {
  /**
   * Get attendance overview metrics for a specific assessment
   */
  async getAssessmentOverview(assessmentId: string): Promise<AssessmentAttendanceOverviewDto> {
    const res = await apiClient.get(`/attendance/assessments/${assessmentId}/overview`);
    return res.data.data;
  }

  /**
   * Get all assessments attendance overviews for the administration console
   */
  async getAllAssessmentsOverview(): Promise<AssessmentAttendanceOverviewDto[]> {
    const res = await apiClient.get('/attendance/assessments/overview');
    return res.data.data;
  }

  /**
   * Get paginated and filtered student attendance records
   */
  async getAttendanceRecords(query: AttendanceFilterQuery = {}): Promise<PaginatedAttendanceDto> {
    const params: Record<string, any> = {};
    if (query.assessmentId) params.assessmentId = query.assessmentId;
    if (query.departmentId) params.departmentId = query.departmentId;
    if (query.classId) params.classId = query.classId;
    if (query.status && query.status !== 'ALL') params.status = query.status;
    if (query.search) params.search = query.search;
    if (query.page) params.page = query.page;
    if (query.limit) params.limit = query.limit;
    if (query.sortBy) params.sortBy = query.sortBy;
    if (query.sortOrder) params.sortOrder = query.sortOrder;

    const res = await apiClient.get('/attendance/records', { params });
    return res.data.data;
  }

  /**
   * Get all not-attended students for a specific closed assessment
   */
  async getNotAttendedStudents(assessmentId: string): Promise<StudentAttendanceRecordDto[]> {
    const res = await apiClient.get(`/attendance/assessments/${assessmentId}/not-attended`);
    return res.data.data;
  }

  /**
   * Download Excel spreadsheet of not-attended students
   */
  async exportNotAttendedExcel(assessmentId: string, assessmentName?: string): Promise<string> {
    const res = await apiClient.get(`/attendance/assessments/${assessmentId}/export`, {
      responseType: 'blob',
    });

    let filename = `Not_Attended_Students_${assessmentName ? assessmentName.replace(/[^a-zA-Z0-9_-]/g, '_') : assessmentId}_${new Date().toISOString().slice(0, 10)}.xlsx`;
    const disposition = res.headers['content-disposition'];
    if (disposition) {
      const match = disposition.match(/filename=["']?([^"';]+)["']?/i);
      if (match && match[1]) {
        filename = match[1].trim();
      }
    }

    const blob = new Blob([res.data], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);

    return filename;
  }

  /**
   * Trigger email reminders to not-attended students (with duplicate prevention)
   */
  async sendReminders(
    assessmentId: string,
    payload: {
      studentIds?: string[];
      customSubject?: string;
      customMessage?: string;
    } = {}
  ): Promise<SendReminderResultDto> {
    const res = await apiClient.post(`/attendance/assessments/${assessmentId}/reminders`, payload);
    return res.data.data;
  }

  /**
   * Fetch active attendance alerts requiring attention
   */
  async getActiveAlerts(): Promise<AttendanceAlertDto[]> {
    const res = await apiClient.get('/attendance/alerts');
    return res.data.data;
  }

  /**
   * Resolve an alert
   */
  async resolveAlert(alertId: string): Promise<void> {
    await apiClient.patch(`/attendance/alerts/${alertId}/resolve`);
  }

  /**
   * Trigger assessment closure sync sweep
   */
  async syncAssessments(): Promise<{ processedCount: number; newAlertsCount: number }> {
    const res = await apiClient.post('/attendance/sync');
    return res.data.data;
  }

  /**
   * Fetch factual repeated non-attendance insights
   */
  async getRepeatedNonAttendance(): Promise<RepeatedNonAttendanceStudentDto[]> {
    const res = await apiClient.get('/attendance/repeated-non-attendance');
    return res.data.data;
  }

  /**
   * Get automation configuration for an assessment
   */
  async getConfig(assessmentId: string): Promise<AttendanceAutomationConfigDto> {
    const res = await apiClient.get(`/attendance/assessments/${assessmentId}/config`);
    return res.data.data;
  }

  /**
   * Update automation configuration for an assessment
   */
  async updateConfig(
    assessmentId: string,
    payload: Partial<AttendanceAutomationConfigDto>
  ): Promise<AttendanceAutomationConfigDto> {
    const res = await apiClient.put(`/attendance/assessments/${assessmentId}/config`, payload);
    return res.data.data;
  }

  /**
   * Get student's own attendance history
   */
  async getStudentOwnAttendance(): Promise<StudentAttendanceRecordDto[]> {
    const res = await apiClient.get('/attendance/student/me');
    return res.data.data;
  }
}

export const attendanceService = new AttendanceService();
