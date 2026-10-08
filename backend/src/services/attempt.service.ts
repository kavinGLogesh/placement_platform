import { prisma } from '../config/prisma.config.js';
import { AttemptRepository, attemptRepository } from '../repositories/attempt.repository.js';
import { AssessmentRepository, assessmentRepository } from '../repositories/assessment.repository.js';
import { ScoringService, scoringService } from './scoring.service.js';
import { CodingRepository, codingRepository } from '../repositories/coding.repository.js';
import {
  AssessmentAttemptDto,
  AttemptAnswerDto,
  AssessmentResultDto,
  StudentAssessmentItemDto,
  StudentTestStatus,
  SaveAnswerDto,
  BatchSyncAnswersDto,
  SanitizedPaperQuestionDto,
  SanitizedOptionDto,
  RecordViolationDto,
  AttemptViolationDto,
} from '../types/attempt.types.js';
import { AppError } from '../middleware/errorHandler.js';

export class AttemptService {
  constructor(
    private readonly attemptRepo: AttemptRepository = attemptRepository,
    private readonly assessmentRepo: AssessmentRepository = assessmentRepository,
    private readonly scorer: ScoringService = scoringService,
    private readonly codingRepo: CodingRepository = codingRepository
  ) {}

  // ===========================================================================
  // 1. STUDENT TESTS LISTING
  // ===========================================================================
  async getStudentTests(studentId: string, filter?: StudentTestStatus): Promise<StudentAssessmentItemDto[]> {
    const assignedAssessmentIds = new Set<string>();

    if (process.env.NODE_ENV === 'test') {
      await this.assessmentRepo.memStore.initialize();
      for (const [asmtId, assignments] of this.assessmentRepo.memStore.assignments.entries()) {
        if (assignments.some((a) => a.studentId === studentId)) {
          assignedAssessmentIds.add(asmtId);
        }
      }
      for (const [asmtId, asmt] of this.assessmentRepo.memStore.assessments.entries()) {
        if (asmt.status === 'PUBLISHED') {
          const asgns = this.assessmentRepo.memStore.assignments.get(asmtId) || [];
          if (asgns.length === 0 || asmt.departmentTargeting === 'ALL') {
            assignedAssessmentIds.add(asmtId);
          }
        }
      }
    } else {
      const student = await prisma.student.findUnique({
        where: { id: studentId },
        select: { id: true, departmentId: true, classId: true, sectionId: true },
      });

      // 1. Explicit student or group assignments
      const explicitAssignments = await prisma.assessmentAssignment.findMany({
        where: {
          OR: [
            { studentId },
            ...(student?.departmentId ? [{ departmentId: student.departmentId }] : []),
            ...(student?.classId ? [{ classId: student.classId }] : []),
            ...(student?.sectionId ? [{ sectionId: student.sectionId }] : []),
          ],
        },
        select: { assessmentId: true },
      });
      for (const a of explicitAssignments) {
        assignedAssessmentIds.add(a.assessmentId);
      }

      // 2. Published assessments open to ALL or targeted to student's department
      const publishedAssessments = await prisma.assessment.findMany({
        where: { status: 'PUBLISHED' },
        include: {
          _count: { select: { papers: true, assignments: true } },
        },
      });

      for (const pa of publishedAssessments) {
        if (pa._count.papers === 0) continue; // Assessment must have generated examination papers

        const targetInfo = this.assessmentRepo.getAssessmentTargetInfo(pa.id);
        if (targetInfo && targetInfo.departmentTargeting === 'SPECIFIC') {
          if (student?.departmentId && targetInfo.departmentIds.includes(student.departmentId)) {
            assignedAssessmentIds.add(pa.id);
          }
        } else {
          // Open to all: either 0 restrictive assignments or targeted to ALL
          if (pa._count.assignments === 0 || !targetInfo || targetInfo.departmentTargeting === 'ALL') {
            assignedAssessmentIds.add(pa.id);
          }
        }
      }
    }

    const items: StudentAssessmentItemDto[] = [];
    const now = new Date();

    for (const asmtId of assignedAssessmentIds) {
      const assessment = await this.assessmentRepo.getAssessmentById(asmtId);
      if (!assessment || assessment.status !== 'PUBLISHED') {
        continue;
      }

      // Check student attempts
      const attempts = await this.attemptRepo.getStudentAttempts(studentId, asmtId);
      let activeAttempt = attempts.find((a) => a.status === 'IN_PROGRESS') || null;

      // Authoritative expiration check on active attempt
      if (activeAttempt && now >= new Date(activeAttempt.expectedEndTime)) {
        await this.autoFinalizeAttempt(activeAttempt.id, 'EXPIRED');
        activeAttempt = null;
      }

      const completedAttempts = attempts.filter((a) => a.status === 'SUBMITTED' || a.status === 'EXPIRED');
      const maxAttempts = assessment.maximumAttempts || 1;

      let status: StudentTestStatus = 'AVAILABLE';
      if (assessment.startDate && now < new Date(assessment.startDate)) {
        status = 'UPCOMING';
      } else if (completedAttempts.length >= maxAttempts && !activeAttempt) {
        status = 'COMPLETED';
      } else if (assessment.endDate && now > new Date(assessment.endDate) && !activeAttempt) {
        status = 'COMPLETED';
      }

      let lastResultId: string | null = null;
      if (completedAttempts.length > 0) {
        const lastAttempt = completedAttempts[completedAttempts.length - 1];
        const res = await this.attemptRepo.getResultByAttemptId(lastAttempt.id);
        if (res) lastResultId = res.id;
      }

      const item: StudentAssessmentItemDto = {
        id: assessment.id,
        companyId: assessment.companyId || null,
        isCompanyAssessment: Boolean(assessment.isCompanyAssessment),
        name: assessment.name,
        description: assessment.description,
        duration: assessment.duration,
        passingPercentage: assessment.passingPercentage,
        negativeMarking: assessment.negativeMarking,
        totalMarks: assessment.totalMarks || 0,
        totalQuestions: assessment.totalQuestions || 0,
        startDate: assessment.startDate,
        endDate: assessment.endDate,
        status,
        maximumAttempts: maxAttempts,
        attemptsCount: completedAttempts.length + (activeAttempt ? 1 : 0),
        activeAttemptId: activeAttempt ? activeAttempt.id : null,
        lastResultId,
        company: assessment.company || null,
      };

      if (!filter || item.status === filter) {
        items.push(item);
      }
    }

    return items;
  }

