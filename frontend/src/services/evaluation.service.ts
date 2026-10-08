import { apiClient } from '../api/axios.client.js';
import {
  GdRoundDto,
  InterviewRoundDto,
  GdEvaluationDto,
  InterviewEvaluationDto,
  StudentEvaluationItemDto,
  StudentHumanEvaluationSummaryDto,
  CreateGdRoundInput,
  CreateInterviewRoundInput,
  SubmitGdEvaluationInput,
  SubmitInterviewEvaluationInput,
  AttendanceStatus,
  BulkEvaluationRequestDto,
  BulkEvaluationResultDto,
} from '../types/evaluation.types.js';

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export const evaluationService = {
  // ===========================================================================
  // GD ROUNDS (ADMIN & EVALUATOR)
  // ===========================================================================

  async getGdRounds(filters?: {
    status?: string;
    departmentId?: string;
    evaluatorId?: string;
  }): Promise<GdRoundDto[]> {
    const res = await apiClient.get<ApiResponse<GdRoundDto[]>>('/gd', { params: filters });
    return res.data.data;
  },

  async getGdRoundById(id: string): Promise<GdRoundDto> {
    const res = await apiClient.get<ApiResponse<GdRoundDto>>(`/gd/${id}`);
    return res.data.data;
  },

  async createGdRound(payload: CreateGdRoundInput): Promise<GdRoundDto> {
    const res = await apiClient.post<ApiResponse<GdRoundDto>>('/gd', payload);
    return res.data.data;
  },

  async updateGdRound(id: string, payload: Partial<CreateGdRoundInput> & { status?: string }): Promise<GdRoundDto> {
    const res = await apiClient.put<ApiResponse<GdRoundDto>>(`/gd/${id}`, payload);
    return res.data.data;
  },

  async deleteGdRound(id: string): Promise<void> {
    await apiClient.delete(`/gd/${id}`);
  },

  async assignStudentsToGd(roundId: string, studentIds: string[]): Promise<{ assignedCount: number }> {
    const res = await apiClient.post<ApiResponse<{ assignedCount: number }>>(`/gd/${roundId}/students`, {
      studentIds,
    });
    return res.data.data;
  },

  async removeParticipantFromGd(roundId: string, participantId: string): Promise<void> {
    await apiClient.delete(`/gd/${roundId}/participants/${participantId}`);
  },

  async updateGdAttendance(participantId: string, attendance: AttendanceStatus): Promise<void> {
    await apiClient.put(`/gd/participants/${participantId}/attendance`, { attendance });
  },

  async batchUpdateGdAttendance(records: Array<{ participantId: string; attendance: AttendanceStatus }>): Promise<void> {
    await apiClient.post('/gd/attendance/batch', { records });
  },

  async submitGdEvaluation(roundId: string, payload: SubmitGdEvaluationInput): Promise<GdEvaluationDto> {
    const res = await apiClient.post<ApiResponse<GdEvaluationDto>>(`/gd/${roundId}/evaluate`, payload);
    return res.data.data;
  },

  async bulkEvaluateGd(roundId: string, payload: BulkEvaluationRequestDto): Promise<BulkEvaluationResultDto> {
    const res = await apiClient.post<ApiResponse<BulkEvaluationResultDto>>(`/gd/${roundId}/evaluations/bulk`, payload);
    return res.data.data;
  },

  // ===========================================================================
  // INTERVIEW ROUNDS (ADMIN & EVALUATOR)
  // ===========================================================================

  async getInterviewRounds(filters?: {
    status?: string;
    interviewType?: string;
    departmentId?: string;
    evaluatorId?: string;
  }): Promise<InterviewRoundDto[]> {
    const res = await apiClient.get<ApiResponse<InterviewRoundDto[]>>('/interviews', { params: filters });
    return res.data.data;
  },

  async getInterviewRoundById(id: string): Promise<InterviewRoundDto> {
    const res = await apiClient.get<ApiResponse<InterviewRoundDto>>(`/interviews/${id}`);
    return res.data.data;
  },

  async createInterviewRound(payload: CreateInterviewRoundInput): Promise<InterviewRoundDto> {
    const res = await apiClient.post<ApiResponse<InterviewRoundDto>>('/interviews', payload);
    return res.data.data;
  },

  async updateInterviewRound(
    id: string,
    payload: Partial<CreateInterviewRoundInput> & { status?: string }
  ): Promise<InterviewRoundDto> {
    const res = await apiClient.put<ApiResponse<InterviewRoundDto>>(`/interviews/${id}`, payload);
    return res.data.data;
  },

  async deleteInterviewRound(id: string): Promise<void> {
    await apiClient.delete(`/interviews/${id}`);
  },

  async assignStudentsToInterview(roundId: string, studentIds: string[]): Promise<{ assignedCount: number }> {
    const res = await apiClient.post<ApiResponse<{ assignedCount: number }>>(`/interviews/${roundId}/students`, {
      studentIds,
    });
    return res.data.data;
  },

  async removeParticipantFromInterview(roundId: string, participantId: string): Promise<void> {
    await apiClient.delete(`/interviews/${roundId}/participants/${participantId}`);
  },

  async updateInterviewAttendance(participantId: string, attendance: AttendanceStatus): Promise<void> {
    await apiClient.put(`/interviews/participants/${participantId}/attendance`, { attendance });
  },

  async batchUpdateInterviewAttendance(
    records: Array<{ participantId: string; attendance: AttendanceStatus }>
  ): Promise<void> {
    await apiClient.post('/interviews/attendance/batch', { records });
  },

  async submitInterviewEvaluation(
    roundId: string,
    payload: SubmitInterviewEvaluationInput
  ): Promise<InterviewEvaluationDto> {
    const res = await apiClient.post<ApiResponse<InterviewEvaluationDto>>(`/interviews/${roundId}/evaluate`, payload);
    return res.data.data;
  },

  async bulkEvaluateInterview(
    roundId: string,
    payload: BulkEvaluationRequestDto
  ): Promise<BulkEvaluationResultDto> {
    const res = await apiClient.post<ApiResponse<BulkEvaluationResultDto>>(
      `/interviews/${roundId}/evaluations/bulk`,
      payload
    );
    return res.data.data;
  },

  // ===========================================================================
  // STUDENT PORTAL & SHARED EVALUATION QUERIES
  // ===========================================================================

  async getStudentGdEvaluations(): Promise<StudentEvaluationItemDto[]> {
    const res = await apiClient.get<ApiResponse<StudentEvaluationItemDto[]>>('/student/evaluations/gd');
    return res.data.data;
  },

  async getStudentInterviewEvaluations(): Promise<StudentEvaluationItemDto[]> {
    const res = await apiClient.get<ApiResponse<StudentEvaluationItemDto[]>>('/student/evaluations/interviews');
    return res.data.data;
  },

  async getStudentEvaluationSummary(): Promise<StudentHumanEvaluationSummaryDto> {
    const res = await apiClient.get<ApiResponse<StudentHumanEvaluationSummaryDto>>('/student/evaluations/summary');
    return res.data.data;
  },

  async getStudentEvaluationHistory(studentId: string): Promise<{
    studentId: string;
    gdEvaluations: any[];
    interviewEvaluations: any[];
  }> {
    const res = await apiClient.get<ApiResponse<any>>(`/evaluations/student/${studentId}/history`);
    return res.data.data;
  },
};
