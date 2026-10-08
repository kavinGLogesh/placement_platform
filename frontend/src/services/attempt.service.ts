import { apiClient } from '../api/axios.client.js';
import {
  AssessmentAttemptDto,
  AssessmentResultDto,
  StudentAssessmentItemDto,
  StudentTestStatus,
  SaveAnswerDto,
  AttemptAnswerDto,
  AttemptViolationDto,
  RecordViolationDto,
} from '../types/attempt.types.js';

const OFFLINE_KEY_PREFIX = 'attempt_offline_answers_';

export class AttemptService {
  /**
   * Record an anti-cheating violation during active assessment attempt
   */
  async recordViolation(attemptId: string, data: RecordViolationDto): Promise<{ violation: AttemptViolationDto; violationCount: number }> {
    const res = await apiClient.post(`/student/attempts/${attemptId}/violations`, data);
    return res.data.data;
  }

  /**
   * Retrieve active attempt violations
   */
  async getViolations(attemptId: string): Promise<{ violations: AttemptViolationDto[]; count: number }> {
    const res = await apiClient.get(`/student/attempts/${attemptId}/violations`);
    return res.data.data;
  }

  /**
   * Fetch all tests assigned to the authenticated student
   */
  async getStudentTests(status?: StudentTestStatus): Promise<StudentAssessmentItemDto[]> {
    const params: Record<string, string> = {};
    if (status) params.status = status;
    const res = await apiClient.get('/student/tests', { params });
    return res.data.data;
  }

  /**
   * Start or resume an assessment attempt server-side
   */
  async startAssessment(assessmentId: string): Promise<AssessmentAttemptDto> {
    const res = await apiClient.post(`/student/assessments/${assessmentId}/start`);
    return res.data.data;
  }

  /**
   * Retrieve attempt state, sanitized questions, and saved answers
   */
  async getAttempt(attemptId: string): Promise<AssessmentAttemptDto> {
    const res = await apiClient.get(`/student/attempts/${attemptId}`);
    return res.data.data;
  }

  /**
   * Auto-save answer to server with continuous persistence & offline fallback
   */
  async saveAnswer(attemptId: string, answer: SaveAnswerDto): Promise<AttemptAnswerDto> {
    try {
      const res = await apiClient.post(`/student/attempts/${attemptId}/answers`, answer);
      // Remove this question from offline cache if previously stored offline
      this.removeOfflineAnswer(attemptId, answer.questionId);
      return res.data.data;
    } catch (err) {
      // Save locally to offline cache if network failure
      this.storeOfflineAnswer(attemptId, answer);
      throw err;
    }
  }

  /**
   * Synchronize batch offline answers
   */
  async batchSyncAnswers(
    attemptId: string,
    answers: SaveAnswerDto[],
    currentQuestion?: number
  ): Promise<{ syncedCount: number }> {
    const res = await apiClient.post(`/student/attempts/${attemptId}/answers`, {
      answers,
      currentQuestion,
    });
    this.clearOfflineAnswers(attemptId);
    return res.data.data;
  }

  /**
   * Idempotent submission of the assessment attempt
   */
  async submitAttempt(attemptId: string): Promise<AssessmentResultDto> {
    // Flush any pending offline answers first if connection restored
    await this.flushPendingOfflineAnswers(attemptId);
    const res = await apiClient.post(`/student/attempts/${attemptId}/submit`);
    this.clearOfflineAnswers(attemptId);
    return res.data.data;
  }

  /**
   * Retrieve student's completed test results
   */
  async getStudentResults(): Promise<AssessmentResultDto[]> {
    const res = await apiClient.get('/student/results');
    return res.data.data;
  }

  /**
   * Retrieve single result detail with IDOR protection
   */
  async getResultDetail(id: string): Promise<AssessmentResultDto> {
    const res = await apiClient.get(`/student/results/${id}`);
    return res.data.data;
  }

  // ===========================================================================
  // Offline Protection Helpers (LocalStorage / Memory)
  // ===========================================================================
  getOfflineAnswers(attemptId: string): SaveAnswerDto[] {
    try {
      const raw = localStorage.getItem(`${OFFLINE_KEY_PREFIX}${attemptId}`);
      if (!raw) return [];
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  storeOfflineAnswer(attemptId: string, answer: SaveAnswerDto): void {
    try {
      const existing = this.getOfflineAnswers(attemptId);
      const filtered = existing.filter((a) => a.questionId !== answer.questionId);
      filtered.push({ ...answer, clientTimestamp: new Date().toISOString() });
      localStorage.setItem(`${OFFLINE_KEY_PREFIX}${attemptId}`, JSON.stringify(filtered));
    } catch {
      // Ignore storage quota errors
    }
  }

  removeOfflineAnswer(attemptId: string, questionId: string): void {
    try {
      const existing = this.getOfflineAnswers(attemptId);
      const filtered = existing.filter((a) => a.questionId !== questionId);
      localStorage.setItem(`${OFFLINE_KEY_PREFIX}${attemptId}`, JSON.stringify(filtered));
    } catch {
      // Fallback
    }
  }

  clearOfflineAnswers(attemptId: string): void {
    try {
      localStorage.removeItem(`${OFFLINE_KEY_PREFIX}${attemptId}`);
    } catch {
      // Fallback
    }
  }

  async flushPendingOfflineAnswers(attemptId: string): Promise<number> {
    const pending = this.getOfflineAnswers(attemptId);
    if (pending.length === 0) return 0;
    try {
      const res = await this.batchSyncAnswers(attemptId, pending);
      return res.syncedCount;
    } catch {
      return 0;
    }
  }
}

export const attemptService = new AttemptService();
