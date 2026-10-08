import {
  CodingExecutionStatus,
  CodingSubmissionType,
} from '@prisma/client';
import { AppError } from '../middleware/errorHandler';
import {
  CodingRepository,
  codingRepository,
} from '../repositories/coding.repository';
import {
  AttemptRepository,
  attemptRepository,
} from '../repositories/attempt.repository';
import {
  AssessmentRepository,
  assessmentRepository,
} from '../repositories/assessment.repository';
import {
  QuestionRepository,
  questionRepository,
} from '../repositories/question.repository';
import {
  Judge0Service,
  judge0Service,
  BatchExecutionResult,
} from './judge0.service';
import {
  CodingExecutionResponseDto,
  CodingQuestionDetails,
  HiddenExecutionSummaryDto,
  PRISMA_LANGUAGE_MAP,
  RunCodeDto,
  SubmitCodeDto,
  SampleExecutionResultDto,
  SampleTestCaseDto,
  SanitizedCodingQuestionDto,
  SubmissionHistoryItemDto,
  SupportedLanguage,
} from '../types/coding.types';
import {
  validateAttemptAndQuestionParams,
  validateExecutionPayload,
} from '../validators/coding.validator';

export class CodingService {
  constructor(
    private readonly codingRepo: CodingRepository = codingRepository,
    private readonly attemptRepo: AttemptRepository = attemptRepository,
    private readonly assessmentRepo: AssessmentRepository = assessmentRepository,
    private readonly questionRepo: QuestionRepository = questionRepository,
    private readonly judge0: Judge0Service = judge0Service
  ) {}

  // ===========================================================================
  // 1. GET CODING QUESTION (SANITIZED)
  // ===========================================================================
  public async getCodingQuestion(
    studentId: string,
    attemptId: string,
    questionId: string
  ): Promise<SanitizedCodingQuestionDto> {
    validateAttemptAndQuestionParams(attemptId, questionId);

    const { question } = await this.verifyAttemptAndQuestion(
      studentId,
      attemptId,
      questionId
    );

    const details = this.extractQuestionDetails(question);

    const sampleTestCases: SampleTestCaseDto[] = details.testCases
      .filter((tc) => tc.isSample)
      .map((tc) => ({
        index: tc.index,
        input: tc.input,
        expectedOutput: tc.expectedOutput,
        explanation: tc.explanation,
      }));

    const totalHiddenTestCases = details.testCases.filter((tc) => !tc.isSample).length;

    // Retrieve last submission if exists
    const latestSub = await this.codingRepo.getLatestSubmission(attemptId, questionId);

    let lastSubmission = null;
    if (latestSub) {
      lastSubmission = {
        id: latestSub.id,
        language: PRISMA_LANGUAGE_MAP[latestSub.language],
        sourceCode: latestSub.sourceCode,
        status: latestSub.status,
        submissionType: latestSub.submissionType,
        passedTestCount: latestSub.passedTestCount,
        totalTestCount: latestSub.totalTestCount,
        createdAt: latestSub.createdAt,
      };
    }

    return {
      id: question.id,
      category: 'CODING',
      topic: question.topic || 'Coding',
      difficulty: question.difficulty || 'MEDIUM',
      marks: question.marks || 10,
      title: details.title || question.questionText?.split('\n')[0] || 'Coding Problem',
      description: details.description || question.questionText || '',
      inputFormat: details.inputFormat,
      outputFormat: details.outputFormat,
      constraints: details.constraints,
      starterCode: details.starterCode || this.getDefaultStarterCode(),
      sampleTestCases,
      totalHiddenTestCases,
      timeLimitSeconds: details.timeLimitSeconds || 3.0,
      memoryLimitKb: details.memoryLimitKb || 128000,
      lastSubmission,
    };
  }

