import { apiClient } from '../api/axios.client';
import {
  CodingExecutionResponse,
  CodingQuestion,
  SubmissionHistoryItem,
  SupportedLanguage,
} from '../types/coding.types';

export class CodingService {
  /**
   * Fetch sanitized coding question specifications, constraints, starter codes, and sample tests.
   */
  async getCodingQuestion(attemptId: string, questionId: string): Promise<CodingQuestion> {
    const res = await apiClient.get(`/attempts/${attemptId}/coding/${questionId}`);
    return res.data.data;
  }

  /**
   * Execute source code against sample test cases (dry run).
   */
  async runCode(
    attemptId: string,
    questionId: string,
    language: SupportedLanguage,
    sourceCode: string
  ): Promise<CodingExecutionResponse> {
    const res = await apiClient.post(`/attempts/${attemptId}/coding/${questionId}/run`, {
      language,
      sourceCode,
    });
    return res.data.data;
  }

  /**
   * Evaluate and formally submit code against all sample and hidden test cases.
   */
  async submitCode(
    attemptId: string,
    questionId: string,
    language: SupportedLanguage,
    sourceCode: string
  ): Promise<CodingExecutionResponse> {
    const res = await apiClient.post(`/attempts/${attemptId}/coding/${questionId}/submit`, {
      language,
      sourceCode,
    });
    return res.data.data;
  }

  /**
   * Retrieve submission history for this attempt and question.
   */
  async getSubmissions(attemptId: string, questionId: string): Promise<SubmissionHistoryItem[]> {
    const res = await apiClient.get(`/attempts/${attemptId}/coding/${questionId}/submissions`);
    return res.data.data;
  }

  /**
   * Retrieve detailed execution results for a previous submission.
   */
  async getSubmissionDetail(
    attemptId: string,
    submissionId: string
  ): Promise<CodingExecutionResponse> {
    const res = await apiClient.get(`/attempts/${attemptId}/coding/submissions/${submissionId}`);
    return res.data.data;
  }
}

export const codingService = new CodingService();