  // ===========================================================================
  // 2. START ASSESSMENT
  // ===========================================================================
  async startAssessment(studentId: string, assessmentId: string): Promise<AssessmentAttemptDto> {
    const lockKey = `${studentId}_${assessmentId}`;
    if (!this.attemptRepo.acquireStartLock(lockKey)) {
      throw new AppError('Assessment start is currently being processed. Please retry.', 409);
    }

    try {
      const assessment = await this.assessmentRepo.getAssessmentById(assessmentId);
      if (!assessment) {
        throw new AppError('Assessment not found', 404);
      }

      if (assessment.status !== 'PUBLISHED') {
        throw new AppError('This assessment is not currently published', 403);
      }

      const now = new Date();
      if (assessment.startDate && now < new Date(assessment.startDate)) {
        throw new AppError('Assessment has not started yet', 400);
      }
      if (assessment.endDate && now > new Date(assessment.endDate)) {
        throw new AppError('Assessment schedule has ended', 400);
      }

      // Check student assignment
      const assignments = await this.assessmentRepo.getAssessmentAssignments(assessmentId);
      let studentAssignment = assignments.find((a) => a.studentId === studentId);

      if (!studentAssignment) {
        // Auto-allocate student if the assessment is published and eligible
        const student = process.env.NODE_ENV === 'test'
          ? null
          : await prisma.student.findUnique({
              where: { id: studentId },
              select: { id: true, departmentId: true, classId: true, sectionId: true },
            });

        const targetInfo = this.assessmentRepo.getAssessmentTargetInfo(assessmentId);
        if (targetInfo && targetInfo.departmentTargeting === 'SPECIFIC') {
          if (!student?.departmentId || !targetInfo.departmentIds.includes(student.departmentId)) {
            throw new AppError('You are not assigned to this assessment', 403);
          }
        }

        const papers = await this.assessmentRepo.getAssessmentPapers(assessmentId);
        if (!papers || papers.length === 0) {
          throw new AppError('Cannot start assessment: No examination papers have been generated', 400);
        }

        const paperIndex = assignments.length % papers.length;
        const assignedPaper = papers[paperIndex];

        studentAssignment = await this.assessmentRepo.createSingleAssignment({
          assessmentId,
          studentId,
          paperId: assignedPaper.id,
          departmentId: student?.departmentId || null,
          classId: student?.classId || null,
          sectionId: student?.sectionId || null,
        });
      }

      // Check existing attempts
      const attempts = await this.attemptRepo.getStudentAttempts(studentId, assessmentId);
      let activeAttempt = attempts.find((a) => a.status === 'IN_PROGRESS');

      if (activeAttempt) {
        // If expired, finalize it server-side
        if (now >= new Date(activeAttempt.expectedEndTime)) {
          await this.autoFinalizeAttempt(activeAttempt.id, 'EXPIRED');
          activeAttempt = undefined;
        } else {
          // Idempotent resume
          return this.getAttempt(studentId, activeAttempt.id);
        }
      }

      const completedCount = attempts.filter((a) => a.status === 'SUBMITTED' || a.status === 'EXPIRED').length;
      if (completedCount >= (assessment.maximumAttempts || 1)) {
        throw new AppError('Maximum attempts limit reached for this assessment', 400);
      }

      // Resolve paper
      let paperId = studentAssignment.paperId;
      if (!paperId) {
        const papers = await this.assessmentRepo.getAssessmentPapers(assessmentId);
        if (papers.length === 0) {
          throw new AppError('Assessment examination papers are not generated yet', 500);
        }
        paperId = papers[0].id;
      }

      // Authoritative server-side timer calculation
      const startTime = now;
      const expectedEndTime = new Date(now.getTime() + assessment.duration * 60 * 1000);

      const attempt = await this.attemptRepo.createAttempt({
        studentId,
        assessmentId,
        paperId,
        attemptNumber: completedCount + 1,
        startTime,
        expectedEndTime,
      });

      return this.getAttempt(studentId, attempt.id);
    } finally {
      this.attemptRepo.releaseStartLock(lockKey);
    }
  }