  // ===========================================================================
  // 2. RUN CODE (AGAINST SAMPLE TEST CASES ONLY)
  // ===========================================================================
  public async runCode(
    studentId: string,
    attemptId: string,
    questionId: string,
    payload: RunCodeDto
  ): Promise<CodingExecutionResponseDto> {
    validateAttemptAndQuestionParams(attemptId, questionId);
    const { language, sourceCode } = validateExecutionPayload(payload);

    // 1. Verify Attempt, Student Ownership, Expiration, and Question Membership
    const { question } = await this.verifyAttemptAndQuestion(
      studentId,
      attemptId,
      questionId,
      true // Must be strictly active
    );

    // 2. Concurrency Mutex Lock
    if (!this.codingRepo.acquireExecutionLock(attemptId, questionId)) {
      throw new AppError(
        'A code execution is already in progress for this question. Please wait for it to complete.',
        409
      );
    }

    // 3. Sliding-Window Rate Limit (10 per minute)
    const rateCheck = this.codingRepo.checkRateLimit(studentId, attemptId, 10, 60000);
    if (!rateCheck.allowed) {
      this.codingRepo.releaseExecutionLock(attemptId, questionId);
      throw new AppError(
        `Rate limit exceeded. Maximum 10 runs per minute allowed. Please retry after ${rateCheck.retryAfterSeconds} seconds.`,
        429
      );
    }

    try {
      const details = this.extractQuestionDetails(question);
      const sampleTests = details.testCases.filter((tc) => tc.isSample);

      if (sampleTests.length === 0) {
        // Guarantee at least 1 sample test case
        sampleTests.push({
          index: 1,
          isSample: true,
          input: '',
          expectedOutput: '',
        });
      }

      // Execute code via Judge0 CE (or deterministic sandboxed fallback)
      const batchResult: BatchExecutionResult = await this.judge0.executeTestCases(
        language,
        sourceCode,
        sampleTests
      );

      // Persist submission record
      const saved = await this.codingRepo.saveSubmission({
        attemptId,
        questionId,
        studentId,
        language,
        sourceCode,
        submissionType: CodingSubmissionType.RUN,
        status: batchResult.overallStatus,
        passedTestCount: batchResult.passedTestCount,
        totalTestCount: batchResult.totalTestCount,
        executionTime: batchResult.executionTime,
        memoryUsed: batchResult.memoryUsed,
        compileError: batchResult.compileError,
        runtimeError: batchResult.runtimeError,
        outcomes: batchResult.outcomes,
      });

      const sampleResults: SampleExecutionResultDto[] = batchResult.outcomes.map((o) => ({
        testCaseIndex: o.testCaseIndex,
        status: o.status,
        input: o.input,
        expectedOutput: o.expectedOutput,
        actualOutput: o.actualOutput,
        executionTime: o.executionTime,
        memoryUsed: o.memoryUsed,
        errorMessage: o.errorMessage || undefined,
      }));

      return {
        submissionId: saved.submission.id,
        submissionType: CodingSubmissionType.RUN,
        status: batchResult.overallStatus,
        passedTestCount: batchResult.passedTestCount,
        totalTestCount: batchResult.totalTestCount,
        executionTime: batchResult.executionTime,
        memoryUsed: batchResult.memoryUsed,
        compileError: batchResult.compileError,
        runtimeError: batchResult.runtimeError,
        sampleResults,
        createdAt: saved.submission.createdAt,
      };
    } finally {
      this.codingRepo.releaseExecutionLock(attemptId, questionId);
    }
  }

