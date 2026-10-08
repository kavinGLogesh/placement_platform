import crypto from 'crypto';
import { prisma } from '../config/prisma.config';
import {
  CodingExecutionStatus,
  CodingSubmission,
  CodingSubmissionType,
  CodingExecutionResult,
} from '@prisma/client';
import {
  LANGUAGE_PRISMA_MAP,
  PRISMA_LANGUAGE_MAP,
  SubmissionHistoryItemDto,
  SupportedLanguage,
} from '../types/coding.types';
import { SingleExecutionOutcome } from '../services/judge0.service';

export interface CreateCodingSubmissionParams {
  attemptId: string;
  questionId: string;
  studentId: string;
  language: SupportedLanguage;
  sourceCode: string;
  submissionType: CodingSubmissionType;
  status: CodingExecutionStatus;
  passedTestCount: number;
  totalTestCount: number;
  executionTime?: number;
  memoryUsed?: number;
  compileError?: string | null;
  runtimeError?: string | null;
  judge0Token?: string | null;
  judge0Status?: string | null;
  outcomes: SingleExecutionOutcome[];
}

export class InMemoryCodingStore {
  public submissions = new Map<string, CodingSubmission>();
  public results = new Map<string, CodingExecutionResult[]>(); // submissionId -> results
  public attemptQuestionSubmissions = new Map<string, string[]>(); // `${attemptId}:${questionId}` -> submissionId[]
  public rateLimitTimestamps = new Map<string, number[]>(); // `${studentId}:${attemptId}` -> timestamp[]
}

export class CodingRepository {
  public memStore = new InMemoryCodingStore();
  private executionLocks = new Set<string>();

  // ===========================================================================
  // 1. CONCURRENCY & MUTEX LOCKS
  // ===========================================================================
  public acquireExecutionLock(attemptId: string, questionId?: string): boolean {
    const lockKey = questionId ? `${attemptId}:${questionId}` : attemptId;
    if (this.executionLocks.has(lockKey)) {
      return false;
    }
    this.executionLocks.add(lockKey);
    return true;
  }

  public releaseExecutionLock(attemptId: string, questionId?: string): void {
    const lockKey = questionId ? `${attemptId}:${questionId}` : attemptId;
    this.executionLocks.delete(lockKey);
  }

  // ===========================================================================
  // 2. SLIDING-WINDOW RATE LIMITER (10 executions / min)
  // ===========================================================================
  public checkRateLimit(
    studentId: string,
    attemptId: string,
    maxLimit: number = 10,
    windowMs: number = 60000
  ): { allowed: boolean; retryAfterSeconds?: number; currentCount: number } {
    const key = `${studentId}:${attemptId}`;
    const now = Date.now();
    const timestamps = (this.memStore.rateLimitTimestamps.get(key) || []).filter(
      (ts) => now - ts < windowMs
    );

    if (timestamps.length >= maxLimit) {
      const oldest = timestamps[0];
      const retryAfterSeconds = Math.max(1, Math.ceil((oldest + windowMs - now) / 1000));
      return { allowed: false, retryAfterSeconds, currentCount: timestamps.length };
    }

    timestamps.push(now);
    this.memStore.rateLimitTimestamps.set(key, timestamps);
    return { allowed: true, currentCount: timestamps.length };
  }

  // ===========================================================================
  // 3. PERSIST SUBMISSION AND EXECUTION RESULTS
  // ===========================================================================
  public async saveSubmission(params: CreateCodingSubmissionParams): Promise<{
    submission: CodingSubmission;
    results: CodingExecutionResult[];
  }> {
    const prismaLang = LANGUAGE_PRISMA_MAP[params.language];
    const submissionId = crypto.randomUUID();
    const now = new Date();

    const createdSubmission: CodingSubmission = {
      id: submissionId,
      attemptId: params.attemptId,
      questionId: params.questionId,
      studentId: params.studentId,
      language: prismaLang,
      sourceCode: params.sourceCode,
      submissionType: params.submissionType,
      status: params.status,
      compileError: params.compileError || null,
      runtimeError: params.runtimeError || null,
      passedTestCount: params.passedTestCount,
      totalTestCount: params.totalTestCount,
      executionTime: params.executionTime ?? null,
      memoryUsed: params.memoryUsed ?? null,
      judge0Token: params.judge0Token || null,
      judge0Status: params.judge0Status || null,
      createdAt: now,
      updatedAt: now,
    };

    const createdResults: CodingExecutionResult[] = params.outcomes.map((o) => ({
      id: crypto.randomUUID(),
      submissionId,
      testCaseIndex: o.testCaseIndex,
      isSample: o.isSample,
      status: o.status,
      input: o.input,
      expectedOutput: o.expectedOutput,
      actualOutput: o.actualOutput,
      executionTime: o.executionTime,
      memoryUsed: o.memoryUsed,
      errorMessage: o.errorMessage || null,
      createdAt: now,
    }));

    if (process.env.NODE_ENV === 'test') {
      this.memStore.submissions.set(submissionId, createdSubmission);
      this.memStore.results.set(submissionId, createdResults);

      const aqKey = `${params.attemptId}:${params.questionId}`;
      const existingList = this.memStore.attemptQuestionSubmissions.get(aqKey) || [];
      existingList.unshift(submissionId);
      this.memStore.attemptQuestionSubmissions.set(aqKey, existingList);

      return {
        submission: createdSubmission,
        results: createdResults,
      };
    }

    const dbSubmission = await prisma.codingSubmission.create({
      data: {
        id: submissionId,
        attemptId: params.attemptId,
        questionId: params.questionId,
        studentId: params.studentId,
        language: prismaLang,
        sourceCode: params.sourceCode,
        submissionType: params.submissionType,
        status: params.status,
        compileError: params.compileError,
        runtimeError: params.runtimeError,
        passedTestCount: params.passedTestCount,
        totalTestCount: params.totalTestCount,
        executionTime: params.executionTime,
        memoryUsed: params.memoryUsed,
        judge0Token: params.judge0Token,
        judge0Status: params.judge0Status,
        results: {
          create: createdResults.map((r) => ({
            id: r.id,
            testCaseIndex: r.testCaseIndex,
            isSample: r.isSample,
            status: r.status,
            input: r.input,
            expectedOutput: r.expectedOutput,
            actualOutput: r.actualOutput,
            executionTime: r.executionTime,
            memoryUsed: r.memoryUsed,
            errorMessage: r.errorMessage,
          })),
        },
      },
      include: {
        results: true,
      },
    });

    return {
      submission: dbSubmission,
      results: dbSubmission.results,
    };
  }

