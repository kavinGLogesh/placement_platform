import { apiClient } from '../api/axios.client.js';
import {
  Question,
  CreateQuestionInput,
  UpdateQuestionInput,
  QuestionFilters,
  QuestionStatus,
  CATEGORY_TOPICS_MAP,
} from '../types/question.types.js';
import { PaginatedResult } from '../types/management.types.js';

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export const questionService = {
  async getQuestions(filters: QuestionFilters = {}): Promise<PaginatedResult<Question>> {
    const res = await apiClient.get<ApiResponse<PaginatedResult<Question>>>('/questions', {
      params: filters,
    });
    return res.data.data;
  },

  async getQuestionById(id: string): Promise<Question> {
    const res = await apiClient.get<ApiResponse<Question>>(`/questions/${id}`);
    return res.data.data;
  },

  async uploadQuestionImage(file: File): Promise<{ imageUrl: string; filename: string }> {
    const formData = new FormData();
    formData.append('image', file);
    const res = await apiClient.post<ApiResponse<{ imageUrl: string; filename: string }>>(
      '/questions/upload-image',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return res.data.data;
  },

  async createQuestion(payload: CreateQuestionInput): Promise<Question> {
    const res = await apiClient.post<ApiResponse<Question>>('/questions', payload);
    return res.data.data;
  },

  async updateQuestion(id: string, payload: UpdateQuestionInput): Promise<Question> {
    const res = await apiClient.put<ApiResponse<Question>>(`/questions/${id}`, payload);
    return res.data.data;
  },

  async updateQuestionStatus(id: string, status: QuestionStatus): Promise<Question> {
    const res = await apiClient.patch<ApiResponse<Question>>(`/questions/${id}/status`, { status });
    return res.data.data;
  },

  async deleteQuestion(id: string): Promise<void> {
    await apiClient.delete(`/questions/${id}`);
  },

  async getCategoryTopicsMap(): Promise<typeof CATEGORY_TOPICS_MAP> {
    const res = await apiClient.get<ApiResponse<typeof CATEGORY_TOPICS_MAP>>('/questions/categories');
    return res.data.data;
  },

  async aiAnalyzeDocument(params: {
    file?: File;
    text?: string;
    apiKey?: string;
    companyId?: string;
  }): Promise<import('../types/question.types.js').GeminiParsedQuestionResult> {
    const formData = new FormData();
    if (params.file) {
      formData.append('file', params.file);
    }
    if (params.text) {
      formData.append('text', params.text);
    }
    if (params.apiKey) {
      formData.append('apiKey', params.apiKey);
    }
    if (params.companyId) {
      formData.append('companyId', params.companyId);
    }

    const headers: Record<string, string> = {
      'Content-Type': 'multipart/form-data',
    };
    if (params.apiKey) {
      headers['x-gemini-key'] = params.apiKey;
    }

    const res = await apiClient.post<ApiResponse<import('../types/question.types.js').GeminiParsedQuestionResult>>(
      '/questions/ai-analyze',
      formData,
      { headers }
    );
    return res.data.data;
  },

  async bulkCreateQuestions(questions: CreateQuestionInput[]): Promise<{
    created: Question[];
    failed: { index: number; reason: string }[];
  }> {
    const res = await apiClient.post<ApiResponse<{
      created: Question[];
      failed: { index: number; reason: string }[];
    }>>('/questions/bulk', {
      questions,
    });
    return res.data.data;
  },

  // ===========================================================================
  // AI CLASSIFICATION INTELLIGENCE
  // ===========================================================================

  async classifyQuestion(id: string): Promise<Question> {
    const res = await apiClient.post<ApiResponse<Question>>(`/questions/${id}/classify`);
    return res.data.data;
  },

  async autoDetectClassification(input: import('../types/question.types.js').AiDetectInput): Promise<import('../types/question.types.js').AiDetectResult> {
    const res = await apiClient.post<ApiResponse<import('../types/question.types.js').AiDetectResult>>('/questions/ai/detect', input);
    return res.data.data;
  },

  async batchClassifyQuestions(questionIds: string[]): Promise<import('../types/question.types.js').BatchClassifyResponse> {
    const res = await apiClient.post<ApiResponse<import('../types/question.types.js').BatchClassifyResponse>>('/questions/ai/batch-classify', {
      questionIds,
    });
    return res.data.data;
  },

  async reviewClassification(
    id: string,
    review: import('../types/question.types.js').AdminReviewClassificationInput
  ): Promise<Question> {
    const res = await apiClient.post<ApiResponse<Question>>(`/questions/${id}/review-classification`, review);
    return res.data.data;
  },

  async getQuestionsNeedingReview(page = 1, limit = 10): Promise<PaginatedResult<Question>> {
    const res = await apiClient.get<ApiResponse<PaginatedResult<Question>>>('/questions/ai/needs-review', {
      params: { page, limit },
    });
    return res.data.data;
  },
};

