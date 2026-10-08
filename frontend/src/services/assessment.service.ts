import { apiClient } from '../api/axios.client.js';
import {
  AssessmentDto,
  CreateAssessmentDto,
  UpdateAssessmentDto,
  AssessmentPaperDto,
  AssessmentAssignmentDto,
  CreateAssignmentDto,
  AssessmentQueryFilters,
  PaperGenerationResult,
} from '../types/assessment.types.js';
import { PaginatedResult } from '../types/management.types.js';

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export const assessmentService = {
  async getAssessments(filters: AssessmentQueryFilters = {}): Promise<PaginatedResult<AssessmentDto>> {
    const res = await apiClient.get<ApiResponse<PaginatedResult<AssessmentDto>>>('/assessments', {
      params: filters,
    });
    return res.data.data;
  },

  async getAssessmentById(id: string): Promise<AssessmentDto> {
    const res = await apiClient.get<ApiResponse<AssessmentDto>>(`/assessments/${id}`);
    return res.data.data;
  },

  async createAssessment(payload: CreateAssessmentDto): Promise<AssessmentDto> {
    const res = await apiClient.post<ApiResponse<AssessmentDto>>('/assessments', payload);
    return res.data.data;
  },

  async updateAssessment(id: string, payload: UpdateAssessmentDto): Promise<AssessmentDto> {
    const res = await apiClient.put<ApiResponse<AssessmentDto>>(`/assessments/${id}`, payload);
    return res.data.data;
  },

  async deleteAssessment(id: string): Promise<void> {
    await apiClient.delete(`/assessments/${id}`);
  },

  async generatePapers(id: string): Promise<PaperGenerationResult> {
    const res = await apiClient.post<ApiResponse<PaperGenerationResult>>(`/assessments/${id}/generate`);
    return res.data.data;
  },

  async getAssessmentPapers(id: string): Promise<AssessmentPaperDto[]> {
    const res = await apiClient.get<ApiResponse<AssessmentPaperDto[]>>(`/assessments/${id}/papers`);
    return res.data.data;
  },

  async publishAssessment(id: string): Promise<AssessmentDto> {
    const res = await apiClient.post<ApiResponse<AssessmentDto>>(`/assessments/${id}/publish`);
    return res.data.data;
  },

  async unpublishAssessment(id: string): Promise<AssessmentDto> {
    const res = await apiClient.post<ApiResponse<AssessmentDto>>(`/assessments/${id}/unpublish`);
    return res.data.data;
  },

  async scheduleAssessment(
    id: string,
    schedule: { startDate: string; endDate: string }
  ): Promise<AssessmentDto> {
    const res = await apiClient.patch<ApiResponse<AssessmentDto>>(`/assessments/${id}/schedule`, schedule);
    return res.data.data;
  },

  async assignStudents(
    id: string,
    payload: CreateAssignmentDto
  ): Promise<{ assignedCount: number; assignments: AssessmentAssignmentDto[] }> {
    const res = await apiClient.post<ApiResponse<{ assignedCount: number; assignments: AssessmentAssignmentDto[] }>>(
      `/assessments/${id}/assign`,
      payload
    );
    return res.data.data;
  },

  async getAssessmentAssignments(id: string): Promise<AssessmentAssignmentDto[]> {
    const res = await apiClient.get<ApiResponse<AssessmentAssignmentDto[]>>(`/assessments/${id}/assignments`);
    return res.data.data;
  },
};