  // ===========================================================================
  // 4. QUERY SUBMISSIONS
  // ===========================================================================
  public async getSubmissionsForQuestion(
    attemptId: string,
    questionId: string
  ): Promise<SubmissionHistoryItemDto[]> {
    if (process.env.NODE_ENV === 'test') {
      const aqKey = `${attemptId}:${questionId}`;
      const subIds = this.memStore.attemptQuestionSubmissions.get(aqKey) || [];
      const list: SubmissionHistoryItemDto[] = [];

      for (const sid of subIds) {
        const sub = this.memStore.submissions.get(sid);
        if (sub) {
          list.push({
            id: sub.id,
            language: PRISMA_LANGUAGE_MAP[sub.language],
            submissionType: sub.submissionType,
            status: sub.status,
            passedTestCount: sub.passedTestCount,
            totalTestCount: sub.totalTestCount,
            executionTime: sub.executionTime,
            memoryUsed: sub.memoryUsed,
            createdAt: sub.createdAt,
          });
        }
      }

      return list;
    }

    const rows = await prisma.codingSubmission.findMany({
      where: {
        attemptId,
        questionId,
      },
      orderBy: { createdAt: 'desc' },
    });

    return rows.map((r) => ({
      id: r.id,
      language: PRISMA_LANGUAGE_MAP[r.language],
      submissionType: r.submissionType,
      status: r.status,
      passedTestCount: r.passedTestCount,
      totalTestCount: r.totalTestCount,
      executionTime: r.executionTime,
      memoryUsed: r.memoryUsed,
      createdAt: r.createdAt,
    }));
  }

  public async getLatestSubmission(
    attemptId: string,
    questionId: string
  ): Promise<CodingSubmission | null> {
    if (process.env.NODE_ENV === 'test') {
      const aqKey = `${attemptId}:${questionId}`;
      const subIds = this.memStore.attemptQuestionSubmissions.get(aqKey) || [];
      if (subIds.length > 0) {
        return this.memStore.submissions.get(subIds[0]) || null;
      }
      return null;
    }

    const row = await prisma.codingSubmission.findFirst({
      where: { attemptId, questionId },
      orderBy: { createdAt: 'desc' },
    });
    return row || null;
  }

  public async getLatestSubmissionsForAttempt(
    attemptId: string
  ): Promise<Map<string, CodingSubmission>> {
    const map = new Map<string, CodingSubmission>();
    if (process.env.NODE_ENV === 'test') {
      for (const [aqKey, subIds] of this.memStore.attemptQuestionSubmissions.entries()) {
        if (aqKey.startsWith(`${attemptId}:`) && subIds.length > 0) {
          const questionId = aqKey.substring(attemptId.length + 1);
          // Look for SUBMIT first
          let chosenSub: CodingSubmission | null = null;
          for (const sid of subIds) {
            const sub = this.memStore.submissions.get(sid);
            if (sub && sub.submissionType === 'SUBMIT') {
              chosenSub = sub;
              break;
            }
          }
          if (!chosenSub && subIds.length > 0) {
            chosenSub = this.memStore.submissions.get(subIds[0]) || null;
          }
          if (chosenSub) {
            map.set(questionId, chosenSub);
          }
        }
      }
      return map;
    }

    const rows = await prisma.codingSubmission.findMany({
      where: { attemptId },
      orderBy: { createdAt: 'desc' },
    });

    for (const r of rows) {
      // Prioritize SUBMIT if available
      if (!map.has(r.questionId)) {
        map.set(r.questionId, r);
      } else {
        const existing = map.get(r.questionId)!;
        if (existing.submissionType !== 'SUBMIT' && r.submissionType === 'SUBMIT') {
          map.set(r.questionId, r);
        }
      }
    }
    return map;
  }

  public async getSubmissionById(
    submissionId: string
  ): Promise<{ submission: CodingSubmission; results: CodingExecutionResult[] } | null> {
    if (process.env.NODE_ENV === 'test') {
      const memSub = this.memStore.submissions.get(submissionId);
      if (!memSub) return null;

      const memRes = this.memStore.results.get(submissionId) || [];
      return {
        submission: memSub,
        results: memRes,
      };
    }

    const row = await prisma.codingSubmission.findUnique({
      where: { id: submissionId },
      include: { results: true },
    });
    if (row) {
      return {
        submission: row,
        results: row.results,
      };
    }
    return null;
  }
}

export const codingRepository = new CodingRepository();