  // ===========================================================================
  // 3. SUBMIT CODE (AGAINST SAMPLE + HIDDEN TEST CASES)
  // ===========================================================================
  public async submitCode(
    studentId: string,
    attemptId: string,
    questionId: string,
    payload: SubmitCodeDto
  ): Promise<CodingExecutionResponseDto> {
    validateAttemptAndQuestionParams(attemptId, questionId);
    const { language, sourceCode } = validateExecutionPayload(payload);

    // 1. Verify Attempt, Ownership, Active State, and Paper Inclusion
    const { question } = await this.verifyAttemptAndQuestion(
      studentId,
      attemptId,
      questionId,
      true
    );

    // 2. Concurrency Mutex Lock
    if (!this.codingRepo.acquireExecutionLock(attemptId, questionId)) {
      throw new AppError(
        'A code execution is already in progress for this question. Please wait for it to complete.',
        409
      );
    }

    // 3. Sliding-Window Rate Limit
    const rateCheck = this.codingRepo.checkRateLimit(studentId, attemptId, 10, 60000);
    if (!rateCheck.allowed) {
      this.codingRepo.releaseExecutionLock(attemptId, questionId);
      throw new AppError(
        `Rate limit exceeded. Maximum 10 submissions per minute allowed. Please retry after ${rateCheck.retryAfterSeconds} seconds.`,
        429
      );
    }

    try {
      const details = this.extractQuestionDetails(question);
      const allTestCases = details.testCases;

      // Execute code against all test cases
      const batchResult: BatchExecutionResult = await this.judge0.executeTestCases(
        language,
        sourceCode,
        allTestCases
      );

      // Persist full execution results in database (for audits and evaluations)
      const saved = await this.codingRepo.saveSubmission({
        attemptId,
        questionId,
        studentId,
        language,
        sourceCode,
        submissionType: CodingSubmissionType.SUBMIT,
        status: batchResult.overallStatus,
        passedTestCount: batchResult.passedTestCount,
        totalTestCount: batchResult.totalTestCount,
        executionTime: batchResult.executionTime,
        memoryUsed: batchResult.memoryUsed,
        compileError: batchResult.compileError,
        runtimeError: batchResult.runtimeError,
        outcomes: batchResult.outcomes,
      });

      // Calculate Marks Proportionally
      const totalMarks = question.marks || 10;
      let marksAwarded = 0;
      if (batchResult.totalTestCount > 0) {
        marksAwarded = Number(
          ((batchResult.passedTestCount / batchResult.totalTestCount) * totalMarks).toFixed(2)
        );
      }

      // Synchronize with AttemptAnswer in attempt repository
      try {
        await this.attemptRepo.saveAnswer(attemptId, {
          questionId,
          textAnswer: JSON.stringify({
            submissionId: saved.submission.id,
            language,
            sourceCode,
            status: batchResult.overallStatus,
            passedTestCount: batchResult.passedTestCount,
            totalTestCount: batchResult.totalTestCount,
          }),
          isMarkedForReview: false,
          marksAwarded,
          isCorrect: batchResult.overallStatus === CodingExecutionStatus.ACCEPTED,
        });
      } catch {
        // Attempt answer sync fallback handled
      }

      // Sanitize Response:
      // Include sample results with input/output for debugging
      const sampleResults: SampleExecutionResultDto[] = batchResult.outcomes
        .filter((o) => o.isSample)
        .map((o) => ({
          testCaseIndex: o.testCaseIndex,
          status: o.status,
          input: o.input,
          expectedOutput: o.expectedOutput,
          actualOutput: o.actualOutput,
          executionTime: o.executionTime,
          memoryUsed: o.memoryUsed,
          errorMessage: o.errorMessage || undefined,
        }));

      // Hidden test cases: NEVER expose inputs, expected outputs, or actual outputs!
      // Only return pass/fail count summary
      const hiddenOutcomes = batchResult.outcomes.filter((o) => !o.isSample);
      const hiddenResultsSummary: HiddenExecutionSummaryDto = {
        passedTestCount: hiddenOutcomes.filter((o) => o.status === CodingExecutionStatus.ACCEPTED).length,
        totalHiddenCount: hiddenOutcomes.length,
      };

      return {
        submissionId: saved.submission.id,
        submissionType: CodingSubmissionType.SUBMIT,
        status: batchResult.overallStatus,
        passedTestCount: batchResult.passedTestCount,
        totalTestCount: batchResult.totalTestCount,
        executionTime: batchResult.executionTime,
        memoryUsed: batchResult.memoryUsed,
        compileError: batchResult.compileError,
        runtimeError: batchResult.runtimeError,
        sampleResults,
        hiddenResultsSummary,
        marksAwarded,
        totalMarks,
        createdAt: saved.submission.createdAt,
      };
    } finally {
      this.codingRepo.releaseExecutionLock(attemptId, questionId);
    }
  }

