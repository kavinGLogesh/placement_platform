import { apiClient } from '../api/axios.client.js';
import {
  PlacementDrive,
  CreatePlacementDriveInput,
  UpdatePlacementDriveInput,
  DriveEligibilitySummary,
  DriveRegistration,
  RegisterStudentsInput,
  UpdateRegistrationStageInput,
  DriveStatus,
} from '../types/placement-drive.types.js';

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export const placementDriveService = {
  async getDrives(filters?: { status?: DriveStatus; search?: string }): Promise<PlacementDrive[]> {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.search) params.append('search', filters.search);

    const query = params.toString() ? `?${params.toString()}` : '';
    const res = await apiClient.get<ApiResponse<PlacementDrive[]>>(`/admin/placement-drives${query}`);
    return res.data.data;
  },

  async getDriveById(id: string): Promise<PlacementDrive> {
    const res = await apiClient.get<ApiResponse<PlacementDrive>>(`/admin/placement-drives/${id}`);
    return res.data.data;
  },

  async createDrive(data: CreatePlacementDriveInput): Promise<PlacementDrive> {
    const res = await apiClient.post<ApiResponse<PlacementDrive>>('/admin/placement-drives', data);
    return res.data.data;
  },

  async updateDrive(id: string, data: UpdatePlacementDriveInput): Promise<PlacementDrive> {
    const res = await apiClient.put<ApiResponse<PlacementDrive>>(`/admin/placement-drives/${id}`, data);
    return res.data.data;
  },

  async deleteDrive(id: string): Promise<void> {
    await apiClient.delete<ApiResponse<{ success: boolean }>>(`/admin/placement-drives/${id}`);
  },

  async getEligibility(driveId: string): Promise<DriveEligibilitySummary> {
    const res = await apiClient.get<ApiResponse<DriveEligibilitySummary>>(
      `/admin/placement-drives/${driveId}/eligibility`
    );
    return res.data.data;
  },

  async registerStudents(
    driveId: string,
    data: RegisterStudentsInput
  ): Promise<{ registeredCount: number; duplicateCount: number; registrations: DriveRegistration[] }> {
    const res = await apiClient.post<
      ApiResponse<{ registeredCount: number; duplicateCount: number; registrations: DriveRegistration[] }>
    >(`/admin/placement-drives/${driveId}/register`, data);
    return res.data.data;
  },

  async getRegistrations(driveId: string): Promise<DriveRegistration[]> {
    const res = await apiClient.get<ApiResponse<DriveRegistration[]>>(
      `/admin/placement-drives/${driveId}/registrations`
    );
    return res.data.data;
  },

  async updateRegistrationStage(
    driveId: string,
    registrationId: string,
    data: UpdateRegistrationStageInput
  ): Promise<DriveRegistration> {
    const res = await apiClient.put<ApiResponse<DriveRegistration>>(
      `/admin/placement-drives/${driveId}/registrations/${registrationId}`,
      data
    );
    return res.data.data;
  },

  async getStudentDriveHistory(studentId: string): Promise<DriveRegistration[]> {
    const res = await apiClient.get<ApiResponse<DriveRegistration[]>>(
      `/admin/placement-drives/students/${studentId}/history`
    );
    return res.data.data;
  },
};