  // ===========================================================================
  // 3. GET ATTEMPT & AUTHORITATIVE TIMER CHECK
  // ===========================================================================
  async getAttempt(studentId: string, attemptId: string): Promise<AssessmentAttemptDto> {
    const attempt = await this.attemptRepo.getAttemptById(attemptId);
    if (!attempt) {
      throw new AppError('Attempt not found', 404);
    }

    // IDOR protection
    if (attempt.studentId !== studentId) {
      throw new AppError('Unauthorized: You do not own this attempt', 403);
    }

    const now = new Date();
    // Authoritative expiration enforcement
    if (attempt.status === 'IN_PROGRESS' && now >= new Date(attempt.expectedEndTime)) {
      await this.autoFinalizeAttempt(attemptId, 'EXPIRED');
      attempt.status = 'EXPIRED';
      attempt.submittedAt = now;
    }

    const assessment = await this.assessmentRepo.getAssessmentById(attempt.assessmentId);
    if (!assessment) {
      throw new AppError('Assessment metadata missing', 500);
    }

    // Fetch and sanitize paper questions
    let sanitizedQuestions: SanitizedPaperQuestionDto[] = [];
    if (attempt.paperId) {
      const paper = await this.assessmentRepo.getPaperById(attempt.paperId);
      if (paper && paper.questions) {
        sanitizedQuestions = paper.questions.map((q) => {
          const sanitizedOptions: SanitizedOptionDto[] = (q.randomizedOptions || []).map((opt) => ({
            id: opt.id,
            optionText: opt.optionText,
            optionOrder: opt.optionOrder,
          }));

          return {
            id: q.id,
            paperId: q.paperId,
            questionId: q.questionId,
            questionOrder: q.questionOrder,
            marks: q.marks,
            negativeMarks: q.negativeMarks,
            questionText: q.questionText || '',
            category: q.category || 'QUANTITATIVE_APTITUDE',
            topic: q.topic || '',
            difficulty: q.difficulty || 'MEDIUM',
            questionType: q.questionType || 'SINGLE_CHOICE',
            imageUrl: q.imageUrl || null,
            options: sanitizedOptions,
          };
        });
      }
    }

    const answers = await this.attemptRepo.getAttemptAnswers(attemptId);
    const violations = await this.attemptRepo.getViolationsByAttempt(attemptId);

    return {
      ...attempt,
      assessment: {
        id: assessment.id,
        name: assessment.name,
        description: assessment.description,
        duration: assessment.duration,
        passingPercentage: assessment.passingPercentage,
        negativeMarking: assessment.negativeMarking,
        totalMarks: assessment.totalMarks,
        totalQuestions: assessment.totalQuestions,
      },
      questions: sanitizedQuestions,
      answers,
      violationCount: violations.length,
      violations,
    };
  }

