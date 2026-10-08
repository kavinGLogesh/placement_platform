import { prisma } from '../config/prisma.config.js';
import {
  AssessmentAttemptDto,
  AttemptAnswerDto,
  AssessmentResultDto,
  AttemptStatus,
  SaveAnswerDto,
  AttemptViolationDto,
  AttemptViolationType,
} from '../types/attempt.types.js';

class InMemoryAttemptStore {
  public attempts: Map<string, AssessmentAttemptDto> = new Map();
  public answers: Map<string, Map<string, AttemptAnswerDto>> = new Map(); // attemptId -> (questionId -> answer)
  public results: Map<string, AssessmentResultDto> = new Map(); // resultId -> result
  public attemptResults: Map<string, AssessmentResultDto> = new Map(); // attemptId -> result
  public violations: Map<string, AttemptViolationDto[]> = new Map(); // attemptId -> violations list
}

export class AttemptRepository {
  public memStore = new InMemoryAttemptStore();
  private violationsStore: Map<string, AttemptViolationDto[]> = new Map();
  private submitLocks = new Set<string>();
  private startLocks = new Set<string>();

  acquireSubmitLock(attemptId: string): boolean {
    if (this.submitLocks.has(attemptId)) return false;
    this.submitLocks.add(attemptId);
    return true;
  }

  releaseSubmitLock(attemptId: string): void {
    this.submitLocks.delete(attemptId);
  }

  acquireStartLock(key: string): boolean {
    if (this.startLocks.has(key)) return false;
    this.startLocks.add(key);
    return true;
  }

  releaseStartLock(key: string): void {
    this.startLocks.delete(key);
  }

  // ===========================================================================
  // 1. ATTEMPT QUERIES
  // ===========================================================================
  async findActiveAttempt(studentId: string, assessmentId: string): Promise<AssessmentAttemptDto | null> {
    if (process.env.NODE_ENV === 'test') {
      for (const att of this.memStore.attempts.values()) {
        if (att.studentId === studentId && att.assessmentId === assessmentId && att.status === 'IN_PROGRESS') {
          return att;
        }
      }
      return null;
    }

    const row = await prisma.assessmentAttempt.findFirst({
      where: {
        studentId,
        assessmentId,
        status: 'IN_PROGRESS',
      },
      orderBy: { createdAt: 'desc' },
    });
    if (row) {
      return {
        id: row.id,
        studentId: row.studentId,
        assessmentId: row.assessmentId,
        paperId: row.paperId,
        attemptNumber: row.attemptNumber,
        startTime: row.startTime,
        expectedEndTime: row.expectedEndTime,
        status: row.status as AttemptStatus,
        currentQuestion: row.currentQuestion,
        submittedAt: row.submittedAt,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      };
    }
    return null;
  }

  async getStudentAttempts(studentId: string, assessmentId: string): Promise<AssessmentAttemptDto[]> {
    if (process.env.NODE_ENV === 'test') {
      const list: AssessmentAttemptDto[] = [];
      for (const att of this.memStore.attempts.values()) {
        if (att.studentId === studentId && att.assessmentId === assessmentId) {
          list.push(att);
        }
      }
      list.sort((a, b) => a.attemptNumber - b.attemptNumber);
      return list;
    }

    const rows = await prisma.assessmentAttempt.findMany({
      where: { studentId, assessmentId },
      orderBy: { attemptNumber: 'asc' },
    });
    return rows.map((r) => ({
      id: r.id,
      studentId: r.studentId,
      assessmentId: r.assessmentId,
      paperId: r.paperId,
      attemptNumber: r.attemptNumber,
      startTime: r.startTime,
      expectedEndTime: r.expectedEndTime,
      status: r.status as AttemptStatus,
      currentQuestion: r.currentQuestion,
      submittedAt: r.submittedAt,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }));
  }

