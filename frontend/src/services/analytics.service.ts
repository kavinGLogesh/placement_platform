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
    const params: Record<string, any> = {};
    if (query.page) params.page = query.page;
    if (query.limit) params.limit = query.limit;
    if (query.search) params.search = query.search;
    if (query.departmentId) params.departmentId = query.departmentId;
    if (query.assessmentId) params.assessmentId = query.assessmentId;
    if (query.isPassed !== undefined) params.isPassed = query.isPassed;
    if (query.startDate) params.startDate = query.startDate;
    if (query.endDate) params.endDate = query.endDate;
    if (query.sortBy) params.sortBy = query.sortBy;
    if (query.sortOrder) params.sortOrder = query.sortOrder;

    const res = await apiClient.get('/results', { params });
    return res.data.data;
  }

  /**
   * Get executive KPIs and summary (Admin)
   */
  async getAdminOverview(): Promise<AdminAnalyticsSummaryDto> {
    const res = await apiClient.get('/analytics');
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