  // ===========================================================================
  // 4. SAVE & SYNC ANSWERS
  // ===========================================================================
  async saveAnswer(studentId: string, attemptId: string, dto: SaveAnswerDto): Promise<AttemptAnswerDto> {
    const attempt = await this.attemptRepo.getAttemptById(attemptId);
    if (!attempt) {
      throw new AppError('Attempt not found', 404);
    }
    if (attempt.studentId !== studentId) {
      throw new AppError('Unauthorized: You do not own this attempt', 403);
    }

    const now = new Date();
    if (attempt.status === 'IN_PROGRESS' && now >= new Date(attempt.expectedEndTime)) {
      await this.autoFinalizeAttempt(attemptId, 'EXPIRED');
      throw new AppError('Assessment duration has expired. Attempt is finalized.', 400);
    }

    if (attempt.status !== 'IN_PROGRESS') {
      throw new AppError('Attempt is no longer active and cannot accept answers', 400);
    }

    return this.attemptRepo.saveAnswer(attemptId, dto);
  }

  async batchSyncAnswers(studentId: string, attemptId: string, dto: BatchSyncAnswersDto): Promise<{ syncedCount: number }> {
    const attempt = await this.attemptRepo.getAttemptById(attemptId);
    if (!attempt) {
      throw new AppError('Attempt not found', 404);
    }
    if (attempt.studentId !== studentId) {
      throw new AppError('Unauthorized: You do not own this attempt', 403);
    }

    const now = new Date();
    if (attempt.status === 'IN_PROGRESS' && now >= new Date(attempt.expectedEndTime)) {
      await this.autoFinalizeAttempt(attemptId, 'EXPIRED');
      throw new AppError('Assessment duration has expired. Attempt is finalized.', 400);
    }

    if (attempt.status !== 'IN_PROGRESS') {
      throw new AppError('Attempt is no longer active and cannot accept answers', 400);
    }

    await this.attemptRepo.batchSaveAnswers(attemptId, dto.answers, dto.currentQuestion);
    return { syncedCount: dto.answers.length };
  }

  // ===========================================================================
  // 5. SUBMIT & SCORING
  // ===========================================================================
  async submitAttempt(studentId: string, attemptId: string): Promise<AssessmentResultDto> {
    const attempt = await this.attemptRepo.getAttemptById(attemptId);
    if (!attempt) {
      throw new AppError('Attempt not found', 404);
    }
    if (attempt.studentId !== studentId) {
      throw new AppError('Unauthorized: You do not own this attempt', 403);
    }

    // Idempotent: if already submitted, safely return existing result
    const existingResult = await this.attemptRepo.getResultByAttemptId(attemptId);
    if (existingResult) {
      return existingResult;
    }

    if (!this.attemptRepo.acquireSubmitLock(attemptId)) {
      throw new AppError('Submission is already being processed for this attempt', 409);
    }

    try {
      const assessment = await this.assessmentRepo.getAssessmentById(attempt.assessmentId);
      if (!assessment) throw new AppError('Assessment not found', 500);

      const paper = attempt.paperId ? await this.assessmentRepo.getPaperById(attempt.paperId) : null;
      if (!paper) throw new AppError('Assigned examination paper not found', 500);

      const answers = await this.attemptRepo.getAttemptAnswers(attemptId);
      const codingSubsMap = await this.codingRepo.getLatestSubmissionsForAttempt(attemptId);
      const score = this.scorer.calculateScore(assessment, paper, answers, codingSubsMap);

      // Persist coding answer records if not already present
      if (score.questionGrades && paper.questions) {
        for (const [qId] of score.questionGrades.entries()) {
          const qObj = paper.questions.find((pq) => pq.questionId === qId);
          if (qObj && qObj.category === 'CODING') {
            const existingAns = answers.find((a) => a.questionId === qId);
            if (!existingAns) {
              await this.attemptRepo.batchSaveAnswers(attemptId, [
                {
                  questionId: qId,
                  textAnswer: 'CODING_SUBMITTED',
                  isMarkedForReview: false,
                },
              ]);
            }
          }
        }
      }

      const result = await this.attemptRepo.saveResultTransaction(
        attemptId,
        {
          attemptId,
          assessmentId: assessment.id,
          studentId,
          totalMarks: score.totalMarks,
          obtainedMarks: score.obtainedMarks,
          percentage: score.percentage,
          correctCount: score.correctCount,
          incorrectCount: score.incorrectCount,
          unansweredCount: score.unansweredCount,
          accuracy: score.accuracy,
          isPassed: score.isPassed,
        },
        'SUBMITTED'
      );

      return result;
    } finally {
      this.attemptRepo.releaseSubmitLock(attemptId);
    }
  }