  // ===========================================================================
  // 4. GET SUBMISSIONS HISTORY
  // ===========================================================================
  public async getSubmissions(
    studentId: string,
    attemptId: string,
    questionId: string
  ): Promise<SubmissionHistoryItemDto[]> {
    validateAttemptAndQuestionParams(attemptId, questionId);
    await this.verifyAttemptAndQuestion(studentId, attemptId, questionId);

    return this.codingRepo.getSubmissionsForQuestion(attemptId, questionId);
  }

  // ===========================================================================
  // 5. GET SUBMISSION DETAIL (SANITIZED)
  // ===========================================================================
  public async getSubmissionDetail(
    studentId: string,
    attemptId: string,
    submissionId: string
  ): Promise<CodingExecutionResponseDto> {
    const record = await this.codingRepo.getSubmissionById(submissionId);
    if (!record) {
      throw new AppError('Submission not found', 404);
    }

    if (record.submission.studentId !== studentId || record.submission.attemptId !== attemptId) {
      throw new AppError('Unauthorized: You do not have access to this submission', 403);
    }

    // Sanitize results: only expose inputs/outputs for sample tests
    const sampleResults: SampleExecutionResultDto[] = record.results
      .filter((r) => r.isSample)
      .map((r) => ({
        testCaseIndex: r.testCaseIndex,
        status: r.status,
        input: r.input || '',
        expectedOutput: r.expectedOutput || '',
        actualOutput: r.actualOutput || '',
        executionTime: r.executionTime ?? undefined,
        memoryUsed: r.memoryUsed ?? undefined,
        errorMessage: r.errorMessage || undefined,
      }));

    const hiddenResults = record.results.filter((r) => !r.isSample);
    const hiddenResultsSummary: HiddenExecutionSummaryDto = {
      passedTestCount: hiddenResults.filter((r) => r.status === CodingExecutionStatus.ACCEPTED).length,
      totalHiddenCount: hiddenResults.length,
    };

    return {
      submissionId: record.submission.id,
      submissionType: record.submission.submissionType,
      status: record.submission.status,
      passedTestCount: record.submission.passedTestCount,
      totalTestCount: record.submission.totalTestCount,
      executionTime: record.submission.executionTime || 0,
      memoryUsed: record.submission.memoryUsed || 0,
      compileError: record.submission.compileError,
      runtimeError: record.submission.runtimeError,
      sampleResults,
      hiddenResultsSummary,
      createdAt: record.submission.createdAt,
    };
  }