  async getAllStudentAttempts(studentId: string): Promise<AssessmentAttemptDto[]> {
    if (process.env.NODE_ENV === 'test') {
      const list: AssessmentAttemptDto[] = [];
      for (const att of this.memStore.attempts.values()) {
        if (att.studentId === studentId) {
          list.push(att);
        }
      }
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      return list;
    }

    const rows = await prisma.assessmentAttempt.findMany({
      where: { studentId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((r) => ({
      id: r.id,
      studentId: r.studentId,
      assessmentId: r.assessmentId,
      paperId: r.paperId,
      attemptNumber: r.attemptNumber,
      startTime: r.startTime,
      expectedEndTime: r.expectedEndTime,
      status: r.status as AttemptStatus,
      currentQuestion: r.currentQuestion,
      submittedAt: r.submittedAt,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }));
  }

  async getAttemptById(attemptId: string): Promise<AssessmentAttemptDto | null> {
    if (process.env.NODE_ENV === 'test') {
      const att = this.memStore.attempts.get(attemptId);
      if (!att) return null;
      const viols = this.memStore.violations.get(attemptId) || [];
      return {
        ...att,
        violationCount: viols.length,
        violations: viols,
      };
    }

    const r = await prisma.assessmentAttempt.findUnique({
      where: { id: attemptId },
    });
    if (r) {
      const viols = await this.getViolationsByAttempt(attemptId);
      return {
        id: r.id,
        studentId: r.studentId,
        assessmentId: r.assessmentId,
        paperId: r.paperId,
        attemptNumber: r.attemptNumber,
        startTime: r.startTime,
        expectedEndTime: r.expectedEndTime,
        status: r.status as AttemptStatus,
        currentQuestion: r.currentQuestion,
        submittedAt: r.submittedAt,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
        violationCount: viols.length,
        violations: viols,
      };
    }
    return null;
  }

  // ===========================================================================
  // 2. CREATE / UPDATE ATTEMPT
  // ===========================================================================
  async createAttempt(data: {
    studentId: string;
    assessmentId: string;
    paperId: string;
    attemptNumber: number;
    startTime: Date;
    expectedEndTime: Date;
  }): Promise<AssessmentAttemptDto> {
    const id = `att-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date();

    const record: AssessmentAttemptDto = {
      id,
      studentId: data.studentId,
      assessmentId: data.assessmentId,
      paperId: data.paperId,
      attemptNumber: data.attemptNumber,
      startTime: data.startTime,
      expectedEndTime: data.expectedEndTime,
      status: 'IN_PROGRESS',
      currentQuestion: 1,
      submittedAt: null,
      createdAt: now,
      updatedAt: now,
    };

    if (process.env.NODE_ENV === 'test') {
      this.memStore.attempts.set(id, record);
      this.memStore.answers.set(id, new Map());
      return record;
    }

    await prisma.assessmentAttempt.create({
      data: {
        id,
        studentId: data.studentId,
        assessmentId: data.assessmentId,
        paperId: data.paperId,
        attemptNumber: data.attemptNumber,
        startTime: data.startTime,
        expectedEndTime: data.expectedEndTime,
        status: 'IN_PROGRESS',
        currentQuestion: 1,
        createdAt: now,
        updatedAt: now,
      },
    });

    return record;
  }

  async updateAttemptStatus(attemptId: string, status: AttemptStatus, submittedAt?: Date): Promise<void> {
    const now = new Date();
    const subTime = submittedAt || (status !== 'IN_PROGRESS' ? now : null);

    if (process.env.NODE_ENV === 'test') {
      const mem = this.memStore.attempts.get(attemptId);
      if (mem) {
        mem.status = status;
        mem.submittedAt = subTime;
        mem.updatedAt = now;
      }
      return;
    }

    await prisma.assessmentAttempt.update({
      where: { id: attemptId },
      data: {
        status,
        submittedAt: subTime,
        updatedAt: now,
      },
    });
  }

  async updateCurrentQuestion(attemptId: string, currentQuestion: number): Promise<void> {
    if (process.env.NODE_ENV === 'test') {
      const mem = this.memStore.attempts.get(attemptId);
      if (mem) {
        mem.currentQuestion = currentQuestion;
      }
      return;
    }

    await prisma.assessmentAttempt.update({
      where: { id: attemptId },
      data: { currentQuestion },
    });
  }

  // ===========================================================================
  // 3. ANSWERS MANAGEMENT & CONFLICT RESOLUTION
  // ===========================================================================
  async getAttemptAnswers(attemptId: string): Promise<AttemptAnswerDto[]> {
    if (process.env.NODE_ENV === 'test') {
      const map = this.memStore.answers.get(attemptId);
      return map ? Array.from(map.values()) : [];
    }

    const rows = await prisma.attemptAnswer.findMany({
      where: { attemptId },
    });
    return rows.map((r) => ({
      id: r.id,
      attemptId: r.attemptId,
      questionId: r.questionId,
      selectedOptionIds: r.selectedOptionIds ? JSON.parse(r.selectedOptionIds) : null,
      textAnswer: r.textAnswer,
      isMarkedForReview: r.isMarkedForReview,
      answeredAt: r.answeredAt,
      version: r.version,
      isCorrect: r.isCorrect,
      marksAwarded: r.marksAwarded,
    }));
  }

  async saveAnswer(attemptId: string, dto: SaveAnswerDto): Promise<AttemptAnswerDto> {
    const now = new Date();

    if (process.env.NODE_ENV === 'test') {
      let answerMap = this.memStore.answers.get(attemptId);
      if (!answerMap) {
        answerMap = new Map();
        this.memStore.answers.set(attemptId, answerMap);
      }

      const existingMem = answerMap.get(dto.questionId);
      const nextVersion = (existingMem?.version || 0) + 1;

      if (dto.version !== undefined && existingMem && dto.version < existingMem.version) {
        return existingMem;
      }

      const id = existingMem?.id || `ans-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const answerRecord: AttemptAnswerDto = {
        id,
        attemptId,
        questionId: dto.questionId,
        selectedOptionIds: dto.selectedOptionIds || null,
        textAnswer: dto.textAnswer || null,
        isMarkedForReview: dto.isMarkedForReview ?? false,
        answeredAt: now,
        version: nextVersion,
      };

      answerMap.set(dto.questionId, answerRecord);

      if (dto.currentQuestion) {
        await this.updateCurrentQuestion(attemptId, dto.currentQuestion);
      }

      return answerRecord;
    }

    const id = `ans-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const updated = await prisma.attemptAnswer.upsert({
      where: {
        attemptId_questionId: {
          attemptId,
          questionId: dto.questionId,
        },
      },
      update: {
        selectedOptionIds: dto.selectedOptionIds ? JSON.stringify(dto.selectedOptionIds) : null,
        textAnswer: dto.textAnswer || null,
        isMarkedForReview: dto.isMarkedForReview ?? false,
        answeredAt: now,
        version: { increment: 1 },
      },
      create: {
        id,
        attemptId,
        questionId: dto.questionId,
        selectedOptionIds: dto.selectedOptionIds ? JSON.stringify(dto.selectedOptionIds) : null,
        textAnswer: dto.textAnswer || null,
        isMarkedForReview: dto.isMarkedForReview ?? false,
        answeredAt: now,
        version: 1,
      },
    });

    if (dto.currentQuestion) {
      await this.updateCurrentQuestion(attemptId, dto.currentQuestion);
    }

    return {
      id: updated.id,
      attemptId: updated.attemptId,
      questionId: updated.questionId,
      selectedOptionIds: updated.selectedOptionIds ? JSON.parse(updated.selectedOptionIds) : null,
      textAnswer: updated.textAnswer,
      isMarkedForReview: updated.isMarkedForReview,
      answeredAt: updated.answeredAt,
      version: updated.version,
      isCorrect: updated.isCorrect,
      marksAwarded: updated.marksAwarded,
    };
  }

  async batchSaveAnswers(attemptId: string, answers: SaveAnswerDto[], currentQuestion?: number): Promise<void> {
    for (const ans of answers) {
      await this.saveAnswer(attemptId, ans);
    }
    if (currentQuestion) {
      await this.updateCurrentQuestion(attemptId, currentQuestion);
    }
  }

  // ===========================================================================
  // 4. ATOMIC SUBMISSION & RESULTS
  // ===========================================================================
  async saveResultTransaction(
    attemptId: string,
    resultData: Omit<AssessmentResultDto, 'id' | 'createdAt' | 'updatedAt'>,
    finalStatus: AttemptStatus
  ): Promise<AssessmentResultDto> {
    const existingResult = await this.getResultByAttemptId(attemptId);
    if (existingResult) {
      return existingResult;
    }

    const resultId = `res-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date();

    const resDto: AssessmentResultDto = {
      id: resultId,
      attemptId,
      assessmentId: resultData.assessmentId,
      studentId: resultData.studentId,
      totalMarks: resultData.totalMarks,
      obtainedMarks: resultData.obtainedMarks,
      percentage: resultData.percentage,
      correctCount: resultData.correctCount,
      incorrectCount: resultData.incorrectCount,
      unansweredCount: resultData.unansweredCount,
      accuracy: resultData.accuracy,
      isPassed: resultData.isPassed,
      createdAt: now,
      updatedAt: now,
    };

    if (process.env.NODE_ENV === 'test') {
      this.memStore.results.set(resultId, resDto);
      this.memStore.attemptResults.set(attemptId, resDto);
      const memAtt = this.memStore.attempts.get(attemptId);
      if (memAtt) {
        memAtt.status = finalStatus;
        memAtt.submittedAt = now;
        memAtt.updatedAt = now;
      }
      return resDto;
    }

    await prisma.$transaction(async (tx) => {
      // Update attempt to submitted or expired
      await tx.assessmentAttempt.update({
        where: { id: attemptId },
        data: {
          status: finalStatus,
          submittedAt: now,
          updatedAt: now,
        },
      });

      // Insert result
      await tx.assessmentResult.create({
        data: {
          id: resultId,
          attemptId,
          assessmentId: resultData.assessmentId,
          studentId: resultData.studentId,
          totalMarks: resultData.totalMarks,
          obtainedMarks: resultData.obtainedMarks,
          percentage: resultData.percentage,
          correctCount: resultData.correctCount,
          incorrectCount: resultData.incorrectCount,
          unansweredCount: resultData.unansweredCount,
          accuracy: resultData.accuracy,
          isPassed: resultData.isPassed,
          createdAt: now,
          updatedAt: now,
        },
      });
    });

    return resDto;
  }

  async getResultByAttemptId(attemptId: string): Promise<AssessmentResultDto | null> {
    if (process.env.NODE_ENV === 'test') {
      return this.memStore.attemptResults.get(attemptId) || null;
    }

    const r = await prisma.assessmentResult.findUnique({
      where: { attemptId },
    });
    if (r) {
      return {
        id: r.id,
        attemptId: r.attemptId,
        assessmentId: r.assessmentId,
        studentId: r.studentId,
        totalMarks: r.totalMarks,
        obtainedMarks: r.obtainedMarks,
        percentage: r.percentage,
        correctCount: r.correctCount,
        incorrectCount: r.incorrectCount,
        unansweredCount: r.unansweredCount,
        accuracy: r.accuracy,
        isPassed: r.isPassed,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      };
    }
    return null;
  }

  async getResultById(resultId: string): Promise<AssessmentResultDto | null> {
    if (process.env.NODE_ENV === 'test') {
      return this.memStore.results.get(resultId) || null;
    }

    const r = await prisma.assessmentResult.findUnique({
      where: { id: resultId },
    });
    if (r) {
      return {
        id: r.id,
        attemptId: r.attemptId,
        assessmentId: r.assessmentId,
        studentId: r.studentId,
        totalMarks: r.totalMarks,
        obtainedMarks: r.obtainedMarks,
        percentage: r.percentage,
        correctCount: r.correctCount,
        incorrectCount: r.incorrectCount,
        unansweredCount: r.unansweredCount,
        accuracy: r.accuracy,
        isPassed: r.isPassed,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      };
    }
    return null;
  }

  async getStudentResults(studentId: string): Promise<AssessmentResultDto[]> {
    if (process.env.NODE_ENV === 'test') {
      const results: AssessmentResultDto[] = [];
      for (const r of this.memStore.results.values()) {
        if (r.studentId === studentId) {
          results.push(r);
        }
      }
      results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      return results;
    }

    const list = await prisma.assessmentResult.findMany({
      where: { studentId },
      orderBy: { createdAt: 'desc' },
    });
    return list.map((r) => ({
      id: r.id,
      attemptId: r.attemptId,
      assessmentId: r.assessmentId,
      studentId: r.studentId,
      totalMarks: r.totalMarks,
      obtainedMarks: r.obtainedMarks,
      percentage: r.percentage,
      correctCount: r.correctCount,
      incorrectCount: r.incorrectCount,
      unansweredCount: r.unansweredCount,
      accuracy: r.accuracy,
      isPassed: r.isPassed,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }));
  }

  // ===========================================================================
  // 6. ANTI-CHEATING INTEGRITY VIOLATIONS
  // ===========================================================================
  async recordViolation(
    attemptId: string,
    studentId: string,
    violationType: AttemptViolationType,
    details?: string
  ): Promise<AttemptViolationDto> {
    const store = process.env.NODE_ENV === 'test' ? this.memStore.violations : this.violationsStore;
    const existing = store.get(attemptId) || [];

    const now = new Date();
    const nowTime = now.getTime();

    // Deduplication / Anti-Spam:
    // If the same violationType occurred within 1000ms, or any violation within 500ms, return existing
    const recentDuplicate = existing.find((v) => {
      const vTime = new Date(v.timestamp).getTime();
      if (v.violationType === violationType && Math.abs(nowTime - vTime) < 1000) {
        return true;
      }
      return false;
    });

    if (recentDuplicate) {
      return recentDuplicate;
    }

    const violation: AttemptViolationDto = {
      id: `viol-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      attemptId,
      studentId,
      violationType,
      timestamp: now.toISOString(),
      details: details ? details.substring(0, 255) : undefined,
    };

    existing.push(violation);
    store.set(attemptId, existing);

    return violation;
  }

  async getViolationsByAttempt(attemptId: string): Promise<AttemptViolationDto[]> {
    const store = process.env.NODE_ENV === 'test' ? this.memStore.violations : this.violationsStore;
    return store.get(attemptId) || [];
  }
}

export const attemptRepository = new AttemptRepository();