  private async autoFinalizeAttempt(attemptId: string, finalStatus: 'EXPIRED' | 'SUBMITTED'): Promise<void> {
    const existing = await this.attemptRepo.getResultByAttemptId(attemptId);
    if (existing) return;

    const attempt = await this.attemptRepo.getAttemptById(attemptId);
    if (!attempt) return;

    const assessment = await this.assessmentRepo.getAssessmentById(attempt.assessmentId);
    if (!assessment) return;

    const paper = attempt.paperId ? await this.assessmentRepo.getPaperById(attempt.paperId) : null;
    if (!paper) return;

    const answers = await this.attemptRepo.getAttemptAnswers(attemptId);
    const codingSubsMap = await this.codingRepo.getLatestSubmissionsForAttempt(attemptId);
    const score = this.scorer.calculateScore(assessment, paper, answers, codingSubsMap);

    await this.attemptRepo.saveResultTransaction(
      attemptId,
      {
        attemptId,
        assessmentId: assessment.id,
        studentId: attempt.studentId,
        totalMarks: score.totalMarks,
        obtainedMarks: score.obtainedMarks,
        percentage: score.percentage,
        correctCount: score.correctCount,
        incorrectCount: score.incorrectCount,
        unansweredCount: score.unansweredCount,
        accuracy: score.accuracy,
        isPassed: score.isPassed,
      },
      finalStatus
    );
  }

  // ===========================================================================
  // 6. STUDENT RESULTS
  // ===========================================================================
  async getStudentResults(studentId: string): Promise<AssessmentResultDto[]> {
    const results = await this.attemptRepo.getStudentResults(studentId);
    for (const r of results) {
      const asmt = await this.assessmentRepo.getAssessmentById(r.assessmentId);
      if (asmt) {
        r.assessment = {
          id: asmt.id,
          name: asmt.name,
          duration: asmt.duration,
          passingPercentage: asmt.passingPercentage,
        };
      }
    }
    return results;
  }

  async getResultDetail(studentId: string, resultId: string): Promise<AssessmentResultDto> {
    const res = await this.attemptRepo.getResultById(resultId);
    if (!res) {
      throw new AppError('Result not found', 404);
    }

    // IDOR Protection: Students cannot view other candidates' results
    if (res.studentId !== studentId) {
      throw new AppError('Unauthorized: You do not have permission to view this result', 403);
    }

    const asmt = await this.assessmentRepo.getAssessmentById(res.assessmentId);
    if (asmt) {
      res.assessment = {
        id: asmt.id,
        name: asmt.name,
        duration: asmt.duration,
        passingPercentage: asmt.passingPercentage,
      };
    }

    return res;
  }

  // ===========================================================================
  // 6. ANTI-CHEATING INTEGRITY VIOLATIONS
  // ===========================================================================
  async recordViolation(
    studentId: string,
    attemptId: string,
    dto: RecordViolationDto
  ): Promise<{ violation: AttemptViolationDto; violationCount: number }> {
    const attempt = await this.attemptRepo.getAttemptById(attemptId);
    if (!attempt) {
      throw new AppError('Attempt not found', 404);
    }
    if (attempt.studentId !== studentId) {
      throw new AppError('Unauthorized: You do not own this attempt', 403);
    }
    const now = new Date();
    if (attempt.status === 'IN_PROGRESS' && now >= new Date(attempt.expectedEndTime)) {
      await this.autoFinalizeAttempt(attemptId, 'EXPIRED');
      throw new AppError('Assessment duration has expired. Attempt is finalized.', 400);
    }
    if (attempt.status !== 'IN_PROGRESS') {
      throw new AppError('Attempt is no longer active and cannot accept violation logs', 400);
    }

    const violation = await this.attemptRepo.recordViolation(
      attemptId,
      studentId,
      dto.violationType,
      dto.details
    );
    const violations = await this.attemptRepo.getViolationsByAttempt(attemptId);

    return {
      violation,
      violationCount: violations.length,
    };
  }

  async getViolations(studentId: string, attemptId: string): Promise<AttemptViolationDto[]> {
    const attempt = await this.attemptRepo.getAttemptById(attemptId);
    if (!attempt) {
      throw new AppError('Attempt not found', 404);
    }
    if (attempt.studentId !== studentId) {
      throw new AppError('Unauthorized: You do not own this attempt', 403);
    }
    return this.attemptRepo.getViolationsByAttempt(attemptId);
  }
}

export const attemptService = new AttemptService();
