import { apiClient } from '../api/axios.client.js';
import { ApiResponse } from '../types/api.types.js';

export interface StudentDriveListing {
  drive: {
    id: string;
    companyName: string;
    jobRole: string;
    jobDescription?: string | null;
    location?: string | null;
    packageDetails?: string | null;
    vacancies?: number | null;
    driveDate: string;
    registrationDeadline: string;
    status: 'UPCOMING' | 'ONGOING' | 'COMPLETED' | 'CANCELLED';
    minTenthPercentage?: number | null;
    minTwelfthPercentage?: number | null;
    minCgpa?: number | null;
    maxActiveBacklogs?: number | null;
    eligibleDepartments?: string[] | null;
    eligibleBatchYears?: number[] | null;
    requiredSkills?: Array<{ name: string; minLevel?: string }> | null;
    selectionProcess?: string[] | null;
    registrationLink?: string | null;
    instructions?: string | null;
  };
  isEligible: boolean;
  category: 'ELIGIBLE' | 'NOT_ELIGIBLE' | 'MISSING_DATA';
  failureReasons: string[];
  missingDetails: string[];
  isApplied: boolean;
  isShortlisted: boolean;
  registrationId?: string;
  currentStage?:
    | 'SHORTLISTED'
    | 'APPLIED'
    | 'REGISTERED'
    | 'ASSESSMENT_SHORTLISTED'
    | 'TECHNICAL_ROUND'
    | 'HR_ROUND'
    | 'SELECTED'
    | 'REJECTED'
    | 'OPTED_OUT';
  stageRemarks?: string | null;
  appliedAt?: string;
}

export interface StudentNotificationItem {
  id: string;
  studentId: string;
  title: string;
  message: string;
  type: string;
  driveId?: string | null;
  read: boolean;
  createdAt: string;
  updatedAt: string;
  drive?: {
    id: string;
    companyName: string;
    jobRole: string;
  };
}

export interface StudentNotificationResponse {
  notifications: StudentNotificationItem[];
  unreadCount: number;
}

export interface CandidateStats {
  totalEligible: number;
  applied: number;
  shortlisted: number;
  interviewScheduled: number;
  selected: number;
  rejected: number;
  pending: number;
}

export interface CandidateAuditLog {
  id: string;
  driveId: string;
  studentId: string;
  previousStage: string | null;
  newStage: string;
  changedBy: string;
  remarks?: string | null;
  createdAt: string;
  student?: {
    id: string;
    name: string;
    registerNumber: string;
    collegeEmail: string;
  };
}

class PlacementStudentService {
  // Student Portal
  async getStudentDrives(): Promise<StudentDriveListing[]> {
    const res = await apiClient.get<ApiResponse<StudentDriveListing[]>>('/student/placement-drives');
    return res.data.data ?? [];
  }

  async applyForDrive(driveId: string): Promise<any> {
    const res = await apiClient.post<ApiResponse<any>>(`/student/placement-drives/${driveId}/apply`);
    return res.data.data!;
  }

  async getNotifications(limit: number = 50): Promise<StudentNotificationResponse> {
    const res = await apiClient.get<ApiResponse<StudentNotificationResponse>>(`/student/notifications?limit=${limit}`);
    return res.data.data ?? { notifications: [], unreadCount: 0 };
  }

  async markNotificationAsRead(id: string): Promise<boolean> {
    const res = await apiClient.put<ApiResponse<{ success: boolean }>>(`/student/notifications/${id}/read`);
    return Boolean(res.data.data?.success);
  }

  async markAllNotificationsAsRead(): Promise<number> {
    const res = await apiClient.put<ApiResponse<{ markedCount: number }>>('/student/notifications/read-all');
    return res.data.data?.markedCount ?? 0;
  }

  // Admin Placement Drive Enhancements
  async getDriveCandidateStats(driveId: string): Promise<CandidateStats> {
    const res = await apiClient.get<ApiResponse<CandidateStats>>(`/admin/placement-drives/${driveId}/stats`);
    return res.data.data!;
  }

  async bulkUpdateCandidateStage(
    driveId: string,
    registrationIds: string[],
    stage: string,
    remarks?: string
  ): Promise<{ updatedCount: number }> {
    const res = await apiClient.post<ApiResponse<{ updatedCount: number }>>(
      `/admin/placement-drives/${driveId}/bulk-stage`,
      { registrationIds, stage, remarks }
    );
    return res.data.data!;
  }

  async shortlistCandidates(
    driveId: string,
    input: {
      studentIds: string[];
      registrationLink?: string;
      instructions?: string;
      packageDetails?: string;
      jobDescription?: string;
      location?: string;
      notifyCandidates?: boolean;
    }
  ): Promise<{ shortlistedCount: number; notifiedCount: number; registrations: any[] }> {
    const res = await apiClient.post<
      ApiResponse<{ shortlistedCount: number; notifiedCount: number; registrations: any[] }>
    >(`/admin/placement-drives/${driveId}/shortlist`, input);
    return res.data.data!;
  }

  async finalizeDriveSelections(driveId: string): Promise<{ finalizedCount: number; rejectedCount: number; selectedCount: number }> {
    const res = await apiClient.post<ApiResponse<{ finalizedCount: number; rejectedCount: number; selectedCount: number }>>(
      `/admin/placement-drives/${driveId}/finalize`
    );
    return res.data.data!;
  }

  async notifyEligibleStudents(driveId: string): Promise<{ notifiedCount: number }> {
    const res = await apiClient.post<ApiResponse<{ notifiedCount: number }>>(
      `/admin/placement-drives/${driveId}/notify-eligible`
    );
    return res.data.data!;
  }

  async getDriveAuditLogs(driveId: string): Promise<CandidateAuditLog[]> {
    const res = await apiClient.get<ApiResponse<CandidateAuditLog[]>>(
      `/admin/placement-drives/${driveId}/audit-logs`
    );
    return res.data.data ?? [];
  }
}

export const placementStudentService = new PlacementStudentService();
