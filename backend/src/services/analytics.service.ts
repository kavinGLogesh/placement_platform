import {
  analyticsRepository,
  AnalyticsRepository,
} from '../repositories/analytics.repository.js';
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
import { AppError } from '../middleware/errorHandler.js';

export class AnalyticsService {
  constructor(private readonly analyticsRepo: AnalyticsRepository = analyticsRepository) {}

  async getPaginatedResults(query: ResultsFilterQuery): Promise<PaginatedResultsDto> {
    return this.analyticsRepo.getPaginatedResults(query);
  }

  async getAdminOverview(): Promise<AdminAnalyticsSummaryDto> {
    return this.analyticsRepo.getAdminOverviewMetrics();
  }

  async getDepartmentAnalytics(filters?: {
    assessmentId?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<DepartmentAnalyticsDto[]> {
    return this.analyticsRepo.getDepartmentAnalytics(filters);
  }

  async getTopicAnalytics(filters?: {
    assessmentId?: string;
    departmentId?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<TopicAnalyticsDto> {
    return this.analyticsRepo.getTopicAnalytics(filters);
  }

  async getPlacementFunnel(filters?: {
    assessmentId?: string;
    departmentId?: string;
    batchYear?: number;
  }): Promise<PlacementFunnelDto> {
    return this.analyticsRepo.getPlacementFunnel(filters);
  }

  async getStudentDrilldown(studentId: string): Promise<StudentDrilldownDto> {
    if (!studentId) {
      throw new AppError('Student ID is required', 400);
    }
    const data = await this.analyticsRepo.getStudentDrilldown(studentId);
    if (!data) {
      throw new AppError('Student performance record not found', 404);
    }
    return data;
  }

  async getStudentDashboard(studentId: string): Promise<StudentDashboardDto> {
    if (!studentId) {
      throw new AppError('Student ID is required', 400);
    }
    return this.analyticsRepo.getStudentDashboardData(studentId);
  }

  async getStudentPerformance(studentId: string): Promise<StudentPerformanceAnalyticsDto> {
    if (!studentId) {
      throw new AppError('Student ID is required', 400);
    }
    return this.analyticsRepo.getStudentPerformanceData(studentId);
  }
}

export const analyticsService = new AnalyticsService();
