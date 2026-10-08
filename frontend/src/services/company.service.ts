import { apiClient } from '../api/axios.client.js';
import {
  CompanyDto,
  CreateCompanyDto,
  UpdateCompanyDto,
  CompanyQueryFilters,
  CompanyQuestionDto,
  CompanyQuestionIntelligenceDto,
  CompanyQuestionUploadResult,
  QuestionDuplicateCandidateDto,
  CompanyQuestionFilter,
} from '../types/company.types.js';
import { PaginatedResult } from '../types/management.types.js';

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  pagination?: any;
}

export const companyService = {
  async getCompanies(filters: CompanyQueryFilters = {}): Promise<PaginatedResult<CompanyDto>> {
    const res = await apiClient.get<any>('/companies', {
      params: filters,
    });
    const body = res.data;

    // Standard backend shape: { success: true, message: '...', data: CompanyDto[], pagination: { totalCount, ... } }
    if (body && Array.isArray(body.data)) {
      return {
        data: body.data,
        pagination: body.pagination || {
          totalCount: body.data.length,
          page: 1,
          limit: body.data.length,
          totalPages: 1,
        },
      };
    }

    // Nested shape: { success: true, message: '...', data: { data: CompanyDto[], pagination: { ... } } }
    if (body?.data?.data && Array.isArray(body.data.data)) {
      return {
        data: body.data.data,
        pagination: body.data.pagination || {
          totalCount: body.data.data.length,
          page: 1,
          limit: body.data.data.length,
          totalPages: 1,
        },
      };
    }

    // Direct array: CompanyDto[]
    if (Array.isArray(body)) {
      return {
        data: body,
        pagination: {
          totalCount: body.length,
          page: 1,
          limit: body.length || 10,
          totalPages: 1,
          hasNextPage: false,
          hasPrevPage: false,
        },
      };
    }

    return {
      data: [],
      pagination: {
        totalCount: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
        hasNextPage: false,
        hasPrevPage: false,
      },
    };
  },

  async getCompanyById(id: string): Promise<CompanyDto> {
    const res = await apiClient.get<ApiResponse<CompanyDto>>(`/companies/${id}`);
    return res.data.data;
  },

  async createCompany(payload: CreateCompanyDto): Promise<CompanyDto> {
    const res = await apiClient.post<ApiResponse<CompanyDto>>('/companies', payload);
    return res.data.data;
  },

  async updateCompany(id: string, payload: UpdateCompanyDto): Promise<CompanyDto> {
    const res = await apiClient.put<ApiResponse<CompanyDto>>(`/companies/${id}`, payload);
    return res.data.data;
  },

  async updateStatus(id: string, isActive: boolean): Promise<CompanyDto> {
    const res = await apiClient.patch<ApiResponse<CompanyDto>>(`/companies/${id}/status`, { isActive });
    return res.data.data;
  },

  async deleteCompany(id: string): Promise<void> {
    await apiClient.delete(`/companies/${id}`);
  },

  async getIntelligence(id: string): Promise<CompanyQuestionIntelligenceDto> {
    const res = await apiClient.get<ApiResponse<CompanyQuestionIntelligenceDto>>(`/companies/${id}/intelligence`);
    return res.data.data;
  },

  async getQuestions(
    id: string,
    filters: CompanyQuestionFilter = {}
  ): Promise<PaginatedResult<CompanyQuestionDto>> {
    const res = await apiClient.get<ApiResponse<CompanyQuestionDto[]>>(`/companies/${id}/questions`, {
      params: filters,
    });
    return {
      data: Array.isArray(res.data.data) ? res.data.data : [],
      pagination: res.data.pagination || {
        totalCount: Array.isArray(res.data.data) ? res.data.data.length : 0,
        page: filters.page || 1,
        limit: filters.limit || 10,
        totalPages: 1,
        hasNextPage: false,
        hasPrevPage: false,
      },
    };
  },

  async uploadQuestions(id: string, file: File): Promise<CompanyQuestionUploadResult> {
    const formData = new FormData();
    formData.append('file', file);
    const res = await apiClient.post<ApiResponse<CompanyQuestionUploadResult>>(
      `/companies/${id}/questions/upload`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return res.data.data;
  },

  async getDuplicates(id?: string): Promise<QuestionDuplicateCandidateDto[]> {
    const url = id ? `/companies/${id}/duplicates` : '/companies/duplicates';
    const res = await apiClient.get<ApiResponse<QuestionDuplicateCandidateDto[]>>(url);
    return Array.isArray(res.data.data) ? res.data.data : [];
  },

  async resolveDuplicate(
    candidateId: string,
    status: 'CONFIRMED_DUPLICATE' | 'REJECTED'
  ): Promise<QuestionDuplicateCandidateDto> {
    const res = await apiClient.patch<ApiResponse<QuestionDuplicateCandidateDto>>(
      `/companies/duplicates/${candidateId}`,
      { status }
    );
    return res.data.data;
  },
};
