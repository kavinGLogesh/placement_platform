import { apiClient } from '../api/axios.client.js';
import {
  ResultsFilterQuery,
  PaginatedResultsDto,
  AdminAnalyticsSummaryDto,
  DepartmentAnalyticsDto,
  TopicAnalyticsDto,
  PlacementFunnelDto,
  StudentDrilldownDto,
  StudentDashboardDto,
  StudentPerformanceAnalyticsDto,
} from '../types/analytics.types.js';

export class AnalyticsService {
  /**
   * Get paginated, filtered, and sorted assessment results (Admin)
   */
  async getResults(query: ResultsFilterQuery = {}): Promise<PaginatedResultsDto> {
    const res = await apiClient.get('/results', { params: query });
    return res.data.data;
  }

  /**
   * Get executive KPIs and summary with dynamic filters (Admin)
   */
  async getAdminOverview(filters: ResultsFilterQuery = {}): Promise<AdminAnalyticsSummaryDto> {
    const res = await apiClient.get('/analytics', { params: filters });
    return res.data.data;
  }

  /**
   * Get assessment-level breakdown (Admin)
   */
  async getAssessmentSummary(assessmentId: string): Promise<any> {
    const res = await apiClient.get('/analytics/assessment-summary', { params: { assessmentId } });
    return res.data.data;
  }

  /**
   * Get department comparisons (Admin)
   */
  async getDepartmentAnalytics(filters?: {
    assessmentId?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<DepartmentAnalyticsDto[]> {
    const res = await apiClient.get('/analytics/departments', { params: filters });
    return res.data.data;
  }

  /**
   * Get category & topic analytics (Admin)
   */
  async getTopicAnalytics(filters?: {
    assessmentId?: string;
    departmentId?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<TopicAnalyticsDto> {
    const res = await apiClient.get('/analytics/topics', { params: filters });
    return res.data.data;
  }

  /**
   * Get placement funnel analytics (Admin)
   */
  async getPlacementFunnel(filters?: {
    assessmentId?: string;
    departmentId?: string;
    batchYear?: number;
  }): Promise<PlacementFunnelDto> {
    const res = await apiClient.get('/analytics/funnel', { params: filters });
    return res.data.data;
  }

  /**
   * Get student drilldown performance (Admin)
   */
  async getStudentDrilldown(studentId: string): Promise<StudentDrilldownDto> {
    const res = await apiClient.get(`/analytics/students/${studentId}`);
    return res.data.data;
  }

  /**
   * Get student dashboard overview & upcoming assessments (Student)
   */
  async getStudentDashboard(): Promise<StudentDashboardDto> {
    const res = await apiClient.get('/student/dashboard');
    return res.data.data;
  }

  /**
   * Get student detailed performance, trends & topic breakdown (Student)
   */
  async getStudentPerformance(): Promise<StudentPerformanceAnalyticsDto> {
    const res = await apiClient.get('/student/performance');
    return res.data.data;
  }
}

export const analyticsService = new AnalyticsService();