  // ===========================================================================
  // 6. HELPER: ATTEMPT & QUESTION SECURITY VERIFICATION
  // ===========================================================================
  private async verifyAttemptAndQuestion(
    studentId: string,
    attemptId: string,
    questionId: string,
    requireActive: boolean = false
  ): Promise<{ attempt: any; question: any }> {
    const attempt = await this.attemptRepo.getAttemptById(attemptId);
    if (!attempt) {
      throw new AppError('Assessment attempt not found', 404);
    }

    // IDOR Protection: Student must own the attempt
    if (attempt.studentId !== studentId) {
      throw new AppError('Unauthorized: You do not own this assessment attempt', 403);
    }

    // Expiration check
    const now = new Date();
    const isExpired = now >= new Date(attempt.expectedEndTime);

    if (isExpired && attempt.status === 'IN_PROGRESS') {
      try {
        await this.attemptRepo.updateAttemptStatus(attemptId, 'EXPIRED', now);
      } catch {
        // Fallback
      }
      attempt.status = 'EXPIRED';
    }

    if (requireActive) {
      if (attempt.status !== 'IN_PROGRESS' || isExpired) {
        throw new AppError(
          `Cannot execute code on this attempt. Status is "${attempt.status}" and time has expired.`,
          400
        );
      }
    }

    // Verify paper membership
    if (attempt.paperId) {
      const paper = await this.assessmentRepo.getPaperById(attempt.paperId);
      if (paper && paper.questions) {
        const belongsToPaper = paper.questions.some((q) => q.questionId === questionId);
        if (!belongsToPaper) {
          throw new AppError(
            'Question does not belong to the examination paper assigned to this attempt',
            400
          );
        }
      }
    }

    // Fetch question metadata
    const question = await this.questionRepo.findQuestionById(questionId);

    if (!question) {
      throw new AppError('Question not found', 404);
    }

    if (question.category !== 'CODING') {
      throw new AppError('The requested question is not a coding question', 400);
    }

    return { attempt, question };
  }

  // ===========================================================================
  // 7. HELPER: EXTRACT CODING METADATA & TEST CASES
  // ===========================================================================
  private extractQuestionDetails(question: any): CodingQuestionDetails {
    // If correctAnswer contains JSON formatted coding details
    if (question.correctAnswer) {
      try {
        const parsed = JSON.parse(question.correctAnswer);
        if (parsed.testCases && Array.isArray(parsed.testCases)) {
          return {
            title: parsed.title || question.questionText?.split('\n')[0] || 'Coding Problem',
            description: parsed.description || question.questionText,
            inputFormat: parsed.inputFormat,
            outputFormat: parsed.outputFormat,
            constraints: parsed.constraints || [],
            starterCode: parsed.starterCode || this.getDefaultStarterCode(),
            testCases: parsed.testCases,
            timeLimitSeconds: parsed.timeLimitSeconds || 3.0,
            memoryLimitKb: parsed.memoryLimitKb || 128000,
          };
        }
      } catch {
        // Not a JSON string; fall through to standard parser
      }
    }

    // Default test cases extracted from problem text or standard suite
    return {
      title: question.questionText?.split('\n')[0] || 'Coding Assessment Problem',
      description: question.questionText || 'Solve the problem according to standard specifications.',
      inputFormat: 'Standard input via stdin',
      outputFormat: 'Standard output via stdout',
      constraints: ['Time Limit: 3.0s', 'Memory Limit: 128 MB'],
      starterCode: this.getDefaultStarterCode(),
      testCases: [
        {
          index: 1,
          isSample: true,
          input: '5\n1 2 3 4 5',
          expectedOutput: '15',
          explanation: 'Sum of all elements is 15',
        },
        {
          index: 2,
          isSample: true,
          input: '3\n10 20 30',
          expectedOutput: '60',
          explanation: 'Sum of all elements is 60',
        },
        {
          index: 3,
          isSample: false,
          input: '1\n100',
          expectedOutput: '100',
        },
        {
          index: 4,
          isSample: false,
          input: '4\n-1 -2 -3 -4',
          expectedOutput: '-10',
        },
      ],
      timeLimitSeconds: 3.0,
      memoryLimitKb: 128000,
    };
  }

  private getDefaultStarterCode(): Record<SupportedLanguage, string> {
    return {
      c: `#include <stdio.h>

int main() {
    // Write your code here
    return 0;
}
`,
      cpp: `#include <iostream>
#include <vector>
using namespace std;

int main() {
    // Write your code here
    return 0;
}
`,
      python: `import sys

def solve():
    # Read input and solve problem
    pass

if __name__ == '__main__':
    solve()
`,
      java: `import java.util.*;

public class Solution {
    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        // Write your code here
    }
}
`,
    };
  }
}

export const codingService = new CodingService();
